import { MarketEvent } from '@/components/FeedItem';
import { PredictionData } from '@/lib/types';
import { OHLCPoint } from '@/types/yahoo';

export interface ChartPaneProps {
  symbol?: string;
  event?: MarketEvent | null;
  prediction?: PredictionData | null;
  events?: MarketEvent[]; // For timeline markers
}

export interface ChartCanvasProps {
  symbol: string;
  data: OHLCPoint[];
  loading: boolean;
  prediction?: PredictionData | null;
  showSma20: boolean;
  showSma50: boolean;
  showVolume: boolean;
  events?: MarketEvent[];
}

export interface IndicatorToggles {
  showSma20: boolean;
  showSma50: boolean;
  showVolume: boolean;
}
