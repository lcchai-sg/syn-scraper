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
        $('.un-c-megaMenu__sub-menu li a').each((idx, el) => {
            if (idx < 5) {
                const name = $(el).text().trim();
                const url = $(el).attr('href');
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url });
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((client.get(cat.url)).data);
            const amount = $$('.un-c-filter__total').text().replace('Watches', '').trim();
            const PAGE = Math.ceil(parseInt(amount) / 9);
            if (PAGE > 1) {
                let current = 1;
                do {
                    const link = cat.url + ((current > 0) ? '?p=' + current : '?p=1');
                    const $$ = cheerio.load((client.get(link)).data);
                    $$('.un-c-product.product-item').each((idx, el) => {
                        const url = $$(el).find('.un-c-product__item a').attr('href');
                        const thumbnail = $$(el).find('.un-c-product__item a img').attr('src');
                        const name = $$(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        const retail = $$(el).find('.price-box.price-final_price').text().trim();
                        let reference = '';
                        const words = url.split('/');
                        for (const word of words) {
                            if (word.match(/html/i)) {
                                reference = word.replace('.html', '');
                            }
                        }
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
                    current++;
                }
                while (current < (PAGE + 1))
            }
            else {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.un-c-product.product-item').each((idx, el) => {
                    const url = $$(el).find('.un-c-product__item a').attr('href');
                    const thumbnail = $$(el).find('.un-c-product__item a img').attr('src');
                    const name = $$(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const retail = $$(el).find('.price-box.price-final_price').text().trim();
                    let reference = '';
                    const words = url.split('/');
                    for (const word of words) {
                        if (word.match(/html/i)) {
                            reference = word.replace('.html', '');
                        }
                    }
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
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.un-c-megaMenu__sub-menu li a').each((idx, el) => {
            if (idx < 5) {
                const name = $(el).text().trim();
                const url = $(el).attr('href');
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url });
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            const amount = $$('.un-c-filter__total').text().replace('Watches', '').trim();
            const PAGE = Math.ceil(parseInt(amount) / 9);
            if (PAGE > 1) {
                let current = 1;
                do {
                    const link = cat.url + ((current > 0) ? '?p=' + current : '?p=1');
                    const $$ = cheerio.load((await client.get(link)).data);
                    $$('.un-c-product.product-item').each((idx, el) => {
                        const url = $$(el).find('.un-c-product__item a').attr('href');
                        const thumbnail = $$(el).find('.un-c-product__item a img').attr('src');
                        const name = $$(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                        const retail = $$(el).find('.price-box.price-final_price').text().trim();
                        let reference = '';
                        const words = url.split('/');
                        for (const word of words) {
                            if (word.match(/html/i)) {
                                reference = word.replace('.html', '');
                            }
                        }
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
                    current++;
                }
                while (current < (PAGE + 1))
            }
            else {
                const $$ = cheerio.load((await client.get(cat.url)).data);
                $$('.un-c-product.product-item').each((idx, el) => {
                    const url = $$(el).find('.un-c-product__item a').attr('href');
                    const thumbnail = $$(el).find('.un-c-product__item a img').attr('src');
                    const name = $$(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const retail = $$(el).find('.price-box.price-final_price').text().trim();
                    let reference = '';
                    const words = url.split('/');
                    for (const word of words) {
                        if (word.match(/html/i)) {
                            reference = word.replace('.html', '');
                        }
                    }
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
        result.name = $('.col-md-12.text-center.text-md-left h2').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        $('.price-box.price-final_price').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        result.reference = $('.text-center.text-md-left.text-secondary.small').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.gender = 'M'
        $('.d-flex.flex-wrap.small.no-gutters .mt-4 ').each((idx, el) => {
            const key = $(el).find('span').text();
            const value = $(el).text().replace(key, '').trim();
            if (value) {
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
        result.caliber.brand = 'Ulysse Nardin';
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
            if (key === 'caliber') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'case') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'mechanism') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'dimensions') {
                pp = true;
                result.case.width = value.replace(/diameter/i, '').trim();
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
            if (key === 'strap') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
                result.band.type = 'Strap';
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
