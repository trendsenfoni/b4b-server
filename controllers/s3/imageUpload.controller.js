const sharp = require('sharp')
const { uploadToS3Bucket } = require('../../lib/awsS3')
const { ObjectId } = require('mongodb')
const imageWithExif = {
	IFD0: { Copyright: process.env.IMAGE_SHARP_COPYRIGHT || 'AliAbi Open Source Digital Equipments' }
}

module.exports = (dbModel, sessionDoc, req) => new Promise(async (resolve, reject) => {
	try {
		if (req.method != 'POST')
			return restError.method(req, reject)

		if (!req.files || Object.keys(req.files).length === 0) {
			return reject('No files were uploaded.')
		}

		let s3Folder = req.body.folder || req.query.folder || req.body.s3Folder || ''
		let fit = req.body.fit || req.query.fit || 'outside'
		let alt = req.body.alt || req.query.alt || ''
		let tags = req.body.tags || req.query.tags || ''

		var taskList = []
		var result = []
		var i = 0



		while (i < req.files.length) {
			const file = req.files[i]
			if (!file.mimetype.startsWith('image/')) {
				return reject(`mimetype type error. only jpg or png`)
			}
			i++
		}

		i = 0
		while (i < req.files.length) {
			const file = req.files[i]
			// const file = req.files[0]

			const fileName = file.originalname.toLowerCase().replace(/[^a-z0-9-.]/g, '-').replace(/((.jpeg)$|(.jpg)$|(.png)$)/, '')
			// TODO: sadece png ve jpg kabul ediyoruz. User webp veya avif gonderebilir. 
			const extension = file.mimetype == 'image/png' ? '.webp' : '.avif'
			const mimetype = file.mimetype == 'image/png' ? 'image/webp' : 'image/avif'
			const imageId = new ObjectId()
			const zamanDamga = new Date().toISOString().split('.')[0].replace(/-|:|T/g, '')
			const s3UploadFileBasePath = `${s3Folder}${imageId.toString()}_${fileName}_t${zamanDamga}`

			const mainImgData = await convertMainImage(file.mimetype, file.buffer)

			await uploadToS3Bucket(`${s3UploadFileBasePath}${extension}`, mimetype, mainImgData.data, mainImgData.info.size)

			var imageDoc = dbModel.s3images({
				_id: imageId,
				src: `${process.env.AWS_S3_PUBLIC_URI}/${s3UploadFileBasePath}${extension}`,
				width: mainImgData.info.width,
				height: mainImgData.info.height,
				alt: alt || file.originalname,
				size: mainImgData.info.size,
				tags: tags,
				mimetype: file.mimetype == 'image/png' ? 'image/webp' : 'image/avif',
				fit: fit,
				// img800: { src: `${process.env.AWS_S3_PUBLIC_URI}/${s3UploadFileBasePath}_w800${extension}`, width: 800, height: 800 },
				// img400: { src: `${process.env.AWS_S3_PUBLIC_URI}/${s3UploadFileBasePath}_w400${extension}`, width: 400, height: 400 },
				// img200: { src: `${process.env.AWS_S3_PUBLIC_URI}/${s3UploadFileBasePath}_w200${extension}`, width: 200, height: 200 },
				// img100: { src: `${process.env.AWS_S3_PUBLIC_URI}/${s3UploadFileBasePath}_w100${extension}`, width: 100, height: 100 },
			})

			await imageDoc.save()
			result.push(imageDoc)
			taskList.push({
				mainImgData: mainImgData,
				mimetype: mimetype,
				s3UploadFileBasePath: s3UploadFileBasePath,
				zamanDamga: zamanDamga,
				imageDoc: imageDoc,
				fit: fit,
				s3Folder: s3Folder,
				alt: alt,
				tags: tags,
				extension: extension,

			})

			i++
		}
		// console.log('result:',result)
		resolve(result)
	} catch (err) {
		console.log(err)
		return reject(err)
	}

	try {
		i = 0
		while (i < taskList.length) {

			const img800 = await convertSmallImages(taskList[i].mimetype, taskList[i].mainImgData.data, taskList[i].fit, 800, 800)
			taskList[i].imageDoc.img800 = {
				src: await uploadToS3Bucket(`${taskList[i].s3UploadFileBasePath}_w800${taskList[i].extension}`, taskList[i].mimetype, img800.data, img800.info.size),
				size: img800.info.size,
				width: img800.info.width,
				height: img800.info.width,
			}

			const img400 = await convertSmallImages(taskList[i].mimetype, img800.data, taskList[i].fit, 400, 400)
			taskList[i].imageDoc.img400 = {
				src: await uploadToS3Bucket(`${taskList[i].s3UploadFileBasePath}_w400${taskList[i].extension}`, taskList[i].mimetype, img400.data, img400.info.size),
				size: img400.info.size,
				width: img400.info.width,
				height: img400.info.width,
			}

			const img200 = await convertSmallImages(taskList[i].mimetype, img400.data, taskList[i].fit, 200, 200)
			taskList[i].imageDoc.img200 = {
				src: await uploadToS3Bucket(`${taskList[i].s3UploadFileBasePath}_w200${taskList[i].extension}`, taskList[i].mimetype, img200.data, img200.info.size),
				size: img200.info.size,
				width: img200.info.width,
				height: img200.info.width,
			}

			const img100 = await convertSmallImages(taskList[i].mimetype, img200.data, taskList[i].fit, 100, 100)
			taskList[i].imageDoc.img100 = {
				src: await uploadToS3Bucket(`${taskList[i].s3UploadFileBasePath}_w100${taskList[i].extension}`, taskList[i].mimetype, img100.data, img100.info.size),
				size: img100.info.size,
				width: img100.info.width,
				height: img100.info.width,
			}
			taskList[i].imageDoc.save()
			i++
		}
		// TODO: Buraya gelecekte upload eden kullaniciyi websocket uzerinden "resim isleme bitti" gibi bilgilendiriyoruz
		// notifyUser(sessionDoc)
		// ---------
	} catch (err) {
		errorLog(err)
	}
})


