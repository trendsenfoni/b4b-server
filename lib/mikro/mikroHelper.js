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

exports.siparisler = function (connector, firmCode, startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    if (!firmCode) reject('firmCode required')
    if (!startDate) reject('startDate required')
    if (!endDate) reject('endDate required')


    try {
      const query = `
      SELECT X.issueDate, X.shippedDate, X.documentNumber, ROUND(SUM(X.amount),2) as totalAmount, ROUND(SUM(X.taxAmount),2) as taxAmount,
        ROUND(SUM(X.taxInclusiveAmount),2)  as taxInclusiveAmount, count(*) as lineCount,
        SUM(X.sip_miktar) as tQuantity, SUM(X.sip_teslim_miktar) as deliveredQuantity, SUM(X.sip_miktar-X.sip_teslim_miktar) as remainingQuantity,
        S.sip_aciklama as [description],dbo.fn_DovizSembolu(S.sip_doviz_cinsi) as currency
        FROM (
        SELECT sip_Tarih as issueDate,
        sip_teslim_tarih as shippedDate,
        sip_evrakno_seri + '-' + CAST(sip_evrakno_sira as varchar(10)) as documentNumber,
        dbo.fn_SiparisNetTutar(sip_tutar,sip_iskonto_1,sip_iskonto_2,sip_iskonto_3,sip_iskonto_4,sip_iskonto_5,sip_iskonto_6,
        sip_masraf_1,sip_masraf_2,sip_masraf_3,sip_masraf_4,sip_vergi, sip_masvergi, sip_Otv_Vergi, sip_otvtutari, sip_vergisiz_fl,
        sip_doviz_cinsi,sip_doviz_kuru,sip_alt_doviz_kuru,sip_Tevkifat_turu) taxInclusiveAmount,
        sip_tutar - sip_iskonto_1 - sip_iskonto_2 - sip_iskonto_3 - sip_iskonto_4 - sip_iskonto_5 - sip_iskonto_6 + sip_masraf_1 + sip_masraf_2 + sip_masraf_3 + sip_masraf_4 as amount,
        sip_vergi + sip_masvergi as taxAmount,
        sip_miktar, sip_teslim_miktar, sip_evrakno_seri, sip_evrakno_sira, sip_musteri_kod as firmCode
        FROM SIPARISLER
        WHERE sip_tip=0 and sip_cins=0
        ) X INNER JOIN
        SIPARISLER S ON S.sip_evrakno_seri=X.sip_evrakno_seri AND S.sip_evrakno_sira=X.sip_evrakno_sira AND S.sip_musteri_kod=X.firmCode AND S.sip_satirno=0
      WHERE X.firmCode='${firmCode}'
        AND X.issueDate BETWEEN '${startDate}' AND '${endDate}'
      GROUP BY X.issueDate, X.shippedDate, X.documentNumber, X.firmCode, S.sip_aciklama, S.sip_doviz_cinsi
      ORDER BY X.issueDate DESC, X.documentNumber DESC
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {

            let list = result.recordsets[0] || []
            list.forEach(e => {
              if (e.currency == 'TL' || e.currency == 'YTL')
                e.currency = 'TRY'
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

exports.siparis = function (connector, firmCode, orderId) {
  return new Promise(async (resolve, reject) => {
    if (!firmCode) reject('firmCode required')
    if (!orderId) reject('orderId required')


    try {
      const query = `
        SELECT sip_Tarih as issueDate,  sip_teslim_tarih as shippedDate,
          sip_evrakno_seri + '-' + CAST(sip_evrakno_sira as varchar(10)) as documentNumber,
          ROUND(dbo.fn_SiparisNetTutar(sip_tutar,sip_iskonto_1,sip_iskonto_2,sip_iskonto_3,sip_iskonto_4,sip_iskonto_5,sip_iskonto_6,
          sip_masraf_1,sip_masraf_2,sip_masraf_3,sip_masraf_4,sip_vergi, sip_masvergi, sip_Otv_Vergi, sip_otvtutari, sip_vergisiz_fl,
          sip_doviz_cinsi,sip_doviz_kuru,sip_alt_doviz_kuru,sip_Tevkifat_turu),2) as taxInclusiveAmount,
          ROUND(sip_tutar - sip_iskonto_1 - sip_iskonto_2 - sip_iskonto_3 - sip_iskonto_4 - sip_iskonto_5 - sip_iskonto_6 + sip_masraf_1 + sip_masraf_2 + sip_masraf_3 + sip_masraf_4,2) as amount,
          ROUND(sip_vergi + sip_masvergi,2) as taxAmount,dbo.fn_VergiYuzde(sip_vergi_pntr) as taxRate,
          sip_b_fiyat as price,ROUND(sip_iskonto_1 - sip_iskonto_2 - sip_iskonto_3 - sip_iskonto_4 - sip_iskonto_5 - sip_iskonto_6,2) as discountAmount,
          ROUND(sip_masraf_1 + sip_masraf_2 + sip_masraf_3 + sip_masraf_4,2) as expenseAmount,
          sip_miktar as quantity, sip_teslim_miktar as deliveredQuantity, sip_musteri_kod as firmCode,
          sto_kod as itemCode, sto_isim as itemName, sip_satirno+1 as [lineNo], sto_birim1_ad as unit,
          sip_miktar-sip_teslim_miktar as remainingQuantity,
          sip_aciklama as [description],dbo.fn_DovizSembolu(sip_doviz_cinsi) as currency
        FROM SIPARISLER INNER JOIN
          STOKLAR ON SIPARISLER.sip_stok_kod=STOKLAR.sto_kod
        WHERE  sip_musteri_kod='${firmCode}' AND (sip_evrakno_seri + '-' + CAST(sip_evrakno_sira as varchar(10)))='${orderId}'
        ORDER BY sip_satirno
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {

            let list = result.recordsets[0] || []

            list.forEach(e => {
              if (e.currency == 'TL' || e.currency == 'YTL')
                e.currency = 'TRY'
              e.unit = util.camelize(e.unit)
              e.issueDate = (e.issueDate || '').substring(0, 10)
              e.shippedDate = (e.shippedDate || '').substring(0, 10)
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

exports.cariHareketler = function (connector, firmCode, startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    if (!firmCode) reject('firmCode required')
    if (!startDate) reject('startDate required')
    if (!endDate) reject('endDate required')


    try {
      const query = `
      SELECT * FROM (
        SELECT issueDate, documentNumber,
          CASE WHEN debit>=credit THEN debit-credit ELSE 0 END as debit,
          CASE WHEN credit>debit THEN credit-debit ELSE 0 END as credit,
          [description],lineCount, eInvoiceNumber
          FROM (
          SELECT '${startDate}' as issueDate , ' ' as documentNumber,
          ROUND(SUM(CASE WHEN cha_tip=0 THEN cha_meblag ELSE 0 END),2) AS debit,
          ROUND(SUM(CASE WHEN cha_tip=1 THEN cha_meblag ELSE 0 END),2) AS credit,
          'Devir Bakiye'  as [description],
          COUNT (*) AS lineCount ,
          '' as eInvoiceNumber
        FROM CARI_HESAP_HAREKETLERI
        WHERE cha_cari_cins IN (0,1,6) AND cha_kod='${firmCode}' AND cha_tarihi<'${startDate}'
        ) D

        UNION

        SELECT
          cha_tarihi AS issueDate,
          cha_evrakno_seri + '-' + CAST(cha_evrakno_sira as VARCHAR(10)) AS documentNumber,
          CASE WHEN cha_tip=0 THEN ROUND(SUM(cha_meblag),2) ELSE 0 END AS debit,
          CASE WHEN cha_tip=1 THEN ROUND(SUM(cha_meblag),2) ELSE 0 END AS credit,

          CASE WHEN cha_normal_Iade=1 THEN 'Iade ' ELSE '' END + MIN(CHCinsIsim) + ' ' + MIN(CHEvrKisaIsim)  AS [description] ,
          COUNT (*) AS lineCount ,
          ISNULL(F.[efd_gib_seri] + REPLACE(STR(F.[efd_gib_sira], 9), SPACE(1), '0'),'') AS eInvoiceNumber
        FROM dbo.CARI_HESAP_HAREKETLERI WITH (NOLOCK)
          LEFT OUTER JOIN dbo.vw_Cari_Hareket_Evrak_Isimleri ON CHEvrNo=cha_evrak_tip
          LEFT OUTER JOIN dbo.vw_Cari_Hareket_Cins_Isimleri  ON CHCinsNo=cha_cinsi
          LEFT OUTER JOIN dbo.vw_Cari_Cins_Isimleri    ON CCinsNo=cha_cari_cins
          LEFT OUTER JOIN E_FATURA_DETAYLARI_VIEW_UUID_KONTROL AS F WITH (NOLOCK)  on (F.efd_uuid =cha_uuid) and (F.efd_pozisyon=cha_tip)
        WHERE cha_cari_cins IN (0,1,6) AND cha_kod='${firmCode}'
        AND cha_tarihi BETWEEN '${startDate}' AND '${endDate}'
        GROUP BY cha_evrak_tip, cha_evrakno_seri, cha_evrakno_sira, cha_tarihi, cha_tip, cha_cari_cins, cha_kod , cha_tpoz , cha_normal_Iade, cha_cinsi,efd_gib_seri,efd_gib_sira
        ) X
        ORDER BY X.issueDate,X.documentNumber
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {

            let list = result.recordsets[0] || []
            list.forEach(e => {
              if (e.currency == 'TL' || e.currency == 'YTL')
                e.currency = 'TRY'
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


exports.siparisKaydet = function (connector, firmCode, sepet, description, evrakSeri) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!firmCode) reject('firmCode required')
      if (!sepet) reject('sepet required')
      description = description.replace(`'`, `''`)

      let satirQuery = ''
      sepet.forEach((e, index) => {
        satirQuery += `
        SET @Price=${e.price};
        SET @Quantity=${e.quantity};
        SET @LineNo=${index};
        SET @ItemCode='${e.code}';
        SET @vergi_pntr=0;
        SET @vergiYuzde=0;
        SET @vergi=0;
        SET @tutar=ROUND(@Price*@Quantity,2);
        SELECT TOP 1 @vergi_pntr=sto_toptan_vergi FROM STOKLAR WHERE sto_kod=@ItemCode;
        IF @vergi_pntr>0 BEGIN
          SELECT @vergiYuzde=dbo.fn_VergiYuzde(@vergi_pntr);
          SET @vergi=ROUND(@tutar * @vergiYuzde/100, 2);
        END

        INSERT INTO SIPARISLER (sip_Guid, sip_DBCno, sip_SpecRECno, sip_iptal, sip_fileid, sip_hidden, sip_kilitli, sip_degisti, sip_checksum, sip_create_user, sip_create_date, sip_lastup_user, sip_lastup_date, sip_special1, sip_special2, sip_special3, sip_firmano, sip_subeno, sip_tarih, sip_teslim_tarih, sip_tip, sip_cins, sip_evrakno_seri, sip_evrakno_sira, sip_satirno, sip_belgeno, sip_belge_tarih, sip_satici_kod, sip_musteri_kod, sip_stok_kod, sip_b_fiyat, sip_miktar, sip_birim_pntr, sip_teslim_miktar, sip_tutar, sip_iskonto_1, sip_iskonto_2, sip_iskonto_3, sip_iskonto_4, sip_iskonto_5, sip_iskonto_6, sip_masraf_1, sip_masraf_2, sip_masraf_3, sip_masraf_4, sip_vergi_pntr, sip_vergi, sip_masvergi_pntr, sip_masvergi, sip_opno, sip_aciklama, sip_aciklama2, sip_depono, sip_OnaylayanKulNo, sip_vergisiz_fl, sip_kapat_fl, sip_promosyon_fl, sip_cari_sormerk, sip_stok_sormerk, sip_cari_grupno, sip_doviz_cinsi, sip_doviz_kuru, sip_alt_doviz_kuru, sip_adresno, sip_teslimturu, sip_cagrilabilir_fl, sip_prosip_uid, sip_iskonto1, sip_iskonto2, sip_iskonto3, sip_iskonto4, sip_iskonto5, sip_iskonto6, sip_masraf1, sip_masraf2, sip_masraf3, sip_masraf4, sip_isk1, sip_isk2, sip_isk3, sip_isk4, sip_isk5, sip_isk6, sip_mas1, sip_mas2, sip_mas3, sip_mas4, sip_Exp_Imp_Kodu, sip_kar_orani, sip_durumu, sip_stal_uid, sip_planlananmiktar, sip_teklif_uid, sip_parti_kodu, sip_lot_no, sip_projekodu, sip_fiyat_liste_no, sip_Otv_Pntr, sip_Otv_Vergi, sip_otvtutari, sip_OtvVergisiz_Fl, sip_paket_kod, sip_Rez_uid, sip_harekettipi, sip_yetkili_uid, sip_kapatmanedenkod, sip_gecerlilik_tarihi, sip_onodeme_evrak_tip, sip_onodeme_evrak_seri, sip_onodeme_evrak_sira, sip_rezervasyon_miktari, sip_rezerveden_teslim_edilen, sip_HareketGrupKodu1, sip_HareketGrupKodu2, sip_HareketGrupKodu3, sip_Olcu1, sip_Olcu2, sip_Olcu3, sip_Olcu4, sip_Olcu5, sip_FormulMiktarNo, sip_FormulMiktar, sip_satis_fiyat_doviz_cinsi, sip_satis_fiyat_doviz_kuru, sip_eticaret_kanal_kodu, sip_Tevkifat_turu, sip_otv_tevkifat_turu, sip_otv_tevkifat_tutari, sip_tevkifat_sifirlandi_fl)
        VALUES(NEWID(), 0, 0, 0, 21, 0, 0, 0, 0, 98, GETDATE(), 98, GETDATE(), '', '', 'B4B', 0, 0, @IssueDate, @IssueDate, 0, 0,
          @EvrakSeri, @EvrakSira, @LineNo, @belgeno, @IssueDate, @satici_kod, @FirmCode, @ItemCode, @Price, @Quantity, 1, 0,
          @tutar,
          0 /* sip_iskonto_1 */, 0, 0, 0, 0, 0,
          0 /* sip_masraf_1 */, 0, 0, 0,
          @vergi_pntr, @vergi, 1, 0, 0, @aciklama, @aciklama2,
          1 /* sip_depono */,
          0 /* sip_OnaylayanKulNo */,
          0 /* sip_vergisiz_fl */,
          0 /* sip_kapat_fl */,
          0 /* sip_promosyon_fl */,
          '' /* sip_cari_sormerk */,
          '' /* sip_stok_sormerk */,
          0 /* sip_cari_grupno */,
          0 /* sip_doviz_cinsi */,
          1 /* sip_doviz_kuru */,
          1 /* sip_alt_doviz_kuru */,
          1 /* sip_adresno */,
          '' /* sip_teslimturu */,
          1 /* sip_cagrilabilir_fl */,
          '00000000-0000-0000-0000-000000000000' /* sip_prosip_uid */,
          0 /*sip_iskonto1*/, 1 /*sip_iskonto2*/, 1 /*sip_iskonto3*/, 1 /*sip_iskonto4*/, 1 /*sip_iskonto5*/,1 /*sip_iskonto6*/,
          1 /*sip_masraf1*/,1 /*sip_masraf2*/,1 /*sip_masraf3*/,1 /*sip_masraf4*/,
          0 /*sip_isk1*/,0 /*sip_isk2*/, 0 /*sip_isk3*/, 0 /*sip_isk4*/, 0 /*sip_isk5*/, 0 /*sip_isk6*/,0 /*sip_mas1*/,0 /*sip_mas2*/, 0 /*sip_mas3*/, 0 /*sip_mas4*/,
          '' /*sip_Exp_Imp_Kodu*/, 0 /*sip_kar_orani*/, 0 /*sip_durumu*/,
          '00000000-0000-0000-0000-000000000000' /*sip_stal_uid*/, 0 /*sip_planlananmiktar*/,
          '00000000-0000-0000-0000-000000000000' /*sip_teklif_uid*/,
          '' /*sip_parti_kodu*/,
          0 /*sip_lot_no*/,
          '' /*sip_projekodu*/,
          0 /*sip_fiyat_liste_no*/, 0 /*sip_Otv_Pntr*/, 0 /*sip_Otv_Vergi*/, 0 /*sip_otvtutari*/, 0 /*sip_OtvVergisiz_Fl*/, '' /*sip_paket_kod*/,
          '00000000-0000-0000-0000-000000000000' /*sip_Rez_uid*/, 0 /*sip_harekettipi*/, '00000000-0000-0000-0000-000000000000' /*sip_yetkili_uid*/,
          '' /*sip_kapatmanedenkod*/,'1899-12-30 00:00:00.000' /*sip_gecerlilik_tarihi*/, 0 /*sip_onodeme_evrak_tip*/,
          '' /*sip_onodeme_evrak_seri*/, 0 /*sip_onodeme_evrak_sira*/, 0 /*sip_rezervasyon_miktari*/, 0 /*sip_rezerveden_teslim_edilen*/,
          '' /*sip_HareketGrupKodu1*/,'' /*sip_HareketGrupKodu2*/, '' /*sip_HareketGrupKodu3*/, 0 /*sip_Olcu1*/,0 /*sip_Olcu2*/, 0 /*sip_Olcu3*/, 0 /*sip_Olcu4*/, 0 /*sip_Olcu5*/,
          0 /*sip_FormulMiktarNo*/, 0 /*sip_FormulMiktar*/,
          1 /*sip_satis_fiyat_doviz_cinsi*/, 1 /*sip_satis_fiyat_doviz_kuru*/, '' /*sip_eticaret_kanal_kodu*/, 0 /*sip_Tevkifat_turu*/,
          0 /*sip_otv_tevkifat_turu*/,0 /*sip_otv_tevkifat_tutari*/, 0 /*sip_tevkifat_sifirlandi_fl*/
        );
        `
      })
      const query = `
        BEGIN TRANSACTION
        DECLARE @FirmCode nVARCHAR(25);
        DECLARE @ItemCode nVARCHAR(25);
        DECLARE @EvrakSeri nVARCHAR(20);
        DECLARE @EvrakSira INT;
        DECLARE @Quantity FLOAT;
        DECLARE @Price FLOAT;
        DECLARE @LineNo INT;
        DECLARE @IssueDate DATETIME;
        DECLARE @belgeno nVARCHAR(50);
        DECLARE @satici_kod nVARCHAR(25);
        DECLARE @vergi_pntr tinyint;
        DECLARE @vergiYuzde FLOAT;
        DECLARE @vergi FLOAT;
        DECLARE @tutar FLOAT;
        DECLARE @aciklama nVARCHAR(50);
        DECLARE @aciklama2 nVARCHAR(50);

        SET @belgeno='TSENFONI';
        SET @satici_kod='';

        SET @IssueDate=CAST(CONVERT(VARCHAR(20),GETDATE(),102) as DATETIME);
        SET @FirmCode='${firmCode}';
        SET @aciklama='${description.substring(0, 50)}';
        SET @aciklama2='${description.substring(50, 50)}';
        SET @EvrakSeri='${evrakSeri}';

        SELECT @EvrakSira=ISNULL(MAX(sip_evrakno_sira),0)+1 FROM SIPARISLER WHERE sip_evrakno_seri=@EvrakSeri;

        ${satirQuery}

        IF @@ERROR<>0 BEGIN
          IF @@TRANCOUNT >0 ROLLBACK;
          RAISERROR ('SQL Hatasi olustu', 16, 1);
        END ELSE BEGIN
          IF @@TRANCOUNT >0 COMMIT TRANSACTION;
        END

      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          resolve(result)
        })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}