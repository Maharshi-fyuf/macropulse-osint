import React, { memo, useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { ChartCanvasProps } from './types';
import { calculateSMA, generateVolumeData } from './Indicators';
import { usePriceProjection } from './PriceProjection';
import { MarketEvent } from '@/components/FeedItem';

function ChartSkeleton({ text = 'Loading chart engine…' }: { text?: string }) {
  return (
    <div className="h-full w-full bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          {text}
        </span>
      </div>
    </div>
  );
}

export const ChartCanvas = memo(function ChartCanvas({
  symbol,
  data,
  loading,
  prediction,
  showSma20,
  showSma50,
  showVolume,
  events = [],
}: ChartCanvasProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPluginRef = useRef<any>(null);

  const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol === '^NSEI' || symbol === '^BSESN';
  const currencyPrefix = isIndian ? '₹' : '$';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#09090b' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      localization: {
        priceFormatter: (price: number) => `${currencyPrefix}${price.toFixed(2)}`,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
        horzLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = series;
    markersPluginRef.current = createSeriesMarkers(series);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3f3f46',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const sma20Series = chart.addSeries(LineSeries, {
      color: '#c084fc',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma20SeriesRef.current = sma20Series;

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#fb923c',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma50SeriesRef.current = sma50Series;

    const observer = new ResizeObserver((entries) => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      sma20SeriesRef.current = null;
      sma50SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        localization: {
          priceFormatter: (price: number) => `${currencyPrefix}${price.toFixed(2)}`,
        },
      });
    }
  }, [currencyPrefix]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  usePriceProjection(seriesRef.current, prediction, loading);

  useEffect(() => {
    if (loading || data.length === 0) return;

    if (showVolume && volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(generateVolumeData(data));
    } else if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData([]);
    }

    if (showSma20 && sma20SeriesRef.current) {
      sma20SeriesRef.current.setData(calculateSMA(data, 20));
    } else if (sma20SeriesRef.current) {
      sma20SeriesRef.current.setData([]);
    }

    if (showSma50 && sma50SeriesRef.current) {
      sma50SeriesRef.current.setData(calculateSMA(data, 50));
    } else if (sma50SeriesRef.current) {
      sma50SeriesRef.current.setData([]);
    }
  }, [showVolume, showSma20, showSma50, loading, data]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0 || !events) return;
    
    const markers = events.map((ev) => {
      const bullishCount = Array.isArray(ev.bullish_assets) ? ev.bullish_assets.length : 0;
      const bearishCount = Array.isArray(ev.bearish_assets) ? ev.bearish_assets.length : 0;
      const isBullish = bullishCount > bearishCount;
      const isBearish = bearishCount > bullishCount;
      let color = '#a1a1aa';
      let shape: 'arrowUp' | 'arrowDown' | 'circle' = 'circle';
      let text = 'EVENT';
      let position: 'aboveBar' | 'belowBar' | 'inBar' = 'aboveBar';

      if (isBullish) {
        color = '#22c55e';
        shape = 'arrowUp';
        text = `▲ ${ev.source.split(' ')[0]}`;
        position = 'belowBar';
      } else if (isBearish) {
        color = '#ef4444';
        shape = 'arrowDown';
        text = `▼ ${ev.source.split(' ')[0]}`;
        position = 'aboveBar';
      }

      const dateStr = ev.published_at.split('T')[0];

      return {
        time: dateStr,
        position,
        color,
        shape,
        text,
      };
    });

    // Valid markers must match an existing time in our data to avoid errors
    const validDataTimes = new Set(data.map(d => d.time));
    const validMarkers = markers.filter(m => validDataTimes.has(m.time));

    // @ts-ignore
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(validMarkers);
    }
  }, [events, data]);

  return (
    <div className="relative w-full h-full bg-[#09090b]">
      {loading && (
        <div className="absolute inset-0 z-10 bg-[#09090b]/80 backdrop-blur-sm">
          <ChartSkeleton text={`Loading ${symbol} data…`} />
        </div>
      )}

      <div ref={chartContainerRef} className="w-full h-full" style={{ position: 'absolute', inset: 0 }} />

      <div className="absolute top-4 left-4 pointer-events-none z-10 mix-blend-screen opacity-20 text-white font-mono font-bold text-4xl tracking-widest uppercase select-none">
        {symbol}
      </div>

      {!loading && prediction && (
        <div className="absolute bottom-2 right-2 pointer-events-none z-10 flex items-center gap-1.5 bg-[#09090b]/70 border border-cyan-900/40 rounded px-2 py-1">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest">
            GBM · 1σ · {prediction.horizon}d
          </span>
        </div>
      )}
    </div>
  );
});
