const userDbPrefix = process.env.USERDB_PREFIX || 'aabi_'
module.exports = (dbModel, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {
    if (!['GET', 'PATCH'].includes(req.method) && !sessionDoc) {
      return restError.session(req, reject)
    }

    switch (req.method.toUpperCase()) {
      case 'GET':
        if (req.params.param1 == 'check') {
          checkStore(dbModel, sessionDoc, req).then(resolve).catch(reject)
        } else if (req.params.param1 != undefined) {
          getOne(dbModel, sessionDoc, req).then(resolve).catch(reject)
        } else {
          getList(dbModel, sessionDoc, req).then(resolve).catch(reject)
        }
        break
      case 'POST':
        post(dbModel, sessionDoc, req).then(resolve).catch(reject)

        break
      case 'PUT':
        put(dbModel, sessionDoc, req).then(resolve).catch(reject)
        break
      case 'DELETE':
        deleteItem(dbModel, sessionDoc, req).then(resolve).catch(reject)
        break
      default:
        restError.method(req, reject)
        break
    }
  })

function checkStore(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!req.params.param2) return reject(`param2 required`)
      const identifier = req.params.param2.toLowerCase()
      const c = await dbModel.stores.countDocuments({ identifier: identifier })
      if (c == 0) {
        return resolve({ identifier: identifier, inUse: false })
      } else {
        return resolve({ identifier: identifier, inUse: true })
      }
    } catch (err) {
      reject(err)
    }
  })
}

function getOne(dbModel, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    dbModel.stores
      .findOne({ _id: req.params.param1 })
      .populate([
        { path: 'owner' },
        { path: 'team.teamMember' }
      ])
      .then(resolve)
      .catch(reject)
  })
}

function getList(dbModel, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let options = {
      page: req.query.page || 1,
      limit: req.query.pageSize || 10,
      populate: [
        { path: 'owner' },
        { path: 'team.teamMember' }
      ]
    }
    let filter = {}
    if (req.query.name || req.query.search) {
      filter.name = { $regex: `.*${req.query.name || req.query.search}.*`, $options: 'i' }
    }
    dbModel.stores
      .paginate(filter, options)
      .then(result => {

        resolve(result)
      }).catch(reject)
  })
}

function post(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    let data = req.body || {}
    delete data._id
    if (!data.name) return reject('name required')
    if (!data.identifier) return reject('identifier required')
    if (!data.owner) return reject('owner required')
    const ownerDoc = await dbModel.managers.findOne({ _id: data.owner })

    data.identifier = data.identifier.toString().toLowerCase()
    const c = await dbModel.stores.countDocuments({ owner: sessionDoc.manager, name: data.name })
    if (c > 0) return reject(`name already exists`)

    data.identifier = await generateDatabaseIdentifier(data.identifier)
    data.dbHost = process.env.MONGODB_SERVER1_URI || 'mongodb://localhost:27017/'
    data.dbName = userDbPrefix + data.identifier
    data.owner = ownerDoc._id
    const newDoc = new dbModel.stores(data)

    if (!epValidateSync(newDoc, reject)) return
    newDoc
      .save()
      .then(newDoc => {
        newDoc = newDoc.populate([
          { path: 'owner' },
          { path: 'team.teamMember' }
        ])
        resolve(newDoc)
      })
      .catch(reject)
  })
}

function put(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {

      if (req.params.param1 == undefined) return restError.param1(req, reject)
      let data = req.body || {}
      delete data._id
      delete data.dbHost
      delete data.dbName

      let dbDoc = await dbModel.stores.findOne({ _id: req.params.param1 })
      if (!dbDoc) return reject(`store not found or permission denied`)
      if (data.identifier) {
        data.identifier = data.identifier.toString().toLowerCase()
        data.identifier = await generateDatabaseIdentifier(data.identifier)
      }

      dbDoc = Object.assign(dbDoc, data)
      if (!epValidateSync(dbDoc, reject)) return
      if (await dbModel.stores.countDocuments({ name: dbDoc.name, _id: { $ne: dbDoc._id } }) > 0)
        return reject(`name already exists`)
      if (await dbModel.stores.countDocuments({ identifier: dbDoc.identifier, _id: { $ne: dbDoc._id } }) > 0)
        return reject(`identifier already exists`)

      dbDoc.save()
        .then(result => {
          let obj = result.toJSON()
          delete obj.dbHost
          resolve(obj)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }

  })
}

function deleteItem(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (req.params.param1 == undefined) return restError.param1(req, reject)
      let dbDoc = await dbModel.stores.findOne({
        _id: req.params.param1,
        passive: false
      })
      if (!dbDoc) return reject(`store not found or permission denied`)
      dbDoc.passive = true
      dbDoc
        .save()
        .then(resolve)
        .catch(reject)

    } catch (err) {
      reject(err)
    }
  })
}

async function generateDatabaseIdentifier(identifier, sayi = 0) {
  return new Promise(async (resolve, reject) => {
    identifier = identifier
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll('-', '_')
      .replace(/[^a-z0-9_]/g, '')
    if (sayi > 0) {
      identifier += sayi.toString()
    }
    console.log('identifier:', identifier)

    const dbName = userDbPrefix + identifier
    const wspCount = await db.stores.countDocuments({ identifier: identifier })
    const dbNameCount = await db.stores.countDocuments({ dbName: dbName })
    if (wspCount > 0 || dbNameCount > 0) {
      generateDatabaseIdentifier(identifier, sayi + 1)
        .then(resolve)
        .catch(reject)
    } else {
      resolve(identifier)
    }

  })

}