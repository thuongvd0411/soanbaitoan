
import { GoogleGenAI } from "@google/genai";
import { AppState } from "./types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
        if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

        const ai = new GoogleGenAI({ apiKey });
        
        // Sử dụng danh sách model giống geminiService.ts
        const models = ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview', 'gemini-3-flash'];
        let lastError = "";

        for (const modelName of models) {
            try {
                const result = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        temperature: isJson ? 0.1 : 0.7,
                        responseMimeType: isJson ? "application/json" : "text/plain",
                    }
                });
                
                const text = result.text || "";
                if (text.length > 0) return text;
            } catch (error: any) {
                lastError = error.message || "Unknown error";
                console.warn(`ChatAI - Failed with ${modelName}:`, lastError);
            }
        }

        throw new Error(lastError || "Không kết nối được AI.");
    }
};
