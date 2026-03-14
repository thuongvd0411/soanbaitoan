
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
