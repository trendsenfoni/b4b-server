const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
	const schema = mongoose.Schema(
		{
			order: { type: ObjectId, ref: 'orders', required: true, index: true },
			ioType: { type: Number, required: true, index: true },
			issueDate: { type: String, index: true, min: 10, max: 10, default: new Date().toISOString().substring(0, 10) },
			item: { type: ObjectId, ref: 'items', index: true },
			description: { type: String, default: '' },
			quantity: { type: Number, default: 0 },
			delivered: { type: Number, default: 0 },
			remainder: { type: Number, default: 0 },
			thickness: { type: Number, default: 0, index: true },
			width: { type: Number, default: 0, index: true },
			length: { type: Number, default: 0 },
			weight: { type: Number, default: 0 },
			price: { type: Number, default: 0 },
			total: { type: Number, default: 0 },
			currency: { type: String, default: '' },
			taxRate: { type: Number, default: 0 },
			withHoldingTaxRate: { type: Number, default: 0 },
			taxAmount: { type: Number, default: 0 },
			withHoldingTaxAmount: { type: Number, default: 0 },
			taxInclusiveTotal: { type: Number, default: 0 },
			closed: { type: Boolean, default: false, index: true },
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
