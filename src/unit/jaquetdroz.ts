import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.view .view-content .item-list .views-field.views-field-nothing .field-content a').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace('\'', '').trim();
            const url = $(el).attr('href');
            cats.push({ name, url });
            result.collections.push(name);
            result.items[name] = [];
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('.content .item-list li a').each((idx, el) => {
                    const url = $$(el).attr('href');
                    const thumbnail = $$(el).find(' img').attr('src');
                    const reference = "J" + $$(el).find('img').attr('alt').match(/\d+\.?\d*/);
                    const name = $$(el).find('.field_title').text();
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
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.view .view-content .item-list .views-field.views-field-nothing .field-content a').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace('\'', '').trim();
            const url = $(el).attr('href');
            cats.push({ name, url });
            result.collections.push(name);
            result.items[name] = [];
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.content .item-list li a').each((idx, el) => {
                const url = $$(el).attr('href');
                const thumbnail = $$(el).find(' img').attr('src');
                const reference = "J" + $$(el).find('img').attr('alt').match(/\d+\.?\d*/);
                const name = $$(el).find('.field_title').text();
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
        const { client, entry, lang, brand, brandID, base } = context;
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
        result.description = $('.description').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.name = $('.watch-infos h1').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.collection = $('.back-collection a h2').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.gender = 'M';
        result.thumbnail = $('.watch-picture img').attr('src');
        $('.watch-spec .table tr').each((idx, el) => {
            const key = $(el).find('th').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('td').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key, value });
            if (key === 'Reference') {
                result.reference = value.trim();
            }
        });
        $('.watch-infos .variantes div ul li a').each((idx, el) => {
            const ref = "J" + $(el).find('img').attr('alt').match(/\d+\.?\d*/);
            result.related.push(ref);
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
        result.caliber.brand = 'Jaquet Droz';
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
            if (key === 'movement') {
                pp = true;
                const words = value.split(',');
                for (const word of words) {
                    if (word.match(/Jaquet Droz/i)) {
                        result.caliber.reference = word.trim();
                    }
                    if (word.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                        pp = true;
                        result.caliber.type = 'Automatic'
                    }
                    if (word.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                        pp = true;
                        result.caliber.type = 'Hand wind'
                    }
                    if (word.toLowerCase().indexOf('quartz') > -1) {
                        pp = true;
                        result.caliber.type = 'Quartz'
                    }
                }
            }
            if (key === 'jewelling') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'case') {
                pp = true;
                if (value.match(/steel/i)) {
                    result.case.material = 'stainless steel';
                    result.case.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.case.material = 'rose gold';
                    result.case.materials.push('rose gold');
                }
                if (value.match(/yellow gold/i)) {
                    result.case.material = 'yellow gold';
                    result.case.materials.push('yellow gold');
                }
                if (value.match(/white gold/i)) {
                    result.case.material = 'white gold';
                    result.case.materials.push('white gold');
                }
                if (value.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
            }
            if (key === 'diameter') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'dial') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'hands') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === 'strap') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'indications') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            if (key === 'buckle') {
                pp = true;
                result.band.buckle = value.trim();
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
