const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
	const schema = mongoose.Schema(
		{
			item: { type: ObjectId, ref: 'items', index: true },
			priceGroup: { type: String, required: true, index: true },
			code: { type: String, required: true, index: true },
			price: { type: Number, default: 0 },
			currency: { type: String, default: 'TRY', enum: ['USD', 'EUR', 'TRY', 'GBP', 'RUB', 'AZN', 'AED'] },
			discountGroup: { type: String, default: '' },
			campaignCode: { type: String, default: '' },
			warehouseCode: { type: String, default: '' },
			unit: { type: String, default: 'Adet' },
			lastModified: { type: String, default: '', index: true },
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
