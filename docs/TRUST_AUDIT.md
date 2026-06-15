# MacroPulse Trust Audit

This document outlines the data sources, validation methods, and fallback behaviors for every user-visible metric in the MacroPulse Terminal. It serves as a contract ensuring no fabricated data is presented to the user.

## 1. Global Risk Index
* **Source:** Supabase `events` table (last 24 hours of ingested news).
* **Update Frequency:** Dynamically calculated every 60 seconds via `/api/risk-index` route.
* **Validation Method:** Server-side aggregation of `severity_score` across all events. Caps out at 100.
* **Fallback Behavior:** If database is unreachable or no events exist, returns 0 score with explanation "AWAITING DATA".

## 2. Quant Tape (Prices)
* **Source:** `yahoo-finance2` API via serverless function `/api/prices`.
* **Update Frequency:** Every 60 seconds via SWR client-side polling, cached server-side for 5 minutes.
* **Validation Method:** Server-side try/catch wrapping Yahoo Finance requests.
* **Fallback Behavior:** If an asset fails to fetch, it is gracefully omitted from the ticker tape.

## 3. Market Narrative
* **Source:** Google Gemini 2.5 Flash via Supabase `narratives` table.
* **Update Frequency:** Re-generated automatically by the background cron job (`newsIngestionService`) after processing new events.
* **Validation Method:** Gemini prompt enforcing strictly JSON output parsed with `JSON.parse`.
* **Fallback Behavior:** "Not enough data to generate narrative" is displayed if the database query fails or no narrative exists.

## 4. Event Feed (Severity & Risk)
* **Source:** AI Ingestion pipeline parsing RSS feeds and determining severity via Gemini 2.5 Flash.
* **Update Frequency:** Supabase `events` table updated by external cron task.
* **Validation Method:** Zod `MarketEventSchema` validation on Gemini output before database insertion.
* **Fallback Behavior:** Invalid AI responses are skipped and logged as `analysis_failed`.

## 5. System Health
* **Source:** `/api/health` endpoint performing live connectivity checks (Supabase ping, Yahoo ping, latest data freshness).
* **Update Frequency:** Every 60 seconds via SWR.
* **Validation Method:** Try/catch blocks and timestamp diffs.
* **Fallback Behavior:** Fails to RED or YELLOW state based on specific service outage.

> [!CAUTION]
> The AI Confidence metric (previously displayed on each feed item) has been permanently removed, as it was a synthetic formula not backed by the model's actual confidence probability.
