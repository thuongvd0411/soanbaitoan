// services/marketScanner.ts — Quét toàn bộ thị trường, phát hiện cổ phiếu bị gom

import { StockData, fetchStockData } from './stockScanner';

// Danh sách top ~80 mã thanh khoản cao trên HOSE
const TOP_TICKERS = [
  'VNM','VCB','BID','CTG','TCB','MBB','VPB','HPG','HSG','NKG',
  'SSI','VND','VCI','HCM','SHS','FPT','MWG','PNJ','FRT','DGW',
  'VHM','NVL','DIG','DXG','KDH','NLG','GAS','PVD','PVS','BSR',
  'PLX','VCG','HHV','LCG','C4G','FCN','KSB','ACB','SHB','STB',
  'EIB','MSN','VRE','PDR','VIC','SAB','REE','POW','NT2','PPC',
  'GMD','VTP','HAH','VOS','ANV','ASM','BCM','DPM','DCM','GVR',
  'PHR','SBT','HAG','LPB','OCB','TPB','HDG','PC1','GEX','CMG',
  'TLH','SMC','POM','IJC','IDC','CEO','HQC','SCR','TCH','TIG'
];

export interface MarketScanResult {
  topAbnormal: StockData[];
  strongestAccumulation: StockData | null;
  scanTime: string;
}

function calculateMoneyFlowScore(stock: StockData): number {
  let score = 0;
  
  // Volume ratio contributes heavily
  if (stock.volumeRatio > 3) score += 40;
  else if (stock.volumeRatio > 2) score += 30;
  else if (stock.volumeRatio > 1.5) score += 20;
  else if (stock.volumeRatio > 1) score += 10;
  
  // Positive change with high volume = accumulation signal
  if (stock.changePercent > 0 && stock.volumeRatio > 1.5) {
    score += Math.min(stock.changePercent * 5, 30);
  }
  
  // Foreign buying adds to score
  if (stock.foreignBuySell > 0) {
    score += Math.min(stock.foreignBuySell / 1000000, 20);
  }
  
  return Math.round(score * 100) / 100;
}

export async function scanMarket(
  onProgress?: (current: number, total: number) => void
): Promise<MarketScanResult> {
  const results: StockData[] = [];
  const batchSize = 5; // Chạy song song 5 request
  
  for (let i = 0; i < TOP_TICKERS.length; i += batchSize) {
    const batch = TOP_TICKERS.slice(i, i + batchSize);
    const promises = batch.map(ticker => fetchStockData(ticker));
    const batchResults = await Promise.all(promises);
    
    for (const data of batchResults) {
      if (data) results.push(data);
    }
    
    if (onProgress) onProgress(Math.min(i + batchSize, TOP_TICKERS.length), TOP_TICKERS.length);
  }

  // Lọc cổ phiếu bất thường
  const abnormal = results.filter(s => 
    s.volumeRatio > 1.8 || 
    s.changePercent > 3 || 
    s.foreignBuySell > 5000000
  );

  // Sắp xếp theo moneyFlowScore
  const scored = abnormal.map(s => ({
    ...s,
    moneyFlowScore: calculateMoneyFlowScore(s)
  }));
  scored.sort((a, b) => b.moneyFlowScore - a.moneyFlowScore);

  const topAbnormal = scored.slice(0, 10);

  // Tìm cổ phiếu bị gom mạnh nhất
  const strongestAccumulation = topAbnormal.length > 0 
    ? topAbnormal[0] 
    : null;

  return {
    topAbnormal,
    strongestAccumulation,
    scanTime: new Date().toLocaleTimeString('vi-VN')
  };
}

export function formatScanResultForAI(result: MarketScanResult): string {
  if (result.topAbnormal.length === 0) {
    return 'Không phát hiện cổ phiếu bất thường nào trong phiên hôm nay.';
  }
  
  let text = `Dữ liệu quét thị trường lúc ${result.scanTime}:\n\n`;
  
  for (const stock of result.topAbnormal) {
    text += `- ${stock.symbol}: Giá ${stock.price.toLocaleString('vi-VN')}, `;
    text += `Thay đổi ${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%, `;
    text += `KL ${stock.volume.toLocaleString('vi-VN')}, `;
    text += `VolumeRatio ${stock.volumeRatio}x\n`;
  }
  
  return text;
}
