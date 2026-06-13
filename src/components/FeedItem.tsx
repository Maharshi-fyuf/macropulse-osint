import React, { memo } from 'react';
import { getTradingViewSymbol } from '@/lib/tickerMap';

// Re-export so existing callers (`import { getTradingViewSymbol } from '@/components/FeedItem'`)
// continue to work without modification.
export { getTradingViewSymbol };

export interface MarketEvent {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  created_at: string;
  is_market_moving: boolean;
  rationale: string | null;
  content?: string | null;
  severity_score: number;
  asset_class: string | null;
  bullish_assets: string[];
  bearish_assets: string[];
  ticker: string;
}

interface FeedItemProps {
  event: MarketEvent;
  isActive: boolean;
  onSelect: () => void;
}

export function formatTimeAgo(dateString: string): string {
  try {
    const now = new Date();
    const published = new Date(dateString);
    const diffMs = now.getTime() - published.getTime();
    if (isNaN(diffMs)) return 'unknown';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'unknown';
  }
}

// ── Severity badge colour helper (hoisted outside component to avoid re-creation) ──
function getSeverityStyle(score: number): string {
  if (score >= 8) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 5) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
}

/**
 * FeedItem — wrapped in React.memo.
 * Only re-renders when its own props change (event id, isActive, onSelect ref).
 * Because `onSelect` is a new closure every render in the parent, the parent must
 * wrap the callback in useCallback or accept the shallow re-render.
 * The memo still eliminates renders caused by unrelated parent state like
 * searchQuery, activeTab, feedError, and loading.
 */
const FeedItem = memo(function FeedItem({ event, isActive, onSelect }: FeedItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border-b border-zinc-800 p-3 transition-colors ${
        isActive ? 'bg-zinc-800/50' : 'hover:bg-zinc-900'
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {event.source} • {formatTimeAgo(event.published_at)}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getSeverityStyle(
            event.severity_score
          )}`}
        >
          {event.severity_score}/10
        </span>
      </div>
      <h3 className={`text-xs font-semibold leading-snug ${isActive ? 'text-white' : 'text-zinc-300'}`}>
        {event.title}
      </h3>
    </div>
  );
});

export default FeedItem;
