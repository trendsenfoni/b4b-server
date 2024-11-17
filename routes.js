const packageJson = require('./package.json')
const auth = require('./lib/auth')
const spamCheck = require('./lib/spam-detector')

module.exports = (app) => {
  app.all('/*', (req, res, next) => {
    req.IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    req.getValue = (key) => {
      let val = (req.headers[key] || req.body[key] || req.query[key] || '')
      if (typeof val === 'string') val = val.trim()
      return val
    }

    next()
  })

  const apiWelcomeMessage = {
    message: process.env.RESTAPI_WELCOME,
    status: process.env.NODE_ENV || ''
  }


  app.all('/api', function (req, res) {
    res.status(200).json({ success: true, data: apiWelcomeMessage })
  })

  app.all('/api/v1', function (req, res) {
    res.status(200).json({ success: true, data: apiWelcomeMessage })
  })
  app.all('/', function (req, res) {
    res.status(200).json({ success: true, data: apiWelcomeMessage })
  })


  adminAuthControllers(app, '/api/v1/admin/auth/:func/:param1/:param2/:param3')
  adminControllers(app, '/api/v1/admin/:func/:param1/:param2/:param3')

  // managerAuthControllers(app, '/api/v1/manager/auth/:func/:param1/:param2/:param3')
  // managerControllers(app, '/api/v1/manager/:func/:param1/:param2/:param3')

  s3Controllers(app, '/api/v1/s3/:func/:param1/:param2/:param3')
  // repoControllers(app, '/api/v1/db/:func/:param1/:param2/:param3')
  pubControllers(app, '/api/v1/pub/:func/:param1/:param2/:param3')

  storeAuthControllers(app, '/api/v1/:store/auth/:func/:param1/:param2/:param3')
  storeSessionControllers(app, '/api/v1/:store/session/:func/:param1/:param2/:param3')

  storeControllers(app, '/api/v1/:store/:func/:param1/:param2/:param3')



  app.use((req, res, next) => {
    res.status(404).json({ success: false, error: `function not found. ${req.originalUrl}` })
  })

  app.use((err, req, res, next) => {
    sendError(err, req, res)
  })
}


function storeAuthControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/auth', req.params.func)
    let spam = spamCheck(req.IP)
    if (!spam) {
      if (ctl) {
        ctl(req)
          .then((data) => {
            if (data == undefined) res.json({ success: true })
            else if (data == null) res.json({ success: true })
            else {
              res.status(200).json({
                success: true,
                data: data,
              })
            }
          })
          .catch(next)
      } else next()
    } else {
      next(`Suspicious login attempts. Try again after ${spam} seconds.`)
    }
  })
}

function storeSessionControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/session', req.params.func)
    if (ctl) {
      storePassport(req)
        .then((sessionDoc) => {
          ctl(db, sessionDoc, req)
            .then((data) => {
              if (data == undefined) res.json({ success: true })
              else if (data == null) res.json({ success: true })
              else {
                res.status(200).json({ success: true, data: data })
              }
            })
            .catch(next)
        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err })
        })
    } else next()
  })
}


function storeControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/master', req.params.func)
    if (ctl) {
      storePassport(req)
        .then((sessionDoc) => {
          ctl(db, sessionDoc, req)
            .then((data) => {
              if (data == undefined) res.json({ success: true })
              else if (data == null) res.json({ success: true })
              else {
                res.status(200).json({ success: true, data: data })
              }
            })
            .catch(next)
        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err })
        })
    } else next()
  })
}


function storePassport(req) {
  return new Promise((resolve, reject) => {
    let token = req.getValue('token')
    if (token) {
      token = token.split('AABI_')[1]
      auth
        .verify(token)
        .then((decoded) => {
          db.sessions
            .findOne({ _id: decoded.sessionId })
            .then((sessionDoc) => {

              if (sessionDoc) {
                if (sessionDoc.closed) {
                  reject('session closed')
                } else {
                  sessionDoc.lastOnline = new Date()
                  sessionDoc.lastIP = req.IP
                  sessionDoc.save()
                    .then(resolve)
                    .catch(reject)

                }
              } else {
                reject('session not found. login again.')
              }
            })
            .catch(reject)
        })
        .catch(reject)
    } else {
      reject('authorization failed. token is empty.')
    }
  })
}

function pubControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/pub', req.params.func)
    let spam = spamCheck(req.IP)
    if (!spam) {
      if (ctl) {
        ctl(req, res)
          .then((data) => {
            // res.end()
          })
          .catch(next)
      } else next()
    } else {
      next(`Suspicious login attempts. Try again after ${spam} seconds.`)
    }
  })
}

function managerAuthControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/manager/auth', req.params.func)
    let spam = spamCheck(req.IP)
    if (!spam) {
      if (ctl) {
        ctl(req)
          .then((data) => {
            if (data == undefined) res.json({ success: true })
            else if (data == null) res.json({ success: true })
            else {
              res.status(200).json({
                success: true,
                data: data,
              })
            }
          })
          .catch(next)
      } else next()
    } else {
      next(`Suspicious login attempts. Try again after ${spam} seconds.`)
    }
  })
}

function managerControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/manager', req.params.func)
    if (ctl) {
      managerPassport(req)
        .then(sessionDoc => {
          ctl(db, sessionDoc, req)
            .then((data) => {
              if (data == undefined) res.json({ success: true })
              else if (data == null) res.json({ success: true })
              else {
                res.status(200).json({ success: true, data: data })
              }
            })
            .catch(next)
        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err })
        })
    } else next()
  })
}



function repoControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/repo', req.params.func)
    if (ctl) {
      passport(req)
        .then(async sessionDoc => {
          if (!sessionDoc) return reject('Unauthorized operation. {token} is empty. Please log in again.')
          if (!sessionDoc.db) return reject('Database not selected')
          const dbDoc = await db.databases.findOne({
            $or: [{ owner: sessionDoc.member }, { 'team.teamMember': sessionDoc.member }]
            , passive: false
          })
          if (!dbDoc) return reject(`Database not found`)
          getRepoDbModel(sessionDoc.member, dbDoc.dbName, 'server1')
            .then(dbModel => {
              ctl(dbModel, sessionDoc, req)
                .then((data) => {
                  if (data == undefined) res.json({ success: true })
                  else if (data == null) res.json({ success: true })
                  else {
                    res.status(200).json({ success: true, data: data })
                  }
                })
                .catch(next)
                .finally(() => {
                  dbModel.free()
                  dbModel = undefined
                })
            })
            .catch(err => {
              res.status(400).json({ success: false, error: err })
            })

        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err })
        })
    } else next()
  })
}

function adminAuthControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/admin/auth', req.params.func)
    let spam = spamCheck(req.IP)
    if (!spam) {
      if (ctl) {
        ctl(req)
          .then((data) => {
            if (data == undefined) res.json({ success: true })
            else if (data == null) res.json({ success: true })
            else {
              res.status(200).json({
                success: true,
                data: data,
              })
            }
          })
          .catch(next)
      } else next()
    } else {
      next(`Suspicious login attempts. Try again after ${spam} seconds.`)
    }
  })
}

function adminControllers(app, route) {
  setRoutes(app, route, (req, res, next) => {
    const ctl = getController('/admin', req.params.func)
    if (ctl) {
      adminPassport(req)
        .then(sessionDoc => {
          ctl(db, sessionDoc, req)
            .then((data) => {
              if (data == undefined) res.json({ success: true })
              else if (data == null) res.json({ success: true })
              else {
                res.status(200).json({ success: true, data: data })
              }
            })
            .catch(next)
        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err })
        })
    } else next()
  })
}

function adminPassport(req) {
  return new Promise((resolve, reject) => {
    let admintoken = req.getValue('admintoken')
    if (admintoken) {
      admintoken = admintoken.split('ADMIN_')[1]
      auth
        .verify(admintoken)
        .then(decoded => {
          db.adminSessions
            .findOne({ _id: decoded.sessionId })
            .then((sessionDoc) => {
              if (sessionDoc) {
                if (sessionDoc.closed) {
                  reject('session closed')
                } else {
                  sessionDoc.lastOnline = new Date()
                  sessionDoc.lastIP = req.IP
                  sessionDoc.save()
                    .then(resolve)
                    .catch(reject)

                }
              } else {
                reject('admin session not found. login again.')
              }
            })
            .catch(reject)
        })
        .catch(reject)
    } else {
      reject('authorization failed. admintoken is empty.')
    }
  })
}

