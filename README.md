<div align="center">
  <br />
  <h1>
    <img src="https://raw.githubusercontent.com/lightweight-charts/lightweight-charts/master/.github/logo.svg" width="30" alt="Logo"/> 
    MacroPulse OSINT Terminal 
    <img src="https://raw.githubusercontent.com/lightweight-charts/lightweight-charts/master/.github/logo.svg" width="30" alt="Logo"/>
  </h1>
  <p>
    <strong>An institutional-grade, multi-panel OSINT financial intelligence command center.</strong>
  </p>
  <p>
    MacroPulse 9.5+ harnesses Google Gemini, Supabase, and Yahoo Finance to deliver real-time sentiment analysis overlaid onto technical chart projections via Geometric Brownian Motion (GBM).
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Zod-3068b7?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  </p>
</div>

<hr />

## 🌟 Core Features Matrix

- **High-Density 3-Column Layout:** A minimalist sidebar navigation, an expansive `lightweight-charts` rendering canvas, and a real-time streaming intelligence feed.
- **Global Command Palette (`Ctrl + K`):** Instantly pivot the terminal’s active asset tracking by invoking the dark-mode ticker search modal anywhere in the workspace.
- **Live AI Intelligence Feed:** Automates scraping and deduplication of global financial RSS feeds, deploying Gemini 1.5 Pro to rigorously evaluate macroeconomic impact, outputting strict Zod-validated `bullish` or `bearish` asset targets.
- **Timeline Event Markers:** Historically significant financial events are extracted from the vector database and geometrically mapped directly onto the timeline of the targeted candlestick series.
- **Quantitative Engine (GBM):** Forecasts probability bounds (1σ confidence intervals) utilizing historical Volatility and AI-Sentiment augmented Drift bias.

## 🏗️ Architecture Overview

The system runs on a highly decoupled service layer architecture:
- `src/lib/finance/yahooClient.ts`: Next.js cached proxy executing server-side fetch logic for Yahoo Finance OHLC data.
- `src/lib/rss/feedFetcher.ts`: RSS parsing engine.
- `src/lib/services/newsIngestionService.ts`: Orchestrates the chronology of fetching feeds, deduplicating via URL signatures against Supabase, and managing the 5-second `GEMINI_INTER_REQUEST_DELAY_MS` rate-limit logic.
- `src/components/ChartPane/`: A meticulously decomposed frontend architecture separating state management (`useChartData.ts`), technical indicators (`Indicators.ts`), and the native WebGL chart canvas (`ChartCanvas.tsx`).

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+`
- A [Supabase](https://supabase.com/) Project
- A [Google Gemini](https://ai.google.dev/) API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Maharshi-fyuf/macropulse-osint.git
   cd macropulse-osint
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Launch the Terminal:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to access the MacroPulse command center.