function convertSmallImages(mimetype, buf, fit = 'contain', width = null, height = null) {
	return new Promise(async (resolve, reject) => {
		let srp = null
		let result = null
		if (mimetype == 'image/png') {
			srp = sharp(buf).webp({ nearLossless: true, }).withExifMerge(imageWithExif)
			result = await srp.withMetadata().resize(width, height, { fit: fit }).toBuffer({ resolveWithObject: true })
			result.info.mimetype = 'image/webp'
		} else {
			srp = sharp(buf).avif({ lossless: true }).withExifMerge(imageWithExif)
			result = await srp.withMetadata().resize(width, height, { fit: fit }).toBuffer({ resolveWithObject: true })
			result.info.mimetype = 'image/avif'
		}
		resolve(result)
	})
}


function convertMainImage(mimetype, buf) {
	return new Promise(async (resolve, reject) => {
		let srp = null
		let result = null
		if (mimetype == 'image/png') {
			srp = sharp(buf).withMetadata().webp({ nearLossless: true, }).withExifMerge(imageWithExif)
			result = await srp.toBuffer({ resolveWithObject: true })
			// result = await srp.composite([{
			// 	input: path.join(__dirname, 'watermark-w150.png'),
			// }]).toBuffer({ resolveWithObject: true })
		} else {
			// srp = sharp(buf).withMetadata().avif({}).withExifMerge(imageWithExif)
			srp = sharp(buf).avif({}).withExifMerge(imageWithExif)
			result = await srp.rotate().toBuffer({ resolveWithObject: true })
			// result = await srp.composite([{
			// 	input: path.join(__dirname, 'watermark-w300.png'),
			// }]).toBuffer({ resolveWithObject: true })
		}
		resolve(result)
	})
}
