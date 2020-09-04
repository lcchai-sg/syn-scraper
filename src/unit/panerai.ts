import cheerio from 'cheerio';
import { NerManager } from 'node-nlp';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.pan-nav-item.pan-nav-item-collection-menu   .pan-nav-sub-item-wrapper  .pan-nav-sub-item-left .pan-nav-sub-item-left-wrapper .navigationitem .pan-sub-nav-item-wrapper').each((idx, el) => {
            const url = base + $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.pan-prod-ref-container-bg  .pan-prod-ref-wrapper').each((idx, el) => {
                    const href = $$(el).find('figure a').attr('href');
                    const reference = $$(el).find('.pan-prod-ref-code').text().trim();
                    const name = $$(el).find('.pan-prod-ref-name').text().trim();
                    const thumbnails = $$(el).find(' figure a .pan-picture-tag img').attr('srcset');
                    const retail = $$(el).find('.pan-prod-ref-price-wrapper .pan-prod-ref-price').text().trim();
                    const collection = cat.name;
                    const thumbnail = base + thumbnails;
                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href,
                        collection: collection,
                        reference,
                        name,
                        retail,
                        thumbnail,
                        lang
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.pan-nav-item.pan-nav-item-collection-menu   .pan-nav-sub-item-wrapper  .pan-nav-sub-item-left .pan-nav-sub-item-left-wrapper .navigationitem .pan-sub-nav-item-wrapper').each((idx, el) => {
            const url = base + $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((client.get(cat.url)).data);
            $$('.pan-prod-ref-container-bg  .pan-prod-ref-wrapper').each((idx, el) => {
                const href = $$(el).find('figure a').attr('href');
                const reference = $$(el).find('.pan-prod-ref-code').text().trim();
                const name = $$(el).find('.pan-prod-ref-name').text().trim();
                const thumbnails = $$(el).find(' figure a .pan-picture-tag img').attr('srcset');
                const retail = $$(el).find('.pan-prod-ref-price-wrapper .pan-prod-ref-price').text().trim();
                const collection = cat.name;
                const thumbnail = base + thumbnails;
                result.items[cat.name].push({
                    source: 'official',
                    url: base + href,
                    collection: collection,
                    reference,
                    name,
                    retail,
                    thumbnail,
                    lang
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
        const { client, entry, lang, brand, brandID, retail, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: [],
            retail,
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.pan-ref-prod-id').text().trim();
        result.name = $('.pan-ref-detail-name').text().trim() + ' ' + reference;
        result.reference = reference;
        result.collection = entry.split('/watch-collection/')[1].split('/')[0];
        result.gender = 'M';
        $('.pan-technical-spec-inner').each((idx, el) => {
            let key = '';
            let value = '';
            const keys = [];
            const values = [];
            $(el).find('h4').each((idx, el) => {
                key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                keys.push(key);
            });
            $(el).find('p').each((idx, el) => {
                value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                values.push(value);
            });
            keys.map((key, i) => {
                const value = values[i];
                result.spec.push({ key, value });
            });
        });
        $('.pan-product-carousel-wrapper').each((idx, el) => {
            let name = '';
            $(el).find('.pan-product-carousel-title').each((idx, el) => {
                name = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                result.related.push(name);
            });
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
        result.caliber.brand = 'Panerai';
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
            if (key === 'functions') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            // case
            if (key === 'case') {
                pp = true;
                const words = value.split(',')
                if (words) {
                    for (const word of words) {
                        if (word.match(/diameter/i)) {
                            result.case.width = word.replace('Diameter', '').trim();
                        }
                    }
                }
                // finishing
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
                // material
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
                if (value.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
            }
            if (key === 'movement') {
                pp = true;
                if (value.toLowerCase().indexOf('self-winding' || 'self winding' || 'selfwinding') > -1) {
                    pp = true;
                    result.caliber.type = 'automatic'
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding' || 'Hand-wound') > -1) {
                    pp = true;
                    result.caliber.type = 'hand wind'
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    pp = true;
                    result.caliber.type = 'quartz'
                }
                const manager = new NerManager({ threshold: 0.8 });
                const fromEntity = manager.addNamedEntity('fromEntity', 'trim');
                fromEntity.addBeforeCondition('en', 'thick');
                fromEntity.addBeforeCondition('en', 'calibre');
                fromEntity.addBeforeCondition('en', 'jewels');
                fromEntity.addBeforeCondition('en', 'components');
                fromEntity.addAfterCondition('en', 'reserve');
                const splitWord = s.value.split(',');
                if (splitWord) {
                    for (const word of splitWord) {
                        if (word.match(/thick/i)) {
                            const words = await manager.findEntities(word, 'en');
                            for (const word of words) {
                                if (word.entity === 'dimension') {
                                    const thick = word.sourceText;
                                    result.case.thickness = thick;
                                }
                            }
                        }
                        if (word.match(/jewels/i)) {
                            const words = await manager.findEntities(word, 'en');
                            for (const word of words) {
                                result.caliber.jewels = word.sourceText;
                            }
                        }
                        if (word.match(/components/i)) {
                            const words = await manager.findEntities(word, 'en');
                            for (const word of words) {
                                result.caliber.components = word.sourceText;
                            }
                        }
                        if (word.match(/reserve/i)) {
                            const words = await manager.findEntities(word, 'en');
                            for (const word of words) {
                                if (word.entity === 'duration') {
                                    result.caliber.reserve = word.sourceText;
                                }
                            }
                        }
                        if (word.match(/calibre/i)) {
                            result.caliber.reference = word.trim();
                        }
                    }
                }
            }
            if (key === 'back') {
                pp = true;
                if (value.match(/See-through/i)) {
                    result.case.back = 'See Through';
                }
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            // bezel
            if (key === 'bezel') {
                pp = true;
                result.bezel.material = value.trim();
                result.bezel.materials.push(value.trim());
            }
            // dial
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
                if (value.match(/gloss/i)) {
                    result.dial.finish = 'gloss';
                }
                if (value.match(/matte/i)) {
                    result.dial.finish = 'matte';
                }
                if (value.match(/sunburst/i)) {
                    result.dial.finish = 'sunburst';
                }
                if (value.match(/sun-brushed/i)) {
                    result.dial.finish = 'sun brushed';
                }
                if (value.match(/luminescent/i)) {
                    result.dial.finish = 'luminescent';
                }
                if (value.match(/luminous/i)) {
                    result.dial.finish = 'luminous';
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
            }
            // water resistance
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            // band
            if (key === 'strap') {
                pp = true;
                result.band.lugWidth = value.trim();
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
