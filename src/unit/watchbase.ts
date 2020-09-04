import { Logger } from '@cosmos/logger';
const logger = Logger.getLogger('cs:syno:Watchmaxx', 'debug')
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

export const extraction = async (context) => {
  try {
    const redisHost = process.env.REDIS_HOST;
    const redis = new Redis(redisHost, { keyPrefix: 'cosmos:' });
    const mdb = await redis.hgetall('mongodb:synopsis');
    const db_url = `mongodb://${mdb.user}:${mdb.pass}@${mdb.host}:${mdb.port}/${mdb.name}`;
    const conn = await MongoClient.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, });
    const db = conn.db('synopsis');
    const coll = 'reference_wb';
    const apiKey = await redis.get('watchbase-api');

    const { client, productID, reference } = context;
    if(!productID || !reference) return new Error('Needs to have both ProductId and Reference');
    
    const search = `https://api.watchbase.com/v1/search/refnr?q=${reference.toLowerCase()}&key=${apiKey}&format=json`;
    logger.debug('Search', search);
    const {data:sr} = await client.get(search)
    logger.debug('SR', sr);
    const {watches} = sr;
    if(watches.length !== 1) return new Error(`Search with not unique item: ${reference}`);
    const {id} = watches[0];

    const entry = "https://api.watchbase.com/v1/watch?id=" + id + "&key=" + apiKey + "&format=json";
    const data = (await client.get(entry)).data;
    console.log(data);

    if (data.watch) {
      let { watch } = data;

      const r = await db.collection(coll)
        .findOneAndUpdate(
          { productID },
          { $set: { ...watch } },
          { upsert: true }
        );
      return r;
    } else {
      logger.error("Failed extraction for Watchbase, watch ID not found");
      return {};
    }
  } catch (error) {
    logger.error('Failed extraction for Watchbase with error : ' + error)
    return {};
  }
}
