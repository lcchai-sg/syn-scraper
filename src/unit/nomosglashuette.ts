import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        $('.product-group.product-group--store a').each((idx, el) => {
            const collection = $(el).attr('data-category');
            if (result.collections.indexOf(collection) < 0) {
                result.collections.push(collection);
                result.items[collection] = [];
            }
        });
        $('.product-group.product-group--store a').each((idx, el) => {
            client.then(res => {
                const url = base + $(el).attr('href');
                const name = $(el).attr('title');
                const thumbnail = $(el).find('.media-box-wrapper img').attr('data-src');
                const retail = $(el).find('.price--default ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const collection = $(el).attr('data-category');
                const reference = $(el).find('.teaser__ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();

                result.items[collection].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection,
                    lang,
                    name,
                    reference,
                    retail
                });
                observer.next({ ...context, result });
                observer.complete();
            })
        });
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
        const { client, base, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        $('.product-group.product-group--store a').each((idx, el) => {
            const collection = $(el).attr('data-category');
            if (result.collections.indexOf(collection) < 0) {
                result.collections.push(collection);
                result.items[collection] = [];
            }
        });
        $('.product-group.product-group--store a').each((idx, el) => {
            const url = base + $(el).attr('href');
            const name = $(el).attr('title');
            const thumbnail = $(el).find('.media-box-wrapper img').attr('data-src');
            const retail = $(el).find('.price--default ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const collection = $(el).attr('data-category');
            const reference = $(el).find('.teaser__ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();

            result.items[collection].push({
                source: 'official',
                url,
                thumbnail,
                collection,
                lang,
                name,
                reference,
                retail
            });
        });
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
        const { client, entry, lang, brand, brandID, base, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            thumbnail,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.head-wrapper h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.product--price.price--default').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.product__main-ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.description = $('.product-description .text-container.text-big p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        $('.specs-list dl').each((idx, el) => {
            const key = $(el).find('dt').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('dd').text().replace(/^\s+|\n|\s+$/gm, '').trim();
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
        result.caliber.brand = 'Nomos Glashuette';
        result.caliber.label = 'German';
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

            if (key === 'case') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'glass') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'winding') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'dimensions') {
                pp = true;
                const words = value.split(' ');
                for (const word of words) {
                    if (word.match(/diameter/i)) {
                        result.case.width = word.replace(/[^\d.-]/g, '').trim() + ' mm';
                    }
                    if (word.match(/height/i)) {
                        result.case.thickness = word.replace(/[^\d.-]/g, '').trim() + ' mm';
                    }
                }
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'dial') {
                pp = true;
                // dial finish
                if (value.match(/super-luminova/i)) {
                    result.dial.finish = 'Super Luminova';
                }
                if (value.match(/galvanized/i)) {
                    result.dial.finish = 'galvanized';
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
                if (value.match(/luminescent/i)) {
                    result.dial.finish = 'luminescent';
                }
                if (value.match(/luminescence/i)) {
                    result.dial.finish = 'luminescence';
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
                if (value.match(/embossed/i)) {
                    result.dial.finish = 'embossed';
                }
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
            if (key === 'hands') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === 'strap') {
                pp = true;
                // band color
                // dial color
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
                // band material
                if (value.match(/alligator/i)) {
                    result.band.material = 'Alligator Leather';
                    result.band.materials.push('Alligator Leather');
                }
                if (value.match(/genuine shell/i)) {
                    result.band.material = 'Genuine Shell';
                    result.band.materials.push('Genuine Shell');
                }
                if (value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.band.material = 'rose gold';
                    result.band.materials.push('rose gold');
                }
                if (value.match(/yellow gold/i)) {
                    result.band.material = 'yellow gold';
                    result.band.materials.push('yellow gold');
                }
                if (value.match(/aluminium/i)) {
                    result.band.material = 'aluminium';
                    result.band.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.band.material = 'titanium';
                    result.band.materials.push('titanium');
                }
                if (value.match(/rubber/i)) {
                    result.band.material = 'rubber';
                    result.band.materials.push('rubber');
                }
                if (value.match(/leather/i)) {
                    result.band.material = 'Leather';
                    result.band.materials.push('Leather');
                }
                if (value.match(/calfskin/i)) {
                    result.band.material = 'Calfskin';
                    result.band.materials.push('Calfskin');
                }
                result.band.type = 'Strap';
            }
            if (key === 'caliber') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
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
