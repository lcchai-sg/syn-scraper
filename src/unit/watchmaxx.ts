import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import Sitemapper from 'sitemapper';
import { Mappers, clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Watchmaxx', 'debug')

const xmlIndexing = (context) => {
    return new Observable(observer => {
        const { lang } = context;
        const result = [];
        const cats = [];
        const sitemap = 'https://www.watchmaxx.com/sitemap.xml';
        //     const json = (axios.get(sitemap))['data'];
        //     const parser = new xml2js.Parser();
        //     parser.parseString(json, function (err, result) {
        //         for (let i = 0; i < 72; i++) {
        //             cats.push({ url: result.sitemapindex.sitemap[i].loc })
        //         }
        //     });
        //     for (const cat of cats) {
        //         const sitemap = cat.url.toString();
        //         const json = (axios.get(sitemap))['data'];
        //         const parser = new xml2js.Parser();
        //         parser.parseString(json, function (err, res) {
        //             for (let i = 0; i < res.urlset.url.length; i++) {
        //                 const url = res.urlset.url[i].loc.toString().replace('[', '').replace(']', '');
        //                 result.push({
        //                     url,
        //                     source: 'watchmaxx',
        //                     lang
        //                 });
        //             }
        //             observer.next({ ...context, result });
        //             observer.complete();
        //         });
        //     }
    });
};

export const newIndexing = (context) => {
    return xmlIndexing(context)
        .pipe(
            delay(5000),
            expand<any>((context, idx): any => {
                return context.results.length < 32 ? EMPTY :
                    xmlIndexing({ ...context, page: idx + 1 })
                        .pipe(delay(1000));
            }),
            map(r => r.results)
        );
};

export const indexing = async (context) => {
    try {
        const { entry, lang } = context;
        const result = [];
        let payload: any = { source: 'watchmaxx', lang, collections: ['all'], items: { 'all': [], } };
        payload.items['all'] = [];
        let sitemap = new Sitemapper({
            url: entry,
            timeout: 300000,
        });
        let data = await sitemap.fetch();
        let cnt = 0;
        for (let i = 0; i < data.sites.length; i++) {
            if (data.sites[i].match(/-watch-/i)) {
                let u = data.sites[i].split('/');
                let d = u[u.length - 1].split('-watch-');
                payload.items['all'].push({
                    url: data.sites[i],
                    name: d[1].replace('.html', '').replace('-', ' '),
                    brand: d[0].replace('-', ' '),
                    reference: d[1].replace('.html', '').replace('-', '.'),
                    price: null,
                });
                cnt++;
                if (cnt % 500 === 0) {
                    result.push({ payload });
                    payload = { source: 'watchmaxx', lang: "en", collections: ['all'], items: { 'all': [], } };
                    payload.items['all'] = [];
                }
            }
        }
        if (payload.items['all'].length > 0) {
            result.push({ payload });
        }
        return result;
    } catch (error) {
        logger.error('Failed for indexing class of Watchmaxx with error : ' + error)
        return {};
    }
};

export const extraction = async (context) => {
    try {
        const { entry, lang, client } = context;
        const result: any = {
            source: 'watchmaxx',
            url: entry,
            reference: "",
            lang,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const priceString = $('.root___1--RR.pricing___OUuQ3 p').text();
        const retailString = $('.root___1--RR.pricing___OUuQ3 p').text();
        result.thumbnail = $('.MagicZoom ').attr('href');
        result.reference = $('.item___3GISg').text().split('Code:')[1];
	// remove the 'Store Display' or 'Pre-owned' that is attached to reference
	result.reference = result.reference.replace('Store Display', '');
        result.reference = result.reference.replace('Pre-owned', '');
        result.name = $('.title___2lMvV h1').text().trim();
        result.brand = $('.item___3GISg').text().split('Code:')[0];
        result.price = '$' + priceString.split('$')[1];
        result.retail = '$' + retailString.split('$')[2];
        result.description = $('.fullDescription___2cHzq').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        const keys = [];
        const values = [];
        $('.name___8VXC9').each((idx, el) => {
            const key = $(el).text();
            keys.push(key);
        });
	// for pre-owned product, class is different for condition
        let cond = $('.value___y3GvI').text();
        if (cond) values.push(cond);
        $('.value___2lDas').each((idx, el) => {
            const value = $(el).text();
            values.push(value);
        });
        keys.map((key, i) => {
            const value = values[i];
            result.spec.push({ key, value });
        });
	let { id, name } = Mappers.generateBrandID.map(result.brand);
        result.brandID = id;
	result.brand = name;
        result.reference = result.reference.trim();
        return result;
    } catch (error) {
        logger.error('Failed extraction for Watchmaxx with error : ' + error)
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
            if (key === 'brand') {
                pp = true;
                result.brand = value.trim();
            }
            if (key === 'series') {
                pp = true;
                result.collection = value.trim();
            }
            if (key === 'gender') {
                pp = true;
                result.gender = value.trim();
            }
            if (key === 'case material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'case shape') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'case diameter') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case back') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'bezel') {
                pp = true;
                if (value.toLowerCase().indexOf('ceramic') > -1) {
                    result.bezel.materials.push('Ceramic');
                }
                if (value.match(/grey/i)) {
                    result.bezel.color = 'Grey';
                }
                if (value.match(/red/i)) {
                    result.bezel.color = 'Red';
                }
                if (value.match(/blue/i)) {
                    result.bezel.color = 'Blue';
                }
                if (value.match(/black/i)) {
                    result.bezel.color = 'Black';
                }
                if (value.match(/green/i)) {
                    result.bezel.color = 'Green';
                }
                if (value.match(/gold/i)) {
                    result.bezel.color = 'Gold';
                }
                if (value.match(/white/i)) {
                    result.bezel.color = 'White';
                }
                if (value.match(/silver/i)) {
                    result.bezel.color = 'Silver';
                }
                if (value.match(/brown/i)) {
                    result.bezel.color = 'Brown';
                }
                if (value.match(/rose gold/i)) {
                    result.bezel.color = 'Rose Gold';
                }
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim() + ' hours';
            }
            if (key === 'sub dials') {
                pp = true;
                result.dial.subDial = value.trim();
            }
            if (key === 'crystal') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'crown') {
                pp = true;
                result.case.crown = value.trim();
            }
            if (key === 'dial color') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'dial description') {
                pp = true;
                result.dial.handStyle = value.trim();
                if (value.toLowerCase().indexOf('taupe dial') > -1) {
                    result.dial.subDial = 'Taupe Dial';
                }
                if (value.toLowerCase().indexOf('2 sub-dials') > -1) {
                    result.dial.subDial = '2 Sub-dials';
                }
                if (value.toLowerCase().indexOf('hour markers with minute markers around the outer rim') > -1) {
                    result.dial.subIndexType = 'Hour markers with minute markers around the outer rim';
                }
            }
            if (key === 'markers') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === 'dial markers') {
                pp = true;
                if (value.toLowerCase().indexOf('stick') > -1) {
                    result.dial.type = 'Analog';
                }
                if (value.toLowerCase().indexOf('digital') > -1) {
                    result.dial.type = 'Digital';
                }
                result.dial.indexType = value.trim();
            }
            if (key === 'warranty') {
                pp = true;
                result.warranty = parseInt(value.trim().replace(/\D/g, ''));
            }
            if (key === 'brand origin') {
                pp = true;
                result.caliber.label = value.trim();
            }
            if (key === 'movement') {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
                if (value.toLowerCase().indexOf('eco-drive' || 'ecodrive' || 'eco drive') > -1) {
                    result.caliber.type = 'Eco Drive';
                }
                result.caliber.description = value.trim();
            }
            if (key === 'sub series') {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
                if (value.toLowerCase().indexOf('eco-drive' || 'ecodrive' || 'eco drive') > -1) {
                    result.caliber.type = 'Eco Drive';
                }
            }
            if (key === 'case thickness') {
                pp = true;
                result.case.height = value.trim();
            }
            if (key === 'movement description') {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
                if (value.toLowerCase().indexOf('eco-drive' || 'ecodrive' || 'eco drive') > -1) {
                    result.caliber.type = 'Eco Drive';
                }
            }
            if (key === 'engine') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'band material') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'band color') {
                pp = true;
                result.band.color = value.trim();
            }
            if (key === 'clasp type') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'water resistant') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'functions') {
                pp = true;
                result.function = value.split(',').map(x => x.trim());
                if (value.toLowerCase().indexOf('chronograph') > -1) {
                    result.caliber.chronograph = 'Chronograph';
                }
            }
            if (key === 'upc') {
                pp = true;
                result.upc = value.trim();
            }
            if (key === 'calendar') {
                pp = true;
                result.caliber.calendar = value.trim();
                result.dial.calendar = value.trim();
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
        logger.error('Failed distillation for Watchmaxx with error : ' + error)
        return {};
    }
};
