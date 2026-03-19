// services/marketDataService.ts — Dịch vụ lấy dữ liệu thị trường OHLC (Optimized Failover)
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

// Danh sách các proxy CORS công cộng (Đã lọc bỏ typo và site chết)
const PROXY_TEMPLATES = [
  // 1. Cloudflare Worker dành riêng cho dự án (Khuyến nghị)
  (url: string) => `https://falling-math-0dcf.antigravity.workers.dev/?url=${encodeURIComponent(url)}`,
  // 2. AllOrigins RAW (Nhanh và ổn định nhất)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  // 3. CodeTabs (Dự phòng tốt)
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  // 4. CorsProxy.io (Dự phòng cuối)
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

/**
 * Lấy dữ liệu lịch sử OHLC cho 1 mã cổ phiếu
 */
export async function getStockData(symbol: string, retryCount = 1): Promise<MarketData[] | null> {
  const ticker = symbol.toUpperCase();
  const countBack = 250; 
  const tcbsUrl = `${TCBS_API}/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&countBack=${countBack}`;

  // Xáo trộn proxy để phân tán tải
  const shuffledProxies = [...PROXY_TEMPLATES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledProxies.length; i++) {
    try {
      const proxyUrl = shuffledProxies[i](tcbsUrl);
      const res = await fetch(proxyUrl, { 
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(12000) : undefined 
      });

      if (!res.ok) continue;

      let contents: any;
      const text = await res.text();
      
      try {
        contents = JSON.parse(text);
      } catch (e) {
        // Có thể data của AllOrigins RAW trả về JSON thẳng luôn
        console.warn(`[MarketDataService] JSON Parse warning for ${ticker}`);
        continue;
      }

      const bars = contents.data || [];
      if (!bars || bars.length === 0) continue;

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
      if (i === shuffledProxies.length - 1 && retryCount > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return getStockData(symbol, retryCount - 1);
      }
    }
  }

  console.error(`[MarketDataService] All proxies failed for ${ticker}`);
  return null;
}
