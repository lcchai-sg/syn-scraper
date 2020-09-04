import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import { Mappers, clearEmpties } from "../utils";
import Sitemapper from 'sitemapper';
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Prestigetime', 'debug')

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, lang, page } = context;
        const urls = [
            {
                gender: 'M',
                url: 'https://www.prestigetime.com/luxury-watches-for-men.html'
            },
            {
                gender: 'F',
                url: 'https://www.prestigetime.com/luxury-watches-for-women.html'
            }
        ];
        for (const cat of urls) {
            const link = (page) ? `${cat.url}?page=${page}` : cat.url;
            client.get(link).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                $('.col-xs-12.col-sm-4.col-lg-3').each((idx, el) => {
                    const url = $(el).find('a').attr('href');
                    const name = $(el).find('a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const brand = $(el).find('a strong').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('a img').attr('src');
                    const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const reference = $(el).find('a img').attr('alt').replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    results.push({
                        url,
                        source: 'prestigetime',
                        name,
                        retail,
                        thumbnail,
                        brand,
                        reference,
                        lang,
                        gender: cat.gender
                    })
                });
                observer.next({ ...context, results });
                observer.complete();
            })
        }
    })
};

export const newIndexing = (context) => {
    return _indexing(context)
        .pipe(
            delay(5000),
            expand<any>((context, idx): any => {
                return context.results.length < 48 ? EMPTY :
                    _indexing({ ...context, page: idx + 2 })
                        .pipe(delay(5000));
            }),
            map(r => r.results)
        );
};

/*
export const indexing = async (context) => {
    try {
        const { client, lang, entry } = context;
        // const urls = [
        //     {
        //         gender: 'M',
        //         url: 'https://www.prestigetime.com/luxury-watches-for-men.html'
        //     },
        //     {
        //         gender: 'F',
        //         url: 'https://www.prestigetime.com/luxury-watches-for-women.html'
        //     }
        // ];
        const result = []
        const payload: any = { source: 'prestigetime', lang, collections: ['all'], items: { 'all': [], } };
        const per_page = 48;    // number of watches per page
        // for (const cat of urls) {
        // const data = (await client.get(cat.url)).data;
        const data = (await client.get(entry)).data;
        const $ = cheerio.load(data);
        const numWatches = $('.text-muted.indent').text().trim();
        let pages = Math.ceil(parseInt(numWatches.split(' ')[0]) / per_page);
        // for (let i = 1; i <= 3; i++) {
        for (let i = 1; i <= pages; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const link = `${entry}&page=${i}`;
            logger.debug(link);
            const data = (await client.get(link)).data;
            const $ = cheerio.load(data);
            $('.col-xs-12.col-sm-4.col-lg-3').each((idx, el) => {
                const url = $(el).find('a').attr('href');
                const name = $(el).find('a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const brand = $(el).find('a strong').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = $(el).find('a img').attr('src');
                const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const reference = $(el).find('a img').attr('alt').replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                payload.items['all'].push({
                    url,
                    name,
                    retail,
                    thumbnail,
                    brand,
                    reference,
                    gender: entry.match(/women/i) ? 'F' : 'M',
                })
            });
            if (pages % 10 === 0) {
                result.push({ payload });
            }
        }
        if (payload.items['all'].length > 0) {
            result.push({ payload });
        }
        // }
        return result;
    } catch (error) {
        logger.error('Failed for indexing class of Prestigetime with error : ' + error)
        return [];
    }
};
*/

