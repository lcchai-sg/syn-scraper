import axios from 'axios';
import { MongoClient } from 'mongodb';
import { Logger } from '@cosmos/logger';
import { MessageStation } from "@cosmos/utils";

const logger = Logger.getLogger('cs:syno:orig', 'debug');
const FormData = require('form-data');
const Redis = require('ioredis');

(async function () {
    const redisHost = process.env.REDIS_HOST;
    const redis = new Redis(redisHost, { keyPrefix: 'cosmos:' });
    const station = await MessageStation
        .connect(await redis.hgetall('message:synopsis'));
    const mdb = await redis.hgetall('mongodb:synopsis');
    const db_url = `mongodb://${mdb.user}:${mdb.pass}@${mdb.host}:${mdb.port}/${mdb.name}`;
    const conn = await MongoClient.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, });
    const client = await station.createClient({
        exchange: "scraper",
        exType: 'topic',
        route: 'scrape.data.raw',
        queue: 'scraper-distiller',
        timeout: 60000,
        handler: async message => {
            const { correlationId } = message.properties;
            const payload = JSON.parse(message.content);
            logger.debug('Process for', correlationId);
            logger.debug('distiller payload>>>', payload)
            if (correlationId && !payload.code) {
                const { source, brand, } = payload;
                const unit = (source && source !== 'official') ? source : brand;
                console.log("S", source, "B", brand, "U", unit);
                try {
                    const logic = require('./unit/' + unit);
                    const exec = logic['distill'];
                    if (exec) {
                        let r = await exec.call(null, { payload });
                        const { reference, brandID, lang, source, url, thumbnail, ...rest } = r;
                        let p = await conn.db(mdb.name)
                            .collection('reference_product')
                            .find({ brandID, reference, url, source, lang, })
			    .toArray();
			let assets = p.length > 0 && p[0].assets ? p[0].assets : null;
                        if (!assets) {
                            if (thumbnail) {
                                await axios.get(thumbnail, { responseType: 'stream' })
                                    .then(async res => {
                                        const image = res.data;
                                        const form = new FormData();
                                        form.append('payload', image);
                                        const headers = form.getHeaders();
                                        await axios.post('https://synopsis.cosmos.ieplsg.com/v2/asset/0/0', form, { headers })
                                            .then(res => { assets = res.data; })
                                            .catch(err => { logger.error("Error posting assets to Seaweed with error " + err); });
                                    })
                                    .catch(err => { logger.error('Error getting thumbnail with error ' + err); })
                            }
                        }
                        await conn.db(mdb.name)
                            .collection('reference_product')
                            .findOneAndUpdate(
                                { brandID, reference, url, source, lang },
                                {
                                    $setOnInsert: {
                                        brandID,
                                        reference,
                                        url,
                                        source,
                                        lang,
                                        recordedAt: new Date(),
                                    },
                                    $set: {
                                        assets,
                                        thumbnail,
                                        ...rest,
                                    },
                                    $currentDate: {
                                        lastCheckAt: { $type: 'date' }
                                    }
                                },
                                {
                                    upsert: true
                                }
                            );
                        logger.debug("Replied");
                    } else {
                        logger.debug("Distill Function not found");
                    }
                } catch (e) {
                    logger.debug('Distill Unit not found', e);
                }
            }
        }
    })
})();
