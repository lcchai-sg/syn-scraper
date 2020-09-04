import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";
import Sitemapper from 'sitemapper';
import { clearEmpties } from "../utils";
import { Logger } from '@cosmos/logger';
import { dialColor } from '../spec-trainers/dialColor';
const logger = Logger.getLogger('cs:syno:Mido', 'debug')

const xmlIndexing = async (context) => {
    try {
        const { client, entry, brand, brandID, lang } = context;
        const result = { source: 'official', brand, brandID, lang, collections: [], items: {} };
        logger.debug(entry);
        let timeout = 300000;

        let sites = new Sitemapper({ url: entry, timeout, });
        let data = await sites.fetch();
        if (data) {
            for (const site of data.sites) {
                // https://www.midowatches.com/us/swiss-watches-collections/<watch type>-<collection>/<name>-<reference>
                // array length = 7 after split by '/'
                if (site.match('/swiss-watches-collections/') && site.split('/').length === 7) {
                    let d = site.split('/');
                    let col = d[d.length - 2].split('-');     // assume collection is last 2nd segment of url
                    let nameRef = d[d.length - 1].split('-'); // assume name/reference form last segment of url

                    let collection = col.slice(2, col.length).join(' ');   // split collection name, ignore first 2 words
                    let reference = nameRef[nameRef.length - 1]
                    let name = nameRef.slice(0, nameRef.length - 1).join(' ');

                    if (result.collections.indexOf(collection) < 0) {
                        result.collections.push(collection);
                        result.items[collection] = [];
                    }
                    result.items[collection].push({
                        url: site,
                        collection,
                        name,
                        reference,
                    })
                }
            }
        }
        return result;
    } catch (error) {
        logger.error('Failed for indexing class of Hamilton with error : ' + error);
        return [];
    }
}

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, brand, brandID, lang, entry } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((client.get(entry)).data);
        $('.slick__slide.slide  ').each((idx, el) => {
            const name = $(el).find('.field-content').text();
            const url = $(el).find('a').attr('href');
            if (name) {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url });
            }
        });
        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const page = cheerio.load((client.get(cat.url)).data);
                const items = scrapeInfiniteScrollItems(page, extractItems, 10000);
                for (let i = 0; i in items; i++) {
                    result.items[cat.name].push({
                        url: items[i],
                        lang,
                        source: 'official',
                        collection: cat.name
                    });
                }
                observer.next({ ...context, result });
                observer.complete();
            })
        }
    });
};

export const newIndexing = (context) => {
    return xmlIndexing(context);
    // return _indexing(context)
    //     .pipe(
    //         delay(5000),
    //         expand<any>((context, idx): any => {
    //             return context.results.length < 32 ? EMPTY :
    //                 _indexing({ ...context, page: idx + 1 })
    //                     .pipe(delay(1000));
    //         }),
    //         map(r => r.results)
    //     );
};

export const indexing = async (context) => {
    try {
        const { client, brand, brandID, lang, entry, base } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        logger.debug(entry);
        const $ = cheerio.load((await client.get(entry)).data);

        $('.collection-link').each((idx, el) => {
            const url = $(el).attr('href');
            const collection = $(el).text().trim();
            cats.push({ collection, url });
            result.collections.push(collection);
            result.items[collection] = [];
        })
        for (const cat of cats) {
            result.items[cat.collection] = [];
            let cnt = 0;
            let page = 0;
            do {
                cnt = 0;
                const link = cat.url + "?page=" + page;
                logger.debug(link)
                const d = (await client.get(link)).data;
                const $ = cheerio.load(d);
                $('.col-12.col-md-6.col-lg-4.my-2.my-lg-4').each((idx, el) => {
                    const url = base + $(el).find("a").attr("href");
                    const thumbnail = base + $(el).find("img").attr("src");
                    const name = $(el).find(".reference-collection").text().trim();
                    const reference = $(el).find(".reference-number").text().trim();
                    const price = $(el).find(".field--type-mido-price").text().trim();
                    result.items[cat.collection].push({
                        url, name, reference, price, thumbnail, collection: cat.collection,
                    });
                    cnt++;
                })
                page++;
		await new Promise(r => setTimeout(r, 1000));
            } while (cnt >= 12);
        }
        return result;
    } catch (error) {
        console.log('Failed indexing for Mido with error : ' + error)
        return [];
    }
};

