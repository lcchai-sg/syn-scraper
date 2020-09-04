import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import Sitemapper from 'sitemapper';
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:WatchesofMayFair', 'debug')

import { Mappers, clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, lang } = context;
        const result = [];
        // 0 - 5 = 5 pages * 59 items = 295 items
        let count = 0;
        const PAGE = 5;
        do {
            count++;
            const link = entry + '?p=' + count + '&product_list_limit=59';
            client.get(link).then(res => {
                const $ = cheerio.load((client.get(link)).data);
                $('.item.product.product-item').each((idx, el) => {
                    const url = $(el).find('.product-btn a').attr('href');
                    const name = $(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('.product-image-wrapper img').attr('src');
                    const price: any = $(el).find('.price-wrapper.price-including-tax').attr('data-price-amount');
                    const fixedPrice = Math.round(price * 100) / 100;
                    result.push({
                        source: 'watchesofmayfair',
                        url,
                        name,
                        price: '$' + fixedPrice,
                        thumbnail,
                        lang
                    })
                });
                observer.next({ ...context, result });
                observer.complete();
            })
        }
        while (count < PAGE)
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
        const { entry, lang } = context;
        const result = [];
        let payload: any = { source: 'watchesofmayfair', lang, collections: ['all'], items: { 'all': [], } };
        payload.items['all'] = [];
        let sitemap = new Sitemapper({
            url: entry,
            timeout: 300000,
        });
        let data = await sitemap.fetch();
        // assumption: url with ...-watch-... are watches
        // assumption: url with
        // https://watchesofmayfair.com/brand/<brand>/<category>/<collection>/<name-reference>
        // /brand/ && split('/').length = 8
        // https://watchesofmayfair.com/brand/<brand>/<collection>/<name-reference>
        // /brand/ && split('/').length = 7
        // https://watchesofmayfair.com/watches/<collection>/<name-reference>
        // /watches/ && split('/').length = 6
        //
        let cnt = 0;
        for (let i = 0; i < data.sites.length; i++) {
            let u = data.sites[i];
            if (!(u.match(/accessories|jewellery/i))) {
                if (data.sites[i].match(/brand/i)) {
                    let d = data.sites[i].split('/');
                    if (d.length >= 7) {
                        payload.items['all'].push({
                            url: data.sites[i],
                            name: d[d.length - 1],
                            brand: d[4].replace('-', ' '),
                            reference: d[d.length - 1],
                            price: null,
                            collection: d[d.length - 2],
                        });
                        cnt++;
                    }
                } else if (data.sites[i].match(/watches/i)) {
                    let d = data.sites[i].split('/');
                    if (d.length >= 6) {
                        payload.items['all'].push({
                            url: data.sites[i],
                            name: d[d.length - 1],
                            brand: "",
                            reference: d[d.length - 1],
                            price: null,
                            collection: d[d.length - 2],
                        });
                        cnt++;
                    }
                }
                if (cnt % 500 === 0) {
                    result.push({ payload });
                    payload = { source: 'watchesofmayfair', lang: "en", collections: ['all'], items: { 'all': [], } };
                    payload.items['all'] = [];
                }
            }
        }
        if (payload.items['all'].length > 0) {
            result.push({ payload });
        }
        return result;
    } catch (error) {
        logger.error('Failed indexing for WatchesofMayFair : ' + error)
        return {};
    }
};

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID, price, thumbnail } = context;
        const result: any = {
            source: 'watchesofmayfair',
            url: entry,
            reference: "",
            brand,
            brandID,
            lang,
            price,
            thumbnail,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.reference = $('.col.data.reference-value').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.name = $('.page-title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.price-container.price-msrp_price .price-wrapper ').text().trim();
        result.brand = $('.col.data.manufacturer-value ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.description = $('.product.attribute.overview .value').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
	let { id, name } = Mappers.generateBrandID.map(result.brand);
        result.brandID = id;
	result.brand = name;
        let breadcrumbs = '';
        let words = [];
        $('.breadcrumbs .items li').each((idx, el) => {
            breadcrumbs = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            words.push(breadcrumbs);
        });
        if (words.length > 0) {
            if (words[1].indexOf(/brands/i) === -1) {
                if (words[5]) {
                    result.collection = words[3];
                    result.subcollection = words[4];
                }
                else {
                    result.collection = words[3];
                }
            }
        }

        $('.data.table.additional-attributes tr').each((idx, el) => {
            const key = $(el).find('th').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('td').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key, value });
        });
        return result;
    } catch (error) {
        logger.error('Failed extraction for WatchesofMayFair with error : ' + error)
        return {};
    }
};

