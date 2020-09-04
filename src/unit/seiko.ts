import cheerio from 'cheerio';
import axios from "axios";
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, entry, brand, brandID, lang, base, productBase, imageBase } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const catUrls = [];
        const $ = cheerio.load((client.get(entry)).data);

        $('#watchfinder-brands ul.wf-Filter_SpringBoards li').each((idx, el) => {
            const name = $(el).find('.wf-Filter_SpringBoardName').text();
            result.collections.push(name);
            result.items[name] = [];
        });

        const amount = $('.wf-Filter_ResultNum').text();
        let link = base + amount;

        client.get(link).then(res => {
            axios.get(link)
                .then(function (response) {
                    let results = response.data.results;
                    let category, cat;

                    results.forEach(data => {
                        if (data.main_category_id == 2) {
                            category = "Astron";
                            cat = "astron";
                        } else if (data.main_category_id == 5) {
                            category = "Presage";
                            cat = "presage";
                        } else if (data.main_category_id == 6) {
                            category = "Prospex";
                            cat = "prospex";
                        } else if (data.main_category_id == 7) {
                            category = "Seiko Premier";
                            cat = "seikopremier";
                        } else if (data.main_category_id == 17401) {
                            category = "5 Sports"
                            cat = "5sports";
                        }

                        result.items[category].push({
                            source: 'official',
                            url: productBase + cat + "/" + data.title.toLowerCase(),
                            thumbnail: imageBase + data.thumbnail.url_key + "_medium.png",
                            collection: category,
                            lang,
                            name: data.title,
                            reference: data.slug,
                        })
                    });
                    observer.next({ ...context, result });
                    observer.complete();
                })
                .catch(function (error) {
                    const { brand, brandID } = context;
                    console.log('Failed for indexing class of brandId : ' + brandID +
                        ' ,brand ' + brand +
                        ' with error : ' + error
                    )
                    const result = [];
                    return result;
                })
        })
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
        const { client, entry, brand, brandID, lang, base, productBase, imageBase } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const catUrls = [];
        const $ = cheerio.load((await client.get(entry)).data);

        $('#watchfinder-brands ul.wf-Filter_SpringBoards li').each((idx, el) => {
            const name = $(el).find('.wf-Filter_SpringBoardName').text();
            result.collections.push(name);
            result.items[name] = [];
        });

        const amount = $('.wf-Filter_ResultNum').text();
        let link = base + amount;

        await axios.get(link)
            .then(function (response) {
                let results = response.data.results;
                let category, cat;

                results.forEach(data => {
                    if (data.main_category_id == 2) {
                        category = "Astron";
                        cat = "astron";
                    } else if (data.main_category_id == 5) {
                        category = "Presage";
                        cat = "presage";
                    } else if (data.main_category_id == 6) {
                        category = "Prospex";
                        cat = "prospex";
                    } else if (data.main_category_id == 7) {
                        category = "Seiko Premier";
                        cat = "seikopremier";
                    } else if (data.main_category_id == 17401) {
                        category = "5 Sports"
                        cat = "5sports";
                    }

                    result.items[category].push({
                        source: 'official',
                        url: productBase + cat + "/" + data.title.toLowerCase(),
                        thumbnail: imageBase + data.thumbnail.url_key + "_medium.png",
                        collection: category,
                        lang,
                        name: data.title,
                        reference: data.slug,
                    })
                });
            })
            .catch(function (error) {
                const { brand, brandID } = context;
                console.log('Failed for indexing class of brandId : ' + brandID +
                    ' ,brand ' + brand +
                    ' with error : ' + error
                )
                const result = [];
                return result;
            })
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
            thumbnail,
            scripts: [],
            spec: [],
            related: [],
        };
        const $ = cheerio.load((await client.get(entry)).data);
        const reference = $('h1.pr-Product_Name').text().trim();
        const collection = $('.pr-Product_Main .pr-Product_Collection a').text().trim();
        let gender;
        let gender_data = $('.pr-Product_Main .pr-Product_LabelMens').text().trim();

        if (gender_data == "Men’s") {
            gender = 'M';
        } else if (gender_data == "Women’s") {
            gender = 'F';
        }

        result.name = $('.pr-Product_Main .pr-Product_Name ').text().trim();
        result.reference = reference;
        result.collection = collection;
        result.gender = gender;

        $('.pr-Spec_Group:nth-child(1) .pr-Spec_Item').each((idx, el) => {
            const key = $(el).find('h4.pr-Spec_HeadingLv2').text().trim();
            const value = $(el).find('.pr-Spec_Text p').text().trim();
            result.spec.push({
                "key": key,
                "value": value
            })
        });

        $('.pr-Spec_Group:nth-child(2) .pr-Spec_Item').each((idx, el) => {
            const key = $(el).find('h4.pr-Spec_HeadingLv2').text().trim();
            const value = $(el).find('.pr-Spec_Text p').text().trim();
            result.spec.push({
                "key": key,
                "value": value
            })
        });

        const waterResistanceKey = $('.pr-Spec_Group:nth-child(3) .pr-Spec_Item:nth-child(1)').find('h4.pr-Spec_HeadingLv2').text();
        const waterResistanceValue = $('.pr-Spec_Group:nth-child(3) .pr-Spec_Item:nth-child(1)').find('p').text();
        result.spec.push({
            "key": waterResistanceKey,
            "value": waterResistanceValue
        })

        const caseSize = $('.pr-Spec_Group:nth-child(3) .pr-Spec_Item:nth-child(2)').find('.pr-Spec_Text').text();
        const arr = caseSize.trim().split(" ");
        for (var i = 0; i < arr.length; i += 1) {
            result.spec.push({
                "key": arr[i].replace(/:/g, ""),
                "value": arr[i += 1] + " " + arr[i += 1],
            })
        }

        const otherSpecKey = $('.pr-Spec_Group:nth-child(3) .pr-Spec_Item:nth-child(3)').find('h4.pr-Spec_HeadingLv2').text();
        const otherSpecValue = [];
        $('.pr-Spec_Group:nth-child(3) ul.pr-Spec_GroupInside li').each((idx, el) => {
            const text = $(el).text().trim();
            otherSpecValue.push(text)
        });
        result.spec.push({
            "key": otherSpecKey,
            "value": otherSpecValue
        })

        const feature = [];
        $('.pr-Spec_Group:nth-child(4) ul.pr-Spec_GroupInside li').each((idx, el) => {
            const text = $(el).text().trim();
            feature.push(text)
        });
        result.feature = feature;

        $('.blk-ProductList_Item').each((idx, el) => {
            const ref = $(el).find('a .blk-ProductList_Name').text();
            result.related.push(ref)
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
        result.caliber.brand = 'Seiko';
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
        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value.toString();
            if (key === 'caliber number') {
                pp = true;
                result.caliber.reference = value;
            }
            if (key === 'movement type') {
                pp = true;
                result.caliber.type = value;
            }
            if (key === 'case material') {
                pp = true;
                result.case.material = value;
                result.case.materials.push(value);
            }
            if (key === 'crystal') {
                pp = true;
                result.case.crystal = value;
            }
            if (key === 'crystal coating') {
                pp = true;
                result.dial.finish = value;
            }
            if (key === 'clasp') {
                pp = true;
                result.band.buckle = value;
            }
            if (key === 'thickness') {
                pp = true;
                result.case.thickness = value;
            }
            if (key === 'diameter') {
                pp = true;
                result.case.width = value;
            }

            if (value.match(/oval/i)) {
                result.case.shape = 'Oval';
            }
            else {
                result.case.shape = 'Round';
            }
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
            if (value.match(/luminescence/i)) {
                result.dial.finish = 'luminescence';
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
            if (value.match(/arab/i)) {
                result.dial.indexType = 'Arabic';
            }
            if (value.match(/roman/i)) {
                result.dial.indexType = 'Roman';
            }
            if (value.match(/chrono/i)) {
                result.dial.indexType = 'Chronograph';
            }
            if (value.match(/rhodium/i)) {
                result.dial.handStyle = 'Rhodium';
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value;
                result.case.waterResistance = value;
            }
            if (key === 'size') {
                pp = true;
                value.split(' x ')
                    .map(d => {
                        if (d.startsWith('H')) {
                            result.case.height = d.substr(1);
                        }
                        if (d.startsWith('W')) {
                            result.case.width = d.substr(1);
                        }
                        if (d.startsWith('D')) {
                            result.case.thickness = d.substr(1);
                        }
                    })
            }
            if (key === 'case') {
                pp = true;
                const idx = value.toLowerCase().indexOf('case');
                if (idx > -1) {
                    result.case.material = value.substr(0, idx).trim();
                }
                const caseback = value.split('Case back:')[1];
                if (caseback) {
                    result.case.back = caseback.trim();
                }
            }
            if (key === 'case coating') {
                pp = true;
                result.case.coating = value;
            }
            if (key === 'glass') {
                pp = true;
                result.case.crystal = value;
            }
            if (key === 'glass coating') {
                pp = true;
                result.case.crystalCoating = value;
            }
            if (key === 'drive duration') {
                pp = true;
                result.caliber.reserve = value;
            }
            if (key === 'weight') {
                pp = true;
                result.weight = value;
            }
            if (key === 'caliber number') {
                pp = true;
                result.caliber.reference = value;
            }
            if (key.indexOf('bracelet') > -1) {
                pp = true;
                result.band.length = value;
            }
            if (key === 'driving system') {
                pp = true;
                const meta = value.split('\n');
                if (meta.length === 1) {
                    result.caliber.type = meta[0];
                } else {
                    result.additional.push(...meta.filter(m => m.length > 0).map(m => {
                        if (m.indexOf('Jewels') > -1) {
                            result.caliber.jewels = m.substr(m.indexOf('Jewels') + 8).trim();
                        } else {
                            return m.substr(2)
                        }
                    }).filter(m => !!m));
                }
            }
            if (key === 'battery') {
                pp = true;
                result.caliber.battery = value;
            }
            if (key === 'band material') {
                pp = true;
                result.band.material = value;
                result.band.materials.push(value);
            }
            if (key === 'feature') {
                pp = true;
                result.feature = value.split('\n')
                    .filter(m => m.length > 0).map(m => m.substr(2))
            }
            const data = [];
            if (!pp) {
                const key = s.key.replace(':', '').trim();
                const value = s.value.toString().trim()
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
