module.exports = (dbModel, managerSessionDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (!managerSessionDoc) {
			return restError.session(req, reject)
		}

		switch (req.method) {
			case 'GET':
				getMyProfile(dbModel, managerSessionDoc, req).then(resolve).catch(reject)
				break
			case 'PUT':
			case 'POST':
				if (req.params.param1 == 'changePassword') {
					changePassword(dbModel, managerSessionDoc, req).then(resolve).catch(reject)
				} else {
					updateMyProfile(dbModel, managerSessionDoc, req).then(resolve).catch(reject)
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

function changePassword(dbModel, managerSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let oldPassword = req.getValue('oldPassword')
		let newPassword = req.getValue('newPassword')


		if (!oldPassword) return reject('old password required')
		if (!newPassword) return reject('new password required')
		if (newPassword.length < 8) return reject('password must be at least 8 characters')
		let managerDoc = await dbModel.managers.findOne({ _id: managerSessionDoc.manager })

		console.log('managerDoc.password:', managerDoc.password)
		console.log('oldPassword:', oldPassword)
		if ((managerDoc.password || '') != oldPassword) {
			return reject(`incorrect old password`)
		}
		managerDoc.password = newPassword
		managerDoc
			.save()
			.then(() => resolve(`your password has been changed successfuly`))
			.catch(reject)

	})
}

function getMyProfile(dbModel, managerSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('managerSessionDoc:', managerSessionDoc)
			dbModel.managers
				.findOne({ _id: managerSessionDoc.manager })
				.select('-password')
				.then(doc => {
					if (!doc) return reject(`admin user not found`)
					console.log(doc.toJSON())
					let obj = Object.assign({}, doc.toJSON())
					obj.session = {
						sessionId: managerSessionDoc._id,
						lang: managerSessionDoc.lang,
						db: managerSessionDoc.db,
						dbList: managerSessionDoc.dbList,
					}
					resolve(obj)
				})
				.catch(reject)

		} catch (err) {
			reject(err)
		}
	})

}
function updateMyProfile(dbModel, managerSessionDoc, req) {
	return new Promise(async (resolve, reject) => {
		let doc = await dbModel.managers.findOne({ _id: managerSessionDoc.manager })
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
