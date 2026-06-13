/**
 * tickerMap.ts
 * Single source of truth for mapping Gemini asset_class strings
 * to TradingView symbol identifiers used by AdvancedRealTimeChart.
 *
 * If a new asset class is added to the Gemini schema, add it here.
 */

const TICKER_MAP: Record<string, string> = {
  Energy:   'AMEX:USO',    // United States Oil Fund
  Metals:   'AMEX:GLD',    // SPDR Gold Shares
  Forex:    'FX:EURUSD',     // EUR/USD (Forex is generally free)
  Equities: 'AMEX:SPY',    // SPDR S&P 500 ETF Trust
};

/** Default symbol when asset class is unknown or 'None'. */
const DEFAULT_SYMBOL = 'AMEX:SPY';

/**
 * Resolves a Gemini primary_asset_class string to a TradingView symbol.
 * Falls back to the S&P 500 E-mini if the asset class is unrecognised.
 */
export function getTradingViewSymbol(assetClass: string | null | undefined): string {
  if (!assetClass) return DEFAULT_SYMBOL;
  return TICKER_MAP[assetClass] ?? DEFAULT_SYMBOL;
}
