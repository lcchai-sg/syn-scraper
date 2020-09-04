import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const baseImageUrl = "https://storage.grand-seiko.com/production-b/uploads";
const CATEGORY_MAP = {
    2248: "watch",
    2255: "Elegance Collection",
    2256: "Heritage Collection",
    2257: "Sport Collection"
};

const LOCALE_MAP = {
    'en': 14,
    // 'jp': 2
};

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, endpoint, brand, brandID, lang, base } = context;
        const indexing = {
            target: 'collection',
            payload: {
                brand, brandID, collections: [
                    "Elegance Collection",
                    "Heritage Collection",
                    "Sport Collection"
                ], items: {
                    "Elegance Collection": [],
                    "Heritage Collection": [],
                    "Sport Collection": []
                }
            }
        };
        const extract = {
            target: "scrape.data.raw",
            payload: []
        };
        let total = 0;
        let count;
        let page = 1;
        do {
            count = 0;
            const products = client.get(
                endpoint, {
                    params: {
                        category_id: 2248,
                        locale_id: LOCALE_MAP[lang],
                        page: page++,
                        paginate: true,
                        sort: '-publish_date',
                        unit: 18
                    }
                }
            );

            client.then(res => {
                products.data.results.map(product => {
                    let catId = product.category_ids.filter(id => id !== 2248)[0];
                    const idx = {
                        source: 'official',
                        lang,
                        reference: product.title,
                        name: product.title,
                        url: base + product.slug,
                        collection: CATEGORY_MAP[catId],
                        thumbnail: baseImageUrl + product.thumbnail.url_key + "_jpg.jpg",
                        retail: product.acf_values.product_price
                    };
                    const detail = {
                        brand,
                        brandID,
                        lang,
                        reference: product.title,
                        source: 'official',
                        rawData: product
                    };
                    indexing.payload.items[CATEGORY_MAP[catId]].push(idx);
                    extract.payload.push(detail);
                    count++;
                    total++;
                })
                observer.next({ ...context, indexing });
                observer.complete();
            });
        } while (!(count < 18));
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
        const { client, endpoint, brand, brandID, lang, base } = context;
        const indexing = {
            target: 'collection',
            payload: {
                brand, brandID,
                source: 'official',
                collections: [
                    "Elegance Collection",
                    "Heritage Collection",
                    "Sport Collection"
                ], items: {
                    "Elegance Collection": [],
                    "Heritage Collection": [],
                    "Sport Collection": []
                }
            }
        };
        const extract = {
            target: "scrape.data.raw",
            payload: []
        };
        let total = 0;
        let count;
        let page = 1;
        do {
            count = 0;
            const products = await client.get(
                endpoint, {
                    params: {
                        category_id: 2248,
                        locale_id: LOCALE_MAP[lang],
                        page: page++,
                        paginate: true,
                        sort: '-publish_date',
                        unit: 18
                    }
                }
            );

            products.data.results.map(product => {
                let catId = product.category_ids.filter(id => id !== 2248)[0];
                const idx = {
                    source: 'official',
                    lang,
                    reference: product.title,
                    name: product.title,
                    url: base + product.slug,
                    collection: CATEGORY_MAP[catId],
                    thumbnail: baseImageUrl + product.thumbnail.url_key + "_jpg.jpg",
                    retail: product.acf_values.product_price
                };
                const detail = {
                    brand,
                    brandID,
                    lang,
                    reference: product.title,
                    source: 'official',
                    rawData: product
                };
                indexing.payload.items[CATEGORY_MAP[catId]].push(idx);
                extract.payload.push(detail);
                count++;
                total++;
            })
        } while (!(count < 18));
        return indexing.payload;
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
        const { client, entry, lang, brand, brandID, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            spec: [],
            scripts: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const name = $('.product-top-header h1').text().trim() + ' ' + $('.product-top-movement').text().trim();
        const reference = $('h1.product-top-item').text().trim();
        const currency = $('.product-top-price  span').text().trim();
        const description = $('.product-outline.product-tab-content').text().trim();
        const collection = $('.product-top-movement').text().trim().replace("[", "").replace("]", "");
        result.name = name;
        result.reference = reference;
        result.description = description.replace("FEATURES", "");
        result.retail = currency + ' ' + retail;
        result.collection = collection;
        result.thumbnail = $('.okra-carousel-slide-inner img').attr('src');
        if (description.toLocaleLowerCase().indexOf('woman') === 1) {
            result.gender = 'F'
        } else {
            result.gender = 'M';
        }
        $('.product-spec-inner tr').each((idx, el) => {
            const key = $(el).find('th').text().replace(":", "");
            const value = $(el).find('td ').text();
            result.spec.push({ key, value });
        });
        $('.posts-list-content.swiper-container ul li div a').each((idx, el) => {
            const ref = $(el).find('.posts-list-name').text();
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
        result.caliber.brand = 'Grand-Seiko';
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
        if (description.match(/polished/i)) {
            result.dial.finish = 'Polished';
        }
        if (description.match(/gloss/i)) {
            result.dial.finish = 'Gloss';
        }
        if (description.match(/brushed/i)) {
            result.dial.finish = 'Brushed';
        }
        if (description.match(/sunburst/i)) {
            result.dial.finish = 'Sunburst';
        }
        if (description.match(/luminescent/i)) {
            result.dial.finish = 'luminescent';
        }
        if (description.match(/coating/i)) {
            result.dial.finish = 'Coating';
        }

        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            // case
            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (key === 'case material ') {
                pp = true;
                result.case.material = s.value;
                result.case.materials.push(s.value);
            }
            if (key === 'glass material ') {
                pp = true;
                result.case.crystal = value;
            }
            if (key === 'glass coating ') {
                pp = true;
                result.case.crystalCoating = value;
            }
            if (key === 'case size ') {
                pp = true;
                const words = value.split('×');
                for (const word of words) {
                    if (word.match(/diameter/i)) {
                        result.case.width = word.replace('Diameter', '').trim();
                    }
                    if (word.match(/thickness/i)) {
                        result.case.thickness = word.replace('Thickness', '').trim();
                    }
                }
            }
            // band
            if (key === 'band material ') {
                pp = true;
                result.band.material = value;
                result.band.materials.push(value);
            }
            // caliber
            if (key === 'caliber no. ') {
                pp = true;
                result.caliber.reference = value.replace('Instructions', '').trim();
            }
            if (key === 'other details / features ') {
                result.caliber.jewels = value.split('jewels')[0].slice(-3).trim() ? value.split('jewels')[0].slice(-3).trim() : '';
            }
            if (key === 'movement type ') {
                pp = true;
                result.caliber.type = value;
            }
            if (key === 'power reserve ') {
                pp = true;
                result.caliber.reserve = value.replace('Approx.', '').trim();
            }
            // water resistance
            if (key === 'water resistance ') {
                pp = true;
                result.waterResistance = value;
                result.case.waterResistance = value;
            }
            if (key === 'clasp type ') {
                pp = true;
                result.band.buckle = value;
                result.band.type = 'Clasp'
            }
            if (key === 'other details / features ') {
                pp = true;
                const data = value.split('・');
                for (const eachData of data) {
                    if (eachData.match(/dial/i)) {
                        // dial color
                        if (eachData.match(/grey/i)) {
                            result.dial.color = 'Grey';
                        }
                        if (eachData.match(/red/i)) {
                            result.dial.color = 'Red';
                        }
                        if (eachData.match(/blue/i)) {
                            result.dial.color = 'Blue';
                        }
                        if (eachData.match(/black/i)) {
                            result.dial.color = 'Black';
                        }
                        if (eachData.match(/green/i)) {
                            result.dial.color = 'Green';
                        }
                        if (eachData.match(/gold/i)) {
                            result.dial.color = 'Gold';
                        }
                        if (eachData.match(/white/i)) {
                            result.dial.color = 'White';
                        }
                        if (eachData.match(/silver/i)) {
                            result.dial.color = 'Silver';
                        }
                        if (eachData.match(/brown/i)) {
                            result.dial.color = 'Brown';
                        }
                        if (eachData.match(/rose gold/i)) {
                            result.dial.color = 'Rose Gold';
                        }
                    }
                    if (eachData.match(/case back/i)) {
                        if (eachData.match(/screw/i)) {
                            result.case.back = 'screwed';
                        }
                        if (eachData.match(/see-through/i)) {
                            result.case.back = 'see through';
                        }
                        if (eachData.match(/full back/i)) {
                            result.case.back = 'Full back';
                        }
                        if (eachData.match(/Solid/i)) {
                            result.case.back = 'Solid';
                        }
                        if (eachData.match(/screw-down/i)) {
                            result.case.back = 'Screw down';
                        }
                        if (eachData.match(/Transparent/i)) {
                            result.case.back = 'Transparent';
                        }
                    }
                }
            }
            if (key === 'accuracy ') {
                pp = true;
                const feature = value.split('/') ? value.split('/') : '';
                result.feature = feature.map(x => x.trim());
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
