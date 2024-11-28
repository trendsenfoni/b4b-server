// const { permissionSchemaType } = require('../../helpers/db-types')
const collectionName = path.basename(__filename, '.collection.js')
module.exports = function (dbModel) {
  const schema = mongoose.Schema(
    {
      member: { type: ObjectId, ref: 'members', index: true },
      firm: { type: ObjectId, ref: 'firms', index: true },
      loginProvider: { type: String, default: 'trendsenfoni', enum: ['trendsenfoni', 'aliabi', 'google', 'yandex', 'github', 'facebook', 'magiclink', ''] },
      role: { type: String },
      language: { type: String, default: 'tr' },
      deviceId: { type: String, default: '', index: true },
      IP: { type: String, default: '' },
      closed: { type: Boolean, default: false, index: true },
      lastOnline: { type: Date, default: Date.now, index: true },
      lastIP: { type: String, default: '' },
      oauth2: { type: Object, default: null },
      requestHeaders: { type: Object, default: null },

    },
    { versionKey: false, timestamps: true }
  )

  schema.pre('save', (next) => next())
  schema.pre('remove', (next) => next())
  schema.pre('remove', true, (next, done) => next())
  schema.on('init', (model) => { })
  schema.plugin(mongoosePaginate)

  let model = dbModel.conn.model(collectionName, schema, collectionName)

  model.removeOne = (session, filter) =>
    sendToTrash(dbModel, collectionName, session, filter)
  return model
}