export const indexing = async (context) => {
    try {
        const { client, lang, entry } = context;
        const result = []
        let payload: any = { source: 'prestigetime', lang, collections: ['all'], items: { 'all': [], } };
        payload.items['all'] = [];
        let sitemap = new Sitemapper({
            url: entry,
            timeout: 300000,
        });
        let data = await sitemap.fetch();
        let cnt = 0;
        for (let i = 0; i < data.sites.length; i++) {
            const val = data.sites[i];
            if ((val.match(/\/blog\//i) ||
                val.match(/.php/i) ||
                val.match(/on-sale/i) ||
                val.match(/watches.html/i) ||
                val.match(/leather/i) ||
                val.match(/policies/i) ||
                val.match(/brand/i) ||
                val.match(/orbita/i) ||
                (val.match(/strap/i) && !(val.match(/rolex/i)))
            )) {
                // do nothing, skip the record
            } else {
                let { name: brand } = Mappers.generateBrandID.map(val);

                let collection = '';
                let v = val.split('/');
                if (val.match(/item/i)) {
                    // https://www.prestigetime.com/item/<brand>/<collection>/<name?reference>.html
                    collection = v[v.length - 2];
                    // https://www.prestigetime.com/<brand><collection?name?reference>.html
                }
                payload.items['all'].push({
                    url: data.sites[i],
                    name: v[v.length - 1].replace('.html', '').replace(new RegExp('-', 'g'), ' '),
                    brand,
                    collection,
                    reference: v[v.length - 1].replace('.html', '').replace(new RegExp('-', 'g'), '.'),
                    price: null,
                });
                cnt++;
                if (cnt % 500 === 0) {
                    result.push({ payload });
                    payload = { source: 'prestigetime', lang: "en", collections: ['all'], items: { 'all': [], } };
                    payload.items['all'] = [];
                }
            }
        }
        if (payload.items['all'].length > 0) {
            result.push({ payload });
        }
        return result;
    } catch (error) {
        logger.error('Failed for indexing class of Prestigetime with error : ' + error)
        return [];
    }
}

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brandID, thumbnail, price, retail } = context;
        const result: any = {
            source: 'prestigetime',
            url: entry,
            reference: "",
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: [],
            thumbnail,
            price,
            retail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const base = "https://www.prestigetime.com";
        if (entry.match(/preown/i)) {
            result.thumbnail = base + $('#main-img').find('a').attr('href');
            const stock = $('#stock-number').text().trim();
            const model = $('#model').text().trim();
            const cond = $('#condition').text().trim();
            result.price = $('#price').text().trim();
            const txtDesc = $('#text-description').text();
            result.spec.push({ key: 'stock#', value: stock, })
            result.spec.push({ key: 'model', value: model, })
            result.spec.push({ key: 'condition', value: cond, })
            result.spec.push({ key: 'description', value: txtDesc, })
            const { id, name } = Mappers.generateBrandID.map(model);
            result.brand = name;
            result.brandID = id;
            const ref = model.split(' ');
            result.reference = ref[ref.length - 1];
            let key = '';
            let value = '';
            $('#table-description').find('td').each((idx, el) => {
                const item = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                if (idx % 2 === 0) {
                    key = item;
                } else {
                    value = item;
                    result.spec.push({ key, value });
                }
            })
            return result;
        } else {
            result.reference = $('.container ul .active').text().replace('Watch Details', '').trim() ? $('.container ul .active').text().replace('Watch Details', '').trim() : '';
            result.name = $('.item-series').text().trim() ? $('.item-series').text().trim() : '';
            result.brand = $('.brand-item a').text().trim() ? $('.brand-item a').text().trim() : '';
            result.thumbnail = $('.lb-image-link img').attr('src');

            let breadcrumb = $('.breadcrumb').text()
            let words = []
            breadcrumb.split('\n').map((text) => {
                words.push(text.trim())
            });
            if (words.length > 0) {
                if (words[4]) {
                    result.collection = words[2];
                    result.subcollection = words[3];
                }
                else {
                    result.collection = words[2];
                }
            }

	    let { id, name } = Mappers.generateBrandID.map(result.brand);
            result.brandID = id;
	    result.brand = name;
            $('.table.table-condensed.item-table tr').each((idx, el) => {
                let key = '';
                let value = '';
                const word = $(el).find('td').text().replace(/([a-z](?=[A-Z]))/g, '$1 ').trim();
                if (word.indexOf('Condition') > -1) {
                    key = 'Condition';
                    value = word.split('Condition')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Case Shape') > -1) {
                    key = 'Case Shape';
                    value = word.split('Case Shape')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Case Dimensions') > -1) {
                    key = 'Case Dimensions';
                    value = word.split('Case Dimensions')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Case Material') > -1) {
                    key = 'Case Material';
                    value = word.split('Case Material')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Dial Color') > -1) {
                    key = 'Dial Color';
                    value = word.split('Dial Color')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Crystal') > -1) {
                    key = 'Crystal';
                    value = word.split('Crystal')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Bezel') > -1) {
                    key = 'Bezel';
                    value = word.split('Bezel')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Screw-in Crown') > -1) {
                    key = 'Screw-in Crown';
                    value = word.split('Screw-in Crown')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Water Resistance') > -1) {
                    key = 'Water Resistance';
                    const values = word.split('Water Resistance').pop().trim().split('.');
                    for (const value of values) {
                        if (value.length > 3 && value.length < 12) {
                            result.spec.push({ key, value })
                        }
                    }
                }
                if (word.indexOf('Case Back') > -1) {
                    key = 'Case Back';
                    value = word.split('Case Back')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Band Material') > -1) {
                    key = 'Band Material';
                    value = word.split('Band Material')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Color/Finish') > -1) {
                    key = 'Color/Finish';
                    value = word.split('Color/Finish')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Clasp') > -1) {
                    key = 'Clasp';
                    value = word.split('Clasp')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Lug Width') > -1) {
                    key = 'Lug Width';
                    value = word.split('Lug Width')[1].trim();
                    result.spec.push({ key, value })
                }
                if (word.indexOf('Movement') > -1) {
                    key = 'Movement';
                    value = word.split('Movement')[1].split(/\r?\n/)[0].trim();
                    result.spec.push({ key, value })
                }
            });
            $('.col-xs-12.col-md-7.item-description-tab li').each((idx, el) => {
                const key = 'Features';
                const value = $(el).text();
                result.spec.push({ key, value })
            });
            return result;
        }
    } catch (error) {
        logger.error('Failed extraction for Prestigetime with error : ' + error);
        return [];
    }
};

