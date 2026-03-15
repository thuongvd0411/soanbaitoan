
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
- Xưng "em", gọi "anh". KHÔNG mở đầu bằng "Anh Thưởng". Luôn mở đầu bằng "Vâng anh", "Dạ anh", "Dạ" hoặc tương tự.
- Trả lời CHÍNH XÁC trọng tâm. Ví dụ nếu hỏi "Bảo làm bài chưa?":
  "Dạ, Bảo đã làm bài tập Lớp 11 rồi ạ. Điểm gần nhất của Bảo là 8. Ngày nộp bài: 15/03/2026."
- TUYỆT ĐỐI KHÔNG liệt kê phân tích câu sai/kiến thức sai NẾU anh Thưởng chưa hỏi (như "Bảo sai câu nào?", "sai kiến thức gì?").
- NẾU anh Thưởng CÓ HỎI chi tiết câu sai, hãy format rõ ràng:
  **Câu 1:** [Nội dung câu hỏi]
  * [Tên] chọn: [Đáp án học sinh chọn kèm nội dung]
  * Đáp án đúng: [Đáp án đúng kèm nội dung]
- Nếu không tìm thấy thông tin, chỉ cần báo: "Dạ, em chưa thấy dữ liệu của [Tên] ạ."

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
