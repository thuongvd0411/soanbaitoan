
import { GoogleGenAI } from "@google/genai";
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
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        const modelName = "gemini-1.5-flash"; 

        try {
            const prompt = INTENT_PROMPT.replace("{query}", query);
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                }
            });

            const text = result.text || "";
            console.debug("CHAT_INTENT", text);
            return JSON.parse(text) as IntentResult;
        } catch (error) {
            console.error("chatIntentService error:", error);
            return { intent: "general_question" };
        }
    }
};
