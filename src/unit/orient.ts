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
        $('.orient-navbar-main  li:nth-child(2) .collection-grid  .grid__item .collection-grid-item').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('.collection-grid-item__title h3').text().trim();
            const url = base + href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.grid__item  .has-other-price.orient-product-item.grid-view-item').each((idx, el) => {
                    const href = $$(el).find('.grid-view-item__link').attr('href');
                    const thumbnailImg = $$(el).find('.grid-view-item__image-container img').attr('src');
                    const name = $$(el).find('.orient-product-item-text .orient-product-item-title').text().trim();
                    const retail = $$(el).find('.product-price__other-price').text();

                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href,
                        thumbnail: "https:" + thumbnailImg,
                        name,
                        retail,
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.orient-navbar-main  li:nth-child(2) .collection-grid  .grid__item .collection-grid-item').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('.collection-grid-item__title h3').text().trim();
            const url = base + href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.grid__item  .has-other-price.orient-product-item.grid-view-item').each((idx, el) => {
                const href = $$(el).find('.grid-view-item__link').attr('href');
                const thumbnailImg = $$(el).find('.grid-view-item__image-container img').attr('src');
                const name = $$(el).find('.orient-product-item-text .orient-product-item-title').text().trim();
                const retail = $$(el).find('.product-price__other-price').text();

                result.items[cat.name].push({
                    source: 'official',
                    url: base + href,
                    thumbnail: "https:" + thumbnailImg,
                    name,
                    retail,
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
        const { client, entry, lang, brand, brandID, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            retail,
            spec: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('title').text().trim();
        const collection = $(' .list-inline li:nth-child(3)  span a').text().trim();
        const description = $('.product-single__description__inner--additional p').text().trim();
        $('.product-single__title').each((idx, el) => {
            if (idx === 0) {
                result.name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });

        result.reference = reference.split("|")[1].trim().substring(0, 10);
        result.collection = collection;
        result.description = description;
        result.gender = 'M';
        result.thumbnail = 'https:' + $('.product-single__photo img').attr('src');

        $('.product-single__description__table').each((idx, el) => {
            let key = '';
            let value = '';
            const keys = [];
            const values = [];
            $(el).find('div:nth-child(1)').each((idx, el) => {
                key = $(el).text().trim();
                keys.push(key);
            });
            $(el).find('div:nth-child(2)').each((idx, el) => {
                value = $(el).text().trim();
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
        result.caliber.brand = 'Orient';
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
        if (description.match(/Roman/i)) {
            result.dial.indexType = 'Roman';
        }
        if (description.match(/Arab/i)) {
            result.dial.indexType = 'Arabic';
        }
        if (description.match(/Chrono/i)) {
            result.dial.indexType = 'Chronograph';
        }
        if (description.match(/rhodium/i)) {
            result.dial.handStyle = 'Rhodium';
        }
        if (description.match(/Luminous/i)) {
            result.dial.handStyle = 'Luminous';
        }
        if (description.match(/baton/i)) {
            result.dial.handStyle = 'Baton';
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
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            // water resistance
            if (s.value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (s.value.match(/usa/i)) {
                result.caliber.label = 'USA';
            }
            else {
                result.caliber.label = 'Japan';
            }
            if (key === 'water resistance:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'clasp:') {
                pp = true;
                result.band.buckle = value.trim();
                result.band.type = 'Folding Clasp';
            }
            // case
            if (key === 'case material:') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'case diameter:') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case thickness:') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'crystal:') {
                pp = true;
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            // bezel
            if (key === 'bezel material:') {
                pp = true;
                result.bezel.material = value.trim();
                result.bezel.materials.push(value.trim());
            }
            // dial
            if (key === 'dial color:') {
                pp = true;
                result.dial.color = value.trim();
            }
            // caliber
            if (key === 'movement:') {
                pp = true;
                if (value.toLowerCase().indexOf('self-winding' || 'self winding' || 'selfwinding') > -1) {
                    pp = true;
                    result.caliber.type = 'automatic'
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    pp = true;
                    result.caliber.type = 'hand wind'
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    pp = true;
                    result.caliber.type = 'quartz'
                }
                const firstvariable = "Cal.";
                const secondvariable = " ";
                const ref = s.value.match(new RegExp(firstvariable + "(.*)" + secondvariable));
                if (ref) {
                    const reference = ref[1].trim().split(' ')[0] ? ref[1].trim().split(' ')[0] : '';
                    result.caliber.reference = reference;
                }
            }
            if (key === 'power reserve:') {
                pp = true;
                result.caliber.reserve = value.replace('Approximately', '').trim();
            }
            //band
            if (key === 'band material:') {
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
            if (key === 'lug width:') {
                pp = true;
                result.band.length = value.trim();
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
