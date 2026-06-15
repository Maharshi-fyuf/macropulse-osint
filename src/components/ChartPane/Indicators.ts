import { OHLCPoint } from '@/types/yahoo';

export function calculateSMA(data: { time: string; close: number }[], period: number) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export function generateVolumeData(data: OHLCPoint[]) {
  return data.map((d) => ({
    time: d.time,
    value: d.value,
    color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
  }));
}
