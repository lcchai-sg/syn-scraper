import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [
            {
                name: 'Men',
                url: 'https://www.gucci.com/us/en/ca/jewelry-watches/watches/watches-for-men-c-jewelry-watches-watches-men'
            },
            {
                name: 'Women',
                url: 'https://www.gucci.com/us/en/ca/jewelry-watches/watches/watches-for-women-c-jewelry-watches-watches-women'
            }
        ]
        for (const cat of cats) {
            result.collections.push(cat.name);
            result.items[cat.name] = [];
            client.get(cat.url).then(res => {
                const data = res.data;
                const results = [];
                const $ = cheerio.load(data);
                $('.product-tiles-grid-item.product-tiles-grid-item-medium.product-tiles-grid-item-small ').each((idx, el) => {
                    const url = base + $(el).find('a').attr('href');
                    const name = $(el).find('.product-tiles-grid-item-info h2').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const thumbnail = 'https:' + $(el).find('.carousel-image-wrapper img').attr('src');
                    const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                    const reference = $(el).find('a').attr('id');
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        name,
                        retail,
                        reference
                    })
                });
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
        const { client, base, brand, brandID, lang } = context;
        const result: any = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [
            {
                name: 'Men',
                url: 'https://www.gucci.com/us/en/ca/jewelry-watches/watches/watches-for-men-c-jewelry-watches-watches-men'
            },
            {
                name: 'Women',
                url: 'https://www.gucci.com/us/en/ca/jewelry-watches/watches/watches-for-women-c-jewelry-watches-watches-women'
            }
        ]
        for (const cat of cats) {
            result.collections.push(cat.name);
            result.items[cat.name] = [];
            const $ = cheerio.load((await client.get(cat.url)).data);
            $('.product-tiles-grid-item.product-tiles-grid-item-medium.product-tiles-grid-item-small ').each((idx, el) => {
                const url = base + $(el).find('a').attr('href');
                const name = $(el).find('.product-tiles-grid-item-info h2').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const thumbnail = 'https:' + $(el).find('.carousel-image-wrapper img').attr('src');
                const retail = $(el).find('.price').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
                const reference = $(el).find('a').attr('id');
                result.items[cat.name].push({
                    source: 'official',
                    url,
                    thumbnail,
                    collection: cat.name,
                    lang,
                    name,
                    retail,
                    reference
                })
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
        const { client, entry, lang, brand, brandID, base, thumbnail } = context;
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
        result.name = $('.productnameandprice-container-standard h1').text().trim() ? $('.productnameandprice-container-standard h1').text().trim() : '';
        result.retail = $('.price-column.product-detail-price-column').text().split(/\r?\n/)[1].trim() ? $('.price-column.product-detail-price-column').text().split(/\r?\n/)[1].trim() : '';
        result.reference = $('.style-number-title ').text().trim() ? $('.style-number-title ').text().replace('Style', '').trim() : '';
        result.description = $('.product-detail p').text().trim() ? $('.product-detail p').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim() : '';
        if (entry.match(/watches-for-men/i)) {
            result.gender = 'M';
        }
        else {
            result.gender = 'F';
        }
        $('.product-detail li').each((idx, el) => {
            let pp = false;
            const value = $(el).text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
            let key = '';
            if (value.match(/case/i)) {
                pp = true;
                key = 'Case';
                result.spec.push({ key, value });
            }
            if (value.match(/movement/i)) {
                pp = true;
                key = 'Movement';
                result.spec.push({ key, value });
            }
            if (value.match(/water/i)) {
                pp = true;
                key = 'Water Resistance';
                result.spec.push({ key, value });
            }
            if (value.indexOf("YA") > -1) {
                pp = true;
                key = 'Calibre';
                result.spec.push({ key, value });
            }
            if (!pp) {
                key = 'Details';
                result.spec.push({ key, value });
            }
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
            brandID,
            name,
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
        result.caliber.brand = 'Gucci';
        result.caliber.label = 'Italy';
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
        result.case.width = name.split(',')[1].trim() ? name.split(',')[1].trim() : '';
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;
            if (key === 'case') {
                pp = true;
                const words = value.split(',');
                if (words) {
                    for (const word of words) {
                        if (word.match(/dial/i)) {
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
                        }
                        if (word.match(/case/i)) {
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
                        if (word.match(/bracelet/i)) {
                            result.band.type = 'Bracelet';
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
                        if (value.match(/Screw-Back/i)) {
                            result.case.back = 'Screw Back';
                        }
                        if (value.match(/screw-locked/i)) {
                            result.case.back = 'Screw Locked';
                        }
                        if (value.match(/Screw/i)) {
                            result.case.back = 'Screw';
                        }
                        if (value.match(/Transparent/i)) {
                            result.case.back = 'Transparent';
                        }
                        if (value.match(/See-through/i)) {
                            result.case.back = 'See Through';
                        }
                    }
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
                if (value.match(/sunbrushed/i)) {
                    result.dial.finish = 'Sunbrushed';
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
            if (key === 'movement') {
                pp = true;
                if (value.toLowerCase().indexOf('automatic' || 'self-winding' || 'self winding' || 'selfwinding') > -1) {
                    result.caliber.type = 'Automatic';
                }
                if (value.toLowerCase().indexOf('manual' || 'manual winding' || 'hand winding') > -1) {
                    result.caliber.type = 'Hand wind';
                }
                if (value.toLowerCase().indexOf('quartz') > -1) {
                    result.caliber.type = 'Quartz';
                }
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.replace('Water resistance:', '').trim();
                result.case.waterResistance = value.replace('Water resistance:', '').trim();
            }
            if (key === 'calibre') {
                pp = true;
                result.caliber.reference = value.trim();
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
