const collectionName = path.basename(__filename, '.collection.js')

module.exports = function (dbModel) {
	let schema = mongoose.Schema(
		{
			username: { type: String, default: null, index: true },
			email: { type: String, default: null, index: true },
			phoneNumber: { type: String, default: null, index: true },
			password: { type: String, default: '', index: true },
			firstName: { type: String, default: '' },
			lastName: { type: String, default: '' },
			gender: { type: String, default: '', enum: ['', 'male', 'female', 'other'] },
			host: { type: String, default: '', index: true },
			authCode: { type: String, default: '', index: true },
			authCodeExpire: { type: Date, default: Date.now, index: true },
			verified: { type: Boolean, default: false, index: true },
			deviceId: { type: String, default: '', index: true },
			verifiedAt: { type: Date, default: Date.now, index: true },
			passive: { type: Boolean, default: false, index: true },

		},
		{ versionKey: false, timestamps: true }
	)

	schema.pre('save', (next) => next())
	schema.pre('remove', (next) => next())
	schema.pre('remove', true, (next, done) => next())
	schema.on('init', (model) => { })
	schema.plugin(mongoosePaginate)

	let model = dbModel.conn.model(collectionName, schema, collectionName)

	model.removeOne = (member, filter) => sendToTrash(dbModel, collectionName, member, filter)
	return model
}
