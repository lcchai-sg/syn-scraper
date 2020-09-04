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
        $('.dropdown_product_cat option').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace(/\d+/g, '').replace('()', '');
            const count = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace(/^\D+/g, '').replace(')', '');
            const pages = Math.ceil(parseInt(count) / 15);
            const url = base + '/collections/' + $(el).attr('value');
            if (idx > 1) {
                cats.push({ name, url, pages });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            if (cat.pages > 1) {
                let current = 1;
                do {
                    const link = cat.url + ((current > 1) ? '/page/' + current : '');
                    client.get(link).then(res => {
                        const data = res.data;
                        const results = [];
                        const $ = cheerio.load(data);
                        $('.products.clearfix li').each((idx, el) => {
                            const url = $(el).find('.product-link').attr('href');
                            const name = $(el).find('.block.block-cat').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                            const thumbnail = $(el).find('img').attr('data-src');
                            const reference = $(el).find('.block.block-cat small').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                            const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
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
                        observer.next({ ...context, results });
                        observer.complete();
                    });
                }
                while (current < cat.pages)
            }
            else {
                client.then(res => {
                    const data = res.data;
                    const results = [];
                    const $ = cheerio.load(data);
                    $('.products.clearfix li').each((idx, el) => {
                        const url = $(el).find('.product-link').attr('href');
                        const name = $(el).find('.block.block-cat').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                        const thumbnail = $(el).find('img').attr('data-src');
                        const reference = $(el).find('.block.block-cat small').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                        const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
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
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.dropdown_product_cat option').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace(/\d+/g, '').replace('()', '');
            const count = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, ' ').replace(/^\D+/g, '').replace(')', '');
            const pages = Math.ceil(parseInt(count) / 15);
            const url = base + '/collections/' + $(el).attr('value');
            if (idx > 1) {
                cats.push({ name, url, pages });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            if (cat.pages > 1) {
                let current = 1;
                do {
                    const link = cat.url + ((current > 1) ? '/page/' + current : '');
                    const $ = cheerio.load((await client.get(link)).data);
                    $('.products.clearfix li').each((idx, el) => {
                        const url = $(el).find('.product-link').attr('href');
                        const name = $(el).find('.block.block-cat').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                        const thumbnail = $(el).find('img').attr('data-src');
                        const reference = $(el).find('.block.block-cat small').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                        const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
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
                while (current < cat.pages)
            }
            else {
                const $ = cheerio.load((await client.get(cat.url)).data);
                $('.products.clearfix li').each((idx, el) => {
                    const url = $(el).find('.product-link').attr('href');
                    const name = $(el).find('.block.block-cat').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                    const thumbnail = $(el).find('img').attr('data-src');
                    const reference = $(el).find('.block.block-cat small').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                    const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
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
        const { client, entry, lang, brand, brandID } = context;
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
        result.retail = $('.row .price .woocommerce-Price-amount.amount').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.name = $('.product-title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = $('.woocommerce-product-gallery__wrapper img').attr('src');

        $('.row .col-sm-6.col-xs-12.product-summary h5').each((idx, el) => {
            if (idx === 0) {
                result.reference = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        if (entry.indexOf(/ladies/i) > -1) {
            result.gender = 'F'
        }
        else {
            result.gender = 'M'
        }
        result.collection = entry.split('/watch-finder/')[1].split('/')[0];
        $('.block.block-cat small').each((idx, el) => {
            const related = $(el).text();
            if (related) {
                result.related.push(related);
            }
        });
        $('.col-xs-12.col-md-6 div').each((idx, el) => {
            const key = $(el).find('h4').text();
            const value = $(el).text().replace(key, '');
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
        result.caliber.brand = 'Frederique Constant';
        result.caliber.label = 'Japan';
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
                const words = value.split('.');
                for (const word of words) {
                    const details = word.split(',');
                    for (const detail of details) {
                        if (detail.match(/caliber/i)) {
                            result.caliber.reference = detail.trim();
                        }
                        if (detail.match(/power reserve/i)) {
                            result.caliber.reserve = detail.replace('power reserve', '').trim();
                        }
                        if (detail.match(/jewels/i)) {
                            result.caliber.jewels = detail.replace('jewels', '').trim();
                        }
                        if (detail.match(/alt/i)) {
                            result.caliber.frequency = detail.trim();
                        }
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
                }
            }
            if (key === 'case') {
                pp = true;
                const words = value.split('.');
                for (const word of words) {
                    if (word.match(/steel/i)) {
                        result.case.material = 'stainless steel';
                        result.case.materials.push('stainless steel');
                    }
                    if (word.match(/rose gold/i)) {
                        result.case.material = 'rose gold';
                        result.case.materials.push('rose gold');
                    }
                    if (word.match(/yellow gold/i)) {
                        result.case.material = 'yellow gold';
                        result.case.materials.push('yellow gold');
                    }
                    if (word.match(/white gold/i)) {
                        result.case.material = 'white gold';
                        result.case.materials.push('white gold');
                    }
                    if (word.match(/aluminium/i)) {
                        result.case.material = 'aluminium';
                        result.case.materials.push('aluminium');
                    }
                    if (word.match(/titanium/i)) {
                        result.case.material = 'titanium';
                        result.case.materials.push('titanium');
                    }
                    if (word.match(/diameter/i)) {
                        result.case.width = word.replace('diameter', '').trim();
                    }
                    if (word.match(/mineral/i)) {
                        result.case.crystal = 'Mineral Crystal'
                    }
                    if (word.match(/sapphire/i)) {
                        result.case.crystal = 'Sapphire'
                    }
                    if (word.match(/domed/i)) {
                        result.case.crystal = 'Domed Sapphire';
                    }
                    if (word.match(/water/)) {
                        result.waterResistance = word.replace('Water-resistant', '').trim();
                        result.case.waterResistance = word.replace('Water-resistant', '').trim();
                    }
                }
            }
            if (key === 'dial') {
                pp = true;
                const words = value.split('.');
                for (const word of words) {
                    // dial color
                    if (word.match(/grey/i)) {
                        result.dial.color = 'Grey';
                    }
                    if (word.match(/red/i)) {
                        result.dial.color = 'Red';
                    }
                    if (word.match(/blue/i)) {
                        result.dial.color = 'Blue';
                    }
                    if (word.match(/black/i)) {
                        result.dial.color = 'Black';
                    }
                    if (word.match(/green/i)) {
                        result.dial.color = 'Green';
                    }
                    if (word.match(/gold/i)) {
                        result.dial.color = 'Gold';
                    }
                    if (word.match(/white/i)) {
                        result.dial.color = 'White';
                    }
                    if (word.match(/silver/i)) {
                        result.dial.color = 'Silver';
                    }
                    if (word.match(/brown/i)) {
                        result.dial.color = 'Brown';
                    }
                    if (word.match(/rose gold/i)) {
                        result.dial.color = 'Rose Gold';
                    }
                    if (word.match(/rhodium/i)) {
                        result.dial.handStyle = 'Rhodium Plated';
                    }
                    if (word.match(/super-luminova/i)) {
                        result.dial.finish = 'Super Luminova';
                    }
                    if (word.match(/roman/i)) {
                        result.dial.indexType = 'Roman';
                    }
                    if (word.match(/arabic/i)) {
                        result.dial.indexType = 'Arabic';
                    }
                    if (word.match(/applied/i)) {
                        result.dial.finish = 'Applied';
                    }
                }
            }
            if (key === 'strap') {
                pp = true;
                result.band.type = 'Strap';
                // band material
                if (value.match(/alligator/i)) {
                    result.band.material = 'Alligator Leather';
                    result.band.materials.push('Alligator Leather');
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
                if (value.match(/navy/i)) {
                    result.band.color = 'Navy';
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
