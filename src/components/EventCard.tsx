import React from 'react';

export interface MarketEvent {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  created_at: string;
  is_market_moving: boolean;
  rationale: string | null;
  severity_score: number;
  asset_class: string | null;
  bullish_assets: string[];
  bearish_assets: string[];
}

interface EventCardProps {
  event: MarketEvent;
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

export default function EventCard({ event }: EventCardProps) {
  // Determine severity color based on score (1-10)
  const getSeverityStyle = (score: number) => {
    if (score >= 8) {
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    if (score >= 5) {
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  const hasBullish = event.bullish_assets && event.bullish_assets.length > 0;
  const hasBearish = event.bearish_assets && event.bearish_assets.length > 0;

  return (
    <div className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 mb-4 shadow-lg transition duration-200 hover:border-zinc-700">
      {/* Top Row: Meta Data & Severity */}
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {event.source} • {formatTimeAgo(event.published_at)}
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getSeverityStyle(
            event.severity_score
          )}`}
        >
          Severity: {event.severity_score}/10
        </span>
      </div>

      {/* Main Headline */}
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block mb-2"
      >
        <h2 className="text-base font-bold text-white leading-snug group-hover:text-zinc-300 transition-colors">
          {event.title}
        </h2>
      </a>

      {/* AI Rationale */}
      {event.rationale && (
        <p className="text-sm text-zinc-300 mb-4 border-l-2 border-zinc-600 pl-3 leading-relaxed">
          {event.rationale}
        </p>
      )}

      {/* Trading Impact Badges */}
      {(hasBullish || hasBearish) && (
        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
          {hasBullish && (
            <div className="bg-green-950/20 text-green-400 p-2 rounded-lg border border-green-900/30">
              <span className="block text-[10px] font-bold mb-1 opacity-70 tracking-wider">
                ▲ BULLISH
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {event.bullish_assets.map((asset, i) => (
                  <span
                    key={i}
                    className="bg-green-900/40 px-1.5 py-0.5 rounded text-[11px] font-semibold"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasBearish && (
            <div className="bg-red-950/20 text-red-400 p-2 rounded-lg border border-red-900/30">
              <span className="block text-[10px] font-bold mb-1 opacity-70 tracking-wider">
                ▼ BEARISH
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {event.bearish_assets.map((asset, i) => (
                  <span
                    key={i}
                    className="bg-red-900/40 px-1.5 py-0.5 rounded text-[11px] font-semibold"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
