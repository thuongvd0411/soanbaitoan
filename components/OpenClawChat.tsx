import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, ShieldAlert, CheckCircle, ExternalLink, Settings } from 'lucide-react';
import { aiRouter } from '../services/ai/aiRouter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const OpenClawChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Connection settings for debugging
  const [openclawUrl, setOpenclawUrl] = useState(localStorage.getItem('math_app_openclaw_url') || '');
  const [openclawKey, setOpenclawKey] = useState(localStorage.getItem('math_app_openclaw_api_key') || '');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkConnection = async () => {
    setStatus('checking');
    setErrorHeader(null);
    try {
      // Test URL with a simple timeout fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const testUrl = openclawUrl.endsWith('/v1') ? `${openclawUrl}/models` : `${openclawUrl}/v1/models`;
      
      const response = await fetch(testUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${openclawKey}` }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus('online');
      } else {
        setStatus('offline');
        const errText = await response.text();
        setErrorHeader(`Lỗi HTTP ${response.status}: ${errText.substring(0, 100)}`);
      }
    } catch (err: any) {
      console.error("Connection check failed:", err);
      setStatus('offline');
      if (err.name === 'AbortError') {
        setErrorHeader("Lỗi: Quá thời gian kết nối (Timeout). Vui lòng kiểm tra Serveo/Ngrok.");
      } else if (err.message.includes('CORS')) {
        setErrorHeader("Lỗi CORS: Trình duyệt chặn kết nối. Hãy chạy Chrome với --disable-web-security hoặc dùng HTTPS.");
      } else {
        setErrorHeader("Không thể kết nối tới OpenClaw. Hãy kiểm tra xem OpenClaw đã được bật chưa.");
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Ensure aiRouter uses the latest local settings
      aiRouter.setOpenClawConfig(openclawUrl, openclawKey);
      
      // Use "openclaw" specifically
      const response = await aiRouter.sendMessage('openclaw', [
        ...messages.map(m => ({ role: m.role as any, content: m.content })),
        { role: 'user', content: userMsg }
      ]);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      if (status === 'offline') setStatus('online'); // If it worked, it's online
    } catch (err: any) {
      console.error("OpenClaw Chat Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Lỗi: ${err.message || 'Không thể nhận phản hồi từ AI. Hãy kiểm tra kết nối.'}` }]);
      setStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeUrl = (url: string) => {
    let clean = url.trim();
    if (!clean) return clean;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    // Remote trailing slashes
    clean = clean.replace(/\/+$/, '');
    // Ensure /v1
    if (!clean.endsWith('/v1')) {
      clean = clean + '/v1';
    }
    return clean;
  };

  const handleUpdateConfig = () => {
    const finalUrl = sanitizeUrl(openclawUrl);
    setOpenclawUrl(finalUrl);
    localStorage.setItem('math_app_openclaw_url', finalUrl);
    localStorage.setItem('math_app_openclaw_api_key', openclawKey);
    aiRouter.setOpenClawConfig(finalUrl, openclawKey);
    checkConnection();
    setShowConfig(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header with status */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 md:p-6 text-white flex justify-between items-center shadow-lg relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
            <Bot size={28} className="text-blue-100" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Chatbot OpenClaw</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                status === 'online' ? 'bg-green-400 animate-pulse' : 
                status === 'checking' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {status === 'online' ? 'Sẵn sàng' : 
                 status === 'checking' ? 'Đang kiểm tra...' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Cấu hình kết nối"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={checkConnection}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Tải lại kết nối"
          >
            <RefreshCw size={20} className={status === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {status === 'offline' && errorHeader && (
        <div className="bg-red-50 border-b border-red-100 p-3 px-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-bold text-red-800 leading-tight">{errorHeader}</p>
            <p className="text-[10px] text-red-600 mt-1 italic">Vui lòng kiểm tra Local Server port 1337 và link Serveo/Ngrok.</p>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-gray-50 border-b p-6 space-y-4 animate-in slide-in-from-top-4 duration-300 shadow-inner">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Cấu hình OpenClaw Link</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">URL OpenClaw (Serveo/Ngrok)</label>
              <input 
                type="text" 
                value={openclawUrl} 
                onChange={e => setOpenclawUrl(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm focus:ring-2 ring-blue-500/20 outline-none shadow-sm"
                placeholder="https://abc.serveousercontent.com/v1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">API Key (OpenRouter/OpenAI)</label>
              <input 
                type="password" 
                value={openclawKey} 
                onChange={e => setOpenclawKey(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm focus:ring-2 ring-blue-500/20 outline-none shadow-sm"
                placeholder="sk-..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Hủy</button>
            <button onClick={handleUpdateConfig} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Lưu & Thử lại</button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale pointer-events-none p-10">
            <div className="bg-gray-200 p-8 rounded-full mb-6">
              <Bot size={80} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-600 mb-2">Sẵn sàng phục vụ</h3>
            <p className="max-w-md text-sm font-medium leading-relaxed">Kết nối vào OpenClaw để bắt đầu trò chuyện với mô hình GPT-4o chuyên nghiệp.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-700'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 md:p-5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed ${
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 rounded-tl-none text-gray-800'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                <Loader2 size={16} className="animate-spin text-blue-700" />
              </div>
              <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100">
        <div className="flex gap-3 relative max-w-4xl mx-auto">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            placeholder={status === 'online' ? "Nhập câu hỏi cho OpenClaw..." : "Mất kết nối với OpenClaw..."}
            className={`flex-1 border-2 p-4 md:p-5 rounded-2xl outline-none transition-all pr-16 shadow-sm ${
              status === 'online' ? 'focus:border-blue-500 focus:ring-4 ring-blue-500/10' : 'bg-gray-50 border-gray-200 cursor-not-allowed'
            }`}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim() || status !== 'online'}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-3.5 rounded-xl transition-all ${
              !input.trim() || isLoading || status !== 'online' ? 'bg-gray-100 text-gray-300' : 'bg-blue-600 text-white shadow-xl hover:scale-105 active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
          </button>
        </div>
        <p className="text-center text-[9px] uppercase font-black text-gray-400 mt-4 tracking-[0.2em]">OpenClaw AI Integration • Verified Secure Connection</p>
      </div>
    </div>
  );
};
