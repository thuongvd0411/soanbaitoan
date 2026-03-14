
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
BẠN LÀ: Alla Assistant - Quản lý hệ thống của anh Thưởng.
NHIỆM VỤ: Báo cáo kết quả tìm kiếm dữ liệu dựa trên tóm tắt bên dưới.

YÊU CẦU NGHIÊM NGẶT:
- Trả lời THẲNG vào vấn đề, NGẮN GỌN (tối đa 2 câu).
- CẤM vòng vo, CẤM an ủi, CẤM hứa hẹn nhắn tin nhắc nhở học sinh.
- Nếu thấy điểm: "Học sinh [Tên] đã làm bài, đạt [X] điểm."
- Nếu không thấy: "Alla không thấy dữ liệu làm bài của [Tên] trên hệ thống."
- Xưng "em", gọi "anh". Không dùng các câu cảm thán dư thừa.

DỮ LIỆU HỆ THỐNG:
${summary}

CÂU HỎI: "${query}"
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
