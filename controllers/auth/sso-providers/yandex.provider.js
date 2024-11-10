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

			const deviceId = req.getValue('deviceId') || ''
			const email = req.body.user.email || ''
			// const id_token = req.body.account.id_token
			const access_token = req.body.account.access_token
			const refresh_token = req.body.account.refresh_token
			const imageUrl = req.body.user.image || ''
			const name = req.body.user.name || ''
			const firstName = req.body.profile && req.body.profile.first_name || name.split(' ').map((e, index) => index < name.split(' ').length - 1 ? e : '').join(' ')
			const lastName = req.body.profile && req.body.profile.last_name || name.split(' ').length > 1 ? name.split(' ')[name.split(' ').length - 1] : ''
			const gender = req.body.profile && req.body.profile.sex || ''

			const client_id = process.env.AUTH_YANDEX_ID || ''
			const client_secret = process.env.AUTH_YANDEX_SECRET || ''

			if (!email)
				return reject(`'user.email' parameter is required`)
			if (!access_token)
				return reject(`'account.access_token' parameter is required`)


			const response = await fetch(`https://oauth.yandex.com/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: util.JSON_to_URLEncoded({
					client_id: client_id,
					client_secret: client_secret,
					refresh_token: refresh_token,
					grant_type: "refresh_token"
				})
			})

			if (response.ok) {
				const result = await response.json()
				console.log('result:', result)
				if (access_token != result.access_token)
					return reject('invalid access_token')

				socialLogin(req, 'yandex', email, name, firstName, lastName, imageUrl, req.body, gender)
					.then(resolve)
					.catch(reject)
			} else {
				reject(`${response.status} - ${response.statusText}`)
			}

		} catch (err) {
			console.error(err)
			reject(err)
		}
	})


