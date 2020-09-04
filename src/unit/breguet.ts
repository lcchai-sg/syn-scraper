import axios from 'axios';
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
        $('.views-row ').each((idx, el) => {
            const name = $(el).find('h2 a').text();
            const url = base + $(el).find('h2 a').attr('href');
            const amount = $(el).find('.watches-number').text().replace('models', '').trim();
            const page = Math.floor(parseInt(amount) / 12);
            if (name && url) {
                cats.push({ name, url, page });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            if (cat.page > 0) {
                let current = 0;
                do {
                    const link = cat.url + ((current > 0) ? '?page=' + current : '');
                    current++;
                    client.get(link).then(res => {
                        const data = res.data;
                        const results = [];
                        const $$ = cheerio.load(data);
                        $$('.item-list .views-row a').each((idx, el) => {
                            const url = base + $$(el).attr('href');
                            const thumbnail = base + $$(el).find('img').attr('src');
                            const name = $$(el).find('h2').text();
                            result.items[cat.name].push({
                                source: 'official',
                                url,
                                thumbnail,
                                collection: cat.name,
                                lang,
                                name
                            });
                        });
                        observer.next({ ...context, results });
                        observer.complete();
                    });
                }
                while (current < (cat.page + 1))
            }
            else {
                client.get(cat.url).then(res => {
                    const data = res.data;
                    const results = [];
                    const $$ = cheerio.load(data);
                    $$('.item-list .views-row a').each((idx, el) => {
                        const url = base + $$(el).attr('href');
                        const thumbnail = base + $$(el).find('img').attr('src');
                        const name = $$(el).find('h2').text();
                        result.items[cat.name].push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            name
                        });
                    });
                    observer.next({ ...context, results });
                    observer.complete();
                });
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
        const { client, entry, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.views-row ').each((idx, el) => {
            const name = $(el).find('h2 a').text();
            const url = base + $(el).find('h2 a').attr('href');
            const amount = $(el).find('.watches-number').text().replace('models', '').trim();
            const page = Math.floor(parseInt(amount) / 12);
            if (name && url) {
                cats.push({ name, url, page });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            if (cat.page > 0) {
                let current = 0;
                do {
                    const link = cat.url + ((current > 0) ? '?page=' + current : '');
                    current++;
                    const $$ = cheerio.load((await client.get(link)).data);
                    $$('.item-list .views-row a').each((idx, el) => {
                        const url = base + $$(el).attr('href');
                        const thumbnail = base + $$(el).find('img').attr('src');
                        const name = $$(el).find('h2').text();
                        result.items[cat.name].push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            name
                        });
                    });
                }
                while (current < (cat.page + 1))
            }
            else {
                const $$ = cheerio.load((await client.get(cat.url)).data);
                $$('.item-list .views-row a').each((idx, el) => {
                    const url = base + $$(el).attr('href');
                    const thumbnail = base + $$(el).find('img').attr('src');
                    const name = $$(el).find('h2').text();
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name
                    });
                });
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
        result.description = $('.field.field-name-field-description p').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.name = entry.split('/timepieces/')[1].split('/')[0] + ' ' + entry.split('/timepieces/')[1].split('/')[1];
        result.reference = $('.infos-watch h2').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.collection = entry.split('/timepieces/')[1].split('/')[0].trim();
        result.thumbnail = $('.pane-variante img').attr('src');

        const id = $('.show-price-button').attr('data-ref').trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        const ajaxData = 'https://www.breguet.com/en/ajax/price/' + id;
        result.retail = (await axios.get(ajaxData)).data.replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();

        $('.list-produits-associes a').each((idx, el) => {
            const related = base + $(el).attr('href');
            result.related.push(related);
        });
        $('.list-spec li').each((idx, el) => {
            const key = $(el).find('label').text().trim();
            const value = $(el).find('.value').text().trim();
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
        result.caliber.brand = 'Breguet';
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
            if (key === 'winding') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'power reserve (hours)') {
                pp = true;
                result.caliber.reserve = value.trim() + ' hours';
            }
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'frequency') {
                pp = true;
                result.caliber.frequency = value.trim();
            }
            if (key === 'number of components') {
                pp = true;
                result.caliber.components = value.trim();
            }
            if (key === 'metal') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'case shape') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'sapphire caseback') {
                pp = true;
                if (value.match(/yes/i)) {
                    result.case.back = 'Sapphire'
                }
            }
            if (key === 'case width (mm)') {
                pp = true;
                result.case.width = value.trim() + ' mm';
            }
            if (key === 'case thickness (mm)') {
                pp = true;
                result.case.thickness = value.trim() + ' mm';
            }
            if (key === 'water-resistant (m)') {
                pp = true;
                result.case.waterResistance = value.trim() + ' m';
                result.waterResistance = value.trim() + ' m';
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
