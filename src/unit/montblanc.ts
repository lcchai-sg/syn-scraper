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
        $('.mb-header-subnav-item a').each((idx, el) => {
            if (idx > 75 && idx < 83) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                let url = base + $(el).attr('href');
                if (url.match(/filter/i)) {
                    url = url.split('?')[0]
                    cats.push({ name, url });
                }
                else {
                    cats.push({ name, url });
                }
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $ = cheerio.load((client.get(cat.url)).data);
                $('.mb-prod-tile .mb-prod-tile-section').each((idx, el) => {
                    const url = base + $(el).find('.mb-prod-tile-desc-wrapper a').attr('href');
                    const name = $(el).find('.mb-prod-tile-desc-wrapper a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = base + $(el).find('.mb-prod-tile-image').attr('src');
                    const retail = $(el).find('.mb-prod-tile-price').text().trim();
                    const reference = url.split('/').pop().split('-')[0];
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        reference,
                        retail
                    });
                });
                observer.next({ ...context, result });
                observer.complete();
            })
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
        const $ = cheerio.load((await client.get(entry)).data);
        $('.mb-header-subnav-item a').each((idx, el) => {
            if (idx > 75 && idx < 83) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                let url = base + $(el).attr('href');
                if (url.match(/filter/i)) {
                    url = url.split('?')[0]
                    cats.push({ name, url });
                }
                else {
                    cats.push({ name, url });
                }
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((client.get(cat.url)).data);
            $('.mb-prod-tile .mb-prod-tile-section').each((idx, el) => {
                const url = base + $(el).find('.mb-prod-tile-desc-wrapper a').attr('href');
                const name = $(el).find('.mb-prod-tile-desc-wrapper a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = base + $(el).find('.mb-prod-tile-image').attr('src');
                const retail = $(el).find('.mb-prod-tile-price').text().trim();
                const reference = url.split('/').pop().split('-')[0];
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
                    lang,
                    name,
                    reference,
                    retail
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
        const { client, entry, lang, brand, brandID, base, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            retail,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.mb-pdp-heading').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.mb-pdp-price-wrapper').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.collection = entry.split('/watches/')[1].split('/')[0];
        result.description = $('.mb-tab-content-default').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.mb-pdp-prod-ident').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.gender = 'M';
        result.thumbnail = base + $('.mb-pdp-carousel-item-img').attr('src');
        let key = '';
        let value = '';
        const keys = [];
        const values = [];
        let materialCount = 1;
        $('.mb-pdp-feature-column dt').each((idx, el) => {
            key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            if (key === 'Material') {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + materialCount;
                materialCount++;
            }
            if (key === '') {
                key = 'weight';
                keys.push(key);
            }
            else {
                keys.push(key);
            }
        });
        $('.mb-pdp-feature-column dd').each((idx, el) => {
            value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            if (value) {
                values.push(value);
            }
        });
        keys.map((key, i) => {
            const value = values[i];
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
        result.caliber.brand = 'Montblanc';
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
            if (key === 'movement type') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'indications') {
                pp = true;
                result.feature = value.trim();
            }
            if (key === 'material 1') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'dial') {
                pp = true;
                if (value.match(/grey/i)) {
                    result.dial.color = 'Grey';
                }
                if (value.match(/gray/i)) {
                    result.dial.color = 'Gray';
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
                if (value.match(/white gold/i)) {
                    result.dial.color = 'White gold';
                }
                if (value.match(/applied/i)) {
                    result.dial.finish = 'Applied';
                }
                if (value.match(/white gold hands/i)) {
                    result.dial.handStyle = 'White gold hands';
                }
                if (value.match(/rhodium/i)) {
                    result.dial.handStyle = 'Rhodium Plated';
                }
                if (value.match(/super-luminova/i)) {
                    result.dial.finish = 'Super Luminova';
                }
                if (value.match(/roman/i)) {
                    result.dial.indexType = 'Roman';
                }
                if (value.match(/arabic/i)) {
                    result.dial.indexType = 'Arabic';
                }
                if (value.match(/numerals/i)) {
                    result.dial.indexType = 'Numerals';
                }
            }
            if (key === 'case back') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'height') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'diameter') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'water resistant') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'material 2') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'colour') {
                pp = true;
                result.band.color = value.trim();
            }
            if (key === 'weight') {
                pp = true;
                result.weight = value.trim();
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
