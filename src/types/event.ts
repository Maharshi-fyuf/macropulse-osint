export interface EventRecord {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  is_market_moving: boolean;
  rationale: string | null;
  severity_score: number;
  asset_class: string;
  bullish_assets: string[];
  bearish_assets: string[];
  created_at?: string;
}
