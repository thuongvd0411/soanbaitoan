
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";
import { QueryPlan } from "./chatQueryPlanService";

export interface AnalysisResult {
    type: "system_query" | "ai_task" | "general_chat";
    plan?: QueryPlan;
    content?: string; // Prompt đã được tối ưu hoặc câu trả lời trực tiếp nếu là chat đơn giản
}

const ANALYZER_PROMPT = `
BẠN LÀ: Chuyên gia phân tích ý định cho hệ thống LMS Soạn Toán AI.
NHIỆM VỤ: Phân tích yêu cầu của anh Thưởng và trả về JSON cấu trúc định dạng bên dưới.

PHÂN LOẠI:
1. system_query: Hỏi về dữ liệu (học sinh, lớp, điểm, lương, lịch học, lỗi sai kiến thức, tiến độ...).
2. ai_task: Yêu cầu tạo nội dung mới (soạn đề, giải toán, viết đoạn văn...).
3. general_chat: Chào hỏi, tán gẫu, hỏi kiến thức chung không liên quan dữ liệu hệ thống.

YÊU CẦU JSON (KHÔNG MÃ MARKDOWN):
{
  "type": "system_query" | "ai_task" | "general_chat",
  "plan": {
    "intent": "student_progress" | "assignment_status" | "class_summary" | "tuition_status" | "teacher_salary" | "schedule_query" | "self_info",
    "students": ["Tên học sinh"],
    "month": "current" | "last" | null
  },
  "content": "Yêu cầu gốc hoặc prompt bổ sung"
}

LƯU Ý RIÊNG:
- Nếu hỏi "Bảo sai kiến thức gì", "Làm bài chưa": type là "system_query", intent là "student_progress".
- Nếu xưng hô: Gọi học sinh là "Bảo", "em Bảo", "bạn Bảo".

CÂU HỎI: "{query}"
`;

export const chatAnalyzerService = {
    async analyze(query: string, config: AppState): Promise<AnalysisResult> {
        try {
            const prompt = ANALYZER_PROMPT.replace("{query}", query);
            const response = await chatAIService.generateContent(prompt, config, true, true);
            
            // Bóc tách JSON
            let cleanJson = response.trim();
            const match = response.match(/\{[\s\S]*\}/);
            if (match) cleanJson = match[0];
            
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("chatAnalyzerService error:", error);
            return { type: "general_chat", content: query };
        }
    }
};
