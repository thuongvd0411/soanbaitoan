
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

YÊU CẦU NGHIÊM NGẶT VỀ MẪU BÁO CÁO:
1. Nếu hỏi về trạng thái làm bài ("Bảo làm bài chưa?", "tiến độ của Bảo"...):
   - TRƯỜNG HỢP CHƯA LÀM:
     Dạ, [Tên học sinh] vẫn chưa nộp bài ạ
     -BT được giao: [Tên bài tập]
     -ngày giao [Ngày giao định dạng DD/MM/YYYY]
   
   - TRƯỜNG HỢP ĐÃ LÀM:
     Dạ anh, [Tên học sinh] đã hoàn thành bài tập. Điểm: [Điểm] [Câu khen ngợi nếu đạt 9-10 điểm]
     -Bài [Số thứ tự hoặc Tên bài]: [Chủ đề/Mô tả]
     -Ngày nộp bài: [Ngày nộp định dạng DD/MM/YYYY]

2. LƯU Ý CHUNG:
   - Luôn xưng "em", gọi "anh". KHÔNG mở đầu bằng "Anh Thưởng". 
   - Xuống dòng rõ ràng cho các ý gạch đầu dòng.
   - Chỉ khen ngợi ("Thật tuyệt vời...", "Em ấy làm bài rất chỉn chu...") khi điểm số từ 9 trở lên.
   - Nếu không tìm thấy thông tin, chỉ báo: "Dạ, em chưa thấy dữ liệu của [Tên] ạ."

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
