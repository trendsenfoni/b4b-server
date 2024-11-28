const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
	const schema = mongoose.Schema(
		{
			group: { type: String, default: '', index: true },
			subGroup: { type: String, default: '', index: true },
			category: { type: String, default: '', index: true },
			brand: { type: String, default: '', index: true },
			code: { type: String, unique: true },
			name: { type: String, default: '', index: true },
			description: { type: String, default: '', index: true },
			manufacturerCode: { type: String, default: '', index: true },
			barcode: { type: String, default: '', index: true },
			vatRate: { type: Number, default: 0 },
			withHoldingTaxRate: { type: Number, default: 0 },
			unit: { type: String, default: '' },
			lastModified: { type: String, default: '', index: true },
			passive: { type: Boolean, default: false, index: true }
		},
		{ versionKey: false, timestamps: true }
	)

	schema.pre('save', (next) => next())
	schema.pre('remove', (next) => next())
	schema.pre('remove', true, (next, done) => next())
	schema.on('init', (model) => { })
	schema.plugin(mongoosePaginate)


	let model = dbModel.conn.model(collectionName, schema, collectionName)

	model.removeOne = (session, filter) => sendToTrash(dbModel, collectionName, session, filter)
	return model
}
