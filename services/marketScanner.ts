import { StockData } from './stockScanner';
import { getStockData } from './marketDataService';
import { scanVDT } from './vdtScanner';
import { scanAccumulation } from './accumulationScanner';
import { scanBreakout } from './breakoutScanner';
import { firebaseService } from './firebaseService';

// Danh sách ~250 mã thanh khoản cao (HOSE, HNX, UPCOM)
export const TOP_TICKERS = [
  // Ngân hàng
  'VCB','BID','CTG','TCB','MBB','VPB','ACB','HDB','STB','SHB','TPB','MSB','LPB','VIB','EIB','OCB','BAB','BVB','NAB','VBB','ABB','SSB','SGB',
  // Thép & Khai khoáng
  'HPG','HSG','NKG','TLH','SMC','POM','VGS','TVN','KSA','KSH','NBC','THT','TVD',
  // Chứng khoán
  'SSI','VND','VCI','HCM','SHS','MBS','FTS','BSI','CTS','AGR','VIX','ORS','TVS','BVS','SBS','VDS','WSS','VIG','APS','TCI','APG','IVS',
  // Bất động sản & Xây dựng
  'VHM','VIC','VRE','NVL','PDR','DIG','DXG','NLG','KDH','CEO','IDC','KBC','SZC','ITA','HQC','SCR','LDG','DXS','HDC','QCG','TDH','CEO','L14','L18','IDJ','NTC','SIP','D2D','TIP','LHG','VGC','VCG','HHV','LCG','C4G','FCN','KSB','TCD','HT1','BCC','VCS','PTB','NNC','DHA','IJC','BCM','AGG','HDG','VPH','GVR','PHR','DPR','TRC','DRI',
  // Công nghệ & Bán lẻ
  'FPT','MWG','PNJ','FRT','DGW','PET','CTR','VGI','VTP','CMG','ELC','ITD','SGT','ABC',
  // Năng lượng (Dầu khí, Điện)
  'GAS','PVD','PVS','BSR','PLX','OIL','PVT','PVP','PVB','PVC','POW','NT2','PC1','TV2','QTP','HND','PPC','VSH','GEG','TTA','BCG',
  // Hàng tiêu dùng & Thực phẩm
  'VNM','MSN','SAB','BHN','VCF','QNS','SBT','LSS','SLS','DBC','BAF','VHC','ANV','IDI','PAN','MPC','FMC','CMX','GIL','MSH','TNG','VGT','TCM','STK','MML','MCH','VEA','TLP','SCS','ACV','NAS','VOS','HAH','GMD','SKG',
  // Phân bón & Hóa chất
  'DGC','DPM','DCM','LAS','BFC','DDV','CSV','HVT','TVN',
  // Dược phẩm
  'DHG','TRA','IMP','DMC','DHT','DVN','AMV','JVC',
  // Cao su & Gỗ & Khác
  'GVR','PHR','DPR','TRC','DRI','PTB','SAV','TTF','MSH','HT1','BCC','VCS','BMI','BVH','PGI','MIG','VNR'
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
  const allValidStocks: StockData[] = [];
  const batchSize = 10; // Quét song song 10 mã mỗi đợt để tránh bị block và tăng tốc
  
  if (onProgress) onProgress(`Starting deep scan for ${TOP_TICKERS.length} symbols...`);
  
  for (let i = 0; i < TOP_TICKERS.length; i += batchSize) {
    const batch = TOP_TICKERS.slice(i, i + batchSize);
    
    if (onProgress) onProgress(`Fetching Data from Firebase: Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(TOP_TICKERS.length / batchSize)}...`);
    
    const batchPromises = batch.map(async (symbol) => {
      // Step 5: Đọc dữ liệu từ Firestore trước
      const marketData = await firebaseService.getMarketData(symbol);
      
      if (!marketData || !marketData.historical) {
        return null;
      }

      const stock: StockData = {
        symbol: marketData.symbol || symbol,
        price: marketData.price || 0,
        changePercent: Math.round(((marketData.price - (marketData.historical.close[marketData.historical.close.length - 2] || marketData.price)) / (marketData.historical.close[marketData.historical.close.length - 2] || marketData.price)) * 100 * 100) / 100,
        volume: marketData.volume || 0,
        avgVolume20d: Math.round(marketData.historical.volume.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20),
        foreignBuySell: 0,
        marketCap: 0,
        volumeRatio: Math.round((marketData.volume / (marketData.historical.volume.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20)) * 100) / 100,
        historical: marketData.historical
      };
      return stock;
    });

    const batchResults = await Promise.all(batchPromises);
    for (const s of batchResults) {
      if (s) allValidStocks.push(s);
    }
  }

  if (allValidStocks.length === 0) {
    if (onProgress) onProgress("Chưa có dữ liệu thị trường. Vui lòng bấm Cập nhật dữ liệu.");
    return {
      topAbnormal: [],
      strongestAccumulation: null,
      scanTime: new Date().toLocaleTimeString('vi-VN')
    };
  }

  if (onProgress) onProgress(`Filtering ${allValidStocks.length} stocks using AI rules...`);

  const scoredResults = allValidStocks.map(s => {
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
