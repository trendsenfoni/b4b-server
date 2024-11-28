module.exports = (dbModel, storeDoc, sessionDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (!sessionDoc) {
			return restError.session(req, reject)
		}

		switch (req.method) {
			case 'GET':
				getMyProfile(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
				break
			case 'PUT':
			case 'POST':
				if (req.params.param1 == 'changePassword') {
					changePassword(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
				} else {
					updateMyProfile(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
				}

				break
			default:
				restError.method(req, reject)
				break
		}
	} catch (err) {
		reject(err)
	}
})

function changePassword(dbModel, storeDoc, sessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let oldPassword = req.getValue('oldPassword')
		let newPassword = req.getValue('newPassword')


		if (!oldPassword) return reject('old password required')
		if (!newPassword) return reject('new password required')
		if (newPassword.length < 8) return reject('password must be at least 8 characters')
		let memberDoc = await dbModel.members.findOne({ _id: sessionDoc.member })

		if ((memberDoc.password || '') != oldPassword) {
			return reject(`incorrect old password`)
		}
		memberDoc.password = newPassword
		memberDoc
			.save()
			.then(() => resolve(`your password has been changed successfuly`))
			.catch(reject)

	})
}

function getMyProfile(dbModel, storeDoc, sessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		try {
			const doc = await dbModel.members.findOne({ _id: sessionDoc.member })
				.select('-password')
				.populate('firm')

			if (doc) {
				let obj = doc.toJSON()
				obj.session = {
					sessionId: sessionDoc._id,
					lang: sessionDoc.lang,
				}

				resolve(obj)
			} else
				reject('user not found')
		} catch (err) {
			reject(err)
		}
	})

}
function updateMyProfile(dbModel, storeDoc, sessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let doc = await dbModel.members.findOne({ _id: sessionDoc.member })
		if (!doc)
			return reject('oturuma ait kullanıcı bulunamadı')
		let data = req.body || {}
		delete data._id
		delete data.password
		delete data.role
		delete data.passive
		delete data.createdDate
		delete data.modifiedDate
		delete data.fullName

		let newDoc = Object.assign(doc, data)
		if (!epValidateSync(newDoc, reject)) return

		newDoc.fullName = (doc.firstName || '') + ' ' + (doc.lastName || '')
		newDoc.save()
			.then((doc2) => {
				doc2.populate('image')
				let obj = doc2.toJSON()
				delete obj.password

				resolve(obj)
			})
			.catch(reject)
	})
}