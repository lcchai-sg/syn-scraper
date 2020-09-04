import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Hamilton', 'debug')
const xml2js = require('xml2js');

import { clearEmpties } from "../utils";

const xmlIndexing = async (context) => {
    try {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, lang, collections: ['all'], items: {} };
        result.items['all'] = [];
        // const entry = "https://www.hamiltonwatch.com/pub/mediam2/sitemap/sitemap_en_us.xml";
        const parser = new xml2js.Parser();
        logger.debug(entry);
        await client.get(entry).then(resp => {
            const data = resp.data;
            parser.parseString(data, (err, res) => {
                for (let i = 1; i < res.urlset.url.length; i++) {
                    if (res.urlset.url[i].priority[0] === '1.0') {
                        const url = res.urlset.url[i]['loc'][0];
                        const name = res.urlset.url[i]['image:image'][0]['image:title'][0];
                        const thumbnail = res.urlset.url[i]['image:image'][0]['image:loc'][0];

                        let d = url.split('/');
                        d = d[d.length - 1].replace('.html', '');
                        d = d.split('-');
                        let reference = '';
                        if (d[0].match(/h[0-9]{8}/)) {
                            reference = d[0].toUpperCase();
                        } else {
                            let r = d[d.length - 1].replace('.html', '');
                            if (r.match(/h[0-9]{8}/)) {
                                reference = r.toUpperCase();
                            } else {
                                reference = 'noRef' + i;
                            }
                        }

                        result.items['all'].push({
                            name, reference, url, thumbnail
                        })
                    }
                }
            });
        });
        return result;
    } catch (error) {
        logger.error('Failed for indexing class of Hamilton with error : ' + error);
        return new Observable(o => o.error(error));
    }
}

