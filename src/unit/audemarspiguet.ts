import axios from 'axios';
import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        cats.push(
            {
                name: 'Code 11.59 by Audemars Piguet',
                url: 'code1159byap'
            },
            {
                name: 'Royal Oak',
                url: 'royal-oak'
            },
            {
                name: 'Royal Oak Offshore',
                url: 'royal-oak-offshore'
            },
            {
                name: 'Royal Oak Concept',
                url: 'royal-oak-concept'
            },
            {
                name: 'Millenary',
                url: 'millenary'
            },
            {
                name: 'Haute Joaillerie',
                url: 'haute-joaillerie'
            },
            {
                name: 'Jules Audemars',
                url: 'jules-audemars'
            },
            {
                name: 'Classique',
                url: 'classique'
            },
        );

        for (const cat of cats) {
            result.collections.push(cat.name);
            const collection = cat.name;
            result.items[collection] = [];
        }

        const jsonData = 'https://www.audemarspiguet.com/api/v1/watches/?lang=en';
        const json = (axios.get(jsonData))['data'];
        for (const i in json['data']) {
            const urlCollection = json['data'][i]['permalink'].split('/watch-collection/')[1].split('/')[0];
            client.get(urlCollection).then(res => {
                const results = [];
                const collection = checkCollectionBaseUrl(urlCollection)
                if (collection) {
                    result.items[collection].push(
                        {
                            source: 'official',
                            url: base + json['data'][i]['permalink'],
                            collection: collection,
                            name: json['data'][i]['alt'],
                            thumbnail: base + json['data'][i]['assets']['standup_flattened'],
                            reference: json['data'][i]['reference'],
                            lang
                        }
                    );
                }
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
        const { base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        cats.push(
            {
                name: 'Code 11.59 by Audemars Piguet',
                url: 'code1159byap'
            },
            {
                name: 'Royal Oak',
                url: 'royal-oak'
            },
            {
                name: 'Royal Oak Offshore',
                url: 'royal-oak-offshore'
            },
            {
                name: 'Royal Oak Concept',
                url: 'royal-oak-concept'
            },
            {
                name: 'Millenary',
                url: 'millenary'
            },
            {
                name: 'Haute Joaillerie',
                url: 'haute-joaillerie'
            },
            {
                name: 'Jules Audemars',
                url: 'jules-audemars'
            },
            {
                name: 'Classique',
                url: 'classique'
            },
        );

        for (const cat of cats) {
            result.collections.push(cat.name);
            const collection = cat.name;
            result.items[collection] = [];
        }

        const jsonData = 'https://www.audemarspiguet.com/api/v1/watches/?lang=en';
        const json = (await axios.get(jsonData)).data;
        for (const i in json['data']) {
            const urlCollection = json['data'][i]['permalink'].split('/watch-collection/')[1].split('/')[0];
            const collection = checkCollectionBaseUrl(urlCollection)
            if (collection) {
                result.items[collection].push(
                    {
                        source: 'official',
                        url: base + json['data'][i]['permalink'],
                        collection: collection,
                        name: json['data'][i]['alt'],
                        thumbnail: base + json['data'][i]['assets']['standup_flattened'],
                        reference: json['data'][i]['reference'],
                        lang
                    }
                );
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

function checkCollectionBaseUrl(urlCollection) {
    let collection = "";
    const catalog = [
        {
            name: 'Code 11.59 by Audemars Piguet',
            url: 'code1159byap'
        },
        {
            name: 'Royal Oak',
            url: 'royal-oak'
        },
        {
            name: 'Royal Oak Offshore',
            url: 'royal-oak-offshore'
        },
        {
            name: 'Royal Oak Concept',
            url: 'royal-oak-concept'
        },
        {
            name: 'Millenary',
            url: 'millenary'
        },
        {
            name: 'Haute Joaillerie',
            url: 'haute-joaillerie'
        },
        {
            name: 'Jules Audemars',
            url: 'jules-audemars'
        },
        {
            name: 'Classique',
            url: 'classique'
        }];

    for (const cat of catalog) {
        if (cat.url === urlCollection) {
            collection = cat.name
        }
    }
    return collection;
}

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
        const refNumber = $('.watch-detail-header__reference-number').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").replace('Ref. ', '').replace('#', '');
        const jsonData = 'https://www.audemarspiguet.com/api/v1/watchprice/?lang=en&reference=' + refNumber;
        const json = (await axios.get(jsonData)).data;
        result.retail = json['data'][7]['price']['formatted_price'].replace('&#36;', '$');
        result.name = $('.watch-detail-header__title').text().trim();
        result.collection = entry.split('/watch-collection/')[1].split('/')[0];
        result.description = $('.watch-detail-header__description-container .type-body-2').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.reference = refNumber;

        if (result.description.indexOf('woman') > -1) {
            result.gender = 'F';
        }
        else {
            result.gender = 'M';
        }
        $('.tech-specs__desktop-specs .tech-specs__specs-inner-wrap .tech-specs__spec').each((idx, el) => {
            const key = $(el).find('h5').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key, value });
        });
        $('.watch-carousel__carousel-slide a').each((idx, el) => {
            const ref = $(el).attr('href').split('/watch-collection/')[1].split('/')[1];
            result.related.push(ref);
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
        result.caliber.brand = 'Audemars Piguet';
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
            if (value.match(/bracelet/i)) {
                pp = true;
                result.band.type = 'Bracelet';
                if (value.match(/alligator/i)) {
                    result.band.materials.push('Alligator leather');
                    result.band.material = 'Alligator leather';
                }
                if (value.match(/pink/i)) {
                    result.band.color = 'pink';
                }
                if (value.match(/pin buckle/i)) {
                    result.band.buckle = 'pin buckle';
                }
            }
            if (value.match(/bidirectional/i)) {
                pp = true;
                result.bezel = 'Bidirectional';
            }
            if (value.match(/dial/i)) {
                pp = true;
                if (value.match(/pink gold/i)) {
                    result.dial.color = 'Pink gold';
                }
                if (value.match('satin-brushed')) {
                    result.dial.finish = 'Satin brushed';
                }
            }
            if (value.match(/case/i)) {
                pp = true;
                if (value.match(/screw-locked/i)) {
                    result.case.back = 'Screw Locked';
                }
            }
            if (value.match(/chronograph/i)) {
                pp = true;
                result.dial.indexType = 'Chronograph';
            }
            if (value.match(/sapphire/i)) {
                pp = true;
                result.case.crystal = 'Sapphire';
            }
            if (value.match(/oval/i)) {
                pp = true;
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
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
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'bracelet') {
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
                if (value.match(/steel/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value.match(/rose gold/i)) {
                    result.band.material = 'stainless steel';
                    result.band.materials.push('stainless steel');
                }
                if (value.match(/yellow gold/i)) {
                    result.band.material = 'yellow gold';
                    result.band.material.push('yellow gold');
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
            if (value.match(/dial/i)) {
                pp = true;
                if (value.match(/grey/i)) {
                    result.dial.color = 'Grey';
                }
                if (value.match(/gray/i)) {
                    result.dial.color = 'Gray';
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
                if (value.match(/white gold/i)) {
                    result.dial.color = 'White gold';
                }
                if (value.match(/applied/i)) {
                    result.dial.finish = 'Applied';
                }
                if (value.match(/white gold hands/i)) {
                    result.dial.handStyle = 'White gold hands';
                }
            }
            if (key === 'case size') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === 'water resistance') {
                pp = true;
                result.case.waterResistance = value.trim();
                result.waterResistance = value.trim();
            }
            if (key === 'case thickness') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (key === 'functions') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim());
            }
            if (key === 'number of jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'frequency of balance wheel') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'number of parts') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
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
