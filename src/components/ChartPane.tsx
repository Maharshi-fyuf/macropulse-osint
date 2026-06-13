import React, { memo } from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { MarketEvent } from './FeedItem';

const getTradingViewSymbol = (assetClass: string | null) => {
  switch (assetClass) {
    case 'Energy': return 'NYMEX:CL1!';
    case 'Metals': return 'OANDA:XAUUSD';
    case 'Forex': return 'FX:EURUSD';
    case 'Equities': return 'CME_MINI:ES1!';
    default: return 'CME_MINI:ES1!'; // Default to S&P 500 if unknown/None
  }
};

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

  const symbol = getTradingViewSymbol(event.asset_class);

  return (
    <div className="h-full w-full bg-[#09090b]">
      <MemoizedAdvancedChart symbol={symbol} />
    </div>
  );
}
