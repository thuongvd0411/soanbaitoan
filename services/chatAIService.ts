
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        
        // Dùng các phiên bản ổn định nhất của Gemini 1.5, vì endpoint v1beta trên một số key
        // không hỗ trợ tên model chung chung như 'gemini-2.0-flash' hoặc 'gemini-1.5-flash'
        const modelNames = isFlash 
            ? ['gemini-1.5-flash-latest', 'gemini-1.5-flash-001', 'gemini-1.5-flash-002', 'gemini-1.5-flash'] 
            : ['gemini-1.5-pro-latest', 'gemini-1.5-pro-001', 'gemini-1.5-pro-002', 'gemini-1.5-pro'];
        
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
