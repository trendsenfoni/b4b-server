const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
  const schema = mongoose.Schema(
    {
      username: { type: String, required: true, unique: true },
      email: { type: String, default: null, index: true },
      phoneNumber: { type: String, default: null, index: true },
      password: { type: String, default: null, index: true, select: false },
      role: { type: String, default: 'manager' },
      title: { type: String, default: '', index: true },
      fullName: { type: String, index: true },
      firstName: { type: String, default: '', index: true },
      lastName: { type: String, default: '', index: true },
      gender: { type: String, default: '', enum: ['', 'male', 'female', 'other'] },
      dateOfBirth: { type: String, default: '2000-01-01', min: 10, max: 10 },
      location: { type: String, default: '' },
      image: { type: String, default: '' },
      bio: { type: String, default: '' },
      links: [{ type: String }],
      married: { type: Boolean, default: false },
      children: { type: Number, default: 0 },
      passive: { type: Boolean, default: false, index: true },
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
