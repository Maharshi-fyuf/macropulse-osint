/**
 * Shared prediction data type returned by /api/predict.
 * Consumed by both AnalysisPane and ChartPane.
 */
export interface PredictionData {
  currentPrice: number;
  upperBound: number;
  lowerBound: number;
  /** Adjusted daily log-return drift (sentiment-shifted) */
  projectedDrift: number;
  /** Historical 1-day log-return standard deviation */
  volatility: number;
  /** Yahoo Finance symbol that was actually resolved (e.g. "MRF.NS") */
  resolvedSymbol: string;
  /** Number of forward days in the projection */
  horizon: number;
}
