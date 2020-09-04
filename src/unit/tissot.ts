import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const PageCount = 32;
        const catUrls = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.main-menu__submenu-item').each((idx, el) => {
            const url = $(el).find('a').attr('href');
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            catUrls.push({ name, url });
            if (result.collections.indexOf(name) === -1) {
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        const urls = [];
        for (const cat of catUrls) {
            const c$ = cheerio.load((client.get(cat.url)).data);
            const cTotal = parseInt(c$('.products-section .products-header .number-results .highlight').text());
            const cPage = Math.ceil(cTotal / PageCount);
            for (let i = 0; i < cPage; i++) {
                let $$;
                if (i === 0) {
                    $$ = c$;
                } else {
                    $$ = cheerio.load((client.get(cat.url + '?p=' + (i + 1))).data);
                }

                $$('.products-section .products-grid').each((idx, el) => {
                    const href = $$(el).find('a.product-thumbnail.product-item-link').attr('href');
                    const name = $$(el).find('a.product-thumbnail.product-item-link').attr('title');
                    let reference = '';
                    let thumbnail = '';
                    if (urls.indexOf(href) === -1) {
                        urls.push(href);
                    }
                    if ($$(el).find('.product-thumbnail__img-container img').attr('src')) {
                        const thumbnail = $$(el).find('.product-thumbnail__img-container img').attr('src');
                        const words = thumbnail.split('/');
                        for (const word of words) {
                            const refs = word.split('_');
                            for (const ref of refs) {
                                if (ref.length === 18) {
                                    reference = ref;
                                }
                            }
                        }
                    }

                    result.items[cat.name].push({
                        source: 'official',
                        url: href,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        reference
                    })
                })
                observer.next({ ...context, result });
                observer.complete();
            }
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
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const PageCount = 32;
        const catUrls = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.main-menu__submenu-item').each((idx, el) => {
            const url = $(el).find('a').attr('href');
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            catUrls.push({ name, url });
            if (result.collections.indexOf(name) === -1) {
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        const urls = [];
        for (const cat of catUrls) {
            const c$ = cheerio.load((await client.get(cat.url)).data);
            const cTotal = parseInt(c$('.products-section .products-header .number-results .highlight').text());
            const cPage = Math.ceil(cTotal / PageCount);
            for (let i = 0; i < cPage; i++) {
                let $$;
                if (i === 0) {
                    $$ = c$;
                } else {
                    $$ = cheerio.load((await client.get(cat.url + '?p=' + (i + 1))).data);
                }

                $$('.products-section .products-grid').each((idx, el) => {
                    const href = $$(el).find('a.product-thumbnail.product-item-link').attr('href');
                    const name = $$(el).find('a.product-thumbnail.product-item-link').attr('title');
                    let reference = '';
                    let thumbnail = '';
                    if (urls.indexOf(href) === -1) {
                        urls.push(href);
                    }
                    if ($$(el).find('.product-thumbnail__img-container img').attr('src')) {
                        const thumbnail = $$(el).find('.product-thumbnail__img-container img').attr('src');
                        const words = thumbnail.split('/');
                        for (const word of words) {
                            const refs = word.split('_');
                            for (const ref of refs) {
                                if (ref.length === 18) {
                                    reference = ref;
                                }
                            }
                        }
                    }

                    result.items[cat.name].push({
                        source: 'official',
                        url: href,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        reference
                    })
                })
            }
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
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            spec: [],
            scripts: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.product-sku').text().trim();
        const name = $('.product-name').text().trim();
        const retail = $('.price-wrapper').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        const description = $('.product-description p').text().trim();
        result.thumbnail = $('.product-mosaic__img-container img').attr('src');
        result.reference = reference;
        result.name = name;
        result.description = description;
        result.retail = retail;
        result.gender = 'X';

        $('.product-specs .tabs-container li').each((idx, el) => {
            const key = $(el).find('h4').text();
            const value = $(el).find('p').text();
            result.spec.push({ key, value });
        });
        $('.swiper-wrapper').each((idx, el) => {
            const ref = $(el).find('.swiper-slide a ').attr('href');
            result.related.push(ref);
        });
        result.brand = 'tissot';
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
                    if (key === 'referenz') {
                        pp = true;
                        result.reference = value;
                    }
                    if (key === 'herkunft') {
                        pp = true;
                        result.origin = value;
                    }
                    if (key === 'garantie') {
                        pp = true;
                        result.warranty = value;
                    }
                    if (key === 'energie reserve') {
                        pp = true;
                        result.caliber.reserve = value;
                    }
                    if (key === 'kollektion') {
                        pp = true;
                        result.collection = value;
                    }
                    if (key === 'wasserdichtigkeit') {
                        pp = true;
                        result.waterResistance = value.replace('Wasserdicht bis zu einem Druck von', '').trim();
                        result.case.waterResistance = value.replace('Wasserdicht bis zu einem Druck von', '').trim();
                    }
                    if (key === 'gehäuseform') {
                        pp = true;
                        result.gender = value;
                    }
                    if (key === 'gehäuseoptionen') {
                        pp = true;
                        result.case.back = value;
                    }
                    if (key === 'case shape') {
                        pp = true;
                        result.case.shape = value;
                    }
                    if (key === 'gehäusematerial') {
                        pp = true;
                        if (value.match(/staal/i)) {
                            result.case.material = 'roestvrij staal';
                            result.case.materials.push('roestvrij staal');
                        }
                        if (value.match(/rose goud/i)) {
                            result.case.material = 'rose goud';
                            result.case.materials.push('rose goud');
                        }
                        if (value.match(/geel goud/i)) {
                            result.case.material = 'geel goud';
                            result.case.materials.push('geel goud');
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
                    if (key === 'länge') {
                        pp = true;
                        result.case.lenght = value;
                    }
                    if (key === 'breite') {
                        pp = true;
                        result.case.width = value + ' mm';
                    }
                    if (key === 'bandanstoß') {
                        pp = true;
                        result.band.lugwidth = value + ' mm';
                    }
                    if (key === 'dicke') {
                        pp = true;
                        result.case.thickness = value + ' mm';
                    }
                    if (key === 'glas') {
                        pp = true;
                        if (s.value.match(/verdoemde/i)) {
                            result.case.crystal = 'Verdoemde Sapphire';
                        }
                        if (s.value.match(/saphirglas/i)) {
                            result.case.crystal = 'Saphirglas';
                        }
                    }
                    if (key === 'zifferblattfarbe') {
                        pp = true;
                        result.dial.color = value;
                    }
                    if (key === 'ziffern') {
                        pp = true;
                        result.dial.indextype = value;
                    }
                    if (key === 'uhrwerk') {
                        pp = true;
                        result.caliber.brand = 'Tissot';
                        result.caliber.label = 'Swiss';
                    }
                    if (key === 'gewicht (g)') {
                        pp = true;
                        result.weight = value;
                    }
                    if (key === 'geschlecht') {
                        pp = true;
                        let gvalue;
                        if (value == "Herren") {
                            gvalue = "M"
                        }
                        else {
                            gvalue = "F"
                        }
                        result.gender = gvalue;
                    }
                    if (key === 'kaliber') {
                        pp = true;
                        result.caliber.reference = value;
                    }
                    if (key === 'kaliberdurchmesser (Linien)') {
                        pp = true;
                        result.caliber.reference = value;
                    }
                    if (key === 'kaliberdurchmesser (mm)') {
                        pp = true;
                        result.caliber.diameter = value + ' mm';
                    }
                    if (key === 'funktionen') {
                        pp = true;
                        result.feature = value.split(',').map(x => x.trim());
                    }
                    if (key === 'juwelen') {
                        pp = true;
                        result.caliber.jewels = value;
                    }
                    if (key === 'band-bezeichnung') {
                        pp = true;
                        result.band.reference = value;
                    }
                    if (key === 'band') {
                        pp = true;
                        result.band.material = value;
                        result.band.materials.push(value);
                    }
                    if (key === 'vorderseite') {
                        pp = true;
                        result.band.type = value;
                    }
                    if (key === 'bandfarbe') {
                        pp = true;
                        result.band.color = value;
                    }
                    if (key === 'schließe') {
                        pp = true;
                        result.band.buckle = value;
                    }
                    if (key === 'xl-bandbezeichnung') {
                        pp = true;
                        result.xlreference = value;
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
                break;
            default:
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === 'reference') {
                        pp = true;
                        result.reference = value;
                    }
                    if (key === 'origin') {
                        pp = true;
                        result.origin = value;
                    }
                    if (key === 'warranty') {
                        pp = true;
                        result.warranty = value;
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value;
                    }
                    if (key === 'collection') {
                        pp = true;
                        result.collection = value;
                    }
                    if (key === 'water resistance') {
                        pp = true;
                        result.waterResistance = value.replace('Water-resistant up to a pressure of ', '').trim();
                        result.case.waterResistance = value.replace('Water-resistant up to a pressure of ', '').trim();
                    }
                    if (key === 'gender') {
                        pp = true;
                        result.gender = value;
                    }
                    if (key === 'case options') {
                        pp = true;
                        result.case.back = value;
                    }
                    if (key === 'case shape') {
                        pp = true;
                        result.case.shape = value;
                    }
                    if (key === 'case material') {
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
                    if (key === 'length') {
                        pp = true;
                        result.case.length = value;
                    }
                    if (key === 'width') {
                        pp = true;
                        result.case.width = value + ' mm';
                    }
                    if (key === 'lugs') {
                        pp = true;
                        result.band.lugwidth = value + ' mm';
                    }
                    if (key === 'thickness') {
                        pp = true;
                        result.case.thickness = value + ' mm';
                    }
                    if (key === 'crystal') {
                        pp = true;
                        if (s.value.match(/domed/i)) {
                            result.case.crystal = 'Domed Sapphire';
                        }
                        if (s.value.match(/sapphire/i)) {
                            result.case.crystal = 'Sapphire';
                        }
                    }
                    if (key === 'dial color') {
                        pp = true;
                        result.dial.color = value;
                    }
                    if (key === 'indexes') {
                        pp = true;
                        result.dial.indextype = value;
                    }
                    if (key === 'movement') {
                        pp = true;
                        result.caliber.brand = 'Tissot';
                        result.caliber.label = 'Swiss';
                    }
                    if (key === 'weight (g)') {
                        pp = true;
                        result.weight = value;
                    }
                    if (key === 'gender') {
                        pp = true;
                        let gvalue;
                        if (value == "GENT") {
                            gvalue = "M"
                        }
                        else {
                            gvalue = "F"
                        }
                        result.gender = gvalue;
                    }
                    if (key === 'model') {
                        pp = true;
                        result.caliber.reference = value;
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value;
                    }
                    if (key === 'diameter (mm)') {
                        pp = true;
                        result.caliber.diameter = value + ' mm';
                    }
                    if (key === 'functions') {
                        pp = true;
                        result.feature = value.split(',').map(x => x.trim());
                    }
                    if (key === 'jewels') {
                        pp = true;
                        result.caliber.jewels = value;
                    }
                    if (key === 'strap/chain reference') {
                        pp = true;
                        result.band.reference = value;
                    }
                    if (key === 'strap details') {
                        pp = true;
                        result.band.material = value;
                        result.band.materials.push(value);
                    }
                    if (key === 'strap front') {
                        pp = true;
                        result.band.type = value;
                    }
                    if (key === 'strap color') {
                        pp = true;
                        result.band.color = value;
                    }
                    if (key === 'buckle') {
                        pp = true;
                        result.band.buckle = value;
                    }
                    if (key === 'xl reference') {
                        pp = true;
                        result.xlreference = value;
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
