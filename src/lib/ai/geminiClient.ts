import { GoogleGenAI } from '@google/genai';
import { MarketEventSchema, GeminiAnalysis } from './schema';

export async function analyzeWithGemini(
  ai: GoogleGenAI,
  item: { title: string; source: string; content: string }
): Promise<GeminiAnalysis | null> {
  const prompt = `You are a senior macro-economic trading analyst and geopolitical OSINT expert.
Analyze the following news item:
Title: ${item.title}
Source: ${item.source}
Content: ${item.content}

Output exactly a single JSON object matching this schema:
{
  "is_market_moving": boolean,
  "rationale": "1-2 sentence explanation of the geopolitical context",
  "severity_score": integer (1-10),
  "primary_asset_class": "Energy" | "Metals" | "Forex" | "Equities" | "None",
  "bullish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"],
  "bearish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"]
}
If "is_market_moving" is false, return "None" for asset class and empty arrays. Do not add markdown code blocks around the JSON string.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            is_market_moving: { type: 'BOOLEAN' },
            rationale: { type: 'STRING' },
            severity_score: { type: 'INTEGER' },
            primary_asset_class: {
              type: 'STRING',
              enum: ['Energy', 'Metals', 'Forex', 'Equities', 'None'],
            },
            bullish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
            bearish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: [
            'is_market_moving',
            'rationale',
            'severity_score',
            'primary_asset_class',
            'bullish_assets',
            'bearish_assets',
          ],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      console.error('[Gemini] Empty text response.');
      return null;
    }

    const cleaned = jsonText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const validation = MarketEventSchema.safeParse(parsed);

    if (!validation.success) {
      console.error('[Gemini] Zod validation failed:', validation.error.flatten());
      return null;
    }

    return validation.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[Gemini] Execution error:', error.message);
    } else {
      console.error('[Gemini] Execution error:', error);
    }
    return null;
  }
}
