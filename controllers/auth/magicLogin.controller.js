const { magicLinkLogin } = require('./helper')
const { verify } = require('../../lib/auth')
const { createTransport } = require('nodemailer')

module.exports = (req) => new Promise(async (resolve, reject) => {
  let magicToken = req.getValue('magicToken')
  if (!magicToken) return reject('magicToken is required')
  if (!magicToken.startsWith('MAGICTOKEN_')) return reject(`incorrect token`)
  magicToken = magicToken.split('MAGICTOKEN_')[1]
  verify(magicToken)
    .then(decoded => {
      magicLinkLogin(req, decoded.email)
        .then(resolve)
        .catch(reject)
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
