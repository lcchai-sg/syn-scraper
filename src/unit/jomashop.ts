import cheerio from "cheerio";
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import Sitemapper from 'sitemapper';
import { Mappers, clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Jomashop', 'debug')

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, lang, page } = context;
        const link = (page) ? `${entry}?p=${page}` : entry;
        client.get(link).then(res => {
            const data = res.data;
            const results = [];
            const $ = cheerio.load(data);
            $('.products-grid li').each((idx, el) => {
                const url = $(el).find('a').attr('href');
                const name = $(el).find('a img').attr('alt');
                const brand = $(el).find('.manufacturer').text();
                let thumbnail = '';
                if ($(el).find('a img').attr('data-original')) {
                    thumbnail = $(el).find('a img').attr('data-original');
                } else {
                    thumbnail = $(el).find('a img').attr('src');
                }
                let retail = '';
                if ($(el).find('.special-price').text()) {
                    retail = $(el).find('.special-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                } else {
                    retail = $(el).find('.regular-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                }
                let reference = '';
                const words = url.split('-');
                for (const word of words) {
                    if (word.match(/html/i)) {
                        reference = word.replace('.html', '').trim();
                    }
                }
                results.push({
                    url,
                    source: 'jomashop',
                    name,
                    retail,
                    thumbnail,
                    brand,
                    reference,
                    lang
                });
            });
            observer.next({ ...context, results });
            observer.complete();
        })
    })
};

const xmlIndexing = async (context) => {
    try {
        const { entry, lang } = context;
        const result = [];
        let payload: any = { source: 'jomashop', lang, collections: ['all'], items: { 'all': [], } };
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
                    name: d[1].replace('.html', '').replace(new RegExp('-', 'g'), ' '),
                    brand: d[0].replace(new RegExp('-', 'g'), ' '),
                    reference: d[1].replace('.html', '').replace(new RegExp('-', 'g'), '.'),
                    price: null,
                });
                cnt++;
                if (cnt % 500 === 0) {
                    result.push({ payload });
                    payload = { source: 'jomashop', lang: "en", collections: ['all'], items: { 'all': [], } };
                    payload.items['all'] = [];
                }
            }
        }
        if (payload.items['all'].length > 0) {
            result.push({ payload });
        }
        return result;
    } catch (error) {
        logger.error('Failed indexing for Jomashop with error : ' + error)
        return {};
    }
}

export const indexing = (context) => {
    return xmlIndexing(context);
    // return _indexing(context)
    //     .pipe(
    //         delay(5000),
    //         expand<any>((context, idx): any => {
    //             return context.results.length < 56 ? EMPTY :
    //                 _indexing({ ...context, page: idx + 2 })
    //                     .pipe(delay(5000));
    //         }),
    //         map(r => r.results)
    //     );
};

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID, productID, thumbnail } = context;
        logger.debug(entry)
        const result: any = {
            source: 'jomashop',
            url: entry,
            reference: "",
            brand,
            brandID,
            productID,
            lang,
            scripts: [],
            spec: [],
            related: []
        };
        const d = (await client.get(entry)).data;
        if (d.match(/currently out of stock/i)) {
            result.code = "out of stock";
        }
        const $ = cheerio.load(d);
        let breadcrumbs = '';
        let words = [];
        $('.wrapper .page .breadcrumbs').each((idx, el) => {
            if (idx === 0) {
                breadcrumbs = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                breadcrumbs.split('/').map((text) => {
                    words.push(text.trim())
                });
            }
        });
        if (words.length > 0) {
            if (words[1].indexOf(/watches/i) === -1) {
                if (words[5]) {
                    result.collection = words[3];
                    result.subcollection = words[4];
                }
                else {
                    result.collection = words[3];
                }
            }
        }
        result.thumbnail = thumbnail;
        result.reference = $('#attribute-id-internal-id').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.name = $('.product-name ').text().split(/\r?\n/)[1].trim() ? $('.product-name ').text().split(/\r?\n/)[1].trim() : '';
        result.brand = $('.brand-name').text().split(/\r?\n/)[1].trim() ? $('.brand-name').text().split(/\r?\n/)[1].trim() : '';
        result.retail = $('.pdp-retail-price ').text().trim().replace('retail:', '');
        result.price = $('.final-price ').text().trim() ? $('.final-price ').text().trim() : '';
        result.description = $('.product-description ').text().trim() ? $('.product-description ').text().trim() : '';

        let { id, name } = Mappers.generateBrandID.map(result.brand);
        result.brandID = id;
        result.brand = name;

        $('.attribute-group').each((idx, el) => {
            let key = '';
            let value = '';
            const keys = [];
            const values = [];
            const group = $(el).find('h3').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            $(el).find('label').each((idx, el) => {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                keys.push(key);
            });
            $(el).find('div').each((idx, el) => {
                value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                values.push(value);
            });
            keys.map((key, i) => {
                const value = values[i];
                result.spec.push({ group, key, value });
            });
        });
        return result;
    } catch (error) {
        const { entry, lang, } = context;
        logger.error('Failed extraction for Jomashop with error : ' + error);
        return { source: 'jomashop', url: entry, lang, code: error.response.status, }
    }
};

