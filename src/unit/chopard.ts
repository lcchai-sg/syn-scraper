import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        const cats = [];

        $('.nav-2367 .menu-element-sub-menu ').each((idx, el) => {
            let url = '';
            let name = '';
            const urls = [];
            const names = [];
            $(el).find('a').each((idx, el) => {
                url = $(el).attr('href');
                urls.push(url);
            });
            $(el).find('li .menu-element a').each((idx, el) => {
                name = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                names.push(name);
            });
            urls.map((url, i) => {
                const name = names[i];
                result.items[name] = [];
                result.collections.push(name);
                cats.push({ name, url });
            });
        });
        $('.nav-2368 .menu-element-sub-menu ').each((idx, el) => {
            let url = '';
            let name = '';
            const urls = [];
            const names = [];
            $(el).find('a').each((idx, el) => {
                url = $(el).attr('href');
                urls.push(url);
            });
            $(el).find('li .menu-element a').each((idx, el) => {
                name = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                names.push(name);
            });
            urls.map((url, i) => {
                const name = names[i];
                if (result.collections.indexOf(name) === -1) {
                    cats.push({ name, url });
                    result.collections.push(name);
                    result.items[name] = [];
                }
            });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('.products-grid li').each((idx, el) => {
                    let reference = '';
                    let thumbnail = '';
                    const url = $$(el).find('.border-container a').attr('href');;
                    const productName = $$(el).find('.product-name').text();
                    const productSubnaame = $$(el).find('.product-subname').text();
                    const name = productName + ' ' + productSubnaame;
                    const retail = $$(el).find('.price-box .price-container .price').text().trim();
                    if ($$(el).find('.product-image-wrapper img').attr('src')) {
                        thumbnail = $$(el).find('.product-image-wrapper img').attr('src')
                        const refs = thumbnail.split('/');
                        for (const ref of refs) {
                            const refVal = ref.split('_');
                            for (const val of refVal) {
                                if (val.length === 11) {
                                    reference = val;
                                }
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
                observer.next({ ...context, results });
                observer.complete();
            });
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
        const $ = cheerio.load((await client.get(entry)).data);
        const cats = [];

        $('.nav-2367 .menu-element-sub-menu ').each((idx, el) => {
            let url = '';
            let name = '';
            const urls = [];
            const names = [];
            $(el).find('a').each((idx, el) => {
                url = $(el).attr('href');
                urls.push(url);
            });
            $(el).find('li .menu-element a').each((idx, el) => {
                name = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                names.push(name);
            });
            urls.map((url, i) => {
                const name = names[i];
                if (name !== 'VIEW ALL PRODUCTS') {
                    cats.push({ name, url });
                }
            });
        });
        $('.nav-2368 .menu-element-sub-menu ').each((idx, el) => {
            let url = '';
            let name = '';
            const urls = [];
            const names = [];
            $(el).find('a').each((idx, el) => {
                url = $(el).attr('href');
                urls.push(url);
            });
            $(el).find('li .menu-element a').each((idx, el) => {
                name = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                names.push(name);
            });
            urls.map((url, i) => {
                const name = names[i];
                if (name !== 'VIEW ALL PRODUCTS') {
                    cats.push({ name, url });
                }
            });
        });
        for (const cat of cats) {
            if (result.collections.indexOf(cat.name) === -1) {
                result.collections.push(cat.name);
                result.items[cat.name] = [];
            }
        }
        for (const cat of cats) {
            const link = cat.url;
            const $$ = cheerio.load((await client.get(link)).data);
            $$('.products-grid li').each((idx, el) => {
                let reference = '';
                let thumbnail = '';
                const url = $$(el).find('.border-container a').attr('href');;
                const productName = $$(el).find('.product-name').text();
                const productSubnaame = $$(el).find('.product-subname').text();
                const name = productName + ' ' + productSubnaame;
                const retail = $$(el).find('.price-box .price-container .price').text().trim();
                if ($$(el).find('.product-image-wrapper img').attr('src')) {
                    thumbnail = $$(el).find('.product-image-wrapper img').attr('src')
                    const refs = thumbnail.split('/');
                    for (const ref of refs) {
                        const refVal = ref.split('_');
                        for (const val of refVal) {
                            if (val.length === 11) {
                                reference = val;
                            }
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
            thumbnail,
            spec: [],
            scripts: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = entry.slice(-11);
        const name = $('.page-title-wrapperproduct').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        const description = $('.product.attribute.description').text().trim();
        const movement = $('.tab.tab-label-movement').text().trim();
        if (movement) {
            result.spec.push({
                key: "movement description",
                value: movement
            });
        }

        let gender;
        if (result.url.match(/ladies/)) {
            gender = "F"
        } else {
            gender = "M"
        }
        result.url = entry;
        result.gender = gender;
        result.reference = reference;
        result.name = name;
        result.description = description;
        result.retail = $('.price-box.price-final_price').text().trim();
        $('.additional-attributes-wrapper.table-wrapper ').each((idx, el) => {
            let key = '';
            let value = '';
            const keys = [];
            const values = [];
            $(el).find('.feature-title').each((idx, el) => {
                key = $(el).text();
                keys.push(key);
            });
            $(el).find('.feature-value').each((idx, el) => {
                value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                values.push(value);
            });
            keys.map((key, i) => {
                const value = values[i];
                result.spec.push({ key, value });
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
        result.caliber.brand = 'Chopard';
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
            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (key === 'material:') {
                pp = true;
                result.case.material = value;
                result.case.materials.push(value);
            }
            if (key === 'front glass:') {
                pp = true;
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            if (key === 'case dimension(s):') {
                pp = true;
                result.case.width = value;
            }
            if (key === 'dial:') {
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
                if (value.match(/steel/i)) {
                    result.case.material = 'stainless steel';
                    result.case.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.case.material = 'rose gold';
                    result.case.materials.push('rose gold');
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
                if (value.match(/rhodium/i)) {
                    result.dial.handStyle = 'Rhodium Plated';
                }
                if (value.match(/super-luminova/i)) {
                    result.dial.finish = 'Super Luminova';
                }
                if (value.match(/roman/i)) {
                    result.dial.indexType = 'Roman';
                }
                if (value.match(/arabic/i)) {
                    result.dial.indexType = 'Arabic';
                }
            }
            if (key === 'strap:') {
                pp = true;
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
                if (value.match(/strap/i)) {
                    result.band.type = 'Strap';
                }
                if (value.match(/bracelet/i)) {
                    result.band.type = 'Bracelet';
                }
                if (value.match(/clasp/i)) {
                    result.band.type = 'Folding Clasp';
                }
            }
            if (key === 'type of winding:') {
                pp = true;
                if (value.toLowerCase().indexOf('self-winding' || 'selfwinding' || 'self winding') > -1) {
                    result.caliber.type = 'automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'quartz';
                }
            }
            if (key === 'jewels:') {
                pp = true;
                result.caliber.jewels = value;
            }
            if (key === 'water-resistance:') {
                pp = true;
                result.waterResistance = value;
                result.case.waterResistance = value;
            }
            if (key === 'buckle type:') {
                pp = true;
                result.band.buckle = value;
                if (value.match(/clasp/i)) {
                    result.band.type = 'Folding Clasp';
                }
                if (value.match(/bracelet/i)) {
                    result.band.type = 'Bracelet';
                }
            }
            if (key === 'indication(s):') {
                pp = true;
                result.dial.indexType = value;
            }
            if (key === 'case thickness:') {
                pp = true;
                result.case.thickness = value;
            }
            if (key === 'movement dimensions:') {
                pp = true;
                result.case.width = value;
            }
            if (key === 'case-back:') {
                pp = true;
                result.case.back = value;
            }
            if (key === 'movement:') {
                pp = true;
                result.caliber.reference = value;
            }
            if (key === 'frequency:') {
                pp = true;
                result.caliber.frequency = value;
            }
            if (key === 'buckle material:') {
                if (!result.band.material) {
                    pp = true;
                    result.band.material = value;
                    result.band.materials.push(value);
                }
            }
            if (key === 'power reserve:') {
                pp = true;
                result.caliber.reserve = value.replace('Power Reserve of approximately', '').trim();
            }
            if (key === 'movement description') {
                const values = value.split('.');
                for (const val of values) {
                    if (val.match(/reserve/i)) {
                        const x = val.split(',')
                        for (const a of x) {
                            if (a.match(/reserve/i)) {
                                result.caliber.reserve = a.trim();
                            }
                        }
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
