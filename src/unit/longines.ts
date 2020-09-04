import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const collect = [];
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.sub-menu.col.col-3').each((idx, el) => {
            const index = idx;
            $(el).find('a').each((idx, x) => {
                let collection = '';
                let subcollection = '';
                let url = '';
                if (idx === 0) {
                    collection = $(x).text();
                    url = $(x).attr('href');
                    collect.push({ index, collection, url });
                }
                else {
                    subcollection = $(x).text();
                    url = $(x).attr('href');
                    const collection = collect[index].collection;
                    cats.push({ collection, subcollection, url })
                }
            });
        });
        for (const cat of cats) {
            const subcollection = cat.subcollection;
            result.collections.push(subcollection);
            result.items[subcollection] = [];

            const $ = cheerio.load((client.get(cat.url)).data);
            const amount = Math.ceil(parseInt($('.amount ').text().split('of')[1]) / 36);
            let current = 0;
            if (amount > 1) {
                do {
                    current++;
                    const link = cat.url + ((current > 1) ? '?p=' + current : '');
                    client.get(link).then(res => {
                        const data = res.data;
                        const results = [];
                        const $ = cheerio.load(data);
                        $('.products li > a').each((idx, el) => {
                            const url = $(el).attr('href');
                            const name = $(el).find(' .product-item figure .product-image img').attr('alt');
                            const thumbnail = $(el).find(' .product-item figure .product-image img').attr('src');
                            const retail = $(el).find(' .product-item .price-box .regular-price .price').text();
                            let reference = '';
                            const words = url.split('/');
                            for (const word of words) {
                                if (word.match(/html/i)) {
                                    reference = word.split('-')[0];
                                }
                            }

                            result.items[subcollection].push({
                                source: 'official',
                                url,
                                thumbnail,
                                collection: cat.collection,
                                subcollection,
                                lang,
                                name,
                                reference,
                                retail
                            })
                        });
                        observer.next({ ...context, results });
                        observer.complete();
                    });
                }
                while (current < amount)
            }
            else {
                client.get(cat.url).then(res => {
                    const data = res.data;
                    const results = [];
                    const $ = cheerio.load(data);
                    $('.products li > a').each((idx, el) => {
                        const url = $(el).attr('href');
                        const name = $(el).find(' .product-item figure .product-image img').attr('alt');
                        const thumbnail = $(el).find(' .product-item figure .product-image img').attr('src');
                        const retail = $(el).find(' .product-item .price-box .regular-price .price').text();
                        let reference = '';
                        const words = url.split('/');
                        for (const word of words) {
                            if (word.match(/html/i)) {
                                reference = word.split('-')[0];
                            }
                        }

                        result.items[subcollection].push({
                            url,
                            thumbnail,
                            collection: cat.collection,
                            subcollection,
                            lang,
                            name,
                            reference,
                            retail
                        })
                    });
                    observer.next({ ...context, results });
                    observer.complete();
                });
            }
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
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const collect = [];
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.sub-menu.col.col-3').each((idx, el) => {
            const index = idx;
            $(el).find('a').each((idx, x) => {
                let collection = '';
                let subcollection = '';
                let url = '';
                if (idx === 0) {
                    collection = $(x).text();
                    url = $(x).attr('href');
                    collect.push({ index, collection, url });
                }
                else {
                    subcollection = $(x).text();
                    url = $(x).attr('href');
                    const collection = collect[index].collection;
                    cats.push({ collection, subcollection, url })
                }
            });
        });
        for (const cat of cats) {
            const subcollection = cat.subcollection;
            if (result.collections.indexOf(cat.collection) === -1) {
                result.collections.push({collection : cat.collection , subcollection});
            } 
            result.items[cat.collection] = [];
        }
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url)).data);
            const amount = Math.ceil(parseInt($('.amount ').text().split('of')[1]) / 36);
            let current = 0;
            if (amount > 1) {
                do {
                    current++;
                    const link = cat.url + ((current > 1) ? '?p=' + current : '');
                    const $ = cheerio.load((await client.get(link)).data);
                    $('.products li > a').each((idx, el) => {
                        const url = $(el).attr('href');
                        const name = $(el).find(' .product-item figure .product-image img').attr('alt');
                        const thumbnail = $(el).find(' .product-item figure .product-image img').attr('src');
                        const retail = $(el).find(' .product-item .price-box .regular-price .price').text();
                        let reference = '';
                        const words = url.split('/');
                        for (const word of words) {
                            if (word.match(/html/i)) {
                                reference = word.split('-')[0];
                            }
                        }
                        result.items[cat.subCollection].push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.collection,
                            subCollection: cat.subCollection,
                            lang,
                            name,
                            reference,
                            retail
                        })
                    });
                }
                while (current < amount)
            }
            else {
                const $ = cheerio.load((await client.get(cat.url)).data);
                $('.products li > a').each((idx, el) => {
                    const url = $(el).attr('href');
                    const name = $(el).find(' .product-item figure .product-image img').attr('alt');
                    const thumbnail = $(el).find(' .product-item figure .product-image img').attr('src');
                    const retail = $(el).find(' .product-item .price-box .regular-price .price').text();
                    let reference = '';
                    const words = url.split('/');
                    for (const word of words) {
                        if (word.match(/html/i)) {
                            reference = word.split('-')[0];
                        }
                    }
                    result.items[cat.subCollection].push({
                        url,
                        thumbnail,
                        collection: cat.collection,
                        subcollection: cat.subCollection,
                        lang,
                        name,
                        reference,
                        retail
                    })
                });
            }
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
        const { client, entry, lang, brand, brandID, localBase, base, thumbnail } = context;
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
        const reference = $('.sku ').text().trim();
        result.name = $('.product-name h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.regular-price ').text().trim();
        result.reference = reference;
        result.collection = entry.split('/longines-collections/')[1].split('/')[1];
        result.gender = 'X';

        $('.product-info-tabs  div  div ul li').each((idx, el) => {
            const key = $(el).find('dt').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            let value = '';
            $(el).find('dd').each((idx, el) => {
                value += $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            });
            if (key) {
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
        result.caliber.brand = 'Longines';
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
            if (value.match(/coating/i)) {
                result.dial.finish = 'Coating'
            }
            if (value.match(/rotating/i)) {
                result.bezel = 'Rotating'
            }
            if (key === 'shape') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'bracelet buckle') {
                result.band.buckle = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'dimension') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case back') {
                result.case.back = value.trim();
            }
            if (key === 'lug distance') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (key === 'material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'glass') {
                result.case.crystal = value.trim();
            }
            if (key === 'caliber') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'movement') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'main functions') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            if (key === 'bracelet material') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'color') {
                pp = true;
                result.dial.color = value.trim();
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
