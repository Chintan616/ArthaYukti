/**
 * Recalculate the weighted average buy price when adding to a position.
 * Formula: (existingQty * existingAvg + newQty * newPrice) / totalQty
 */
const calcAvgPrice = (existingQty, existingAvg, newQty, newPrice) => {
  const totalCost = existingQty * existingAvg + newQty * newPrice;
  return totalCost / (existingQty + newQty);
};

/**
 * Calculate P&L for a list of holdings given a priceMap { SYMBOL: currentPrice }.
 * Returns { totalValue, totalCost, totalPL, totalPLPercent }
 */
const calcPortfolioSummary = (holdings, priceMap = {}) => {
  let totalValue = 0;
  let totalCost = 0;

  for (const h of holdings) {
    const currentPrice = priceMap[h.symbol] ?? h.avgPrice; // fallback to avg if price missing
    totalValue += h.quantity * currentPrice;
    totalCost += h.quantity * h.avgPrice;
  }

  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return { totalValue, totalCost, totalPL, totalPLPercent };
};

module.exports = { calcAvgPrice, calcPortfolioSummary };
