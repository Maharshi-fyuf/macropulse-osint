import React, { memo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChartPaneProps } from './types';
import { useChartData } from './useChartData';
import dynamic from 'next/dynamic';

const ChartCanvas = dynamic(() => import('./ChartCanvas').then((mod) => mod.ChartCanvas), { ssr: false });

const ChartPane = memo(function ChartPane({ event, prediction, events }: ChartPaneProps) {
  const [customSymbol, setCustomSymbol] = useState('');
  const [inputValue, setInputValue] = useState('');

  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams?.get('symbol');

  useEffect(() => {
    if (urlSymbol) {
      setCustomSymbol(urlSymbol.toUpperCase());
      setInputValue(urlSymbol.toUpperCase());
    } else if (event) {
      setCustomSymbol('');
      setInputValue('');
    }
  }, [event, urlSymbol]);

  const targetSymbol = customSymbol || event?.ticker || '^NSEI';
  const activePrediction = customSymbol ? null : prediction;

  const { data, loading, error, resolvedSymbol } = useChartData(targetSymbol);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setCustomSymbol(inputValue.trim().toUpperCase());
    }
  };

  return (
    <div className="h-full w-full bg-[#09090b] relative overflow-hidden flex flex-col">
      <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 z-20 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest pointer-events-none">
            Native Chart
          </span>
          <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest pointer-events-none">
            {resolvedSymbol}
          </span>
          {activePrediction && (
            <span className="text-[9px] font-mono text-cyan-700 uppercase tracking-widest pointer-events-none border border-cyan-900/50 rounded px-1 py-0.5">
              GBM active
            </span>
          )}
        </div>

        <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded px-1.5 py-0.5 ml-auto mr-4 hidden sm:flex">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pr-2 mr-2 border-r border-zinc-800 pointer-events-none">
            Indicators
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setShowSma20(!showSma20)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showSma20 ? 'bg-purple-900/40 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowSma50(!showSma50)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showSma50 ? 'bg-orange-900/40 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SMA 50
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded transition-colors ${showVolume ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              VOL
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. AAPL)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-24 sm:w-32 bg-[#18181b] border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-300 uppercase transition-colors"
          >
            Load
          </button>
        </form>
      </div>

      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 z-20 bg-[#09090b] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 max-w-xs text-center p-4">
              <div className="w-6 h-6 text-red-500 mb-2">⚠</div>
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">Chart Failed to Load</span>
              <span className="text-xs text-zinc-500 mt-2">{error}</span>
            </div>
          </div>
        )}
        <ChartCanvas
          symbol={resolvedSymbol}
          data={data}
          loading={loading}
          prediction={activePrediction}
          showSma20={showSma20}
          showSma50={showSma50}
          showVolume={showVolume}
          events={events}
        />
      </div>
    </div>
  );
});

export default ChartPane;
