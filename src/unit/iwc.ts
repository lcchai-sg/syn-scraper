import axios from "axios";
import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const priceURL = "https://www.iwc.com/us/en/watches.pricedetails.US.json";
const context = {
    entry: "https://www.iwc.com/us/en/watches.html",
    client: axios({ baseURL: "https://www.iwc.com/us/en/watches.html" })
}

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        const allProducts = [];
        const collections = $(".iwc-finder-result-collection");
        const items = {};
        const collectionTitles = [];

        client.then(res => {
            collections.each((i, collection) => {
                const collectionTitle = $(collection).find("h3").text().trim();
                collectionTitles.push(collectionTitle);
                items[collectionTitle] = [];
                const subCollections = $(collection).find(".iwc-finder-result-subcollection");
                if (subCollections.length == 0) {
                    // no sub categories
                    const products = $(collection).find(".iwc-finder-result-product");
                    processProducts($, products, base, collectionTitle, null).forEach(product => items[collectionTitle].push(product));
                } else {
                    // has sub categories
                    subCollections.each((_, subCollection) => {
                        const subCollectionTitle = $(subCollection).find("h4").text().trim();
                        const products = $(subCollection).find(".iwc-finder-result-product");
                        processProducts($, products, base, collectionTitle, subCollectionTitle).forEach(product => items[collectionTitle].push(product));
                    });
                }
            })
            const prices = (axios.get(priceURL))['data'];
            for (const product in allProducts) {
                allProducts[product].price = prices.values[allProducts[product].ref];
            }
            result.items = items;
            result.collections = collectionTitles;
            observer.next({ ...context, result });
            observer.complete();
        });
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
        const { client, entry, brand, brandID, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        const allProducts = [];
        const collections = $(".iwc-finder-result-collection");
        const items = {};
        const collectionTitles = [];

        collections.each((i, collection) => {
            const collectionTitle = $(collection).find("h3").text().trim();
            collectionTitles.push(collectionTitle);
            items[collectionTitle] = [];
            const subCollections = $(collection).find(".iwc-finder-result-subcollection");
            if (subCollections.length == 0) {
                // no sub categories
                const products = $(collection).find(".iwc-finder-result-product");
                result.collections.push({ collection: collectionTitle, subCollection: collectionTitle })
                processProducts($, products, base, collectionTitle, null).forEach(product => items[collectionTitle].push(product));
            } else {
                // has sub categories
                subCollections.each((_, subCollection) => {
                    const subCollectionTitle = $(subCollection).find("h4").text().trim();
                    const products = $(subCollection).find(".iwc-finder-result-product");
                    items[subCollectionTitle] = [];
                    result.collections.push({ collection: collectionTitle, subCollection: subCollectionTitle })
                    processProducts($, products, base, collectionTitle, subCollectionTitle).forEach(product => items[subCollectionTitle].push(product));
                });
            }
        })
        const prices = (await axios.get(priceURL)).data;
        for (const product in allProducts) {
            allProducts[product].price = prices.values[allProducts[product].ref];
        }
        result.items = items;
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
}

const processProducts = ($, products, base, collectionTitle, subCollectionTitle) => {
    const baseUrl = 'https://www.iwc.com';
    const lang = 'en';
    let allProductsInSubCollection = [];
    products.each((_, product) => {
        const url = baseUrl + $(product).find(".iwc-finder-result-product > a").attr('href');
        const name = $(product).find(".iwc-finder-product-title").text().trim();
        const thumbnail = baseUrl + $(product).find("img")[0].attribs["data-src"];
        const reference = $(product).find(".iwc-finder-product-ref").text().trim();
        const retail = $(product).find(".iwc-product-fromprice").text().trim();

        allProductsInSubCollection.push({
            source: 'official',
            collection: collectionTitle,
            subCollection: subCollectionTitle || null,
            url,
            name,
            reference,
            thumbnail,
            retail,
            lang
        })
    });
    return allProductsInSubCollection;
}

export const extraction = async (context) => {
    try {
        const { entry, lang, brand, brandID, client, thumbnail, retail } = context;
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
        const reference = $('.iwc-buying-options-reference').text().trim();
        $("#iwc-features > div > div:nth-child(1) > ul li.iwc-product-detail-item").each((idx, elem) => {
            const caseDetail = $(elem).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key: 'case', value: caseDetail });
        });
        $("#iwc-features > div > div:nth-child(2) > ul li.iwc-product-detail-item").each((idx, elem) => {
            const movement = $(elem).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key: 'movement', value: movement });
        });
        $("#iwc-features > div > div:nth-child(3) > ul li.iwc-product-detail-item").each((idx, elem) => {
            const feature = $(elem).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key: 'feature', value: feature });
        });
        $("#iwc-features > div > div:nth-child(4) > ul li.iwc-product-detail-item").each((idx, elem) => {
            const dial = $(elem).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key: 'dial', value: dial });
        });
        $("#iwc-features > div > div:nth-child(5) > ul li.iwc-product-detail-item").each((idx, elem) => {
            const strap = $(elem).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key: 'strap', value: strap });
        });
        result.name = $('.iwc-buying-options-title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Add to my wishlist', '').trim();
        result.retail = retail;
        result.reference = reference;
        result.gender = 'M';
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
        result.caliber.brand = 'IWC';
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
            // case
            if (key === 'case') {
                pp = true;
                if (value.match(/steel/i)) {
                    result.case.material = 'stainless steel';
                    result.case.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.case.material = 'rose gold';
                    result.case.materials.push('rose gold');
                }
                if (value.match(/18 ct 5N gold/i)) {
                    result.case.material = '18 ct 5N gold';
                    result.case.materials.push('18 ct 5N gold');
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
                if (value.match(/oval/i)) {
                    result.case.shape = 'Oval';
                }
                else {
                    result.case.shape = 'Round';
                }
                if (value.match(/diameter/i)) {
                    result.case.width = value.replace('Diameter', '').trim();
                }
                if (value.match(/height/i)) {
                    result.case.thickness = value.replace('Height', '').trim();
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
                if (value.match(/water resistance/i)) {
                    result.waterResistance = value.replace('Water resistance', '').trim();
                    result.case.waterResistance = value.replace('Water resistance', '').trim();
                }
            }
            // caliber
            if (key === 'movement') {
                pp = true;
                if (value.match(/calibre/i)) {
                    result.caliber.reference = value.trim();
                }
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
                if (value.match(/power reserve/i)) {
                    result.caliber.reserve = value.replace('Power Reserve', '').trim();
                }
                if (value.match(/frequency/i)) {
                    result.caliber.frequency = value.replace('Frequency', '').trim();
                }
                if (value.match(/components/i)) {
                    result.caliber.components = value.replace('Components', '').trim();
                }
                if (value.match(/jewels/i)) {
                    result.caliber.jewels = value.replace('Jewels', '').trim();
                }
            }
            if (key === 'feature') {
                pp = true;
                result.feature.push(value);
            }
            // dial
            if (key === 'dial') {
                pp = true;
                if (value.match(/luminescence/i)) {
                    result.dial.finish = 'luminescence';
                }
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
            // band
            if (key === 'strap') {
                pp = true;
                // band color
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
                if (value.match(/strap/i)) {
                    result.band.type = 'Strap';
                }
                if (value.match(/bracelet/i)) {
                    result.band.type = 'Bracelet';
                }
                if (value.match(/width/i)) {
                    result.band.lugWidth = value.replace('Strap width', '').trim();
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
