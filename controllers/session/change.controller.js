
module.exports = (dbModel, sessionDoc, req) =>
  new Promise(async (resolve, reject) => {
    if (req.method === 'POST') {
      switch (req.params.param1) {
        case 'lang':
        case 'language':
          changeLanguage(dbModel, sessionDoc, req).then(resolve).catch(reject)
          break
        case 'db':
        case 'database':
          changeDatabase(dbModel, sessionDoc, req).then(resolve).catch(reject)
          break
        default:
          restError.param1(req, reject)
          break
      }
    } else {
      restError.method(req, reject)
    }
  })

function changeDatabase(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    if (!req.params.param2) return restError.param2(req, reject)
    const dbDoc = await db.databases.findOne({
      _id: req.params.param2,
      $or: [
        { owner: sessionDoc.member },
        { 'team.teamMember': sessionDoc.member }
      ],
      passive: false
    })
    if (!dbDoc) return reject(`database not found`)


    sessionDoc.db = dbDoc._id
    sessionDoc
      .save()
      .then(async result => {
        resolve({
          dbId: dbDoc._id,
          db: dbDoc,
          dbList: await db.databases.find({
            $or: [
              { owner: sessionDoc.member },
              { 'team.teamMember': sessionDoc.member }
            ],
            passive: false
          }),
          message: t(`session database has been changed successfully`, sessionDoc.language)
        })
      })
      .catch(reject)

  })
}
function changeLanguage(dbModel, sessionDoc, req) {
  return new Promise(async (resolve, reject) => {
    if (!req.params.param2) return restError.param2(req, reject)

    sessionDoc.lang = req.params.param2
    sessionDoc
      .save()
      .then(resolve({
        lang: sessionDoc.lang,
        message: t('session language has been changed successfully', sessionDoc.language)
      }))
      .catch(reject)

  })
}