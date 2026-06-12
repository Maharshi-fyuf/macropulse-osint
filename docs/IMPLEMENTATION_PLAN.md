## Milestone Schedule

### Days 1-2: Database, Integration Foundations, & API Logic
* **Goal:** Build the system backend and ensure reliable data capture.
* **Tasks:**
    * Initialize the Next.js project repository and provision a free Supabase instance using the schema file.
    * Build `/api/cron/fetch-news` inside Next.js using `rss-parser` to capture global articles.
    * Integrate the `@google/genai` SDK and verify structured JSON extraction from the prompt layout.

### Days 3-4: Mobile UI Engineering & Live Feed Testing
* **Goal:** Complete the entire client view.
* **Tasks:**
    * Create a clean, responsive mobile list component with Tailwind CSS using the design specification colors.
    * Build interactive filter chips (Energy, Metals, Forex) using client-side React hooks for instantaneous feedback.
    * Configure the basic web app manifest file (`public/manifest.json`) to establish mobile PWA support.

### Days 5-6: Automation Engineering & Optimization Guardrails
* **Goal:** Automate live operation and optimize error handling.
* **Tasks:**
    * Configure the `.github/workflows/ingest.yml` script using a regular cron schema to hit your API route securely.
    * Implement data sanitation, try/catch code blocks, and limits to guarantee handling errors gracefully.
    * Verify cross-device appearance and layout sizing inside Google Chrome DevTools mobile emulator.

### Day 7: Repository Standardization & Open-Source Launch
* **Goal:** Push clean, public code to production.
* **Tasks:**
    * Add a detailed `README.md` containing simple "Deploy to Vercel" and "Deploy to Supabase" instructions.
    * Perform a final code audit to remove sensitive development environment credentials before marking the GitHub repository public.