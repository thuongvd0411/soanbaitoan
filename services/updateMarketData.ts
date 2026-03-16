import { getStockData } from './marketDataService';
import { firebaseService } from './firebaseService';
import { STOCK_UNIVERSE } from '../data/stockUniverse';

/**
 * Đồng bộ dữ liệu của một mã cổ phiếu vào Firestore (Snapshot + History)
 */
export async function syncStockToFirebase(symbol: string): Promise<boolean> {
  try {
    const bars = await getStockData(symbol);
    
    if (!bars || bars.length === 0) {
      console.warn(`[UpdateMarketData] No data from API for ${symbol}`);
      return false;
    }

    const latest = bars[bars.length - 1];
    
    // 1. Cập nhật market_data snapshot (loại bỏ historical để nhẹ DB)
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

    // 2. Cập nhật market_history cho tất cả các phiên lấy được (batch update)
    // Để tối ưu, chúng ta có thể chỉ update phiên mới nhất, nhưng để đảm bảo đủ 250 phiên 
    // trong lần đầu chạy, chúng ta xử lý mảng bars.
    // LƯU Ý: syncMarketToFirebase sẽ gọi sync cho từng mã.
    
    // Chỉ lưu 250 phiên gần nhất vào Firestore để tránh quá tải
    const relevantBars = bars.slice(-250);
    
    const historyPromises = relevantBars.map(bar => {
      const dateKey = bar.date.split('T')[0]; // Format: YYYY-MM-DD
      return firebaseService.updateMarketHistory(symbol, dateKey, {
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      });
    });

    await Promise.all(historyPromises);
    return true;
  } catch (error) {
    console.error(`[UpdateMarketData] Error syncing ${symbol}:`, error);
    return false;
  }
}

/**
 * Đồng bộ toàn bộ Stock Universe vào Firestore
 */
export async function syncMarketToFirebase(onProgress?: (msg: string) => void): Promise<void> {
  const batchSize = 5; // Giảm batch size để tránh overload Firestore write rát quá
  const tickers = STOCK_UNIVERSE;
  
  if (onProgress) onProgress(`Bắt đầu đồng bộ ${tickers.length} mã vào Firestore...`);

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    if (onProgress) onProgress(`Đang đồng bộ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tickers.length / batchSize)}...`);
    
    const promises = batch.map(ticker => syncStockToFirebase(ticker));
    await Promise.all(promises);
    
    // Nghỉ 200ms giữa các batch
    await new Promise(r => setTimeout(r, 200));
  }
  
  if (onProgress) onProgress(`✅ Hoàn tất đồng bộ dữ liệu vào Firestore.`);
}

