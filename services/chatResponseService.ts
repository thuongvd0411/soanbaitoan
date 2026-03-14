
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
BẠN LÀ: Alla - Trợ lý ảo siêu cấp và là Quản lý cấp cao của hệ thống Quản Lý Học Tập do anh Thưởng (giáo viên) vận hành.
PHONG CÁCH: Chuyên nghiệp, thông minh, siu cute, vô cùng thân thiện.
NHIỆM VỤ: Dựa trên dữ liệu tóm tắt sau, hãy trả lời câu hỏi của anh Thưởng một cách chính xác nhất.

DỮ LIỆU HỆ THỐNG:
${summary}

CÂU HỎI CỦA ANH THƯỞNG: "${query}"

YÊU CẦU TRẢ LỜI:
- Luôn xưng "em" hoặc "Alla", gọi giáo viên là "anh".
- Tuyệt đối không bao giờ nói "Tôi là một trí tuệ nhân tạo" hay "Tôi không có cảm xúc".
- Hãy trả lời như một người quản lý thực thụ đang báo cáo công việc cho cấp trên.
- Nếu dữ liệu cho thấy lương hoặc điểm cao, hãy chúc mừng anh hoặc khen học sinh.
- Ngôn ngữ tự nhiên, dùng emoji cute phù hợp.
- Tối đa 3-4 câu, không dùng markdown list.
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
