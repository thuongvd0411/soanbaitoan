
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
- Định dạng: Khi liệt kê các ý sai hoặc danh sách, hãy luôn sử dụng xuống dòng (newline) cho từng mục để dễ nhìn.
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
