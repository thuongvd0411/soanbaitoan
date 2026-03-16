// services/marketDataService.ts — Dịch vụ lấy dữ liệu thị trường OHLC (Optimized with Advanced Proxy Failover)
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

// Danh sách các proxy CORS công cộng ổn định
const PROXY_TEMPLATES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.allorigins.win/get?url=${encodeURIComponent(url)}`
];

/**
 * Lấy dữ liệu lịch sử OHLC cho 1 mã cổ phiếu với cơ chế Retry nâng cao
 */
export async function getStockData(symbol: string, retryCount = 1): Promise<MarketData[] | null> {
  const ticker = symbol.toUpperCase();
  // Chuyển sang v1 theo đúng lệnh curl của anh giúp ổn định hơn
  const countBack = 250; 
  const tcbsUrl = `${TCBS_API}/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&countBack=${countBack}`;


  // Xáo trộn danh sách proxy để tránh tập trung vào 1 proxy duy nhất cho 250 mã
  const shuffledProxies = [...PROXY_TEMPLATES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledProxies.length; i++) {
    try {
      const proxyUrl = shuffledProxies[i](tcbsUrl);
      
      const res = await fetch(proxyUrl, { 
        // Tăng timeout lên 15s vì Proxy công cộng đôi khi phản hồi chậm
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(15000) : undefined 
      });

      if (!res.ok) {
        console.warn(`[MarketDataService] Proxy ${i} returned status ${res.status} for ${ticker}`);
        continue;
      }

      const data = await res.json();
      
      // Xử lý dữ liệu linh hoạt theo từng loại Proxy
      let contents = data;
      
      // AllOrigins bọc trong contents (dạng string)
      if (data && data.contents) {
        try {
          contents = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
        } catch (e) {
          console.error(`[MarketDataService] Parse error for AllOrigins on ${ticker}`);
          continue; 
        }
      }

      // Kiểm tra cấu trúc dữ liệu TCBS
      const bars = contents.data || [];
      if (!bars || bars.length === 0) {
        // Nếu Proxy trả về 200 nhưng không có data, có thể Proxy đó bị rate-limit nhưng ko báo lỗi
        continue;
      }

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
      // console.warn(`[MarketDataService] Proxy ${i} error for ${ticker}:`, error);
      if (i === shuffledProxies.length - 1 && retryCount > 0) {
        // Nghỉ 2s trước khi thử lại đợt cuối
        await new Promise(r => setTimeout(r, 2000));
        return getStockData(symbol, retryCount - 1);
      }
    }
  }

  console.error(`[MarketDataService] All proxies failed for ${ticker} after retries.`);
  return null;
}
