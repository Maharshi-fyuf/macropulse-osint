# Technical Requirements Document (TRD)
**Target Stack:** Next.js 14/15 (App Router), Tailwind CSS, Lucide React icons, Supabase (PostgreSQL), Gemini 2.5 Flash (via Google Gen AI SDK), GitHub Actions.

## 1. System Architecture & Automation
Instead of hosting a 24/7 background Python script, the entire background automation is serverless:
1.  **Trigger:** A GitHub Action workflow runs on a cron schedule (`*/30 * * * *`).
2.  **Execution:** The workflow triggers a secure Next.js API Route handler (`/api/cron/fetch-news`) via a secret token header.
3.  **Processing:** The route fetches target RSS feeds, checks the database to skip existing links, sends new content to Gemini Flash, and stores the structured JSON payload into Supabase.

## 2. API Specifications & Data Contract

### AI Processing Prompt Contract
```text
You are a senior macro-economic trading analyst and geopolitical OSINT expert.
Analyze the following news item:
Title: {TITLE}
Source: {SOURCE}
Content: {CONTENT}

Output exactly a single JSON object matching this schema:
{
  "is_market_moving": boolean,
  "rationale": "1-2 sentence explanation of the geopolitical context",
  "severity_score": integer (1-10),
  "primary_asset_class": "Energy" | "Metals" | "Forex" | "Equities" | "None",
  "bullish_assets": ["Asset/Ticker 1", "Asset 2"],
  "bearish_assets": ["Asset/Ticker 1", "Asset 2"]
}
If "is_market_moving" is false, return "None" for asset class and empty arrays. Do not add markdown code blocks around the JSON string.