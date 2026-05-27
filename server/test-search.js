const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
async function run() {
  for (const query of ['Tata Motors', 'LTIMindtree']) {
    const res = await yahooFinance.search(query);
    console.log(`\nSearch results for "${query}":`);
    res.quotes.slice(0, 5).forEach(q => console.log(`${q.symbol} - ${q.shortName} (${q.exchange})`));
  }
}
run();
