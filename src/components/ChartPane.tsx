import React, { memo } from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { MarketEvent } from './FeedItem';


const MemoizedAdvancedChart = memo(({ symbol }: { symbol: string }) => (
  <AdvancedRealTimeChart 
    theme="dark" 
    symbol={symbol} 
    autosize 
    hide_side_toolbar={false}
    allow_symbol_change={true}
    save_image={false}
    toolbar_bg="#09090b"
  />
));

export default function ChartPane({ event }: { event: MarketEvent | null }) {
  if (!event) {
    return (
      <div className="h-full w-full bg-[#09090b]">
        <MemoizedAdvancedChart symbol="CME_MINI:ES1!" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#09090b]">
      <MemoizedAdvancedChart symbol={event.ticker} />
    </div>
  );
}
