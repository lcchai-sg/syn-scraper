import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const PageCount = 24;
        const cats = [];
        const urls = [];
        let id = 0;
        const $ = cheerio.load((client.get(entry)).data);
        $('main .pm-collection').each((idx, el) => {
            const name = $(el).find('h2 title').text();
            const url = $(el).find('p a.action').attr('href');
            result.items[name] = [];
            cats.push({ id, name, url });
        });
        for (const cat of cats) {
            if (cat.id < 5) {
                result.collections.push(cat.name);
            }
            const subCats = [];
            const $$ = cheerio.load((client.get(cat.url)).data);
            $$('main .pm-collection').each((idx, el) => {
                const name = $$(el).find('h2.pm-title').text().trim();
                let url = $$(el).find('p a.action').attr('href');
                if (url.endsWith('product')) url = url.replace('product', 'catalog');
                subCats.push({ name, url });
            });
            if (subCats.length > 0) {
                for (const subCat of subCats) {
                    client.get(subCat.url).then(res => {
                        const $$$ = cheerio.load((client.get(subCat.url)).data);
                        const count = parseInt($$$('span#cat_number').attr('data-counter'));
                        const totalPage = Math.ceil(count / PageCount);
                        for (let i = 0; i < totalPage; i++) {
                            const _$ = (i === 0) ? $$$ : cheerio.load((client.get(subCat.url + '?p=' + (i + 1))).data);
                            _$('li.item.product.product-item.product-item-watch').each((idx, el) => {
                                const href = _$(el).find('a.product-item-link').attr('href');
                                const thumbnail = _$(el).find('img.photo.image').attr('src');
                                let reference = _$(el).find('img.photo.image').attr('alt');
                                if (reference) {
                                    reference = reference.substr(reference.lastIndexOf('SKU') + 3).trim();
                                }
                                const name = _$(el).find('.product.name.product-item-name').text().trim();
                                const material = _$(el).find('.product.material').text().trim();
                                const retail = _$(el).find('.price-box .price-wrapper .price').text().trim();
                                if (urls.indexOf(href) === -1) {
                                    urls.push(href);
                                }
                                result.items[cat.name].push({
                                    source: 'official',
                                    url: href,
                                    thumbnail,
                                    collection: cat.name,
                                    subCollection: subCat.name,
                                    lang,
                                    name,
                                    reference,
                                    material,
                                    retail
                                })
                            })
                        }
                        observer.next({ ...context, result });
                        observer.complete();
                    })
                }
            } else {
                let count;
                let page = 0;
                do {
                    count = 0;
                    const link = client.get(cat.url + '?p=' + (page));
                    client.get(link).then(res => {
                        const data = res.data;
                        const results = [];
                        const _$ = cheerio.load(data);
                        _$('li.item.product.product-item.product-item-watch').each((idx, el) => {
                            const href = _$(el).find('a.product-item-link').attr('href');
                            const thumbnail = _$(el).find('img.photo.image').attr('src');
                            let reference = _$(el).find('img.photo.image').attr('alt');
                            if (reference) {
                                reference = reference.substr(reference.lastIndexOf('SKU') + 3).trim();
                            }
                            const name = _$(el).find('.product.name.product-item-name').text().trim();
                            const material = _$(el).find('.product.material').text().trim();
                            const retail = _$(el).find('.price-box .price-wrapper .price').text().trim();
                            if (urls.indexOf(href) === -1) {
                                urls.push(href);
                            }
                            count++;
                            result.items[cat.name].push({
                                source: 'official',
                                url: href,
                                thumbnail,
                                collection: cat.name,
                                lang,
                                name,
                                reference,
                                material,
                                retail
                            })
                        });
                        observer.next({ ...context, results });
                        observer.complete();
                    });
                    page++;
                } while (!(count < 24));
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
        const PageCount = 24;
        const cats = [];
        const urls = [];
        let id = 0;
        const $ = cheerio.load((await client.get(entry)).data);
        $('main .pm-collection').each((idx, el) => {
            const name = $(el).find('h2 title').text();
            const url = $(el).find('p a.action').attr('href');
            cats.push({ id, name, url });
        });
        for (const cat of cats) {
            const subCats = [];
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('main .pm-collection').each((idx, el) => {
                const name = $$(el).find('h2.pm-title').text().trim();
                let url = $$(el).find('p a.action').attr('href');
                if (url.endsWith('product')) url = url.replace('product', 'catalog');
                subCats.push({ name, url });
                result.items[name] = [];
                result.collections.push({ collection: cat.name, subCollection: name });
            });
            if (subCats.length > 0) {
                for (const subCat of subCats) {
                    const $$$ = cheerio.load((await client.get(subCat.url)).data);
                    const count = parseInt($$$('span#cat_number').attr('data-counter'));
                    const totalPage = Math.ceil(count / PageCount);
                    for (let i = 0; i < totalPage; i++) {
                        const _$ = (i === 0) ? $$$ : cheerio.load((await client.get(subCat.url + '?p=' + (i + 1))).data);
                        _$('li.item.product.product-item.product-item-watch').each((idx, el) => {
                            const href = _$(el).find('a.product-item-link').attr('href');
                            const thumbnail = _$(el).find('img.photo.image').attr('src');
                            let reference = _$(el).find('img.photo.image').attr('alt');
                            if (reference) {
                                reference = reference.substr(reference.lastIndexOf('SKU') + 3).trim();
                            }
                            const name = _$(el).find('.product.name.product-item-name').text().trim();
                            const material = _$(el).find('.product.material').text().trim();
                            const retail = _$(el).find('.price-box .price-wrapper .price').text().trim();
                            if (urls.indexOf(href) === -1) {
                                urls.push(href);
                            }
                            result.items[subCat.name].push({
                                source: 'official',
                                url: href,
                                thumbnail,
                                collection: cat.name,
                                subCollection: subCat.name,
                                lang,
                                name,
                                reference,
                                material,
                                retail
                            });
                        })
                    }
                }
            } else {
                result.items[cat.name] = [];
                result.collections.push({ collection: cat.name, subCollection: cat.name });
                let count;
                let page = 0;
                do {
                    count = 0;
                    const _$ = (page === 0) ? $$ : cheerio.load((await client.get(cat.url + '?p=' + (page))).data);
                    _$('li.item.product.product-item.product-item-watch').each((idx, el) => {
                        const href = _$(el).find('a.product-item-link').attr('href');
                        const thumbnail = _$(el).find('img.photo.image').attr('src');
                        let reference = _$(el).find('img.photo.image').attr('alt');
                        if (reference) {
                            reference = reference.substr(reference.lastIndexOf('SKU') + 3).trim();
                        }
                        const name = _$(el).find('.product.name.product-item-name').text().trim();
                        const material = _$(el).find('.product.material').text().trim();
                        const retail = _$(el).find('.price-box .price-wrapper .price').text().trim();
                        if (urls.indexOf(href) === -1) {
                            urls.push(href);
                        }
                        count++;
                        result.items[cat.name].push({
                            source: 'official',
                            url: href,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            name,
                            reference,
                            material,
                            retail
                        });
                    });
                    page++;
                } while (!(count < 24));
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
        const { client, entry, lang, brand, brandID, thumbnail, retail } = context;
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
        const name = $('.product.attribute.name').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        const reference = $('.product-info-sku').text().trim();
        const description = $('.description-wrapper').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.name = name;
        result.reference = reference;
        result.description = description;
        result.gender = 'M';
        result.collection = entry.split('-omega-')[1].split('-')[0];
        $('.pm-feature-tooltip a').each((idx, el) => {
            const key = 'Features';
            const value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.spec.push({ key, value });
        });
        $('.product-info-data-content.technical-data.watches li').each((idx, el) => {
            const key = $(el).find('strong').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            const value = $(el).find('span').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.spec.push({ key, value });
        });
        $('.pm-grid-center.pm-module-37-title').each((idx, el) => {
            const key = 'Caliber';
            const value = $(el).find('h2').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.spec.push({ key, value });
        });
        $('.pm-module-37-pictos li').each((idx, el) => {
            const value = $(el).find('span').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            switch (lang) {
                case 'zh':
                    if (value.match(/小时/i)) {
                        const key = 'Power Reserve';
                        result.spec.push({ key, value });
                    }
                    else {
                        const key = 'Caliber Type';
                        result.spec.push({ key, value });
                    }
                    break;
                case 'jp':
                    if (value.match(/時間/i)) {
                        const key = 'Power Reserve';
                        result.spec.push({ key, value });
                    }
                    else {
                        const key = 'Caliber Type';
                        result.spec.push({ key, value });
                    }
                    break;
                case 'hk':
                    if (value.match(/小時/i)) {
                        const key = 'Power Reserve';
                        result.spec.push({ key, value });
                    }
                    else {
                        const key = 'Caliber Type';
                        result.spec.push({ key, value });
                    }
                    break;
                case 'de':
                    if (value.match(/stunden/i)) {
                        const key = 'Power Reserve';
                        result.spec.push({ key, value });
                    }
                    else {
                        const key = 'Caliber Type';
                        result.spec.push({ key, value });
                    }
                    break;
                default:
                    if (value.match(/hours/i)) {
                        const key = 'Power Reserve';
                        result.spec.push({ key, value });
                    }
                    else {
                        const key = 'Caliber Type';
                        result.spec.push({ key, value });
                    }
                    break;
            }
        });
        result.retail = retail;
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
                    if (value.match(/aufgeschmissen/i)) {
                        result.case.back = 'aufgeschmissen';
                    }
                    if (value.match(/durchschauen/i)) {
                        result.case.back = 'durchschauen';
                    }
                    if (value.match(/voll zurück/i)) {
                        result.case.back = 'voll zurück';
                    }
                    if (value.match(/solide/i)) {
                        result.case.back = 'Solide';
                    }
                    if (value.match(/festschrauben/i)) {
                        result.case.back = 'Festschrauben';
                    }
                    if (value.match(/transparent/i)) {
                        result.case.back = 'Transparent';
                    }
                    if (key === 'features') {
                        pp = true;
                        result.feature.push(value);
                    }
                    if (key === 'zwischen den bandanstößen:') {
                        pp = true;
                        result.band.lugWidth = value.trim();
                    }
                    if (key === 'armband:') {
                        pp = true;
                        result.band.type = 'Armband';
                        // band material
                        if (s.value.match(/alligator/i)) {
                            result.band.material = 'Alligatorleder';
                            result.band.materials.push('Alligatorleder');
                        }
                        if (s.value.match(/stahl/i)) {
                            result.band.material = 'rostfreier stahl';
                            result.band.materials.push('rostfreier stahl');
                        }
                        if (s.value.match(/roségold/i)) {
                            result.band.material = 'roségold';
                            result.band.materials.push('roségold');
                        }
                        if (s.value.match(/gelbes gold/i)) {
                            result.band.material = 'gelbes gold';
                            result.band.materials.push('gelbes gold');
                        }
                        if (s.value.match(/aluminium/i)) {
                            result.band.material = 'aluminium';
                            result.band.materials.push('aluminium');
                        }
                        if (s.value.match(/titan/i)) {
                            result.band.material = 'Titan';
                            result.band.materials.push('Titan');
                        }
                        if (s.value.match(/gummi/i)) {
                            result.band.material = 'Gummi';
                            result.band.materials.push('Gummi');
                        }
                        if (s.value.match(/leder/i)) {
                            result.band.material = 'Leder';
                            result.band.materials.push('Leder');
                        }
                        if (s.value.match(/kalbsleder/i)) {
                            result.band.material = 'Kalbsleder';
                            result.band.materials.push('Kalbsleder');
                        }
                        if (s.value.match(/grau/i)) {
                            result.band.color = 'Grau';
                        }
                        if (s.value.match(/rot/i)) {
                            result.band.color = 'rot';
                        }
                        if (s.value.match(/blau/i)) {
                            result.band.color = 'Blau';
                        }
                        if (s.value.match(/schwarz/i)) {
                            result.band.color = 'schwarz';
                        }
                        if (s.value.match(/grün/i)) {
                            result.band.color = 'Grün';
                        }
                        if (s.value.match(/gold/i)) {
                            result.band.color = 'Gold';
                        }
                        if (s.value.match(/weiß/i)) {
                            result.band.color = 'Weiß';
                        }
                        if (s.value.match(/silber/i)) {
                            result.band.color = 'Silber';
                        }
                        if (s.value.match(/braun/i)) {
                            result.band.color = 'braun';
                        }
                        if (s.value.match(/roségold/i)) {
                            result.band.color = 'Roségold';
                        }
                    }
                    if (key === 'gehäuse:') {
                        pp = true;
                        if (value.match(/stahl/i)) {
                            result.case.material = 'Rostfreier Stahl';
                            result.case.materials.push('Rostfreier Stahl');
                        }
                        if (value.match(/roségold/i)) {
                            result.case.material = 'Roségold';
                            result.case.materials.push('Roségold');
                        }
                        if (value.match(/gelbes Gold/i)) {
                            result.case.material = 'gelbes Gold';
                            result.case.materials.push('gelbes Gold');
                        }
                        if (value.match(/weißes Gold/i)) {
                            result.case.material = 'Weißes Gold';
                            result.case.materials.push('Weißes Gold');
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
                    if (key === 'gehäusedurchmesser:') {
                        pp = true;
                        result.case.width = value
                    }
                    if (key === 'zifferblattfarbe:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'uhrenglas:') {
                        pp = true;
                        if (value.match(/saphir/i)) {
                            result.case.crystal = 'Saphir';
                        }
                        if (value.match(/gewölbt/i)) {
                            result.dial.finish = 'Gewölbt';
                        }
                    }
                    if (key === 'wasserdichtigkeit:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (value.match(/stunden/i)) {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'caliber type') {
                        pp = true;
                        if (value.toLowerCase().includes('selbstaufzug') > -1) {
                            pp = true;
                            result.caliber.type = 'automatisch'
                        }
                        if (value.toLowerCase().indexOf('handbuch' || 'handaufzug') > -1) {
                            pp = true;
                            result.caliber.type = 'Handaufzug'
                        }
                        if (value.toLowerCase().indexOf('quarz') > -1) {
                            pp = true;
                            result.caliber.type = 'Quarz'
                        }
                    }
                    result.caliber.brand = 'Omega';
                    result.caliber.label = 'Schweizerisch';
                    result.related = related;
                    result.description = description;
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
            case 'hk':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (value.match(/擰/i)) {
                        result.case.back = '擰';
                    }
                    if (value.match(/透視/i)) {
                        result.case.back = '看穿';
                    }
                    if (value.match(/後衛/i)) {
                        result.case.back = '全後衛';
                    }
                    if (value.match(/固體/i)) {
                        result.case.back = '固體';
                    }
                    if (value.match(/擰緊/i)) {
                        result.case.back = '擰緊';
                    }
                    if (value.match(/透明/i)) {
                        result.case.back = '透明';
                    }
                    if (key === 'features') {
                        pp = true;
                        result.feature.push(value);
                    }
                    if (key === '表耳之間闊度:') {
                        pp = true;
                        result.band.lugWidth = value.trim().split(':')[1];
                    }
                    if (key === '表鏈帶:') {
                        pp = true;
                        result.band.type = '手鐲';
                        // band material
                        if (s.value.match(/鱷魚/i)) {
                            result.band.material = '鱷魚皮';
                        }
                        if (s.value.match(/鋼/i)) {
                            result.band.material = '不銹鋼';
                        }
                        if (s.value.match(/玫瑰金/i)) {
                            result.band.material = '不銹鋼';
                        }
                        if (s.value.match(/黃金/i)) {
                            result.band.material = '黃金';
                        }
                        if (s.value.match(/鋁/i)) {
                            result.band.material = '鋁';
                        }
                        if (s.value.match(/鈦/i)) {
                            result.band.material = '鈦';
                        }
                        if (s.value.match(/橡膠/i)) {
                            result.band.material = '橡膠';
                        }
                        if (s.value.match(/皮革/i)) {
                            result.band.material = '皮革';
                        }
                        if (s.value.match(/小牛皮/i)) {
                            result.band.material = '小牛皮';
                        }
                        if (s.value.match(/灰色/i)) {
                            result.band.color = '灰色';
                        }
                        if (s.value.match(/紅色/i)) {
                            result.band.color = '紅色';
                        }
                        if (s.value.match(/藍色/i)) {
                            result.band.color = '藍色';
                        }
                        if (s.value.match(/黑色/i)) {
                            result.band.color = '黑色';
                        }
                        if (s.value.match(/綠色/i)) {
                            result.band.color = '綠色';
                        }
                        if (s.value.match(/金/i)) {
                            result.band.color = '金';
                        }
                        if (s.value.match(/白色/i)) {
                            result.band.color = '白色';
                        }
                        if (s.value.match(/銀/i)) {
                            result.band.color = '銀';
                        }
                        if (s.value.match(/棕色/i)) {
                            result.band.color = '棕色';
                        }
                        if (s.value.match(/玫瑰金/i)) {
                            result.band.color = '玫瑰金';
                        }
                    }
                    if (key === '表殼:') {
                        pp = true;
                        if (value.match(/鋼/i)) {
                            result.case.material = '不銹鋼';
                            result.case.materials.push('不銹鋼');
                        }
                        if (value.match(/玫瑰金/i)) {
                            result.case.material = '玫瑰金';
                            result.case.materials.push('玫瑰金');
                        }
                        if (value.match(/黃金/i)) {
                            result.case.material = '黃金';
                            result.case.materials.push('黃金');
                        }
                        if (value.match(/白金/i)) {
                            result.case.material = '白金';
                            result.case.materials.push('白金');
                        }
                        if (value.match(/鋁/i)) {
                            result.case.material = '鋁';
                            result.case.materials.push('鋁');
                        }
                        if (value.match(/鈦/i)) {
                            result.case.material = '鈦';
                            result.case.materials.push('鈦');
                        }
                    }
                    if (key === '表殼直徑:') {
                        pp = true;
                        result.case.width = value.split(':')[1];
                    }
                    if (key === '表面顏色:') {
                        pp = true;
                        result.dial.color = value.trim().split(':')[1];
                    }
                    if (key === '水晶鏡面:') {
                        pp = true;
                        if (value.match(/藍寶石/i)) {
                            result.case.crystal = '藍寶石';
                        }
                        if (value.match(/圓弧形/i)) {
                            result.dial.finish = '圓弧形';
                        }
                    }
                    if (key === '防水性能:') {
                        pp = true;
                        result.waterResistance = value.trim().split(':')[1];
                        result.case.waterResistance = value.trim().split(':')[1];
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'caliber type') {
                        pp = true;
                        if (value.toLowerCase().includes('自動上弦') > -1) {
                            pp = true;
                            result.caliber.type = '自動'
                        }
                        if (value.toLowerCase().indexOf('手冊' || '手動上鍊' || '手動上弦') > -1) {
                            pp = true;
                            result.caliber.type = '手風'
                        }
                        if (value.toLowerCase().indexOf('石英') > -1) {
                            pp = true;
                            result.caliber.type = '石英'
                        }
                    }
                    result.caliber.brand = 'Omega';
                    result.caliber.label = '瑞士';
                    result.related = related;
                    result.description = description;
                    const data = [];
                    if (!pp) {
                        const key = s.key.replace(':', '').trim();
                        const value = s.value.trim()
                        data.push({ key, value })
                    }
                    for (const singleData of data) {
                        const temp = {};
                        temp[singleData.key] = singleData.value.split(':')[1];
                        result.additional.push(temp);
                    }
                }
                break;
            case 'zh':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (value.match(/拧/i)) {
                        result.case.back = '拧';
                    }
                    if (value.match(/透视/i)) {
                        result.case.back = '看穿';
                    }
                    if (value.match(/后卫/i)) {
                        result.case.back = '全后卫';
                    }
                    if (value.match(/固体/i)) {
                        result.case.back = '固体';
                    }
                    if (value.match(/拧紧/i)) {
                        result.case.back = '拧紧';
                    }
                    if (value.match(/透明/i)) {
                        result.case.back = '透明';
                    }
                    if (key === 'features') {
                        pp = true;
                        result.feature.push(value);
                    }
                    if (key === '表耳间距:') {
                        pp = true;
                        result.band.lugWidth = value.trim().split(':')[1];
                    }
                    if (key === '表链:') {
                        pp = true;
                        result.band.type = '手镯';
                        // band material
                        if (s.value.match(/鳄鱼/i)) {
                            result.band.material = '鳄鱼皮';
                            result.band.materials.push('鳄鱼皮');
                        }
                        if (s.value.match(/钢/i)) {
                            result.band.material = '钢';
                            result.band.materials.push('钢');
                        }
                        if (s.value.match(/玫瑰金/i)) {
                            result.band.material = '玫瑰金';
                            result.band.materials.push('玫瑰金');
                        }
                        if (s.value.match(/黄金/i)) {
                            result.band.material = '黄金';
                            result.band.materials.push('黄金');
                        }
                        if (s.value.match(/铝/i)) {
                            result.band.material = '铝';
                            result.band.materials.push('铝');
                        }
                        if (s.value.match(/钛/i)) {
                            result.band.material = '钛';
                            result.band.materials.push('钛');
                        }
                        if (s.value.match(/橡胶/i)) {
                            result.band.material = '橡胶';
                            result.band.materials.push('橡胶');
                        }
                        if (s.value.match(/皮革/i)) {
                            result.band.material = '皮革';
                            result.band.materials.push('皮革');
                        }
                        if (s.value.match(/小牛皮/i)) {
                            result.band.material = '小牛皮';
                            result.band.materials.push('小牛皮');
                        }
                        if (s.value.match(/灰色/i)) {
                            result.band.color = '灰色';
                        }
                        if (s.value.match(/红色/i)) {
                            result.band.color = '红色';
                        }
                        if (s.value.match(/蓝色/i)) {
                            result.band.color = '蓝色';
                        }
                        if (s.value.match(/黑色/i)) {
                            result.band.color = '黑色';
                        }
                        if (s.value.match(/绿色/i)) {
                            result.band.color = '绿色';
                        }
                        if (s.value.match(/金/i)) {
                            result.band.color = '金';
                        }
                        if (s.value.match(/白色/i)) {
                            result.band.color = '白色';
                        }
                        if (s.value.match(/银/i)) {
                            result.band.color = '银';
                        }
                        if (s.value.match(/棕色/i)) {
                            result.band.color = '棕色';
                        }
                        if (s.value.match(/玫瑰金/i)) {
                            result.band.color = '玫瑰金';
                        }
                    }
                    if (key === '表壳:') {
                        pp = true;
                        if (value.match(/钢/i)) {
                            result.case.material = '不锈钢';
                            result.case.materials.push('不锈钢');
                        }
                        if (value.match(/玫瑰金/i)) {
                            result.case.material = '玫瑰金';
                            result.case.materials.push('玫瑰金');
                        }
                        if (value.match(/黄金/i)) {
                            result.case.material = '黄金';
                            result.case.materials.push('黄金');
                        }
                        if (value.match(/白金/i)) {
                            result.case.material = '白金';
                            result.case.materials.push('白金');
                        }
                        if (value.match(/铝/i)) {
                            result.case.material = '铝';
                            result.case.materials.push('铝');
                        }
                        if (value.match(/钛/i)) {
                            result.case.material = '钛';
                            result.case.materials.push('钛');
                        }
                    }
                    if (key === '表壳直径:') {
                        pp = true;
                        result.case.width = value.split(':')[1];
                    }
                    if (key === '表盘颜色:') {
                        pp = true;
                        result.dial.color = value.trim().split(':')[1];
                    }
                    if (key === '表镜:') {
                        pp = true;
                        if (value.match(/蓝宝石/i)) {
                            result.case.crystal = '蓝宝石';
                        }
                        if (value.match(/弧拱形/i)) {
                            result.dial.finish = '弧拱形';
                        }
                    }
                    if (key === '防水性能:') {
                        pp = true;
                        result.waterResistance = value.trim().split(':')[1];
                        result.case.waterResistance = value.trim().split(':')[1];
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'caliber type') {
                        pp = true;
                        if (value.toLowerCase().includes('自动上弦') > -1) {
                            pp = true;
                            result.caliber.type = '自动'
                        }
                        if (value.toLowerCase().indexOf('手册' || '手动上链' || '手动上弦') > -1) {
                            pp = true;
                            result.caliber.type = '手风'
                        }
                        if (value.toLowerCase().indexOf('石英') > -1) {
                            pp = true;
                            result.caliber.type = '石英'
                        }
                    }
                    result.caliber.brand = 'Omega';
                    result.caliber.label = '瑞士';
                    result.related = related;
                    result.description = description;
                    const data = [];
                    if (!pp) {
                        const key = s.key.replace(':', '').trim();
                        const value = s.value.trim()
                        data.push({ key, value })
                    }
                    for (const singleData of data) {
                        const temp = {};
                        temp[singleData.key] = singleData.value.split(':')[1];
                        result.additional.push(temp);
                    }
                }
                break;
            case 'jp':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (value.match(/スクリュー/i)) {
                        result.case.back = 'ねじ込み';
                    }
                    if (value.match(/シースルー/i)) {
                        result.case.back = '透けて見える';
                    }
                    if (value.match(/フルバック/i)) {
                        result.case.back = 'フルバック';
                    }
                    if (value.match(/固体/i)) {
                        result.case.back = '固体';
                    }
                    if (value.match(/ねじ込み/i)) {
                        result.case.back = 'ねじ止め';
                    }
                    if (value.match(/トランスペアレント/i)) {
                        result.case.back = 'トランスペアレント';
                    }
                    if (key === 'features') {
                        pp = true;
                        result.feature.push(value);
                    }
                    if (key === 'ラグの間のサイズ :') {
                        pp = true;
                        result.band.lugWidth = value.trim();
                    }
                    if (key === 'ブレスレット :') {
                        pp = true;
                        const text = value.replace(/\s/g, '');
                        result.band.type = 'ブレスレット';
                        // band material
                        if (text.match(/アリゲーター/i)) {
                            result.band.material = 'ワニ革';
                            result.band.materials.push('ワニ革');
                        }
                        if (text.match(/鋼/i)) {
                            result.band.material = 'ステンレス鋼';
                            result.band.materials.push('ステンレス鋼');
                        }
                        if (text.match(/ローズゴールド/i)) {
                            result.band.material = 'ローズゴールド';
                            result.band.materials.push('ローズゴールド');
                        }
                        if (text.match(/イエローゴールド/i)) {
                            result.band.material = 'イエローゴールド';
                            result.band.materials.push('イエローゴールド');
                        }
                        if (text.match(/アルミニウム/i)) {
                            result.band.material = 'アルミニウム';
                            result.band.materials.push('アルミニウム');
                        }
                        if (text.match(/チタン/i)) {
                            result.band.material = 'チタン';
                            result.band.materials.push('チタン');
                        }
                        if (text.match(/ゴム/i)) {
                            result.band.material = 'ゴム';
                            result.band.materials.push('ゴム');
                        }
                        if (text.match(/レザー/i)) {
                            result.band.material = 'レザー';
                            result.band.materials.push('レザー');
                        }
                        if (text.match(/カーフスキン/i)) {
                            result.band.material = 'カーフスキン';
                            result.band.materials.push('カーフスキン');
                        }
                        if (text.match(/グレー/i)) {
                            result.band.color = 'グレー';
                        }
                        if (text.match(/赤/i)) {
                            result.band.color = '赤';
                        }
                        if (text.match(/青い/i)) {
                            result.band.color = '青い';
                        }
                        if (text.match(/黒/i)) {
                            result.band.color = '黒';
                        }
                        if (text.match(/緑/i)) {
                            result.band.color = '緑';
                        }
                        if (text.match(/ゴールド/i)) {
                            result.band.color = 'ゴールド';
                        }
                        if (text.match(/白い/i)) {
                            result.band.color = '白い';
                        }
                        if (text.match(/銀/i)) {
                            result.band.color = '銀';
                        }
                        if (text.match(/褐色/i)) {
                            result.band.color = '褐色';
                        }
                        if (text.match(/ローズゴールド/i)) {
                            result.band.color = 'ローズゴールド';
                        }
                    }
                    if (key === 'ケース :') {
                        pp = true;
                        const text = value.replace(/\s/g, '');
                        if (text.match(/鋼/i)) {
                            result.case.material = 'ステンレス鋼';
                            result.case.materials.push('ステンレス鋼');
                        }
                        if (text.match(/ローズゴールド/i)) {
                            result.case.material = 'ローズゴールド';
                            result.case.materials.push('ローズゴールド');
                        }
                        if (text.match(/イエローゴールド/i)) {
                            result.case.material = 'イエローゴールド';
                            result.case.materials.push('イエローゴールド');
                        }
                        if (text.match(/白金/i)) {
                            result.case.material = '白金';
                            result.case.materials.push('白金');
                        }
                        if (text.match(/アルミニウム/i)) {
                            result.case.material = 'アルミニウム';
                            result.case.materials.push('アルミニウム');
                        }
                        if (text.match(/チタン/i)) {
                            result.case.material = 'チタン';
                            result.case.materials.push('チタン');
                        }
                    }
                    if (key === 'ケース直径 :') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'ダイアルの色 :') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'クリスタル風防 :') {
                        pp = true;
                        if (value.match(/サファイア/i)) {
                            result.case.crystal = 'サファイア';
                        }
                        if (value.match(/ドーム型/i)) {
                            result.dial.finish = 'ドーム型';
                        }
                    }
                    if (key === '防水 :') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'caliber type') {
                        pp = true;
                        if (value.toLowerCase().includes('自動巻き') > -1) {
                            pp = true;
                            result.caliber.type = '自動'
                        }
                        if (value.toLowerCase().indexOf('マニュアル' || '手巻き') > -1) {
                            pp = true;
                            result.caliber.type = '手風'
                        }
                        if (value.toLowerCase().indexOf('石英') > -1) {
                            pp = true;
                            result.caliber.type = '石英'
                        }
                    }
                    result.caliber.brand = 'Omega';
                    result.caliber.label = 'スイス';
                    result.related = related;
                    result.description = description;
                    const data = [];
                    if (!pp) {
                        const key = s.key.replace(':', '').trim();
                        const value = s.value.trim()
                        data.push({ key, value })
                    }
                    for (const singleData of data) {
                        const temp = {};
                        temp[singleData.key] = singleData.value.split(':')[1];
                        result.additional.push(temp);
                    }
                }
                break;
            default:
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
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
                    if (value.match(/Transparent/i)) {
                        result.case.back = 'Transparent';
                    }
                    if (key === 'features') {
                        pp = true;
                        result.feature.push(value);
                    }
                    if (key === 'between lugs:') {
                        pp = true;
                        result.band.lugWidth = value.trim();
                    }
                    if (key === 'bracelet:') {
                        pp = true;
                        result.band.type = 'Bracelet';
                        // band material
                        if (s.value.match(/alligator/i)) {
                            result.band.material = 'Alligator Leather';
                            result.band.materials.push('Alligator Leather');
                        }
                        if (s.value.match(/steel/i)) {
                            result.band.material = 'stainless steel';
                            result.band.materials.push('stainless steel');
                        }
                        if (s.value.match(/rose gold/i)) {
                            result.band.material = 'rose gold';
                            result.band.materials.push('rose gold');
                        }
                        if (s.value.match(/yellow gold/i)) {
                            result.band.material = 'yellow gold';
                            result.band.materials.push('yellow gold');
                        }
                        if (s.value.match(/aluminium/i)) {
                            result.band.material = 'aluminium';
                            result.band.materials.push('aluminium');
                        }
                        if (s.value.match(/titanium/i)) {
                            result.band.material = 'titanium';
                            result.band.materials.push('titanium');
                        }
                        if (s.value.match(/rubber/i)) {
                            result.band.material = 'rubber';
                            result.band.materials.push('rubber');
                        }
                        if (s.value.match(/leather/i)) {
                            result.band.material = 'Leather';
                            result.band.materials.push('Leather');
                        }
                        if (s.value.match(/calfskin/i)) {
                            result.band.material = 'Calfskin';
                            result.band.materials.push('Calfskin');
                        }
                        if (s.value.match(/grey/i)) {
                            result.band.color = 'Grey';
                        }
                        if (s.value.match(/red/i)) {
                            result.band.color = 'Red';
                        }
                        if (s.value.match(/blue/i)) {
                            result.band.color = 'Blue';
                        }
                        if (s.value.match(/black/i)) {
                            result.band.color = 'Black';
                        }
                        if (s.value.match(/green/i)) {
                            result.band.color = 'Green';
                        }
                        if (s.value.match(/gold/i)) {
                            result.band.color = 'Gold';
                        }
                        if (s.value.match(/white/i)) {
                            result.band.color = 'White';
                        }
                        if (s.value.match(/silver/i)) {
                            result.band.color = 'Silver';
                        }
                        if (s.value.match(/brown/i)) {
                            result.band.color = 'Brown';
                        }
                        if (s.value.match(/rose gold/i)) {
                            result.band.color = 'Rose Gold';
                        }
                    }
                    if (key === 'case:') {
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
                    if (key === 'case diameter:') {
                        pp = true;
                        result.case.width = value
                    }
                    if (key === 'dial color:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'crystal:') {
                        pp = true;
                        if (value.match(/sapphire/i)) {
                            result.case.crystal = 'Sapphire';
                        }
                        if (value.match(/Domed/i)) {
                            result.dial.finish = 'Domed';
                        }
                    }
                    if (key === 'water resistance:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'caliber') {
                        pp = true;
                        result.caliber.reference = value.trim();
                    }
                    if (key === 'power reserve') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'caliber type') {
                        pp = true;
                        if (value.toLowerCase().includes('self-winding' || 'self winding' || 'selfwinding') > -1) {
                            pp = true;
                            result.caliber.type = 'automatic'
                        }
                        if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                            pp = true;
                            result.caliber.type = 'hand wind'
                        }
                        if (value.toLowerCase().indexOf('quartz') > -1) {
                            pp = true;
                            result.caliber.type = 'quartz'
                        }
                    }
                    result.caliber.brand = 'Omega';
                    result.caliber.label = 'Swiss';
                    result.related = related;
                    result.description = description;
                    const data = [];
                    if (!pp) {
                        const key = s.key.replace(':', '').trim();
                        const value = s.value.trim()
                        data.push({ key, value })
                    }
                    for (const singleData of data) {
                        const temp = {};
                        temp[singleData.key] = singleData.value.split(':')[1];
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
