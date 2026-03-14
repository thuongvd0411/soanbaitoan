
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

const RESPONSE_CACHE: Record<string, { response: string, timestamp: number }> = {};

export const chatResponseService = {
    async generateResponse(query: string, summary: string, config: AppState): Promise<string> {
        const cacheKey = `${query}_${summary}`;
        if (RESPONSE_CACHE[cacheKey] && Date.now() - RESPONSE_CACHE[cacheKey].timestamp < 5 * 60 * 1000) {
            return RESPONSE_CACHE[cacheKey].response;
        }

        const prompt = `
Dựa trên dữ liệu tóm tắt sau, hãy trả lời ngắn gọn cho giáo viên (anh Thưởng).

DỮ LIỆU:
${summary}

CÂU HỎI: "${query}"

YÊU CẦU:
- Xưng "em" hoặc "Alla", gọi giáo viên là "anh".
- Tối đa 3 câu.
- Không dùng markdown, không dùng danh sách.
- Ngôn ngữ tự nhiên, siu cute và thân thiện.
- Giới hạn 150 token.
`;

        try {
            const response = await chatAIService.generateContent(prompt, config);
            
            // Lưu cache
            RESPONSE_CACHE[cacheKey] = {
                response,
                timestamp: Date.now()
            };

            return response;
        } catch (error) {
            console.error("chatResponseService error:", error);
            throw error;
        }
    }
};
