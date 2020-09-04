import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const menUrl = entry + 'mens-watches.html';
        const womenUrl = entry + '/women-s-watches.html';
        const cats = [];
        const $ = cheerio.load((client.get(menUrl)).data);
        let gender = '';
        $('.slick-track a').each((idx, el) => {
            const name = $(el).find('.c-category-banner__caption').text().trim();
            const url = base + $(el).attr('href');
            gender = 'M';
            if (name) {
                cats.push({ name, url, gender });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        const $$ = cheerio.load((client.get(womenUrl)).data);
        $$('.slick-track a').each((idx, el) => {
            const name = $(el).find('.c-category-banner__caption').text().trim();
            const url = base + $(el).attr('href');
            gender = 'F';
            if (name) {
                cats.push({ name, url, gender });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.then(res => {
                const results = [];
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.col-sm-3.col-xs-6.grid-item-parent').each((idx, el) => {
                    const url = base + $$(el).find('a').attr('href');
                    const name = $$(el).find('a').attr('data-ga-product-name');
                    const thumbnail = $$(el).find('.image-block img').attr('data-original');
                    const reference = $$(el).find('a').attr('data-ga-product-ref');
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        reference,
                        gender: cat.gender
                    })
                })
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
        const { base, brand, brandID, lang, entry, client } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const menUrl = entry + 'mens-watches.html';
        const womenUrl = entry + '/women-s-watches.html';
        const cats = [];
        const $ = cheerio.load((await client.get(menUrl)).data);
        let gender = '';
        $('.slick-track a').each((idx, el) => {
            const name = $(el).find('.c-category-banner__caption').text().trim();
            const url = base + $(el).attr('href');
            gender = 'M';
            if (name) {
                cats.push({ name, url, gender });
                if (result.collections.indexOf(name) === -1) {
                    result.collections.push(name);
                    result.items[name] = [];
                }

            }
        });
        const $$ = cheerio.load((await client.get(womenUrl)).data);
        $$('.slick-track a').each((idx, el) => {
            const name = $(el).find('.c-category-banner__caption').text().trim();
            const url = base + $(el).attr('href');
            gender = 'F';
            if (name) {
                cats.push({ name, url, gender });
                if (result.collections.indexOf(name) === -1) {
                    result.collections.push(name);
                    result.items[name] = [];
                }
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.col-sm-3.col-xs-6.grid-item-parent').each((idx, el) => {
                const url = base + $$(el).find('a').attr('href');
                const name = $$(el).find('a').attr('data-ga-product-name');
                const thumbnail = $$(el).find('.image-block img').attr('data-original');
                const reference = $$(el).find('a').attr('data-ga-product-ref');
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
                    lang,
                    name,
                    reference,
                    gender: cat.gender
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
        const { client, entry, lang, brand, brandID, base, gender } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            gender,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.description = $('div.tabbed-content__content-column > p.paragraph').text().trim();
        result.thumbnail = $('.c-image-adaptive').attr('data-original-url');
        let collect = '';
        if (entry.indexOf('mens-watches') > -1) {
            collect = entry.split("/mens-watches/")[1].split('/')[0];
            result.gender = 'M';
        }
        else {
            collect = entry.split("/women-s-watches/")[1].split('/')[0];
            result.gender = 'F';
        }
        if (collect) {
            result.collection = collect;
        }
        result.name = $('.top-heading').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.small-text.js-pdp__cta-section--product-ref-id').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim().split(":")[1];
        $('.tabbed-content__content-column').each((idx, el) => {
            const key = $(el).find('h3').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            if (key) {
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
        result.caliber.brand = 'Cartier';
        result.caliber.label = 'France';
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
            if (key.indexOf('product description') > -1) {
                pp = true;
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
                if (value.match(/white gold/i)) {
                    result.case.material = 'white gold';
                    result.case.materials.push('white gold');
                }
                if (value.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
                if (description.match(/gloss/i)) {
                    result.dial.finish = 'gloss';
                }
                if (description.match(/matte/i)) {
                    result.dial.finish = 'matte';
                }
                if (description.match(/sunburst/i)) {
                    result.dial.finish = 'sunburst';
                }
                if (description.match(/luminescent/i)) {
                    result.dial.finish = 'luminescent';
                }
                if (description.match(/Superluminova/i)) {
                    result.dial.finish = 'Superluminova';
                }
                if (description.match(/brushed/i)) {
                    result.dial.finish = 'brushed';
                }
                if (description.match(/satin/i)) {
                    result.dial.finish = 'satin';
                }
                if (description.match(/guilloche/i)) {
                    result.dial.finish = 'guilloche';
                }
                if (value.match(/roman/i)) {
                    result.dial.indexType = 'Roman';
                }
                if (value.match(/arabic/i)) {
                    result.dial.indexType = 'Arabic';
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
                if (value.match(/clasp/i)) {
                    result.band.buckle = 'Folding clasp';
                }
                if (value.match(/fold/i)) {
                    result.band.buckle = 'Fold';
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
                if (value.match(/Screw-Back/i)) {
                    result.case.back = 'Screw Back';
                }
                if (value.match(/screw-locked/i)) {
                    result.case.back = 'Screw Locked';
                }
                if (value.match(/Screw/i)) {
                    result.case.back = 'Screw';
                }
                if (value.match(/Transparent/i)) {
                    result.case.back = 'Transparent';
                }
                if (value.match(/See-through/i)) {
                    result.case.back = 'See Through';
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
                if (value.match(/Water-resistant to/i)) {
                    result.waterResistance = value.split('Water-resistant to')[1].trim() ? value.split('Water-resistant to')[1].trim() : '';
                    result.case.waterResistance = value.split('Water-resistant to')[1].trim() ? value.split('Water-resistant to')[1].trim() : '';
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
