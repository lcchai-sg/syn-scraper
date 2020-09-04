import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map, windowWhen } from "rxjs/operators";
import { clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
import { dialColor } from '../spec-trainers/dialColor';
const logger = Logger.getLogger('cs:syno:Sinn', 'debug')

const _indexing = (context) => {
  return new Observable(observer => {
    const { client, brand, brandID, lang, entry } = context;
    const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];

  });
};

export const newIndexing = (context) => {
  return _indexing(context)
    .pipe(
      delay(5000),
      expand<any>((context, idx): any => {
        return context.results.length < 32 ? EMPTY :
          _indexing({ ...context, page: idx + 1 })
            .pipe(delay(1000));
      }),
      map(r => r.results)
    );
};

export const indexing = async (context) => {
  try {
    // "https://www.sinn.de";
    // "https://www.sinn.de/en/";
    const { client, brand, brandID, lang, entry, base } = context;
    const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];
    const data = (await client.get(entry)).data;
    const $ = cheerio.load(data);

    $('#Kollektion a').each((idx, el) => {
      const url = $(el).attr("href");
      // ignore New_Watches category since the watches appear in other categories
      // ignore Straps_Accessories since they are not watches
      // ignore Cockpit_Clocks, clock not watch
      if (!(url.match(/New_Watches/i) || url.match(/Straps_Accessories/i) || url.match(/Cockpit_Clocks/i))) {
        let collection = url.split('/')[2].replace('.htm', '').split('_').join(' ');
        result.collections.push(collection);
        result.items[collection] = [];
        cats.push({
          collection, url: base + url,
        });
      }
    });

    for (const cat of cats) {
      logger.debug(cat.url);
      let gender = 'M';
      if (cat.url.match(/ladies/i)) {
        gender = 'F';
      }
      const data = (await client.get(cat.url)).data;
      const $ = cheerio.load(data);
      $(".Bild").each((idx, el) => {
        const url = base + $(el).find("a").attr("href");
        const name = $(el).find('.Modell').text().trim();
        result.items[cat.collection].push({
          name,
          url,
          collection: cat.collection,
          gender,
        });
      });
    }
    return result;
  } catch (error) {
    logger.error('Failed indexing for Sinn with error : ' + error)
    return [];
  }
};

