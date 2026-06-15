import { z } from 'zod';

export const MarketEventSchema = z.object({
  is_market_moving: z.boolean(),
  rationale: z.string(),
  severity_score: z.number().int().min(1).max(10),
  primary_asset_class: z.enum(['Energy', 'Metals', 'Forex', 'Equities', 'None']),
  bullish_assets: z.array(z.string()),
  bearish_assets: z.array(z.string()),
});

export type GeminiAnalysis = z.infer<typeof MarketEventSchema>;
