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

function getRiskClassification(score: number): { label: string; color: string; bg: string } {
  if (score >= 9) return { label: 'SEVERE SHOCK', color: 'text-red-500', bg: 'bg-red-950/30 border-red-900/50' };
  if (score >= 7) return { label: 'HIGH RISK EVENT', color: 'text-red-400', bg: 'bg-red-950/20 border-red-900/30' };
  if (score >= 5) return { label: 'ELEVATED CATALYST', color: 'text-yellow-400', bg: 'bg-yellow-950/20 border-yellow-900/30' };
  return { label: 'NOMINAL UPDATE', color: 'text-slate-400', bg: 'bg-slate-900/50 border-slate-800' };
}

function getDirectionalBg(event: MarketEvent): string {
  const bull = event.bullish_assets?.length || 0;
  const bear = event.bearish_assets?.length || 0;
  if (bull > bear) return 'bg-emerald-950/20 hover:bg-emerald-950/30';
  if (bear > bull) return 'bg-red-950/20 hover:bg-red-950/30';
  return 'bg-slate-950 hover:bg-slate-900/50';
}

const FeedItem = memo(function FeedItem({ event, isActive, onSelect }: FeedItemProps) {
  const risk = getRiskClassification(event.severity_score);
  const directionalBg = getDirectionalBg(event);
  
  // Deterministic mock confidence based on ID or score
  const confidence = 80 + (event.severity_score * 2);

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border-b border-slate-800 p-4 transition-colors ${
        isActive ? 'bg-slate-800/80' : directionalBg
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-widest ${risk.bg} ${risk.color}`}>
            {risk.label}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800 px-1.5 py-0.5 rounded-sm">
            AI CF: {confidence}%
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {formatTimeAgo(event.published_at)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {event.bullish_assets?.map(asset => (
          <span key={asset} className="text-[9px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
            ↑ {asset.split(':')[0]}
          </span>
        ))}
        {event.bearish_assets?.map(asset => (
          <span key={asset} className="text-[9px] font-bold text-red-500 bg-red-950/30 border border-red-900/50 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
            ↓ {asset.split(':')[0]}
          </span>
        ))}
        {(!event.bullish_assets?.length && !event.bearish_assets?.length) && (
          <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
            NO SPECIFIC ASSET IMPACT
          </span>
        )}
      </div>

      <h3 className={`text-sm font-bold leading-snug mb-1.5 ${isActive ? 'text-white' : 'text-slate-200'}`}>
        {event.title}
      </h3>
      
      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
        {event.rationale || event.content || 'No detailed rationale available.'}
      </p>

      <div className="flex items-center text-[9px] text-slate-600 uppercase tracking-widest">
        <span>SOURCE: {event.source}</span>
        <span className="mx-2">•</span>
        <span>SEVERITY: {event.severity_score}/10</span>
      </div>
    </div>
  );
});

export default FeedItem;
