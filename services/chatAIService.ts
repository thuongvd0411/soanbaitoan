
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        
        // Fallback đa cấp từ Gemini 3.1 -> 3.0 -> 2.5 -> 2.0 -> 1.5
        // Đảm bảo không bao giờ bị 404 trên bất kỳ API Key hoặc version nào
        const modelNames = isFlash 
            ? ['gemini-3.1-flash', 'gemini-3.0-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'] 
            : ['gemini-3.1-pro', 'gemini-3.0-pro', 'gemini-3-pro', 'gemini-2.5-pro', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro-latest'];
        
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
