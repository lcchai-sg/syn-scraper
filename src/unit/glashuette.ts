import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, base, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const collections = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.four-collections a.four-collections__link')
            .each((idx, element) => {
                collections.push($(element).attr('href'));
            });
        const urls = [];
        for (const url of collections) {
            client.get(url).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                let collection = $('main h1').text();
                collection = collection.substr(0, collection.indexOf(" "));
                if (result.collections.indexOf(collection)) {
                    result.collections.push(collection);
                    result.items[collection] = [];
                }
                $('section.product-list .product-list__item').each((idx, el) => {
                    const $$ = cheerio.load(el);
                    const href = $$('a').attr('href');
                    const thumbnail = $$('picture source').attr('srcset');
                    const n = $$('a h3').text();
                    if (urls.indexOf(href) === -1) {
                        urls.push(href);
                        let url;
                        let qs;
                        let name = n.startsWith(collection) ? n.substr(collection.length + 1).trim() : n;
                        if (href.indexOf('?') > -1) {
                            url = href.substring(0, href.indexOf('?'));
                            qs = href.substr(href.indexOf('?') + 1);
                        } else {
                            url = href;
                        }
                        if (!url.startsWith('http') && base) {
                            url = base + url.substr(1);
                        }
                        result.items[collection].push({
                            source: 'official',
                            url,
                            qs,
                            thumbnail,
                            collection,
                            lang,
                            name
                        })
                    }
                })
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
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const collections = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.four-collections a.four-collections__link')
            .each((idx, element) => {
                collections.push($(element).attr('href'));
            });
        const urls = [];
        for (const url of collections) {
            const $ = cheerio.load((await client.get(url)).data);
            let collection = $('main h1').text();
            collection = collection.substr(0, collection.indexOf(" "));
            if (result.collections.indexOf(collection)) {
                result.collections.push(collection);
                result.items[collection] = [];
            }
            $('section.product-list .product-list__item').each((idx, el) => {
                const $$ = cheerio.load(el);
                const href = $$('a').attr('href');
                const reference = $$('.product-list__ref').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const n = $$('a h3').text();

                if (urls.indexOf(href) === -1) {
                    urls.push(href);
                    let url;
                    let name = n.startsWith(collection) ? n.substr(collection.length + 1).trim() : n;
                    if (href.indexOf('?') > -1) {
                        url = href.substring(0, href.indexOf('?'));
                    } else {
                        url = href;
                    }
                    if (!url.startsWith('http') && base) {
                        url = base + url.substr(1);
                    }
                    result.items[collection].push({
                        source: 'official',
                        url,
                        reference,
                        collection,
                        lang,
                        name
                    })
                }
            })
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
        const base = "https://www.glashuette-original.com/";
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            spec: []
        };
        const $ = cheerio.load((await client.get(entry)).data);
        let collection = $('main .slider-main__inner .slider-main__item__subtitle:first-of-type').text().trim();
        collection = collection.substr(0, collection.indexOf(' '));
        let name = $('main .slider-main__inner h2').text().trim();
        result.collection = collection;
        result.name = name;
        result.thumbnail = base + ($('section.product[itemscope] .product__img a.product__link img').attr('data-src')).substr(1);
        $('section.product[itemscope] .product__info .product__info__item').each((idx, ele) => {
            let key = $(ele).find('h3').text().trim();
            let value = $(ele).find('.product__info__text > span').text().trim();
            result.spec.push({
                key,
                value
            });
            if (key === 'Reference Number') {
                result.reference = value;
            }
        });
        $('section.product.product--calibre .product__info__item').each((idx, ele) => {
            result.spec.push({
                group: 'calibre',
                key: $(ele).find('h3').text().trim(),
                value: $(ele).find('.product__info__text').text().trim()
            })
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
        result.caliber.brand = 'Glashuette';
        result.caliber.label = 'German';
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
            if (key === 'calibre movement') {
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
            if (key === 'functions') {
                pp = true;
                const words = value.split('\n');
                if (words) {
                    result.feature = words.map(x => x.trim());
                }
            }
            if (key === 'case') {
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

                if (value.match(/waterproof/i)) {
                    const waterResistance = value.split('waterproof')[1];
                    result.waterResistance = waterResistance.replace('up to ', '').trim();
                    result.case.waterResistance = waterResistance.replace('up to ', '').trim();
                }
            }
            if (key === 'dimensions') {
                pp = true;
                const words = value.split(',');
                if (words) {
                    for (const word of words) {
                        if (word.match(/diameter/i)) {
                            result.case.width = word.replace('Diameter:', '').trim();
                        }
                        if (word.match(/height/i)) {
                            result.case.thickness = word.replace('Height:', '').trim();
                        }
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
                if (value.match(/rhodium/i)) {
                    result.dial.handStyle = 'Rhodium Plated';
                }
                if (value.match(/blued/i)) {
                    result.dial.handStyle = 'blued';
                }
                if (value.match(/super-luminova/i)) {
                    result.dial.finish = 'Super Luminova';
                }
                if (value.match(/galvanized/i)) {
                    result.dial.finish = 'galvanized';
                }
                if (value.match(/roman/i)) {
                    result.dial.indexType = 'Roman';
                }
                if (value.match(/arabic/i)) {
                    result.dial.indexType = 'Arabic';
                }
            }
            if (key === 'strap') {
                pp = true;
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
                    result.band.materials.push('Alligator Leather');
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
                result.caliber.type = value.trim()
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim()
            }
            if (key === 'jewels') {
                pp = true;
                result.caliber.jewels = value.trim()
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
