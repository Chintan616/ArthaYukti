const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
async function run() {
  for (const s of ['AMBUJACEM.BO', 'SIEMENS.BO']) {
    try {
      const q = await yahooFinance.quote(s);
      console.log(`${s}: price = ${q?.regularMarketPrice}`);
    } catch (e) {
      console.error(`${s} ERROR:`, e.message);
    }
  }
}
run();
