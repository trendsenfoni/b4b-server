const mikroHelper = require('../../lib/mikro/mikroHelper')

module.exports = (dbModel, storeDoc, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {

    switch (req.method.toUpperCase()) {
      case 'GET':
        if (req.params.param1 == 'total') {
          getCartTotal(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        } else {
          getCart(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        }

        break
      case 'POST':
        if (req.params.param1 == 'save') {
          saveOrder(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        } else {
          post(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        }

        break
      // case 'PUT':
      //   put(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
      //   break
      case 'DELETE':
        if (req.params.param1 == 'clear') {
          deleteCart(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        } else {
          deleteItem(dbModel, storeDoc, sessionDoc, req).then(resolve).catch(reject)
        }

        break
      default:
        restError.method(req, reject)
        break
    }
  })

function saveOrder(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const description = req.getValue('description') || req.getValue('note') || ''
      const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
      if (!firmDoc) return reject(`firm not found`)

      const cartList = await dbModel.carts.find({ member: sessionDoc.member }).populate('item')
      if (cartList.length == 0)
        return reject(`shopping cart is empty`)
      let sepet = []
      await Promise.all(cartList.map(async e => {
        let priceDoc = await dbModel.prices.findOne({ code: e.item.code, priceGroup: firmDoc.priceGroup })
        let price = 55
        if (priceDoc) price = priceDoc.price
        sepet.push({
          code: e.item.code,
          quantity: e.quantity,
          price: price
        })
      }))
      mikroHelper.siparisKaydet(storeDoc.connector, firmDoc.code, sepet, description, 'K')
        .then(resolve)
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

function getCartTotal(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const c = await dbModel.carts.countDocuments({ member: sessionDoc.member })
      resolve(c)
    } catch (err) {
      reject(err)
    }
  })
}

function getCart(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    const firmDoc = await dbModel.firms.findOne({ _id: sessionDoc.firm })
    if (!firmDoc) return reject(`firm not found`)

    dbModel.carts
      .find({ member: sessionDoc.member })
      .populate('item')
      .then(async docs => {
        let obj = {
          lineCount: 0,
          tQuantity: 0,
          total: 0,
          vatTotal: 0,
          grandTotal: 0,
          lines: [],
        }
        await Promise.all(docs.map(async e => {
          let line = e.toJSON()
          line.price = 0
          line.currency = 'TRY'
          const priceDoc = await dbModel.prices.findOne({ code: line.item.code, priceGroup: firmDoc.priceGroup })
          if (priceDoc) {
            line.price = priceDoc.price
            line.currency = priceDoc.currency
          }

          line.amount = Math.round(100 * (line.price * line.quantity)) / 100
          line.vatAmount = Math.round(100 * (line.amount * line.item.vatRate / 100)) / 100
          line.netAmount = Math.round(100 * (line.amount + line.vatAmount)) / 100

          obj.lineCount++
          obj.tQuantity += line.quantity
          obj.total += Math.round(100 * line.amount) / 100
          obj.vatTotal += Math.round(100 * line.vatAmount) / 100
          obj.grandTotal = obj.total + obj.vatTotal

          obj.lines.push(line)
        }))
        resolve(obj)
      })
      .catch(reject)
  })
}

function post(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      const item = req.getValue('item')
      const quantity = req.getValue('quantity')
      if (!item) return reject(`item required`)
      if (!quantity) return reject(`quantity required`)
      if (Number(quantity) <= 0) return reject(`quantity must be greater then zero`)

      const itemDoc = await dbModel.items.findOne({ _id: item })
      if (!itemDoc) return reject(`item not found`)

      let oldDoc = await dbModel.carts.findOne({ member: sessionDoc.member, item: itemDoc._id })
      if (oldDoc) {
        oldDoc.quantity += Number(quantity)
        oldDoc
          .save()
          .then(newDoc => {
            getCart(dbModel, storeDoc, sessionDoc, req)
              .then(resolve)
              .catch(reject)
          })
          .catch(reject)

      } else {
        const newDoc = new dbModel.carts({
          member: sessionDoc.member,
          item: itemDoc._id,
          quantity: Number(quantity)
        })
        if (!epValidateSync(newDoc, reject)) return

        newDoc
          .save()
          .then(newDoc => {
            getCart(dbModel, storeDoc, sessionDoc, req)
              .then(resolve)
              .catch(reject)
          })
          .catch(reject)

      }


    } catch (err) {
      reject(err)
    }
  })
}

// function put(dbModel, storeDoc, sessionDoc, req) {
//   return new Promise(async (resolve, reject) => {
//     try {

//       if (!req.params.param1) return restError.param1(req, reject)
//       const quantity = req.getValue('quantity')
//       if (!quantity) return reject(`quantity required`)
//       if (Number(quantity) <= 0) return reject(`quantity must be greater then zero`)

//       let doc = await dbModel.carts.findOne({ member: sessionDoc.member, _id: req.params.param1 })
//       if (!doc) return reject(`cart not found`)

//       doc.quantity += Number(quantity)

//       doc.save()
//         .then(newDoc => {
//           getCart(dbModel, storeDoc, sessionDoc, req)
//             .then(resolve)
//             .catch(reject)
//         })
//         .catch(reject)
//     } catch (err) {
//       reject(err)
//     }

//   })
// }

function deleteItem(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!req.params.param1) return restError.param1(req, reject)

      dbModel.carts.removeOne(sessionDoc, { member: sessionDoc.member, _id: req.params.param1 })
        .then(() => {
          getCart(dbModel, storeDoc, sessionDoc, req)
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)

    } catch (err) {
      reject(err)
    }
  })
}

function deleteCart(dbModel, storeDoc, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    try {
      dbModel.carts
        .deleteMany({ member: sessionDoc.member })
        .then(resolve)
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}
