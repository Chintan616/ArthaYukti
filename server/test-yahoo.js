const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
async function run() {
  for (const s of ['TATAMOTORS.NS', 'LTIM.NS']) {
    try {
      const q = await yahooFinance.quote(s);
      console.log(`${s}: type = ${typeof q}, isArray = ${Array.isArray(q)}`);
      if (q) {
        console.log(`${s} price:`, q.regularMarketPrice);
      } else {
        console.log(`${s} returned null/undefined`);
      }
    } catch (e) {
      console.error(`${s} ERROR:`, e.message);
    }
  }
}
run();
