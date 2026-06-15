import { useEffect, useRef } from 'react';
import { ISeriesApi, IPriceLine, LineStyle } from 'lightweight-charts';
import { PredictionData } from '@/lib/types';

export function usePriceProjection(
  series: ISeriesApi<'Candlestick'> | null,
  prediction: PredictionData | null | undefined,
  loading: boolean
) {
  const upperLineRef = useRef<IPriceLine | null>(null);
  const lowerLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!series) return;

    if (upperLineRef.current) {
      try { series.removePriceLine(upperLineRef.current); } catch { /* ignore */ }
      upperLineRef.current = null;
    }
    if (lowerLineRef.current) {
      try { series.removePriceLine(lowerLineRef.current); } catch { /* ignore */ }
      lowerLineRef.current = null;
    }

    if (loading || !prediction) return;

    upperLineRef.current = series.createPriceLine({
      price: prediction.upperBound,
      color: 'rgba(6, 182, 212, 0.75)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `↑ +1σ (${prediction.horizon}d)`,
    });

    lowerLineRef.current = series.createPriceLine({
      price: prediction.lowerBound,
      color: 'rgba(239, 68, 68, 0.75)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `↓ -1σ (${prediction.horizon}d)`,
    });
  }, [series, prediction, loading]);
}
