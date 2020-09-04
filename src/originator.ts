import { MongoClient } from 'mongodb';
import { Logger } from '@cosmos/logger';
import { MessageStation, timeout } from "@cosmos/utils";

const logger = Logger.getLogger('cs:syno:orig', 'debug');

(async function () {
    const mqHost = process.env.MESSAGE_HOST;
    const mqUser = process.env.MESSAGE_USER;
    const mqPass = process.env.MESSAGE_PASS;
    const mqVhost = process.env.MESSAGE_VHOST;
    const db_host = process.env.DB_HOST;
    const db_port = process.env.DB_PORT;
    const db_user = process.env.DB_USER;
    const db_pass = process.env.DB_PASS;
    const db_name = process.env.DB_NAME;
    const station = await MessageStation
        .connect({
            host: mqHost,
            user: mqUser,
            pass: mqPass,
            vhost: mqVhost
        });
    const db_url = `mongodb://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}`;
    logger.trace('Connect DB', db_url);
    const conn = await MongoClient.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, });
    const proc = async (payload, dryRun, replyTo) => {
        logger.debug('Start Process', payload);
        const { interval, agent, brandID, brand, lang, proxy, source, strategy, } = payload;
	let flt: any = { lang, source, extracted: { $exists: false } };
	if (brandID) flt.brandID = brandID;
        const targets = await conn.db(db_name)
            .collection('reference_urls')
            .find(flt)
            .toArray();
        const ps = [];
        for (const target of targets) {
            const p = messenger
                .request("crawler", {
                    dryRun,
                    payload: {
                        strategy,
                        command: "extraction",
                        proxy,
                        agent,
                        context: {
                            entry: target.url,
                            brand,
                            brandID,
                            productID: target.productID,
                            lang,
                            collection: target.collection,
                            price: target.price,
                            thumbnail: target.thumbnail,
                            retail: target.retail,
                            gender: target.gender,
                            name: target.name,
                            reference: target.reference,
                        }
                    }
                }, { replyTo: "scrape.data.raw" })
                .then((result: any) => {
                    // update data
                    const { url, reference, brandID, brand, subCollection, collection, lang, code, } = result;
                    logger.debug('Result for Scrape', brand, reference);
                    const sets: any = { reference };
                    if (subCollection) sets.subCollection = subCollection;

                    return conn.db(db_name)
                        .collection('reference_urls')
                        .updateOne(
                            { url, lang, source, },
                            {
                                $set: {
                                    sets,
				    code,
                                    extracted: true
                                }
                            });
                });
            ps.push(p);
            await timeout(interval);
        }
        await Promise.all(ps);
    };
    const messenger = await station.createMessenger({
        exchange: 'scraper',
        exType: 'topic',
        route: 'scrape.data.raw',
        queue: 'scraper-data'
    });
    const client = await station.createClient({
        exchange: 'scraper',
        exType: 'topic',
        route: 'origin',
        queue: 'scraper-origin',
        timeout: 900000,
        handler: message => {
            const { correlationId, replyTo } = message.properties;
            const { dryRun, payload } = JSON.parse(message.content);
            logger.debug('Operation for', correlationId, 'reply to', replyTo);
            proc(payload, dryRun, replyTo);
            return {};
        }
    });
})();

// const pattern = {
//     "dryRun": "true",
//     "payload": {
//         "brandID": 33,
//         "interval": 2000,
//         "agent": "USER AGENT",
//         "brand": "Brand Name",
//         "proxy": {"host": "", "port": ""}
//     }
// };
