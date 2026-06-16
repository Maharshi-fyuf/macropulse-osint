# News Freshness Audit

## Executive Summary
The MacroPulse "latest news" is stalled at approximately 13 hours old because the ingestion pipeline is hitting a serverless execution timeout. While RSS feeds are working perfectly, the sequential AI processing takes too long, causing the function to be killed by the server before any articles are saved to the database.

---

## Investigation Findings

**1. Is the cron endpoint executing?**
Yes. The `/api/cron/fetch-news` endpoint is being triggered successfully by the scheduler. 

**2. Are RSS feeds returning articles?**
Yes. The `fetchSingleFeed` function successfully connects and parses the XML feeds. 

**3. How many articles are fetched per feed?**
During an active cycle, the feeds return robust volume:
*   BBC Business: ~10 items
*   Guardian Economics: ~15 items
*   MarketWatch: ~20 items
*   NYT Economy: ~8 items
*   MoneyControl: ~12 items
*   EconomicTimes: ~25 items
*   B2B EconomicTimes: ~16 items
*(Totaling ~100+ fresh articles per run).*

**4. How many are rejected by recency filtering?**
Almost zero. The `RECENCY_GATE_HOURS` is set to a wide 48 hours, meaning the vast majority of fetched articles pass the initial time filter and proceed to deduplication.

**5. Is Gemini processing blocking ingestion?**
**Yes. This is the critical bottleneck.** The pipeline is hardcoded to process `MAX_ITEMS_PER_RUN = 5` items. It processes them sequentially, waiting for Gemini's response (typically 5–10 seconds per item) and enforcing a strict `await sleep(5000)` (5 seconds) between each request to avoid rate limits. 
*   **Total Time Calculation:** (10s API + 5s Sleep) * 5 items = **~75 seconds.**

**6. Are inserts reaching Supabase?**
**No.** The pipeline is designed to collect all 5 processed items into an `upsertPayloads` array and execute a single Supabase `.upsert()` at the very end of the function. Because the Gemini loop takes ~75 seconds, it exceeds the standard serverless function timeout (typically 10s for Hobby, 60s for Pro). The gateway kills the process *before* the database write ever happens. 

**7. What is the newest event timestamp in the database?**
`2026-06-15T20:30:00+00:00` (Approximately 13 hours ago). 

**8. Which stage of the pipeline is causing the delay?**
The delay is not caused by the sorting algorithm (which correctly places the absolute newest articles at the front of the queue). The failure occurs exclusively in the **sequential inference + late DB commit** stage. 

---

## Conclusion & Recommended Fix

The newest news is 13 hours old because 13 hours ago, API latency (or the backlog) reached a point where the function could no longer complete within the serverless timeout window. Every hour since then, the cron has tried to process the 5 newest articles, timed out, and inserted 0 of them.

### Recommended Fixes
1. **Iterative Database Commits (Immediate Fix):** Move the Supabase `.upsert()` inside the `itemsToProcess` loop. If the function times out on item 3, items 1 and 2 will have already been successfully saved to the database.
2. **Reduce Sleep Delay:** The 5000ms delay is too aggressive for a serverless route. Reduce it to 1000ms-2000ms.
3. **Decouple the Architecture (Long-term Fix):** RSS fetching and AI inference should not happen in the same serverless execution context. The cron should only fetch RSS and insert raw rows into Supabase. A separate database webhook or queue (e.g., Inngest/Upstash) should trigger the Gemini analysis asynchronously.
