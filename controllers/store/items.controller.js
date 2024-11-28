module.exports = (dbModel, storeDoc, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {

    switch (req.method.toUpperCase()) {
      case 'GET':
        if (req.params.param1 != undefined) {
          switch (req.params.param1) {
            case 'groups':
              getGroups(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
              break
            case 'subGroups':
              getSubGroups(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
              break
            case 'category':
            case 'categories':
              getCategories(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
              break
            case 'brands':
              getBrands(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
              break
            default:
              getOne(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
              break
          }
        } else {
          getList(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        }
        break

      default:
        restError.method(req, reject)
        break
    }
  })

function getSubGroups(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let filter = { passive: false }
    if (req.query.group) {
      filter.group = req.query.group
    }
    let aggregate = [{ $match: filter },
    {
      $group: {
        _id: { $concat: ['$group', ';', '$subGroup'] },
        group: { $first: '$group' },
        subGroup: { $first: '$subGroup' },
      }
    }]
    dbModel.items
      .aggregate(aggregate)
      .then(docs => {
        // resolve(docs.map(e => e._id).sort())
        resolve(docs)
      })
      .catch(reject)
  })
}

function getGroups(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let aggregate = [{ $match: { passive: false } },
    { $group: { _id: '$group' } }]
    dbModel.items
      .aggregate(aggregate)
      .then(docs => {
        resolve(docs.map(e => e._id).sort())
      })
      .catch(reject)
  })
}

function getCategories(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let aggregate = [{ $match: { passive: false } },
    { $group: { _id: '$category' } }]
    dbModel.items
      .aggregate(aggregate)
      .then(docs => {
        resolve(docs.map(e => e._id).sort())
      })
      .catch(reject)
  })
}

function getBrands(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    let aggregate = [{ $match: { passive: false } },
    { $group: { _id: '$brand' } }]
    dbModel.items
      .aggregate(aggregate)
      .then(docs => {
        resolve(docs.map(e => e._id).sort())
      })
      .catch(reject)
  })
}

function getOne(dbModel, storeDoc, sessionDoc, req) {
  return new Promise((resolve, reject) => {
    dbModel.items
      .findOne({ _id: req.params.param1 })
      .then(resolve)
      .catch(reject)
  })
}

function getList(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    let options = {
      page: req.query.page || 1,
      limit: req.query.pageSize || 10,
    }
    const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
    if (!firmDoc) return reject(`firm not found`)

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

    if (req.query.group) filter.group = req.query.group
    if (req.query.subGroup) filter.subGroup = req.query.subGroup
    if (req.query.category) filter.category = req.query.category
    if (req.query.brand) filter.brand = req.query.brand
    if (req.query.manufacturerCode) filter.manufacturerCode = { $regex: `.*${req.query.manufacturerCode}.*`, $options: 'i' }

    dbModel.items
      .paginate(filter, options)
      .then(async result => {
        let list = []
        await Promise.all(result.docs.map(async e => {
          e.price = 0
          e.currency = 'TRY'
          const priceDoc = await dbModel.prices.findOne({ code: e.code, priceGroup: firmDoc.priceGroup })
          if (priceDoc) {
            e.price = priceDoc.price
            e.currency = priceDoc.currency
          }
          e.netPrice = Math.round(100 * (e.price + e.price * e.vatRate / 100)) / 100

          list.push(e)
        }))
        result.docs = list
        resolve(result)

      }).catch(reject)
  })
}
