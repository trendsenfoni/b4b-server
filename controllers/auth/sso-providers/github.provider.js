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

			console.log('req.body:', req.body)
			const deviceId = req.getValue('deviceId') || ''
			const email = req.body.user.email || ''
			const access_token = req.body.account.access_token
			const imageUrl = req.body.user.image || ''
			const name = req.body.user.name || ''
			const firstName = name.split(' ').map((e, index) => index < name.split(' ').length - 1 ? e : '').join(' ')
			const lastName = name.split(' ').length > 1 ? name.split(' ')[name.split(' ').length - 1] : ''
			const gender = ''

			const client_id = (process.env.NODE_ENV === 'production' ? process.env.AUTH_GITHUB_ID : process.env.AUTH_GITHUB_ID_LOCALHOST) || ''
			const client_secret = (process.env.NODE_ENV === 'production' ? process.env.AUTH_GITHUB_SECRET : process.env.AUTH_GITHUB_SECRET_LOCALHOST) || ''

			if (!email)
				return reject(`'user.email' parameter is required`)
			if (!access_token)
				return reject(`'account.access_token' parameter is required`)

			//'Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString('base64')
			const response = await fetch(`https://api.github.com/applications/${client_id}/token`, {
				method: 'POST',
				headers: {
					'Accept': 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2022-11-28',
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + Buffer.from(client_id + ":" + client_secret).toString('base64')
				},
				body: JSON.stringify({ access_token: access_token })
			})

			if (response.ok) {
				const result = await response.json()
				console.log('result:', result)
				if (access_token != result.token)
					return reject('invalid access_token')

				socialLogin(req, 'github', email, name, firstName, lastName, imageUrl, req.body, gender)
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
