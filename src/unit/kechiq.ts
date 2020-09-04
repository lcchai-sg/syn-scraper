import cheerio from 'cheerio';
import Sitemapper from 'sitemapper';
import { Mappers, clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Watchmaxx', 'debug')

export const indexing = async (context) => {
  try {
    const { entry, lang } = context;
    const result = [];
    let payload: any = { source: 'kechiq', lang, collections: ['all'], items: { 'all': [], } };
    payload.items['all'] = [];
    let sitemap = new Sitemapper({
      url: entry,
      timeout: 300000,
    });
    let data = await sitemap.fetch();
    let cnt = 0;
    for (let i = 0; i < data.sites.length; i++) {
      // https://www.kechiq.com/product/<brand>-<collection>-watch-<reference> OR
      // https://www.kechiq.com/product/<brand>-<collection>-smartwatch-<reference>
      // those without /product/ will not be treated as product
      // https://www.kechiq.com/product/<brand>-<collection>-jewelry-<reference>
      // 2 entries but return 404, so ignored
      if (data.sites[i].match(/\/product\//i) && data.sites[i].match(/-watch-|-smartwatch-/i)) {
        let u = data.sites[i].split('/');
        let d = data.sites[i].match(/-watch-/i) ? u[u.length - 1].split('-watch-')
          : u[u.length - 1].split('-smartwatch-');
        payload.items['all'].push({
          url: data.sites[i],
          name: d[1].replace('.html', '').replace(new RegExp('-', 'g'), ' '),
          brand: d[0].replace(new RegExp('-', 'g'), ' '),
          reference: d[1].replace('.html', '').replace(new RegExp('-', 'g'), '.'),
          price: null,
        });
        cnt++;
        if (cnt % 500 === 0) {
          result.push({ payload });
          payload = { source: 'kechiq', lang: "en", collections: ['all'], items: { 'all': [], } };
          payload.items['all'] = [];
        }
      }
    }
    if (payload.items['all'].length > 0) {
      result.push({ payload });
    }
    return result;
  } catch (error) {
    logger.error('Failed for indexing class of Kechiq with error : ' + error)
    return {};
  }
};

export const extraction = async (context) => {
  try {
    const { entry, lang, client } = context;
    const result: any = {
      source: 'kechiq',
      url: entry,
      reference: "",
      lang,
      scripts: [],
      spec: [],
      related: []
    };
    const $ = cheerio.load((await client.get(entry)).data);
    result.breadcrumb = $('.breadcrumb-container').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
    result.reference = $('#hidden_product_sku').attr('value');
    result.currency = $('#hidden_product_currency').attr('value');
    result.price = $('#hidden_product_price').attr('value');
    result.name = $('#hidden_product_title').attr('value');
    result.brand = $('#hidden_product_brand').attr('value');
    result.thumbnail = $('.main-product-image').attr('src');
    result.description = $('.product-description-content').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();

    let key = "";
    let value = "";
    $('.products-specifics-table').each((idx, el) => {
      $(el).find('td').each((idx, el) => {
        if (idx % 2 === 0) {
          key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        } else {
          value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
          result.spec.push({ key, value });
        }
      })
    });
    let { id, name } = Mappers.generateBrandID.map(result.brand);
    result.brandID = id;
    result.brand = name;
    return result;
  } catch (error) {
    logger.error('Failed extraction for Kechiq with error : ' + error)
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
      style: [],
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
    result.caliber.brand = "";
    result.caliber.label = "";
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
    // band
    result.band.type = "";
    result.band.materials = [];
    result.band.color = "";
    result.band.length = "";
    result.band.width = "";
    result.band.buckle = "";
    let restKey = [];
    result.feature = [];
    for (const s of spec) {
      let pp = false;
      const key = s.key.toLowerCase();
      const value = s.value;
      if (key.match(/gender/i)) {
        pp = true;
        result.gender = value.match(/women/i) ? 'F' : value.match(/men/i) ? 'M' : 'X';
      }
      if (key.match(/type of movement/i)) {
        pp = true;
        result.caliber.type = value;
      }
      if (key.match(/style/i)) {
        pp = true;
        result.style.push(value);
      }
      if (key.match(/ean/i)) {
        pp = true;
        result.ean = value;
      }
      if (key.match(/upc/i)) {
        pp = true;
        result.upc = value;
      }
      if (key.match(/bezel material/i)) {
        pp = true;
        result.bezel.materials.push(value);
      }
      if (key.match(/warranty period/i)) {
        pp = true;
        result.warranty = value;
      }
      if (key.match(/manufacturer/i)) {
        pp = true;
        result.caliber.label = value;
      }
      if (key.match(/index color/i)) {
        pp = true;
        result.caliber.indexColor = value;
      }
      if (key.match(/case material/i)) {
        pp = true;
        result.case.materials.push(value);
        result.case.material = result.case.material ? result.case.material : value;
      }
      if (key.match(/case color/i)) {
        pp = true;
        result.case.color = value;
      }
      if (key.match(/case shape/i)) {
        pp = true;
        result.case.shape = value;
      }
      if (key.match(/case diameter/i)) {
        pp = true;
        result.case.diameter = value;
      }
      if (key.match(/case thickness/i)) {
        pp = true;
        result.case.thickness = value;
      }
      if (key.match(/water resistance/i)) {
        pp = true;
        result.case.waterResistance = value;
        result.waterResistance = value;
      }
      if (key.match(/display type/i)) {
        pp = true;
        result.dial.type = value;
      }
      if (key.match(/type of glass/i)) {
        pp = true;
        result.dial.crystal = value;
      }
      if (key.match(/dial shape/i)) {
        pp = true;
        result.dial.shape = value;
      }
      if (key.match(/dial color/i)) {
        pp = true;
        result.dial.color = value;
      }
      if (key.match(/calendar/i)) {
        pp = true;
        result.dial.calendar = value;
      }
      if (key.match(/index type/i)) {
        pp = true;
        result.dial.indexType = value;
      }
      if (key.match(/band material/i)) {
        pp = true;
        result.band.material = result.band.material ? result.band.material : value;
        result.band.materials.push(value);

        if (value.match(/steel|platinum|titanium|ceramic|gold/i)) {
          result.band.type = 'Bracelet';
        } else {
          result.band.type = 'Strap';
        }
      }
      if (key.match(/band color/i)) {
        pp = true;
        result.band.color = value;
      }
      if (key.match(/band width/i)) {
        pp = true;
        result.band.width = value;
      }
      if (key.match(/clasp type/i)) {
        pp = true;
        result.band.buckle = value;
      }

      const data = [];
      if (!pp) {
        const key = s.key.replace(':', '').trim();
        const value = s.value.trim()
        data.push({ key, value })
      }
      for (const singleData of data) {
        const temp = {};
        temp[singleData.key] = singleData.value;
        result.additional.push(temp);
      }
    }
    if (restKey.length > 0) {
      result.restKey = restKey;
    }
    clearEmpties(result);
    return result;
  } catch (error) {
    logger.error('Failed distillation for Kechiq with error : ' + error)
    return {};
  }
};
