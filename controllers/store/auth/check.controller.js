module.exports = (req) =>
	new Promise(async (resolve, reject) => {
		try {
			if (!(req.method == 'GET' || req.method == 'POST'))
				return restError.method(req, reject)

			if (!req.params.param1)
				return restError.param1(req, reject)


			let doc = null

			switch (req.params.param1) {
				case 'username':
					const username = req.params.param2 || req.getValue('username')
					doc = await db.members.findOne({ username: username })

					break
				case 'email':
					const email = req.params.param2 || req.getValue('email')
					doc = await db.members.findOne({ email: email })
					break
				case 'phoneNumber':
					const phoneNumber = req.params.param2 || req.getValue('phoneNumber')
					doc = await db.members.findOne({ phoneNumber: phoneNumber })
					break
				default:
					reject('wrong parameter. /auth/check/:[email | username | phoneNumber]')
					break
			}

			if (doc == null) {
				resolve({ inUse: false })
			} else if (doc.passive) {
				reject(`Kullanıcı aktif değil. Sistem yöneticisine başvurun.`)
			} else {
				resolve({ inUse: true, role: doc.role })
			}
		} catch (err) {
			reject(err)
		}
	})
