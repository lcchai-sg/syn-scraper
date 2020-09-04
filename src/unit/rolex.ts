import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.rlxr-footer__wrapper div:nth-child(2) div ul li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim();
            const url = base + href.replace(".html", "/all-models.html");
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.rlxr-watchgrid__watch-list-item ').each((idx, el) => {
                    const href = $$(el).find('a').attr('href');
                    const modelcase = $$(el).find('p').text().trim();
                    const thumbnail = $$(el).find(' a img').attr('src');
                    const collection = cat.name;
                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href,
                        collection: collection,
                        modelcase,
                        thumbnail,
                        lang
                    })
                })
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.rlxr-footer__wrapper div:nth-child(2) div ul li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim();
            const url = base + href.replace(".html", "/all-models.html");
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.rlxr-watchgrid__watch-list-item ').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                const modelcase = $$(el).find('p').text().trim();
                const thumbnail = $$(el).find(' a img').attr('src');
                const collection = cat.name;
                result.items[cat.name].push({
                    source: 'official',
                    url: base + href,
                    collection: collection,
                    modelcase,
                    thumbnail,
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
        const { client, entry, lang, brand, brandID, thumbnail } = context;
        const result: any = {
            source: 'official',
            brand,
            brandID,
            url: entry,
            lang,
            spec: [],
            scripts: [],
            related: [],
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.rlxr-specs__reference').text().trim();
        const name = $('.rlxr-modelpage-majesty__watchname').text().trim();
        const description = $('.imageText__content--text').text().trim();
        const imageUrl = $('meta[property="og:image"]').attr('content');
        const collection = $('.rlx-breadcrumb__list li:nth-child(3) span ').text().trim();
        const retail = $('.rlxr-modelpage-majesty__price.display span').text().trim();
        result.reference = reference;
        result.name = name;
        result.description = description;
        result.gender = 'X';
        result.imageUrl = imageUrl;
        result.collection = collection;
        result.retail = retail;
        $('.rlxr-specs__definition-content').each((idx, el) => {
            const key = $(el).find('.rlxr-specs__definition-title').text();
            const value = $(el).find(' .rlxr-specs__definition-desc').text().trim();
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
        result.caliber.brand = 'Rolex';
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
            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (value.match(/screwed/i)) {
                result.case.back = 'screwed';
            }
            if (value.match(/see-through/i)) {
                result.case.back = 'see through';
            }
            if (value.match(/full back/i)) {
                result.case.back = 'Full back';
            }
            if (value.match(/Solid/i)) {
                result.case.back = 'Solid';
            }
            if (value.match(/screw-down/i)) {
                result.case.back = 'Screw down';
            }

            // finish
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
            if (value.match(/arab/i)) {
                result.dial.indexType = 'Arabic';
            }
            if (value.match(/roman/i)) {
                result.dial.indexType = 'Roman';
            }
            if (value.match(/chrono/i)) {
                result.dial.indexType = 'Chronograph';
            }
            if (value.match(/rhodium/i)) {
                result.dial.handStyle = 'Rhodium';
            }
            if (key === 'dial') {
                pp = true;
                result.dial.color = value;
            }
            // case
            if (key === 'water-resistance') {
                pp = true;
                result.waterResistance = value.replace('Waterproof to', '').trim();
                result.case.waterResistance = value.replace('Waterproof to', '').trim();
            }
            if (key === 'gem setting') {
                pp = true;
                result.gems = value;
            }
            //case
            if (key === 'material') {
                pp = true;
                result.case.material = value;
                result.case.materials.push(value);
            }
            if (key === 'crystal') {
                if (value.match(/domed/i)) {
                    pp = true;
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    pp = true;
                    result.case.crystal = 'Sapphire';
                }
            }
            if (key === 'diameter') {
                pp = true;
                result.case.width = value;
            }
            if (key === 'bezel') {
                pp = true;
                result.bezel.type = value;
            }
            //caliber
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.replace('Approximately', '').trim();
            }
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value;
            }
            if (key === 'functions') {
                pp = true;
                const feature = value.split('.');
                if (feature) {
                    result.feature = feature.map(x => x.trim());
                }
            }
            if (key === 'movement') {
                if (value.match(/self-winding/i)) {
                    result.caliber.type = 'Automatic';
                }
                if (value.match(/selfwinding/i)) {
                    result.caliber.type = 'Automatic';
                }
                if (value.match(/quartz/i)) {
                    result.caliber.type = 'Quartz';
                }
                if (value.match(/handwinding/i)) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.match(/manual/i)) {
                    result.caliber.type = 'Hand wind';
                }
            }
            // band
            if (key === 'bracelet') {
                pp = true;
                result.band.type = value;
            }
            if (key === 'details') {
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
            if (key === 'bracelet material') {
                pp = true;
                result.band.material = value;
                result.band.materials.push(value);
            }
            if (key === 'clasp') {
                pp = true;
                result.band.buckle = value;
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
