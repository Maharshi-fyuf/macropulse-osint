/**
 * tickerMap.ts
 * Single source of truth for mapping Gemini asset_class strings
 * to TradingView symbol identifiers used by AdvancedRealTimeChart.
 *
 * If a new asset class is added to the Gemini schema, add it here.
 */

const TICKER_MAP: Record<string, string> = {
  Energy:   'NYMEX:CL1!',    // Crude Oil Futures (WTI)
  Metals:   'OANDA:XAUUSD',  // Spot Gold
  Forex:    'FX:EURUSD',     // EUR/USD
  Equities: 'CME_MINI:ES1!', // S&P 500 E-mini Futures
};

/** Default symbol when asset class is unknown or 'None'. */
const DEFAULT_SYMBOL = 'CME_MINI:ES1!';

/**
 * Resolves a Gemini primary_asset_class string to a TradingView symbol.
 * Falls back to the S&P 500 E-mini if the asset class is unrecognised.
 */
export function getTradingViewSymbol(assetClass: string | null | undefined): string {
  if (!assetClass) return DEFAULT_SYMBOL;
  return TICKER_MAP[assetClass] ?? DEFAULT_SYMBOL;
}
