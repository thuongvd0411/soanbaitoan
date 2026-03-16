// components/InvestmentPanel.tsx — Trợ lý Đầu Tư AI (Cyberpunk Terminal)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, TrendingUp, BarChart3, Newspaper, Globe, ChevronDown, Loader2, Search, Zap } from 'lucide-react';
import { aiRouter } from '../services/ai/aiRouter';
import { AIModelType, ChatMessage } from '../services/ai/aiProvider';
import { scanMarket, formatScanResultForAI } from '../services/marketScanner';
import { fetchStockData, formatStockDataForAI } from '../services/stockScanner';
import { firebaseService } from '../services/firebaseService';
import { AppState } from '../types';

interface InvestmentMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InvestmentPanelProps {
  config: AppState;
}

const SYSTEM_PROMPT = `Bạn là Alla – chuyên gia phân tích tài chính và giáo sư kinh tế.
Bạn giúp nhà đầu tư cá nhân phân tích cổ phiếu Việt Nam.

Nhiệm vụ:
* phát hiện dòng tiền lớn
* đánh giá động lượng ngắn hạn
* phát hiện volume bất thường
* phân tích rủi ro

TUYỆT ĐỐI KHÔNG CHÀO HỎI, KHÔNG DẪN DẮT. HÃY ĐI THẲNG VÀO KẾT QUẢ.
Trả lời ngắn gọn, rõ ràng, dựa trên dữ liệu. Sử dụng Markdown formatting.`;

const STOCK_ANALYSIS_PROMPT = `Bạn là một trader có kinh nghiệm đang đánh giá nhanh cổ phiếu cho chiến lược swing 1–3 tháng.

FORMAT BẮT BUỘC khi phân tích 1 mã cổ phiếu:

🔎 Thuộc nhóm:
- Ngành chính:
- Hưởng lợi từ câu chuyện nào:
- Có tính chu kỳ hay phòng thủ:

🎯 Đặc điểm:
- Largecap / Midcap / Penny:
- Beta cao hay thấp:
- Thường chạy theo sóng gì:

🧠 Đánh giá 1–3 tháng:
✔ Có thể chạy nếu:
❗ Rủi ro:

📈 Phong cách phù hợp:
⚖ Kết luận xác suất (1-5):

Phân tích thực tế, không PR. Không khuyến nghị mua/bán.`;

const SCAN_PROMPT = `Dựa trên dữ liệu sau, hãy xác định:
1. cổ phiếu đang có dòng tiền lớn
2. cổ phiếu có khả năng tăng mạnh trong vài phiên tới
3. cổ phiếu có khả năng bị gom hàng

Chỉ chọn tối đa 3 cổ phiếu đáng chú ý nhất. Trả lời ngắn gọn theo format:

| Mã | Volume bất thường | Đánh giá AI |
|---|---|---|

Kèm nhận xét ngắn cho mỗi mã.`;

const MAX_HISTORY = 8;

