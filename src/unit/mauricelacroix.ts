import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const pages = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.navigation ul li ul li').each((idx, el) => {
            if (idx < 6) {
                const name = $(el).text();
                const url = $(el).find('a').attr('href');
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url })
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((client.get(cat.url)).data);
            $('.items.pages-items li').each((idx, el) => {
                const url = $(el).find('a').attr('href');
                if (pages.indexOf(url) < 0 && url) {
                    pages.push(url);
                }
            });
            const amount = pages.length + 1;
            let current = 0;
            if (amount > 1) {
                do {
                    current++;
                    const link = cat.url + ((current > 1) ? '?p=' + current : '');
                    client.get(link).then(res => {
                        const $ = cheerio.load((client.get(link)).data);
                        $('.item.product.product-item').each((idx, el) => {
                            const url = $(el).find('a').attr('href');
                            const name = $(el).find('.product.name.product-item-name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                            const thumbnail = $(el).find('a img').attr('src');
                            const retail = $(el).find('.price').text().trim();
                            const reference = $(el).find('.product-item-sku').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                            result.items[cat.name].push({
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
                while (current < amount)
            }
            else {
                client.get(cat.url).then(res => {
                    const $ = cheerio.load((client.get(cat.url)).data);
                    $('.item.product.product-item').each((idx, el) => {
                        const url = $(el).find('a').attr('href');
                        const name = $(el).find('.product.name.product-item-name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        const thumbnail = $(el).find('a img').attr('src');
                        const retail = $(el).find('.price').text().trim();
                        const reference = $(el).find('.product-item-sku').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
        const pages = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.navigation ul li ul li').each((idx, el) => {
            if (idx < 6) {
                const name = $(el).text();
                const url = $(el).find('a').attr('href');
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url })
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url)).data);
            $('.items.pages-items li').each((idx, el) => {
                const url = $(el).find('a').attr('href');
                if (pages.indexOf(url) < 0 && url) {
                    pages.push(url);
                }
            });
            const amount = pages.length + 1;
            let current = 0;
            if (amount > 1) {
                do {
                    current++;
                    const link = cat.url + ((current > 1) ? '?p=' + current : '');
                    const $ = cheerio.load((await client.get(link)).data);
                    $('.item.product.product-item').each((idx, el) => {
                        const url = $(el).find('a').attr('href');
                        const name = $(el).find('.product.name.product-item-name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        const thumbnail = $(el).find('a img').attr('src');
                        const retail = $(el).find('.price').text().trim();
                        const reference = $(el).find('.product-item-sku').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        result.items[cat.name].push({
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
                while (current < amount)
            }
            else {
                const $ = cheerio.load((await client.get(cat.url)).data);
                $('.item.product.product-item').each((idx, el) => {
                    const url = $(el).find('a').attr('href');
                    const name = $(el).find('.product.name.product-item-name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('a img').attr('src');
                    const retail = $(el).find('.price').text().trim();
                    const reference = $(el).find('.product-item-sku').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
            thumbnail,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.page-title-wrapper.product h1').text().trim();
        result.reference = $('.product.attribute.sku .value').text().trim();
        result.description = $('.description p').text().trim();
        result.gender = 'M';
        $('.price-box.price-final_price .price-container .price').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().trim();
            }
        });
        $('.product.attribute ').each((idx, el) => {
            const key = $(el).find('.type').text().trim();
            const value = $(el).find('.value').text().trim();
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
        result.caliber.brand = 'Maurice Lecroix';
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

            if (key === 'case diameter') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'strap material') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'buckle') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'movement') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'functions') {
                pp = true;
                const words = value.split(/\r?\n/);
                for (const word of words) {

                    if (word.match(/vph/i)) {
                        result.caliber.frequency = word.trim();
                    }
                    if (word.match(/power reserve/i)) {
                        result.caliber.reserve = word.replace('Power Reserve:', '').trim();
                    }
                    if (word.match(/jewels/i)) {
                        result.caliber.jewels = word.replace('Number of jewels:', '').trim();
                    }
                    if (word.match(/rhodium/i)) {
                        result.dial.handStyle = 'Rhodium Plated';
                    }
                    if (word.match(/blued/i)) {
                        result.dial.handStyle = 'blued';
                    }
                    if (word.match(/gloss/i)) {
                        result.dial.finish = 'gloss';
                    }
                    if (word.match(/matte/i)) {
                        result.dial.finish = 'matte';
                    }
                    if (word.match(/sunburst/i)) {
                        result.dial.finish = 'sunburst';
                    }
                    if (word.match(/luminescent/i)) {
                        result.dial.finish = 'luminescent';
                    }
                    if (word.match(/luminous/i)) {
                        result.dial.finish = 'luminous';
                    }
                    if (word.match(/Superluminova/i)) {
                        result.dial.finish = 'Superluminova';
                    }
                    if (word.match(/brushed/i)) {
                        result.dial.finish = 'brushed';
                    }
                    if (word.match(/sun brushed/i)) {
                        result.dial.finish = 'sun brushed';
                    }
                    if (word.match(/satin/i)) {
                        result.dial.finish = 'satin';
                    }
                    if (word.match(/guilloche/i)) {
                        result.dial.finish = 'guilloche';
                    }
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
