const sender = require('../../lib/sender')
const auth = require('../../lib/auth')
module.exports = (req) =>
  new Promise(async (resolve, reject) => {
    try {
      let resetToken = req.query.resetToken || req.body.resetToken || ''
      if (resetToken) {
        if (!resetToken.startsWith('RESETTOKEN_')) return reject(`incorrect reset token`)
        resetToken = resetToken.split('RESETTOKEN_')[1]

        let decoded = await auth.verify(resetToken)

        if (req.params.param1 == 'test') {
          resolve({ decoded: decoded, resetToken: resetToken })
        } else if (req.params.param1 == 'newPass' && req.method == 'POST') {
          let password = req.body.password || ''
          if (password.length < 8) return reject('password must be 8 characters.')
          db.members.findOne({ _id: decoded.memberId })
            .then(memberDoc => {
              memberDoc.password = password
              memberDoc.modifiedDate = new Date()
              memberDoc.save()
                .then(resp => {
                  resolve('your password has been changed successfully.')
                })
                .catch(reject)
            })
            .catch(reject)
        } else {
          reject(`invalid method or parameter  GET /auth/resetPass/test || POST /auth/resetPass/newPass  req.body:{resetToken, password}`)
        }

      } else {
        reject('resetToken required')
      }
    } catch (err) {
      reject(err)
    }
  })
