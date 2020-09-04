import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const collections = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.block-collections .row a').each((idx, element) => {
            collections.push($(element).attr('href'));
        });
        const urls = [];
        for (const url of collections) {
            client.get(url).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                $('.product-list').each((idx, el) => {
                    const $$ = cheerio.load(el);
                    const href = $$('a').attr('href');
                    const thumbnail = $$($$('a img').get(0)).attr('data-src');
                    const collection = $$('h3 .product-list__collection').text();
                    const n = $$('a').attr('aria-label');
                    if (result.collections.indexOf(collection) === -1) {
                        result.collections.push(collection);
                        result.items[collection] = [];
                    }
                    if (urls.indexOf(href) === -1) {
                        urls.push(href);
                        let url;
                        let qs;
                        let name = n.startsWith(collection) ? n.substr(collection.length + 1).trim() : n;
                        if (href.indexOf('?') > -1) {
                            url = href.substring(0, href.indexOf('?'));
                            qs = href.substr(href.indexOf('?') + 1);
                        } else {
                            url = href;
                        }
                        result.items[collection].push({
                            source: 'official',
                            url,
                            qs,
                            thumbnail,
                            collection,
                            lang,
                            name
                        })
                    }
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
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const temps = [];
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.views-row a').each((idx, element) => {
            if (idx > 1 && idx < 6) {
                const url = base + $(element).attr('href');
                const name = $(element).find('.cl_teaser__title').text();
                temps.push({ name, url })
            }
        });
        for (const temp of temps) {
            const $$ = cheerio.load((await client.get(temp.url)).data);
            $$('.views-row a').each((idx, element) => {
                const url = base + $(element).attr('href');
                const subCollection = $(element).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                if (subCollection) {
                    cats.push({ collection: temp.name, subCollection, url });
                    result.collections.push({ collection: temp.name, subCollection });
                    result.items[temp.name + ' ' + subCollection] = [];
                }
            });
        }
        for (const cat of cats) {
            const $$$ = cheerio.load((await client.get(cat.url)).data);
            $$$('.pl_section__elements.anchor-plp-list-elements li a').each((idx, el) => {
                const url = base + $$$(el).attr('href');
                const thumbnail = base + $$$(el).find('a img').attr('src');
                const name = $$$(el).attr('data-name');
                const retail = 'CHF ' + $$$(el).find('a .ts_watch__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace(/[^0-9]/g, '').trim();
                const reference = $$$(el).attr('data-sku');
                result.items[cat.collection + ' ' + cat.subCollection].push({
                    source: 'official',
                    name,
                    reference,
                    url,
                    thumbnail,
                    collection: cat.collection,
                    subCollection: cat.subCollection,
                    lang,
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
            scripts: [],
            spec: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const collection = $('main header h1 .sup-title-dashed').text().trim();
        const name = $('main header h1').text().trim().substr(collection.length + 1).trim();
        const retail = $('main header .page-header__price > span').text();
        const subCollection = $('.block-related-products h2').text().trim();

        result.collection = collection;
        result.name = name;
        result.retail = retail;
        result.subCollection = subCollection;

        $("#content script").each((idx, ele) => {
            result.scripts.push($(ele.children[0]).text());
        });
        $('.block-technical .block-technical__item').each((idx, ele) => {
            const group = $(ele).find('.panel-heading h3').text();
            const attributes = [];
            $(ele).find('.vertical-list__sub-list .vertical-list__item').each((ix, el) => {
                if (idx === 0 && ix === 0) {
                    result.reference = $(el).find('p').text().trim();
                }
                attributes.push(
                    {
                        key: $(el).find('h4').text(),
                        value: $(el).find('p').text()
                    }
                )
            });
            result.spec.push({
                group,
                attributes
            })
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
        result.caliber.brand = 'Hublot';
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
            for (const x of s['attributes']) {
                const key = x.key.toLowerCase();
                const value = x.value;
                if (key === 'case size') {
                    pp = true;
                    result.case.width = value.trim();
                }
                if (key === 'case') {
                    pp = true;
                    result.case.material = value.trim();
                    result.case.materials.push(value.trim());
                }
                if (key === 'bezel') {
                    pp = true;
                    result.bezel = value.trim();
                }
                if (key === 'crystal') {
                    pp = true;
                    if (value.match(/domed/i)) {
                        result.case.crystal = 'Domed Sapphire';
                    }
                    if (value.match(/sapphire/i)) {
                        result.case.crystal = 'Sapphire';
                    }
                }
                if (key === 'dial') {
                    pp = true;
                    result.dial.color = value.trim();
                }
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
                }
                if (key === 'clasp') {
                    pp = true;
                    if (value.match(/clasp/i)) {
                        result.band.buckle = 'Folding clasp';
                    }
                    if (value.match(/buckle/i)) {
                        result.band.buckle = 'Buckle';
                    }
                    if (value.match(/deployant/i)) {
                        result.band.buckle = 'Deployant';
                    }
                    if (value.match(/pin/i)) {
                        result.band.buckle = 'Pin';
                    }
                }
                if (key === 'movement') {
                    const words = value.split('\n');
                    if (words) {
                        result.caliber.reference = words[0];
                    }
                    if (value.toLowerCase().indexOf('self-winding' || 'self winding' || 'selfwinding') > -1) {
                        pp = true;
                        result.caliber.type = 'automatic'
                    }
                    if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding' || 'Hand-wound') > -1) {
                        pp = true;
                        result.caliber.type = 'hand wind'
                    }
                    if (value.toLowerCase().indexOf('quartz') > -1) {
                        pp = true;
                        result.caliber.type = 'quartz'
                    }
                }
                if (key === 'power reserve') {
                    pp = true;
                    result.caliber.reserve = value.replace('Approx.', '').trim();
                }
                if (key === 'water resistance') {
                    pp = true;
                    result.waterResistance = value.trim();
                    result.case.waterResistance = value.trim();
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
