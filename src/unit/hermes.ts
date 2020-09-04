import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [
            {
                name: 'Men',
                url: 'https://www.hermes.com/us/en/watches/men/#fh_view_size=72&country=us&fh_location=--%2Fcategories%3C%7Bwatchesmen%7D&fh_start_index=36|relevance|'
            },
            {
                name: 'Women',
                url: 'https://www.hermes.com/us/en/watches/women/#fh_view_size=36&country=us&fh_location=--%2Fcategories%3C%7Bwatcheswomen%7D&fh_start_index=324|relevance|'
            }
        ];

        for (const cat of cats) {
            result.collections.push(cat.name);
            result.items[cat.name] = [];
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('.product-grid-list-item').each((idx, el) => {
                    const url = base + $$(el).find('.product-item a').attr('href');
                    const name = $$(el).find('.product-item-meta').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const retail = $$(el).find('.product-item-price.ng-star-inserted').text().replace(',', '').trim();
                    const reference = $$(el).find('.product-item-meta').attr('id').split('-').pop();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
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
        const { client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [
            {
                name: 'Men',
                url: 'https://www.hermes.com/us/en/watches/men/#fh_view_size=72&country=us&fh_location=--%2Fcategories%3C%7Bwatchesmen%7D&fh_start_index=36|relevance|'
            },
            {
                name: 'Women',
                url: 'https://www.hermes.com/us/en/watches/women/#fh_view_size=36&country=us&fh_location=--%2Fcategories%3C%7Bwatcheswomen%7D&fh_start_index=324|relevance|'
            }
        ];

        for (const cat of cats) {
            result.collections.push(cat.name);
            result.items[cat.name] = [];
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.product-grid-list-item').each((idx, el) => {
                const url = base + $$(el).find('.product-item a').attr('href');
                const name = $$(el).find('.product-item-meta').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const retail = $$(el).find('.product-item-price.ng-star-inserted').text().replace(',', '').trim();
                const reference = $$(el).find('.product-item-meta').attr('id').split('-').pop();
                result.items[cat.name].push({
                    source: 'official',
                    url,
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
        const { client, entry, lang, brand, brandID, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            retail,
            scripts: [],
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.thumbnail = 'https:' + $('.main-product-image ').attr('src');
        result.name = $('.product-title-container p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.product-sku').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace("Product reference:", "").trim();
        result.description = $('.field-item p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('See More', '').replace('See less', '').replace('…', '').trim();

        $('.toggle-content.ng-trigger.ng-trigger-toggleContent p').text().split(/<br\s*\/?>/i)[0]
            .split('\n').map((spec, idx) =>
                result.spec.push({ key: idx++, value: spec }));
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
        result.caliber.brand = 'Hermes';
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
            const value = s.value;
            if (value.match(/oval/i)) {
                pp = true;
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (value.match(/case/i)) {
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
                if (value.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
            }
            if (value.match(/mineral/i)) {
                pp = true;
                result.case.crystal = 'Mineral Crystal'
            }
            if (value.match(/sapphire/i)) {
                pp = true;
                result.case.crystal = 'Sapphire'
            }
            if (value.match(/domed/i)) {
                pp = true;
                result.case.crystal = 'Domed Sapphire';
            }
            if (value.match(/dial/i)) {
                pp = true;
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
            if (value.match(/movement/i)) {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
            }
            if (value.match(/water/i)) {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (value.match(/strap/i)) {
                pp = true;
                result.band.type = 'Strap';
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
            }
            if (value.match(/bracelet/i)) {
                pp = true;
                result.band.type = 'Bracelet';
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
            }
            const data = [];
            if (!pp) {
                const key = s.key;
                const value = s.value.trim();
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
