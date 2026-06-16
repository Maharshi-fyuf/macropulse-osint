# Deep Reasoning Feasibility Study

## 1. Historical Analog Retrieval
*   **What data already exists?** Only a flat table of recent RSS news events (`events` table) captured since the system went live.
*   **What data is missing?** A multi-decade database of historical macroeconomic events, semantic vector embeddings to search them, and historical asset price data to measure the actual past impact.
*   **What must be stored going forward?** `pgvector` embeddings of all incoming events for similarity matching, plus historical datasets.
*   **Can it be implemented reliably?** **No.** Relying entirely on an LLM's parametric memory to recall historical analogs and precise market reactions will inevitably result in fabricated intelligence (hallucinations).
*   **Level of Confidence:** Zero without an external historical database and RAG architecture.

## 2. Second-Order Effect Forecasting
*   **What data already exists?** Real-time news events and Gemini 2.5 Flash API access.
*   **What data is missing?** Hardcoded supply chain graphs or macroeconomic dependency trees. 
*   **What must be stored going forward?** Structured JSON responses that capture the logical chain of thought (Event -> First Order -> Second Order) rather than just the final asset.
*   **Can it be implemented reliably?** **Yes.** LLMs excel at qualitative, structural reasoning if forced to "think step-by-step" through a prompt.
*   **Level of Confidence:** Medium-High. While it cannot provide exact price targets, an LLM can reliably deduce that a copper shortage (1st order) impacts EV manufacturing margins (2nd order).

## 3. Event Correlation Analysis
*   **What data already exists?** A rolling 24-48 hour window of global news events stored in the database.
*   **What data is missing?** Named entity recognition (NER) tags, event clustering IDs, and tracking of ongoing storylines over time.
*   **What must be stored going forward?** Entity arrays (e.g., `["OPEC", "Fed"]`) and cluster grouping metadata on the `events` table.
*   **Can it be implemented reliably?** **Yes.** By feeding batches of concurrent events to Gemini and asking it to group them by underlying macro drivers.
*   **Level of Confidence:** High for thematic grouping, but low for mathematical correlation without price data.

## 4. Asset Reaction Modeling
*   **What data already exists?** `yahoo-finance2` provides live spot prices (`quote()`), but the system stores no historical timeseries data.
*   **What data is missing?** High-resolution historical price data before, during, and after events (T-1, T0, T+7, T+30).
*   **What must be stored going forward?** A quantitative tracking system that records the actual % change of an asset at intervals after an event is published to validate the AI's prediction.
*   **Can it be implemented reliably?** **No.** The system currently has zero capability to mathematically model or backtest asset reactions.
*   **Level of Confidence:** Zero. Any quantitative modeling done by the LLM alone would be entirely fabricated.

---

## The Minimum Viable "Holy Shit" Feature

Based on current infrastructure constraints, we cannot build Historical Analogs or Asset Reaction Modeling without introducing hallucinations. However, we *can* build **Second-Order Effect Forecasting** immediately using pure LLM structural reasoning.

### The MVP: The "Hidden Vulnerability" Chain
Instead of asking Gemini to arbitrarily pick "bullish" and "bearish" assets, we restructure the `analyzeWithGemini` schema to force a chain-of-thought derivation of a non-obvious trade.

We require the model to output:
1.  **`first_order_impact`**: The obvious, immediate market reaction (e.g., "Oil prices spike").
2.  **`second_order_effect`**: The structural consequence of the first order impact (e.g., "European airline operating margins collapse").
3.  **`hidden_vulnerability`**: The specific, non-obvious asset class or sector exposed to the second-order effect (e.g., "European Budget Airlines").

**Why this works:**
*   It requires **zero** new database architecture.
*   It requires **zero** historical price data.
*   It forces the LLM to explain its reasoning, making it immediately auditable and highly valuable to the user.
*   It shifts the product from telling the user what they already know (First Order) to generating unique analytical insight (Second Order).
