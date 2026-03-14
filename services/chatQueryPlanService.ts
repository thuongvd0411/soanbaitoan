
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

export interface QueryPlan {
    intent: "student_progress" | "assignment_status" | "class_summary" | "tuition_status" | "teacher_salary" | "schedule_query" | "task_reminder" | "unknown";
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
- teacher_salary: hỏi về lương giáo viên.
- schedule_query: hỏi lịch học.
- task_reminder: hỏi danh sách việc cần làm/nhắc việc.

YÊU CẦU:
- students: Trích xuất danh sách tên (ví dụ: ["Bảo", "Đạt"]).
- month: "current" hoặc số tháng.
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
