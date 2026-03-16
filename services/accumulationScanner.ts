import { StockData } from './stockScanner';

/**
 * Tính MA (Moving Average)
 */
function calculateMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Scanner Accumulation - Phát hiện cổ phiếu bị gom
 */
export function scanAccumulation(stock: StockData): boolean {
  const { close, volume, high, low } = stock.historical;
  if (close.length < 50) return false;

  const currentClose = close[close.length - 1];
  const currentVolume = volume[volume.length - 1];
  
  // 1. Volume Spike
  const volumeMA20 = calculateMA(volume, 20);
  if (currentVolume <= 2 * volumeMA20) {
    return false;
  }

  // 2. Giá tăng nhưng không quá mạnh (< 5%)
  if (stock.changePercent >= 5 || stock.changePercent < 0) {
    return false;
  }

  // 3. Giá nằm trên MA50
  const ma50 = calculateMA(close, 50);
  if (currentClose <= ma50) {
    return false;
  }

  // 4. Sideway tích lũy (Biên độ 10 ngày < 15%)
  const recentHighs10 = high.slice(-10);
  const recentLows10 = low.slice(-10);
  const highest10 = Math.max(...recentHighs10);
  const lowest10 = Math.min(...recentLows10);
  
  const sidewayWidth = (highest10 - lowest10) / currentClose;
  if (sidewayWidth >= 0.15) {
    return false;
  }

  return true;
}
