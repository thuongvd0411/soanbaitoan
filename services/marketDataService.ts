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
    // Lấy 260 phiên để đủ cho các chỉ số MA200, MA150...
    const url = `${TCBS_API}/stock-insight/v2/stock/bars-long-term?ticker=${symbol.toUpperCase()}&type=stock&resolution=D&countBack=260`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[MarketDataService] No market data available for ${symbol}`);
      return null;
    }
    
    const json = await res.json();
    const bars = json.data || [];
    
    if (bars.length === 0) {
      console.warn(`[MarketDataService] Empty data for ${symbol}`);
      return null;
    }

    return bars.map((b: any) => ({
      symbol: symbol.toUpperCase(),
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
