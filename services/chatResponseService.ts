
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
- Trả lời THẲNG vào vấn đề. CẤM vòng vo, CẤM an ủi, CẤM hứa hẹn nhắn tin nhắc học sinh.
- Nếu giáo viên chỉ hỏi "Làm bài chưa?", hãy báo cáo ngắn gọn: "Học sinh [Tên] đã làm bài, môn [Bài], đạt [X] điểm."
- Nếu giáo viên hỏi sâu "Sai câu nào?", "Sai kiến thức gì?": Hãy đọc dữ liệu "phanTichBaiSaiGanNhat" / "danhSachBaiTap" để phân tích chi tiết lỗi sai của học sinh.
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
