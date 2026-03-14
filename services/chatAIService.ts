
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        
        // Dựa theo log thực tế, API Key hiện hành chỉ được cấp quyền (whitelist)
        // cho các model dòng 1.5. Xóa các bản 3.x, 2.x để tránh spam request báo lỗi 404.
        const modelNames = isFlash 
            ? ['gemini-1.5-flash-latest', 'gemini-1.5-flash-8b', 'gemini-1.5-flash'] 
            : ['gemini-1.5-pro-latest', 'gemini-1.5-pro'];
        
        let lastError = "";

        for (const modelName of modelNames) {
            try {
                // Sử dụng cú pháp ai.models.generateContent tương tự geminiService.ts để đảm bảo chạy được trên Browser
                const result = await (ai as any).models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        temperature: isJson ? 0.1 : 0.7,
                        responseMimeType: isJson ? "application/json" : "text/plain",
                    }
                });
                
                const text = result.text || "";
                if (text && text.length > 0) return text;
            } catch (error: any) {
                lastError = error.message || "Unknown error";
                console.warn(`ChatAI - Failed with ${modelName}:`, lastError);
            }
        }

        throw new Error(lastError || "Không kết nối được AI.");
    }
};
