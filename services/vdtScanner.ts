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
 * Scanner VDT - Mẫu hình biên độ thu hẹp (VCP)
 */
export function scanVDT(stock: StockData): boolean {
  const { close, volume, high, low } = stock.historical;
  if (close.length < 252) return false;

  const currentClose = close[close.length - 1];
  
  // 1. Near Year High
  const last252Highs = high.slice(-252);
  const highestHigh = Math.max(...last252Highs);
  
  if (currentClose >= highestHigh || currentClose <= 0.6 * highestHigh) {
    return false;
  }

  // 2. Trend Template (MA150, MA200)
  const ma150 = calculateMA(close, 150);
  const ma200 = calculateMA(close, 200);
  if (currentClose <= ma150 || currentClose <= ma200) {
    return false;
  }

  // 3. RSI Momentum
  const rsi14 = calculateRSI(close, 14);
  if (rsi14 <= 40) {
    return false;
  }

  // 4. Pivot Contraction (Dựa trên 5 phiên gần nhất)
  const pivotLength = 5;
  const recentHighs = high.slice(-pivotLength);
  const recentLows = low.slice(-pivotLength);
  
  const pivotHigh = Math.max(...recentHighs);
  const pivotLow = Math.min(...recentLows);
  const pivotWidth = (pivotHigh - pivotLow) / currentClose;
  
  if (pivotWidth >= 0.10) {
    return false;
  }

  // 5. Volume Contraction (Volume Dry Up)
  const volumeMA50 = calculateMA(volume, 50);
  const recentVolumes = volume.slice(-pivotLength);
  
  const isVolumeDryUp = recentVolumes.every(v => v < volumeMA50);
  if (!isVolumeDryUp) {
    return false;
  }

  // 6. Breakout readiness (Mặc định thỏa do ta check 5 phiên cuối)

  return true;
}