export const distill = async (context) => {
    try {
        const { payload } = context;
        const { brand, brandID, productID, reference, lang, source, collection, gender, related, url, spec, description, name, subcollection, ...other } = payload;
        const result: any = {
            brand,
            name,
            brandID,
            productID,
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
        if (subcollection) {
            result.subcollection = subcollection;
        }
        for (const s of spec) {
            let pp = false;
            const group = s.group.toLowerCase();
            const key = s.key.toLowerCase();
            const value = s.value;

            if (key === 'brand :') {
                pp = true;
                result.caliber.brand = value.trim();
            }
            if (key === 'model :') {
                pp = true;
                result.reference = value.trim();
            }
            if (key === 'gender :') {
                pp = true;
                result.gender = value.trim();
            }
            if (key === 'watch label :') {
                pp = true;
                result.caliber.label = value.trim();
            }
            if (key === 'movement :') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'engine :') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'power reserve :') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'case size :') {
                pp = true;
                result.case.width = value.trim();
                result.case.diameter = value.trim();
            }
            if (key === 'case thickness :') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'case material :') {
                pp = true;
                result.case.materials.push(value.trim());
                result.case.material = value.trim();
            }
            if (key === 'case shape :') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'case back :') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'dial type :') {
                pp = true;
                result.dial.type = value.trim();
            }
            if (key === 'dial color :') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'crystal :') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'hands :') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === 'dial markers :') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === 'bezel :') {
                pp = true;
                result.bezel.type = value.trim();
            }
            if (key === 'bezel color :') {
                pp = true;
                result.bezel.color = value.trim();
            }
            if (key === 'bezel material :') {
                pp = true;
                result.bezel.materials.push(value.trim());
                result.bezel.material = value.trim();
            }
            if (key === 'luminiscence :') {
                pp = true;
                result.dial.finish = 'Luminiscence';
            }
            if (key === 'sub dials :') {
                pp = true;
                result.dial.subDial = value.trim();
            }
            if (key === 'second markers :') {
                pp = true;
                result.dial.secondMarkers = value.trim();
            }
            if (key === 'band type :') {
                pp = true;
                result.band.type = value.trim();
            }
            if (key === 'band length :') {
                pp = true;
                result.band.length = value.trim();
            }
            if (key === 'band material :') {
                pp = true;
                result.band.materials.push(value.trim());
                result.band.material = value.trim();
            }
            if (key === 'band color :') {
                pp = true;
                result.band.color = value.trim();
            }
            if (key === 'band width :') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (key === 'clasp :') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'water resistance :') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'features :') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            if (key === 'upc code :') {
                pp = true;
                result.upc = value.trim();
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
        logger.error('Failed distillation for Jomashop with error : ' + error)
        return {};
    }
};
