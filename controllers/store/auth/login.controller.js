const sender = require('../../../lib/sender')
module.exports = (dbModel, storeDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (req.method != 'POST') return restError.method(req, reject)
		let phoneNumber = req.getValue('phoneNumber')
		let email = req.getValue('email')
		let taxNumber = req.getValue('taxNumber')
		let deviceId = req.getValue('deviceId')
		let username = taxNumber
		if (!(phoneNumber || email)) return reject(`email or phoneNumber required`)
		if (!taxNumber) return reject(`taxNumber required`)
		if (!deviceId) return reject(`deviceId required`)

		let filter = {
			'billingInfo.taxNumber': taxNumber
		}
		if (phoneNumber) {
			phoneNumber = util.fixPhoneNumber(phoneNumber)
			filter.phoneNumber = phoneNumber
			username += ':' + phoneNumber
		} else if (email) {
			filter.email = email
			username += ':' + email
		}

		const firmDoc = await dbModel.firms.findOne(filter)
		if (!firmDoc) return reject(`firm not found`)
		if (firmDoc.passive) return reject(`firm is inactive`)

		await dbModel.authCodes.updateMany({ username: username, passive: false }, { $set: { passive: true } }, { multi: true })
		await dbModel.authCodes.updateMany({ authCodeExpire: { $lte: new Date() }, passive: false }, { $set: { passive: true } }, { multi: true })

		const authDoc = new dbModel.authCodes({
			firm: firmDoc._id,
			username: username,
			email: email,
			phoneNumber: phoneNumber,
			authCode: util.randomNumber(120000, 998700),
			authCodeExpire: new Date(new Date().setSeconds(new Date().getSeconds() + Number(process.env.AUTHCODE_EXPIRE || 300))),
			deviceId: deviceId,
		})
		authDoc
			.save()
			.then(newDoc => {
				// TODO: buradan authCode mesaj icinden silinecek
				if (process.env.NODE_ENV == 'development') {
					return resolve(`authCode has been sent to your phone. authCode:${newDoc.authCode}`)
				}

				if (newDoc.phoneNumber) {
					sender.sendAuthSms(newDoc.phoneNumber, newDoc.authCode, storeDoc.name)
						.then(result => {
							eventLog('(sendAuthSms)'.green, ' result:', result)
							resolve(`authCode has been sent to your phone. authCode:${newDoc.authCode}`)
						})
						.catch(reject)
				} else {
					sender.sendAuthEmail(newDoc.email, newDoc.authCode, storeDoc.name)
						.then(result => {
							eventLog('(sendAuthEmail)'.green, ' result:', result)
							resolve(`authCode has been sent to your email. authCode:${newDoc.authCode}`)
						})
						.catch(reject)
				}


			})
			.catch(reject)



	} catch (err) {
		reject(err)
	}
})
