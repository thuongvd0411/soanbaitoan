
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, MessageSquare, Trash2, Mic, MicOff } from 'lucide-react';
import { chatIntentService } from '../services/chatIntentService';
import { chatRouterService } from '../services/chatRouterService';
import { chatResponseService } from '../services/chatResponseService';
import { db } from '../services/firebaseService';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
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
    const [isListening, setIsListening] = useState(false);
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

    // Listener thông báo chủ động khi có học sinh nộp bài
    useEffect(() => {
        if (!ownerId || !isOpen) return;

        const resultsRef = collection(db, "global_results");
        const q = query(
            resultsRef,
            where("ownerId", "==", ownerId),
            orderBy("submittedAt", "desc"),
            limit(1)
        );

        // Lưu mốc thời gian bắt đầu mở chat để tránh báo bài cũ
        const startTime = new Date().toISOString();

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    
                    // Chỉ báo nếu nộp SAU khi đã mở chat
                    if (data.submittedAt > startTime) {
                        const score = data.score;
                        const studentName = data.studentName;
                        const lessonName = data.lessonName || "Bài tập";
                        const submittedDate = new Date(data.submittedAt).toLocaleDateString('vi-VN');
                        
                        let praise = "";
                        if (score >= 9) {
                            const praises = [
                                "Thật tuyệt vời, em ấy học rất chắc kiến thức anh ạ!",
                                "Kết quả rất xứng đáng với nỗ lực của em ấy ạ.",
                                "Em ấy làm bài rất chỉn chu và chính xác, anh khen em ấy giúp em nhé!"
                            ];
                            praise = " " + praises[Math.floor(Math.random() * praises.length)];
                        }

                        const reportMsg = `Dạ anh, ${studentName} đã hoàn thành bài tập. Điểm: ${score}${praise}\n-Bài: ${lessonName}\n-Ngày nộp bài: ${submittedDate}`;
                        
                        setMessages(prev => {
                            // Tránh trùng lặp do listener trigger nhiều lần
                            if (prev.some(m => m.text === reportMsg)) return prev;
                            return [...prev, { role: 'alla', text: reportMsg }];
                        });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [ownerId, isOpen]);

    const clearHistory = () => {
        if (window.confirm("Anh muốn xóa toàn bộ lịch sử trò chuyện này ư?")) {
            const initialMessage: Message = { role: 'alla', text: 'Vâng anh, em đã sẵn sàng hỗ trợ anh rồi đây ạ.' };
            setMessages([initialMessage]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([initialMessage]));
        }
    };

    const toggleVoiceCapture = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Trình duyệt này không hỗ trợ nhận diện giọng nói.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };
        recognition.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error);
            setIsListening(false);
        };

        recognition.start();
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev.slice(-19), { role: 'user', text: userText }]); 
        setIsLoading(true);

        try {
            // BƯỚC 1: Phân tích ý định & Lập kế hoạch (Chỉ 1 AI Call thay vì 2)
            const { chatAnalyzerService } = await import('../services/chatAnalyzerService');
            const analysis = await chatAnalyzerService.analyze(userText, config);
            
            let response = "";

            if (analysis.type === "system_query" && analysis.plan) {
                // Bước 2: Truy vấn dữ liệu thực tế từ Firebase
                const summary = await chatRouterService.routeAndSummary(analysis.plan, ownerId);
                
                // Bước 3: Tạo phản hồi thân thiện (AI Call thứ 2)
                const { chatResponseService } = await import('../services/chatResponseService');
                response = await chatResponseService.generateResponse(userText, summary || "Không tìm thấy dữ liệu phù hợp.", config);
            } else {
                // Bước 2: Trò chuyện hoặc Tác vụ AI (Chỉ 1 AI Call thay vì 2)
                const { chatAIService } = await import('../services/chatAIService');
                const systemPrompt = `BẠN LÀ: Alla - Trợ lý của anh Thưởng.
YÊU CẦU:
- Luôn mở đầu bằng "Vâng anh", "Dạ anh" hoặc "Dạ". TUYỆT ĐỐI không gọi "Anh Thưởng".
- Xưng "em", gọi "anh".
- Với học sinh Bảo, gọi là "Bảo", "em Bảo", "bạn Bảo".
- Trả lời thẳng vào vấn đề, xuống dòng rõ ràng cho từng ý.
NỘI DUNG GỐC: ${userText}`;
                response = await chatAIService.generateContent(systemPrompt, config, analysis.type !== "ai_task");
            }
            
            setMessages(prev => [...prev, { role: 'alla', text: response }]);

            // Ghi log vào Firebase
            try {
                const { db } = await import('../services/firebaseService');
                const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
                await addDoc(collection(db, "chat_logs"), {
                    ownerId,
                    question: userText,
                    type: analysis.type,
                    timestamp: serverTimestamp()
                });
            } catch (e) { 
                console.error("Log to Firebase failed:", e); 
            }

        } catch (error: any) {
            console.error("Chatbot:", error);
            setMessages(prev => [...prev, { role: 'alla', text: "Dạ anh, " + (error.message || "kết nối hiện đang gián đoạn, anh thử lại xíu nữa nhé!") }]);
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
                            <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>
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
                    <button 
                        onClick={toggleVoiceCapture}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                            isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={isListening ? "Đang nghe..." : "Nhập bằng giọng nói"}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isListening ? "Alla đang nghe..." : "Hỏi em về học sinh, tài chính hoặc bài tập..."}
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
