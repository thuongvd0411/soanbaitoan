import { getStockData } from './marketDataService';
import { firebaseService } from './firebaseService';
import { UNIQUE_STOCK_UNIVERSE as STOCK_UNIVERSE } from '../data/stockUniverse';

/**
 * Đồng bộ dữ liệu của một mã cổ phiếu vào Firestore (Snapshot + Array History)
 * Ưu điểm: Smart Sync - Chỉ tải nếu dữ liệu hôm nay chưa có.
 */
export async function syncStockToFirebase(symbol: string): Promise<'success' | 'skipped' | 'failed'> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Kiểm tra xem mã này hôm nay đã được sync chưa?
    const existingData = await firebaseService.getMarketData(symbol);
    if (existingData && existingData.date && existingData.date.startsWith(today)) {
      // console.log(`[SmartSync] Skipping ${symbol} - Already updated today.`);
      return 'skipped';
    }

    // Nếu chưa có, tiến hành nạp dữ liệu (có delay nhỏ để an toàn)
    await new Promise(r => setTimeout(r, Math.random() * 300));

    const bars = await getStockData(symbol);
    if (!bars || bars.length === 0) return 'failed';

    const latest = bars[bars.length - 1];
    
    // Cập nhật market_data snapshot
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

    // Cập nhật market_history mảng - Tối đa 250 phiên
    const historyArray = bars.slice(-250).map(bar => ({
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      date: bar.date.split('T')[0]
    }));

    await firebaseService.updateMarketHistoryArray(symbol, historyArray);
    return 'success';
  } catch (error) {
    console.error(`[UpdateMarketData] Error syncing ${symbol}:`, error);
    return 'failed';
  }
}

/**
 * Đồng bộ toàn bộ Stock Universe vào Firestore (Smart Sync Mode)
 */
export async function syncMarketToFirebase(onProgress?: (msg: string) => void): Promise<void> {
  const batchSize = 2; 
  const tickers = STOCK_UNIVERSE;
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  if (onProgress) onProgress(`Bắt đầu SMART SYNC ${tickers.length} mã...`);

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    if (onProgress) onProgress(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tickers.length / batchSize)} (S:${successCount} Skip:${skippedCount})...`);
    
    const results = await Promise.all(batch.map(ticker => syncStockToFirebase(ticker)));
    
    results.forEach(res => {
      if (res === 'success') successCount++;
      else if (res === 'skipped') skippedCount++;
      else failedCount++;
    });

    // Nếu có ít nhất 1 mã phải fetch thực tế, mới dừng nghỉ 1 giây
    if (results.includes('success')) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (onProgress) onProgress(`✅ Hoàn tất Smart Sync. Thành công: ${successCount}, Bỏ qua: ${skippedCount}, Lỗi: ${failedCount}.`);
}


