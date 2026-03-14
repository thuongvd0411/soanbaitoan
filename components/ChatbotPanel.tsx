
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { chatIntentService } from '../services/chatIntentService';
import { chatRouterService } from '../services/chatRouterService';
import { chatResponseService } from '../services/chatResponseService';
import { AppState } from '../types';

interface Message {
    role: 'user' | 'alla';
    text: string;
}

interface ChatbotPanelProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppState;
    ownerId: string;
    isEmbedded?: boolean;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ isOpen, onClose, config, ownerId, isEmbedded }) => {
    const STORAGE_KEY = `alla_chat_history_${ownerId}`;
    
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [
            { role: 'alla', text: 'Chúc 1 ngày tốt lành, em ở ngay đây rồi ạ' }
        ];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Lưu history mỗi khi messages thay đổi
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }, [messages, STORAGE_KEY]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const clearHistory = () => {
        if (window.confirm("Anh muốn xóa toàn bộ lịch sử trò chuyện này ư?")) {
            const initialMessage: Message = { role: 'alla', text: 'Chào anh Thưởng ạ! Em đã sẵn sàng hỗ trợ anh quản lý lớp học rồi đây.' };
            setMessages([initialMessage]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([initialMessage]));
        }
    };


    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev.slice(-19), { role: 'user', text: userText }]); 
        setIsLoading(true);

        try {
            // 1. Phân loại Intent (Gemini Flash)
            const intentResult = await chatIntentService.detectIntent(userText, config);
            let response = "";

            if (intentResult.intent === "system_query") {
                // Nhánh 1: Truy vấn hệ thống
                const { chatQueryPlanService } = await import('../services/chatQueryPlanService');
                const plan = await chatQueryPlanService.generatePlan(userText, config);
                const summary = await chatRouterService.routeAndSummary(plan, ownerId);
                response = await chatResponseService.generateResponse(userText, summary || "Không tìm thấy dữ liệu phù hợp.", config);
            } else if (intentResult.intent === "ai_task") {
                // Nhánh 2: Tác vụ AI (Gemini Pro)
                const { chatAIService } = await import('../services/chatAIService');
                const prompt = `Bạn là trợ lý AI chuyên về nội dung giáo dục. Hãy thực hiện yêu cầu sau: ${userText}. Trả lời ngắn gọn, chuyên nghiệp, không vơi 150 tokens.`;
                response = await chatAIService.generateContent(prompt, config, false); // false = use Pro
            } else {
                // Nhánh 3: Trò chuyện tự nhiên (Gemini Flash)
                const { chatAIService } = await import('../services/chatAIService');
                const systemPrompt = `BẠN LÀ: Alla - Quản lý hệ thống của anh Thưởng.
YÊU CẦU PHONG CÁCH:
- Tuyệt đối không vòng vo, không an ủi "anh đừng lo", không hứa hẹn "em sẽ nhắc nhở".
- Trả lời thẳng vào dữ liệu có sẵn. Nếu không thấy dữ liệu, hãy báo cáo ngắn gọn: "Hệ thống chưa ghi nhận dữ liệu cho [Tên]".
- Ngôn ngữ: Chuyên nghiệp, gọn gàng, vẫn xưng em/anh nhưng phải tập trung vào kết quả.
CÂU HỎI: ${userText}`;
                response = await chatAIService.generateContent(systemPrompt, config, true); // true = use Flash
            }
            
            setMessages(prev => [...prev, { role: 'alla', text: response }]);

            // Ghi log vào Firebase
            try {
                const { firebaseService } = await import('../services/firebaseService');
                const { db } = await import('../services/firebaseService');
                const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
                console.log("Logging chat to Firebase...");
                await addDoc(collection(db, "chat_logs"), {
                    ownerId,
                    question: userText,
                    intent: intentResult.intent,
                    timestamp: serverTimestamp()
                });
            } catch (e) { 
                console.error("Log to Firebase failed:", e); 
            }

        } catch (error: any) {
            console.error("Chatbot Error Detail:", error);
            // Log chi tiết lỗi ra console để debug
            if (error.stack) console.error(error.stack);
            setMessages(prev => [...prev, { role: 'alla', text: "Em siu cute đang bận xíu (lỗi: " + (error.message || "kết nối") + "), anh thử lại sau nhé!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={isEmbedded 
            ? "w-full h-full min-h-[500px] bg-white rounded-[32px] shadow-sm flex flex-col border border-gray-100 overflow-hidden"
            : "fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[500px] bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300"
        }>
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden border border-white/30 shadow-inner backdrop-blur-md">
                        <img src="/soanbaitoan/alla-avatar.png" alt="Alla" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Alla Assistant <span className="text-[10px] opacity-70">v5.4.8</span></h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-[10px] opacity-80 font-bold uppercase">Ready to Assist</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={clearHistory} title="Xóa lịch sử" className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white">
                        <Trash2 size={18} />
                    </button>
                    {!isEmbedded && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {/* ... (giữ nguyên logic render messages) */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gray-50/50">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'alla' && (
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-100 shrink-0 mt-1 shadow-sm">
                                <img src="/soanbaitoan/alla-avatar.png" alt="A" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-4 rounded-[24px] text-sm shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-60">
                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                <span className="text-[10px] font-black uppercase">
                                    {msg.role === 'user' ? 'Anh Thưởng' : 'Alla'}
                                </span>
                            </div>
                            <p className="leading-relaxed font-medium">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-[24px] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-blue-600" />
                            <span className="text-xs text-gray-500 font-bold italic animate-pulse">Alla đang suy nghĩ...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Hỏi em về học sinh, tài chính hoặc bài tập..."
                        className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-5 pr-12 text-sm focus:ring-2 ring-blue-500/20 outline-none font-medium placeholder:text-gray-400"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-1 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            input.trim() && !isLoading ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300'
                        }`}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-[9px] text-center text-gray-400 mt-2 font-bold uppercase tracking-widest opacity-50">Xây dựng bởi ThuongVD & Alla</p>
            </div>
        </div>
    );
};

export default ChatbotPanel;
