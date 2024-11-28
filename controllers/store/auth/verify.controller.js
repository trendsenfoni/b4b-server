const auth = require('../../../lib/auth')
const { ObjectId } = require('mongodb')
module.exports = (dbModel, storeDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (!req.method == 'POST') return restError.method(req, reject)

		let email = req.getValue('email')
		let phoneNumber = req.getValue('phoneNumber') || ''
		let authCode = req.getValue('authCode')

		if (!authCode) return reject(`autCode required`)
		if (!(phoneNumber || email)) return reject(`email or phoneNumber required`)

		let filter = { passive: false, authCode: authCode, verified: false }
		if (phoneNumber) {
			phoneNumber = util.fixPhoneNumber(phoneNumber)
			filter.phoneNumber = phoneNumber
		} else if (email) {
			filter.email = email.toLowerCase()
		}

		await dbModel.authCodes.updateMany({ authCodeExpire: { $lte: new Date() }, passive: false }, { $set: { passive: true } }, { multi: true })

		let authDoc = await dbModel.authCodes.findOne(filter)
		if (!authDoc) return reject('verification failed. auth code not found')

		if (authDoc.authCodeExpire.getTime() < new Date().getTime()) return reject('authCode expired')
		if (authDoc.verified) return reject('authCode has already been verified')

		const firmDoc = await dbModel.firms.findOne({ _id: authDoc.firm })
		if (!firmDoc) return reject(`firm not found`)
		if (firmDoc.passive) return reject(`firm is not active`)


		let memberDoc = await dbModel.members.findOne({ username: authDoc.username })

		if (memberDoc == null) {
			const memberId = new ObjectId()
			memberDoc = new dbModel.members({
				_id: memberId,
				firm: firmDoc._id,
				username: authDoc.username || memberId.toString(),
				email: authDoc.email,
				phoneNumber: authDoc.phoneNumber,
				password: authDoc.password,
				fullName: authDoc.firstName + ' ' + authDoc.lastName,
				firstName: authDoc.firstName,
				lastName: authDoc.lastName,
				dateOfBirth: authDoc.dateOfBirth,
				gender: authDoc.gender,
				passive: false,
				role: 'user',
			})
		}

		memberDoc = await memberDoc.save()
		authDoc.verified = true
		authDoc.verifiedDate = new Date()
		authDoc = await authDoc.save()

		console.log('memberDoc:', memberDoc)
		await dbModel.sessions.updateMany({
			member: memberDoc._id, deviceId: authDoc.deviceId, closed: false
		}, { $set: { closed: true } }, { multi: true })

		const sessionDoc = new dbModel.sessions({
			member: memberDoc._id,
			firm: firmDoc._id,
			role: memberDoc.role,
			deviceId: authCode.deviceId,
			IP: req.IP || '',
			lastIP: req.IP || '',
			closed: false,
			lang: authDoc.lang || 'tr',
			oauth2: null,
			requestHeaders: req.headers
		})

		sessionDoc
			.save()
			.then(sessionDoc => {
				let obj = {
					token: 'AABI_' + auth.sign({ sessionId: sessionDoc._id.toString() }),
					lang: sessionDoc.lang,
					user: memberDoc.toJSON(),
				}
				delete obj.user.password
				resolve(obj)
			})
			.catch(reject)

	} catch (err) {
		console.log('err:', err)
		reject(err)
	}
})
