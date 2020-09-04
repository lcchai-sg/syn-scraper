import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _ = require("lodash");

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.hmp-col__list li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a  .hmp-col__text.hmp-col__text--large').text().trim();
            const url = base + href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$(' .plp-crd.plp-crd--collection > a').each((idx, el) => {
                    const href = $$(el).attr('href');
                    const thumbnailImg = $$(el).find('[itemprop="image"]').attr('content');
                    const name = $$(el).find('.plp-crd__nam').text().trim();
                    const material = $$(el).find('.plp-crd__mat').text().trim();
                    const price = $$(el).find('.plp-crd__prc-str').text();

                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href,
                        thumbnail: base + thumbnailImg,
                        collection: cat.name,
                        name,
                        material,
                        price,
                        lang
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.hmp-col__list li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a  .hmp-col__text.hmp-col__text--large').text().trim();
            const url = base + href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$(' .plp-crd.plp-crd--collection > a').each((idx, el) => {
                const href = $$(el).attr('href');
                const thumbnailImg = $$(el).find('[itemprop="image"]').attr('content');
                const name = $$(el).find('.plp-crd__nam').text().trim();
                const material = $$(el).find('.plp-crd__mat').text().trim();
                const price = $$(el).find('.plp-crd__prc-str').text();

                result.items[cat.name].push({
                    source: 'official',
                    url: base + href,
                    thumbnail: base + thumbnailImg,
                    collection: cat.name,
                    name,
                    material,
                    price,
                    lang
                })
            })
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
            spec: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.pdp-top__sku').text().trim();
        const name = $('.pdp-top__name').text().trim();
        const material = $('.pdp-top__material').text().trim();
        const description = $('#sect1 .Accordion-paragraph ').text().trim();
        const retail = $('.pdp-top__price  span.pdp-top__amount').text().trim();
        result.reference = reference;
        result.description = description;
        result.material = material;
        result.name = name;
        result.retail = retail;
        result.collection = entry.split('/watches/')[1].split('/')[0];
        result.thumbnail = base + $('#pdp-slider__list img').attr('src');
        if (result.collection.toLowerCase() === 'reverso' || 'rendez-vous') {
            result.gender = 'F';
        }
        else {
            result.gender = 'M';
        }
        $('dd#sect2 div ').each((idx, el) => {
            const key = $(el).find(' b').text();
            const value = $(el).html().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split("</b>")[1];
            if (key !== '') {
                result.spec.push({ key, value });
            }
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
        result.caliber.brand = 'Jaeger-Lecoultre';
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
            if (value.match(/luminescent/i)) {
                result.dial.finish = 'Luminescent';
            }
            if (key === 'jaeger-lecoultre calibre :') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            // case
            if (key === 'case :') {
                pp = true;
                if (value.match(/oval/i)) {
                    result.case.shape = 'Oval';
                }
                else {
                    result.case.shape = 'Round';
                }
                let cases = value.split(',');
                cases.forEach(part => {
                    const regex = new RegExp(_("[^a-z]"), "g");
                    if (part.match(/:/) === null) {
                        return;
                    }
                    let keyValue = part.split(":");
                    if (keyValue) {
                        let key = keyValue[0].toLowerCase().replace(regex, "");
                        cases[key] = keyValue[1].trim();
                    }
                });
                const words = value.split(',');
                if (words) {
                    for (const word of words) {
                        if (word.match(/Dimensions/i)) {
                            result.case.width = word.trim();
                            result.case.shape = 'Rectangle';
                        }
                        if (word.match(/Diameter/i)) {
                            result.case.width = word.trim();
                            result.case.shape = 'Round';
                        }
                    }
                }
                result.case.material = value.split(',')[0].trim() ? value.split(',')[0].trim() : '';
                result.case.materials.push(value.split(',')[0].trim());
                result.waterResistance = cases.waterresistance;
                result.case.waterResistance = cases.waterresistance;
                result.case.height = cases.thickness;
            }
            //caliber
            if (key === 'movement :') {
                pp = true;
                let movement = value.split(',');
                if (movement) {
                    result.caliber.type = movement[0].trim();
                    movement.forEach(part => {
                        const regex = new RegExp(_("[^a-z]"), "g");
                        if (part.match(/:/) === null) {
                            return;
                        }
                        let keyValue = part.split(":");
                        let key = keyValue[0].toLowerCase().replace(regex, "");
                        movement[key] = keyValue[1].trim();
                    });
                    result.caliber.components = movement.components;
                    result.caliber.jewels = movement.jewels;
                    result.caliber.height = movement.height;
                    result.caliber.frequency = movement.vibrationsperhour;
                }
            }
            // dial
            if (key === 'dial :') {
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
            if (key === 'recto hands') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            // band
            if (key === 'strap/bracelet') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (result.band.material === 'Leather' || 'Rubber') {
                result.band.type = 'Bracelet';
            }
            else {
                result.band.type = 'Folding Clasp'
            }
            // features
            if (key === 'functions :') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
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
