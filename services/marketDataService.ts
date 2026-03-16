// services/marketDataService.ts — Dịch vụ lấy dữ liệu thị trường OHLC
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

/**
 * Lấy dữ liệu lịch sử OHLC cho 1 mã cổ phiếu
 */
export async function getStockData(symbol: string): Promise<MarketData[] | null> {
  try {
    const ticker = symbol.toUpperCase();
    const countBack = 260;
    const tcbsUrl = `${TCBS_API}/stock-insight/v2/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&countBack=${countBack}`;
    
    // Sử dụng proxy để tránh lỗi CORS trên trình duyệt
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tcbsUrl)}`;
    
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.warn(`[MarketDataService] Proxy error or No market data available for ${ticker}`);
      return null;
    }
    
    const json = await res.json();
    // allorigins trả về data trong trường 'contents' dưới dạng string JSON
    if (!json.contents) return null;
    
    const dataObj = JSON.parse(json.contents);
    const bars = dataObj.data || [];
    
    if (bars.length === 0) {
      // console.warn(`[MarketDataService] Empty data for ${ticker}`);
      return null;
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
    console.error(`[MarketDataService] Error fetching ${symbol}:`, error);
    return null;
  }
}
