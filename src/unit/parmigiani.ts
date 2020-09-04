import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const urls = [{
            key: 'collections',
            url: entry + 'collections'
        },
        {
            key: 'hc',
            url: entry + 'high-complications'
        }]
        const cats = [];
        for (const url of urls) {
            const $ = cheerio.load((client.get(url.url)).data);
            if (url.key === 'hc') {
                $('.item.item-family .heading-item a').each((idx, el) => {
                    const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' HC';
                    const url = base + $(el).attr('href');
                    cats.push({ name, url });
                    result.collections.push(name);
                    result.items[name] = [];
                });
            }
            else {
                $('.item.item-family .heading-item a').each((idx, el) => {
                    const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const url = base + $(el).attr('href');
                    cats.push({ name, url });
                    result.collections.push(name);
                    result.items[name] = [];
                });
            }
        }
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.col-6.col-md-3.watch-slot .item.item-collection').each((idx, el) => {
                    const thumbnail = $$(el).find('.item-image a img').attr('src');
                    const words = thumbnail.split('/');
                    let url = '';
                    let reference = '';
                    switch (lang) {
                        case 'de':
                            url = base + $$(el).find('.item-image a').attr('href').replace('en', 'de');
                            break;
                        default:
                            url = base + $$(el).find('.item-image a').attr('href');
                            break;
                    }
                    for (const word of words) {
                        if (word.match(/png/i)) {
                            reference = word.replace('.png', '').trim().toUpperCase();
                        }
                    }
                    const name = $$(el).find('.item-image a img').attr('alt') + ' ' + reference;
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        reference,
                        name,
                        lang
                    });
                });
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
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const urls = [{
            key: 'collections',
            url: entry + 'collections'
        },
        {
            key: 'hc',
            url: entry + 'high-complications'
        }]
        const cats = [];
        for (const url of urls) {
            const $ = cheerio.load((await client.get(url.url)).data);
            if (url.key === 'hc') {
                $('.item.item-family .heading-item a').each((idx, el) => {
                    const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' HC';
                    const url = base + $(el).attr('href');
                    cats.push({ name, url });
                    result.collections.push(name);
                    result.items[name] = [];
                });
            }
            else {
                $('.item.item-family .heading-item a').each((idx, el) => {
                    const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const url = base + $(el).attr('href');
                    cats.push({ name, url });
                    result.collections.push(name);
                    result.items[name] = [];
                });
            }
        }
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.col-6.col-md-3.watch-slot .item.item-collection').each((idx, el) => {
                const thumbnail = $$(el).find('.item-image a img').attr('src');
                const words = thumbnail.split('/');
                let url = '';
                let reference = '';
                switch (lang) {
                    case 'de':
                        url = base + $$(el).find('.item-image a').attr('href').replace('en', 'de');
                        break;
                    default:
                        url = base + $$(el).find('.item-image a').attr('href');
                        break;
                }
                for (const word of words) {
                    if (word.match(/png/i)) {
                        reference = word.replace('.png', '').trim().toUpperCase();
                    }
                }
                const name = $$(el).find('.item-image a img').attr('alt') + ' ' + reference;
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
                    reference,
                    name,
                    lang
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
            scripts: [],
            spec: [],
            related: [],
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.collection = $('.col-md-3 h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(' ')[0].trim();
        result.reference = entry.split('/').pop().toUpperCase();
        result.name = $('.text-primary.watch-detail-h1-span').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + result.reference;
        result.retail = $('.detail-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Info', '').trim();
        result.description = $('.col-12.col-md-8.lead.mb-3.mb-md-5.text-justify ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.gender = 'M';
        let key = '';
        let value = '';
        const keys = [];
        const values = [];
        let materialCount = 1;
        let colorCount = 1;
        $('.col-md-4 .row dt').each((idx, el) => {
            key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            if (key === 'Material') {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + materialCount;
                materialCount++;
            }
            if (key === 'Colour' || key === 'Farbe') {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + colorCount;
                colorCount++;
            }
            keys.push(key);
        });
        $('.col-md-4 .row dd').each((idx, el) => {
            value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            values.push(value);
        });
        keys.map((key, i) => {
            const value = values[i];
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
        result.caliber.brand = 'Parmigiani Fleurier';
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
        switch (lang) {
            case 'de':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === 'kaliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'aufzug') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === 'gesamtabmessungen') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'höhe') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === 'frequenz') {
                        pp = true;
                        result.caliber.frequency = value.trim();
                    }
                    if (key === 'gangreserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'anzahl bestandteile') {
                        pp = true;
                        result.caliber.components = value.trim();
                    }
                    if (key === 'anzahl rubine') {
                        pp = true;
                        result.caliber.jewels = value.trim();
                    }
                    if (key === 'farbe 1') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'ausführung') {
                        pp = true;
                        result.dial.finish = value.trim();
                    }
                    if (key === 'zeiger') {
                        pp = true;
                        result.dial.handStyle = value.trim();
                    }
                    if (key === 'material 1') {
                        pp = true;
                        result.case.material = value.trim();
                        result.case.materials.push(value.trim());
                    }
                    if (key === 'wasserdichtheit') {
                        pp = true;
                        result.waterResistance = value.trim();
                    }
                    if (key === 'boden') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === 'gläser') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === 'material 2') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    if (key === 'farbe 2') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === 'typ') {
                        pp = true;
                        result.band.type = value.trim();
                    }
                    result.caliber.brand = 'Parmigiani Fleurier';
                    result.caliber.label = 'Swiss';
                    if (!pp) {
                        result.additional.push(`${s.key} ${s.value}`)
                    }
                }
                break;
            default:
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === 'calibre') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'winding') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === 'dimensions') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'thickness') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === 'frequency') {
                        pp = true;
                        result.caliber.frequency = value.trim();
                    }
                    if (key === 'power-reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'nb of components') {
                        pp = true;
                        result.caliber.components = value.trim();
                    }
                    if (key === 'nb of jewels') {
                        pp = true;
                        result.caliber.jewels = value.trim();
                    }
                    if (key === 'colour 1') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'finishing') {
                        pp = true;
                        result.dial.finish = value.trim();
                    }
                    if (key === 'hands') {
                        pp = true;
                        result.dial.handStyle = value.trim();
                    }
                    if (key === 'material 1') {
                        pp = true;
                        result.case.material = value.trim();
                        result.case.materials.push(value.trim());
                    }
                    if (key === 'water-resistance') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'back') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === 'glass') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === 'material 2') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    if (key === 'colour 2') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === 'type') {
                        pp = true;
                        result.band.type = value.trim();
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
                break;
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
