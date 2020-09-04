import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import Axios from "axios";
export const harvest  = async(context) => {
    const {entry, brand, brandID} = context;
    const results = [];
    const pageCount = 60;
    let count = 0;
    let page = 1;
    let next = false;
    do {
        count = 0;
        const url = `${entry}?query=${'131.20.29.20.02.001'}&dosearch=true&resultview=list&sortorder=1&maxAgeInDays=0&priceFrom=4680&showPage=${page++}`;
        const $ = cheerio.load((await Axios.get(url)).data);
        $('#wt-watches .article-item-container')
            .each((idx, el)=>{
                const title = $(el).find('.article-title').text().trim();
                const price = $(el).find('.article-price').text().trim();
                results.push({title, price});
                count ++
            });
        next = !(count < pageCount) && page <= 5;
    } while (next);
    return results;
};