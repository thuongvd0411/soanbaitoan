
import { chatAIService } from "./chatAIService";
import { AppState } from "../types";

export type ChatIntent = "system_query" | "ai_task" | "general_chat";

export interface IntentResult {
    intent: ChatIntent;
}

// Hàm bóc tách JSON từ phản hồi có thể chứa markdown code block
const extractJSON = (text: string): string => {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return match[1].trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0].trim();
    return text.trim();
};

const INTENT_PROMPT = `
Phân loại câu hỏi sau thành 1 trong 3 loại:
1. system_query: hỏi dữ liệu LMS (học sinh, lớp, lịch học, học phí, điểm, làm bài chưa, lương của anh, thông tin lớp tôi đang dạy...)
2. ai_task: yêu cầu AI tạo nội dung (soạn đề, giải toán, tạo câu hỏi...)
3. general_chat: câu hỏi kiến thức chung, chào hỏi hoặc trò chuyện linh tinh, bạn là ai.

BẮT BUỘC TRẢ VỀ THUẦN JSON (KHÔNG dùng markdown): { "intent": "..." }

CÂU HỎI: "{query}"
`;

export const chatIntentService = {
    async detectIntent(query: string, config: AppState): Promise<IntentResult> {
        try {
            const prompt = INTENT_PROMPT.replace("{query}", query);
            const text = await chatAIService.generateContent(prompt, config, true);
            const cleanText = extractJSON(text);
            console.log("Alla Intent RAW:", text);
            console.log("Alla Intent CLEAN:", cleanText);
            return JSON.parse(cleanText) as IntentResult;
        } catch (error) {
            console.error("chatIntentService error:", error);
            return { intent: "general_chat" };
        }
    }
};
