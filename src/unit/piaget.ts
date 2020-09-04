import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.grid__item.grid__item--separator .grid.grid--multiline .grid__item').each((idx, el) => {
            if (idx > 0 && idx < 8) {
                const name = $(el).find('.card__body').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.grid__item ').each((idx, el) => {
                    const url = $$(el).find('a').attr('href');
                    const name = $$(el).find('.product__title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + $$(el).find('.product__reference').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $$(el).find('.box__body picture img').attr('data-src');
                    const retail = $$(el).find('.price-from--prices').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const reference = $$(el).find('a').attr('data-tracking-product');
                    if (reference) {
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
                    }
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
        const { client, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.grid__item.grid__item--separator .grid.grid--multiline .grid__item').each((idx, el) => {
            if (idx > 0 && idx < 8) {
                const name = $(el).find('.card__body').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.grid__item ').each((idx, el) => {
                const url = $$(el).find('a').attr('href');
                const name = $$(el).find('.product__title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + $$(el).find('.product__reference').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = $$(el).find('.box__body picture img').attr('data-src');
                const retail = $$(el).find('.price-from--prices').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const reference = $$(el).find('a').attr('data-tracking-product');
                if (reference) {
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
                }
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
        const { client, entry, lang, brand, brandID, base, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: [],
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.description = $('.accordion__body p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.name = $('.media__body h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.product-page-ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.country-reveal-container.product-page-price .price-from--prices').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        $('.definitions__item').each((idx, el) => {
            const key = $(el).find('dt').text().trim();
            const value = $(el).find('dd').text().trim();
            result.spec.push({ key, value });
        });

        $('.container li .collapsible .accordion__body h3').each((idx, el) => {
            if (idx === 1) {
                const caliber = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace(/movement/i, '').trim();
                if (caliber) {
                    const key = 'Caliber';
                    const value = caliber;
                    result.spec.push({ key, value });
                }
            }
        });
        $('.product__reference').each((idx, el) => {
            const ref = $(el).text().trim();
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
        result.caliber.brand = 'Piaget';
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
            if (key === 'metal:') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'strap type:') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'strap color:') {
                pp = true;
                result.band.color = value.trim();
            }
            if (key === 'strap buckle:') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'case shape:') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'case diameter:') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case thickness:') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'index:') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === 'waterproofness:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'specificities:') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'movement:') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'power reserve (in hours):') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'frequency (vph):') {
                pp = true;
                result.caliber.frequency = value.trim() + ' vph';
            }
            if (key === 'number \nof jewels:') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'number of components:') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'finishing:') {
                pp = true;
                result.dial.finish = value.trim();
            }
            if (key === 'caliber') {
                pp = true;
                result.caliber.reference = value.trim();
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
