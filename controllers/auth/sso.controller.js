const { saveSession, socialLogin } = require('./helper')
const googleProvider = require('./sso-providers/google.provider')
const yandexProvider = require('./sso-providers/yandex.provider')
const githubProvider = require('./sso-providers/github.provider')

module.exports = (req) =>
	new Promise((resolve, reject) => {
		if (req.method != 'POST')
			return restError.method(req, reject)
		if (!req.params.param1)
			return reject(`'provider' required. Eg: /api/v1/auth/sso/[sso-provider]`)
		if (!req.body.user)
			return reject(`'user' parameter is required`)
		if (!req.body.account)
			return reject(`'account' parameter is required`)

		switch (req.params.param1) {
			case 'google':
				googleProvider(req).then(resolve).catch(err => {
					console.log(err)
					reject(err)
				})
				break
			case 'yandex':
				yandexProvider(req).then(resolve).catch(reject)
				break
			case 'github':
				githubProvider(req).then(resolve).catch(reject)
				break
			default:
				reject('unknown SSO provider')
				break
		}
	})



