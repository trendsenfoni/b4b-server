const mikroHelper = require('../../lib/mikro/mikroHelper')
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
  return new Promise(async (resolve, reject) => {
    try {
      const orderId = req.params.param1
      const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
      if (!firmDoc) return reject(`firm not found`)

      mikroHelper.siparis(storeDoc.connector, firmDoc.code, orderId)
        .then(async docs => {
          if (docs.length == 0)
            return reject('order not found')
          let obj = {
            _id: docs[0].documentNumber,
            issueDate: docs[0].issueDate,
            shippedDate: docs[0].shippedDate,
            documentNumber: docs[0].documentNumber,
            description: docs[0].description,
            totalAmount: 0,
            taxAmount: 0,
            withHoldingTaxAmount: 0,
            taxInclusiveAmount: 0,
            currency: docs[0].currency,
            lineCount: docs.length,
            lines: [],
          }
          await Promise.all(docs.map(async (e, index) => {
            let line = {
              _id: obj._id + '-' + index,
              item: await dbModel.items.findOne({ code: e.itemCode }),
              itemCode: e.itemCode,
              itemName: e.itemName,
              quantity: e.quantity,
              deliveredQuantity: e.deliveredQuantity,
              remainingQuantity: e.remainingQuantity,
              price: e.price,
              discountAmount: e.discountAmount,
              expenseAmount: e.expenseAmount,
              amount: e.amount,
              taxRate: e.taxRate,
              taxAmount: e.taxAmount,
              withHoldingTaxAmount: e.withHoldingTaxAmount || 0,
              taxInclusiveAmount: e.taxInclusiveAmount,
              unit: e.unit,
            }
            obj.lines.push(line)
            obj.totalAmount += line.amount
            obj.taxAmount += line.taxAmount
            obj.withHoldingTaxAmount += line.withHoldingTaxAmount

          }))
          obj.totalAmount = Math.round(100 * obj.totalAmount) / 100
          obj.taxAmount = Math.round(100 * obj.taxAmount) / 100
          obj.withHoldingTaxAmount = Math.round(100 * obj.withHoldingTaxAmount) / 100
          obj.taxInclusiveAmount = Math.round(100 * (obj.totalAmount + obj.taxAmount - obj.withHoldingTaxAmount)) / 100

          resolve(obj)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

function getList(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const startDate = req.getValue('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().substring(0, 10)
      const endDate = req.getValue('endDate') || new Date().toISOString().substring(0, 10)
      const pageSize = Number(req.getValue('pageSize') || 10)
      const page = Number(req.getValue('page') || 1)
      const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
      if (!firmDoc) return reject(`firm not found`)

      mikroHelper.siparisler(storeDoc.connector, firmDoc.code, startDate, endDate)
        .then(docs => {
          let obj = {
            docs: docs.slice((page - 1) * pageSize, page * pageSize),
            totalDocs: docs.length,
            pageSize: pageSize,
            pageCount: Math.ceil(docs.length / pageSize),
            page: page
          }
          obj.docs.forEach(e => {
            e._id = e.documentNumber
          })
          resolve(obj)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}
