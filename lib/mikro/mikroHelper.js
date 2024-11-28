const { mssql } = require('../connectorAbi')

exports.cariKartlar = function (connector, lastModified) {
  return new Promise(async (resolve, reject) => {
    if (!lastModified) {
      lastModified = '1900-01-01'
    }
    try {
      const query = `
      SELECT TOP 200 * FROM (
        SELECT
          cari_kod as code, LOWER(cari_unvan1) as [name], LOWER(cari_unvan2) as name2, cari_vdaire_adi as taxOffice,
          cari_vdaire_no as taxNumber, cari_CepTel as phoneNumber, cari_EMail as email,
          dbo.fn_DovizSembolu(cari_doviz_cinsi) as currency,
          ISNULL(CA.adr_cadde,'') + ' ' + ISNULL(CA.adr_sokak,'') as streetName,
          ISNULL(CA.adr_ilce,'') + ' ' + ISNULL(CA.adr_mahalle,'') as citySubdivisionName,
          ISNULL(CA.adr_il,'') as cityName, ISNULL(CA.adr_Semt,'') as district,
          ISNULL(CA.adr_Apt_No,'') as buildingNumber, ISNULL(CA.adr_Daire_No,'') as room,
          ISNULL(CA.adr_posta_kodu,'') as postalZone,
          LOWER(ISNULL(CA.adr_ulke,'Türkiye')) as countryName,
          CASE
            WHEN C.cari_lastup_date>=ISNULL(CA.adr_lastup_date,'1900-01-01') THEN C.cari_lastup_date
            ELSE CA.adr_lastup_date
          END as lastModified
        FROM CARI_HESAPLAR C LEFT OUTER JOIN
        CARI_HESAP_ADRESLERI CA ON C.cari_kod=CA.adr_cari_kod AND C.cari_fatura_adres_no=CA.adr_adres_no
        WHERE cari_CepTel<>'' AND cari_vdaire_no<>''
        ) X
        WHERE lastModified>'${lastModified}'
        ORDER BY lastModified
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => {
              if (e.currency == 'TL' || e.currency == 'YTL')
                e.currency = 'TRY'
              e.name = util.camelize(e.name)
              e.description = util.camelize(e.description)
              e.email = e.email.toLowerCase()
              e.taxOffice = util.camelize(e.taxOffice)
              e.streetName = util.camelize(e.streetName)
              e.citySubdivisionName = util.camelize(e.citySubdivisionName)
              e.district = util.camelize(e.district)
              e.cityName = util.camelize(e.cityName)
              e.buildingNumber = util.camelize(e.buildingNumber)
              e.room = util.camelize(e.room)
              e.countryName = e.countryName.trim() == '' ? 'Türkiye' : util.camelize(e.countryName)
              e.phoneNumber = util.fixPhoneNumber(e.phoneNumber)
              e.taxNumber = e.taxNumber.replace(/[^0-9]/g, '')
            })
            resolve(list)
          } else {
            resolve([])
          }
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

exports.stokKartlari = function (connector, lastModified) {
  return new Promise(async (resolve, reject) => {
    if (!lastModified) {
      lastModified = '1900-01-01'
    }
    try {
      const query = `
      SELECT TOP 1000
        S.sto_kod as code, S.sto_isim as [name],
        S.sto_lastup_date as lastModified, ISNULL(SA.san_isim,'') as [group], ISNULL(SALT.sta_isim,'') as subGroup,
        ISNULL(SM.mrk_ismi,'') as brand, sto_uretici_kodu as manufacturerCode,
        ISNULL(SK.ktg_isim,'') as category, sto_pasif_fl as Passive,
        sto_birim1_ad unit,dbo.fn_VergiYuzde(sto_perakende_vergi) as retailVatRate,
        dbo.fn_VergiYuzde(sto_toptan_vergi) as wholeVatRate
      FROM STOKLAR S LEFT OUTER JOIN
        STOK_ANA_GRUPLARI SA ON S.sto_anagrup_kod=SA.san_kod LEFT OUTER JOIN
        STOK_ALT_GRUPLARI SALT ON S.sto_altgrup_kod = SALT.sta_kod LEFT OUTER JOIN
        STOK_MARKALARI SM ON S.sto_marka_kodu=SM.mrk_kod LEFT OUTER JOIN
        STOK_KATEGORILERI SK ON S.sto_kategori_kodu=SK.ktg_kod
      WHERE sto_lastup_date>'${lastModified}'
        AND sto_bedenli_takip=0 AND sto_renkDetayli=0
      ORDER BY sto_lastup_date
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => {
              e.name = util.camelize(e.name)
              e.group = util.camelize(e.group)
              e.subGroup = util.camelize(e.subGroup)
              e.brand = util.camelize(e.brand)
              e.category = util.camelize(e.category)
              e.unit = util.camelize(e.unit)
            })
            resolve(list)
          } else {
            resolve([])
          }
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

exports.stokSatisFiyatlari = function (connector, lastModified) {
  return new Promise(async (resolve, reject) => {
    if (!lastModified) {
      lastModified = '1900-01-01'
    }
    try {
      const query = `
      SELECT TOP 200 FL.sfiyat_Guid, FL.sfiyat_lastup_date as lastModified,
        FL.sfiyat_stokkod as code,FL.sfiyat_listesirano as priceGroup, FL.sfiyat_fiyati as price,
        dbo.fn_DovizSembolu(FL.sfiyat_doviz) as currency,
        FL.sfiyat_iskontokod as discountGroup, FL.sfiyat_kampanyakod as campaignCode,
        FL.sfiyat_deposirano as warehouseCode, FL.sfiyat_birim_pntr,
        CASE
          WHEN FL.sfiyat_birim_pntr=2 THEN S.sto_birim2_ad
          WHEN FL.sfiyat_birim_pntr=3 THEN S.sto_birim3_ad
          WHEN FL.sfiyat_birim_pntr=4 THEN S.sto_birim4_ad
          ELSE S.sto_birim1_ad 
        END as unit
      FROM STOK_SATIS_FIYAT_LISTELERI FL INNER JOIN
      STOKLAR S ON S.sto_kod=FL.sfiyat_stokkod
      WHERE FL.sfiyat_lastup_date>'${lastModified}'
      ORDER BY FL.sfiyat_lastup_date
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {

            let list = result.recordsets[0] || []
            console.log('stokSatisFiyatlari list.length:', list.length)
            list.forEach(e => {
              if (e.currency == 'TL' || e.currency == 'YTL')
                e.currency = 'TRY'
              e.unit = util.camelize(e.unit)
            })

            resolve(list)
          } else {
            resolve([])
          }
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}