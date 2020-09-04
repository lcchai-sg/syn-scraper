import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        $('.vintage_sec.comm_sel h1').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.collections.push(name);
            result.items[name] = [];
        });
        $('.gall_sec_rht li').each((idx, el) => {
            const url = $(el).find('a').attr('href');
            const thumbnail = $(el).find('a img').attr('src');
            const retail = $(el).find('.price-category').text();
            const name = $(el).find('a img').attr('alt');
            let collection = '';
            if (url.match(/vintage/i)) {
                collection = 'Vintage';
            }
            if (url.match(/instruments/i)) {
                collection = 'Instruments';
            }
            if (url.match(/experimental/i)) {
                collection = 'Experimental';
            }
            if (name) {
                client.then(res => {
                    const results = [];
                    result.items[collection].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection,
                        lang,
                        name,
                        retail
                    });
                    observer.next({ ...context, results });
                    observer.complete();
                });
            }
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
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        $('.vintage_sec.comm_sel h1').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.collections.push(name);
            result.items[name] = [];
        });
        $('.gall_sec_rht li').each((idx, el) => {
            const url = $(el).find('a').attr('href');
            const thumbnail = $(el).find('a img').attr('src');
            const retail = $(el).find('.price-category').text();
            const name = $(el).find('a img').attr('alt');
            let collection = '';
            if (url.match(/vintage/i)) {
                collection = 'Vintage';
            }
            if (url.match(/instruments/i)) {
                collection = 'Instruments';
            }
            if (url.match(/experimental/i)) {
                collection = 'Experimental';
            }
            if (name) {
                result.items[collection].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection,
                    lang,
                    name,
                    retail
                });
            }
        });
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
        const { client, entry, lang, brand, brandID, base } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.product-title').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.price_ttl').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = $('#main_img_thum').attr('src');
        if (entry.match(/vintage/i)) {
            result.collection = 'Vintage';
        }
        if (entry.match(/instruments/i)) {
            result.collection = 'Instruments';
        }
        if (entry.match(/experimental/i)) {
            result.collection = 'Experimental';
        }
        $('.tech_spec_cont p').each((idx, el) => {
            const key = $(el).text().split(':')[0];
            const value = $(el).text().split(':')[1] ? $(el).text().split(':')[1].trim() : '';
            if (key && value) {
                result.spec.push({ key, value });
            }
        });
        $('.product_desc_dtls_mid p').each((idx, el) => {
            result.reference = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Ref:', '').trim();
        });
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
        const { brand, brandID, reference, lang, source, collection, gender, related, url, spec, description, retail, ...other } = payload;
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
        result.caliber.brand = 'Bellross';
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
            if (key === 'movement') {
                pp = true;
                const words = value.split('.') ? value.split('.') : value;
                for (const word of words) {
                    if (word.match(/calibre/i)) {
                        result.caliber.reference = word.replace('calibre', '').trim();
                    }
                    if (word.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                        pp = true;
                        result.caliber.type = 'Automatic'
                    }
                    if (word.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                        pp = true;
                        result.caliber.type = 'Hand wind'
                    }
                    if (word.toLowerCase().indexOf('quartz') > -1) {
                        pp = true;
                        result.caliber.type = 'Quartz'
                    }
                }
            }
            if (key === 'functions') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            if (key === 'case') {
                pp = true;
                const words = value.split('.') ? value.split('.') : value;
                for (const word of words) {
                    if (word.match(/diameter/i)) {
                        result.case.width = word.replace('in diameter', '').trim();
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
                    if (value.match(/gloss/i)) {
                        result.dial.finish = 'gloss';
                    }
                    if (value.match(/matte/i)) {
                        result.dial.finish = 'matte';
                    }
                    if (value.match(/sunburst/i)) {
                        result.dial.finish = 'sunburst';
                    }
                    if (value.match(/luminescent/i)) {
                        result.dial.finish = 'luminescent';
                    }
                    if (value.match(/Superluminova/i)) {
                        result.dial.finish = 'Superluminova';
                    }
                    if (value.match(/brushed/i)) {
                        result.dial.finish = 'brushed';
                    }
                    if (value.match(/satin/i)) {
                        result.dial.finish = 'satin';
                    }
                    if (value.match(/guilloche/i)) {
                        result.dial.finish = 'guilloche';
                    }
                    if (value.match(/roman/i)) {
                        result.dial.indexType = 'Roman';
                    }
                    if (value.match(/arabic/i)) {
                        result.dial.indexType = 'Arabic';
                    }
                }
            }
            if (key === 'dial') {
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
            }
            if (key === 'crystal') {
                pp = true;
                if (value.match(/mineral/i)) {
                    result.case.crystal = 'Mineral Crystal'
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire'
                }
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
            }
            if (key === 'water-resistance') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'strap') {
                pp = true;
                // band material
                if (value.match(/alligator/i)) {
                    result.band.material = 'Alligator Leather';
                    result.band.materials.push('Alligator Leather');
                }
                if (value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
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
            }
            if (key === 'buckle') {
                if (value.match(/clasp/i)) {
                    result.band.buckle = 'Folding clasp';
                }
                if (value.match(/fold/i)) {
                    result.band.buckle = 'Folding';
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
