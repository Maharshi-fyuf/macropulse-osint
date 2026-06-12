# Product Requirements Document (PRD) - MacroPulse OSINT
**Project Vision:** A lightweight, high-speed open-source mobile dashboard that synthesizes real-time geopolitical and political news into direct macro-economic trading perspectives for commodities, forex, and equities.

## 1. Core User Personas
* **The Macro/Commodity Trader:** Needs instant clarity on how geopolitical conflicts, election results, or trade policies will shift market prices, without reading thousands of words.

## 2. Scope & Feature Requirements
* **FR-1: Automated OSINT Feed Ingestion:** Automatically poll trusted, high-signal global news sources every 15-30 minutes.
* **FR-2: AI Macro Synthesis:** Filter out non-market noise and analyze relevant events for market impact, asset correlations, and threat scores (1-10).
* **FR-3: Mobile-First Dashboard:** A hyper-clean, scannable interface displaying events ordered by chronological urgency and impact severity.
* **FR-4: Quick-Search & Filters:** Filter events by asset class (e.g., Energy, Metals, Forex, Equities) or impact magnitude.
* **FR-5: Open Source & Self-Hostable:** Built entirely with free-tier cloud architectures so anyone can fork the GitHub repo and deploy it for themselves in 5 minutes.

## 3. Non-Functional Requirements
* **NFR-1: Performance:** Initial mobile view paint in < 1.5 seconds.
* **NFR-2: Cost Efficiency:** Must operate 100% within the free tiers of GitHub, Supabase, and Gemini API.
* **NFR-3: Mobile UX:** Optimized entirely for touch interactions, high-contrast readability under bright lights, and zero layout shifting (CLS).