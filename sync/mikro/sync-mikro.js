const mikroHelper = require('../../lib/mikro/mikroHelper')
const { currencyList } = require('../../db/helpers/db-types')
exports.syncCariKart = function (dbModel, store) {
  return new Promise(async (resolve, reject) => {
    try {
      const docs = await dbModel.firms.find({}).sort({ lastModified: -1 }).limit(1)
      let lastModified = '1900-01-01'
      if (docs.length > 0) lastModified = docs[0].lastModified
      mikroHelper.cariKartlar(store.connector, lastModified)
        .then(async result => {
          result.forEach(async e => {
            const individual = e.taxNumber.length == 11 ? true : false
            let firstName = ''
            let lastName = ''
            if (!currencyList.includes(e.currency)) {
              e.currency = 'TRY'
            }
            if (individual) {
              if (e.name.split(' ').length > 1) {
                lastName = e.name.split(' ')[e.name.split(' ').length - 1]
              }
              firstName = e.name.substring(0, e.name.length - lastName.length)
            }

            await dbModel.firms.updateOne({ code: e.code }, {
              $set: {
                code: e.code,
                name: e.name,
                phoneNumber: e.phoneNumber,
                email: e.email,
                currency: e.currency,
                billingInfo: {
                  individual: individual,
                  companyName: e.name,
                  firstName: firstName,
                  lastName: lastName,
                  taxOffice: e.taxOffice,
                  taxNumber: e.taxNumber,
                  idCardNo: individual ? e.taxNumber : '',
                },
                address: {
                  room: e.room,
                  streetName: e.streetName,
                  blockName: '',
                  buildingName: '',
                  buildingNumber: e.buildingNumber,
                  citySubdivisionName: e.citySubdivisionName,
                  cityName: e.cityName,
                  postalZone: e.postalZone,
                  region: e.cityName,
                  district: e.district,
                  country: {
                    identificationCode: 'TR',
                    name: e.countryName,
                  }
                },
                lastModified: e.lastModified,
                passive: false
              }
            }, { upsert: true })
          })
          devLog(`[${store.identifier}]`.cyan, `syncCariKart upsert count: ${result.length}`)
          resolve()
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })

}

exports.syncMikroStokKart = function (dbModel, store) {
  return new Promise(async (resolve, reject) => {
    try {
      const docs = await dbModel.items.find({}).sort({ lastModified: -1 }).limit(1)
      let lastModified = '1900-01-01'
      if (docs.length > 0) lastModified = docs[0].lastModified
      mikroHelper.stokKartlari(store.connector, lastModified)
        .then(async result => {
          result.forEach(async e => {
            // console.log(e.name)
            await dbModel.items.updateOne({ code: e.code }, {
              $set: {
                code: e.code,
                name: e.name,
                group: e.group,
                subGroup: e.subGroup,
                category: e.category,
                brand: e.brand,
                manufacturerCode: e.manufacturerCode,
                vatRate: e.wholeVatRate,
                withHoldingTaxRate: 0,
                unit: e.unit,
                lastModified: e.lastModified,
                passive: e.passive == 1 ? true : false
              }
            }, { upsert: true })
          })
          devLog(`[${store.identifier}]`.cyan, `syncMikroStokKart upsert count: ${result.length}`)
          resolve()
        })
        .catch(reject)

    } catch (err) {
      reject(err)
    }
  })

}