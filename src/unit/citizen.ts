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
        $('.wrap-sub-menu  ul:nth-child(1) li .nav-lvl-2-block li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim();
            const url = href;
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $$ = cheerio.load(data);
                $$('.watch').each((idx, el) => {
                    const href = $$(el).find('a').attr('href');
                    const reference = $$(el).find('.product-info div:nth-child(2)').text().trim();
                    const name = $$(el).find('span.name').text().trim();
                    const retail = $$(el).find('.product-sales-price').text().trim();
                    const thumbnails = $$(el).find('.img  div picture img').attr('src');
                    const collection = cat.name;
                    const thumbnail = "http:" + thumbnails;
                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href,
                        collection: collection,
                        reference,
                        name,
                        retail,
                        thumbnail,
                        lang
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.wrap-sub-menu  ul:nth-child(1) li .nav-lvl-2-block li').each((idx, el) => {
            const href = $(el).find('a').attr('href');
            const name = $(el).find('a').text().trim();
            const url = href;
            if (result.collections.indexOf(name) === -1) {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url });
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.watch').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                const reference = $$(el).find('.product-info div:nth-child(2)').text().trim();
                const name = $$(el).find('span.name').text().trim();
                const retail = $$(el).find('.product-sales-price').text().trim();
                const thumbnails = $$(el).find('.img  div picture img').attr('src');
                const collection = cat.name;
                const thumbnail = "http:" + thumbnails;
                result.items[cat.name].push({
                    source: 'official',
                    url: base + href,
                    collection: collection,
                    reference,
                    name,
                    retail,
                    thumbnail,
                    lang
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
            spec: [],
            scripts: [],
            related: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        let reference = entry.split("/").pop().replace(".html", "").trim();
        if (reference.indexOf('?') > -1) {
            reference = reference.split('?')[0];
        }
        const name = $('.product-name.h1-style').text().trim();
        const description = $('.product-col-2.product-detail.wrap-info  .description').text().trim();
        let gender;
        if (result.url.match(/mens/)) {
            gender = "M"
        } else {
            gender = "F"
        }
        result.url = result.url.match(/.*html/g)[0];
        result.gender = gender;
        result.reference = reference;
        result.name = name;
        result.description = description;
        result.thumbnail = 'https:' + $('.product-primary-image img').attr('src');
        $('.bloc-text').each((idx, el) => {
            const key = $(el).find('.small-title').text();
            const value = $(el).find(' .description').text().trim();
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
        result.caliber.brand = 'Citizen';
        result.caliber.label = 'Japan';
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
        if (description.match(/eco-drive/i)) {
            result.caliber.type = 'Eco Drive';
        }
        if (description.match(/self-winding/i) || description.match(/automatic/i) || description.match(/mechanical/i)) {
            result.caliber.type = 'Automatic';
        }
        if (description.match(/quartz/i)) {
            result.caliber.type = 'quartz';
        }
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            // case
            if (key === 'case material') {
                pp = true;
                let material = value.split(",");
                result.case.material = material[1] ? material[1] : "";
                result.case.materials.push(material[1]);
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
            }
            if (key === 'crystal') {
                pp = true;
                if (value.match(/mineral/i)) {
                    result.case.crystal = 'Mineral Crystal';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            if (key === 'case size (mm)') {
                pp = true;
                result.case.width = value + ' mm';
            }
            if (key === 'water-resistance') {
                pp = true;
                result.waterResistance = value.replace("WR", "") ? value.replace("WR", "") : "";
                result.case.waterResistance = value.replace("WR", "") ? value.replace("WR", "") : "";
            }
            // dial
            if (key === 'dial') {
                pp = true;
                let dial = value.split(",")
                result.dial.color = dial ? dial[0] : "";
                for (const x of dial) {
                    if (x.match(/Luminous/i)) {
                        result.dial.handStyle = 'Luminous';
                    }
                    if (x.match(/Rhodium/i)) {
                        result.dial.handStyle = 'Rhodium';
                    }
                    if (x.match(/Baton/i)) {
                        result.dial.handStyle = 'Baton';
                    }
                }
            }
            if (value.match(/Altimeter/i)) {
                result.dial.indexType = 'Altimeter';
            }
            if (value.match(/Chronograph/i)) {
                result.dial.indexType = 'Chronograph';
            }
            if (value.match(/Chronometer/i)) {
                result.dial.indexType = 'Chronometer';
            }
            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            // band
            if (key === 'band') {
                pp = true;
                let band = value.split(',')
                result.band.material = band[0] ? band[0] : "";
                result.band.materials.push(band[0]);
                result.band.type = band[1] ? band[1] : "";
                result.band.buckle = band[2] ? band[2] : "";
            }
            // caliber
            if (key === 'functions') {
                pp = true;
                let functions = value.split(',');
                result.caliber.reference = description.split('Caliber number')[1] ? description.split('Caliber number')[1] : "";
                let powerReserve = description ? description.match(/[0-9][0-9] month/) : "";
                if (powerReserve === null) {
                }
                else {
                    result.caliber.reserve = powerReserve[0] ? powerReserve[0] : '';
                }
                //features
                result.feature = functions.map(x => x.trim());
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
