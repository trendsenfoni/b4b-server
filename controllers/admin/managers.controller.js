module.exports = (dbModel, adminSessionDoc, req) => new Promise(async (resolve, reject) => {


  switch (req.method) {
    case 'GET':
      if (req.params.param1 == 'checkEmail') {
        checkEmail(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      } else if (req.params.param1 != undefined) {
        getOne(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      } else {
        getList(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      }
      break
    case 'POST':
      post(dbModel, adminSessionDoc, req).then(resolve).catch(reject)

      break
    case 'PUT':
      put(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      break
    case 'DELETE':
      deleteItem(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      break
    default:
      restError.method(req, reject)
      break
  }
})

function checkEmail(dbModel, adminSessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!req.params.param2)
        return reject(`param2 required`)
      const c = await dbModel.managers.countDocuments({ email: req.params.param2.toLowerCase() })

    } catch (err) {
      reject(err)
    }
  })
}
function getOne(dbModel, adminSessionDoc, req) {
  return new Promise((resolve, reject) => {
    dbModel.managers
      .findOne({ _id: req.params.param1 })
      .select('_id username email phoneNumber password role title fullName firstName lastName gender dateOfBirth location image bio links married children passive')
      .then(resolve)
      .catch(reject)
  })
}

function getList(dbModel, adminSessionDoc, req) {
  return new Promise((resolve, reject) => {
    let options = {
      limit: req.getValue('pageSize') || 10,
      page: req.getValue('page') || 1,

    }
    let filter = {}
    if ((req.query.search || '').length >= 2) {
      filter.$or = []
      filter.$or.push({ fullName: { $regex: `.*${req.query.search}.*`, $options: "i" } })
      filter.$or.push({ email: { $regex: `.*${req.query.search}.*`, $options: "i" } })
    }
    console.log('filter:', filter)
    dbModel.managers.paginate(filter, options).then(resolve).catch(reject)
  })
}

function post(dbModel, adminSessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    let data = req.body || {}
    data._id = undefined
    if (!data.email) return reject(`email required`)
    data.email = data.email.toLowerCase()
    if (!util.isValidEmail(data.email)) return reject(`invalid email address`)

    if (data.email) {
      if (await dbModel.managers.countDocuments({ email: data.email }) > 0)
        return reject(`email in use`)
    }

    if (!data.username) {
      data._id = new ObjectId()
      data.username = data._id
    }
    if (!data.firstName) return reject(`first name required`)
    if (!data.lastName) return reject(`last name required`)
    if ((data.password || '').length < 8) return reject(`password must be at least 8 characters long`)

    if (data.username) {
      if (await dbModel.managers.countDocuments({ username: data.username }) > 0)
        return reject(`username in use`)
    }

    let newDoc = new dbModel.managers(data)
    if (!epValidateSync(newDoc, reject)) return

    newDoc.save().then(resolve).catch(reject)
  })
}

function put(dbModel, adminSessionDoc, req) {
  return new Promise((resolve, reject) => {
    if (!req.params.param1) return reject(`param1 required`)
    let data = req.body || {}
    delete data._id
    if (data.password && data.password.length < 8) return reject(`password must be at least 8 characters long`)

    dbModel.managers
      .findOne({ _id: req.params.param1 })
      .then(async doc => {
        if (doc) {
          if (data.email) {
            if (await dbModel.managers.countDocuments({ email: data.email, _id: { $ne: doc._id } }) > 0)
              return reject(`email in use`)
          }
          if (data.username) {
            if (await dbModel.managers.countDocuments({ username: data.username, _id: { $ne: doc._id } }) > 0)
              return reject(`username in use`)
          }

          let newDoc = Object.assign(doc, data)

          if (!epValidateSync(newDoc, reject)) return

          newDoc.save().then(resolve).catch(reject)
        } else {
          reject(`manager not found`)
        }
      })
      .catch(reject)
  })
}

function deleteItem(dbModel, adminSessionDoc, req) {
  return new Promise((resolve, reject) => {
    if (!req.params.param1) return reject(`param1 required`)

    dbModel.managers.removeOne(adminSessionDoc, { _id: req.params.param1 }).then(resolve).catch(err => {
      console.log(err)
      reject(err)
    })
  })
}
