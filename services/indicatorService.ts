// services/indicatorService.ts

/**
 * Tính Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number | null {
  if (!data || data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Tính Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // EMA đầu tiên thường dùng SMA
  let initialSMA = 0;
  for (let i = 0; i < period; i++) {
    initialSMA += data[i];
  }
  initialSMA /= period;
  emaArray.push(initialSMA);

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - emaArray[emaArray.length - 1]) * k + emaArray[emaArray.length - 1];
    emaArray.push(currentEma);
  }
  
  // Trả về mảng tương ứng từ index thứ `period` trở đi
  return emaArray;
}

/**
 * Lấy EMA cuối cùng (hiện tại)
 */
export function getLatestEMA(data: number[], period: number): number | null {
  const ema = calculateEMA(data, period);
  return ema.length > 0 ? ema[ema.length - 1] : null;
}

/**
 * Tính Relative Strength Index (RSI)
 */
export function calculateRSI(data: number[], period: number = 14): number | null {
  if (!data || data.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    let gain = diff > 0 ? diff : 0;
    let loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Lấy mức giá cao nhất trong N phiên
 */
export function highestHigh(highData: number[], period: number): number | null {
  if (!highData || highData.length < period) return null;
  const slice = highData.slice(-period);
  return Math.max(...slice);
}

/**
 * Lấy mức giá thấp nhất trong N phiên
 */
export function lowestLow(lowData: number[], period: number): number | null {
  if (!lowData || lowData.length < period) return null;
  const slice = lowData.slice(-period);
  return Math.min(...slice);
}
