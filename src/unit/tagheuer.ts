import axios from 'axios';
import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        let hashTags = 182;
        $('.menu-watch__selection-list .menu-watch__selection-item  ').each((idx, el) => {
            const url = base + $(el).find('.menu-watch__selection-link ').attr('href');
            const name = $(el).find('.menu-watch__selection-link ').text().trim();
            if (idx < 7) {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url });
            }
        });
        for (const cat of cats) {
            do {
                const jsonData = 'https://www.tagheuer.com/all-watches-results-json?field_hashtags[]=' + hashTags;
                const json = (axios.get(jsonData))['data'];
                for (const i in json[3].results) {
                    switch (lang) {
                        case 'de':
                            result.items[cat.name].push(
                                {
                                    source: 'official',
                                    url: (base + json[3].results[i]['watch_page_url']).replace('/en/watches/', '/de/uhren/'),
                                    collection: json[3].results[i]['field_collection'],
                                    name: json[3].results[i]['title'],
                                    thumbnail: json[3].results[i]['field_image'],
                                    reference: json[3].results[i]['field_sku'],
                                    retail: json[3].results[i]['solr_watch_price'],
                                    gender: json[3].results[i]['field_gender'],
                                    description: json[3].results[i]['solr_watch_unique_name'],
                                    lang
                                }
                            );
                            break;
                        default:
                            result.items[cat.name].push(
                                {
                                    source: 'official',
                                    url: base + json[3].results[i]['watch_page_url'],
                                    collection: json[3].results[i]['field_collection'],
                                    name: json[3].results[i]['title'],
                                    thumbnail: json[3].results[i]['field_image'],
                                    reference: json[3].results[i]['field_sku'],
                                    retail: json[3].results[i]['solr_watch_price'],
                                    gender: json[3].results[i]['field_gender'],
                                    description: json[3].results[i]['solr_watch_unique_name'],
                                    lang
                                }
                            );
                            break;
                    }
                    observer.next({ ...context, result });
                    observer.complete();
                }
                hashTags++;
            } while (hashTags < 187)
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
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('.c-WtchsCarousel .o-OuterContainer ul li').each((idx, el) => {
            const url = $(el).find('a').attr('href');
            const name = $(el).find('a .p2').text().trim().split("TAG Heuer")[1];
            result.collections.push(name);
            result.items[name] = [];
            cats.push({ name, url });
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            const max = $$('.element-last.text-gw').text().trim();
            const collection = cat.url.split('/collections/')[1].replace('tag-heuer-', '').replace('/', '').trim();
            const apiUrl = 'https://www.tagheuer.com/on/demandware.store/Sites-TAG_INT-Site/en_SG/Search-UpdateGrid?cgid='
            const link = apiUrl + collection + '&start=0&sz=' + max;
            const $$$ = cheerio.load((await client.get(link)).data);
            $$$('.product').each((idx, el) => {
                const collection = $$(el).find('.pdp-link').text().trim();
                const reference = $$(el).attr('data-pid');
                const name = collection + " " + reference;
                const url = base + $$(el).find('.tile-body .link').attr('href');
                const thumbnail = base + $$(el).find('.image-container picture img').attr('src');
                const retail = $$(el).find('.sales').text().trim();
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
        const { client, entry, lang, brand, brandID, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            scripts: [],
            spec: [],
            related: [],
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const retail = $('.sales').text().trim();
        result.retail = retail;
        result.name = $('.product-name').text().trim();
        result.description = $('#collapseDescription').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim().replace("...", "");
        const collection = $('.product-name').text().trim();
        let reference = '';
        $('#tech-accordion .card').each((idx, tab) => {
            let key = '';
            let value = '';
            const keys = [];
            const values = [];
            const cat = $(tab).find('.card-header h3').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            $(tab).find('.col-12.col-lg-6 .spec-title').each((idx, el) => {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                keys.push(key);
            });
            $(tab).find('.spec-value').each((idx, el) => {
                value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                values.push(value);
            });
            keys.map((key, i) => {
                if (cat === 'Reference number' || cat === 'Referenznummer') {
                    result.reference = value;
                } else {
                    const value = values[i];
                    result.spec.push({ cat, key, value });
                }
            });
        });
        result.name = collection + " " + reference;
        result.collection = collection;
        result.gender = 'M';
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
                    const cat = s.cat.toLowerCase();
                    if (value.match(/römisch/i)) {
                        result.dial.indexType = 'römisch';
                    }
                    if (value.match(/Arab/i)) {
                        result.dial.indexType = 'Araberin';
                    }
                    if (value.match(/Chrono/i)) {
                        result.dial.indexType = 'Chronograph';
                    }
                    if (value.match(/rhodium/i)) {
                        result.dial.handStyle = 'Rhodium';
                    }
                    if (value.match(/Leuchtend/i)) {
                        result.dial.handStyle = 'Leuchtend';
                    }
                    if (value.match(/taktstock/i)) {
                        result.dial.handStyle = 'Taktstock';
                    }
                    if (value.match(/glanz/i)) {
                        result.dial.finish = 'Glanz';
                    }
                    if (value.match(/matt/i)) {
                        result.dial.finish = 'matt';
                    }
                    if (value.match(/sunburst/i)) {
                        result.dial.finish = 'sunburst';
                    }
                    if (value.match(/lumineszierend/i)) {
                        result.dial.finish = 'lumineszierend';
                    }
                    if (value.match(/Superluminova/i)) {
                        result.dial.finish = 'Superluminova';
                    }
                    if (value.match(/gebürstet/i)) {
                        result.dial.finish = 'gebürstet';
                    }
                    if (value.match(/satin/i)) {
                        result.dial.finish = 'satin';
                    }
                    if (value.match(/guilloche/i)) {
                        result.dial.finish = 'guilloche';
                    }
                    if (s.value.match(/oval/i)) {
                        result.case.shape = 'Oval';
                    }
                    else {
                        result.case.shape = 'Runden';
                    }
                    if (key.indexOf('wasserdichtigkeit') > -1) {
                        pp = true;
                        result.waterResistance = value;
                        result.case.waterResistance = value;
                    }
                    if (key === 'fall') {
                        pp = true;
                        if (value.match(/stahl/i)) {
                            result.case.material = 'rostfreier stahl';
                            result.case.materials.push('rostfreier stahl');
                        }
                        if (value.match(/roségold/i)) {
                            result.case.material = 'roségold';
                            result.case.materials.push('roségold');
                        }
                        if (value.match(/gelbes gold/i)) {
                            result.case.material = 'gelbes gold';
                            result.case.materials.push('gelbes gold');
                        }
                        if (value.match(/weißes gold/i)) {
                            result.case.material = 'weißes gold';
                            result.case.materials.push('weißes gold');
                        }
                        if (value.match(/aluminium/i)) {
                            result.case.material = 'aluminium';
                            result.case.materials.push('aluminium');
                        }
                        if (value.match(/titan/i)) {
                            result.case.material = 'titan';
                            result.case.materials.push('titan');
                        }
                    }
                    if (key === 'gehäusemittelteil') {
                        pp = true;
                        if (value.match(/Stahl/i)) {
                            result.case.material = 'rostfreier Stahl';
                            result.case.materials.push('rostfreier Stahl');
                        }
                        if (value.match(/roségold/i)) {
                            result.case.material = 'Roségold';
                            result.case.materials.push('Roségold');
                        }
                        if (value.match(/gelbes Gold/i)) {
                            result.case.material = 'gelbes Gold';
                            result.case.materials.push('gelbes Gold');
                        }
                        if (value.match(/aluminium/i)) {
                            result.case.material = 'aluminium';
                            result.case.materials.push('aluminium');
                        }
                        if (value.match(/titan/i)) {
                            result.case.material = 'titan';
                            result.case.materials.push('titan');
                        }
                        if (value.match(/glanz/i)) {
                            result.dial.finish = 'Glanz';
                        }
                        if (value.match(/matt/i)) {
                            result.dial.finish = 'matt';
                        }
                        if (value.match(/sunburst/i)) {
                            result.dial.finish = 'sunburst';
                        }
                        if (value.match(/lumineszierend/i)) {
                            result.dial.finish = 'lumineszierend';
                        }
                        if (value.match(/Superluminova/i)) {
                            result.dial.finish = 'Superluminova';
                        }
                        if (value.match(/gebürstet/i)) {
                            result.dial.finish = 'gebürstet';
                        }
                        if (value.match(/satin/i)) {
                            result.dial.finish = 'satin';
                        }
                        if (value.match(/guilloche/i)) {
                            result.dial.finish = 'guilloche';
                        }
                    }
                    if (key === 'farbe') {
                        if (cat === 'armband') {
                            pp = true;
                            result.band.color = value;
                        }
                        if (cat === 'zifferblatt') {
                            pp = true;
                            result.dial.color = value;
                        }
                    }
                    if (key === 'kaliber') {
                        if (value.toLowerCase().indexOf('quarz') > -1) {
                            pp = true;
                            result.caliber.type = 'Quarz';
                        }
                        if (value.toLowerCase().indexOf('automatik chronograph') > -1) {
                            pp = true;
                            result.caliber.type = 'Automatik';
                        }
                        let strArr = value.split(' ');
                        strArr.forEach(element => {
                            if (parseInt(element)) {
                                pp = true;
                                result.caliber.reference = "Calibre " + element;
                            }
                        });
                    }
                    if (key === 'durchmesser') {
                        pp = true;
                        result.case.width = value;
                    }
                    if (key === 'größe') {
                        pp = true;
                        result.case.width = value;
                    }
                    if (key === 'gehäuseboden') {
                        pp = true;
                        result.case.back = value;
                    }
                    if (key === 'aufzugssystem') {
                        pp = true;
                        result.caliber.type = value;
                    }
                    if (key === 'uhrglas') {
                        pp = true;
                        result.case.crystal = value;
                    }
                    if (key === 'lünette') {
                        pp = true;
                        result.bezel = value;
                    }
                    if (key === 'lugs') {
                        pp = true;
                        var lugType = value.match(/.*lugs/)[0], lugMaterial = value.match(/lugs.*/)[0].replace("lugs", "");
                        result.case.lugType = lugType;
                        result.case.lugMaterial = lugMaterial;
                    }
                    if (key === 'riemenmaterial') {
                        pp = true;
                        result.band.material = value;
                        result.band.materials.push(value);
                    }
                    if (key === 'schließe') {
                        pp = true;
                        result.band.buckle = value;
                    }
                    if (key === 'finish') {
                        pp = true;
                        result.dial.finish = value;
                    }
                    if (key === 'material') {
                        pp = true;
                        // band color
                        if (value.match(/Grau/i)) {
                            result.band.color = 'Grau';
                        }
                        if (value.match(/rot/i)) {
                            result.band.color = 'rot';
                        }
                        if (value.match(/Blau/i)) {
                            result.band.color = 'Blau';
                        }
                        if (value.match(/Schwarz/i)) {
                            result.band.color = 'Schwarz';
                        }
                        if (value.match(/Grün/i)) {
                            result.band.color = 'Grün';
                        }
                        if (value.match(/gold/i)) {
                            result.band.color = 'Gold';
                        }
                        if (value.match(/Weiß/i)) {
                            result.band.color = 'Weiß';
                        }
                        if (value.match(/Silber/i)) {
                            result.band.color = 'Silber';
                        }
                        if (value.match(/Braun/i)) {
                            result.band.color = 'Braun';
                        }
                        if (value.match(/rose gold/i)) {
                            result.band.color = 'Rose Gold';
                        }
                        // band material
                        if (value.match(/alligator/i)) {
                            result.band.material = 'Alligatorleder';
                            result.band.materials.push('Alligatorleder');
                        }
                        if (value.match(/Stahl/i)) {
                            result.band.material = 'rostfreier Stahl';
                            result.band.materials.push('rostfreier Stahl');
                        }
                        if (value.match(/rose gold/i)) {
                            result.band.material = 'rose gold';
                            result.band.materials.push('rose gold');
                        }
                        if (value.match(/gelbes Gold/i)) {
                            result.band.material = 'gelbes Gold';
                            result.band.materials.push('gelbes Gold');
                        }
                        if (value.match(/aluminium/i)) {
                            result.band.material = 'aluminium';
                            result.band.materials.push('aluminium');
                        }
                        if (value.match(/titan/i)) {
                            result.band.material = 'titan';
                            result.band.materials.push('titan');
                        }
                        if (value.match(/Gummi/i)) {
                            result.band.material = 'Gummi';
                            result.band.materials.push('Gummi');
                        }
                        if (value.match(/Leder/i)) {
                            result.band.material = 'Leder';
                            result.band.materials.push('Leder');
                        }
                        if (value.match(/Kalbsleder/i)) {
                            result.band.material = 'Kalbsleder';
                            result.band.materials.push('Kalbsleder');
                        }
                        if (value.match(/Gurt/i)) {
                            result.band.type = 'Gurt';
                        }
                        if (value.match(/Armband/i)) {
                            result.band.type = 'Armband';
                        }
                        if (value.match(/Schließe/i)) {
                            result.band.buckle = 'Faltschließe';
                        }
                        if (value.match(/Schnalle/i)) {
                            result.band.buckle = 'Schnalle';
                        }
                        if (value.match(/Bereitsteller/i)) {
                            result.band.buckle = 'Bereitsteller';
                        }
                        if (value.match(/Stift/i)) {
                            result.band.buckle = 'Stift';
                        }
                    }
                    if (key === 'uhrwerk') {
                        pp = true;
                        const movement = value.match(/.*Manufakturwerk/);
                        if (movement) {
                            const movementType = value.match(/.*Manufakturwerk/)[0].replace("Manufakturwerk", "");
                            const manufacture = value.match(/Manufakturwerk.*/)[0].replace("Manufakturwerk", "");
                            result.caliber.reference = movementType;
                            result.caliber.manufacture = manufacture;
                        }
                    }
                    if (key === 'gangreserve') {
                        pp = true;
                        result.caliber.reserve = value;
                    }
                    if (key === "funktionen") {
                        pp = true;
                        result.feature = value.split(',').map(x => x.trim());
                    }
                    if (key === "frequenz der unruh") {
                        pp = true;
                        result.caliber.frequency = value;
                    }
                    result.caliber.brand = 'TAG Heuer';
                    result.caliber.label = 'Schweizerisch';
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
                    const cat = s.cat.toLowerCase();
                    if (value.match(/Roman/i)) {
                        result.dial.indexType = 'Roman';
                    }
                    if (value.match(/Arab/i)) {
                        result.dial.indexType = 'Arabic';
                    }
                    if (value.match(/Chrono/i)) {
                        result.dial.indexType = 'Chronograph';
                    }
                    if (value.match(/rhodium/i)) {
                        result.dial.handStyle = 'Rhodium';
                    }
                    if (value.match(/Luminous/i)) {
                        result.dial.handStyle = 'Luminous';
                    }
                    if (value.match(/baton/i)) {
                        result.dial.handStyle = 'Baton';
                    }
                    if (value.match(/gloss/i)) {
                        result.dial.finish = 'gloss';
                    }
                    if (value.match(/matte/i)) {
                        result.dial.finish = 'matte';
                    }
                    if (value.match(/sunburst/i)) {
                        result.dial.finish = 'sunburst';
                    }
                    if (value.match(/luminescent/i)) {
                        result.dial.finish = 'luminescent';
                    }
                    if (value.match(/Superluminova/i)) {
                        result.dial.finish = 'Superluminova';
                    }
                    if (value.match(/brushed/i)) {
                        result.dial.finish = 'brushed';
                    }
                    if (value.match(/satin/i)) {
                        result.dial.finish = 'satin';
                    }
                    if (value.match(/guilloche/i)) {
                        result.dial.finish = 'guilloche';
                    }
                    if (s.value.match(/oval/i)) {
                        result.case.shape = 'Oval';
                    }
                    else {
                        result.case.shape = 'Round';
                    }
                    if (key.indexOf('water') > -1) {
                        pp = true;
                        result.waterResistance = value;
                        result.case.waterResistance = value;
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
                    }
                    if (key === 'body case') {
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
                        if (value.match(/gloss/i)) {
                            result.dial.finish = 'gloss';
                        }
                        if (value.match(/matte/i)) {
                            result.dial.finish = 'matte';
                        }
                        if (value.match(/sunburst/i)) {
                            result.dial.finish = 'sunburst';
                        }
                        if (value.match(/luminescent/i)) {
                            result.dial.finish = 'luminescent';
                        }
                        if (value.match(/Superluminova/i)) {
                            result.dial.finish = 'Superluminova';
                        }
                        if (value.match(/brushed/i)) {
                            result.dial.finish = 'brushed';
                        }
                        if (value.match(/satin/i)) {
                            result.dial.finish = 'satin';
                        }
                        if (value.match(/guilloche/i)) {
                            result.dial.finish = 'guilloche';
                        }
                    }
                    if (key === 'color') {
                        if (cat === 'band') {
                            pp = true;
                            result.band.color = value;
                        }
                        if (cat === 'dial') {
                            pp = true;
                            result.dial.color = value;
                        }
                    }
                    if (key === 'caliber') {
                        if (value.toLowerCase().indexOf('quartz') > -1) {
                            pp = true;
                            result.caliber.type = 'quartz';
                        }
                        let strArr = value.split(' ');
                        strArr.forEach(element => {
                            if (parseInt(element)) {
                                pp = true;
                                result.caliber.reference = "Calibre " + element;
                            }
                        });
                    }
                    if (key === 'movement') {
                        pp = true;
                        result.caliber.type = value;
                    }
                    if (key === 'diameter') {
                        pp = true;
                        result.case.width = value;
                    }
                    if (key === 'size') {
                        pp = true;
                        result.case.width = value;
                    }
                    if (key === 'case back') {
                        pp = true;
                        result.case.back = value;
                    }
                    if (key === 'crystal') {
                        pp = true;
                        result.case.crystal = value;
                    }
                    if (key === 'bezel') {
                        pp = true;
                        result.bezel = value;
                    }
                    if (key === 'lugs') {
                        pp = true;
                        result.case.lugMaterial = value;
                    }
                    if (key === 'strap material') {
                        pp = true;
                        result.band.material = value;
                        result.band.materials.push(value);
                    }
                    if (key === 'buckle') {
                        pp = true;
                        result.band.buckle = value;
                    }
                    if (key === 'finishing') {
                        if (cat === 'dial') {
                            pp = true;
                            result.dial.finish = value;
                        }
                    }
                    if (key === 'material') {
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
                        if (value.toLowerCase().indexOf('quartz') > -1) {
                            pp = true;
                            result.caliber.type = 'Quartz'
                        }
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value;
                    }
                    if (key === 'winding system') {
                        pp = true;
                        result.caliber.type = value;
                    }
                    if (key === 'windingSystem') {
                        pp = true;
                        result.caliber.type = value;
                    }
                    if (key === 'functions') {
                        pp = true;
                        result.feature = value.split(',').map(x => x.trim());
                    }
                    if (key === "balance frequency") {
                        pp = true;
                        result.caliber.frequency = value;
                    }
                    result.caliber.brand = 'TAG Heuer';
                    result.caliber.label = 'Swiss';
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
