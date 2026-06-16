import { GoogleGenAI } from '@google/genai';
import { MarketEventSchema, GeminiAnalysis } from './schema';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('CRITICAL BACKEND ERROR: GEMINI_API_KEY is missing or undefined at runtime.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function analyzeWithGemini(
  item: { title: string; source: string; content: string }
): Promise<GeminiAnalysis | null> {
  const prompt = `You are an elite quantitative analyst and geopolitical OSINT expert.
Analyze the following news article:
Title: ${item.title}
Source: ${item.source}
Content: ${item.content}

Output exactly a single JSON object matching this schema:
{
  "is_market_moving": boolean,
  "rationale": "1-sentence explanation of the geopolitical context and rationale for the severity score",
  "severity_score": integer (1-10),
  "primary_asset_class": "Energy" | "Metals" | "Forex" | "Equities" | "None",
  "bullish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"],
  "bearish_assets": ["Asset/Ticker 1: Reason why", "Asset 2: Reason why"]
}

SEVERITY SCORING GUIDELINES:
- Score 1-4: Fluff, daily noise, or insignificant local news.
- Score 5-7: Standard corporate news, typical earnings, or moderate economic data.
- Score 8: Significant, highly notable market events.
- Score 9-10: RESERVED ONLY for massive, market-moving macroeconomic shocks (e.g., RBI/Fed rate changes, major geopolitical wars, massive black-swan events, global supply chain collapses).

If "is_market_moving" is false, return "None" for asset class and empty arrays. Do not add markdown code blocks around the JSON string.`;

  try {
    const ai = getGeminiClient();
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

export async function generateNarrative(events: { title: string; rationale: string }[]) {
  if (!events || events.length === 0) return null;
  
  const eventsContext = events.slice(0, 20).map(e => `- ${e.title}: ${e.rationale}`).join('\n');
  const prompt = `You are an elite quantitative analyst. Analyze the following recent market events and synthesize a cohesive market narrative.
Events:
${eventsContext}

Output exactly a single JSON object matching this schema:
{
  "dominant_theme": "1-3 word short string representing the dominant market theme",
  "key_risks": ["Risk 1", "Risk 2"],
  "bullish_assets": ["Asset 1", "Asset 2"],
  "bearish_assets": ["Asset 1", "Asset 2"],
  "summary": "1-3 sentence cohesive narrative explaining the market rotation and why."
}
Do not use markdown blocks.`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            dominant_theme: { type: 'STRING' },
            key_risks: { type: 'ARRAY', items: { type: 'STRING' } },
            bullish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
            bearish_assets: { type: 'ARRAY', items: { type: 'STRING' } },
            summary: { type: 'STRING' }
          },
          required: ['dominant_theme', 'key_risks', 'bullish_assets', 'bearish_assets', 'summary']
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('[Gemini Narrative] Execution error:', error);
    return null;
  }
}
