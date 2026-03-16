// services/stockScanner.ts — Bộ não quét cổ phiếu bằng thuật toán (Data-Driven)
import { firebaseService } from './firebaseService';
import { STOCK_UNIVERSE } from '../data/stockUniverse';
import * as indicators from './indicatorService';

export interface ScanResult {
  symbol: string;
  score: number;
  rsi: number;
  volumeTrend: string;
  pivotPrice: number;
  patterns: string[];
  price: number;
  changePercent: number;
}

/**
 * Luồng quét cổ phiếu chính - Không sử dụng AI để tính toán
 */
export async function runFullMarketScan(command: string = 'SCAN'): Promise<ScanResult[]> {
  const allResults: ScanResult[] = [];
  
  // Quét theo từng mã trong Universe
  for (const symbol of STOCK_UNIVERSE) {
    try {
      // 1. Fetch historical data từ Firestore (250 phiên)
      const bars = await firebaseService.getMarketHistory(symbol, 250);
      if (!bars || bars.length < 50) continue; // Cần ít nhất 50 phiên để tính toán cơ bản

      const closes = bars.map(b => b.close);
      const volumes = bars.map(b => b.volume);
      const highs = bars.map(b => b.high);
      const lows = bars.map(b => b.low);

      const latestPrice = closes[closes.length - 1];
      const prevPrice = closes[closes.length - 2];
      const changePercent = ((latestPrice - prevPrice) / prevPrice) * 100;
      
      // 2. Tính toán Indicators
      const rsi = indicators.calculateRSI(closes, 14) || 50;
      const ma50 = indicators.calculateSMA(closes, 50) || 0;
      const ma150 = indicators.calculateSMA(closes, 150) || 0;
      const ma200 = indicators.calculateSMA(closes, 200) || 0;
      const avgVol50 = indicators.calculateSMA(volumes, 50) || 1;
      const avgVol20 = indicators.calculateSMA(volumes, 20) || 1;
      
      const currentVol = volumes[volumes.length - 1];
      const highest20 = indicators.highestHigh(highs, 20) || 0;
      const highest5 = indicators.highestHigh(highs, 5) || 0;
      const lowest5 = indicators.lowestLow(lows, 5) || 0;

      // 3. Áp dụng các Rules (VCP, Breakout, Dry Volume...)
      const patterns: string[] = [];
      let score = 0;

      // Rule: VCP / Xu hướng tăng (Stage 2)
      if (ma150 && ma200 && latestPrice > ma150 && latestPrice > ma200 && ma150 > ma200 && rsi > 40) {
        patterns.push('VCP/Uptrend');
        score += 40;
      }

      // Rule: Volume Dry Up (Cạn kiệt khối lượng)
      if (currentVol < 0.6 * avgVol50) {
        patterns.push('Vol Dry-up');
        score += 20;
      }

      // Rule: Pivot Contraction (Nâng nền siết chặt)
      const contraction = (highest5 - lowest5) / latestPrice;
      if (contraction < 0.08) {
        patterns.push('Tight Pivot');
        score += 30;
      }

      // Rule: Breakout detection
      if (latestPrice >= highest20 && currentVol > 2.0 * avgVol20) {
        patterns.push('Breakout');
        score += 50;
      }

      // Lọc theo lệnh cụ thể nếu cần
      if (command === 'VCP' && !patterns.includes('VCP/Uptrend')) continue;
      if (command === 'BREAK' && !patterns.includes('Breakout')) continue;

      if (score > 30) {
        allResults.push({
          symbol,
          score,
          rsi: Math.round(rsi),
          volumeTrend: currentVol > avgVol20 ? 'Tăng' : 'Giảm',
          pivotPrice: Math.round(latestPrice),
          patterns,
          price: latestPrice,
          changePercent: Math.round(changePercent * 100) / 100
        });
      }

    } catch (e) {
      console.error(`Error scanning ${symbol}:`, e);
    }
  }

  // 4. Trả về top 10 cổ phiếu tốt nhất
  return allResults.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Các hàm helper lấy dữ liệu đơn lẻ cho Chatbot (Khôi phục cho UI)
 */
export async function fetchStockData(symbol: string): Promise<any | null> {
  const data = await firebaseService.getMarketData(symbol);
  if (!data) return null;
  
  // Trả về cấu trúc tương thích với StockData interface cũ nếu cần
  return {
    ...data,
    historical: data.historical || { close: [], volume: [], high: [], low: [] }
  };
}

export async function fetchIndexData(index: string = 'VNINDEX'): Promise<any | null> {
  // Lấy snapshot Index từ Firestore (Giả định Index cũng được sync vào market_data)
  return await firebaseService.getMarketData(index);
}

export function formatStockDataForAI(data: any): string {
  return `Mã: ${data.symbol}
Giá: ${data.price?.toLocaleString('vi-VN')} VNĐ
Khối lượng: ${data.volume?.toLocaleString('vi-VN')}
Ngày cập nhật: ${data.date || 'N/A'}`;
}

export function formatScanResultForAI(results: ScanResult[]): string {
  if (results.length === 0) return "Không tìm thấy cổ phiếu nào thỏa mãn điều kiện lọc kỹ thuật.";
  
  let text = "KẾT QUẢ QUÉT KỸ THUẬT (Dữ liệu từ Firestore):\n\n";
  text += "| Mã | Điểm | RSI | Mẫu hình | Giá | Biến động |\n";
  text += "|---|---|---|---|---|---|\n";
  
  for (const r of results) {
    text += `| ${r.symbol} | ${r.score} | ${r.rsi} | ${r.patterns.join(', ')} | ${r.price.toLocaleString()} | ${r.changePercent}% |\n`;
  }
  
  return text;
}
