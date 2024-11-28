
db["firms"].find().forEach(e => {
  let obj = JSON.parse(JSON.stringify(e))
  obj.priceGroup = "1"
  db.prices.deleteOne({ _id: e._id })
  db.prices.insertOne(obj)
})


db.firms.updateMany({}, { $set: { priceGroup: "1" } }, { multi: true })