import cheerio from 'cheerio';

import { clearEmpties } from "../utils";

export const indexing = async (context) => {
    const { client, entry, brand, brandID, lang } = context;
    const result = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];
    const $ = cheerio.load((await client.get(entry)).data);
    $('#mega-menu #watches-menu li:nth-child(1) .level0.submenu li.level1').each((idx, el) => {
        const title = $(el).find('.a').text();
        const cc = [];
        $(el).find('.level1.submenu li a').each((idx, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            cc.push({ collection: title, subCollection: name, url: `${href}` })
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
        const { client, entry, lang, brand, brandID, collection, subCollection } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            collection,
            subCollection,
            scripts: [],
            spec: [],
            related: [],
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $("meta[property='og:title']").attr("content")
        result.reference = reference;
        result.thumbnail = $("meta[property='og:image']").attr("content");
        let name = $('.product-name h1').text().trim();
        if (!name) {
            name = subCollection + " " + reference;
        }
        result.name = name;
        $('.products.wrapper.grid.products-grid.products-upsell ol').each((idx, el) => {
            if (idx === 0) {
                const ref = $(el).find('.product-item-link').text().replace(/(?:\r\n|\r|\n|\s+)/g, "|").trim();
                if (ref && ref.split("||").length > 0) {
                    const rel = ref.split("||");
                    rel.forEach(x => {
                        if (x) {
                            result.related.push(x);
                        }
                    })
                }
            }
        });
        $('.price-container ').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        let key = '';
        const keys = [];
        const values = [];
        let materialCount = 1;
        $('.additional-attributes-wrapper dl dt').each((idx, el) => {
            key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            if (key === '材质:') {
                key = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim().split(':')[0] + materialCount + ':';
                materialCount++;
            }
            keys.push(key);
        });
        $('.additional-attributes-wrapper dl dd').each((idx, el) => {
            const value = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
            values.push(value);
        });
        keys.map((key, i) => {
            const value = values[i];
            result.spec.push({ key, value });
        });
        if (result.spec.length == 0) {
            $('.product-info-list li').each((idx, el) => {
                if (idx > 0) {
                    key = $(el).text().trim().replace(/(?:\r\n|\r|\n|\s+)/g, " ");
                    let data = key.split(':');
                    result.spec.push({
                        "key": data[0].trim(),
                        "value": data[1].trim()
                    })
                }
            });
        }
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
        result.caliber.label = '瑞士';
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
        result.feature = [];
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            if (key === '形状:') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === '表扣:') {
                pp = true;
                result.band.buckle = value.trim();
            }
            if (key === '防水性能:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === '尺寸:') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === '表镜:') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === '机芯:') {
                pp = true;
                result.caliber.reference = value.trim();
            }
            if (key === '机芯类型:') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === '机芯类型') {
                pp = true;
                let res = value.trim().split(' ');
                result.caliber.reference = res[0];
                let res2 = res.shift();
                res.forEach(element => {
                    let sub = element.split('，');
                    sub.forEach(subElement => {
                        if (subElement.match(/机芯/i)) {
                            result.caliber.type = subElement.trim();
                        }
                        if (subElement.match(/振动/i)) {
                            result.caliber.frequency = subElement.trim();
                        }
                        if (subElement.match(/动力储存/i)) {
                            result.caliber.reserve = subElement.trim();
                        }
                    })
                });
            }
            if (key === '功能:') {
                pp = true;
                result.feature = value.split('、').map(x => x.trim());
            }
            if (key === '表带材质' || key === '材质2:') {
                pp = true;
                result.band.material = value.trim().trim();
                result.band.materials.push(value.trim().trim());
            }
            if (key === '颜色:' || key === '表盘颜色') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === '表壳材质' || key === '材质1:') {
                pp = true;
                result.bezel.material = value.trim();
                result.bezel.materials.push(value.trim());
            }
            if (key === '指针:' || key === '表盘指针') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === '运行时间:' || key === '表盘刻度') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === '钻石:') {
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

function extractItems() {

    const extractedElements: any = document.querySelectorAll('.item.product.product-item .item-name a');
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
