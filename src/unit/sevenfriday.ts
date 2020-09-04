import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);

        $('ul.navigation-submenu[data-linklist="watches-0"] li').each((idx, el) => {
            if (idx >= 0 && idx < 7) {
                const name = $(el).find('a').text().trim();
                const url = base + $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('#bc-sf-filter-products article').each((idx, el) => {
                    const url = base + $$(el).find('a').attr('href');
                    const name = $$(el).find('.product-list-item-title a').text();
                    const thumbnail = 'https:' + $$(el).find('.product-list-item-thumbnail img').attr('src');
                    const retail = $$(el).find('.product-list-item-price span.money').text().trim();
                    const reference = $$(el).find('.product-list-item-thumbnail').attr('data-url') ? $$(el).find('.product-list-item-thumbnail').attr('data-url').split(/[,/]+/).pop() : '';

                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        collection: cat.name,
                        name,
                        retail,
                        thumbnail,
                        reference,
                        lang
                    })
                })
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
        const { client, base, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);

        $('ul.navigation-submenu[data-linklist="watches-0"] li').each((idx, el) => {
            if (idx >= 0 && idx < 7) {
                const name = $(el).find('a').text().trim();
                const url = base + $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('#bc-sf-filter-products article').each((idx, el) => {
                const url = base + $$(el).find('a').attr('href');
                const name = $$(el).find('.product-list-item-title a').text();
                const thumbnail = 'https:' + $$(el).find('.product-list-item-thumbnail img').attr('src');
                const retail = $$(el).find('.product-list-item-price span.money').text().trim();
                const reference = $$(el).find('.product-list-item-thumbnail').attr('data-url') ? $$(el).find('.product-list-item-thumbnail').attr('data-url').split(/[,/]+/).pop() : '';

                result.items[cat.name].push({
                    source: 'official',
                    url,
                    collection: cat.name,
                    name,
                    retail,
                    thumbnail,
                    reference,
                    lang
                })
            })
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
        const { client, entry, lang, brand, brandID, thumbnail } = context;
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
        result.name = $('.product-title').text().trim();
        result.collection = $('.product-tags').text().split('|')[1].trim() ? $('.product-tags').text().split('|')[1].trim() : '';
        result.retail = $('.product-price-minimum.money').text().trim();
        result.gender = 'M';
        result.description = $('.rte span').text().trim();
        result.thumbnail = 'https:' + $('.product-main-image img').attr('src');
        let box = $('.additional-information-element:nth-child(2) .custom-field.custom-field__box.custom-field__type--html').find('p:nth-child(3)').text();
        let spec_arr = [];
        let inner_box = box ? box.replace(/\n\n/g, "|").split("|") : [];
        inner_box.forEach(function (obj) {
            let split_obj = obj.split(":");
            spec_arr.push({
                "key": split_obj[0] ? split_obj[0].trim() : "",
                "value": split_obj[1] ? split_obj[1].trim() : ""
            });
        });
        result.spec = spec_arr;
        let interface_str = $('.additional-information-element:nth-child(3) .custom-field.custom-field__box.custom-field__type--html').find('p:nth-child(3)').text();
        result.feature = interface_str ? interface_str.replace(/\n\n/g, "|").split("|") : [];
        let nfc = $('.additional-information-element:nth-child(4) .custom-field.custom-field__box.custom-field__type--html').find('p:nth-child(3)').text();
        spec_arr.push({
            "key": "nfc",
            "value": nfc
        });
        let other_features = $('.additional-information-element:nth-child(5) .custom-field.custom-field__box.custom-field__type--html').find('p:nth-child(3)').text();
        let inner_other_features = other_features ? other_features.replace(/\n\n/g, "|").split("|") : [];
        inner_other_features.forEach(function (obj) {
            let split_obj = obj.split(":");
            spec_arr.push({
                "key": split_obj[0] ? split_obj[0].trim() : "",
                "value": split_obj[1] ? split_obj[1].trim() : ""
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
        result.caliber.brand = 'Seven Friday';
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
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value;
                result.case.waterResistance = value;
            }
            if (key === 'dial') {
                pp = true;
                result.dial = value;
            }
            if (key === 'strap') {
                pp = true;
                result.band.material = value;
                result.band.materials.push(value);
            }
            if (key === 'buckle') {
                pp = true;
                result.band.buckle = value;
            }
            if (key === 'case') {
                pp = true;
                result.case.material = value;
                result.case.materials.push(value);
            }
            if (key === 'bezel') {
                pp = true;
                result.bezel.material = value;
                result.bezel.materials.push(value);
            }
            if (key === 'caseback') {
                pp = true;
                result.case.back = value;
            }
            if (key === 'glass') {
                pp = true;
                result.case.crystal = value;
            }
            if (key === 'height') {
                pp = true;
                result.case.height = value;
            }
            if (key === 'size') {
                pp = true;
                result.case.width = value.split("x")[0].trim();
            }
            if (key === 'width') {
                pp = true;
                result.case.width = value;
            }
            if (key === 'type') {
                pp = true;
                result.caliber.type = value;
            }
            if (key === 'reserve') {
                pp = true;
                result.caliber.reserve = value;
            }
            if (key === 'reference') {
                pp = true;
                result.caliber.reference = value;
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
