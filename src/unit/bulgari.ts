import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.links-nav-box .nav-title .lvl-3-wrap a').each((idx, el) => {
            if (idx > 44 && idx < 57 && idx !== 52) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = base + $(el).attr('href');
                cats.push({ name, url });
                if (result.collections.indexOf(name) === -1) {
                    result.collections.push(name);
                    result.items[name] = [];
                }
            }
        });
        for (const cat of cats) {
            client.then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load((client.get(cat.url + '?sz=120')).data);
                $('.cell.small-6.medium-3.grid-row-item .cardContainer').each((idx, el) => {
                    const url = base + $(el).find('.product-url ').attr('href');
                    const thumbnail = $(el).find('.dis-container.prod-ratio source').attr('data-srcset');
                    const reference = url.split('/').pop().replace('.html', '').trim();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name: cat.name + ' Watch ' + reference,
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
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.links-nav-box .nav-title .lvl-3-wrap a').each((idx, el) => {
            if (idx > 42 && idx < 55 && idx !== 50) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = base + $(el).attr('href');
                cats.push({ name, url });
                if (result.collections.indexOf(name) === -1) {
                    result.collections.push(name);
                    result.items[name] = [];
                }
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url + '?sz=120')).data);
            $('.cell.small-6.medium-3.grid-row-item .cardContainer').each((idx, el) => {
                const url = base + $(el).find('.product-url ').attr('href');
                const thumbnail = $(el).find('.image-container .tile-image-container a picture source').attr('data-srcset');
                const reference = url.split('/').pop().replace('.html', '').trim();
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    collection: cat.name,
                    lang,
                    name: cat.name + ' Watch ' + reference,
                    reference,
                    thumbnail
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
            spec: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.description = $('.product-short-description.show-for-medium p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        const key = 'Spec';
        const value = $('.value.content.grid-container.text-center').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        if (value) {
            result.spec.push({ key, value });
        }
        $('.spec-article ').each((idx, el) => {
            const key = $(el).find('h4').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            if (key) {
                result.spec.push({ key, value });
            }
        });
        result.retail = $('.prices .shoppable-price ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.product-id').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.collection = $('.product-name.show-for-medium').text().replace('Watch', '').trim();
        result.name = $('.product-name.show-for-medium').text().trim() + ' ' + result.reference;
        if (result.collection.toLowerCase().indexOf('serpenti' || 'lvcea' || 'divas dream' || 'high jewellery watches') > -1) {
            result.gender = 'F';
        }
        if (result.collection.toLowerCase().indexOf('octo' || 'gerald genta') > -1) {
            result.gender = 'M';
        }
        if (result.collection.toLowerCase().indexOf('bvlgari bvlgari' || 'grandes complications') > -1) {
            result.gender = 'X';
        }
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
        result.caliber.brand = 'Bulgari';
        result.caliber.label = '';
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

        if (description.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
            result.caliber.type = 'Automatic';
        }
        if (description.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
            result.caliber.type = 'Hand wind';
        }
        if (description.toLowerCase().indexOf('quartz') > -1) {
            result.caliber.type = 'Quartz';
        }
        if (description.match(/steel/i)) {
            result.case.material = 'stainless steel';
            result.case.materials.push('stainless steel');
        }
        if (description.match(/rose gold/i)) {
            result.case.material = 'rose gold';
            result.case.materials.push('rose gold');
        }
        if (description.match(/yellow gold/i)) {
            result.case.material = 'yellow gold';
            result.case.materials.push('yellow gold');
        }
        if (description.match(/white gold/i)) {
            result.case.material = 'white gold';
            result.case.materials.push('white gold');
        }
        if (description.match(/aluminium/i)) {
            result.case.material = 'aluminium';
            result.case.materials.push('aluminium');
        }
        if (description.match(/titanium/i)) {
            result.case.material = 'titanium';
            result.case.materials.push('titanium');
        }
        // band material
        if (description.match(/alligator/i)) {
            result.band.material = 'Alligator Leather';
            result.band.materials.push('Alligator Leather');
        }
        if (description.match(/aluminium/i)) {
            result.band.material = 'aluminium';
            result.band.materials.push('aluminium');
        }
        if (description.match(/titanium/i)) {
            result.band.material = 'titanium';
            result.band.materials.push('titanium');
        }
        if (description.match(/rubber/i)) {
            result.band.material = 'rubber';
            result.band.materials.push('rubber');
        }
        if (description.match(/leather/i)) {
            result.band.material = 'Leather';
            result.band.materials.push('Leather');
        }
        if (description.match(/calfskin/i)) {
            result.band.material = 'Calfskin';
            result.band.materials.push('Calfskin');
        }
        if (description.match(/strap/i)) {
            result.band.type = 'Strap';
        }
        if (description.match(/bracelet/i)) {
            result.band.type = 'Bracelet';
        }
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            if (key === 'spec') {
                const words = value.split(',');
                for (const word of words) {
                    if (word.match(/caliber/i)) {
                        result.caliber.reference = word.trim();
                    }
                }
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
            if (key === 'diameter (mm)') {
                pp = true;
                result.case.width = value + ' (mm)';
            }
            if (key === 'functions') {
                pp = true;
                result.feature = value;
            }
            if (key === 'movement typology') {
                pp = true;
                result.caliber.type = value;
            }
            if (key === 'band material') {
                pp = true;
                result.band.material = value;
                result.band.materials.push(value);
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value;
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value;
                result.case.waterResistance = value;
            }
            if (key === 'buckle') {
                pp = true;
                result.band.buckle = value;
            }
            if (key === 'material​') {
                pp = true;
                result.case.material = value;
                result.case.materials.push(value);
            }
            if (key === 'color​') {
                pp = true;
                result.dial.color = value;
            }
            if (key === 'made in') {
                pp = true;
                result.caliber.label = value;
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