export const extraction = async (context) => {
  try {
    const { client, entry, lang, brand, brandID, collection, gender, } = context;
    const base = "https://www.sinn.de";
    const result: any = {
      source: 'official',
      url: entry,
      collection,
      brand,
      brandID,
      lang,
      gender,
      scripts: [],
      spec: [],
      related: [],
      caliber: <any>{},
    }
    // #ModellName - reference number?
    // #BeschreibungText1 - special characteristics
    // #BeschreibungText2 - description
    // #BeschreibungText3 - technical data
    const data = (await client.get(entry)).data;
    const $ = cheerio.load(data);
    result.reference = $('#ModellName').find("th").text();
    let name = $('#MitteHauptStart').text();
    let n = name.split('\n');
    if (n.length > 0) result.name = n.slice(1, 3).join(' ');
    result.thumbnail = base + $('#Bildbrowser_Pic0').attr('src');
    let noDesc = true;
    // check if description exist
    $('.Mobile').each((idx, el) => {
      const field = $(el).text();
      if (field === 'Description') noDesc = false;
    })
    let techData = '';
    if (noDesc) {
      techData = $('#BeschreibungText2').text().trim();
    } else {
      result.description = $('#BeschreibungText2').text().trim();
      techData = $('#BeschreibungText3').text().trim();
    }

    const aTechData = techData.split('\n');
    let key = "U";
    for (let i = 0; i < aTechData.length; i++) {
      if (aTechData[i]) {
        switch (aTechData[i]) {
          case "Mechanical Movement":
            key = "caliber";
            break;
          case "Case":
            key = "case";
            break;
          case "Functions":
            key = "functions";
            break;
          case "Dimensions and Weight":
            key = "dimensions";
            break;
          case "Dial and Hands":
            key = "dial";
            break;
          case "Warranty":
            key = "warranty";
            break;
          case "SINN Technologies":
            key = "technology";
            break;
          case "Quartz Movement":
            key = "caliber";
            break;
          case '':
          case ' ':
            key = "U";
            break;
          default:
            if (key === "U") {
              console.log(entry);
              console.log('cannot identify =>', aTechData[i]);
            }
            break;
        }
        if (aTechData[i] !== "Case" &&
          aTechData[i] !== "SINN Technologies" &&
          aTechData[i] !== "Functions" &&
          aTechData[i] !== "Dimensions and Weight" &&
          aTechData[i] !== "Dial and Hands" &&
          aTechData[i] !== "Warranty" &&
          key !== "U"
        ) {
          result.spec.push({
            key, value: aTechData[i],
          })
        }
      }
    }
    return result;
  } catch (error) {
    logger.error('Failed extraction for Sinn with error : ' + error)
    return [];
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
    result.caliber.brand = 'Sinn';
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

      if (key === 'dimensions') {
        let assigned = false;
        // Band lug width
        if (value && value.match(/Band lug width/i)) {
          assigned = true;
          result.case.lugWidth = value.split('Band lug width: ')[1].trim();
        }
        // case diameter
        if (value && value.match(/Case diameter/i)) {
          const d = value.split('Case diameter')[1].trim();
          assigned = true;
          result.case.diameter = d[0] === ':' ? d.slice(2, d.length) : d.slice(1, d.length);
        }
        // case width
        if (value && value.match(/Case width/i)) {
          assigned = true;
          result.case.width = value.split('Case width ')[1].trim();
        }
        // case size
        if (value && value.match(/Case measurements/i)) {
          assigned = true;
          result.case.size = value.split('Case measurements: ')[1].trim();
        }
        // case thickness
        if (value && value.match(/Case thickness/i)) {
          assigned = true;
          result.case.thickness = value.split('Case thickness: ')[1].trim();
        }

        if (!assigned) result.additional.push(value);
      }
      // SINN technology will all be put into additional
      if (key === 'technology') {
        result.additional.push(value.trim());
      }
      // functions
      if (key === 'functions') {
        result.function.push(value.trim());
      }
      // caliber
      if (key === 'caliber') {
        let assigned = false;
        if (value && value.match(/jewel/i)) {
          assigned = true;
          result.caliber.jewels = value.trim();
        }
        if (value && value.match(/semi-oscillations/i)) {
          assigned = true;
          result.caliber.frequency = value.trim();
        }
        // movement
        if (value && value.match(/hand-wound/i)) {
          assigned = true;
          result.caliber.type = 'Hand-wound movement';
        }
        if (value && value.match(/quartz movement/i)) {
          assigned = true;
          result.caliber.type = 'Quartz movement';
        }
        if (value && value.match(/mechanical movement/i)) {
          assigned = true;
          result.caliber.type = 'Mechanical movement';
        }
        if (value && value.match(/self-winding/i)) {
          assigned = true;
          result.caliber.type = 'Self-winding mechanism';
        }
        if (!assigned) {
          result.caliber.additional = value.trim();
        }
      }

      if (key === 'case') {
        let assigned = false;

        if (value && value.match(/sapphire/i)) {
          assigned = true;
          result.case.crystal = 'Sapphire';
        } else if (value && value.match(/glass/i) && !value.match(/case back/i)) {
          assigned = true;
          result.case.crystal = value.replace(' in front', '').trim();
        }
        if (value && value.match(/diamond/i)) {
          assigned = true;
          result.case.jewels = value.trim();
        }
        // materials
        if (value && value.match(/case made of/i)) {
          assigned = true;
          result.case.material = value.split('Case made of ')[1].split(',')[0].trim();
          result.case.materials.push(result.case.material);
        }
        if (value && value.match(/case back/i)) {
          assigned = true;
          if (value.match(/transparent/i)) {
            result.case.back = result.case.back === "" ? value.split(',')[0].trim() : result.case.back;
          }
          if (value.match(/screw/i)) {
            result.case.back = 'Screw fastened';
          }
          // all others ignored
        }
        if (value && (value.match(/diver/i) || value.match(/diving/i))) {
          assigned = true;
          result.case.waterResistance = value.trim();
          result.waterResistance = value.trim();
        }
        if (value && value.match(/Pressure-resistant/i)) {
          assigned = true;
          let wr = value.split('to');
          let wrt = wr.slice(1, wr.length).join('to').trim();
          result.case.waterResistance = wrt;
          result.waterResistance = wrt;
        }
        if (!assigned) {
          result.case.additional = value.trim();
        }
      }

      if (key === 'dial') {
        let assigned = false;
        if (value && value.match(/diamond/i)) {
          assigned = true;
          result.dial.gemSet = value.trim();
        }
        if (value && (value.match(/luminescent/i)) || value.match(/luminous/i)) {
          assigned = true;
          result.dial.finish = 'Luminescent';
        }
        if (value && value.match(/indices/i)) {
          assigned = true;
          result.dial.indexType = value.trim();
        }
        if (value && value.match(/hour/i) && value.match(/hand/i)) {
          assigned = true;
          result.dial.handStyle = value.trim();
        }
        if (value && value.match(/Damascus steel/i)) {
          assigned = true;
          result.dial.material = 'Damascus steel';
        }
        if (value && value.match(/Anthracite/i)) {
          assigned = true;
          result.dial.material = 'Anthracite';
        }

        if (value && value.match(/stopwatch/i)) {
          assigned = true;
	  if (result.dial.functions.indexOf('Stopwatch') < 0)
        	result.dial.functions.push('Stopwatch');
        }
        // color
        const colors: any = {
          "copper": "Copper coloured",
          "mother-of-pearl": "White",
          "blue": "Blue",
          "white": "White",
          "ivory": "White",
          "rose": "Rose coloured",
          "brown": "Brown",
          "earth": "Brown",
          "camouflage": "Brown",
          "silver": "Silver",
          "black": "Black",
          "charcoal": "Black",
          "green": "Green",
          "gold": "Gold plated",
        };
        Object.keys(colors).forEach(key => {
          let regEx = new RegExp(key, 'i');
          if (value && value.match(regEx)) {
            assigned = true;
            result.dial.color = colors[key];
            result.dialColor = result.dial.color;
          }
        });
        // end color
        if (value && value.match(/Appliqués/i) && assigned) {
          // result.dial.additional.push('Appliqués');
          result.dial.additional.push(value.trim());
        }
        if (value && value.match(/sunburst decoration/i) && assigned) {
          // result.dial.additional.push('Sunburst decoration');
          result.dial.additional.push(value.trim());
        }
        if (value && value.match(/chronograph/i) && assigned) {
          // result.dial.additional.push('Chronograph function');
          result.dial.additional.push(value.trim());
        }
        if (!assigned) {
          result.dial.additional.push(value.trim());
        }
      }
    }
    clearEmpties(result);
    return result;
  } catch (error) {
    logger.debug('Failed distillation for Sinn with error : ' + error)
    return [];
  }
};
