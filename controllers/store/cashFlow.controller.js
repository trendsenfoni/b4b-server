const mikroHelper = require('../../lib/mikro/mikroHelper')
module.exports = (dbModel, storeDoc, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {

    switch (req.method.toUpperCase()) {
      case 'GET':
        getList(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        break
      default:
        restError.method(req, reject)
        break
    }
  })

function getList(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const startDate = req.getValue('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().substring(0, 10)
      const endDate = req.getValue('endDate') || new Date().toISOString().substring(0, 10)
      const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
      if (!firmDoc) return reject(`firm not found`)

      mikroHelper.cariHareketler(storeDoc.connector, firmDoc.code, startDate, endDate)
        .then(docs => {
          let balance = 0
          docs.forEach(e => {
            e.issueDate = (e.issueDate || '').substring(0, 10)
            e._id = e.documentNumber
            balance += e.debit - e.credit
            e.balance = Math.round(100 * balance) / 100
          })
          resolve(docs)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}
