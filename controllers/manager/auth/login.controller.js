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

	const managerDoc = await db.managers.findOne(filter)
	if (!managerDoc) return reject(`login failed. manager user not found.`)
	if (managerDoc.passive) return reject(`account is passive. please contact with administrators`)
	// const adminRoleList = managerDoc.role.split(',').map((role) => role.trim())

	// if (role != 'user' && !adminRoleList.includes(role)) return reject(`incorrect role`)

	saveManagerSession(managerDoc, req).then(resolve).catch(reject)

})

async function saveManagerSession(managerDoc, req) {
	let deviceId = req.getValue('deviceId') || ''
	let lang = req.getValue('lang') || ''
	let oldManagerSessions = []
	try {
		oldManagerSessions = await db.managerSessions
			.find({ member: managerDoc._id })
			.sort({ _id: -1 })
			.limit(1)

		const closeResult = await db.managerSessions.updateMany(
			{ manager: managerDoc._id, deviceId: deviceId, closed: false },
			{ $set: { closed: true } },
			{ multi: true }
		)

	} catch (err) {
		console.error('saveSession err:', err)
	}

	return new Promise(async (resolve, reject) => {
		try {

			if (oldManagerSessions.length > 0) {
				if (!lang) lang = oldManagerSessions[0].lang

			}
			let sessionDoc = new db.managerSessions({
				manager: managerDoc._id,
				username: managerDoc.username,
				email: managerDoc.email,
				phoneNumber: managerDoc.phoneNumber,
				role: managerDoc.role,
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
						managertoken: 'MANAGER_' + auth.sign({ sessionId: newDoc._id.toString() }),
						lang: newDoc.lang,
						user: managerDoc.toJSON(),
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

