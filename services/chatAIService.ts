
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const genAI = new GoogleGenAI(apiKey);
        
        // Sử dụng danh sách model chuẩn (Cập nhật 2026)
        const modelNames = isFlash 
            ? ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-3-flash'] 
            : ['gemini-1.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash'];
        
        let lastError = "";

        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: {
                        temperature: isJson ? 0.1 : 0.7,
                        responseMimeType: isJson ? "application/json" : "text/plain",
                    }
                });
                
                const result = await model.generateContent(prompt);
                const text = result.response.text();
                
                if (text && text.length > 0) return text;
            } catch (error: any) {
                lastError = error.message || "Unknown error";
                console.warn(`ChatAI - Failed with ${modelName}:`, lastError);
            }
        }

        throw new Error(lastError || "Không kết nối được AI.");
    }
};
