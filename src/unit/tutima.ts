import cheerio from 'cheerio';
import { clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
import { dialColor } from '../spec-trainers/dialColor';
import Sitemapper from 'sitemapper';
const logger = Logger.getLogger('cs:syno:Sinn', 'debug')

export const indexing = async (context) => {
  // by sitemap
  // const entry = "https://tutima.com/sitemaps.xml";

  try {
    const { client, brand, brandID, lang, entry, base } = context;
    const result: any = { source: 'official', brand, brandID, collections: ['all'], items: { 'all': [] } };
    const { data } = await client.get(entry);
    const $ = cheerio.load(data);

    const sitemap = new Sitemapper({
      url: entry,
      timeout: 600000,
    });

    const d = await sitemap.fetch();
    for (let i = 0; i < d.sites.length; i++) {
      // assume format for watch product
      // https://tutima.com/watch/<name>-<reference number>/
      // so filter tutima.com/watch/ as watch product
      // reference number will be last 2 sets of number from url separate by -
      // the rest of last part of url before reference number will be taken as name
      if (d.sites[i].match(/tutima.com\/watch\//i)) {
        const u = d.sites[i].split('/');
        const n = u[u.length - 2].split('-');
        const reference = n[n.length - 2] + '-' + n[n.length - 1];
        const name = n.slice(0, n.length - 2).join(' ');
        result.items['all'].push({
          source: "official",
          lang,
          brand,
          brandID,
          name,
          reference,
          url: d.sites[i],
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed indexing for Tutima with error : ' + error)
    return {};
  }
};

export const extraction = async (context) => {
  try {
    const { client, entry, lang, brand, brandID, collection, gender, reference, } = context;
    const result: any = {
      source: 'official',
      url: entry,
      collection,
      brand,
      brandID,
      lang,
      gender,
      reference,
      scripts: [],
      spec: [],
      related: [],
      caliber: <any>{},
    }
    const data = (await client.get(entry)).data;
    const $ = cheerio.load(data);
    $('meta').each((idx, el) => {
      switch ($(el).attr('property')) {
        case 'og:description': result.description = result.description ? result.description : $(el).attr('content'); break;
        case 'og:image': result.thumbnail = $(el).attr('content'); break;
      }
    })
    result.collection = $('.subtitle').text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').trim();
    result.name = $('hgroup>h2').text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').trim();
    let key = "";
    let value = "";
    let hasInfo = true;
    $('.info-table tr td').each((idx, el) => {
      value = $(el).text().trim();
      if (idx === 0 && value === 'Movement') {
        hasInfo = false;
      }
      if (hasInfo) {
        if (idx % 2 === 0) {
          if (idx === 0) {
            result.spec.push({ key: 'info', value, })
          } else {
            result.spec.push({ key, value, });
          }
        } else {
          key = value;
        }
      } else {
        if (idx % 2 === 0) {
          key = value;
        } else {
          result.spec.push({ key, value, });
        }
      }
    })
    $('.product-details>p').each((idx, el) => {
      const d = $(el).text().split(':');
      const key = d[0].trim();
      const value = d[1].trim();
      // result.spec.push({ key, value });
      // split the value into sentences to be handled for distilling
      const dd = value.split('. ');
      for (let v = 0; v < dd.length; v++) {
        result.spec.push({ key, value: dd[v] })
      }
    })
    return result;
  } catch (error) {
    logger.error('Failed extraction for Tutima with error : ' + error)
    return {};
  }
};

export const distill = async (context) => {
  try {
    const { payload } = context;
    const { brand, brandID, reference, lang, source, collection, gender, related, url, spec, description, name, ...other } = payload;
    const result: any = {
      brand,
      name,
      brandID,
      reference,
      lang,
      source,
      collection,
      bundled: false,
      limited: false,
      manufacturedFrom: "",
      manufacturedTo: "",
      model: "",
      alternative: "",
      variances: [],
      subClass: "",
      origin: "",
      dialColor: "",
      colors: [],
      movementType: "",
      dialType: "",
      bandType: "",
      caseShape: "",
      style: "",
      gems: "",
      waterResistance: "",
      function: [],
      feature: [],
      bestSeller: "",
      warrantyType: "",
      warranty: 0,
      weight: "",
      upc: "",
      ean: "",
      jan: "",
      gender,
      description,
      related,
      url,
      case: <any>{},
      caliber: <any>{},
      bezel: <any>{},
      dial: <any>{},
      band: <any>{},
      additional: [],
      ...other
    };
    // case
    result.case.materials = [];
    result.case.shape = "";
    result.case.coating = "";
    result.case.crystal = "";
    result.case.crystalCoating = "";
    result.case.crown = "";
    result.case.back = "";
    result.case.size = "";
    result.case.diameter = "";
    result.case.length = "";
    result.case.depth = "";
    result.case.width = "";
    result.case.height = "";
    result.case.lugWidth = "";
    result.case.lugLength = "";
    result.case.waterResistance = "";
    // caliber
    result.caliber.type = "";
    result.caliber.reserve = "";
    result.caliber.reference = "";
    result.caliber.frequency = "";
    result.caliber.jewels = "";
    result.caliber.brand = 'Tutima';
    result.caliber.label = 'Germany';
    result.caliber.description = "";
    result.caliber.diameter = "";
    result.caliber.chronograph = "";
    result.caliber.gmt = "";
    result.caliber.tachymeter = "";
    result.caliber.hands = "";
    result.caliber.calendar = "";
    result.caliber.function = [];
    result.caliber.display = "";
    // bezel
    result.bezel.type = "";
    result.bezel.materials = [];
    result.bezel.color = "";
    result.bezel.gemSet = "";
    // dial
    result.dial.type = "";
    result.dial.color = "";
    result.dial.indexType = "";
    result.dial.subIndexType = "";
    result.dial.handStyle = "";
    result.dial.luminescence = "";
    result.dial.calendar = "";
    result.dial.subDial = "";
    result.dial.gemSet = "";
    result.dial.finish = "";
    result.dial.functions = [];
    result.dial.additional = [];
    // band
    result.band.type = "";
    result.band.materials = [];
    result.band.color = "";
    result.band.length = "";
    result.band.width = "";
    result.band.buckle = "";

    for (const s of spec) {
      const key = s.key.toLowerCase();
      const value = s.value;

      if (key === 'band') {
        if (value && value.match(/alligator|leather/i)) {
          result.band.material = result.band.material ? result.band.material : 'Leather';
          result.band.materials.push('Leather')
        }
        if (value && value.match(/Cordura/i)) {
          result.band.material = result.band.material ? result.band.material : 'Cordura®';
          result.band.materials.push('Cordura')
        }
        if (value && value.match(/kevlar/i)) {
          result.band.material = result.band.material ? result.band.material : 'Kevlar';
          result.band.materials.push('Kevlar')
        }
        if (value && value.match(/textile/i)) {
          result.band.material = result.band.material ? result.band.material : 'Textile';
          result.band.materials.push('Textile')
        }
        if (value && value.match(/milanese bracelet|stainless steel/i)) {
          result.band.material = result.band.material ? result.band.material : 'Stainless Steel';
          result.band.materials.push('Stainless Steel')
        }
        if (value && value.match(/Titanium/i)) {
          result.band.material = result.band.material ? result.band.material : 'Titanium';
          result.band.materials.push('Titanium')
        }
        if (value && value.match(/bracelet/i) ||
          result.band.material.match(/stainless steel|titanium/i)) {
          result.band.type = 'Bracelet';
        } else {
          result.band.type = 'Strap';
        }
        if (value) {
          const b = value.split(' with ');
          if (b.length > 1) {
            result.band.buckle = b[1].trim();
          }
        }
      }

      if (key === 'case') {
        result.case.material = value;
        result.case.materials.push(value)
      }
      if (key === 'case details') {
        let assigned = false;
        if (value && value.match(/water-resistant/i)) {
          result.waterResistance = value.toUpperCase().replace("WATER-RESISTANT ", "");
          result.case.waterResistance = result.waterResistance;
          assigned = true;
        }
        if (value && value.match(/pressure-tested/i)) {
          result.waterResistance = value.toUpperCase().replace("PRESSURE-TESTED TO ", "");
          result.case.waterResistance = result.waterResistance;
          assigned = true;
        }
        if (value && value.match(/back/i)) {
          const d = value.split(' ');
          const idx = d.indexOf('back');
          if (idx === 1) {
            result.case.back = d[0].trim();
            assigned = true;
          } else if (idx > 1) {
            if (d[idx - 1].toLowerCase() === 'case') {
              result.case.back = d[idx - 2].trim();
              assigned = true;
            }
          }
        }
        if (value && value.match(/sapphire crystal/i)) {
          result.case.crystal = 'Sapphire';
          assigned = true;
        }
        if (value && value.match(/;/)) {
          const v = value.split(';')[0];
          result.case.materials.push(v);
          assigned = true;
        }
        if (!assigned) {
          result.additional.push(value);
        }
      }
      if (key === 'dial' || key === 'zifferblatt') {
        if (value && value.match(/blue/i)) {
          result.dial.color = 'Blue';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/Brown/i)) {
          result.dial.color = 'Brown';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/Gray|Grey/i)) {
          result.dial.color = 'Grey';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/Green/i)) {
          result.dial.color = 'Green';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/Red/i)) {
          result.dial.color = 'Red';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/Black/i)) {
          result.dial.color = 'Black';
          result.dialColor = result.dial.color;
        }
        if (value && value.match(/White/i)) {
          result.dial.color = 'White';
          result.dialColor = result.dial.color;
        }
        if (result.dial.color === "") {
          result.dial.color = value;
          result.dialColor = result.dial.color;
        }
      }
      if (key === 'dial details') {
        result.dial.indexType = value;
      }

      if (key === 'diameter') {
        result.case.diameter = value;
      }
      if (key === 'height') {
        result.case.thickness = value;
      }

      if (key === 'movement') {
        result.caliber.reference = value;
      }
      if (key === 'functions') {
        result.caliber.function.push(value.trim());
      }
      if (key === 'movement details') {
        let assigned = false;
        if (value && value.match(/jewels/i)) {
          const v = value.toLowerCase().split(' ');
          const i = v.indexOf('jewels');
          result.caliber.jewels = v[i - 1];
          assigned = value.match(/;/) ? false : true;
        }
        if (value && value.match(/automatic/i)) {
          result.caliber.type = 'Automatic';
          assigned = value.match(/;/) ? false : true;
        }
        if (value && value.match(/Hand-wound|manual winding/i)) {
          result.caliber.type = 'Manual';
          assigned = value.match(/;/) ? false : true;
        }
        if (value && value.match(/vph/i)) {
          const v = value.toLowerCase().split(' ');
          const i = v.indexOf('vph');
          result.caliber.frequency = v[i - 1] + ' vph';
          assigned = value.match(/;/) ? false : true;
        }
        if (value && value.match(/power reserve/i)) {
          const v = value.split(' ');
          result.caliber.reserve = v[v.length - 2] + ' hours';
          assigned = value.match(/;/) ? false : true;
        }
        if (!assigned) {
          result.additional.push(value);
        }
      }
      if (key === 'price') {
        result.price = value;
      }

      if (key === 'info') {
        result.additional.push(value);
      }
    }

    if (result.name.match(/lady/i) || result.url.match(/lady/i)) {
      result.gender = 'F';
    } else {
      result.gender = 'M';
    }
    clearEmpties(result);
    return result;
  } catch (error) {
    logger.debug('Failed distillation for Tutima with error : ' + error)
    return {};
  }
};
