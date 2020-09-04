import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

import { clearEmpties } from "../utils";

export const indexing = async (context) => {
    const { client, entry, brand, brandID, lang, base } = context;
    const result = { source: 'official', brand, brandID, collections: [], items: {} };
    const cats = [];
    const urls = {};
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        await page.goto(entry, { waitUntil: 'load' });
        const data = await page.evaluate(() => document.body.innerHTML);
        const $ = cheerio.load(data);
        $('#root-content .items-wrapper .item.watch').each((idx, el) => {
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

        // const cat = cats[0];
        for (const cat of cats) {
            console.log('Handle', cat.collection, cat.subCollection);
            await page.goto(cat.url, { waitUntil: 'load' });
            try {
                await page.waitForSelector("#section-watch > div.section-content.width-breakpoint > div.watches-grid > div > div.button-wrapper > button");
                await page.click("#section-watch > div.section-content.width-breakpoint > div.watches-grid > div > div.button-wrapper > button");
                await page.waitFor("#section-watch > div.section-content.width-breakpoint > div.watches-grid > div > div.button-wrapper > button", { hidden: true });
            } catch (e) { }
            const data = await page.evaluate(() => document.body.innerHTML);
            const $$ = cheerio.load(data);
            $$('.watches-grid .watch-wrapper').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                if (urls[href]) {
                    let payload = urls[href];
                    if (!payload.collections) payload.collections = [payload.collection];
                    if (!payload.subCollections) payload.subCollections = [payload.subCollection];
                    if (payload.collections.indexOf(cat.collection) < 0)
                        payload.collections.push(cat.collection);
                    if (payload.subCollections.indexOf(cat.subCollection) < 0)
                        payload.subCollections.push(cat.subCollection);
                    return;
                }
                const url = `${base}${href}`;
                const thumbnail = $$(el).find('img').attr('src');
                const name = $$(el).find('.text-watch .name').text().trim();
                const ref = $$(el).find('.text-watch .ref').text().trim();
                const link = $$(el).find('a').text().trim();

                const payload = {
                    source: 'official',
                    url,
                    thumbnail: `${base}${thumbnail}`,
                    collection: cat.collection,
                    subCollection: cat.subCollection,
                    lang,
                    name,
                    reference: ref.replace(/\./g, ''),
                    urlName: link
                };
                urls[href] = payload;
                result.items[cat.collection].push(payload);
            });
        }
        await browser.close();
    }
    catch (error) {
        console.log(error);
        await browser.close();
    } finally {
        await browser.close();
    }
    return result;
};

export const extraction = async (context) => {
    const { client,
        entry,
        brand,
        brandID,
        productID,
        lang,
        name,
        reference,
        thumbnail,
        collection,
        subCollection,
        proxy,
        base
    } = context;
    const result: any = {
        source: 'official',
        url: entry,
        brand,
        brandID,
        collection,
        subCollection,
        name,
        reference,
        thumbnail,
        lang,
        spec: [],
        related: []
    };
    if (productID) result.productID = productID;
    const pparg = ['--no-sandbox',
        '--disable-setuid-sandbox'];
    if (proxy) pparg.push(`--proxy-server=${proxy}`);
    const browser = await puppeteer.launch({
        headless: true,
        args: pparg
    });
    try {
        const page = await browser.newPage();
        await page.goto(entry, { waitUntil: 'load' });
        try {
            await page.waitForSelector("#watch-detail-description > div.side-right > div.prices-buttons-wrapper > div.prices-wrapper > div.prices-display");
            await page.click("#watch-detail-description > div.side-right > div.prices-buttons-wrapper > div.prices-wrapper > div.prices-display");
            await page.waitFor("#watch-detail-description > div.side-right > div.prices-buttons-wrapper > div.prices-wrapper > div.prices-display", { hidden: true });
        } catch (e) { }
        const data = await page.evaluate(() => document.body.innerHTML);
        const $$ = cheerio.load(data);
        result.retail = $$('.prices-amonth .prices-price').text().trim();
        $$('.caract-content.hide-onmobile .caract-item').each((idx, tab) => {
            const cat = $$(tab).attr('data-pimkey');
            $$(tab).find('li').each((idx, item) => {
                const text = $$(item).text();
                const [key, value] = text.split(':');
                result.spec.push({
                    cat,
                    key: key.trim().toLowerCase(),
                    value: value.trim().toLowerCase()
                });
            })
        });
        await browser.close();
    }
    catch (error) {
        console.log(error);
        await browser.close();
    } finally {
        await browser.close();
    }
    return result;
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
            if (key === '形狀') {
                pp = true;
                result.case.shape = value.trim();
            }
            if (key === '材質' && s.cat === 'case') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (key === '表镜') {
                pp = true;
                result.case.crystal = value.trim();
            }
            if (key === '尺寸') {
                pp = true;
                result.case.width = value.trim();
            }
            if (key === '防水性能') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === '顏色' && s.cat === 'dial') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (key === '運行時間' || key === '表盘刻度') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (key === '指針' || key === '表盘指针') {
                pp = true;
                result.dial.handStyle = value.trim();
            }
            if (key === '機芯類型') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (key === '機芯') {
                pp = true;
                const x = hasNumber(value.trim());
                const word = value.split('，');
                if (x === true && value.match(/l/i)) {
                    result.caliber.reference = value;
                }
                if (word) {
                    pp = true;
                    word.forEach(element => {
                        let sub = element.split('，');
                        sub.forEach(subElement => {
                            if (subElement.match(/振動/i)) {
                                result.caliber.frequency = subElement.trim();
                            }
                            if (subElement.match(/動力儲存/i)) {
                                result.caliber.reserve = subElement.trim();
                            }
                        })
                    });
                }
            }
            if (key === '功能') {
                pp = true;
                result.feature = value.split('、').map(x => x.trim());
            }
            if (key === '材質') {
                pp = true;
                result.band.material = value.trim().trim();
                result.band.materials.push(value.trim().trim());
            }
            if (key === '顏色' && s.cat === 'bracelet') {
                pp = true;
                result.band.color = value.trim().trim();
            }
            if (key === '表扣') {
                pp = true;
                result.band.buckle = value.trim();
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

function hasNumber(myString) {
    return /\d/.test(myString);
}
