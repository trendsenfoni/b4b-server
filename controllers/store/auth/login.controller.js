const { saveSession } = require('./helper')
module.exports = (req) => new Promise(async (resolve, reject) => {
	if (req.method != 'POST') return restError.method(req, reject)

	let email = null
	let phoneNumber = null
	let identifier = null

	identifier = req.getValue('identifier')
	if (!identifier) {
		username = req.getValue('username')
		email = req.getValue('email')
		phoneNumber = req.getValue('phoneNumber')
	} else {
		if (identifier.includes('@')) {
			email = identifier
		} else if (!isNaN(identifier)) {
			phoneNumber = identifier
		} else {
			username = identifier
		}
	}
	let password = req.getValue('password')
	let deviceId = req.getValue('deviceId')
	let role = req.getValue('role') || 'user'
	let lang = req.getValue('language') || req.getValue('lang')
	if (!password) return reject('password required')
	let filter = { password: password }
	if (email) {
		filter.email = email
	} else if (phoneNumber) {
		filter.phoneNumber = phoneNumber
	} else if (username) {
		filter.username = username
	} else {
		return reject(`One of email, phoneNumber, username required.`)
	}

	const memberDoc = await db.members.findOne(filter)
	if (!memberDoc) return reject(`login failed. member not found.`)
	if (memberDoc.passive) return reject(`account is passive. please contact with administrators`)
	const memberRoleList = memberDoc.role.split(',').map((role) => role.trim())

	if (role != 'user' && !memberRoleList.includes(role)) return reject(`incorrect role`)

	saveSession(memberDoc, role, req, 'aliabi', null).then(resolve).catch(reject)

})
