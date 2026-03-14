
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react';
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
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ isOpen, onClose, config, ownerId }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'alla', text: 'Chào anh Thưởng! Em là Alla, em có thể giúp anh xem tình hình học tập của học sinh hoặc hỗ trợ anh soạn bài ạ.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev.slice(-9), { role: 'user', text: userText }]); // Giữ tối đa 10 messages
        setIsLoading(true);

        try {
            // 1. Detect Intent
            const intent = await chatIntentService.detectIntent(userText, config);
            
            // 2. Route & Get Summary
            const summary = await chatRouterService.routeAndSummary(intent, ownerId);
            
            // 3. Generate Response
            const response = await chatResponseService.generateResponse(userText, summary || "Không có dữ liệu cụ thể.", config);
            
            setMessages(prev => [...prev, { role: 'alla', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'alla', text: "Em xin lỗi, em gặp lỗi rồi. Anh thử lại nhé!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[500px] bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <Sparkles size={20} className="text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Alla AI Assistant</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-[10px] opacity-80 font-bold uppercase">Đang sẵn sàng</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gray-50/50">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                        placeholder="Hỏi em về học sinh hoặc bài tập..."
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
                <p className="text-[9px] text-center text-gray-400 mt-2 font-bold uppercase tracking-widest opacity-50">Powered by Gemini AI</p>
            </div>
        </div>
    );
};

export default ChatbotPanel;
