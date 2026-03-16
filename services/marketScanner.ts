import { StockData } from './stockScanner';
import { getStockData } from './marketDataService';
import { scanVDT } from './vdtScanner';
import { scanAccumulation } from './accumulationScanner';
import { scanBreakout } from './breakoutScanner';

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

export type ScanCommandType = 'SCAN' | 'HOT' | 'MARKET' | 'VDT' | 'ACCUM' | 'BREAK';

function calculateMoneyFlowScore(stock: StockData, isVDT: boolean, isAccum: boolean, isBreakout: boolean): number {
  let score = 0;
  
  // Volume ratio
  if (stock.volumeRatio > 3) score += 40;
  else if (stock.volumeRatio > 2) score += 30;
  else if (stock.volumeRatio > 1.5) score += 20;
  else if (stock.volumeRatio > 1) score += 10;
  
  // Change percent
  if (stock.changePercent > 0 && stock.volumeRatio > 1.5) {
    score += Math.min(stock.changePercent * 5, 30);
  }
  
  // Pattern Bonus
  if (isVDT) score += 50;
  if (isAccum) score += 45;
  if (isBreakout) score += 40;
  
  return Math.round(score * 100) / 100;
}

export async function scanMarket(
  command: ScanCommandType = 'SCAN',
  onProgress?: (msg: string) => void
): Promise<MarketScanResult> {
  const results: StockData[] = [];
  
  if (onProgress) onProgress(`Scanning ${TOP_TICKERS.length} symbols...`);
  
  for (let i = 0; i < TOP_TICKERS.length; i++) {
    const symbol = TOP_TICKERS[i];
    
    // Step 1: Fetch market data
    if (onProgress && i % 10 === 0) onProgress(`Fetching data & applying rules: ${i}/${TOP_TICKERS.length}...`);
    
    const bars = await getStockData(symbol);
    
    if (!bars || bars.length === 0) {
      // Step 3: Bỏ qua khi không có data
      // Không cần log riêng từng mã rỗng để tránh làm tràn terminal
      continue;
    }

    const latest = bars[bars.length - 1];
    const previous = bars.length > 1 ? bars[bars.length - 2] : latest;
    
    // Tính các chỉ số cơ bản cho StockData interface
    const volumes20 = bars.slice(-20).map(b => b.volume);
    const avgVolume20d = volumes20.length > 0 ? volumes20.reduce((a, b) => a + b, 0) / volumes20.length : 1;
    const price = latest.close;
    const prevClose = previous.close;
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume = latest.volume;
    const volumeRatio = avgVolume20d > 0 ? volume / avgVolume20d : 0;

    const stockData: StockData = {
      symbol,
      price,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      avgVolume20d: Math.round(avgVolume20d),
      foreignBuySell: 0,
      marketCap: 0,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      historical: {
        close: bars.map(b => b.close),
        volume: bars.map(b => b.volume),
        high: bars.map(b => b.high),
        low: bars.map(b => b.low)
      }
    };

    results.push(stockData);
  }

  if (onProgress) onProgress(`Applying complex rules to ${results.length} valid stocks...`);

  if (results.length === 0) {
    if (onProgress) onProgress("No market data available");
    return {
      topAbnormal: [],
      strongestAccumulation: null,
      scanTime: new Date().toLocaleTimeString('vi-VN')
    };
  }

  const scoredResults = results.map(s => {
    const isVDT = scanVDT(s);
    const isAccum = scanAccumulation(s);
    const isBreakout = scanBreakout(s);
    const score = calculateMoneyFlowScore(s, isVDT, isAccum, isBreakout);
    return { ...s, moneyFlowScore: score, isVDT, isAccum, isBreakout };
  });

  // Filter dựa trên Command
  let filtered = scoredResults;
  
  if (command === 'VDT') filtered = scoredResults.filter(s => s.isVDT);
  else if (command === 'ACCUM') filtered = scoredResults.filter(s => s.isAccum);
  else if (command === 'BREAK') filtered = scoredResults.filter(s => s.isBreakout);
  // Các lệnh SCAN, HOT lấy chung logic lọc bất thường (Dòng tiền + Khối lượng)
  else {
    filtered = scoredResults.filter(s => 
      s.volumeRatio > 1.5 || s.changePercent > 2 || s.isVDT || s.isAccum || s.isBreakout
    );
  }

  filtered.sort((a, b) => b.moneyFlowScore - a.moneyFlowScore);

  // Giới hạn max 10 cổ phiếu cho GPT
  const topAbnormal = filtered.slice(0, 10);

  const accumList = scoredResults.filter(s => s.isAccum).sort((a,b) => b.moneyFlowScore - a.moneyFlowScore);
  const strongestAccumulation = accumList.length > 0 ? accumList[0] : null;

  return {
    topAbnormal,
    strongestAccumulation,
    scanTime: new Date().toLocaleTimeString('vi-VN')
  };
}

export function formatScanResultForAI(result: MarketScanResult, command: ScanCommandType): string {
  if (result.topAbnormal.length === 0) {
    return 'Không phát hiện cổ phiếu đáng chú ý nào thỏa mãn điều kiện.';
  }
  
  let text = `[Lệnh quét: ${command}] Dữ liệu lúc ${result.scanTime}:\n\n`;
  
  for (const stock of result.topAbnormal as any) {
    const tags = [];
    if (stock.isVDT) tags.push('VDT');
    if (stock.isAccum) tags.push('GOM HÀNG');
    if (stock.isBreakout) tags.push('BREAKOUT');
    
    text += `- ${stock.symbol} (Score: ${stock.moneyFlowScore}): Giá ${stock.price.toLocaleString('vi-VN')}, `;
    text += `Thay đổi ${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%, `;
    text += `KL ${stock.volume.toLocaleString('vi-VN')}, `;
    text += `KL TB20: ${stock.avgVolume20d.toLocaleString('vi-VN')}, `;
    text += `Volume Ratio ${stock.volumeRatio}x. `;
    if (tags.length > 0) text += `[${tags.join(', ')}]`;
    text += '\n';
  }
  
  return text;
}