export const distill = async (context) => {
    try {
        const { payload } = context;
        const { brand, brandID, reference, lang, source, collection, related, url, spec, name, ...other } = payload;
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

            if (key === 'case shape') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'case dimensions') {
                pp = true;
                result.case.diameter = value.trim();
                result.case.width = value.trim();
            }
            if (key === 'case thickness') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'case material') {
                pp = true;
                result.case.materials.push(value.trim());
                result.case.material = value.trim();
            }
            if (key === 'dial color') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'crystal') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'case back') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'band material') {
                pp = true;
                result.band.materials.push(value.trim());
                result.band.material = value.trim();
            }
            if (key === 'color/finish' || key === 'band color') {
                pp = true;
                // band color
                if (value.match(/grey/i)) {
                    result.band.color = 'Grey';
                }
                if (value.match(/red/i)) {
                    result.band.color = 'Red';
                }
                if (value.match(/blue/i)) {
                    result.band.color = 'Blue';
                }
                if (value.match(/black/i)) {
                    result.band.color = 'Black';
                }
                if (value.match(/green/i)) {
                    result.band.color = 'Green';
                }
                if (value.match(/gold/i)) {
                    result.band.color = 'Gold';
                }
                if (value.match(/white/i)) {
                    result.band.color = 'White';
                }
                if (value.match(/silver/i)) {
                    result.band.color = 'Silver';
                }
                if (value.match(/brown/i)) {
                    result.band.color = 'Brown';
                }
                if (value.match(/rose gold/i)) {
                    result.band.color = 'Rose Gold';
                }
                if (value.match(/gloss/i)) {
                    result.dial.finish = 'gloss';
                }
                if (value.match(/matte/i)) {
                    result.dial.finish = 'matte';
                }
                if (value.match(/sunburst/i)) {
                    result.dial.finish = 'sunburst';
                }
                if (value.match(/sunbrushed/i)) {
                    result.dial.finish = 'Sunbrushed';
                }
                if (value.match(/luminescent/i)) {
                    result.dial.finish = 'luminescent';
                }
                if (value.match(/Superluminova/i)) {
                    result.dial.finish = 'Superluminova';
                }
                if (value.match(/brushed/i)) {
                    result.dial.finish = 'brushed';
                }
                if (value.match(/satin/i)) {
                    result.dial.finish = 'satin';
                }
                if (value.match(/guilloche/i)) {
                    result.dial.finish = 'guilloche';
                }
                if (value.match(/polished/i)) {
                    result.dial.finish = 'Polished';
                }
            }
            if (key === 'clasp' || key === 'buckle') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'lug width') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (key === 'bezel') {
                pp = true;
                result.bezel.type = value.trim();
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
            }
            if (key === 'screw-in crown') {
                pp = true;
                if (value.match(/yes/i)) {
                    result.case.crown = 'Screw In';
                }
                if (value.match(/no/i)) {
                    result.case.crown = 'Not Screw In';
                }
            }
            if (key === 'text description') {
                result.band.type = value.match('/strap/') ? 'strap' : '';
            }
            if (result.band.material && (
                result.band.material.match(/steel/i) ||
                result.band.material.match(/titanium/i) ||
                result.band.material.match(/platinum/i) ||
                result.band.material.match(/ceramic/i) ||
                result.band.material.match(/gold/i)
            )) {
                result.band.type = 'Bracelet';
            } else {
                result.band.type = 'Strap';
            }
            if (key === 'features') {
                pp = true;
                if (value.match(/bracelet/i)) {
                    result.band.type = 'Bracelet';
                }
                if (value.match(/index/i)) {
                    result.dial.indexType = value.trim();
                }
                if (value.match(/swiss/i)) {
                    result.caliber.label = value.trim();
                }
                if (value.match(/japan/i)) {
                    result.caliber.label = value.trim();
                }
                if (value.match(/usa/i)) {
                    result.caliber.label = value.trim();
                }
                if (value.match(/bezel/i)) {
                    if (value.match(/steel/i)) {
                        result.bezel.materials.push('stainless steel');
                    }
                    if (value.match(/rose gold/i)) {
                        result.bezel.materials.push('rose gold');
                    }
                    if (value.match(/yellow gold/i)) {
                        result.bezel.materials.push('yellow gold');
                    }
                    if (value.match(/white gold/i)) {
                        result.bezel.materials.push('white gold');
                    }
                    if (value.match(/aluminium/i)) {
                        result.bezel.materials.push('aluminium');
                    }
                    if (value.match(/titanium/i)) {
                        result.bezel.materials.push('titanium');
                    }
                    // bezel color
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
                if (value.match(/dial/i)) {
                    if (value.match(/gloss/i)) {
                        result.dial.finish = 'gloss';
                    }
                    if (value.match(/matte/i)) {
                        result.dial.finish = 'matte';
                    }
                    if (value.match(/sunburst/i)) {
                        result.dial.finish = 'sunburst';
                    }
                    if (value.match(/luminescent/i)) {
                        result.dial.finish = 'luminescent';
                    }
                    if (value.match(/Superluminova/i)) {
                        result.dial.finish = 'Superluminova';
                    }
                    if (value.match(/brushed/i)) {
                        result.dial.finish = 'brushed';
                    }
                    if (value.match(/satin/i)) {
                        result.dial.finish = 'satin';
                    }
                    if (value.match(/guilloche/i)) {
                        result.dial.finish = 'guilloche';
                    }
                    if (value.match(/roman/i)) {
                        result.dial.indexType = 'Roman';
                    }
                    if (value.match(/arabic/i)) {
                        result.dial.indexType = 'Arabic';
                    }
                    if (value.match(/recessed/i)) {
                        result.dial.subDial = 'Recessed';
                    }
                }
                if (value.match(/chronograph/i)) {
                    result.caliber.chronograph = 'Chronograph';
                }
                if (value.match(/hands/i)) {
                    result.caliber.hands = value.trim();
                }
                const temp = {};
                temp['feature'] = value.trim();
                result.additional.push(temp);
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
        logger.error('Failed distillation for Prestigetime with error : ' + error);
        return [];
    }
};
