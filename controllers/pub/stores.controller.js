const request = require('request')

module.exports = (req, res) => new Promise(async (resolve, reject) => {
	try {
		if (!req.params.param1) return reject(`param1 required`)
		switch (req.method) {
			case 'GET':
				if (req.params.param2 == 'manifest') {
					getManifest(req, res).then(resolve).catch(reject)
				} else if (req.params.param2 == 'logo') {
					getLogo(req, res).then(resolve).catch(reject)
				} else if (req.params.param2 == 'icon') {
					getIcon(req, res).then(resolve).catch(reject)
				} else {
					getStore(req, res).then(resolve).catch(reject)
				}

				break

			default:
				restError.method(req, reject)
				break
		}
	} catch (err) {
		reject(err)
	}
})

function getIcon(req, res) {
	return new Promise((resolve, reject) => {
		try {

			db.stores
				.findOne({ identifier: req.params.param1, passive: false })
				.select('_id icon')
				.then(storeDoc => {
					let url = 'https://rapor.trendsenfoni.com/img/icon.png'
					if (storeDoc && storeDoc.icon) {
						url = storeDoc.icon
					}
					request({ url: url, encoding: null }, (err, resp, buffer) => {
						if (!err && resp.statusCode === 200) {
							if (url.endsWith('png')) {
								res.set("Content-Type", "image/png")
							} else {
								res.set("Content-Type", "image/jpeg")
							}

							res.send(resp.body)
						}
					})
					resolve()
				})
				.catch(reject)
		} catch (err) {
			reject(err)
		}
	})
}

function getLogo(req, res) {
	return new Promise((resolve, reject) => {
		try {

			db.stores
				.findOne({ identifier: req.params.param1, passive: false })
				.select('_id logo')
				.then(storeDoc => {
					let url = 'https://png.pngtree.com/png-vector/20190820/ourmid/pngtree-no-image-vector-illustration-isolated-png-image_1694547.jpg'
					if (storeDoc && storeDoc.logo) {
						url = storeDoc.logo
					}
					request({ url: url, encoding: null }, (err, resp, buffer) => {
						if (!err && resp.statusCode === 200) {
							if (url.endsWith('png')) {
								res.set("Content-Type", "image/png")
							} else {
								res.set("Content-Type", "image/jpeg")
							}

							res.send(resp.body)
						}
					})
					resolve()
				})
				.catch(reject)
		} catch (err) {
			reject(err)
		}
	})
}

function getManifest(req, res) {
	return new Promise((resolve, reject) => {
		try {

			db.stores
				.findOne({ identifier: req.params.param1, passive: false })
				.select('_id manifest')
				.then(storeDoc => {
					if (!storeDoc) {
						reject(`store not found`)
					} else {
						res.status(200).json(storeDoc.manifest || {})

					}
					resolve()
				})
				.catch(reject)
		} catch (err) {
			reject(err)
		}
	})
}
function getStore(req, res) {
	return new Promise((resolve, reject) => {
		try {

			db.stores
				.findOne({ identifier: req.params.param1, passive: false })
				.select('_id name identifier logo icon slogan description domain')
				.then(storeDoc => {
					if (!storeDoc) {
						reject(`store not found`)
					} else {
						res.status(200).json(storeDoc)
						resolve()
					}
				})
				.catch(reject)
		} catch (err) {
			reject(err)
		}
	})
}