const auth = require('../../../lib/auth')

module.exports = (req) => new Promise(async (resolve, reject) => {
	if (req.method != 'POST') return restError.method(req, reject)

	let username = null
	let email = null
	let identifier = null

	identifier = req.getValue('identifier')
	if (!identifier) {
		username = req.getValue('username')
		email = req.getValue('email')
	} else {
		if (identifier.includes('@')) {
			email = identifier
		} else {
			username = identifier
		}
	}
	let password = req.getValue('password')
	let deviceId = req.getValue('deviceId')
	console.log('deviceId:', deviceId)
	let lang = req.getValue('language') || req.getValue('lang')
	if (!password) return reject('password required')
	let filter = { password: password }
	if (email) {
		filter.email = email
	} else if (username) {
		filter.username = username
	} else {
		return reject(`One of email, phoneNumber, username required.`)
	}

	const adminDoc = await db.adminUsers.findOne(filter)
	if (!adminDoc) return reject(`login failed. admin User not found.`)
	if (adminDoc.passive) return reject(`account is passive. please contact with administrators`)
	// const adminRoleList = adminDoc.role.split(',').map((role) => role.trim())

	// if (role != 'user' && !adminRoleList.includes(role)) return reject(`incorrect role`)

	saveAdminSession(adminDoc, req).then(resolve).catch(reject)

})

async function saveAdminSession(adminDoc, req) {
	let deviceId = req.getValue('deviceId') || ''
	let lang = req.getValue('lang') || ''
	let oldAdminSessions = []
	try {
		oldAdminSessions = await db.adminSessions
			.find({ adminUser: adminDoc._id })
			.sort({ _id: -1 })
			.limit(1)

		const closeResult = await db.adminSessions.updateMany(
			{ adminUser: adminDoc._id, deviceId: deviceId, closed: false },
			{ $set: { closed: true } },
			{ multi: true }
		)

	} catch (err) {
		console.error('saveSession err:', err)
	}


	return new Promise(async (resolve, reject) => {
		try {

			if (oldAdminSessions.length > 0) {
				if (!lang) lang = oldAdminSessions[0].lang

			}
			let sessionDoc = new db.adminSessions({
				adminUser: adminDoc._id,
				username: adminDoc.username,
				email: adminDoc.email,
				phoneNumber: adminDoc.phoneNumber,
				role: adminDoc.role,
				deviceId: deviceId,
				IP: req.IP || '',
				lastIP: req.IP || '',
				closed: false,
				lang: lang || 'tr',
				requestHeaders: req.headers
			})


			sessionDoc
				.save()
				.then(async (newDoc) => {
					let obj = {
						admintoken: 'ADMIN_' + auth.sign({ sessionId: newDoc._id.toString() }),
						lang: newDoc.lang,
						user: adminDoc.toJSON(),
					}
					delete obj.user.password
					resolve(obj)
				})
				.catch(reject)
		} catch (err) {
			reject(err)
		}

	})
}

