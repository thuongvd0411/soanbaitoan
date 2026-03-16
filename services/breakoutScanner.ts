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
 * Tính RS và RSI
 */
function calculateRSI(data: number[], period: number = 14): number {
  if (data.length <= period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Scanner Breakout - Đột phá mạnh mẽ
 */
export function scanBreakout(stock: StockData): boolean {
  const { close, volume, high } = stock.historical;
  if (close.length < 150) return false;

  const currentClose = close[close.length - 1];
  const currentVolume = volume[volume.length - 1];
  
  // 1. Breakout Pivot (Giá vượt đỉnh 20 phiên)
  const last20Highs = high.slice(-20);
  const highest20 = Math.max(...last20Highs);
  
  if (currentClose <= highest20) {
    return false;
  }

  // 2. Volume Explosion
  const volumeMA20 = calculateMA(volume, 20);
  if (currentVolume <= 2.5 * volumeMA20) {
    return false; // Phải gấp 2.5 lần MA20
  }

  // 3. Momentum RSI > 60
  const rsi14 = calculateRSI(close, 14);
  if (rsi14 <= 60) {
    return false;
  }

  // 4. Float nhỏ (tạm bỏ qua vì ko có api vốn hóa real-time cụ thể)
  // Tuy nhiên nếu có MarketCap ta check ở đây. (VD: marketCap < 10000)

  // 5. Xu hướng mạnh
  const ma50 = calculateMA(close, 50);
  const ma150 = calculateMA(close, 150);
  
  if (currentClose <= ma50 || currentClose <= ma150) {
    return false;
  }

  return true;
}
