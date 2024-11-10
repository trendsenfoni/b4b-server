module.exports = (dbModel, adminSessionDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (!adminSessionDoc) {
			return restError.session(req, reject)
		}

		switch (req.method) {
			case 'GET':
				getMyProfile(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
				break
			case 'PUT':
			case 'POST':
				if (req.params.param1 == 'changePassword') {
					changePassword(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
				} else {
					updateMyProfile(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
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

function changePassword(dbModel, adminSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let oldPassword = req.getValue('oldPassword')
		let newPassword = req.getValue('newPassword')


		if (!oldPassword) return reject('old password required')
		if (!newPassword) return reject('new password required')
		if (newPassword.length < 8) return reject('password must be at least 8 characters')
		let adminDoc = await dbModel.adminUsers.findOne({ _id: adminSessionDoc.adminUser }).select('_id username password')


		if ((adminDoc.password || '') != oldPassword) {
			return reject(`incorrect old password`)
		}

		dbModel.adminUsers
			.updateOne({ _id: adminDoc._id }, { $set: { password: newPassword } })
			.then(() => resolve(`your password has been changed successfuly`))
			.catch(reject)

	})
}

function getMyProfile(dbModel, adminSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		try {
			dbModel.adminUsers
				.findOne({ _id: adminSessionDoc.adminUser })
				.select('-password')
				.then(doc => {
					if (!doc) return reject(`admin user not found`)
					console.log(doc.toJSON())
					let obj = doc.toJSON()
					obj.session = {
						sessionId: adminSessionDoc._id,
						lang: adminSessionDoc.lang,
					}
					resolve(obj)
				})
				.catch(reject)

		} catch (err) {
			reject(err)
		}
	})

}
function updateMyProfile(dbModel, adminSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let doc = await dbModel.adminUsers.findOne({ _id: adminSessionDoc.adminUser })
		if (!doc)
			return reject('oturuma ait kullanıcı bulunamadı')
		let data = req.body || {}
		delete data._id
		delete data.password
		delete data.role
		delete data.passive
		delete data.fullName

		let newDoc = Object.assign(doc, data)
		if (!epValidateSync(newDoc, reject)) return

		newDoc.save()
			.then((doc2) => {
				// doc2.populate('image')
				let obj = doc2.toJSON()
				delete obj.password

				resolve(obj)
			})
			.catch(reject)
	})
}