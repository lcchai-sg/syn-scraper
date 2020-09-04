import {Logger} from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:orig', 'debug');
import {MessageStation} from "@cosmos/utils";
import {MongoClient} from 'mongodb';
(async function () {
    const mqHost = process.env.MESSAGE_HOST;
    const mqUser = process.env.MESSAGE_USER;
    const mqPass = process.env.MESSAGE_PASS;
    const mqVhost = process.env.MESSAGE_VHOST;

    const db_host = process.env.DB_HOST;
    const db_port = process.env.DB_PORT || 27017;
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

    const db_url = `mongodb://${db_user}:${db_pass}@${db_host}:${db_port}`;
    logger.trace('Connect DB', db_url);
    const conn = await MongoClient.connect(`mongodb://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}`, {useNewUrlParser: true});

    const query = `mutation updatePriceTag($priceTag: PriceTagInput) {
        savePriceTag(input:$priceTag){id}
    }`;

    const client = await station.createClient({
        exchange: 'scraper',
        exType: 'topic',
        route: 'scrape.data.raw',
        queue: 'scraper-price',
        timeout: 15000,
        handler: async message => {
            const {correlationId} = message.properties;
            const payload = JSON.parse(message.content);
            logger.debug('Process for', correlationId);
            if(correlationId) {
                logger.debug(payload);
                const {reference, brandID, productID, price, lang} = payload;
                logger.debug(
                    `Product: ${productID} For brand: ${brandID} in ${reference} price ${price} for lang ${lang}`
                );
                // update to official price collection
                await conn.db(db_name)
                    .collection('reference_price')
                    .findOneAndUpdate(
                        {brandID, reference, lang},
                        {
                            $setOnInsert: {
                                brandID,
                                reference,
                                lang,
                                recordedAt: new Date()
                            },
                            $set: {
                                productID,
                                price
                            },
                            $currentDate: {
                                lastCheckAt: {$type: 'date'}
                            }
                        },
                        {
                            upsert: true
                        }
                    )
            }
        }
    }, (channel)=> {channel.prefetch = 4});
})();
