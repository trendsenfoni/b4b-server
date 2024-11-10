const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
	const schema = mongoose.Schema(
		{
			firm: { type: ObjectId, ref: 'firms', default: null, index: true },
			ioType: { type: Number, required: true, index: true },
			issueDate: { type: String, index: true, min: 10, max: 10, default: new Date().toISOString().substring(0, 10) },
			issueTime: { type: String, index: true, min: 8, max: 8, default: new Date().toISOString().substring(0, 10) },
			documentNumber: { type: String, default: '' },
			lineCount: { type: Number, default: 0 },
			quantity: { type: Number, default: 0 },
			total: { type: Number, default: 0 },
			currency: { type: String, enum: ['USD', 'TRY', 'EUR', 'RUB', 'GBP'], default: 'USD' },
			taxAmount: { type: Number, default: 0 },
			withHoldingTaxAmount: { type: Number, default: 0 },
			taxInclusiveTotal: { type: Number, default: 0 },
			note: { type: String, default: '' },
			address: {
				room: { type: String, default: '' },
				streetName: { type: String, default: '', index: true },
				blockName: { type: String, default: '' },
				buildingName: { type: String, default: '' },
				buildingNumber: { type: String, default: '' },
				citySubdivisionName: { type: String, default: '' },
				cityName: { type: String, default: '', index: true },
				postalZone: { type: String, default: '' },
				postbox: { type: String, default: '' },
				region: { type: String, default: '' },
				district: { type: String, default: '', index: true },
				country: {
					identificationCode: { type: String, default: '' },
					name: { type: String, default: '' }
				}
			},
			driver: {
				firstName: { type: String, default: '' },
				lastName: { type: String, default: '' },
				idCardNo: { type: String, default: '' },
			},
			vechiclePlate: { type: String, default: '', index: true }
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
	model.relations = { inventory: 'despatch' }
	return model
}
