// services/marketDataService.ts — Dịch vụ lấy dữ liệu thị trường OHLC (Optimized with Proxy Failover)
const TCBS_API = 'https://apipubaws.tcbs.com.vn';

export interface MarketData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
}

// Danh sách các proxy CORS công cộng để luân phiên (Failover)
const PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

/**
 * Lấy dữ liệu lịch sử OHLC cho 1 mã cổ phiếu với cơ chế Retry và Proxy Failover
 */
export async function getStockData(symbol: string, retryCount = 1): Promise<MarketData[] | null> {
  const ticker = symbol.toUpperCase();
  const countBack = 260;
  const tcbsUrl = `${TCBS_API}/stock-insight/v2/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&countBack=${countBack}`;

  // Thử lần lượt qua các proxy
  for (let i = 0; i < PROXIES.length; i++) {
    try {
      const proxyUrl = PROXIES[i](tcbsUrl);
      const res = await fetch(proxyUrl, { 
        signal: AbortSignal.timeout(10000) // Timeout 10s để không treo lâu
      });

      if (!res.ok) continue; // Thử proxy tiếp theo

      const data = await res.json();
      
      // Xử lý dữ liệu tùy theo cấu trúc của từng Proxy
      let contents = data;
      
      // AllOrigins bọc trong contents
      if (data.contents) {
        try {
          contents = JSON.parse(data.contents);
        } catch (e) {
          continue; 
        }
      }

      const bars = contents.data || [];
      if (bars.length === 0) return null;

      return bars.map((b: any) => ({
        symbol: ticker,
        open: b.open || 0,
        high: b.high || 0,
        low: b.low || 0,
        close: b.close || 0,
        volume: b.volume || 0,
        date: b.tradingDate || ''
      }));

    } catch (error) {
      console.warn(`[MarketDataService] Proxy ${i} failed for ${ticker}, trying next...`);
      // Nếu là proxy cuối cùng và vẫn lỗi, thì mới thực sự thất bại cho lần này
      if (i === PROXIES.length - 1 && retryCount > 0) {
        // Đợi 1 lát rồi thử lại toàn bộ quy trình nếu còn lượt retry
        await new Promise(r => setTimeout(r, 1000));
        return getStockData(symbol, retryCount - 1);
      }
    }
  }

  console.error(`[MarketDataService] All proxies failed for ${ticker}`);
  return null;
}
