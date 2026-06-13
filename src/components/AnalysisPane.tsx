import React, { memo } from 'react';
import { MarketEvent, formatTimeAgo } from './FeedItem';

interface AnalysisPaneProps {
  event: MarketEvent | null;
}

/**
 * AnalysisPane — wrapped in React.memo.
 * Only re-renders when the selected event reference changes.
 */
const AnalysisPane = memo(function AnalysisPane({ event }: AnalysisPaneProps) {
  if (!event) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs font-mono uppercase bg-[#09090b]">
        Select an event to view analysis
      </div>
    );
  }

  const hasBullish = event.bullish_assets && event.bullish_assets.length > 0;
  const hasBearish = event.bearish_assets && event.bearish_assets.length > 0;

  return (
    <div className="h-full w-full p-6 overflow-y-auto flex flex-col bg-[#09090b]">
      <div className="mb-4 pb-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-2 leading-snug">{event.title}</h2>
        <div className="flex gap-4 text-xs font-mono text-zinc-500">
          <span>SOURCE: {event.source}</span>
          <span>TIME: {formatTimeAgo(event.published_at)}</span>
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            [READ FULL]
          </a>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">AI Rationale</h3>
        <p className="text-sm text-zinc-300 leading-relaxed mb-6">
          {event.rationale || 'No rationale provided.'}
        </p>

        {(hasBullish || hasBearish) && (
          <div className="grid grid-cols-2 gap-4">
            {hasBullish && (
              <div className="bg-green-950/20 border border-green-900/30 rounded p-4">
                <span className="block text-[10px] font-bold text-green-500 mb-2 tracking-wider uppercase">
                  ▲ Bullish Impact
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.bullish_assets.map((asset, i) => (
                    <span key={i} className="bg-green-900/40 text-green-300 px-2 py-1 rounded-md text-xs font-semibold">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hasBearish && (
              <div className="bg-red-950/20 border border-red-900/30 rounded p-4">
                <span className="block text-[10px] font-bold text-red-500 mb-2 tracking-wider uppercase">
                  ▼ Bearish Impact
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {event.bearish_assets.map((asset, i) => (
                    <span key={i} className="bg-red-900/40 text-red-300 px-2 py-1 rounded-md text-xs font-semibold">
                      {asset}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default AnalysisPane;
