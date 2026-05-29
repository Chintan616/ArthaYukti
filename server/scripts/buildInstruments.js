const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../../NSE.json');
const outputPath = path.join(__dirname, '../data/instruments.json');

// Legacy mapping for indices to ensure existing dashboard doesn't break
const LEGACY_INDICES = {
  'Nifty 50': '^NSEI',
  'Nifty Bank': '^NSEBANK',
  'Nifty IT': '^CNXIT',
  'Nifty Auto': '^CNXAUTO',
  'Nifty FMCG': '^CNXFMCG',
  'Nifty Pharma': '^CNXPHARMA',
  'Nifty Midcap 50': '^NSMIDCP'
  // Sensex is BSE, not in NSE.json. We'll manually add it below.
};

async function build() {
  console.log('Loading NSE.json (this may take a few seconds)...');
  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);

  const instruments = [];

  // 1. Manually add Sensex (since it's a BSE index and NSE.json only has NSE)
  instruments.push({
    symbol: '^BSESN',
    name: 'Sensex',
    instrument_key: 'BSE_INDEX|SENSEX',
    type: 'INDEX'
  });

  // 2. Process NSE data
  let eqCount = 0;
  let indexCount = 0;

  for (const item of data) {
    // Equities
    if (item.segment === 'NSE_EQ' && item.instrument_type === 'EQ') {
      instruments.push({
        symbol: item.trading_symbol, // e.g. RELIANCE
        name: item.name || item.short_name || item.trading_symbol,
        instrument_key: item.instrument_key,
        type: 'EQ'
      });
      eqCount++;
    }
    
    // Indices
    else if (item.segment === 'NSE_INDEX') {
      // If it's one of our legacy indices, use the legacy symbol (e.g. ^NSEI)
      // Otherwise, just use the trading symbol.
      let symbol = item.trading_symbol;
      
      // Upstox names Nifty 50 as 'Nifty 50' in the name field, but 'NIFTY 50' in trading_symbol
      // Let's check our legacy map
      if (LEGACY_INDICES[item.name]) {
        symbol = LEGACY_INDICES[item.name];
      }

      instruments.push({
        symbol: symbol,
        name: item.name,
        instrument_key: item.instrument_key,
        type: 'INDEX'
      });
      indexCount++;
    }
  }

  console.log(`Processed ${eqCount} Equities and ${indexCount} Indices.`);
  console.log(`Total instruments saved: ${instruments.length}`);

  fs.writeFileSync(outputPath, JSON.stringify(instruments, null, 2));
  console.log(`Saved streamlined database to ${outputPath}`);
}

build().catch(console.error);
