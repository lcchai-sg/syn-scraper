import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((client.get(entry)).data);
        const cats = [];
        $('.vac-colctrl').each((idx, el) => {
            const url = base + $(el).find('.vac-ctapush__content a').attr('href');
            const name = $(el).find('.vac-ctapush__title').text();
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((client.get(cat.url)).data);
            $$('.cell.small-6.medium-4.large-3').each((idx, el) => {
                const url = base + $$(el).find('.vac-productpush.vac-productpush--vertical a').attr('href');
                const name = $$(el).find('.vac-productpush__title').text().trim() + ' ' + $$(el).find('.vac-productpush__specs').text().trim();
                const thumbnail = base + $$(el).find('.vac-productpush.vac-productpush--vertical a img').attr('data-src');
                const retail = $$(el).find('.vac-productpush__price').text().trim();
                let reference = $$(el).find('.vac-productpush.vac-productpush--vertical a').attr('data-tracking-product').trim();
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
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const $ = cheerio.load((await client.get(entry)).data);
        const cats = [];
        $('.vac-colctrl').each((idx, el) => {
            const url = base + $(el).find('.vac-ctapush__content a').attr('href');
            const name = $(el).find('.vac-ctapush__title').text();
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.cell.small-6.medium-4.large-3').each((idx, el) => {
                const url = base + $$(el).find('.vac-productpush.vac-productpush--vertical a').attr('href');
                const name = $$(el).find('.vac-productpush__title').text().trim() + ' ' + $$(el).find('.vac-productpush__specs').text().trim();
                const thumbnail = base + $$(el).find('.vac-productpush.vac-productpush--vertical a img').attr('data-src');
                const retail = $$(el).find('.vac-productpush__price').text().trim();
                let reference = $$(el).find('.vac-productpush.vac-productpush--vertical a').attr('data-tracking-product').trim();
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
        const { client, entry, lang, brand, brandID, base, thumbnail, retail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            reference: "",
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: [],
            thumbnail,
            retail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const name = $('.product-detail__title').text().trim() + ' ' + $('.product-detail__specs').text().trim();
        const reference = $('.product-detail__reference').text().replace('Reference:', '').trim() ? $('.product-detail__reference').text().replace('Reference:', '').trim() : '';
        $('.product-related__carousel a').each((idx, el) => {
            const related = base + $(el).attr('href');
            result.related.push(related);
        });
        let count = 1;
        $('.product-specifications__specs li').each((idx, el) => {
            let key = $(el).find('label').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            if (key.toLowerCase() === 'material' && count === 1) {
                key = 'Case Material';
                count++;
            }
            if (key.toLowerCase() === 'material' && count === 2) {
                key = 'Band Material';
                count++;
            }
            if (key.toLowerCase() === 'material' && count === 3) {
                key = 'Buckle Material';
                count++;
            }
            const value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            if (key) {
                result.spec.push({ key, value });
            }
        });
        result.name = name;
        result.reference = reference;
        result.gender = 'X';
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
        result.caliber.brand = 'Vacheron Constantin';
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

            if (key === 'case material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'size (mm)') {
                pp = true;
                result.case.width = value.trim() + ' mm';
            }
            if (key === 'thickness (mm)') {
                pp = true;
                result.case.thickness = value.trim() + ' mm';
            }
            if (key === 'caseback') {
                pp = true;
                if (value.match(/screw/i)) {
                    result.case.back = 'screwed';
                }
                if (value.match(/see-through/i)) {
                    result.case.back = 'see through';
                }
                if (value.match(/full back/i)) {
                    result.case.back = 'Full back';
                }
                if (value.match(/Solid/i)) {
                    result.case.back = 'Solid';
                }
                if (value.match(/screw-down/i)) {
                    result.case.back = 'Screw down';
                }
                if (value.match(/Transparent/i)) {
                    result.case.back = 'Transparent';
                }
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            if (key === 'hands') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === 'band material') {
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
                    result.band.type = 'Strap';
                }
                if (value.match(/polymer/i)) {
                    result.band.material = 'Polymer';
                    result.band.materials.push('Polymer');
                    result.band.type = 'Strap';
                }
                if (value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                    result.band.type = 'Bracelet';
                }
                if (value.match(/rose gold/i)) {
                    result.band.material = 'rose gold';
                    result.band.materials.push('rose gold');
                    result.band.type = 'Bracelet';
                }
                if (value.match(/yellow gold/i)) {
                    result.band.material = 'yellow gold';
                    result.band.materials.push('yellow gold');
                    result.band.type = 'Bracelet';
                }
                if (value.match(/aluminium/i)) {
                    result.band.material = 'aluminium';
                    result.band.materials.push('aluminium');
                    result.band.type = 'Bracelet';
                }
                if (value.match(/titanium/i)) {
                    result.band.material = 'titanium';
                    result.band.materials.push('titanium');
                    result.band.type = 'Bracelet';
                }
                if (value.match(/rubber/i)) {
                    result.band.material = 'rubber';
                    result.band.materials.push('rubber');
                    result.band.type = 'Strap';
                }
                if (value.match(/leather/i)) {
                    result.band.material = 'Leather';
                    result.band.materials.push('Leather');
                    result.band.type = 'Strap';
                }
                if (value.match(/calfskin/i)) {
                    result.band.material = 'Calfskin';
                    result.band.materials.push('Calfskin');
                    result.band.type = 'Strap';
                }
            }
            if (key === 'size') {
                pp = true;
                result.band.lugwidth = value.trim() + ' mm';
            }
            if (key === 'type') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'reference') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'energy') {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
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
            }
            if (key === 'number of parts') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'number of jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'power reserve (hours)') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'indications') {
                pp = true;
                const feature = value.split(',')
                result.feature = feature.map(x => x.trim());
            }
            if (key.toLowerCase().indexOf('water-resistance') > -1) {
                pp = true;
                result.waterResistance = value.split('.').pop() ? value.split('.').pop() + ' bar' : '';
                result.case.waterResistance = value.split('.').pop() ? value.split('.').pop() + ' bar' : '';
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
