
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

export type ChatIntent = "student_progress" | "class_summary" | "assignment_analysis" | "generate_exercise" | "general_question";

export interface IntentResult {
    intent: ChatIntent;
    studentName?: string;
    className?: string;
    topic?: string;
    timeRange?: string;
}

const INTENT_PROMPT = `
Bạn là bộ phân loại ý định (Intent Classifier) cho chatbot giáo dục.
Nhiệm vụ: Phân loại câu hỏi của người dùng và trích xuất thực thể.

CÁC INTENT:
- student_progress: Hỏi về tiến độ, kết quả của 1 học sinh cụ thể.
- class_summary: Hỏi về tình hình chung của một lớp học.
- assignment_analysis: Phân tích kết quả của một bài tập/mã đề cụ thể.
- generate_exercise: Yêu cầu tạo bài tập luyện tập.
- general_question: Các câu hỏi làm quen, chào hỏi hoặc không thuộc các loại trên.

BẮT BUỘC TRẢ VỀ JSON:
{ "intent": "...", "studentName": "...", "className": "...", "topic": "...", "timeRange": "..." }
(Chỉ điền các trường tìm thấy, nếu không có để null)

CÂU HỎI: "{query}"
`;

export const chatIntentService = {
    async detectIntent(query: string, config: AppState): Promise<IntentResult> {
        try {
            const prompt = INTENT_PROMPT.replace("{query}", query);
            const text = await chatAIService.generateContent(prompt, config, true);
            console.debug("CHAT_INTENT", text);
            return JSON.parse(text) as IntentResult;
        } catch (error) {
            console.error("chatIntentService error:", error);
            return { intent: "general_question" };
        }
    }
};
