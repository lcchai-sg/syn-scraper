import { Logger } from '@cosmos/logger';

const logger = Logger.getLogger('cs:syno:orig', 'debug');
import { MessageStation } from "@cosmos/utils";
import { MongoClient } from 'mongodb';

const Redis = require('ioredis');

(async function () {
    const redisHost = process.env.REDIS_HOST;
    const redis = new Redis(redisHost, { keyPrefix: 'cosmos:' });

    const msg = await redis.hgetall('message:synopsis');
    const station = await MessageStation
        .connect(await redis.hgetall('message:synopsis'));

    const mdb = await redis.hgetall('mongodb:synopsis');
    const db_url = `mongodb://${mdb.user}:${mdb.pass}@${mdb.host}:${mdb.port}/${mdb.name}`;
    const conn = await MongoClient.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, });

    const client = await station.createClient({
        exchange: "scraper",
        exType: 'topic',
        route: 'scrape.data.raw',
        queue: 'scraper-info',
        timeout: 60000,
        handler: async message => {
            const { correlationId } = message.properties;
            const payload = JSON.parse(message.content);
            logger.debug('Process for', correlationId);
            if (correlationId && Object.keys(payload).length > 0) {
                const { reference, brand, brandID, productID, lang, source, url, ...rest } = payload;
                await conn.db(mdb.name)
                    .collection('reference_raw')
                    .findOneAndUpdate(
                        { brandID, reference, source, lang, url },
                        {
                            $setOnInsert: {
                                brand,
                                brandID,
                                reference,
                                source,
                                lang,
                                url,
                                recordedAt: new Date(),
                            },
                            $set: {
                                productID,
                                ...rest
                            },
                            $currentDate: {
                                lastCheckAt: { $type: 'date' }
                            }
                        },
                        {
                            upsert: true
                        }
                    )
            }
        }
    })
})();
