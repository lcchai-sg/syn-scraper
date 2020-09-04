import cheerio from 'cheerio';
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const categories = [];
        const $ = cheerio.load((client.get(entry)).data);

        $('.detail-list').each((idx, element) => {
            $(element).find('.grid-1').each((i, elem) => {
                $(elem).find('a').each((x, el) => {
                    const catLink = $(el).attr('href');
                    categories.push((base.concat(catLink)));
                })
            })
        });

        let href;
        let collection;
        let thumbnail;
        let name;
        let url;
        let retail;

        categories.shift();
        for (var watchLink of categories) {
            client.then(res => {
                const data = res.data;
                const results = [];
                const watchDetail = cheerio.load((client.get(watchLink)).data);
                watchDetail('.contents-body').find('.model-list').each((idx, element) => {
                    $(element).find('.column').each((x, elem) => {
                        $(elem).find('.info').each((ind, el) => {
                            href = base.concat($(el).find('a').attr('href'));
                            collection = $(el).find('a').attr('href').split('/')[3];
                            url = base.concat($(el).find('a').attr('href'));
                            name = $(el).find('a h5').text();
                            retail = '$ ' + $(el).find('a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(' ')[5];
                            thumbnail = $(el).find('.product-figure .figure img').attr('src');
                        });
                    });
                    thumbnail = 'https:'.concat(thumbnail);

                    //creating the result object with collections and items
                    if (result.collections.indexOf(collection) === -1) {
                        result.collections.push(collection);
                        result.items[collection] = [];
                    }

                    //populating the result items
                    result.items[collection].push({
                        source: 'official',
                        url: url,
                        name: name,
                        thumbnail: thumbnail,
                        collection: collection,
                        reference: name,
                        retail: retail,
                        lang
                    });
                    observer.next({ ...context, results });
                    observer.complete();
                });
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
        const { client, entry, brand, brandID, base, lang } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const categories = [];
        const $ = cheerio.load((await client.get(entry)).data);

        $('.detail-list').each((idx, element) => {
            $(element).find('.grid-1').each((i, elem) => {
                $(elem).find('a').each((x, el) => {
                    const catLink = $(el).attr('href');
                    categories.push((base.concat(catLink)));
                })
            })
        });

        let href;
        let collection;
        let thumbnail;
        let name;
        let url;
        let retail;

        categories.shift();
        for (var watchLink of categories) {
            const watchDetail = cheerio.load((await client.get(watchLink)).data);
            watchDetail('.contents-body').find('.model-list').each((idx, element) => {
                $(element).find('.column').each((x, elem) => {
                    $(elem).find('.info').each((ind, el) => {
                        href = base.concat($(el).find('a').attr('href'));
                        collection = $(el).find('a').attr('href').split('/')[3];
                        url = base.concat($(el).find('a').attr('href'));
                        name = $(el).find('a h5').text();
                        retail = '$ ' + $(el).find('a').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").split(' ')[5];
                        thumbnail = $(el).find('.product-figure .figure img').attr('src');
                    })
                })
                thumbnail = 'https:'.concat(thumbnail);

                //creating the result object with collections and items
                if (result.collections.indexOf(collection) === -1) {
                    result.collections.push(collection);
                    result.items[collection] = [];
                }

                //populating the result items
                result.items[collection].push({
                    source: 'official',
                    url: url,
                    name: name,
                    thumbnail: thumbnail,
                    collection: collection,
                    reference: name,
                    retail: retail,
                    lang
                })
            })
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
        const { client, entry, lang, brand, brandID } = context;
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
        const name = $('div.head > div.name > h2').text().trim();
        const description = $('.feature-conts-all .js-cont-wrap > p').text().trim();
        result.retail = $('.price ').text().replace(/(?:\r\n|\r|\n|\s+)/g, " ").trim();
        result.name = name;
        result.reference = name;
        result.description = description;
        result.collection = entry.split('/watches/')[1].split('/')[0];
        result.thumbnail = 'https:' + $('.swiper-slide').attr('data-img-normal');
        if (result.collection === 'g-shock-s-series') {
            result.gender = 'F';
        }
        else {
            result.gender = 'M';
        }

        $(" .narrow-contents > div > article > div.js-more-list > ul.display-list li").each((idx, elem) => {
            const detail = $(elem).text();
            result.spec.push(detail);
        })
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
        const { brand, brandID, reference, lang, source, collection, gender, related, url, spec, description, ...other } = payload;
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
        result.caliber.brand = 'Casio';
        result.caliber.label = 'Japan';
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

        result.feature["Functions"] = [];
        result.feature["Calendar"] = [];

        for (const s of spec) {
            const specToMatch = s.toLowerCase();
            const eachSpec = s;

            if (specToMatch.match(/.*shock resistant*./) || specToMatch.match(/.*water resistant*./) || specToMatch.match(/.*led light*./)) {
                result.additional.push(eachSpec);
            }
            if (specToMatch.match(/.*duration*./) || specToMatch.match(/.*mobile link*./)) {
                result.additional.push(eachSpec);
            }
            if (specToMatch.match(/.*step count*./)) {
                result.feature["Functions"].push(eachSpec);
            }
            if (specToMatch.match(/.*power*./) || specToMatch.match(/.*dual time*./)) {
                result.feature["Functions"].push(eachSpec);
            }
            if (specToMatch.match(/.*stopwatch*./)) {
                result.feature["Functions"].push(eachSpec);
            }
            if (specToMatch.match(/.*capacity*./)) {
                result.additional.push(eachSpec);
            }
            if (specToMatch.match(/.*alarm*./) || specToMatch.match(/.*Countdown*./) || specToMatch.match(/.*hand*./)) {
                result.feature["Functions"].push(eachSpec);
            }
            if (specToMatch.match(/.*calendar.*/)) {
                result.feature["Calendar"].push(eachSpec);
            }
            if (specToMatch.match(/.*analog*./)) {
                result.dial.dialType = eachSpec;
            }
            if (specToMatch.match(/.*digital:*./)) {
                result.dial.dialDigital = eachSpec;
            }
            if (specToMatch.match(/.*battery*./) || specToMatch.match(/.*hour format*./)) {
                result.feature["Functions"].push(eachSpec);
            }
            if (specToMatch.match(/.*module*./)) {
                result.caliber.engine = "Casio Calibre " + eachSpec.match(/\d+\.?\d*/)
            }
            if (specToMatch.match(/.*mm \/*./)) {
                result.case.caseSize = eachSpec;
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
