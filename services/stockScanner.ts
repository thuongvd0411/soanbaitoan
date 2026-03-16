// services/stockScanner.ts — Lấy dữ liệu cổ phiếu từ API công khai

export interface StockData {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume20d: number;
  foreignBuySell: number;
  marketCap: number;
  volumeRatio: number;
  historical: {
    close: number[];
    volume: number[];
    high: number[];
    low: number[];
  };
}

// API TCBS cho dữ liệu cổ phiếu
const TCBS_API = 'https://apipubaws.tcbs.com.vn';

export async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    // Lấy giá hiện tại từ TCBS (Lấy đủ 260 phiên để dự phòng tính MA252 và MA200)
    const priceRes = await fetch(`${TCBS_API}/stock-insight/v2/stock/bars-long-term?ticker=${symbol}&type=stock&resolution=D&countBack=260`);
    
    if (!priceRes.ok) throw new Error('API Error');
    
    const priceData = await priceRes.json();
    const bars = priceData.data || [];
    
    if (bars.length === 0) return null;

    const latest = bars[bars.length - 1];
    const previous = bars.length > 1 ? bars[bars.length - 2] : latest;
    
    // Tính volume trung bình 20 ngày
    const volumes20 = bars.slice(-20).map((b: any) => b.volume || 0);
    const avgVolume20d = volumes20.length > 0 ? volumes20.reduce((a: number, b: number) => a + b, 0) / volumes20.length : 1;
    
    const price = latest.close || 0;
    const prevClose = previous.close || price;
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume = latest.volume || 0;
    const volumeRatio = avgVolume20d > 0 ? volume / avgVolume20d : 0;

    // Lọc mảng historical theo thứ tự cũ -> mới
    const historical = {
      close: bars.map((b: any) => b.close || 0),
      volume: bars.map((b: any) => b.volume || 0),
      high: bars.map((b: any) => b.high || 0),
      low: bars.map((b: any) => b.low || 0),
    };

    return {
      symbol: symbol.toUpperCase(),
      price,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      avgVolume20d: Math.round(avgVolume20d),
      foreignBuySell: 0, // TCBS public API không cung cấp trực tiếp
      marketCap: 0,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      historical
    };
  } catch (error) {
    console.error(`Lỗi lấy dữ liệu ${symbol}:`, error);
    return null;
  }
}

export function formatStockDataForAI(data: StockData): string {
  return `Mã: ${data.symbol}
Giá: ${data.price.toLocaleString('vi-VN')} VNĐ
Thay đổi: ${data.changePercent > 0 ? '+' : ''}${data.changePercent}%
Khối lượng: ${data.volume.toLocaleString('vi-VN')}
KL TB 20 phiên: ${data.avgVolume20d.toLocaleString('vi-VN')}
Volume Ratio: ${data.volumeRatio}x`;
}
