import { MongoClient } from 'mongodb';
import { Logger } from '@cosmos/logger';
import { NlpUnit } from "./nlp-unit";

const logger = Logger.getLogger('cs:syno:orig', 'debug');
const Redis = require('ioredis');

(async function () {
    const redisHost = process.env.REDIS_HOST;
    const redis = new Redis(redisHost, { keyPrefix: 'cosmos:' });
    const mdb = await redis.hgetall('mongodb:synopsis');
    const db_url = `mongodb://${mdb.user}:${mdb.pass}@${mdb.host}:${mdb.port}/${mdb.name}`;
    const conn = await MongoClient.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, });
    const nlp = new NlpUnit();
    const processWithNLP = async function (payload) {
        try {
            const { reference, brandID, productID, lang, source, ...rest } = payload;
            // Process Data
            const specs = await nlp.digest(rest);
            // save result
            await conn.db(mdb.name)
                .collection('reference_products_ai')
                .findOneAndUpdate(
                    { brandID, reference, source, lang },
                    {
                        $setOnInsert: {
                            brandID,
                            reference,
                            source,
                            lang,
                            recordedAt: new Date()
                        },
                        $set: {
                            productID,
                            ...specs
                        },
                        $currentDate: {
                            lastCheckAt: { $type: 'date' }
                        }
                    },
                    {
                        upsert: true
                    }
                )
        } catch (e) {
            logger.debug('Processor Fail with error', e.message);
        }
    };
})();
