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
        $('.header__primary__links.header__primary__links1 .js-header-entry .header__column  li').each((idx, el) => {
            if (idx > 55 && idx < 63) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = base + $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                $('.product-grid__item.js-product-edito ').each((idx, el) => {
                    const url = base + $(el).find('.txt-product a').attr('href');
                    const name = $(el).find('.heading.is-7.is-block.txt-product__title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('.product__media img').attr('src');
                    const reference = $(el).find('.is-sr-only').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Ref.', '').trim();
                    const retail = $(el).find('.is-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('*', '').trim();
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
        $('.header__primary__links.header__primary__links1 .js-header-entry .header__column  li').each((idx, el) => {
            if (idx > 55 && idx < 63) {
                const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const url = base + $(el).find('a').attr('href');
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url)).data);
            $('.product-grid__item.js-product-edito ').each((idx, el) => {
                const url = base + $(el).find('.txt-product a').attr('href');
                const name = $(el).find('.heading.is-7.is-block.txt-product__title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = $(el).find('.product__media img').attr('src');
                const reference = $(el).find('.is-sr-only').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Ref.', '').trim();
                const retail = $(el).find('.is-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('*', '').trim();
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
        let key = $('.product-details__option').find('span').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        let value = $('.product-details__option').find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.spec.push({ key, value });
        result.name = $('.heading.product-details__title ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.product-details__reference').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Ref.', '').trim();
        result.description = $('.product-details__description').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.pdp-sticky__pricing .product-details__price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('*', '').trim();
        result.gender = 'F';
        result.thumbnail = $('.carousel__slide-container img').attr('data-src');
        $('.characteristics__characteristic li').each((idx, el) => {
            key = $(el).find('.heading.is-7').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
        result.caliber.brand = 'Chanel';
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
            if (key === 'case size') {
                pp = true;
                result.case.width = value.split('x')[0].trim() + ' mm';
                result.case.thickness = value.split('x')[1].trim();
            }
            if (key === 'materials') {
                pp = true;
                const val = value.replace(/([a-z])([A-Z])/g, '$1 $2');
                if (val.match(/steel/i)) {
                    result.case.material = 'stainless steel';
                    result.case.materials.push('stainless steel');
                }
                if (val.match(/rose gold/i)) {
                    result.case.material = 'rose gold';
                    result.case.materials.push('rose gold');
                }
                if (val.match(/yellow gold/i)) {
                    result.case.material = 'yellow gold';
                    result.case.materials.push('yellow gold');
                }
                if (val.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (val.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
            }
            if (key === 'bezel') {
                pp = true;
                result.bezel.material = value.trim();
                result.bezel.materials.push(value.trim());
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
                if (value.match(/genuine shell/i)) {
                    result.band.material = 'Genuine Shell';
                    result.band.materials.push('Genuine Shell');
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
            }
            if (key === 'movement') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'water-resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value.trim();
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
