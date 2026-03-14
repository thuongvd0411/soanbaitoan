
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

const RESPONSE_CACHE: Record<string, { response: string, timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

export const chatResponseService = {
    async generateResponse(query: string, summary: string, config: AppState): Promise<string> {
        // 1. Kiểm tra cache
        const cacheKey = btoa(unescape(encodeURIComponent(query + summary)));
        const cached = RESPONSE_CACHE[cacheKey];
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.debug("CHAT_RESPONSE_CACHE_HIT");
            return cached.response;
        }

        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        const modelName = "gemini-1.5-flash";

        const prompt = `
Bạn là Alla, một trợ lý AI thân thiện dành cho giáo viên.
Dựa trên dữ liệu tóm tắt sau, hãy viết câu trả lời cho câu hỏi: "${query}"

DỮ LIỆU TÓM TẮT:
${summary}

YÊU CẦU:
- Trả lời bằng tiếng Việt, xưng "em" hoặc "Alla", gọi giáo viên là "anh".
- Câu trả lời ngắn gọn (2-4 câu).
- Tuyệt đối không dùng markdown, không dùng danh sách.
- Thân thiện, hỗ trợ, chuyên nghiệp.
- Giới hạn tối đa 150 token.
`;

        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 150,
                }
            });

            const response = (result.text || "").trim();
            
            // Lưu cache
            RESPONSE_CACHE[cacheKey] = {
                response,
                timestamp: Date.now()
            };

            return response;
        } catch (error) {
            console.error("chatResponseService error:", error);
            return "Em xin lỗi, em đang gặp chút vấn đề khi kết nối với AI. Anh thử lại sau nhé!";
        }
    }
};
