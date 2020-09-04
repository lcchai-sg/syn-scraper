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
        $('.nav__item.underline.parent ').each((idx, el) => {
            const word = $(el).find('a img').attr('alt');
            const url = base + $(el).find('a').attr('href');
            if (word && idx > 0) {
                const name = word.replace('>', '').trim();
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('.watch.notext.pure-u-1.pure-u-sm-1-2 ').each((idx, el) => {
                    const url = base + $$(el).attr('href');
                    const thumbnail = $$(el).find('.centered-img img').attr('data-srcset').split(' ')[0];
                    const name = $$(el).find('.centered-img img').attr('alt');
                    const reference = name.split(' ').pop();
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
                observer.next({ ...context, result });
                observer.complete();
            })
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
        $('.nav__item.underline.parent ').each((idx, el) => {
            const word = $(el).find('a img').attr('alt');
            const url = base + $(el).find('a').attr('href');
            if (word && idx > 0) {
                const name = word.replace('>', '').trim();
                cats.push({ name, url });
                result.collections.push(name);
                result.items[name] = [];
            }
        });
        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('.watch.notext.pure-u-1.pure-u-sm-1-2 ').each((idx, el) => {
                const url = base + $$(el).attr('href');
                const thumbnail = $$(el).find('.centered-img img').attr('data-srcset').split(' ')[0];
                const name = $$(el).find('.centered-img img').attr('alt');
                const reference = name.split(' ').pop();
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
        result.name = $('.swp-hero__title.swp-hero__title--desktop.htitle').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.description = $('.swp-hero__text p').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.retail = $('.price').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.reference = $('.dash.dash--standard-size.swp-specifications__watch-codes').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
        result.gender = 'X';
        $('.swp-slider .wrapper ul div div div li a ').each((idx, el) => {
            const related = $(el).find(' div .watch-block__price').text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            result.related.push(related);
        });
        $('.swp-hero__specs-item ').each((idx, el) => {
            const key = $(el).text().split(':')[0].replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).text().split(':')[1].replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            result.spec.push({ key, value });
        });
        $('.swp-specifications__specs-item ').each((idx, el) => {
            const key = $(el).find('strong').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            const value = $(el).find('span').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
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
                    if (key === 'uhrwerk') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === 'grösse') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'gewicht') {
                        pp = true;
                        result.weight = value.trim();
                    }
                    if (key === 'gehäusehöhe:') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === 'wasserdichtigkeit:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'glas:') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === 'gehäuseboden:') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === 'gehäuse & lünette:') {
                        pp = true;
                        result.bezel.material = value.trim();
                        result.bezel.materials.push(value.trim());
                    }
                    if (key === 'geschlecht:') {
                        pp = true;
                        if (value.match(/frau/i)) {
                            result.gender = 'F';
                        }
                        if (value.match(/herren/i)) {
                            result.gender = 'M';
                        }
                        if (value.match(/unisex/i)) {
                            result.gender = 'X';
                        }
                    }
                    if (key === 'gehäuseform:') {
                        pp = true;
                        result.case.shape = value.trim();
                    }
                    if (key === 'gehäusefarbe:') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === 'zifferblatt:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'gangreserve:') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'armband:') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    result.caliber.brand = 'Rado';
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
            case 'hk':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === '機芯') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === '尺寸') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === '總重量') {
                        pp = true;
                        result.weight = value.trim();
                    }
                    if (key === '厚度:') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === '防水性能:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === '水晶:') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === '底蓋:') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === '錶盤和錶殼:') {
                        pp = true;
                        result.bezel.material = value.trim();
                        result.bezel.materials.push(value.trim());
                    }
                    if (key === '性別:') {
                        pp = true;
                        if (value.match(/女人/i)) {
                            result.gender = 'F';
                        }
                        if (value.match(/男子/i)) {
                            result.gender = 'M';
                        }
                        if (value.match(/男女通用/i)) {
                            result.gender = 'X';
                        }
                    }
                    if (key === '形狀:') {
                        pp = true;
                        result.case.shape = value.trim();
                    }
                    if (key === '錶殼顏色:') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === '錶盤:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === '動力儲存機芯:') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === '錶鏈:') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    result.caliber.brand = 'Rado';
                    result.caliber.label = '瑞士';
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
            case 'zh':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === '机芯') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === '尺寸') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === '总重量') {
                        pp = true;
                        result.weight = value.trim();
                    }
                    if (key === '厚度:') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === '防水性能:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === '表镜:') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === '底盖:') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === '表壳和表圈:') {
                        pp = true;
                        result.bezel.material = value.trim();
                        result.bezel.materials.push(value.trim());
                    }
                    if (key === '性别:') {
                        pp = true;
                        if (value.match(/女人/i)) {
                            result.gender = 'F';
                        }
                        if (value.match(/男子/i)) {
                            result.gender = 'M';
                        }
                        if (value.match(/男女通用/i)) {
                            result.gender = 'X';
                        }
                    }
                    if (key === '形状:') {
                        pp = true;
                        result.case.shape = value.trim();
                    }
                    if (key === '表壳颜色:') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === '表盘:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === '动力存储:') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === '表链:') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    result.caliber.brand = 'Rado';
                    result.caliber.label = '瑞士';
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
            case 'jp':
                for (const s of spec) {
                    let pp = false;
                    const key = s.key.toLowerCase();
                    const value = s.value;
                    if (key === 'ムーブメント') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === 'サイズ') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === '総重量') {
                        pp = true;
                        result.weight = value.trim();
                    }
                    if (key === '厚さ:') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === '防水性:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'クリスタル:') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === 'ケースバック:') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === 'ケース＆ベゼル:') {
                        pp = true;
                        result.bezel.material = value.trim();
                        result.bezel.materials.push(value.trim());
                    }
                    if (key === '性別:') {
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
                    if (key === '形状:') {
                        pp = true;
                        result.case.shape = value.trim();
                    }
                    if (key === 'ケースカラー:') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === 'ダイアル:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'ムーブメント パワーリザーブ:') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'ブレスレット:') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    result.caliber.brand = 'Rado';
                    result.caliber.label = 'スイス';
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
                    if (key === 'movement') {
                        pp = true;
                        result.caliber.type = value.trim();
                    }
                    if (key === 'size') {
                        pp = true;
                        result.case.width = value.trim();
                    }
                    if (key === 'total weight') {
                        pp = true;
                        result.weight = value.trim();
                    }
                    if (key === 'thickness:') {
                        pp = true;
                        result.case.thickness = value.trim();
                    }
                    if (key === 'water resistance:') {
                        pp = true;
                        result.waterResistance = value.trim();
                        result.case.waterResistance = value.trim();
                    }
                    if (key === 'crystal:') {
                        pp = true;
                        result.case.crystal = value.trim();
                    }
                    if (key === 'case back:') {
                        pp = true;
                        result.case.back = value.trim();
                    }
                    if (key === 'case & bezel:') {
                        pp = true;
                        result.bezel.material = value.trim();
                        result.bezel.materials.push(value.trim());
                    }
                    if (key === 'gender:') {
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
                    if (key === 'shape:') {
                        pp = true;
                        result.case.shape = value.trim();
                    }
                    if (key === 'case color:') {
                        pp = true;
                        result.band.color = value.trim();
                    }
                    if (key === 'dial:') {
                        pp = true;
                        result.dial.color = value.trim();
                    }
                    if (key === 'movement power reserve:') {
                        pp = true;
                        result.caliber.reserve = value.trim();
                    }
                    if (key === 'bracelet:') {
                        pp = true;
                        result.band.material = value.trim();
                        result.band.materials.push(value.trim());
                    }
                    result.caliber.brand = 'Rado';
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
