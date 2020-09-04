import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.grid-col-4.wow.fadeInDown a').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const url = $(el).attr('href');
            cats.push({ name, url });
            result.collections.push(name);
            result.items[name] = [];
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                $('.col-5.grid a').each((idx, el) => {
                    const url = $(el).attr('href');
                    const name = $(el).find('.info-product').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = $(el).find('.image-product img').attr('src');
                    const reference = $(el).find('.ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
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
        const { client, entry, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.grid-col-4.wow.fadeInDown a').each((idx, el) => {
            const name = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const url = $(el).attr('href');
            cats.push({ name, url });
            result.collections.push(name);
            result.items[name] = [];
        });
        for (const cat of cats) {
            const $ = cheerio.load((await client.get(cat.url)).data);
            $('.col-5.grid a').each((idx, el) => {
                const url = $(el).attr('href');
                const name = $(el).find('.info-product').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = $(el).find('.image-product img').attr('src');
                const reference = $(el).find('.ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
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
        result.name = $('.breadcrumb h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + $('.col-md-12.border_b h3').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() + ' ' + $('.single-product--ref .uppercase').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.collection = $('.breadcrumb h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = $('.single-product--ref .uppercase').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.retail = $('.regular-price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.description = $('.container .row .col-md-12.border_b .padd_txt p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = $('.swiper-slide img').attr('src');
        $('.list ').each((idx, el) => {
            const key = $(el).find('h4').text();
            const value = $(el).find('p').text();
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
        result.caliber.brand = 'Gaga Milano';
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
            if (key === 'case size') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'case thickness') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'case material') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'bezel material') {
                pp = true;
                result.bezel.material = value.trim();
                result.bezel.materials.push(value.trim());
            }
            if (key === 'movement') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'waterproof') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
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
            if (key === 'closure') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === 'case back') {
                pp = true;
                result.case.back = value.trim();
            }
            if (key === 'gender') {
                pp = true;
                if (value.match(/woman/i)) {
                    result.gender = 'F';
                }
                if (value.match(/man/i)) {
                    result.gender = 'M';
                }
                if (value.match(/unisex/i)) {
                    result.gender = 'X';
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