async function s3Controllers(app, route) {
  const multer = require('multer')
  const appName = require('./package.json').name

  const storage = multer.memoryStorage()
  const fileFilter = (req, file, cb) => {
    // if(file.size>1024*1024){
    //   cb('Max:1Mb',false)
    // }else{
    //   cb(null,true)
    // }
    // if ((file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') && file.size < 1048576) {
    // if ((file.mimetype === 'image/jpeg' || file.mimetype === 'image/png')) {
    //   cb(null, true)
    // } else {
    //   cb(null, false)
    // }
    cb(null, true)
  }
  const upload = multer({ storage: storage, fileFilter: fileFilter })

  // const cpUpload = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'files', maxCount: 8 }, { name: 'avatar', maxCount: 1 }])

  setRoutes(app, route, upload.array('file', 10), (req, res, next) => {
    const ctl = getController('/s3', req.params.func)
    if (ctl) {
      passport(req)
        .then((sessionDoc) => {
          if (sessionDoc) {
            ctl(db, sessionDoc, req)
              .then((data) => {
                if (data == undefined) res.json({ success: true })
                else if (data == null) res.json({ success: true })
                else {
                  res.status(200).json({ success: true, data: data })
                }
              })
              .catch(next)
          } else {
            res.status(401).json({ success: false, error: `permission denied` })
          }
        })
        .catch((err) => {
          res.status(401).json({ success: false, error: err.message || err || 'error' })
        })
    } else next()
  })
}


function sendError(err, req, res) {
  let errorMessage = 'Error'
  let statusCode = 400
  if (typeof err == 'string') {
    errorMessage = err
  } else {
    if (err.message) errorMessage = err.message
  }
  let response = { success: false, error: errorMessage }

  if (errorMessage.toLowerCase().includes('not found')) {
    statusCode = 404
  }
  else if (process.env.ERROR_DOCUMENTATION_URI && req.route) {
    let baseUrl = req.route.path.split('/:func')[0]
    let func = req.url
      .substring(baseUrl.length + 1)
      .split('?')[0]
      .split('/')[0]
    response.docUrl = `${process.env.ERROR_DOCUMENTATION_URI}?func=${func}`
  }
  res.status(statusCode).json(response)
}

global.setRoutes = (app, route, cb1, cb2) => {
  let dizi = route.split('/:')
  let yol = ''
  dizi.forEach((e, index) => {
    if (index > 0) {
      yol += `/:${e}`
      if (cb1 != undefined && cb2 == undefined) {
        app.all(yol, cb1)
      } else if (cb1 != undefined && cb2 != undefined) {
        app.all(yol, cb1, cb2)
      }
    } else {
      yol += e
    }
  })
}

function getController(pathName, funcName) {

  let controllerName = path.join(__dirname, `controllers`, `${pathName}`, `${funcName}.controller.js`)
  if (fs.existsSync(controllerName) == false) {
    return false
  } else {
    return require(controllerName)
  }
}


function managerPassport(req) {
  return new Promise((resolve, reject) => {
    let managertoken = req.getValue('managertoken')

    if (managertoken) {
      managertoken = managertoken.split('MANAGER_')[1]
      console.log('managertoken:', managertoken)
      auth
        .verify(managertoken)
        .then(decoded => {
          console.log('decoded:', decoded)
          db.managerSessions
            .findOne({ _id: decoded.sessionId })
            .then((sessionDoc) => {

              if (sessionDoc) {
                if (sessionDoc.closed) {
                  reject('session closed')
                } else {
                  sessionDoc.lastOnline = new Date()
                  sessionDoc.lastIP = req.IP
                  sessionDoc.save()
                    .then(resolve)
                    .catch(reject)

                }
              } else {
                reject('b4b manager session not found. login again.')
              }
            })
            .catch(reject)
        })
        .catch(reject)
    } else {
      reject('authorization failed. admintoken is empty.')
    }
  })
}

global.getSessionMember = (sessionDoc) => new Promise((resolve, reject) => {
  db.members.findOne({ _id: sessionDoc.member })
    .then(memberDoc => {
      if (memberDoc) {
        resolve(memberDoc)
      } else {
        reject('kullanıcı bulunamadı')
      }
    })
    .catch(reject)
})

global.restError = {
  param1: function (req, next) {
    next(`:[/${req.params.func}] [/:param1] gereklidir`)
  },
  param2: function (req, next) {
    next(
      `:[/${req.params.func}/${req.params.param1}] [/:param2] gereklidir`
    )
  },
  method: function (req, next) {
    next(`:${req.params.func} Hatalı method: ${req.method}`)
  },
  session: function (req, next) {
    next(`Bu işlem için yetkiniz yok`)
  },
  auth: function (req, next) {
    next(`Bu işlem için yetkiniz yok`)
  },
  data: function (req, next, field) {
    if (field) {
      next(`'${field}' Hatalı veya eksik veri`)
    } else {
      next(`Hatalı veya eksik veri`)
    }
  },
}
