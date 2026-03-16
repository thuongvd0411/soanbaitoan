// data/stockUniverse.ts

// Danh sách ~250 mã thanh khoản tốt từ HOSE, HNX và UPCOM
export const STOCK_UNIVERSE = [
  // Ngân hàng (30 mã)
  'VCB','BID','CTG','TCB','MBB','VPB','ACB','HDB','STB','SHB','TPB','MSB','LPB','VIB','EIB','OCB','BAB','BVB','NAB','VBB','ABB','SSB','SGB','VCC','PGB','KLB','NVB','KLB','SGB','VAB',
  // Thép & Khai khoáng (20 mã)
  'HPG','HSG','NKG','TLH','SMC','POM','VGS','TVN','KSA','KSH','NBC','THT','TVD','MSR','TC6','TDN','TCS','KSV','VPG','VCA',
  // Chứng khoán (35 mã)
  'SSI','VND','VCI','HCM','SHS','MBS','FTS','BSI','CTS','AGR','VIX','ORS','TVS','BVS','SBS','VDS','WSS','VIG','APS','TCI','APG','IVS','HBS','PSI','TIX','VUA','FSC','BMS','TVS','WSS','VIG','HFT','ASG','DSC','HAC',
  // Bất động sản & Xây dựng (60 mã)
  'VHM','VIC','VRE','NVL','PDR','DIG','DXG','NLG','KDH','CEO','IDC','KBC','SZC','ITA','HQC','SCR','LDG','DXS','HDC','QCG','TDH','L14','L18','IDJ','NTC','SIP','D2D','TIP','LHG','VGC','VCG','HHV','LCG','C4G','FCN','KSB','TCD','HT1','BCC','VCS','PTB','NNC','DHA','IJC','BCM','AGG','HDG','VPH','GVR','PHR','DPR','TRC','DRI','SJS','CCL','CKG','CRE','FIR','HAR','HPI',
  // Công nghệ & Bán lẻ & Viễn thông (20 mã)
  'FPT','MWG','PNJ','FRT','DGW','PET','CTR','VGI','VTP','CMG','ELC','ITD','SGT','ABC','FOX','TTN','FOC','ST8','ONE','VTC',
  // Năng lượng & Điện (25 mã)
  'GAS','PVD','PVS','BSR','PLX','OIL','PVT','PVP','PVB','PVC','POW','NT2','PC1','TV2','QTP','HND','PPC','VSH','GEG','TTA','BCG','REA','REE','TDM','BWE',
  // Hàng tiêu dùng & Thực phẩm (35 mã)
  'VNM','MSN','SAB','BHN','VCF','QNS','SBT','LSS','SLS','DBC','BAF','VHC','ANV','IDI','PAN','MPC','FMC','CMX','GIL','MSH','TNG','VGT','TCM','STK','MML','MCH','VEA','TLP','SCS','ACV','NAS','VOS','HAH','GMD','SKG',
  // Phân bón & Hóa chất (15 mã)
  'DGC','DPM','DCM','LAS','BFC','DDV','CSV','HVT','BGC','PSE','PSW','HNI','PAT','LTG','TSC',
  // Dược phẩm & Y tế (12 mã)
  'DHG','TRA','IMP','DMC','DHT','DVN','AMV','JVC','OPC','PPP','DCL','VDP',
  // Khác: Bảo hiểm, Logistics, Vận tải (15 mã)
  'BMI','BVH','PGI','MIG','VNR','SAV','TTF','PVN','DVP','VSC','VNA','TMS','VTO','VIP','SGP'
];
// Đảm bảo không trùng lặp mã
export const UNIQUE_STOCK_UNIVERSE = Array.from(new Set(STOCK_UNIVERSE));
