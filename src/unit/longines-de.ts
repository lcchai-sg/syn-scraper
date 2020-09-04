import cheerio from 'cheerio';

import { clearEmpties } from "../utils";

export const indexing = async (context) => {
    const { client, entry, brand, brandID, lang, base } = context;
    const result = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];
    const $ = cheerio.load((await client.get(entry)).data);
    const collect = [];
    $('.watches-menu-cont .level0.submenu').each((idx, el) => {
        const index = idx;
        $(el).find('a').each((idx, x) => {
            let collection = '';
            let subcollection = '';
            let url = '';
            if (idx === 0) {
                collection = $(x).text();
                url = $(x).attr('href');
                collect.push({ index, collection, url });
            }
            else {
                subcollection = $(x).text();
                url = $(x).attr('href');
                const collection = collect[index].collection;
                cats.push({ collection, subcollection, url })
            }
        });
    });
    for (const cat of cats) {
        const subcollection = cat.subcollection;
        result.collections.push(subcollection);
        result.items[subcollection] = [];
        const $ = cheerio.load((await client.get(cat.url)).data);
        $('.product-list-item ').each((idx, el) => {
            const url = $(el).find('.product-list-item-name a').attr('href');
            const name = $(el).find(' .product-list-item-name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const thumbnail = $(el).find(' .product-list-item-photo img').attr('src');
            const retail = $(el).find(' .price-container.price-final_price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            let reference = '';

            result.items[subcollection].push({
                source: 'official',
                url,
                thumbnail,
                collection: cat.collection,
                subcollection,
                lang,
                name,
                reference,
                retail
            })
        });
    }
    return result;
};

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID, collection, subcollection, name, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            thumbnail,
            scripts: [],
            spec: [],
            related: [],
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.sku ').text().trim();
        $('.price-container ').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        const keys = [];
        const values = [];
        $('.additional-attributes-wrapper dl dt').each((idx, el) => {
            const key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            if (keys.indexOf(key) === -1) {
                keys.push(key);
            }
        });
        $('.additional-attributes-wrapper dl dd').each((idx, el) => {
            const value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            if (values.indexOf(value) === -1) {
                values.push(value);
            }
        });
        keys.map((key, i) => {
            const value = values[i];
            result.spec.push({ key, value });
        });
        result.name = $('.product-header-title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = reference;
        result.collection = collection;
        result.subcollection = subcollection;
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
        result.caliber.brand = 'Longines';
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
            if (value.match(/Glasur/i)) {
                result.dial.finish = 'Glasur'
            }
            if (value.match(/drehen/i)) {
                result.bezel = 'Drehen'
            }
            if (key === 'form:') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'schließe:') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'wasserdichtigkeit:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'abmessungen:') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'gehäuseboden:') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'stollenabstand:') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (key === 'material:') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'glas:') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'kaliber:') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'art des uhrwerks:') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'gangreserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'funktion:') {
                pp = true;
                result.feature = value.trim();
            }
            if (key === 'stundenskala::') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === 'farbe:') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === 'diamanten:') {
                pp = true;
                result.caliber.jewels = value.trim();
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
