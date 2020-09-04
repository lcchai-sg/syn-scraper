import cheerio from 'cheerio';

import { clearEmpties } from "../utils";

export const indexing = async (context) => {
    const { client, entry, brand, brandID, lang, base } = context;
    const result = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];
    const urls = {};
    const $ = cheerio.load((await client.get(entry)).data);
    $('.item.watch').each((idx, el) => {
        const title = $(el).find('.item-title').text();
        const cc = [];
        $(el).find('li a').each((idx, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            cc.push({ collection: title, subCollection: name, url: `${base}${href}` })
        });
        result.collections.push(title);
        result.items[title] = [];
        cats.push(...cc);
    });
    for (const cat of cats) {
        const page = cheerio.load((await client.get(cat.url)).data);
        const items = await scrapeInfiniteScrollItems(page, extractItems, 10000);
        for (let i = 0; i in items; i++) {
            result.items[cat.collection].push({
                url: items[i],
                lang,
                source: 'official',
                collection: cat.collection,
                subcollection: cat.subCollection
            })
        }
    }
    return result;
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
            thumbnail,
            scripts: [],
            spec: [],
            related: [],
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('.watch-ref ').text().trim();
        $('.prices-amonth .prices-price').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        let materialCount = 1;
        $('.caract-item.desktop.tablet li').each((idx, el) => {
            let key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(':')[0].trim();
            const value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(':')[1].trim();
            if (key === '素材') {
                key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(':')[0].trim() + ' ' + materialCount;
                materialCount++;
            }
            result.spec.push({ key, value });
        });
        result.name = $('.v-align-div h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = reference;
        let breadcrumbs = '';
        let words = [];
        $('.widget-ariane ').each((idx, el) => {
            if (idx === 0) {
                breadcrumbs = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                breadcrumbs.split('/').map((text) => {
                    words.push(text.trim())
                });
            }
        });
        if (words.length > 0) {
            if (words[3]) {
                result.collection = words[1];
                result.subcollection = words[2];
            }
            else {
                result.collection = words[1];
            }
        }
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
        result.caliber.label = 'スイス';
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
            if (value.match(/coating/i)) {
                result.dial.finish = 'Coating'
            }
            if (value.match(/rotating/i)) {
                result.bezel = 'Rotating'
            }
            if (key === '形') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === 'バックル') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === '防水') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'ダイアモンド') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'サイズ') {
                pp = true;
                result.case.width = value.split('X')[0];
            }
            if (key === '素材 1') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === 'ガラス') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === 'キャリバー') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === 'ムーブメントタイプ') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === 'power reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === '機能') {
                pp = true;
                result.feature = value.split('、').map(x => x.trim());
            }
            if (key === '素材 2') {
                pp = true;
                result.band.material = value.trim();
                result.band.materials.push(value.trim());
            }
            if (key === 'インデックス') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === '針') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === 'カラー') {
                pp = true;
                result.dial.color = value.trim();
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

function extractItems() {
    const extractedElements: any = document.querySelectorAll('.watch-wrapper a');
    const items = [];
    for (let element of extractedElements) {
        var url = element.getAttribute('href')
        items.push(url);
    }
    return items;
}

async function scrapeInfiniteScrollItems(page, extractItems, itemTargetCount, scrollDelay = 1000) {
    let items = [];
    try {
        let previousHeight;
        while (items.length < itemTargetCount) {
            items = await page.evaluate(extractItems);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
        }
    } catch (e) { }
    return items;
}
