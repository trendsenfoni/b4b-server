// const userDbHelper = require('../../db/helpers/userdb-helper')

module.exports = (req) => new Promise(async (resolve, reject) => {
	try {
		if (!req.method == 'POST') return restError.method(req, reject)
		let username = req.getValue('username')
		let email = req.getValue('email')
		let phoneNumber = req.getValue('phoneNumber') || ''
		let authCode = req.getValue('authCode')

		if (!authCode) return reject(`autCode required`)
		let filter = { passive: false, authCode: authCode }
		let filter2 = {}

		if (email) {
			filter.email = email
			filter2.email = email
		} else if (phoneNumber) {
			filter.phoneNumber = phoneNumber
			filter2.phoneNumber = phoneNumber
		} else if (username) {
			filter.username = username
			filter2.username = username
		} else {
			return reject(`One of email, phone, username required.`)
		}
		const docs = await db.authCodes.find(filter).sort({ _id: -1 }).limit(1)
		if (docs.length == 0) return reject('verification failed. authCodeDoc not found')
		let authCodeDoc = docs[0]
		if (authCodeDoc.authCodeExpire.getTime() < new Date().getTime()) return reject('authCode expired')
		if (authCodeDoc.verified) return reject('authCode has already been verified')


		let memberDoc = await db.members.findOne(filter2)

		if (memberDoc == null) {
			const memberId = new ObjectId()
			memberDoc = new db.members({
				_id: memberId,
				username: authCodeDoc.username || memberId.toString(),
				email: authCodeDoc.email,
				phoneNumber: authCodeDoc.phoneNumber,
				password: authCodeDoc.password,
				fullName: authCodeDoc.firstName + ' ' + authCodeDoc.lastName,
				firstName: authCodeDoc.firstName,
				lastName: authCodeDoc.lastName,
				dateOfBirth: authCodeDoc.dateOfBirth,
				gender: authCodeDoc.gender,
				passive: false,
				role: 'user',
			})
		}
		console.log('memberDoc:', memberDoc)
		memberDoc = await memberDoc.save()
		let obj = memberDoc.toJSON()
		delete obj.password
		console.log('obj:', obj)
		authCodeDoc.verified = true
		authCodeDoc.verifiedDate = new Date()
		authCodeDoc = await authCodeDoc.save()

		resolve(obj)

	} catch (err) {
		console.log('err:', err)
		reject(err)
	}
})
