const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
  const schema = mongoose.Schema(
    {
      member: { type: ObjectId, ref: 'members', required: true, index: true },
      item: { type: ObjectId, ref: 'items', required: true, index: true },
      quantity: { type: Number, default: 1 },
    },
    { versionKey: false, timestamps: true }
  )

  schema.pre('save', async function (next) {
    const doc = this
    doc.fullName = (doc.firstName || '') + ' ' + (doc.lastName || '')
    next()
  })
  schema.pre('remove', (next) => next())
  schema.pre('remove', true, (next, done) => next())
  schema.on('init', (model) => { })
  schema.plugin(mongoosePaginate)

  let model = dbModel.conn.model(collectionName, schema, collectionName)

  model.removeOne = (member, filter) => sendToTrash(dbModel, collectionName, member, filter)
  return model
}
