import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.zth-menu .main-nav ul li:nth-child(1) .submenu li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).text().trim();
            const url = href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load(cat.url);
            $$('.block-variantes .swiper-wrapper .block-watch').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                const thumbnailImg = $$(el).find('img').attr('src');
                const name = $$(el).find('.watch-name').text().trim();
                const reference = $$(el).find('.watch-ref').text().trim();
                result.items[cat.name].push({
                    source: 'official',
                    url: href,
                    thumbnail: thumbnailImg,
                    name,
                    reference,
                    lang
                })
            })
            observer.next({ ...context, result });
            observer.complete();
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.zth-menu .main-nav ul li:nth-child(1) .submenu li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).text().trim();
            const url = href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.block-variantes .swiper-wrapper .block-watch').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                const thumbnailImg = $$(el).find('img').attr('src');
                const name = $$(el).find('.watch-name').text().trim();
                const reference = $$(el).find('.watch-ref').text().trim();
                result.items[cat.name].push({
                    source: 'official',
                    url: href,
                    thumbnail: thumbnailImg,
                    name,
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
            thumbnail,
            scripts: [],
            spec: [],
            related: [],
            feature: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.reference = $('.section-product_resume .sku ').text().trim();
        result.description = $('.section-product_resume > p').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.name = $('.section-product_resume h1').text().trim();
        result.collection = $(' .section-more-collection_header .title-icon h3').text().trim();
        result.gender = 'M';
        $('.specification ').each((idx, el) => {
            if (idx === 4) {
                const value = $(el).text().split('\n').map(x => x.trim());
                const filtered = value.filter(function (el) {
                    return el != null && el != "";
                });
                result.feature = filtered;
            }
        });
        $('.section-numbers_content .swiper-container  .swiper ul li ').each((idx, el) => {
            const key = $(el).find('h5').text();
            const value = $(el).find('div .number').text() + $(el).find('div .bottom').text().trim();
            result.spec.push({ key, value });
        });
        $('.section-product_specifications div:nth-child(3) .specification ').each((idx, el) => {
            const key = $(el).find('.title').html();
            const value = $(el).html().replace(key, "").replace("<span class=\"title\"></span>", "").replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace("&#xA0;", " ").trim();
            result.spec.push({ key, value });
        });
        $('.section-product_specifications div:nth-child(4) .specification').each((idx, el) => {
            const key = $(el).find('.title').html();
            const value = $(el).html().replace(key, "").replace("<span class=\"title\"></span>", "").replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
        result.caliber.brand = "";
        result.caliber.label = "";
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
                    if (key === 'durchmesser') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'frequenz') {
                        pp = true;
                        result.caliber.frequency = value.trim();
                    }
                    if (key === 'wasserdichtigkeit') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'gangreserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'material') {
                        pp = true;
                        result.case.material = value.trim();
                        result.case.materials.push(value.trim());
                    }
                    if (key === 'zifferblatt') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'schlie&#xdf;e ') {
                        pp = true;
                        result.band.buckle = value.trim();
                    }
                    if (key === 'armband') {
                        pp = true;
                        result.band.type = value.trim();
                    }
                    result.caliber.brand = 'Zenith';
                    result.caliber.label = 'Swiss';
                    if (!pp) {
                        result.additional.push(`${s.key}: ${s.value}`)
                    }
                }
                break;
            default:
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === 'diameter') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'frequency') {
                        pp = true;
                        result.caliber.frequency = value.trim();
                    }
                    if (key === 'water-resistance') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'material') {
                        pp = true;
                        result.case.material = value.trim();
                        result.case.materials.push(value.trim());
                    }
                    if (key === 'dial') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'clasp') {
                        pp = true;
                        result.band.buckle = value.trim();
                    }
                    if (key === 'strap') {
                        pp = true;
                        result.band.type = value.trim();
                    }
                    result.caliber.brand = 'Zenith';
                    result.caliber.label = 'Swiss';
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
