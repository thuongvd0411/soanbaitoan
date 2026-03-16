import { getStockData } from './marketDataService';
import { firebaseService } from './firebaseService';

/**
 * Thủ công cập nhật dữ liệu cho một mã cụ thể vào Firestore
 */
export async function syncStockToFirebase(symbol: string): Promise<boolean> {
  try {
    console.log(`[UpdateMarketData] Syncing ${symbol}...`);
    const bars = await getStockData(symbol);
    
    if (!bars || bars.length === 0) {
      console.warn(`[UpdateMarketData] No data from API for ${symbol}`);
      return false;
    }

    const latest = bars[bars.length - 1];
    
    // Chuẩn bị dữ liệu theo yêu cầu của USER
    const marketDataDoc = {
      symbol: symbol.toUpperCase(),
      price: latest.close || 0,
      volume: latest.volume || 0,
      open: latest.open || 0,
      high: latest.high || 0,
      low: latest.low || 0,
      date: latest.date || new Date().toISOString(),
      // Lưu thêm historical để Scanner có thể làm việc
      historical: {
        close: bars.map(b => b.close),
        volume: bars.map(b => b.volume),
        high: bars.map(b => b.high),
        low: bars.map(b => b.low)
      }
    };

    await firebaseService.updateMarketData(symbol, marketDataDoc);
    return true;
  } catch (error) {
    console.error(`[UpdateMarketData] Error syncing ${symbol}:`, error);
    return false;
  }
}

/**
 * Đồng bộ hàng loạt danh sách ticker (Sử dụng batching để tránh quá tải)
 */
export async function syncMarketToFirebase(tickers: string[], onProgress?: (msg: string) => void): Promise<void> {
  const batchSize = 10;
  if (onProgress) onProgress(`Bắt đầu đồng bộ ${tickers.length} mã vào Firestore...`);

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    if (onProgress) onProgress(`Đang đồng bộ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tickers.length / batchSize)}...`);
    
    const promises = batch.map(ticker => syncStockToFirebase(ticker));
    await Promise.all(promises);
    
    // Nghỉ nhẹ tránh bị rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  
  if (onProgress) onProgress(`✅ Hoàn tất đồng bộ dữ liệu vào Firestore.`);
}
