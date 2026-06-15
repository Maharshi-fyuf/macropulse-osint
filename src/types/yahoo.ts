export interface YahooQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

export interface YahooMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  priceHint: number;
  currentTradingPeriod: {
    pre: { timezone: string; end: number; start: number; gmtoffset: number };
    regular: { timezone: string; end: number; start: number; gmtoffset: number };
    post: { timezone: string; end: number; start: number; gmtoffset: number };
  };
  dataGranularity: string;
  range: string;
  validRanges: string[];
}

export interface YahooChartResult {
  meta: YahooMeta;
  timestamp: number[];
  indicators: {
    quote: YahooQuote[];
    adjclose?: { adjclose: (number | null)[] }[];
  };
}

export interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: {
      code: string;
      description: string;
    } | null;
  };
}

export interface OHLCPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number; // For volume
}
