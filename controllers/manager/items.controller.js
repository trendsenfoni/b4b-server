module.exports = (dbModel, storeDoc, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {

    switch (req.method.toUpperCase()) {
      case 'GET':
        if (req.params.param1 != undefined) {
          getOne(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        } else {
          getList(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        }
        break
      // case 'POST':
      //   post(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)

      //   break
      // case 'PUT':
      //   put(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
      //   break
      // case 'DELETE':
      //   deleteItem(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
      //   break
      default:
        restError.method(req, reject)
        break
    }
  })

function getOne(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    dbModel.items
      .findOne({ _id: req.params.param1 })
      .then(resolve)
      .catch(reject)
  })
}

function getList(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let options = {
      page: req.query.page || 1,
      limit: req.query.pageSize || 10,
    }
    let filter = { passive: false }
    if (req.query.search) {
      filter.$or = [
        { code: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { name: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { description: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { group: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { subGroup: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { category: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { manufacturerCode: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { brand: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
        { barcode: { $regex: `.*${req.query.search}.*`, $options: 'i' } },
      ]
    }
    dbModel.items
      .paginate(filter, options)
      .then(resolve).catch(reject)
  })
}

function post(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {

      let data = req.body || {}
      delete data._id
      if (!data.code) return reject('code required')
      if (!data.name) return reject('name required')

      const c = await dbModel.items.countDocuments({ code: data.code })
      if (c > 0) return reject(`code already exists`)

      const newDoc = new dbModel.items(data)

      if (!epValidateSync(newDoc, reject)) return
      newDoc.save().then(result => {
        resolve(result)
      }).catch(err => {
        console.log('err:', err)
        reject(err)
      })
    } catch (err) {
      reject(err)
    }

  })
}

function put(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {

      if (req.params.param1 == undefined) return restError.param1(req, reject)
      let data = req.body || {}
      delete data._id

      let doc = await dbModel.items.findOne({ _id: req.params.param1 })
      if (!doc) return reject(`record not found`)

      doc = Object.assign(doc, data)
      if (!epValidateSync(doc, reject)) return
      if (await dbModel.items.countDocuments({ name: doc.name, _id: { $ne: doc._id } }) > 0)
        return reject(`name already exists`)

      doc.save()
        .then(resolve)
        .catch(reject)
    } catch (err) {
      reject(err)
    }

  })
}

function deleteItem(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (req.params.param1 == undefined) return restError.param1(req, reject)

      dbModel.items.removeOne(sessionDoc, { _id: req.params.param1 })
        .then(resolve)
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}