export const extraction = async (context) => {
    try {
        const { client, entry, lang, brand, brandID, collection } = context;
        const base = "https://www.midowatches.com";
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            collection,
            scripts: [],
            spec: [],
            related: [],
            caliber: <any>{},
        };
        const $ = cheerio.load((await client.get(entry)).data);
        result.name = $('.page-title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = result.name.split(' ').pop();
        result.retail = $('.reference-price .h4').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        //result.description = $('.col-12.col-md-10.col-lg-8.offset-md-1.offset-lg-2.my-lg-2.text-justify p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.description = $('.col-12.col-md-10.col-lg-8.offset-md-1.offset-lg-2.my-lg-2.text-justify.mb-2.px-2').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.thumbnail = base + ($('.field--name-field-reference-top-image img').attr('src') ? $('.field--name-field-reference-top-image img').attr('src') : $('.col-12.col-md-6 .slider.watches-slider img').attr('src'));
        result.caliber.reference = $('.taxonomy-term.vocabulary-caliber-movement .field.field--name-name.field--type-string ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        $('.reference-price .h4').each((idx, el) => {
            if (idx === 0) {
                result.retail = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            }
        });
        // $('.col-12.col-md-6.col-lg-3.technical-details-items ul li').each((idx, el) => {
        //     const key = $(el).find('.field--label').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        //     const value = $(el).find('.field--item').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        //     if (key || value) {
        //         result.spec.push({ key, value });
        //     }
        // });
        $('.col-12.col-md-6.col-lg-3.technical-details-items').each((idx, el) => {
            const clazz = $(el).find('span').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            $(el).find('li').each((idx1, el1) => {
                const d = $(el1).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                let key = '';
                let value = '';
                if (d.indexOf(':') > 0) {
                    key = d.split('  ')[0];
                    value = d.split('  ')[1];
                } else {
                    value = d.split('  ')[0];
                }
                result.spec.push({ clazz, key, value });
            })
        });
        $('.image-caption').each((idx, el) => {
            const ref = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim().split(' ').pop();
            result.related.push(ref);
        });
        return result;
    } catch (error) {
        console.log('Failed extraction for Mido with error : ' + error)
        return [];
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
        result.caliber.brand = 'Mido';
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
            const clazz = s.clazz.toLowerCase();
            const key = s.key.toLowerCase();
            const value = s.value;

            // bracelet does not have key
            if (clazz === 'bracelet' && key === '') {
                // band material
                if (value && value.match(/leather/i)) {
                    pp = true;
                    result.band.material = 'Leather';
                    result.band.materials.push('Leather');
                }
                if (value && value.match(/calfskin/i)) {
                    pp = true;
                    result.band.material = 'Calfskin';
                    result.band.materials.push('Calfskin');
                }
                if (value && value.match(/alligator/i)) {
                    pp = true;
                    result.band.material = 'Alligator Leather';
                    result.band.materials.push('Alligator Leather');
                }
                if (value && value.match(/steel/i)) {
                    pp = true;
                    result.band.material = 'stainless steel';
                    result.band.materials.push('Stainless Steel');
                }
                if (value && value.match(/rose gold/i)) {
                    pp = true;
                    result.band.material = result.band.material ? result.band.material : 'Rose gold';
                    result.band.materials.push('Rose gold');
                }
                if (value && value.match(/yellow gold/i)) {
                    pp = true;
                    result.band.material = result.band.material ? result.band.material : 'Yellow gold';
                    result.band.materials.push('Yellow gold');
                }
                if (value && value.match(/aluminium/i)) {
                    pp = true;
                    result.band.material = result.band.material ? result.band.material : 'Aluminium';
                    result.band.materials.push('Aluminium');
                }
                if (value && value.match(/titanium/i)) {
                    pp = true;
                    result.band.material = result.band.material ? result.band.material : 'Titanium';
                    result.band.materials.push('Titanium');
                }
                if (value && value.match(/rubber/i)) {
                    pp = true;
                    result.band.material = 'Rubber';
                    result.band.materials.push('Rubber');
                }
                // band type
                if (value && value.match(/strap/i)) {
                    pp = true;
                    result.band.type = 'Strap';
                } else {
                    pp = true;
                    result.band.type = 'Bracelet';
                }
                // band color
                if (value && value.match(/pink/i)) {
                    result.band.color = 'Pink';
                }
                if (value && value.match(/orange/i)) {
                    result.band.color = 'Orange';
                }
                if (value && value.match(/khaki/i)) {
                    result.band.color = 'Khaki';
                }
                if (value && value.match(/beige/i)) {
                    result.band.color = 'Beige';
                }
                if (value && value.match(/grey/i)) {
                    result.band.color = 'Grey';
                }
                if (value && value.match(/red/i)) {
                    result.band.color = 'Red';
                }
                if (value && value.match(/blue/i)) {
                    result.band.color = 'Blue';
                }
                if (value && value.match(/black/i)) {
                    result.band.color = 'Black';
                }
                if (value && value.match(/green/i)) {
                    result.band.color = 'Green';
                }
                if (value && value.match(/gold/i)) {
                    result.band.color = 'Gold';
                }
                if (value && value.match(/white/i)) {
                    result.band.color = 'White';
                }
                if (value && value.match(/silver/i)) {
                    result.band.color = 'Silver';
                }
                if (value && value.match(/brown/i)) {
                    result.band.color = 'Brown';
                }
                if (value && value.match(/rose gold/i)) {
                    result.band.color = 'Rose Gold';
                }
            }
            // case
            if (clazz === 'case' && key === 'material:') {
                pp = true;
                result.case.material = value.trim();
                result.case.materials.push(value.trim());
            }
            if (clazz === 'case' && key === 'diameter:') {
                pp = true;
                result.case.width = value.trim();
            }
            if (clazz === 'case' && key === 'between lugs:') {
                pp = true;
                result.band.lugWidth = value.trim();
            }
            if (clazz === 'case' && key === 'water-resistance:') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (clazz === 'case' && key === 'crystal:') {
                pp = true;
                if (value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            if (clazz === 'case' && key === 'case height:') {
                pp = true;
                result.case.thickness = value.trim();
            }
            if (clazz === 'case' && value.match(/screw/i)) {
                pp = true;
                result.case.back = 'Screwed';
            }
            if (clazz === 'case' && value.match(/see-through/i)) {
                pp = true;
                result.case.back = 'See through';
            }
            if (clazz === 'case' && value.match(/full back/i)) {
                pp = true;
                result.case.back = 'Full back';
            }
            if (clazz === 'case' && value.match(/Solid/i)) {
                pp = true;
                result.case.back = 'Solid';
            }
            if (clazz === 'case' && value.match(/screw-down/i)) {
                pp = true;
                result.case.back = 'Screw down';
            }
            if (clazz === 'case' && value.match(/Transparent/i)) {
                pp = true;
                result.case.back = 'Transparent';
            }
            if (clazz === 'case' && value.match(/diamond/i)) {
                pp = true;
                result.case.gemSet = value.replace('Case set with ', '');
            }

            // Movement = Caliber
            if (clazz === 'movement' && key === 'movement type:') {
                pp = true;
                result.caliber.type = value.trim();
            }
            if (clazz === 'movement' && key === '') {
                pp = true;
                result.caliber.function.push(value);
            }

            // Dial
            if (clazz === 'dial' && key === 'dial colour:') {
                pp = true;
                result.dial.color = value.trim();
            }
            if (clazz === 'dial' && key === 'hour markers:') {
                pp = true;
                result.dial.indexType = value.trim();
            }
            if (clazz === 'dial' && key === '') {
                if (value && value.match(/diamond/i)) {
                    pp = true;
                    result.dial.gemSet = value.replace('Dial set with ', '');
                }
            }
            // if (value.match(/mido caliber/i)) {
            //     pp = true;
            // }

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
        if (url.match(/lady/i)) {
            result.gender = 'F';
        } else {
            result.gender = 'M';
        }
        clearEmpties(result);
        return result;
    } catch (error) {
        console.log('Failed distillation for Mido with error : ' + error)
        return [];
    }
};

function extractItems() {
    const extractedElements: any = document.querySelectorAll('.col-12.col-md-6.col-lg-4.my-2.my-lg-4 .reference a');
    const items = [];
    const temp = [];
    for (let element of extractedElements) {
        const base = 'https://www.midowatches.com';
        const url = base + element.getAttribute('href').toString().replace('javascript:;', '').trim();
        temp.push(url);
    }
    for (let i = 0; i in temp; i++) {
        if (i % 2 !== 0) {
            items.push(temp[i]);
        }
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
