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
        $('nav#main_navigation .collection_models .left_panel a').each((idx, el) => {
            const href = $(el).attr('href');
            const name = $(el).find('.family_name')
                .contents().filter((idx, e) => e.type === 'text')
                .text().trim();
            let countT = $(el).find('.family_name .number_of_models').text();
            const count = parseInt(countT.substr(0, countT.indexOf(' ')));
            const url = base + href.substr(1);
            if (name !== 'Watch Finder') {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url, count });
            }
        });

        for (const cat of cats) {
            client.get(cat.url).then(res => {
                const $$ = cheerio.load((client.get(cat.url)).data);
                $$('section.articles div.article').each((idx, el) => {
                    const href = $$(el).find('a').attr('href');
                    const reference = $$(el).find('.article_footer .article_ref').text().trim();
                    const material = $$(el).find('.article_footer .code_or').text().trim();
                    const collection = $$(el).find('.article_footer .collection_name').text().trim();
                    const thumbnail = $$(el).find('picture img').attr('data-src');
                    result.items[cat.name].push({
                        source: 'official',
                        url: base + href.substr(1),
                        thumbnail,
                        collection,
                        reference,
                        material,
                        lang
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
        const { client, entry, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const $ = cheerio.load((await client.get(entry)).data);
        $('nav#main_navigation .collection_models .left_panel a').each((idx, el) => {
            const href = $(el).attr('href');
            const name = $(el).find('.family_name')
                .contents().filter((idx, e) => e.type === 'text')
                .text().trim();
            let countT = $(el).find('.family_name .number_of_models').text();
            const count = parseInt(countT.substr(0, countT.indexOf(' ')));
            const url = base + href.substr(1);
            if (name !== 'Watch Finder') {
                result.collections.push(name);
                result.items[name] = [];
                cats.push({ name, url, count });
            }
        });

        for (const cat of cats) {
            const $$ = cheerio.load((await client.get(cat.url)).data);
            $$('section.articles div.article').each((idx, el) => {
                const href = $$(el).find('a').attr('href');
                const reference = $$(el).find('.article_footer .article_ref').text().trim();
                const material = $$(el).find('.article_footer .code_or').text().trim();
                const collection = $$(el).find('.article_footer .collection_name').text().trim();
                const thumbnail = $$(el).find('picture img').attr('data-src');
                result.items[cat.name].push({
                    source: 'official',
                    url: base + href.substr(1),
                    thumbnail,
                    collection,
                    reference,
                    material,
                    lang
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
            thumbnail
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('section.introduction h1 .reference').text();
        const collection = $('section.introduction h1 .complication').text();
        const movementType = $('section.introduction h1 .caliber_type_header').text();
        result.name = $('.introduction_header h1').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.reference = reference;
        result.collection = collection;
        result.movementType = movementType;
        result.description = $('section.introduction .article_description .articleDescription').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim().trim();
        result.retail = $('#product_price').text().trim();
        result.gender = 'X';
        $('section.introduction .article_description .article_flexbox_right_content').each((idx, el) => {
            result.spec.push({
                key: $(el).find('.article_flexbox_right_content_title').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim(),
                value: $(el).find('.article_flexbox_right_content_text').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim()
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
        result.caliber.brand = 'Patek Philippe';
        result.caliber.label = 'Switzerland';
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
            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
            if (key === 'watch') {
                pp = true;
                const words = value.split('.');
                if (words) {
                    for (const word of words) {
                        if (word.match(/caliber/i)) {
                            result.caliber.reference = word.trim();
                        }
                        if (word.match(/movement/i)) {
                            if (value.match(/self-winding/i) || (/selfwinding/i) || (/self winding/i)) {
                                pp = true;
                                result.caliber.type = 'automatic'
                            }
                            if (value.match(/manual/i) || (/manual winding/i) || (/hand winding/i)) {
                                pp = true;
                                result.caliber.type = 'hand wind'
                            }
                            if (value.match(/quartz/i)) {
                                pp = true;
                                result.caliber.type = 'quartz'
                            }
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
                // finish
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
                if (value.match(/embossed/i)) {
                    result.dial.finish = 'embossed';
                }
            }
            if (value.match(/domed/i)) {
                result.case.crystal = 'Domed Sapphire';
            }
            if (value.match(/sapphire/i)) {
                result.case.crystal = 'Sapphire';
            }
            if (value.match(/screwed/i)) {
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
            if (key === 'case') {
                pp = true;
                const words = value.split('.')
                if (words) {
                    for (const word of words) {
                        if (word.match(/resistant/i)) {
                            result.waterResistance = word.replace('Water resistant to', '').trim();
                            result.case.waterResistance = word.replace('Water resistant to', '').trim();
                        }
                    }
                }
                if (value.match(/diameter/i)) {
                    const diameter = value.split(/Diameter:/i);
                    if (diameter) {
                        const firstvariable = ":";
                        const secondvariable = " ";
                        const ref = diameter[1].match(new RegExp(firstvariable + "(.*)" + secondvariable));
                        if (ref) {
                            const reference = ref[1].trim().split(' ')[0] ? ref[1].trim().split(' ')[0] + ' mm' : '';
                            result.case.width = reference;
                        }
                    }
                }
                if (value.match(/height/i)) {
                    const height = value.split(/Height:/i);
                    if (height) {
                        result.case.thickness = height[1].trim() ? height[1].trim() : '';
                    }
                }
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
            if (key === 'strap') {
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
                if (value.match(/polymer/i)) {
                    result.band.material = 'Polymer';
                    result.band.materials.push('Polymer');
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
