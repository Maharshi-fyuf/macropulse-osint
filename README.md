<div align="center">

# 🛰️ MacroPulse OSINT

**AI-powered geopolitical intelligence for macro traders.**

An open-source, mobile-first Progressive Web App that continuously ingests global news via RSS, runs each headline through Google Gemini Flash for real-time macro analysis, and surfaces only the events that move markets — ranked by severity, tagged by asset class, and delivered in under 3 seconds.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

</div>

---

## ✨ Why MacroPulse?

Most OSINT dashboards are either paywalled, cluttered, or built for desktops. MacroPulse is different:

- **🧠 Gemini Flash Analysis** — Every headline is scored 1–10 for market severity and tagged with bullish/bearish asset impacts using structured JSON output.
- **⚡ 20-Minute Refresh Cycle** — A serverless GitHub Actions cron pings the ingestion API every 20 minutes, so you never miss a macro catalyst.
- **📱 Mobile-First PWA** — Install it on your home screen. Pull-to-refresh. True dark mode at `#0D0D0D`. Built for one-handed trading workflows.
- **🔓 Fully Open Source** — Fork it, extend it, self-host it. No API keys are hardcoded. No vendor lock-in.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  GitHub Actions (cron: */20 * * * *)                │
│  ┌───────────────────────────────────────────────┐  │
│  │  curl → /api/cron/fetch-news (Bearer token)   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Next.js API Route (App Router)                     │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ RSS     │──▶│ Gemini   │──▶│ Supabase         │ │
│  │ Parser  │   │ Flash    │   │ (events table)   │ │
│  └─────────┘   └──────────┘   └──────────────────┘ │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  React PWA (Mobile-First)                           │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ FilterBar   │  │ EventCards │  │ Pull-to-     │  │
│  │ (asset cls) │  │ (severity) │  │ Refresh      │  │
│  └─────────────┘  └────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer        | Technology                                                     |
| ------------ | -------------------------------------------------------------- |
| Framework    | [Next.js 16](https://nextjs.org/) (App Router, Turbopack)      |
| AI Engine    | [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai` |
| Database     | [Supabase](https://supabase.com/) (PostgreSQL + RLS)           |
| RSS Parsing  | [`rss-parser`](https://www.npmjs.com/package/rss-parser)       |
| Automation   | GitHub Actions (cron every 20 min)                             |
| Frontend     | React 19, CSS (true dark mode), PWA manifest                   |
| Deployment   | [Vercel](https://vercel.com/)                                  |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A free [Supabase](https://supabase.com/) project
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- A [Vercel](https://vercel.com/) account (for deployment) or any Node.js hosting

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/macropulse-osint.git
cd macropulse-osint
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key

# Cron Endpoint Security (generate a strong random string)
CRON_SECRET=your-random-secret-here

# Optional: Custom RSS Feeds (comma-separated)
RSS_FEEDS=https://search.cnbc.com/rs/search/combinedfeed.cxml,https://www.reutersagency.com/feed/?taxonomy=keywords&term=geopolitics
```

> [!IMPORTANT]
> **Where to find these values:**
>
> | Variable                        | Location                                                                 |
> | ------------------------------- | ------------------------------------------------------------------------ |
> | `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard → Settings → API → Project URL                        |
> | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key               |
> | `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Dashboard → Settings → API → `service_role` key (keep secret!) |
> | `GEMINI_API_KEY`                | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key  |
> | `CRON_SECRET`                   | Generate your own (e.g., `openssl rand -hex 32`)                         |

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗃️ Database Setup

Navigate to your Supabase project's **SQL Editor** and run the following schema:

```sql
-- 1. Table Definition
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_market_moving BOOLEAN DEFAULT false,
    rationale TEXT,
    severity_score SMALLINT CHECK (severity_score BETWEEN 1 AND 10),
    asset_class VARCHAR(50),
    bullish_assets TEXT[],
    bearish_assets TEXT[]
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_events_market_moving_date
  ON events(is_market_moving, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_severity
  ON events(severity_score DESC);

-- 3. Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON events
    FOR SELECT
    TO public
    USING (true);
```

> [!NOTE]
> RLS is enabled with a read-only public policy. The ingestion API uses the `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS) to insert new events server-side. End users can only **read** data through the anon key — they can never modify it.

---

## ⏱️ GitHub Actions — Automated Ingestion

The repository includes a pre-configured workflow at `.github/workflows/ingest.yml` that triggers the ingestion endpoint every 20 minutes.

### Setup

1. Push this repository to GitHub.
2. Go to your repository's **Settings → Secrets and variables → Actions**.
3. Add two **Repository Secrets**:

| Secret Name   | Value                                               |
| ------------- | --------------------------------------------------- |
| `APP_URL`     | Your deployed URL (e.g., `https://macropulse.vercel.app`) |
| `CRON_SECRET` | The same value you set in `.env.local`              |

### How It Works

```yaml
on:
  schedule:
    - cron: '*/20 * * * *'   # Every 20 minutes
  workflow_dispatch:           # Manual trigger button

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger News Ingestion Cron
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/fetch-news" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            --fail
```

The workflow sends a `GET` request with a `Bearer` token. The API route validates the token before processing — unauthorized requests receive a `401`.

> [!TIP]
> You can also trigger the workflow manually from the **Actions** tab in your GitHub repository using the `workflow_dispatch` event.

---

## 📂 Project Structure

```
macropulse-osint/
├── .github/
│   └── workflows/
│       └── ingest.yml              # Cron automation (every 20 min)
├── public/
│   └── manifest.json               # PWA configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── cron/
│   │   │       └── fetch-news/
│   │   │           └── route.ts    # RSS → Gemini → Supabase pipeline
│   │   ├── globals.css             # Dark mode theme & design tokens
│   │   ├── layout.tsx              # Root layout with PWA meta tags
│   │   └── page.tsx                # Main feed view with pull-to-refresh
│   ├── components/
│   │   ├── EventCard.tsx           # Severity-coded news card
│   │   └── FilterBar.tsx           # Asset class filter chips
│   └── lib/
│       ├── supabase.ts             # Server-side admin client
│       └── supabase-client.ts      # Client-side public client
├── docs/                           # Design specs & implementation plans
├── schema.sql                      # Database schema (copy into Supabase)
├── .env.local                      # Local secrets (git-ignored)
└── package.json
```

---

## 🔒 Security Checklist

- [x] `.env*` is listed in `.gitignore` — no secrets will be committed
- [x] `*.pem` files are git-ignored
- [x] `SUPABASE_SERVICE_ROLE_KEY` is server-only (never exposed to the browser via `NEXT_PUBLIC_`)
- [x] Cron endpoint validates `Authorization: Bearer <CRON_SECRET>` on every request
- [x] Supabase RLS enforces read-only access for anonymous users
- [x] GitHub Actions secrets are encrypted at rest and never printed in logs

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with 🛰️ by macro traders, for macro traders.**

[Deploy on Vercel](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL) · [Report a Bug](https://github.com/YOUR_USERNAME/macropulse-osint/issues) · [Request a Feature](https://github.com/YOUR_USERNAME/macropulse-osint/issues)

</div>
