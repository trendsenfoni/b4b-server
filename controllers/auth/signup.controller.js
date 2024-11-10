const { createTransport } = require('nodemailer')

module.exports = (req) =>
	new Promise(async (resolve, reject) => {
		try {
			if (!req.method == 'POST')
				return restError.method(req, reject)
			let host = req.getValue('host') || 'aliabi.org'
			let username = req.getValue('username')
			let email = req.getValue('email')
			let phoneNumber = req.getValue('phoneNumber')
			let password = req.getValue('password')

			let firstName = req.getValue('firstName')
			let lastName = req.getValue('lastName')
			let deviceId = req.getValue('deviceId')
			let gender = req.getValue('gender')
			let dateOfBirth = req.getValue('dateOfBirth')
			let filter = { passive: false }
			if (email) {
				filter.email = email
			} else if (phoneNumber) {
				filter.phoneNumber = phoneNumber
			} else if (username) {
				filter.username = username
			} else {
				return reject(`One of email, phone, username required.`)
			}
			if (password.length < 8) return reject('password min. length 8 chars')

			if (username) {
				if (await db.members.countDocuments({ username: username }) > 0)
					return reject('username already exists')
			} else if (email) {
				if (!util.isValidEmail(email))
					return reject('email is invalid')
				if (await db.members.countDocuments({ email: email }) > 0)
					return reject('email already exists')
			} else if (phoneNumber) {
				if (!util.isValidTelephone(phoneNumber))
					return reject('phone number is invalid')
				if (await db.members.countDocuments({ phoneNumber: phoneNumber }) > 0)
					return reject('phone number already exists')
			}

			await db.authCodes.updateMany(
				{
					$or: [
						{ username: username },
						{ email: email },
						{ phoneNumber: phoneNumber },
					], passive: false
				},
				{ $set: { passive: true } },
				{ multi: true }
			)

			let newAuthDoc = new db.authCodes({
				username: username,
				email: email,
				phoneNumber: phoneNumber,
				firstName: firstName,
				lastName: lastName,
				gender: gender,
				dateOfBirth: dateOfBirth,
				password: password,
				authCode: util.randomNumber(120000, 998000).toString(),
				authCodeExpire: new Date(
					new Date().setSeconds(
						new Date().getSeconds() +
						Number(process.env.AUTHCODE_EXPIRE || 600)
					)
				),
				deviceId: deviceId,
				verified: false,
				passive: false,
			})

			newAuthDoc.save().then((newAuthDoc2) => {
				if (util.isValidTelephone(newAuthDoc2.phoneNumber)) {
					sendAuthSms(newAuthDoc2.phoneNumber, newAuthDoc2.authCode, host)
						.then(() => resolve(`authorization code was sent to phone number ${newAuthDoc2.phoneNumber}`))
						.catch(reject)
				} else if (util.isValidEmail(newAuthDoc2.email)) {
					sendAuthEmail(newAuthDoc2.email, newAuthDoc2.authCode, host)
						.then((rep) => resolve(`authorization code was sent to email ${newAuthDoc2.email}`))
						.catch(reject)
				} else {

					resolve(`authorization code is not required for username ${newAuthDoc2.username}`)
				}
			})
				.catch(reject)

		} catch (err) {
			reject(err.message || err)
		}
	})

function sendAuthSms(phoneNumber, authCode, host) {
	return new Promise((resolve, reject) => {
		if (!process.env.SMS_API_URI)
			return resolve()
		let msg = process.env.SMS_VERIFY_TEMPLATE || '${host} ${authCode} authorization code'
		msg = eval('`' + msg + '`')
		fetch(process.env.SMS_API_URI, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: process.env.SMS_USERNAME,
				password: process.env.SMS_PASSWORD,
				messages: [{ dest: phoneNumber, msg: msg }]
			}),

		})
			.then(response => response.json())
			.then(resolve)
			.catch(reject)
	})
}

function sendAuthEmail(email, authCode, host) {
	return new Promise((resolve, reject) => {
		const transport = createTransport(process.env.AUTH_EMAIL_SERVER)
		transport
			.sendMail({
				to: email,
				from: process.env.AUTH_EMAIL_FROM,
				subject: `Authorization Code`,
				text: textAuthCode(email, authCode, host),
				html: htmlAuthCode(email, authCode, host),
				// bcc: process.env.MAIL_ADMIN_MAILS || '',
				replyTo: 'noreply@aliabi.org'
			})
			.then(result => {
				resolve({ messageId: result.messageId, response: result.response })
			})
			.catch(reject)
	})
}


function htmlAuthCode(email, authCode, host) {

	const escapedEmail = email.replace(/\./g, "&#8203;.")
	const escapedHost = host.replace(/\./g, "&#8203;.")

	const color = {
		background: "#f9f9f9",
		text: "#444",
		mainBackground: "#fff",
		buttonBackground: "#346df1",
		buttonBorder: "#346df1",
		buttonText: "#fff",
	}

	return `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Register to <strong>${escapedHost}</strong>
      </td>
    </tr>
		<tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        ${escapedEmail}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}">
							<p
								style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">
								${authCode}
							</p>
						</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
		<tr>
      <td align="center"
        style="padding: 20px 0; font-size: 10px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        <a href="https://aliabi.org" target="_blank">by AliAbi.org</a>
      </td>
    </tr>
  </table>
</body>
`
}

function textAuthCode(email, authCode, host) {
	return `Register to ${host}\n${email}\n${authCode}\n\n`
}
