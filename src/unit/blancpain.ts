import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        const amount = $('.total-results').text().replace('products', '').trim();
        const page = Math.ceil(parseInt(amount) / 24);
        let current = 0;
        do {
            const link = entry + ((current > 0) ? '?page=' + current : '');
            client.get(link).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('.field.field--name-field-watch-collection.field--type-entity-reference.field--label-hidden.field--item').each((idx, el) => {
                    const name = $(el).text().trim();
                    if (result.collections.indexOf(name) < 0) {
                        result.collections.push(name);
                        result.items[name] = [];
                    }
                });
                $$('.col-lg-4').each((idx, el) => {
                    const url = base + $$(el).find('a').attr('href');
                    const thumbnail = base + $$(el).find('.watch-main-image img').attr('src');
                    const name = $$(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const collection = $$(el).find('.field.field--name-field-watch-collection.field--type-entity-reference.field--label-hidden.field--item').text().trim();
                    const reference = $$(el).find('.field.field--name-field-watch-reference.field--type-string.field--label-hidden.field--item').text();
                    result.items[collection].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection,
                        lang,
                        name,
                        reference
                    });
                });
                observer.next({ ...context, results });
                observer.complete();
            });
            current++;
        }
        while (current < page)
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
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        const amount = $('.total-results').text().replace('products', '').trim();
        const page = Math.ceil(parseInt(amount) / 24);
        let current = 0;
        do {
            const link = entry + ((current > 0) ? '?page=' + current : '');
            const $$ = cheerio.load((await client.get(link)).data);
            $$('.field.field--name-field-watch-collection.field--type-entity-reference.field--label-hidden.field--item').each((idx, el) => {
                const name = $(el).text().trim();
                if (result.collections.indexOf(name) < 0) {
                    result.collections.push(name);
                    result.items[name] = [];
                }
            });
            $$('.col-lg-4').each((idx, el) => {
                const url = base + $$(el).find('a').attr('href');
                const thumbnail = base + $$(el).find('.watch-main-image img').attr('src');
                const name = $$(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const collection = $$(el).find('.field.field--name-field-watch-collection.field--type-entity-reference.field--label-hidden.field--item').text().trim();
                const reference = $$(el).find('.field.field--name-field-watch-reference.field--type-string.field--label-hidden.field--item').text();
                result.items[collection].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection,
                    lang,
                    name,
                    reference
                });
            });
            current++;
        }
        while (current < page)
        return result;
    }
    catch (error) {
        const { brand, brandID } = context;
        console.log('Failed for indexing class of brandId : ' + brandID +
            ' ,brand ' + brand +
            ' with error : ' + error
        )
        const result = [];
        return result;
    }
};

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID } = context;
        const base = 'https://www.blancpain.com';
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.field-content.h3').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ") + ' ' + $('.views-row h1').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ") + ' ' + $('.views-field.views-field-field-watch-caliber').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.reference = $('.views-field.views-field-field-watch-reference').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Reference:', '').trim();
        result.collection = $('.views-row h1').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = base + $('#slick-1 picture source').attr('srcset');
        if (result.collection === 'Women') {
            result.gender = 'F';
        }
        else {
            result.gender = 'M';
        }
        $('.views-field').each((idx, el) => {
            let key = $(el).find('.views-label').text().trim();
            const value = $(el).find('.field-content').text().trim();
            if (!key) {
                key = 'Specification';
            }
            result.spec.push({ key, value });
        });
        return result;
    }
    catch (error) {
        const { brand, brandID, entry } = context;
        console.log('Failed for extraction class of brandId : ' + brandID +
            ' ,brand : ' + brand +
            ' ,url : ' + entry +
            ' with error : ' + error
        )
        const result = [];
        return result;
    }
};

export const distill = async (context) => {
    try {
        const { payload } = context;
        const { brand, brandID, reference, lang, source, collection, gender, related, url, spec, description, price, ...other } = payload;
        const result: any = {
            brand,
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
        result.caliber.brand = 'Blancpain';
        result.caliber.label = 'Swiss';
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

        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            if (key === 'specification') {
                if (value.match(/caliber/i)) {
                    pp = true;
                    result.caliber.reference = value.trim();
                }
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    pp = true;
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    pp = true;
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    pp = true;
                    result.caliber.type = 'Quartz';
                }
                if (value.match(/case:/i)) {
                    pp = true;
                    result.case.material = value.replace('Case:', '').trim();
                    result.case.materials.push(value.replace('Case:', '').trim());
                }
                if (value.match(/dial:/i)) {
                    pp = true;
                    result.dial.color = value.replace('Dial:', '').trim();
                }
                if (value.match(/strap/i)) {
                    pp = true;
                    result.band.materials.push(value.trim().replace('strap', ''));
                    result.band.material = value.trim().replace('strap', '');
                }
                if (value.match(/back/i)) {
                    pp = true;
                    result.case.back = value.trim();
                }
            }
            if (key === 'case diameter') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'case thickness') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'power reserve:') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'components') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim();
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
    }
    catch (error) {
        const { payload } = context;
        const { brandID, brand, reference, url } = payload;
        console.log('Failed for distillation class of brandId : ' + brandID +
            ' ,brand : ' + brand +
            ' ,reference : ' + reference +
            ' ,url : ' + url +
            ' with error : ' + error
        )
        const result = [];
        return result;
    }
};
