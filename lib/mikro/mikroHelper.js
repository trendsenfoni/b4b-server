const { mssql } = require('../connectorAbi')
exports.getDbList = function (connector) {
  return new Promise(async (resolve, reject) => {
    try {
      const maindb = connector.mssql.database
      const query = `SELECT '${maindb}_' + DB_kod as db, DB_kod  as dbName, DB_isim as dbDesc FROM VERI_TABANLARI ORDER BY DB_kod`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            resolve(result.recordsets[0])
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

exports.bankBalances = function (dbModel, sessionDoc, connector, lastDate) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = `use ${sessionDoc.db};
       SELECT Kod,Isim,Sube,ROUND(Bakiye,2) as Bakiye,ParaBirimi FROM (
        SELECT  dbo.BANKALAR.ban_kod as Kod, LOWER(dbo.BANKALAR.ban_ismi) AS Isim,
          LOWER(dbo.BANKALAR.ban_sube) AS Sube,
          dbo.fn_CariHesapOrjinalDovizBakiye(ban_firma_no, 
            2, ban_kod, '', '', 1, NULL, '${lastDate}', 0, 0, 0, 0, 0) AS Bakiye,
          dbo.fn_DovizSembolu(dbo.BANKALAR.ban_doviz_cinsi) as ParaBirimi
        FROM  dbo.BANKALAR WITH (NOLOCK)
        ) X 
      WHERE ABS(Bakiye)>5
      ORDER BY ParaBirimi,Isim`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => {
              e.Isim = util.cemalize(e.Isim || '')
              e.Sube = util.cemalize(e.Sube || '')
              console.log('e.Isim:', e.Isim)
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

exports.bankBalancesSummary = function (dbModel, sessionDoc, connector, lastDate) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = `use ${sessionDoc.db};
       SELECT ParaBirimi, ROUND(SUM(Bakiye),2) as Bakiye FROM (
        SELECT  dbo.BANKALAR.ban_kod as Kod, dbo.BANKALAR.ban_ismi AS Isim,
          dbo.BANKALAR.ban_sube AS Sube,
          dbo.fn_CariHesapOrjinalDovizBakiye(ban_firma_no, 
            2, ban_kod, '', '', 1, NULL, '${lastDate}', 0, 0, 0, 0, 0) AS Bakiye,
          dbo.fn_DovizSembolu(dbo.BANKALAR.ban_doviz_cinsi) as ParaBirimi
        FROM  dbo.BANKALAR WITH (NOLOCK)
        ) X 
      WHERE ABS(Bakiye)>5
      GROUP BY X.ParaBirimi
      ORDER BY ParaBirimi`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            result.recordsets[0]
            resolve(result.recordsets[0])
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
exports.inventoryCards = function (dbModel, sessionDoc, connector) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = `SELECT TOP 1000
       [sto_kod] as Kod
      ,[sto_isim] as Isim
      FROM ${sessionDoc.db}..[STOKLAR]`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            resolve(result.recordsets[0])
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


exports.kasaBakiyeleri = function (dbModel, sessionDoc, connector, lastDate) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = `SELECT  kas_tip,  ${sessionDoc.db}.dbo.fn_KasaTipi(kas_tip) AS Turu, kas_kod as Kod, LOWER(kas_isim) as Isim,
  ${sessionDoc.db}.dbo.fn_CariHesapOrjinalDovizBakiye(kas_firma_no, 4, kas_kod, N'', N'', 0, NULL, '${lastDate}', 0, 0, 0, 0, 0) AS Bakiye,
  ${sessionDoc.db}.dbo.fn_DovizSembolu(kas_doviz_cinsi) AS ParaBirimi
FROM   ${sessionDoc.db}.dbo.KASALAR WITH (NOLOCK)
ORDER BY kas_tip`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            let obj = {
              nakit: [],
              cek: [],
              karsiliksizCek: [],
              senet: [],
              protestoluSenet: [],
              verilenSenet: [],
              verilenOdemeEmirleri: [],
              musteriOdemeSozleri: [],
            }

            list.forEach(e => {
              e.Isim = util.cemalize(e.Isim)
              switch (e.kas_tip) {
                case 0:
                  obj.nakit.push(e)
                  break
                case 1:
                  obj.cek.push(e)
                  break
                case 2:
                  obj.karsiliksizCek.push(e)
                  break
                case 3:
                  obj.senet.push(e)
                  break
                case 4:
                  obj.protestoluSenet.push(e)
                  break
                case 5:
                  obj.verilenSenet.push(e)
                  break
                case 6:
                  obj.verilenOdemeEmirleri.push(e)
                  break
                case 7:
                  obj.musteriOdemeSozleri.push(e)
                  break
              }
            })
            resolve(obj)
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
exports.kasaBakiyeleriOzet = function (dbModel, sessionDoc, connector, lastDate) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = `
      use ${sessionDoc.db};
      SELECT ParaBirimi + '-' + CAST(kas_tip as VARCHAR(10)) as ID,  kas_tip, SUM(Bakiye) as Bakiye, ParaBirimi FROM (SELECT  kas_tip, dbo.fn_KasaTipi(kas_tip) AS Turu, kas_kod as Kod, LOWER(kas_isim) as Isim,
  dbo.fn_CariHesapOrjinalDovizBakiye(kas_firma_no, 4, kas_kod, N'', N'', 0, NULL, '${lastDate}', 0, 0, 0, 0, 0) AS Bakiye,
  dbo.fn_DovizSembolu(kas_doviz_cinsi) AS ParaBirimi
FROM  dbo.KASALAR WITH (NOLOCK) ) X
WHERE X.Bakiye>5
GROUP BY X.kas_tip, X.ParaBirimi
ORDER BY X.kas_tip`
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            let obj = {
              nakit: [],
              cek: [],
              karsiliksizCek: [],
              senet: [],
              protestoluSenet: [],
              verilenSenet: [],
              verilenOdemeEmirleri: [],
              musteriOdemeSozleri: [],
            }

            list.forEach(e => {
              switch (e.kas_tip) {
                case 0:
                  obj.nakit.push(e)
                  break
                case 1:
                  obj.cek.push(e)
                  break
                case 2:
                  obj.karsiliksizCek.push(e)
                  break
                case 3:
                  obj.senet.push(e)
                  break
                case 4:
                  obj.protestoluSenet.push(e)
                  break
                case 5:
                  obj.verilenSenet.push(e)
                  break
                case 6:
                  obj.verilenOdemeEmirleri.push(e)
                  break
                case 7:
                  obj.musteriOdemeSozleri.push(e)
                  break
              }
            })
            resolve(obj)
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

exports.storeSalesProfit = function (dbModel, sessionDoc, connector, startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    if (!startDate) return reject(`startDate required`)
    if (!endDate) return reject(`endDate required`)
    try {
      const query = `
      use ${sessionDoc.db};
      SELECT MagazaNo,Magaza,Satis, ISNULL(Maliyet,0) as Maliyet, ROUND(Satis-ISNULL(Maliyet,0),2) as Kar,
CASE WHEN ISNULL(Maliyet,0)>0 THEN ROUND((Satis-Maliyet)/Maliyet,2) ELSE 1 END as KarOran
FROM (
SELECT Y.MagazaNo, Y.Magaza, ROUND(SUM(Y.Tutar),2) as Satis, ROUND(SUM(CASE WHEN ISNULL(Y.SasFiyat,0)>0 THEN ISNULL(Y.SasFiyat,0) ELSE Y.SonAlis END * Y.Miktar),2) as Maliyet FROM 
(SELECT X.MagazaNo, LOWER(X.Magaza) as Magaza, X.Kod, X.Ismi, X.Miktar, X.Tutar
, SAS.Fiyat as SasFiyat
, (
	SELECT TOP 1 dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6,
		sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) / sth_miktar
	FROM STOK_HAREKETLERI WHERE sth_stok_kod=X.Kod AND sth_tip=0 AND sth_cins=0 AND sth_miktar>0 AND sth_normal_iade=0 ORDER BY sth_create_date DESC
) as SonAlis
	FROM (
		select
			SH.sth_cikis_depo_no as MagazaNo,
			dbo.fn_DepoIsmi(SH.sth_cikis_depo_no) as Magaza,
			sth_stok_kod AS Kod,
			ST.sto_isim AS Ismi,
			SUM(sth_miktar * Case When sth_cins in (9,15) THEN 0.0 WHEN sth_normal_iade=1 THEN -1.0 ELSE 1.0 END) AS Miktar,
			sum(dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6, sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) *
			Case When sth_normal_iade=1 then -1.0 else 1.0 end) AS Tutar
		from dbo.STOK_HAREKETLERI SH  WITH (NOLOCK) INNER JOIN
			dbo.STOKLAR ST ON SH.sth_stok_kod=ST.sto_kod
		where (sth_tarih>='${startDate}') AND (sth_tarih<='${endDate}') AND
			(sth_evraktip in (1,3,4,13)) AND
			((sth_tip=1 AND sth_normal_iade=0) OR	(sth_tip=0 AND sth_normal_iade=1))
		group by SH.sth_stok_kod,ST.sto_isim, SH.sth_cikis_depo_no
	) X LEFT OUTER JOIN
	(SELECT DISTINCT
		sas_stok_kod,
		dbo.fn_SatinAlmaSartiNetTutar(sas_brut_fiyat,
		sas_isk_miktar1,sas_isk_miktar2,sas_isk_miktar3,sas_isk_miktar4,sas_isk_miktar5,sas_isk_miktar6,
		sas_mas_miktar1,sas_mas_miktar2,sas_mas_miktar3,sas_mas_miktar4)
		*dbo.fn_KurBul ('${endDate}',sas_doviz_cinsi,0) 
		as Fiyat,
		sas_brut_fiyat,
		sas_bitis_tarih,
		sas_depo_no
	FROM dbo.SATINALMA_SARTLARI WITH (NOLOCK)
	WHERE sas_bitis_tarih>='${startDate}' 
	) SAS ON X.Kod= SAS.sas_stok_kod
	WHERE 1=1
	) Y
GROUP BY Y.MagazaNo, Y.Magaza
) Z
ORDER BY MagazaNo
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => e.Magaza = util.cemalize(e.Magaza))
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


exports.bestProductSalesProfit = function (dbModel, sessionDoc, connector, startDate, endDate, top = 10) {
  return new Promise(async (resolve, reject) => {
    if (!startDate) return reject(`startDate required`)
    if (!endDate) return reject(`endDate required`)
    try {
      const query = `
      use ${sessionDoc.db};
      SELECT TOP ${top} Kod,Isim,Satis, ISNULL(Maliyet,0) as Maliyet, ROUND(Satis-ISNULL(Maliyet,0),2) as Kar,
CASE WHEN ISNULL(Maliyet,0)>0 THEN ROUND((Satis-Maliyet)/Maliyet,2) ELSE 1 END as KarOran
FROM (
SELECT Y.Kod, Y.Isim, ROUND(SUM(Y.Tutar),2) as Satis, ROUND(SUM(CASE WHEN ISNULL(Y.SasFiyat,0)>0 THEN ISNULL(Y.SasFiyat,0) ELSE Y.SonAlis END * Y.Miktar),2) as Maliyet FROM 
(SELECT X.Kod, LOWER(X.Isim) as Isim, X.Miktar, X.Tutar
, SAS.Fiyat as SasFiyat
, (
	SELECT TOP 1 dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6,
		sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) / sth_miktar
	FROM STOK_HAREKETLERI WHERE sth_stok_kod=X.Kod AND sth_tip=0 AND sth_cins=0 AND sth_miktar>0 AND sth_normal_iade=0 ORDER BY sth_create_date DESC
) as SonAlis
	FROM (
		select
			sth_stok_kod AS Kod,
			ST.sto_isim AS Isim,
			SUM(sth_miktar * Case When sth_cins in (9,15) THEN 0.0 WHEN sth_normal_iade=1 THEN -1.0 ELSE 1.0 END) AS Miktar,
			sum(dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6, sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) *
			Case When sth_normal_iade=1 then -1.0 else 1.0 end) AS Tutar
		from dbo.STOK_HAREKETLERI SH  WITH (NOLOCK) INNER JOIN
			dbo.STOKLAR ST ON SH.sth_stok_kod=ST.sto_kod
		where (sth_tarih>='${startDate}') AND (sth_tarih<='${endDate}') AND
			(sth_evraktip in (1,3,4,13)) AND
			((sth_tip=1 AND sth_normal_iade=0) OR	(sth_tip=0 AND sth_normal_iade=1))
		group by SH.sth_stok_kod,ST.sto_isim, SH.sth_cikis_depo_no
	) X LEFT OUTER JOIN
	(SELECT DISTINCT
		sas_stok_kod,
		dbo.fn_SatinAlmaSartiNetTutar(sas_brut_fiyat,
		sas_isk_miktar1,sas_isk_miktar2,sas_isk_miktar3,sas_isk_miktar4,sas_isk_miktar5,sas_isk_miktar6,
		sas_mas_miktar1,sas_mas_miktar2,sas_mas_miktar3,sas_mas_miktar4)
		*dbo.fn_KurBul ('${endDate}',sas_doviz_cinsi,0) 
		as Fiyat,
		sas_brut_fiyat,
		sas_bitis_tarih
		
	FROM dbo.SATINALMA_SARTLARI WITH (NOLOCK)
	WHERE sas_bitis_tarih>='${startDate}'  
	) SAS ON X.Kod= SAS.sas_stok_kod
	WHERE 1=1 
	) Y
	group by Y.Kod, Y.Isim
) Z
ORDER BY Satis DESC
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => e.Isim = util.cemalize(e.Isim))
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


exports.productMainGroupSales = function (dbModel, sessionDoc, connector, startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    if (!startDate) return reject(`startDate required`)
    if (!endDate) return reject(`endDate required`)
    try {
      const query = `
      use ${sessionDoc.db};
            
      SELECT AnaGrup,Satis, ISNULL(Maliyet,0) as Maliyet, ROUND(Satis-ISNULL(Maliyet,0),2) as Kar,
      CASE WHEN ISNULL(Maliyet,0)>0 THEN ROUND((Satis-Maliyet)/Maliyet,2) ELSE 1 END as KarOran
      FROM (
      SELECT Y.AnaGrup, ROUND(SUM(Y.Tutar),2) as Satis, ROUND(SUM(CASE WHEN ISNULL(Y.SasFiyat,0)>0 THEN ISNULL(Y.SasFiyat,0) ELSE Y.SonAlis END * Y.Miktar),2) as Maliyet FROM 
      (SELECT X.Kod, X.AnaGrup, X.AnaGrupKod, X.Miktar, X.Tutar
      , SAS.Fiyat as SasFiyat
      , (
        SELECT TOP 1 dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6,
          sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) / sth_miktar
        FROM STOK_HAREKETLERI WHERE sth_stok_kod=X.Kod AND sth_tip=0 AND sth_cins=0 AND sth_miktar>0 AND sth_normal_iade=0 ORDER BY sth_create_date DESC
      ) as SonAlis
        FROM (
          select
            sth_stok_kod as Kod,
            ST.sto_anagrup_kod as AnaGrupKod, LOWER(CASE WHEN AG.san_isim IS NULL THEN ST.sto_anagrup_kod ELSE AG.san_isim END)  as AnaGrup,
            SUM(sth_miktar * Case When sth_cins in (9,15) THEN 0.0 WHEN sth_normal_iade=1 THEN -1.0 ELSE 1.0 END) AS Miktar,
            sum(dbo.fn_StokHareketNetDeger(sth_tutar,sth_iskonto1,sth_iskonto2,sth_iskonto3,sth_iskonto4,sth_iskonto5,sth_iskonto6, sth_masraf1,sth_masraf2,sth_masraf3,sth_masraf4,sth_otvtutari,sth_oivtutari,sth_tip,0,sth_har_doviz_kuru,sth_alt_doviz_kuru,sth_stok_doviz_kuru) *
            Case When sth_normal_iade=1 then -1.0 else 1.0 end) AS Tutar
          from STOK_HAREKETLERI SH  WITH (NOLOCK) INNER JOIN
          STOKLAR ST ON ST.sto_kod=SH.sth_stok_kod LEFT OUTER JOIN
          STOK_ANA_GRUPLARI AG ON ST.sto_anagrup_kod=AG.san_kod
          
          where (sth_tarih>='${startDate}') AND (sth_tarih<='${endDate}') AND
            (sth_evraktip in (1,3,4,13)) AND
            ((sth_tip=1 AND sth_normal_iade=0) OR	(sth_tip=0 AND sth_normal_iade=1))
          group by SH.sth_stok_kod, ST.sto_anagrup_kod, AG.san_isim
        ) X LEFT OUTER JOIN
        (SELECT DISTINCT
          sas_stok_kod,
          dbo.fn_SatinAlmaSartiNetTutar(sas_brut_fiyat,
          sas_isk_miktar1,sas_isk_miktar2,sas_isk_miktar3,sas_isk_miktar4,sas_isk_miktar5,sas_isk_miktar6,
          sas_mas_miktar1,sas_mas_miktar2,sas_mas_miktar3,sas_mas_miktar4)
          *dbo.fn_KurBul ('${endDate}',sas_doviz_cinsi,0) 
          as Fiyat,
          sas_brut_fiyat,
          sas_bitis_tarih
          
        FROM dbo.SATINALMA_SARTLARI WITH (NOLOCK)
        WHERE sas_bitis_tarih>='${startDate}'
        ) SAS ON X.Kod= SAS.sas_stok_kod
        WHERE 1=1 --X.Kod='30CBL1'
        ) Y
        group by Y.AnaGrup
      ) Z
      ORDER BY Satis DESC
      `
      mssql(connector.clientId, connector.clientPass, connector.mssql, query)
        .then(result => {
          if (result.recordsets) {
            let list = result.recordsets[0] || []
            list.forEach(e => e.AnaGrup = util.cemalize(e.AnaGrup))
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