const _indexing = (context) => {
    try {
        return new Observable(observer => {
            const { client, entry, brand, brandID, lang } = context;
            const result = { source: 'official', brand, brandID, collections: [], items: {} };
            const cats = [];
            const perPage = 12;     // number of watches per page

            logger.debug(entry);
            client.get(entry).then(res => {
                const d = res.data;
                const $ = cheerio.load(d);
                $('li.item').each((idx, el) => {
                    const url = $(el).find('button').attr('data-href');
                    const txt = $(el).find('button').text().trim();
                    // return lots of el
                    // hardcoded to check for ?cat= which are categories
                    if (url && url.indexOf('?cat=') > 0) {
                        // also hardcoded to split results by spaces in between
                        // format of text data name...number of watches...words
                        // split exact number of spaces, get name, element 0
                        // split element 1, get element 0 = number of watches
                        let td = txt.split('                                            ');
                        let name = td[0];
                        let nWatches = parseInt(td[1].split(' ')[0]);
                        result.collections.push(name);
                        result.items[name] = [];
                        cats.push({ name, url, nWatches });
                    }
                });

                for (const cat of cats) {
                    const numPages = Math.ceil(cat.nWatches / perPage);
                    for (let i = 1; i <= numPages; i++) {
                        const link = cat.url + '&p=' + i;
                        logger.debug(link)
                        client.get(link).then(res => {
                            const d = res.data;
                            const $ = cheerio.load(d);
                            $('li.product-item').each((idx, el) => {
                                const reference = $(el).attr('data-sku');
                                const url = $(el).find('.product-item-photo').attr('href')
                                const thumbnail = $(el).find('img').attr('data-src')
                                const name = $(el).find('.product-name').text().trim();
                                const retail = $(el).find('.price-wrapper').attr('data-price-amount');
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
                            // observer.complete();
                        })
                    }
                    // observer.complete();
                }
                // observer.next({ ...context, result });
                // observer.complete();
            });
        })
    } catch (error) {
        logger.error('Failed for indexing class of Hamilton with error : ' + error);
        return new Observable(o => o.error(error));
    }
};

export const newIndexing = (context) => {
    return xmlIndexing(context);
    // return _indexing(context);
    // .pipe(
    //     delay(5000),
    //     expand<any>((context, idx): any => {
    //         return context.result.length < 32 ? EMPTY :
    //             _indexing({ ...context, page: idx + 1 })
    //                 .pipe(delay(1000));
    //     }),
    //     map(r => r.result)
    // );
};

export const indexing = async (context) => {
    try {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        const cats = [];

        $('.category-link-container ul li a').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const url = $(el).attr('href');
            if (idx > 8) {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ idx, name, url });
            }

        });
        for (const cat of cats) {
            let count;
            const PAGE = 24;
            count = 0;
            do {
                const link = cat.url + ((count > 0) ? '?p=' + count : '');
                const $$ = cheerio.load((await client.get(link)).data);
                count++;
                $$('ul.category-products .item a').each((idx, el) => {
                    const url = $$(el).attr('href');
                    const name = $$(el).find('.product-name').text().trim();
                    const thumbnail = $$(el).find('.product-image img').attr('src');
                    const retail = $$(el).find('.price-box .regular-price .price').text();
                    const words = url.split('-');
                    let reference = ''
                    for (const word of words) {
                        const refs = word.replace('.html', '').trim();
                        const ref = refs.split('/');
                        for (const refVal of ref) {
                            if (hasNumber(refVal) && refVal.length === 9) {
                                reference = refVal;
                            }
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
            } while (count < PAGE)
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

function hasNumber(String) {
    return /\d/.test(String);
}

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID, price, thumbnail, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            reference: "",
            brand,
            brandID,
            lang,
            price,
            thumbnail,
            retail,
            scripts: [],
            spec: [],
            related: []
        };
        logger.debug(entry);
        const $ = cheerio.load((await client.get(entry)).data);

        // using script data
        //us
        // const entry = "https://www.hamiltonwatch.com/en-us/h64735561-khaki-pilot-schott.html";
        //hk
        // const entry = "https://www.hamiltonwatch.com/zht-hk/h64735561-khaki-pilot-schott.html";
        //jp
        // const entry = "https://www.hamiltonwatch.com/ja-jp/h64735561-khaki-pilot-schott.html";
        //cn
        // const entry = "https://www.hamiltonwatch.com/zhs-cn/h64735561-khaki-pilot-schott.html";
        //sg
        // const entry = "https://www.hamiltonwatch.com/en-sg/h64735561-khaki-pilot-schott.html";

        $('script').each((idx, el) => {
            let ty = $(el).attr('type');
            if (ty == 'application/ld+json') {
                const data = $(el).contents();
                let c = data['0']['data'];
                c = c.replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                c = JSON.parse(c);
                if (c['@type'] === 'Product') {
                    result.name = c.name;
                    result.description = c.description;
                    if (typeof c.image === 'string') {
                        result.thumbnail = c.image;
                    } else {
                        result.thumbnail = c.image[0];
                    }
                    result.reference = c.sku;
                    result.gtin13 = c.gtin13;
                    result.currency = c.offers.priceCurrency;
                    result.price = result.retail = c.offers.price;
                }
            }
        });

        // using meta tag
        // only US has currency & price inside meta tag, other market does not provide
        // $('meta').each((_, el) => {
        //     const data = $(el).attr('content');
        //     const field = $(el).attr('property');
        //     switch (field) {
        //         case 'og:title':
        //             const r = data.split('|');
        //             result.name = r[0].trim();
        //             result.reference = r[1].trim();
        //             break;
        //         case 'og:description': result.description = data; break;
        //         case 'og:image':
        //             (!result.thumbnail) ? result.thumbnail = data : null;
        //             break;
        //         case 'product:price:amount':
        //             (!result.retail) ? result.retail = data : null;
        //             (!result.price) ? result.price = data : null;
        //             break;
        //         case 'product:price:currency': result.currency = data; break;
        //         default: break;
        //     }
        // });

        // Japan site does not get data, different structure?

        $('tr').each((_, el) => {
            const key = $(el).find('.data').attr('data-th');
            const value = $(el).find('.data').text().trim();
            result.spec.push({ key, value, })
        })
        return result;
    } catch (error) {
        logger.error('Failed extraction for Hamilton with error : ' + error)
        return [];
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
        result.caliber.brand = 'Hamilton';
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
        if (description) {
            if (description.match(/chrono/i)) {
                result.dial.indexType = 'Chronograph';
            }
            if (description.match(/Super-Luminova/i)) {
                result.dial.finish = 'Super Luminova';
            }
            if (description.match(/sapphire/i)) {
                result.case.crystal = 'Sapphire';
            }
            if (description.match(/leather strap/i)) {
                result.band.material = 'Leather';
                result.band.materials.push('Leather');
            }
        }
        for (const singleSpec of spec) {
            const key = singleSpec.key.toLowerCase();
            const value = singleSpec.value;

            if (key && key.match(/.*strap ref*./)) {
                result.band.reference = value;
            }
            // in spec "Buckle type"
            if (key && key.match(/.*buckle type*./)) {
                result.band.buckle = value;
            }
            // in spec "Strap type"
            if (key && key.match(/.*strap type*./)) {
                result.band.material = value;
            }
            // in spec "Gender"
            if (key && key.match(/.*gender*./)) {
                result.gender = value === 'Men' ? 'M' : 'F';
            }
            // in spec "Collection"
            if (key && key.match(/.*collection*./)) {
                result.collection = value;
            }
            if (key && (key.match(/.*strap material*./) || key.match(/.*strap color*./))) {
                // band color
                if (value && value.match(/grey/i)) {
                    result.band.color = 'Grey';
                }
                if (value && value.match(/red/i)) {
                    result.band.color = 'Red';
                }
                if (value && value.match(/blue/i)) {
                    result.band.color = 'Blue';
                }
                if (value && value.match(/black/i)) {
                    result.band.color = 'Black';
                }
                if (value && value.match(/green/i)) {
                    result.band.color = 'Green';
                }
                if (value && value.match(/gold/i)) {
                    result.band.color = 'Gold';
                }
                if (value && value.match(/white/i)) {
                    result.band.color = 'White';
                }
                if (value && value.match(/silver/i)) {
                    result.band.color = 'Silver';
                }
                if (value && value.match(/brown/i)) {
                    result.band.color = 'Brown';
                }
                if (value && value.match(/rose gold/i)) {
                    result.band.color = 'Rose Gold';
                }
                // band material
                if (value && value.match(/alligator/i)) {
                    result.band.material = 'Alligator Leather';
                    result.band.materials.push('Alligator Leather');
                }
                if (value && value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value && value.match(/rose gold/i)) {
                    result.band.material = 'rose gold';
                    result.band.materials.push('rose gold');
                }
                if (value && value.match(/yellow gold/i)) {
                    result.band.material = 'yellow gold';
                    result.band.materials.push('yellow gold');
                }
                if (value && value.match(/aluminium/i)) {
                    result.band.material = 'aluminium';
                    result.band.materials.push('aluminium');
                }
                if (value && value.match(/titanium/i)) {
                    result.band.material = 'titanium';
                    result.band.materials.push('titanium');
                }
                if (value && value.match(/rubber/i)) {
                    result.band.material = 'rubber';
                    result.band.materials.push('rubber');
                }
                if (value && value.match(/leather/i)) {
                    result.band.material = 'Leather';
                    result.band.materials.push('Leather');
                }
            }
            if (result.band.material) {
                if ((result.band.material.match(/stainless steel/i) ||
                    result.band.material.match(/titanium/i)) &&
                    !(result.band.material.match(/leather/i))) {
                    result.band.type = 'Bracelet';
                } else {
                    result.band.type = 'Strap';
                }
            }
            // in spec "Caliber"
            if (key === "caliber") {
                result.caliber.reference = value.trim();
            }
            // in spec "Movement"
            if (key === "movement") {
                result.caliber.type = value.trim();
            }
            // in spec "Power reserve"
            if (key === "power reserve") {
                result.caliber.reserve = value.trim();
            }
            // in spec "Dial color"
            if (key === "dial color") {
                result.dial.color = value.trim();
            }
            // in spec "Crystal"
            if (key === "crystal") {
                result.case.crystal = value.trim();
            }
            // in spec "Case size"
            if (key === "case size") {
                result.case.diameter = value.trim();
            }
            if (key === "size") {
                result.case.width = value.trim();
            }
            if (key === "diamonds") {
                result.caliber.jewels = value.trim();
            }
            if (key === "thickness" || key === "depth") {
                result.case.thickness = value.trim();
            }
            // in spec "Water Resistance"
            if (key && key.match(/.*water resistance*./)) {
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            // in spec "Case material"
            if (key && key.match(/.*case material*./)) {
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key && key.match(/.*lug width*./)) {
                result.band.lugWidth = value.trim();
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
