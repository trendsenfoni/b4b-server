const connectorAbi = require('../../lib/connectorAbi')

module.exports = (dbModel, adminSessionDoc, req) => new Promise(async (resolve, reject) => {

  switch (req.method) {
    case 'GET':
      getOne(dbModel, adminSessionDoc, req).then(resolve).catch(reject)

      break
    case 'POST':
    case 'PUT':
      if (req.params.param1 == 'connectorTest') {
        connectorTest(dbModel, req).then(resolve).catch(reject)
      } else if (req.params.param1 == 'mssqlTest') {
        mssqlTest(dbModel, req).then(resolve).catch(reject)
      } else {
        save(dbModel, adminSessionDoc, req).then(resolve).catch(reject)
      }
      break
    default:
      restError.method(req, reject)
      break
  }
})

function getOne(dbModel, adminSessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!req.params.param1) return reject(`param1 required`)
      const memberDoc = await dbModel.members.findOne({ _id: req.params.param1 })
      if (!memberDoc) return reject(`member not found`)
      dbModel.settings
        .findOne({ member: memberDoc._id })
        .then(async settingDoc => {
          if (!settingDoc) {
            settingDoc = new dbModel.settings({ member: memberDoc._id })
            settingDoc = await settingDoc.save()
          }
          settingDoc = settingDoc.populate(['member'])
          resolve(settingDoc)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}


function save(dbModel, adminSessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    if (!req.params.param1) return reject(`param1 required`)
    let data = req.body || {}
    delete data._id

    const memberDoc = await dbModel.members.findOne({ _id: req.params.param1 })
    if (!memberDoc) return reject(`member not found`)

    data.member = memberDoc._id

    dbModel.settings
      .findOne({ member: memberDoc._id })
      .then(async doc => {
        let settingDoc = null
        if (!doc) {
          settingDoc = new dbModel.settings(data)
        } else {
          settingDoc = Object.assign(doc, data)
        }


        if (!epValidateSync(settingDoc, reject)) return

        settingDoc.save().then(doc => {
          doc = doc.populate(['member'])
          resolve(doc)
        }).catch(reject)

      })
      .catch(reject)
  })
}



function connectorTest(dbModel, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const clientId = req.getValue('clientId')
      const clientPass = req.getValue('clientPass')
      if (!clientId) return reject(`clientId required`)
      if (!clientPass) return reject(`clientPass required`)
      connectorAbi
        .dateTime(clientId, clientPass)
        .then(resolve)
        .catch(reject)

    } catch (err) {
      reject(err)
    }
  })
}

function mssqlTest(dbModel, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const clientId = req.getValue('clientId')
      const clientPass = req.getValue('clientPass')

      const mssql = req.body.mssql
      if (!clientId) return reject(`clientId required`)
      if (!clientPass) return reject(`clientPass required`)
      if (!mssql) return reject(`mssql required`)

      const query = `SELECT name, object_id, create_date FROM sys.objects WHERE type='U' ORDER BY name`

      connectorAbi
        .mssql(clientId, clientPass, mssql, query)
        .then(resolve)
        .catch(reject)

    } catch (err) {
      reject(err)
    }
  })
}
