import { runFullMarketScan, formatScanResultForAI as formatNewScanResult } from './stockScanner';

export type ScanCommandType = 'SCAN' | 'HOT' | 'MARKET' | 'VDT' | 'ACCUM' | 'BREAK' | 'SYNC' | 'VCP';

/**
 * Proxy function để giữ tương thích với giao diện cũ
 */
export async function scanMarket(
  command: ScanCommandType = 'SCAN',
  onProgress?: (msg: string) => void
): Promise<any> {
  if (onProgress) onProgress(`Đang chạy Scanner thuật toán cho ${command}...`);
  
  // Chuyển đổi lệnh cho Engine mới
  const results = await runFullMarketScan(command);
  
  if (onProgress) onProgress(`✅ Tìm thấy ${results.length} mã tiềm năng.`);
  
  return {
    topAbnormal: results,
    scanTime: new Date().toLocaleTimeString('vi-VN')
  };
}

/**
 * Proxy format function
 */
export function formatScanResultForAI(result: any, command: string): string {
  return formatNewScanResult(result.topAbnormal);
}

