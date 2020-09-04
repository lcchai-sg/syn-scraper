import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        const watches = [];
        $('.modelBox a').each((idx, el) => {
            const name = $(el).find('.description .model-name ').text();
            const url = $(el).attr('href');
            result.collections.push(name);
            result.items[name] = [];
            watches.push({ url, name });
        });
        for (const watch of watches) {
            const link = base + watch.url;
            client.get(link).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('div#versions-result-container .soldier').each((idx, el) => {
                    const url = base + $$(el).find('a').attr('href');
                    const thumbnail = base + $$(el).find('img').attr('src');
                    const name = $$(el).find('img').attr('alt');
                    const reference = name.trim().slice(-13);
                    result.items[watch.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: watch.name,
                        lang,
                        name,
                        reference
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
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        const watches = [];

        $('.modelBox a').each((idx, el) => {
            const name = $(el).find('.description .model-name ').text();
            const url = $(el).attr('href');
            result.collections.push(name);
            result.items[name] = [];
            watches.push({ url, name });
        });
        for (const watch of watches) {
            const link = base + watch.url;
            const $$ = cheerio.load((await client.get(link)).data);
            $$('div#versions-result-container .soldier').each((idx, el) => {
                const url = base + $$(el).find('a').attr('href');
                const thumbnail = base + $$(el).find('img').attr('src');
                const name = $$(el).find('img').attr('alt');
                const reference = name.trim().slice(-13);
                result.items[watch.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: watch.name,
                    lang,
                    name,
                    reference
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
        const { client, entry, lang, brand, brandID } = context;
        const base = 'https://www.breitling.com';
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
        const reference = $('.pr-reference').text().trim();

        result.retail = $('.pr-price').text().trim().replace(' Excl. Sales Tax', '');
        result.name = $('.pr-informations h1').text().trim();
        result.collection = entry.split('/watches/')[1].split('/')[0];
        result.thumbnail = base + $('.version-slider-cell').find('img').attr('src')
        result.reference = reference;
        result.gender = 'M';
        result.description = $('section > .brContent > div > div > p#version-description').text().trim();

        $('.dtech tr').each((idx, el) => {
            const key = $(el).find('th').text();
            let value = '';
            $(el).find('td').each((idx, el) => {
                value += $(el).text().trim();
            });
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
        result.caliber.brand = 'Breitling';
        result.caliber.label = 'USA';
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

        const descriptions = description.split('.');
        for (const desc of descriptions) {
            let pp = false;
            if (desc.match(/luminescent/i)) {
                pp = true;
                result.dial.finish = 'Luminescent';
            }
            if (desc.match(/tungsten carbide/i)) {
                result.bezel = 'Tungsten Carbide';
            }
            if (desc.match(/bracelet/i)) {
                pp = true;
                result.band.type = 'Bracelet';
                result.band.material = 'Steel';
                if (desc.match(/various types/i)) {
                    result.band.color = 'Multicolored'
                }
                if (desc.match(/grey/i)) {
                    result.band.color = 'Grey';
                }
                if (desc.match(/red/i)) {
                    result.band.color = 'Red';
                }
                if (desc.match(/blue/i)) {
                    result.band.color = 'Blue';
                }
                if (desc.match(/black/i)) {
                    result.band.color = 'Black';
                }
                if (desc.match(/green/i)) {
                    result.band.color = 'Green';
                }
                if (desc.match(/gold/i)) {
                    result.band.color = 'Gold';
                }
                if (desc.match(/white/i)) {
                    result.band.color = 'White';
                }
                if (desc.match(/silver/i)) {
                    result.band.color = 'Silver';
                }
                if (desc.match(/brown/i)) {
                    result.band.color = 'Brown';
                }
                if (desc.match(/rose gold/i)) {
                    result.band.color = 'Rose Gold';
                }
            }
            if (desc.match(/chronometer/i)) {
                pp = true;
                result.dial.indexType = 'Chronometer';
            }
            if (!pp) {
                result.additional.push(desc.trim())
            }
        }
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;

            if (key === 'water resistance') {
                pp = true;
                const target = value.trim();
                result.case.waterResistance = target;
                result.waterResistance = target;
            }
            if (key === 'diameter') {
                pp = true;
                const target = value.trim();
                result.case.width = target;
            }
            if (key === 'thickness') {
                pp = true;
                const target = value.trim();
                result.case.thickness = target;
            }
            if (key === 'case') {
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
            }
            if (value.match(/round/i)) {
                pp = true;
                result.case.shape = 'Round';
            }
            if (value.match(/oval/i)) {
                pp = true;
                result.case.shape = 'Oval';
            }
            if (value.match(/square/i)) {
                pp = true;
                result.case.shape = 'Square';
            }
            if (value.match(/Titanium/i)) {
                pp = true;
                result.case.material = 'Titanium';
                result.case.materials.push('Titanium');
            }
            if (value.match(/Rhodium/i)) {
                pp = true;
                result.dial.handStyle = 'Rhodium';
            }
            if (value.match(/chronograph/i)) {
                pp = true;
                result.dial.indexType = 'Chronograph';
            }
            if (key === 'crystal') {
                pp = true;
                const target = value.split(',') ? value.split(',')[0].trim() : value.trim();
                result.case.crystal = target;
            }
            if (key === 'caseback') {
                pp = true;
                const target = value.trim();
                result.case.back = target;
            }
            if (key === 'caliber') {
                pp = true;
                const target = value.trim();
                result.caliber.reference = target;
            }
            if (key === 'jewel') {
                pp = true;
                const target = value.trim().replace('jewels', '');
                result.caliber.jewel = target;
            }
            if (key === 'movement') {
                if (value.toLowerCase().indexOf('selfwinding' || 'self-winding' || 'self winding') > -1) {
                    pp = true;
                    result.caliber.type = 'automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    pp = true;
                    result.caliber.type = 'hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    pp = true;
                    result.caliber.type = 'quartz';
                }
            }
            if (key === 'power reserve') {
                pp = true;
                const target = value.replace('approx.', '').trim();
                result.caliber.reserve = target;
            }
            if (key === 'weight (without strap)') {
                pp = true;
                const target = value.trim();
                result.weight = target;
            }
            if (key === 'lug') {
                pp = true;
                const target = value.trim();
                result.band.width = target;
            }
            if (key === 'bezel') {
                pp = true;
                const target = value.trim();
                result.bezel = target;
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
