export type QuoteLineCalculationInput = {
  quantity: number;
  unitCost: number;
  unitSell: number;
};

export type QuoteLineCalculation = {
  costTotal: number;
  sellTotal: number;
  marginTotal: number;
  marginPercent: number;
};

export type QuoteTotalCalculation = QuoteLineCalculation;

export function calculateMarginPercent(marginTotal: number, sellTotal: number) {
  if (sellTotal <= 0) return 0;
  return Number(((marginTotal / sellTotal) * 100).toFixed(2));
}

export function calculateQuoteLine(input: QuoteLineCalculationInput): QuoteLineCalculation {
  const costTotal = roundMoney(input.quantity * input.unitCost);
  const sellTotal = roundMoney(input.quantity * input.unitSell);
  const marginTotal = roundMoney(sellTotal - costTotal);
  return {
    costTotal,
    sellTotal,
    marginTotal,
    marginPercent: calculateMarginPercent(marginTotal, sellTotal)
  };
}

export function calculateQuoteTotals(lines: QuoteLineCalculation[]): QuoteTotalCalculation {
  const costTotal = roundMoney(lines.reduce((sum, line) => sum + line.costTotal, 0));
  const sellTotal = roundMoney(lines.reduce((sum, line) => sum + line.sellTotal, 0));
  const marginTotal = roundMoney(sellTotal - costTotal);
  return {
    costTotal,
    sellTotal,
    marginTotal,
    marginPercent: calculateMarginPercent(marginTotal, sellTotal)
  };
}

export function calculateSellPriceFromMargin(costPrice: number, marginPercent: number) {
  if (marginPercent >= 100) return costPrice;
  if (marginPercent <= 0) return costPrice;
  return roundMoney(costPrice / (1 - marginPercent / 100));
}

export function calculateProductMarginPercent(costPrice: number, sellPrice: number) {
  return calculateMarginPercent(sellPrice - costPrice, sellPrice);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
