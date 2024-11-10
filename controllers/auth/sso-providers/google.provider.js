const { saveSession, socialLogin } = require('../helper')

module.exports = (req) =>
	new Promise(async (resolve, reject) => {
		try {
			if (req.method != 'POST')
				return restError.method(req, reject)
			if (!req.body.user)
				return reject(`'user' parameter is required`)
			if (!req.body.account)
				return reject(`'account' parameter is required`)

			const email = req.body.user.email || ''
			const id_token = req.body.account.id_token
			const access_token = req.body.account.access_token
			const imageUrl = req.body.user.image || req.body.profile ? req.body.profile.picture : ''
			const name = req.body.user.name || ''
			const firstName = req.body.profile && req.body.profile.given_name || name.split(' ').map((e, index) => index < name.split(' ').length - 1 ? e : '').join(' ')
			const lastName = req.body.profile && req.body.profile.family_name || name.split(' ').length > 1 ? name.split(' ')[name.split(' ').length - 1] : ''

			if (!email)
				return reject(`'user.email' parameter is required`)
			if (!id_token)
				return reject(`'account.id_token' parameter is required`)


			const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`)
			if (response.ok) {
				const result = await response.json()
				if (result.email === email) {
					socialLogin(req, 'google', email, name, firstName, lastName, imageUrl, req.body)
						.then(resolve)
						.catch(reject)
				} else {
					reject('invalid id_token')
				}

			} else {
				reject(`${response.status} - ${response.statusText}`)
			}

		} catch (err) {
			reject(err)
		}
	})


