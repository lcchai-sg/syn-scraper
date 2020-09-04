import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { entry, client, base, brand, brandID, lang } = context;
        const cats = [
            {
                name: 'Men',
                url: entry + 'all',
                gender: 'M'
            },
            {
                name: 'Women',
                url: entry + 'women',
                gender: 'F'
            }
        ];
        for (const cat of cats) {
            if (cat.name === 'Men') {
                let current = 0;
                do {
                    current++;
                    const link = cat.url + ((current > 0) ? '?page=' + current : '');
                    client.get(link).then(res => {
                        const data = res.data;
                        const results = [];
                        const $ = cheerio.load(data);
                        $('.grid__item.grid-product.small--one-half').each((idx, el) => {
                            const url = base + $(el).find('.grid-product__content a').attr('href');
                            const thumbnail = 'https:' + $(el).find('.image-wrap img').attr('data-src').replace('{width}', '400');
                            const name = $(el).find('.image-wrap img').attr('alt');
                            const retail = $(el).find('.grid-product__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                            results.push({
                                source: 'official',
                                url,
                                thumbnail,
                                collection: cat.name,
                                lang,
                                name,
                                gender: cat.gender,
                                retail,
                                brand,
                                brandID
                            });
                        });
                        observer.next({ ...context, results });
                        observer.complete();
                    });
                }
                while (current < 2)
            }
            else {
                client.get(cat.url).then(res => {
                    const data = res.data;
                    const results = [];
                    console.log('test => ', cat.url)
                    const $ = cheerio.load(data);
                    $('.grid__item.grid-product.small--one-half').each((idx, el) => {
                        const url = base + $(el).find('.grid-product__content a').attr('href');
                        const thumbnail = 'https:' + $(el).find('.image-wrap img').attr('data-src').replace('{width}', '400');
                        const name = $(el).find('.image-wrap img').attr('alt');
                        const retail = $(el).find('.grid-product__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        results.push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            name,
                            gender: cat.gender,
                            retail,
                            brand,
                            brandID
                        });
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
        const { entry, client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [
            {
                name: 'Men',
                url: entry + 'all',
                gender: 'M'
            },
            {
                name: 'Women',
                url: entry + 'women',
                gender: 'F'
            }
        ];
        for (const cat of cats) {
            result.collections.push(cat.name);
            result.items[cat.name] = [];
            if (cat.name === 'Men') {
                let current = 0;
                do {
                    current++;
                    const link = cat.url + ((current > 0) ? '?page=' + current : '');
                    const $ = cheerio.load((await client.get(link)).data);
                    $('.grid__item.grid-product.small--one-half').each((idx, el) => {
                        const url = base + $(el).find('.grid-product__content a').attr('href');
                        const thumbnail = 'https:' + $(el).find('.image-wrap img').attr('data-src').replace('{width}', '400');
                        const name = $(el).find('.image-wrap img').attr('alt');
                        const retail = $(el).find('.grid-product__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        result.items[cat.name].push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            name,
                            gender: cat.gender,
                            retail
                        });
                    });
                }
                while (current < 2)
            }
            else {
                const $ = cheerio.load((await client.get(cat.url)).data);
                $('.grid__item.grid-product.small--one-half').each((idx, el) => {
                    const url = base + $(el).find('.grid-product__content a').attr('href');
                    const thumbnail = 'https:' + $(el).find('.image-wrap img').attr('data-src').replace('{width}', '400');
                    const name = $(el).find('.image-wrap img').attr('alt');
                    const retail = $(el).find('.grid-product__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        gender: cat.gender,
                        retail
                    });
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
        result.name = $('.product-single__title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.product__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.description = $('.product-single__description').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = 'https:' + $('.product__main-photos img').attr('src');
        if (entry.indexOf('all') > -1) {
            result.collection = 'Men';
        }
        else {
            result.collection = 'Women';
        }
        if (result.collection.match(/women/i)) {
            result.gender = 'F';
        }
        else {
            result.gender = 'M';
        }
        $('.product-single__tech-specs-content').each((idx, el) => {
            const key = $(el).find('h4').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
        result.caliber.brand = 'About Vintage';
        result.caliber.label = 'Denmark';
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
            }
            if (key === 'glass') {
                pp = true;
                if (value.match(/mineral/i)) {
                    result.case.crystal = 'Mineral Crystal'
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire'
                }
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/screw/i)) {
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
                if (value.match(/Transparent/i)) {
                    result.case.back = 'Transparent';
                }
            }
            if (key === 'movement') {
                pp = true;
                const words = value.split(',');
                for (const word of words) {
                    if (word.match(/caliber/i)) {
                        result.caliber.reference = word.trim();
                    }
                    if (word.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                        pp = true;
                        result.caliber.type = 'Automatic';
                    }
                    if (word.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                        pp = true;
                        result.caliber.type = 'Hand wind';
                    }
                    if (word.toLowerCase().indexOf('quartz') > -1) {
                        pp = true;
                        result.caliber.type = 'Quartz';
                    }
                    if (word.match(/jewel/i)) {
                        result.caliber.jewels = word.replace(/\D/g, '').trim();
                    }
                    if (word.match(/reserve/i)) {
                        result.caliber.reserve = word.replace('power reserve', '').trim();
                    }
                    if (word.match(/alt/i)) {
                        result.caliber.frequency = word.trim();
                    }
                }
            }
            if (key === 'size') {
                pp = true;
                const words = value.split(',');
                for (const word of words) {
                    if (word.match(/wide/i)) {
                        result.case.width = word.replace('wide', '').trim();
                    }
                    if (word.match(/thick/i)) {
                        result.case.height = word.replace('thick', '').trim();
                    }
                }
            }
            if (key === 'strap') {
                pp = true;
                result.band.materials.push(value.trim());
                result.band.material = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
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
