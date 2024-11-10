const sharp = require('sharp')
const { uploadToS3Bucket } = require('../../lib/awsS3')
const { ObjectId } = require('mongodb')
const imageWithExif = {
	IFD0: { Copyright: process.env.IMAGE_SHARP_COPYRIGHT || 'AliAbi Open Source Digital Equipments' }
}


module.exports = (dbModel, sessionDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (req.method != 'POST') return restError.method(req, reject)

		console.log('req.body:', req.body)
		console.log('req.files:', req.files)
		if (!req.files || Object.keys(req.files).length === 0) {
			return reject('No files were uploaded.')
		}

		const s3Folder = req.body.folder || req.query.folder || req.body.s3Folder || ''
		const imgResizeFit = req.body.fit || 'inside'
		const alt = req.body.alt || req.query.alt || ''


		var result = []



		const file = req.files[0]
		const zamanDamga = new Date().toISOString().split('.')[0].replace(/-|:|T/g, '')
		const fileName = file.originalname.toLowerCase().replace(/[^a-z0-9-.]/g, '-').replace(/((.jpeg)$|(.jpg)$|(.png)$)/, '')
		const imageId = new ObjectId()
		console.log('fileName:', fileName)

		if (file.mimetype.startsWith('image/')) {


			let imgData = await convertMainImage(file.mimetype, file.buffer)

			let s3UploadFileBasePath = `${s3Folder}${fileName}_t${zamanDamga}`
			let extension = file.mimetype == 'image/png' ? '.png' : '.jpg'
			// let mimetype = file.mimetype

			let s3UploadFilePath = `${s3UploadFileBasePath}${extension}`
			let fileUrl = await uploadToS3Bucket(s3UploadFilePath, file.mimetype, imgData.data, imgData.info.size)

			result.push(fileUrl)

			return resolve(fileUrl)
		}



		resolve('')


	} catch (err) {
		devLog(err)
		reject(err || 'error')
	}
})


function convertMainImage(mimetype, buf) {
	return new Promise(async (resolve, reject) => {
		let srp = null
		let result = null
		if (mimetype == 'image/png') {
			srp = sharp(buf).png({}).withExifMerge(imageWithExif)
			result = await srp.rotate().resize(800, 800, { fit: 'inside' }).toBuffer({ resolveWithObject: true })
		} else {
			srp = sharp(buf).jpeg({}).withExifMerge(imageWithExif)
			result = await srp.rotate().resize(800, 800, { fit: 'inside' }).toBuffer({ resolveWithObject: true })
		}
		resolve(result)
	})
}
