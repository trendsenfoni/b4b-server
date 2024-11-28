const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
	const schema = mongoose.Schema(
		{
			src: { type: String, default: '' },
			width: { type: Number, default: 0 },
			height: { type: Number, default: 0 },
			size: { type: Number, default: 0 },
			alt: { type: String, default: '' },
			mimetype: { type: String, default: '' },
			fit: { type: String, index: true },
			img800: {
				src: { type: String, default: '' },
				width: { type: Number, default: 0 },
				height: { type: Number, default: 0 },
				size: { type: Number, default: 0 },
			},
			img400: {
				src: { type: String, default: '' },
				width: { type: Number, default: 0 },
				height: { type: Number, default: 0 },
				size: { type: Number, default: 0 },
			},
			img200: {
				src: { type: String, default: '' },
				width: { type: Number, default: 0 },
				height: { type: Number, default: 0 },
				size: { type: Number, default: 0 },
			},
			img100: {
				src: { type: String, default: '' },
				width: { type: Number, default: 0 },
				height: { type: Number, default: 0 },
				size: { type: Number, default: 0 },
			},
			tags: { type: String, index: true },
			createdDate: { type: Date, default: Date.now },
			// uploading:{type:Boolean, default:true},
			// uploadingStatusCounter:{type:Number, default:0},
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
