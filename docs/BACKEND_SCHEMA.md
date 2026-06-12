```markdown
# Database Schema (Supabase / PostgreSQL)

## 1. Table Definitions

### Table: `events`
Holds the core ingested news articles and their compiled AI macro analytics.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique ID |
| `title` | `text` | NOT NULL | Original article headline |
| `source` | `varchar(255)` | NOT NULL | Publisher name (e.g., Reuters) |
| `url` | `text` | UNIQUE, NOT NULL | Original link (prevents duplication) |
| `published_at` | `timestamptz` | NOT NULL | Article publication timestamp |
| `created_at` | `timestamptz` | DEFAULT now() | Ingestion timestamp |
| `is_market_moving`| `boolean` | DEFAULT false | AI flagged market importance |
| `rationale` | `text` | HTML/Text | 1-2 sentence market context |
| `severity_score` | `smallint` | CHECK (severity_score BETWEEN 1 AND 10)| AI assigned impact value |
| `asset_class` | `varchar(50)` | | Core asset sector |
| `bullish_assets` | `text[]` | | Array of positive tickers/assets |
| `bearish_assets` | `text[]` | | Array of negative tickers/assets |

## 2. Database Performance Optimizations
```sql
-- High-speed query indexing for mobile feeds ordered by time and severity
CREATE INDEX idx_events_market_moving_date ON events(is_market_moving, published_at DESC);
CREATE INDEX idx_events_severity ON events(severity_score DESC);