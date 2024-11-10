const sender = require('../../lib/sender')
const auth = require('../../lib/auth')
module.exports = (req) => new Promise(async (resolve, reject) => {
  try {


    if (req.method != 'POST') return restError.method(req, reject)
    let username = null
    let email = null
    let phoneNumber = null
    let identifier = null
    let role = req.getValue('role') || 'user'

    identifier = req.getValue('identifier')
    if (!identifier) {
      username = req.getValue('username')
      email = req.getValue('email')
      phoneNumber = req.getValue('phoneNumber')
    } else {
      if (identifier.includes('@')) {
        email = identifier
      } else if (!isNaN(identifier)) {
        phoneNumber = identifier
      } else {
        username = identifier
      }
    }
    let filter = {}
    if (email) {
      filter.email = email
    } else if (phoneNumber) {
      filter.phoneNumber = phoneNumber
    } else if (username) {
      filter.username = username
    } else {
      return reject(`One of email, phoneNumber, username required.`)
    }

    if (!role) return reject(`Role parametresi eksik.`)

    const memberDoc = await db.members.findOne(filter)
    if (!memberDoc) return reject(`member not found`)

    if (phoneNumber && util.isValidTelephone(memberDoc.phoneNumber)) {
      sender
        .sendForgotPasswordSms(memberDoc.phoneNumber, memberDoc.password)
        .then(() => resolve(`your password has been sent to your phone. ${memberDoc.phoneNumber}`))
        .catch(reject)
    } else if ((username || email) && util.isValidEmail(memberDoc.email)) {

      // TODO: token expires degeri 300 = 5dk olarak ayarlandi.
      let obj = {
        memberId: memberDoc._id.toString(),
        username: memberDoc.username,
        email: memberDoc.email,
        role: role
      }
      const resetToken = 'RESETTOKEN_' + auth.sign(obj, 300 * 1000)
      sender
        .sendResetPasswordEmail(memberDoc.email, resetToken)
        .then(() => resolve({
          message: `reset password link has been sent to your email. ${memberDoc.email}`,
          resetToken: resetToken
        }))
        .catch(reject)
    }
  } catch (err) {
    reject(err)
  }
})
