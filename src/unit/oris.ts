import Axios from "axios";
import { EMPTY, Observable } from "rxjs";
import { delay, expand, map } from "rxjs/operators";

import { clearEmpties } from "../utils";

const _indexing = (context) => {
    return new Observable(observer => {
        const { client, endpoint, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const json = (Axios.get(endpoint))['data'];

        for (const i in json) {
            const collections = json[i]['collectionInfoItems'];
            for (const x of collections) {
                const url = x.id;
                const name = x.name;
                result.items[name] = [];
                result.collections.push(name)
                cats.push({ name, url });
            }
        }

        for (const cat of cats) {
            const urlBase = 'https://www.oris.ch/api/en/collection/getcollection/';
            const collectionUrl = urlBase + cat.url;
            client.get(collectionUrl).then(res => {
                const json = (Axios.get(collectionUrl))['data'];
                for (const i of json['watches']) {
                    const watchId = i.id;
                    for (const x of i['models']) {
                        const thumbnailBase = 'https://www.oris.ch/data/';
                        const reference = x.image.split('_')[1];
                        const modelId = x.modelId;
                        const url = base + watchId + '/' + modelId;
                        const thumbnail = thumbnailBase + x.image;
                        result.items[cat.name].push({
                            source: 'official',
                            url,
                            thumbnail,
                            collection: cat.name,
                            lang,
                            reference
                        });
                    }
                }
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

export const scraping = async (context) => {
    try {
        const { endpoint, brand, brandID, lang, base } = context;
        const result = { source: 'official', brand, brandID, collections: [], items: {} };
        const cats = [];
        const json = (await Axios.get(endpoint)).data;

        for (const i in json) {
            const collections = json[i]['collectionInfoItems'];
            for (const x of collections) {
                const url = x.id;
                const name = x.name;
                result.items[name] = [];
                result.collections.push(name)
                cats.push({ name, url });
            }
        }

        for (const cat of cats) {
            const urlBase = 'https://www.oris.ch/api/en/collection/getcollection/';
            const collectionUrl = urlBase + cat.url;
            const json = (await Axios.get(collectionUrl)).data;
            for (const i of json['watches']) {
                const watchId = i.id;
                for (const x of i['models']) {
                    const thumbnailBase = 'https://www.oris.ch/data/';
                    const reference = x.image.split('_')[1];
                    const modelId = x.modelId;
                    const url = base + watchId + '/' + modelId;
                    const thumbnail = thumbnailBase + x.image;
                    result.items[cat.name].push({
                        source: 'official',
                        url,
                        thumbnail,
                        collection: cat.name,
                        lang,
                        reference
                    });
                }
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
        const { entry, lang, brand, brandID, thumbnail } = context;
        const result: any = {
            source: 'official',
            url: entry,
            brand,
            brandID,
            lang,
            thumbnail,
            spec: [],
            scripts: [],
            related: []
        };
        const pageId = entry.split('/watch/')[1];
        const pageUrl = 'https://www.oris.ch/api/en/Watch/GetWatch/' + pageId;
        const json = (await Axios.get(pageUrl)).data;
        const selectedId = json['selectedModelId'].toString();
        let modelId = '';

        result.name = json.name;
        result.description = json.description;
        result.gender = 'M';
        result.reference = json.reference;

        for (const x of json.models) {
            modelId = x.id;
            if (modelId.toString() === selectedId) {
                result.retail = x['priceWithCurrency'];
                let index;
                for (index = 0; index < 4; index++) {
                    for (const specs of x.features[index].features) {
                        const key = specs['featureType'];
                        const value = specs['value'];
                        result.spec.push({ key, value });
                    }
                }
            }
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
        result.caliber.brand = 'Oris';
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
        if (description.match(/Roman/i)) {
            result.dial.indexType = 'Roman';
        }
        if (description.match(/Arab/i)) {
            result.dial.indexType = 'Arabic';
        }
        if (description.match(/Chrono/i)) {
            result.dial.indexType = 'Chronograph';
        }
        if (description.match(/rhodium/i)) {
            result.dial.handStyle = 'Rhodium';
        }
        if (description.match(/Luminous/i)) {
            result.dial.handStyle = 'Luminous';
        }
        if (description.match(/baton/i)) {
            result.dial.handStyle = 'Baton';
        }
        if (description.match(/gloss/i)) {
            result.dial.finish = 'gloss';
        }
        if (description.match(/matte/i)) {
            result.dial.finish = 'matte';
        }
        if (description.match(/sunburst/i)) {
            result.dial.finish = 'sunburst';
        }
        if (description.match(/luminescent/i)) {
            result.dial.finish = 'luminescent';
        }
        if (description.match(/Superluminova/i)) {
            result.dial.finish = 'Superluminova';
        }
        if (description.match(/brushed/i)) {
            result.dial.finish = 'brushed';
        }
        if (description.match(/satin/i)) {
            result.dial.finish = 'satin';
        }
        if (description.match(/guilloche/i)) {
            result.dial.finish = 'guilloche';
        }

        for (const s of spec) {
            let pp = false;
            const key = s.key.toLowerCase();
            const value = s.value;

            if (value.match(/Roman/i)) {
                result.dial.indexType = 'Roman';
            }
            if (value.match(/Arab/i)) {
                result.dial.indexType = 'Arabic';
            }
            if (value.match(/Chrono/i)) {
                result.dial.indexType = 'Chronograph';
            }
            if (value.match(/rhodium/i)) {
                result.dial.handStyle = 'Rhodium';
            }
            if (value.match(/Luminous/i)) {
                result.dial.handStyle = 'Luminous';
            }
            if (value.match(/baton/i)) {
                result.dial.handStyle = 'Baton';
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
            if (value.match(/dial/i)) {
                pp = true;
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
                if (value.match(/aluminium/i)) {
                    result.case.material = 'aluminium';
                    result.case.materials.push('aluminium');
                }
                if (value.match(/titanium/i)) {
                    result.case.material = 'titanium';
                    result.case.materials.push('titanium');
                }
                if (value.match(/oval/i)) {
                    result.case.shape = 'Oval';
                }
                else {
                    result.case.shape = 'Round';
                }
            }
            if (key === 'size') {
                pp = true;
                result.case.width = value.split('mm')[0] ? value.split('mm')[0].trim() + ' mm' : '';
            }
            if (key === 'top glass') {
                pp = true;
                if (s.value.match(/domed/i)) {
                    result.case.crystal = 'Domed Sapphire';
                }
                if (s.value.match(/sapphire/i)) {
                    result.case.crystal = 'Sapphire';
                }
            }
            if (key === 'case back') {
                pp = true;
                if (s.value.match(/screwed/i)) {
                    result.case.back = 'screwed';
                }
                if (s.value.match(/see-through/i)) {
                    result.case.back = 'see through';
                }
            }
            if (key === 'water resistance') {
                pp = true;
                result.waterResistance = value.trim();
                result.case.waterResistance = value.trim();
            }
            if (key === 'functions') {
                pp = true;
                result.feature = value.split(',').map(x => x.trim()) ? value.split(',').map(x => x.trim()) : '';
            }
            if (key === 'winding') {
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
            if (key === 'power-reserve') {
                pp = true;
                result.caliber.reserve = value.trim();
            }
            if (key === 'jewels') {
                pp = true;
                result.caliber.jewels = value.trim();
            }
            if (key === 'number') {
                pp = true;
                result.caliber.reference = value.trim();
            }

            if (key === 'material') {
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
