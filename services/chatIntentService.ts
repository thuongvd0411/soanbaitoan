
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

export type ChatIntent = "system_query" | "ai_task" | "general_chat";

export interface IntentResult {
    intent: ChatIntent;
}

const INTENT_PROMPT = `
Phân loại câu hỏi sau thành 1 trong 3 loại:
1. system_query: hỏi dữ liệu LMS (học sinh, lớp, lịch học, học phí, điểm, làm bài chưa, lương của anh, thông tin lớp tôi đang dạy...)
2. ai_task: yêu cầu AI tạo nội dung (soạn đề, giải toán, tạo câu hỏi...)
3. general_chat: câu hỏi kiến thức chung, chào hỏi hoặc trò chuyện linh tinh, bạn là ai.

BẮT BUỘC TRẢ VỀ JSON: { "intent": "..." }

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
            return { intent: "general_chat" };
        }
    }
};
