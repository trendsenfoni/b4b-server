const { sign } = require('../../lib/auth')
const { createTransport } = require('nodemailer')

module.exports = (req) => new Promise((resolve, reject) => {
	const email = req.getValue('email').toLowerCase()
	const web = req.getValue('web') || 'aliabi.org'
	const callbackUrl = req.getValue('callbackUrl')
	if (!email) return reject('email required')
	if (!web) return reject('web required')
	if (!callbackUrl) return reject('callbackUrl required')

	const magicToken = 'MAGICTOKEN_' + sign({ email: email }, 86400 * 1000) // TODO: expiresIn degeri dusurulecek

	const url = `${callbackUrl.split('?')[0]}?magicToken=${magicToken}`

	const transport = createTransport(process.env.AUTH_EMAIL_SERVER)
	transport
		.sendMail({
			to: email,
			from: process.env.AUTH_EMAIL_FROM,
			subject: `Sign in to ${web}`,
			text: text(url, web),
			html: html(url, web),
			// bcc: process.env.MAIL_ADMIN_MAILS || '',
			replyTo: 'noreply@aliabi.org'
		})
		.then(result => {
			resolve({ messageId: result.messageId, response: result.response })
		})
		.catch(reject)
})


function html(url, host) {

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
        Sign in to <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}">
							<a href="${url}" target="_blank"
								style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">
								Sign in <small>(Magic Link)<small>
							</a>
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

/** Email Text body (fallback for email clients that don't render HTML, e.g. feature phones) */
function text(url, host) {
	return `Sign in to ${host}\n${url}\n\n`
}
