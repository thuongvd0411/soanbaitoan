import { getStockData } from './marketDataService';
import { firebaseService } from './firebaseService';
import { UNIQUE_STOCK_UNIVERSE as STOCK_UNIVERSE } from '../data/stockUniverse';

/**
 * Đồng bộ dữ liệu của một mã cổ phiếu vào Firestore (Snapshot + Array History)
 */
export async function syncStockToFirebase(symbol: string): Promise<boolean> {
  try {
    // Thêm một khoảng nghỉ ngẫu nhiên cực nhỏ (0-200ms) để không gửi Req cùng 1 mili giây
    await new Promise(r => setTimeout(r, Math.random() * 200));

    const bars = await getStockData(symbol);
    
    if (!bars || bars.length === 0) {
      console.warn(`[UpdateMarketData] No data from API for ${symbol}`);
      return false;
    }

    const latest = bars[bars.length - 1];
    
    // 1. Cập nhật market_data snapshot
    const marketDataSnapshot = {
      symbol: symbol.toUpperCase(),
      price: latest.close || 0,
      volume: latest.volume || 0,
      open: latest.open || 0,
      high: latest.high || 0,
      low: latest.low || 0,
      date: latest.date || new Date().toISOString()
    };
    await firebaseService.updateMarketData(symbol, marketDataSnapshot);

    // 2. Cập nhật market_history DẠNG MẢNG (Array) - Tối đa 250 phiên
    const historyArray = bars.slice(-250).map(bar => ({
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      date: bar.date.split('T')[0]
    }));

    await firebaseService.updateMarketHistoryArray(symbol, historyArray);
    return true;
  } catch (error) {
    console.error(`[UpdateMarketData] Error syncing ${symbol}:`, error);
    return false;
  }
}

/**
 * Đồng bộ toàn bộ Stock Universe vào Firestore (Optimized with Delays)
 */
export async function syncMarketToFirebase(onProgress?: (msg: string) => void): Promise<void> {
  const batchSize = 3; // Giảm xuống 3 để cực kỳ an toàn với Proxy và CORS
  const tickers = STOCK_UNIVERSE;
  
  if (onProgress) onProgress(`Bắt đầu đồng bộ ${tickers.length} mã (Cơ chế an toàn Proxy)...`);

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    if (onProgress) onProgress(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tickers.length / batchSize)}...`);
    
    // Xử lý song song trong batch nhỏ
    await Promise.all(batch.map(ticker => syncStockToFirebase(ticker)));
    
    // Nghỉ 500ms giữa các batch để Proxy không bị "ngộp"
    await new Promise(r => setTimeout(r, 500));
  }
  
  if (onProgress) onProgress(`✅ Hoàn tất đồng bộ an toàn vào Firestore.`);
}

