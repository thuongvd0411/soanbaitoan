
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

export interface QueryPlan {
    intent: "student_progress" | "assignment_status" | "class_summary" | "tuition_status" | "teacher_salary" | "schedule_query" | "task_reminder" | "self_info" | "unknown";
    students?: string[];
    className?: string;
    filter?: string;
    month?: string;
    timeRange?: string;
}

const PLAN_PROMPT = `
Bạn là chuyên gia chuyển đổi ngôn ngữ tự nhiên thành Query Plan cho hệ thống LMS.
Dựa vào câu hỏi của giáo viên, hãy tạo JSON Query Plan.

SCHEMA FIRESTORE THAM KHẢO:
- students: id, name, classId
- assignments: studentId, score, completed, createdAt
- tuition: studentId, amount, paid, month
- tasks: title, status, dueDate

INTENTS:
- student_progress: hỏi về sức học, lỗi sai, điểm của học sinh.
- assignment_status: hỏi học sinh làm bài chưa, nộp chưa.
- class_summary: hỏi tình hình chung cả lớp.
- tuition_status: hỏi về đóng học phí.
- teacher_salary: hỏi về lương giáo viên (anh Thưởng), thu nhập tháng này.
- schedule_query: hỏi lịch học.
- task_reminder: hỏi danh sách việc cần làm/nhắc việc.
- self_info: hỏi về bản thân giáo viên (anh Thưởng đang dạy bao nhiêu lớp, bao nhiêu học sinh).

YÊU CẦU:
- students: Trích xuất danh sách tên RIÊNG (Ví dụ: "bạn Bảo" -> ["Bảo"], "em Vinh" -> ["Vinh"]). Bỏ qua các từ "bạn", "em", "anh", "chị".
- month: "current" (nếu hỏi tháng này), "last" (tháng trước), hoặc số tháng.
- Trả về JSON thuần túy.

CÂU HỎI: "{query}"
`;

export const chatQueryPlanService = {
    async generatePlan(query: string, config: AppState): Promise<QueryPlan> {
        try {
            const prompt = PLAN_PROMPT.replace("{query}", query);
            const text = await chatAIService.generateContent(prompt, config, true);
            console.debug("CHAT_QUERY_PLAN", text);
            return JSON.parse(text) as QueryPlan;
        } catch (error) {
            console.error("chatQueryPlanService error:", error);
            return { intent: "unknown" };
        }
    }
};
