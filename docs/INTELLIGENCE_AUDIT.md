# Intelligence Quality Audit

## Phase 1: Narrative Quality Audit
**Score: 4/10**

### Analysis
The narrative engine (located in `src/lib/ai/geminiClient.ts`) feeds the titles and rationales of the last 20 events into Gemini 2.5 Flash with a very basic prompt:
*"You are an elite quantitative analyst. Analyze the following recent market events and synthesize a cohesive market narrative."*

1. **Is the narrative generic?** Yes. The instruction to write a "1-3 sentence cohesive narrative explaining the market rotation" lacks specific analytical constraints, leading to broad, horoscope-like financial summaries.
2. **Is it repetitive?** Yes. Because the prompt structure is identical every time and doesn't inject counter-narratives or demand contrasting viewpoints, the LLM will fall into predictable linguistic patterns (e.g., "Markets are currently navigating headwinds...").
3. **Does it explain why events matter?** Only superficially. It summarizes the events but does not link them to macroeconomic fundamentals (like yield curves, liquidity, or inflation expectations).
4. **Does it identify relationships?** Weakly. It forces events into a "dominant theme" but doesn't critically analyze causations, contradictions, or divergences (e.g., "News says X, but asset Y is doing Z").
5. **Does it provide actionable context?** No. The `bullish_assets` and `bearish_assets` in the narrative schema are just arrays of strings (e.g., `["Gold", "Bonds"]`) without any required reasoning, making them unactionable.

**Biggest Weakness:** The prompt treats the LLM like a basic summarization tool rather than a reasoning engine. 

---

## Phase 2: Global Risk Index Audit
**Score: 2/10**

### Analysis
The Risk Index is calculated in `/api/risk-index/route.ts` using the following formula based on the last 24 hours of events:
`avgSeverity = sum(severity) / count`
`countFactor = min(20, count / 2)`
`Score = min(100, round(30 + (avgSeverity * 4) + countFactor))`

1. **Is the score meaningful?** No. With a base score of 30, even on a day with absolutely zero macro risk (e.g., one severity-1 event), the score is `30 + 4 + 0.5 = 35`. A day with 40 severity-10 events (apocalyptic) would score `30 + 40 + 20 = 90`. The scale is entirely compressed between 35 and 90.
2. **Is it predictive?** No. It is a strictly backward-looking moving average of LLM severity scores.
3. **Is it stable?** It is *too* stable. Because it relies on a simple arithmetic mean, ten fluffy articles (severity 2) will mathematically dilute a single massive black-swan article (severity 10).
4. **Can users understand it?** The 0-100 scale is familiar, but the arbitrary `+ 30` base and `countFactor` make the actual number disconnected from reality.

### Proposed Better Formula
Risk should scale exponentially with severity, not linearly. A severity 9 event should completely override ten severity 3 events.
```javascript
// Exponential severity weighting
const exponentialSum = events.reduce((sum, e) => sum + Math.pow(e.severity_score, 2), 0);
const weightedAvg = Math.sqrt(exponentialSum / count); 

// Velocity factor (is news accelerating compared to a 7-day baseline?)
const velocityMultiplier = current24hCount / average24hCount7Days;

const score = Math.min(100, Math.round(weightedAvg * 10 * velocityMultiplier));
```

---

## Phase 3: Market Impact Quality
**Score: 5/10**

### Analysis
Event impact is generated via `analyzeWithGemini()` using the format: `["Asset/Ticker 1: Reason why"]`.

1. **Are mappings reasonable?** Mostly yes. By forcing the LLM to output the "Reason why" in the same string as the asset, it prevents completely random hallucinations and forces a chain-of-thought justification.
2. **Are outputs generic?** Yes. Without a defined universe of tradable assets, Gemini defaults to the most generic macro tickers (Gold, USD, SPY, Treasury Yields). 
3. **Does Gemini overuse the same assets?** Yes. Every geopolitical event will reliably output "Gold (Bullish)" and "Equities (Bearish)".
4. **Are recommendations explainable?** Yes, but technically brittle. The frontend splits the string using `asset.split(':')`. If Gemini decides to use a colon in its reasoning (e.g., `Gold: Safe haven due to: war`), the UI rendering breaks or truncates the logic.

---

## Phase 4: User Value Audit
**Score: 1/10**

### Brutally Honest Assessment
Currently, MacroPulse provides **nothing** of unique, retainable value. 

* **TradingView** provides vastly superior, real-time quantitative data.
* **Bloomberg/Reuters** provide the exact same news headlines, but faster.
* **Perplexity/ChatGPT** can provide better ad-hoc macro summaries without the rigid, arbitrary scoring system.

MacroPulse is currently functioning as a thin, delayed RSS wrapper fed through a generic LLM summarization prompt. A busy investor checking this for 5 minutes a day will quickly realize they are just reading generic AI summaries of public news, padded with arbitrary numbers.

---

## Phase 5: Identify the "Holy Shit" Feature

To survive, MacroPulse must pivot from **Information Summarization** to **Insight Generation**.

### The Holy Shit Feature: Second-Order Effect Forecasting & Historical Analogs

LLMs are mediocre at predicting the future, but they are *exceptional* at mapping second and third-order effects, and finding historical analogs. 

Instead of saying: *"The Fed cut rates. Bullish for SPY."* (Users already know this).

MacroPulse should say:
*"The Fed cut rates while manufacturing PMI is below 45. **Historical Analog:** This exact divergence occurred in 2001 and 2007. While headline equities (SPY) initially rallied, the second-order effect was a 30% drawdown in high-yield credit (HYG) within 60 days. **Hidden Vulnerability:** Auto-loan backed securities."*

**How to implement it:**
1. Upgrade the `analyzeWithGemini` prompt to specifically demand "Second-Order Effects" (e.g., If X happens, who relies on X? Who relies on the people who rely on X?).
2. Introduce a "Historical Analog" pipeline. Have the AI query a vector database (or use its vast training data) to find the 3 closest historical matches to the current macro regime, and output exactly what happened to asset classes 30/60/90 days later.

---

## Deliverable Summary

1. **Narrative Score:** 4/10
2. **Risk Index Score:** 2/10
3. **Market Impact Score:** 5/10
4. **User Value Score:** 1/10
5. **Biggest Weakness:** Treating the LLM as a text summarizer rather than a deep reasoning/correlation engine. The risk math is also completely arbitrary.
6. **Biggest Opportunity:** Shifting from "What happened?" (News) to "What are the hidden structural vulnerabilities and historical analogs?" (Intelligence).
7. **Recommended Next Sprint:** **The Deep Reasoning Sprint.** Overhaul the Gemini prompts to enforce second-order thinking, rewrite the Risk Index math to use exponential severity weighting, and implement the Historical Analog feature.
