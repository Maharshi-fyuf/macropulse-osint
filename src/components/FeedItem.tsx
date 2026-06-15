import React, { memo } from 'react';
import { getTradingViewSymbol } from '@/lib/tickerMap';

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

function getSeverityStyle(score: number): string {
  if (score >= 9) return 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse';
  if (score >= 8) return 'text-red-400 bg-red-400/10 border-red-400/20';
  if (score >= 5) return 'text-slate-400 bg-slate-800/50 border-slate-700';
  return 'text-slate-500 border-transparent';
}

const FeedItem = memo(function FeedItem({ event, isActive, onSelect }: FeedItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border-b border-slate-800 p-3 transition-colors ${
        isActive ? 'bg-slate-800/50' : 'hover:bg-slate-900/50 bg-slate-950'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {event.source} • {formatTimeAgo(event.published_at)}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${getSeverityStyle(
            event.severity_score
          )}`}
        >
          {event.severity_score}/10
        </span>
      </div>
      <h3 className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
        {event.title}
      </h3>
    </div>
  );
});

export default FeedItem;
