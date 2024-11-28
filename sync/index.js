const syncMikro = require('./mikro/sync-mikro')
const STORE_SCAN_INTERVAL = 1000000
const STORE_SYNC_INTERVAL = 2000000
var storeList = {}
exports.start = function () {
  return new Promise(async (resolve, reject) => {
    let t = setInterval(async () => {
      const docs = await db.stores.find()
      docs.forEach(e => {
        if (!storeList[e._id]) {
          storeList[e._id] = e.toJSON()
        } else {
          Object.assign(storeList[e._id], e.toJSON())
        }
      })

      Object.keys(storeList).forEach(key => {
        if (!storeList[key].storeStart) {
          storeList[key].storeStart = storeStart
          storeList[key].storeStart(storeList[key])
          eventLog(`[${storeList[key].identifier}]`.cyan, `storeStart loaded`)
        }
      })

    }, STORE_SCAN_INTERVAL)
    resolve()
  })
}

function storeStart(store) {

  if (store.isWorking == true) return
  if (store.passive) return
  store.isWorking = true
  try {

    setTimeout(() => {
      getStoreDbModel(null, store.dbName, 'server1')
        .then(async dbModel => {
          try {
            if (store.connector && store.connector.connectionType == 'mssql') {
              if (store.connector.mssql.mainApp == 'mikro_v16' || store.connector.mssql.mainApp == 'mikro_v17') {
                await syncMikro.syncCariKart(dbModel, store)
                // await syncMikro.syncMikroStokKart(dbModel, store)
                // await syncMikro.syncMikroStokFiyatlar(dbModel, store)

              }

            }
          } catch (err) {
            errorLog(`[${store.identifier}]`.cyan, err)
          }
          store.isWorking = false
          setTimeout(() => {
            dbModel.conn.close()
            dbModel.free()
            dbModel = undefined
          }, 2000)

        })
        .catch(err => errorLog(`[${store.identifier}]`.cyan, `getRepoDbModel`, err))
        .finally(() => {

          store.isWorking = false
          storeStart(store)
        })

    }, STORE_SYNC_INTERVAL)
  } catch (err) {
    store.isWorking = false
    storeStart(store)
  }

}