const InvestmentPanel: React.FC<InvestmentPanelProps> = ({ config }) => {
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'portfolio' | 'news' | 'macro'>('terminal');
  const [model, setModel] = useState<AIModelType>('gemini');
  const [messages, setMessages] = useState<InvestmentMessage[]>([]);
  const [chatSummary, setChatSummary] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [showPurgeMenu, setShowPurgeMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use deviceId from localStorage if config.uid is missing
  const userId = (config as any).uid || localStorage.getItem('deviceId') || 'user_default';

  // Portfolio tab states
  const [stockInput, setStockInput] = useState('');
  const [compareInput1, setCompareInput1] = useState('');
  const [compareInput2, setCompareInput2] = useState('');
  const [portfolioResult, setPortfolioResult] = useState('');
  const [compareResult, setCompareResult] = useState('');

  // News/Macro tab states  
  const [newsResult, setNewsResult] = useState('');
  const [macroResult, setMacroResult] = useState('');

  // Setup AI keys
  useEffect(() => {
    const env = (import.meta as any).env || {};
    let geminiKey = "";
    if (config.selectedKeyMode === 'primary') geminiKey = config.primaryApiKey?.trim() || "";
    else if (config.selectedKeyMode === 'secondary') geminiKey = config.secondaryApiKey?.trim() || "";
    else geminiKey = env.VITE_GEMINI_API_KEY?.trim() || "";
    
    if (geminiKey) aiRouter.setGeminiKey(geminiKey);
    if (config.openaiApiKey) aiRouter.setOpenAIKey(config.openaiApiKey);
  }, [config.primaryApiKey, config.secondaryApiKey, config.selectedKeyMode, config.openaiApiKey]);

  // Load chat history from Firebase
  useEffect(() => {
    const loadHistory = async () => {
      const data = await firebaseService.getInvestmentChat(userId);
      if (data && data.length > 0) {
        setMessages(data);
      }
    };
    loadHistory();
  }, [userId]);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      // Dùng debounce đơn giản hoặc lưu trực tiếp
      firebaseService.saveInvestmentChat(userId, messages).catch(console.error);
    }
  }, [messages, userId]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendToAI = useCallback(async (userMessages: ChatMessage[], systemPrompt: string): Promise<string> => {
    return aiRouter.sendMessage(model, userMessages, systemPrompt);
  }, [model]);

  // Token optimization: summarize old messages
  const getOptimizedHistory = useCallback((): ChatMessage[] => {
    const recent = messages.slice(-MAX_HISTORY);
    const chatMsgs: ChatMessage[] = [];

    if (chatSummary) {
      chatMsgs.push({ role: 'system', content: `Tóm tắt lịch sử trước đó: ${chatSummary}` });
    }

    for (const msg of recent) {
      chatMsgs.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    }

    return chatMsgs;
  }, [messages, chatSummary]);

  // Summarize old messages when exceeding limit
  const summarizeIfNeeded = useCallback(async (allMessages: InvestmentMessage[]) => {
    if (allMessages.length > MAX_HISTORY + 2) {
      const oldMessages = allMessages.slice(0, -MAX_HISTORY);
      const summaryText = oldMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');
      try {
        const summary = await sendToAI(
          [{ role: 'user', content: `Tóm tắt cuộc hội thoại sau thành 2-3 câu ngắn gọn:\n${summaryText}` }],
          'Bạn là AI tóm tắt hội thoại. Trả về tóm tắt ngắn gọn.'
        );
        setChatSummary(summary);
      } catch (e) {
        console.error('Lỗi tóm tắt:', e);
      }
    }
  }, [sendToAI]);

  // Detect stock ticker pattern
  const isStockTicker = (text: string): boolean => /^[A-Z]{3}$/.test(text.trim());

  // Quick commands
  const isQuickCommand = (text: string): string | null => {
    const cmd = text.trim().toLowerCase();
    if (['scan', 'hot', 'market', 'vdt', 'accum', 'break'].includes(cmd)) return cmd;
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');

    const newMessages: InvestmentMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let response = '';
      const quickCmd = isQuickCommand(userText);

      if (quickCmd) {
        // Quick command: scan market
        setScanProgress('Đang quét thị trường...');
        const cmdUpper = quickCmd.toUpperCase() as any;
        const result = await scanMarket(cmdUpper, (current, total) => {
          setScanProgress(`Đang quét ${current}/${total} mã...`);
        });
        setScanProgress('');

        const dataText = formatScanResultForAI(result, cmdUpper);
        const history = getOptimizedHistory();
        history.push({ role: 'user', content: `${SCAN_PROMPT}\n\n${dataText}` });
        
        // Gọi AI, yêu cầu ngắn gọn cực độ
        response = await sendToAI(history, SYSTEM_PROMPT + '\nTRẢ LỜI NGẮN GỌN TỐI ĐA 400 TỪ.');

      } else if (isStockTicker(userText.toUpperCase())) {
        // Stock ticker analysis
        const ticker = userText.toUpperCase();
        setScanProgress(`Đang lấy dữ liệu ${ticker}...`);
        const stockData = await fetchStockData(ticker);
        setScanProgress('');

        if (stockData) {
          const dataText = formatStockDataForAI(stockData);
          const prompt = `${STOCK_ANALYSIS_PROMPT}\n\nDữ liệu thị trường:\n${dataText}\n\nPhân tích dòng tiền, động lượng và rủi ro ngắn hạn của cổ phiếu ${ticker}.`;
          response = await sendToAI([{ role: 'user', content: prompt }], SYSTEM_PROMPT);
        } else {
          response = `Không thể lấy dữ liệu cho mã ${ticker}. Vui lòng kiểm tra lại mã cổ phiếu.`;
        }

      } else {
        // Normal chat
        const history = getOptimizedHistory();
        history.push({ role: 'user', content: userText });
        response = await sendToAI(history, SYSTEM_PROMPT);
      }

      const updatedMessages: InvestmentMessage[] = [...newMessages, { role: 'assistant', content: response }];
      setMessages(updatedMessages);
      await summarizeIfNeeded(updatedMessages);

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setScanProgress('');
    }
  };

  const clearChat = async (timeframe: '1h' | '1d' | 'all') => {
    const text = timeframe === '1h' ? '1 tiếng trước' : timeframe === '1d' ? '1 ngày trước' : 'toàn bộ';
    if (window.confirm(`Xóa lịch sử chat đầu tư (${text})?`)) {
      try {
        await firebaseService.deleteInvestmentChat(userId, timeframe);
        const newData = await firebaseService.getInvestmentChat(userId);
        setMessages(newData || []);
        if (timeframe === 'all') setChatSummary('');
      } catch (e) {
        console.error('Lỗi khi xóa chat:', e);
      }
    }
    setShowPurgeMenu(false);
  };

  // Portfolio: Analyze single stock
  const analyzeStock = async () => {
    const ticker = stockInput.trim().toUpperCase();
    if (!ticker || isLoading) return;
    setIsLoading(true);
    setPortfolioResult('');
    try {
      const stockData = await fetchStockData(ticker);
      let dataText = '';
      if (stockData) dataText = `\nDữ liệu thị trường:\n${formatStockDataForAI(stockData)}`;
      const prompt = `${STOCK_ANALYSIS_PROMPT}${dataText}\n\nPhân tích chi tiết mã ${ticker} cho chiến lược swing 1-3 tháng.`;
      const result = await sendToAI([{ role: 'user', content: prompt }], SYSTEM_PROMPT);
      setPortfolioResult(result);
    } catch (error: any) {
      setPortfolioResult(`❌ Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Portfolio: Compare 2 stocks
  const compareStocks = async () => {
    const s1 = compareInput1.trim().toUpperCase();
    const s2 = compareInput2.trim().toUpperCase();
    if (!s1 || !s2 || isLoading) return;
    setIsLoading(true);
    setCompareResult('');
    try {
      const prompt = `So sánh 2 cổ phiếu ${s1} và ${s2} cho chiến lược swing 1-3 tháng.

FORMAT BẮT BUỘC:
📊 So sánh nhanh
| Tiêu chí | ${s1} | ${s2} |
|---|---|---|
| Nhóm ngành | | |
| Độ rủi ro | | |
| Tính đầu cơ | | |
| Khả năng chạy sóng | | |
| Phù hợp ai | | |

🎯 Kết luận thẳng:
- Nếu muốn đánh nhanh – biên lớn ➔ [Mã]
- Nếu muốn cân bằng rủi ro ➔ [Mã]`;
      const result = await sendToAI([{ role: 'user', content: prompt }], SYSTEM_PROMPT);
      setCompareResult(result);
    } catch (error: any) {
      setCompareResult(`❌ Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // News scanner
  const scanNews = async () => {
    if (isLoading) return;
    const cacheKey = `invest_news_${new Date().toISOString().split('T')[0]}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setNewsResult(cached); return; }

    setIsLoading(true);
    setNewsResult('');
    try {
      // Fetch RSS from financial sources via CORS proxy
      const rssSources = [
        'https://vneconomy.vn/thi-truong.rss',
        'https://cafef.vn/thi-truong-chung-khoan.rss'
      ];
      let allNews: string[] = [];

      for (const source of rssSources) {
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source)}`;
          const res = await fetch(proxyUrl);
          const data = await res.json();
          const parser = new DOMParser();
          const xml = parser.parseFromString(data.contents, 'text/xml');
          const items = xml.querySelectorAll('item');
          for (let i = 0; i < Math.min(items.length, 5); i++) {
            const title = items[i].querySelector('title')?.textContent || '';
            const desc = (items[i].querySelector('description')?.textContent || '').replace(/<[^>]*>?/gm, '').trim();
            const link = items[i].querySelector('link')?.textContent || '';
            allNews.push(`- ${title}\n  ${desc}\n  Link: ${link}`);
          }
        } catch (e) { console.warn('RSS error:', e); }
      }

      if (allNews.length === 0) {
        setNewsResult('Không thể lấy tin tức RSS. Thử lại sau.');
        return;
      }

      const prompt = `Dưới đây là tin tức tài chính hôm nay:\n\n${allNews.slice(0, 10).join('\n\n')}\n\nPhân tích mức độ ảnh hưởng đến thị trường chứng khoán VN. Đánh giá rủi ro: Thấp/Trung bình/Cao. Giải thích ngắn gọn.`;
      const result = await sendToAI([{ role: 'user', content: prompt }], SYSTEM_PROMPT);
      setNewsResult(result);
      localStorage.setItem(cacheKey, result);
    } catch (error: any) {
      setNewsResult(`❌ Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Macro dashboard
  const analyzeMacro = async () => {
    if (isLoading) return;
    const dateStr = new Date().toLocaleDateString('vi-VN');
    
    // Thử tải từ Firebase trước
    setIsLoading(true);
    setMacroResult('');
    
    try {
      const savedReport = await firebaseService.getMacroReport(dateStr);
      if (savedReport) {
        setMacroResult(savedReport);
        setIsLoading(false);
        return;
      }
      
      const prompt = `Hôm nay là ${dateStr}. Hãy tạo báo cáo vĩ mô thị trường chứng khoán Việt Nam gồm:
1. Tóm tắt bối cảnh kinh tế
2. Rủi ro hệ thống (1-5 điểm)
3. Nhóm ngành tích cực 1-3 tháng tới
4. 5 mã cổ phiếu đáng chú ý (giá <= 60.000 VND)
5. Nhóm ngành cần thận trọng
6. Chiến lược gợi ý
7. Tự phản biện

Viết bằng Markdown, chuyên sâu, khách quan.`;
      const result = await sendToAI([{ role: 'user', content: prompt }], SYSTEM_PROMPT);
      setMacroResult(result);
      // Lưu lại Firebase
      firebaseService.saveMacroReport(dateStr, result).catch(console.error);
    } catch (error: any) {
      setMacroResult(`❌ Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render markdown-like content (basic)
  const renderContent = (text: string) => {
    // Convert markdown to basic HTML
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4 class="text-cyan-300 font-bold mt-3 mb-1">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 class="text-cyan-200 font-bold text-lg mt-4 mb-2">$1</h3>')
      .replace(/^# (.*$)/gm, '<h2 class="text-cyan-100 font-bold text-xl mt-4 mb-2">$1</h2>')
      .replace(/^- (.*$)/gm, '<div class="pl-3 border-l border-cyan-800 my-1">• $1</div>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    
    // Tables
    if (html.includes('|')) {
      html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => c.trim().match(/^-+$/))) return '';
        const isHeader = cells.some(c => c.includes('Tiêu chí') || c.includes('Mã'));
        const tag = isHeader ? 'th' : 'td';
        const style = isHeader 
          ? 'style="background:rgba(0,240,255,0.1);color:#00f0ff;padding:6px 10px;border:1px solid rgba(0,240,255,0.2);text-align:left;font-size:12px"'
          : 'style="padding:6px 10px;border:1px solid rgba(0,240,255,0.15);font-size:12px"';
        return `<tr>${cells.map(c => `<${tag} ${style}>${c.trim()}</${tag}>`).join('')}</tr>`;
      });
      html = html.replace(/(<tr>.*?<\/tr>)/gs, '<table style="border-collapse:collapse;width:100%;margin:8px 0">$1</table>');
    }

    return html;
  };

  // Stock sector shortcuts
  const stockMap: Record<string, string[]> = {
    'Ngân hàng': ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'VPB'],
    'Chứng khoán': ['SSI', 'VND', 'VCI', 'HCM', 'SHS', 'MBS'],
    'Thép': ['HPG', 'HSG', 'NKG', 'TLH', 'SMC', 'POM'],
    'Công nghệ': ['FPT', 'CMG', 'ELC', 'ITD'],
    'BĐS': ['VHM', 'NVL', 'DIG', 'DXG', 'KDH', 'NLG'],
    'Dầu khí': ['GAS', 'PVD', 'PVS', 'BSR', 'PLX'],
  };
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#05070a] text-gray-200 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header with sub-tabs */}
      <div className="shrink-0 bg-[#0a0f19]/95 border-b border-cyan-500/20 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono font-bold text-sm tracking-wider" style={{ textShadow: '0 0 10px rgba(0,240,255,0.5)' }}>
              ALLA TRỢ LÝ ĐẦU TƯ
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#39ff14]"></div>
          </div>
          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono uppercase">Model:</span>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as AIModelType)}
                className="bg-[#0a0f19] border border-cyan-500/30 text-cyan-400 text-xs font-mono px-3 py-1.5 rounded appearance-none cursor-pointer pr-7 focus:border-cyan-400 outline-none"
              >
                <option value="gemini">Gemini</option>
                <option value="gpt">GPT-4.1 mini</option>
                <option value="gpt-nano">GPT-4.1 nano</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none" />
            </div>
          </div>
        </div>
        {/* Sub tabs */}
        <div className="flex gap-1">
          {[
            { id: 'terminal' as const, label: '[>] GIAO DỊCH', icon: <Zap size={12} /> },
            { id: 'portfolio' as const, label: '[$] DANH MỤC', icon: <TrendingUp size={12} /> },
            { id: 'news' as const, label: '[!] TIN TỨC', icon: <Newspaper size={12} /> },
            { id: 'macro' as const, label: '[*] VĨ MÔ', icon: <Globe size={12} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeSubTab === tab.id
                  ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                  : 'text-gray-600 border-transparent hover:text-purple-400 hover:border-purple-400/50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TERMINAL TAB */}
        {activeSubTab === 'terminal' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Status bar */}
            <div className="px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10 flex items-center gap-4 text-[11px] font-mono text-gray-500 shrink-0">
              <span>STATUS: <span className="text-green-400">[ONLINE]</span></span>
              <span>ENC: AES-256</span>
              {scanProgress && <span className="text-cyan-400 animate-pulse">{scanProgress}</span>}
              <div className="ml-auto flex gap-2 relative">
                <button 
                  onClick={() => setShowPurgeMenu(!showPurgeMenu)} 
                  className="text-gray-600 hover:text-red-400 transition-colors text-[10px] font-mono uppercase focus:outline-none"
                >
                  PURGE <ChevronDown size={10} className="inline" />
                </button>
                
                {showPurgeMenu && (
                  <div className="absolute top-full mt-1 right-0 bg-[#0a0f19] border border-cyan-500/30 rounded shadow-xl z-50 w-32 py-1 flex flex-col">
                     <button onClick={() => clearChat('1h')} className="px-3 py-1.5 text-left text-[10px] font-mono text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10">1 GIỜ TRƯỚC</button>
                     <button onClick={() => clearChat('1d')} className="px-3 py-1.5 text-left text-[10px] font-mono text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10">1 NGÀY TRƯỚC</button>
                     <button onClick={() => clearChat('all')} className="px-3 py-1.5 text-left text-[10px] font-mono text-red-500 hover:text-red-400 hover:bg-red-500/10 border-t border-cyan-500/20 mt-1 pt-1">TOÀN BỘ</button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-cyan-500/30 font-mono text-sm mb-4">[NEURAL_TRADE TERMINAL]</div>
                  <div className="text-gray-600 text-xs font-mono space-y-1">
                    <p>Nhập mã cổ phiếu (VD: <span className="text-cyan-400">HPG</span>, <span className="text-cyan-400">FPT</span>) để phân tích</p>
                    <p>Nhập <span className="text-purple-400">scan</span> để quét toàn thị trường</p>
                    <p>Hoặc chat tự do về thị trường chứng khoán</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="animate-[term-entry_0.3s_ease]">
                  <div className={`text-[10px] font-mono mb-1 ${msg.role === 'user' ? 'text-purple-400/70' : 'text-cyan-400/70'}`}>
                    {msg.role === 'user' ? '[USR_CMD] ~' : '[AI_RSP] >'}
                  </div>
                  <div
                    className={`text-sm font-mono leading-relaxed ${msg.role === 'user' ? 'text-purple-300' : 'text-cyan-300'}`}
                    dangerouslySetInnerHTML={{ __html: msg.role === 'user' ? msg.content : renderContent(msg.content) }}
                  />
                </div>
              ))}
              {isLoading && (
                <div className="animate-pulse">
                  <div className="text-[10px] font-mono text-cyan-400/70 mb-1">[AI_RSP] &gt;</div>
                  <div className="text-cyan-400/50 text-sm font-mono flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {scanProgress || 'Phân tích thông tin...'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick commands */}
            <div className="px-4 py-2 border-t border-cyan-500/10 flex flex-wrap gap-2 shrink-0">
              {['SCAN', 'HOT', 'MARKET', 'VDT', 'ACCUM', 'BREAK'].map(cmd => (
                <button
                  key={cmd}
                  onClick={() => { setInput(`/${cmd}`); handleSend(); }}
                  className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-[10px] font-mono uppercase hover:bg-cyan-500/20 transition-colors rounded"
                >
                  /{cmd}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-cyan-500/10 bg-black/50 shrink-0">
              <div className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/30 px-3 py-2 rounded">
                <span className="text-purple-400 font-mono text-xs shrink-0">USR@INTEL:~$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none text-gray-200 font-mono text-sm outline-none placeholder:text-gray-700"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="text-cyan-400 hover:text-white transition-opacity disabled:opacity-20"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeSubTab === 'portfolio' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Sector shortcuts */}
            <div className="bg-[#0a0f19] border border-cyan-500/20 rounded p-4">
              <h3 className="text-sm font-mono text-cyan-400 uppercase mb-3">Khuyến nghị ngành</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.keys(stockMap).map(sector => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector === selectedSector ? null : sector)}
                    className={`px-3 py-1.5 text-[11px] font-mono uppercase border transition-all rounded ${
                      selectedSector === sector
                        ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                        : 'border-gray-700 text-gray-500 hover:border-purple-400 hover:text-purple-400'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
              {selectedSector && (
                <div className="flex flex-wrap gap-2 animate-[term-entry_0.2s_ease]">
                  {stockMap[selectedSector].map(ticker => (
                    <button
                      key={ticker}
                      onClick={() => { setStockInput(ticker); }}
                      className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono hover:bg-cyan-500/20 transition-colors rounded"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chấm điểm cổ phiếu */}
            <div className="bg-[#0a0f19] border border-cyan-500/20 rounded p-4">
              <h3 className="text-sm font-mono text-cyan-400 uppercase mb-3">Chấm điểm cổ phiếu</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && analyzeStock()}
                  placeholder="Mã cổ phiếu (VD: FPT)"
                  className="flex-1 bg-black/50 border border-cyan-500/20 text-gray-200 font-mono text-sm px-3 py-2 rounded outline-none focus:border-cyan-400 placeholder:text-gray-700"
                />
                <button
                  onClick={analyzeStock}
                  disabled={isLoading || !stockInput.trim()}
                  className="px-4 py-2 border border-cyan-500 text-cyan-400 font-mono text-xs uppercase hover:bg-cyan-400 hover:text-[#05070a] transition-all disabled:opacity-30 rounded"
                >
                  Chấm điểm
                </button>
              </div>
              {portfolioResult && (
                <div
                  className="bg-black/40 border border-cyan-500/10 rounded p-4 text-sm font-mono text-cyan-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderContent(portfolioResult) }}
                />
              )}
            </div>

            {/* So sánh 2 mã */}
            <div className="bg-[#0a0f19] border border-cyan-500/20 rounded p-4">
              <h3 className="text-sm font-mono text-cyan-400 uppercase mb-3">So sánh cổ phiếu</h3>
              <div className="flex gap-2 items-center mb-3 flex-wrap">
                <input
                  type="text"
                  value={compareInput1}
                  onChange={(e) => setCompareInput1(e.target.value.toUpperCase())}
                  placeholder="Mã 1 (VD: SSI)"
                  className="flex-1 min-w-[80px] bg-black/50 border border-cyan-500/20 text-gray-200 font-mono text-sm px-3 py-2 rounded outline-none focus:border-cyan-400 placeholder:text-gray-700"
                />
                <span className="text-cyan-500 font-bold font-mono text-xs">VS</span>
                <input
                  type="text"
                  value={compareInput2}
                  onChange={(e) => setCompareInput2(e.target.value.toUpperCase())}
                  placeholder="Mã 2 (VD: VND)"
                  className="flex-1 min-w-[80px] bg-black/50 border border-cyan-500/20 text-gray-200 font-mono text-sm px-3 py-2 rounded outline-none focus:border-cyan-400 placeholder:text-gray-700"
                />
                <button
                  onClick={compareStocks}
                  disabled={isLoading || !compareInput1.trim() || !compareInput2.trim()}
                  className="px-4 py-2 border border-cyan-500 text-cyan-400 font-mono text-xs uppercase hover:bg-cyan-400 hover:text-[#05070a] transition-all disabled:opacity-30 rounded"
                >
                  So sánh
                </button>
              </div>
              {compareResult && (
                <div
                  className="bg-black/40 border border-cyan-500/10 rounded p-4 text-sm font-mono text-cyan-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderContent(compareResult) }}
                />
              )}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-8 text-cyan-400 font-mono text-sm">
                <Loader2 size={20} className="animate-spin" />
                AI đang phân tích...
              </div>
            )}
          </div>
        )}

        {/* NEWS TAB */}
        {activeSubTab === 'news' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-cyan-400 uppercase tracking-wider text-sm">Quét tin Kinh Tế</h2>
              <button
                onClick={scanNews}
                disabled={isLoading}
                className="px-4 py-2 border border-cyan-500 text-cyan-400 font-mono text-xs uppercase hover:bg-cyan-400 hover:text-[#05070a] transition-all disabled:opacity-30 rounded flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Quét tin hôm nay
              </button>
            </div>
            {newsResult ? (
              <div
                className="bg-[#0a0f19] border border-cyan-500/20 rounded p-5 text-sm font-mono text-cyan-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderContent(newsResult) }}
              />
            ) : (
              <div className="text-center py-20 text-gray-600 font-mono text-sm">
                Nhấn "Quét tin hôm nay" để lấy và phân tích tin tức mới.
              </div>
            )}
          </div>
        )}

        {/* MACRO TAB */}
        {activeSubTab === 'macro' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-cyan-400 uppercase tracking-wider text-sm">Báo cáo Vĩ Mô</h2>
              <button
                onClick={analyzeMacro}
                disabled={isLoading}
                className="px-4 py-2 border border-cyan-500 text-cyan-400 font-mono text-xs uppercase hover:bg-cyan-400 hover:text-[#05070a] transition-all disabled:opacity-30 rounded flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                Phân tích
              </button>
            </div>
            {macroResult ? (
              <div
                className="bg-[#0a0f19] border border-cyan-500/20 rounded p-5 text-sm font-mono text-cyan-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderContent(macroResult) }}
              />
            ) : (
              <div className="text-center py-20 text-gray-600 font-mono text-sm">
                Nhấn "Phân tích" để nhận đánh giá vĩ mô mới nhất.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentPanel;
