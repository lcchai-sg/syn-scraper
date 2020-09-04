import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.slick-track .views-row .views-field.views-field-name a').each((idx, el) => {
            const name = $(el).text();
            const url = $(el).attr('href');
            if (result.collections.indexOf(name) < 0) {
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const results = [];
                const $ = cheerio.load((client.get(cat.url)).data);
                $('.item-list li').each((idx, el) => {
                    const url = base + $(el).find('a').attr('href');
                    const name = $(el).find('.field.field-name-field-collections-type.field-type-taxonomy-term-reference').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('.field-item img').attr('src');
                    const reference = $(el).find('.field.field-name-title-field.field-type-text').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        reference
                    });
                });
                observer.next({ ...context, results });
                observer.complete();
            });
        }
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
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.slick-track .views-row .views-field.views-field-name a').each((idx, el) => {
            const name = $(el).text();
            const url = $(el).attr('href');
            if (result.collections.indexOf(name) < 0) {
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url)).data);
            $('.item-list li').each((idx, el) => {
                const url = base + $(el).find('a').attr('href');
                const name = $(el).find('.field.field-name-field-collections-type.field-type-taxonomy-term-reference').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = $(el).find('.field-item img').attr('src');
                const reference = $(el).find('.field.field-name-title-field.field-type-text').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
                    lang,
                    name,
                    reference
                });
            });
        }
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
        const word = $('.watch-intro-title h1').text().split(/\r?\n/);
        if (word) {
            result.collection = word[1].trim();
            result.name = word[2].trim();
            result.reference = word[3].replace('REF :', '').trim();
        }
        result.name = $('.watch-intro-title h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('#watch-price-value ').text().trim();
        result.description = $('.watch-intro-title .field-items .field-item').text().trim();
        result.thumbnail = $('#watch-presentation img').attr('src');
        $('.watch-feature-watch .field').each((idx, el) => {
            const key = $(el).find('.field-label').text().trim();
            const value = $(el).find('.field-item').text().trim();
            result.spec.push({ key, value })
        });
        $('.watch-feature-movement .field').each((idx, el) => {
            const key = $(el).find('.field-label').text().trim();
            const value = $(el).find('.field-item').text().trim();
            result.spec.push({ key, value })
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
        const { brand, brandID, reference, lang, source, collection, gender, related, url, spec, description, ...other } = payload;
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
        result.caliber.brand = 'Girard Perregaux';
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
            if (key === 'material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'diameter:') {
                pp = true;
                result.case.width = value.split('x')[0].trim();
            }
            if (key === 'case-back:') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'height:') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'dial:') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'water resistance:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'size:') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (key === 'material:') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'buckle:') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'number:') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'type:') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'frequency:') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'number of components:') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'jewels:') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'finishes:') {
                pp = true;
                result.dial.finish = value.trim();
            }
            if (key === 'power reserve:') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === '') {
                pp = true;
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