export const distill = async (context) => {
    try {
        const { payload } = context;
        const { brand, brandID, reference, lang, source, collection, related, url, spec, description, thumbnail, name, ...other } = payload;
        const result: any = {
            brand,
            name,
            brandID,
            reference,
            lang,
            source,
            collection,
            thumbnail,
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
            description,
            related,
            url,
            case: <any>{},
            caliber: <any>{},
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
        result.caliber.description = "";
        result.caliber.diameter = "";
        result.caliber.chronograph = "";
        result.caliber.gmt = "";
        result.caliber.tachymeter = "";
        result.caliber.hands = "";
        result.caliber.calendar = "";
        result.caliber.function = [];
        result.caliber.display = "";
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
                result.caliber.brand = value.trim();
            }
            if (key === 'reference') {
                pp = true;
                result.reference = value.trim();
            }
            if (key === 'country of manufacture') {
                pp = true;
                result.caliber.label = value.trim();
            }
            if (key === 'case material') {
                pp = true;
                if (value.match(',')) {
                    const items = value.split(',');
                    for (const item of items) {
                        result.case.materials.push(item.trim());
                    }
                    result.case.material = value.trim();
                }
                else {
                    result.case.materials.push(value.trim());
                    result.case.material = value.trim();
                }
            }
            if (key === 'case diameter (mm)') {
                pp = true;
                result.case.width = value.trim();
                result.case.diameter = value.trim();
            }
            if (key === 'case shape') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'thickness (mm)') {
                pp = true;
                result.case.height = value.trim();
            }
            if (key === 'case back') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'waterproof') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'dial') {
                pp = true;
                // dial color
                if (value.match(/grey/i)) {
                    result.dial.color = 'Grey';
                }
                if (value.match(/red/i)) {
                    result.dial.color = 'Red';
                }
                if (value.match(/blue/i)) {
                    result.dial.color = 'Blue';
                }
                if (value.match(/black/i)) {
                    result.dial.color = 'Black';
                }
                if (value.match(/green/i)) {
                    result.dial.color = 'Green';
                }
                if (value.match(/gold/i)) {
                    result.dial.color = 'Gold';
                }
                if (value.match(/white/i)) {
                    result.dial.color = 'White';
                }
                if (value.match(/silver/i)) {
                    result.dial.color = 'Silver';
                }
                if (value.match(/brown/i)) {
                    result.dial.color = 'Brown';
                }
                if (value.match(/rose gold/i)) {
                    result.dial.color = 'Rose Gold';
                }
            }
            if (key === 'movement') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'movement calibre') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'power reserve (h)') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'no. of jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'strap material') {
                pp = true;
                result.band.materials.push(value.trim());
                result.band.material = value.trim();
            }
            if (key === 'clasp (buckle)') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'clasp (buckle)') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'clasp (buckle)') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'crown') {
                pp = true;
                result.case.crown = value.trim();
            }
            if (key === 'warranty') {
                pp = true;
                result.warranty = parseInt(value.trim().replace(/\D/g, ''));
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
        logger.error('Failed distillation for WatchesofMayFair with error : ' + error);
        return {};
    }
};
