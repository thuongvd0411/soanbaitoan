
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const sysKey = env.VITE_GEMINI_API_KEY;
        
        // Ưu tiên: Primary -> Secondary -> System Key
        const keys = [
            config.primaryApiKey?.trim(),
            config.secondaryApiKey?.trim(),
            sysKey?.trim()
        ].filter(Boolean) as string[];

        if (keys.length === 0) throw new Error("API Key chưa sẵn sàng. Anh vui lòng nhập ít nhất một Key ở Sidebar.");
        
        const modelNames = isFlash 
            ? ['gemini-2.0-flash', 'gemini-2.0-flash-lite'] 
            : ['gemini-2.0-pro-exp-02-05'];
        
        let lastError = "";

        // Thử từng API Key khả dụng
        for (const apiKey of keys) {
            const ai = new GoogleGenAI({ apiKey });
            let keyExhausted = false;
            
            // Với mỗi Key, thử từng Model dự phòng
            for (const modelName of modelNames) {
                if (keyExhausted) break;

                try {
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
                    console.warn(`ChatAI - Key [${apiKey.substring(0,6)}...] Failed with ${modelName}:`, lastError);
                    
                    // Nếu lỗi là 429 (hết quota) hoặc 403 (bị chặn), chuyển ngay sang Key tiếp theo
                    if (lastError.includes("429") || lastError.includes("quota") || lastError.includes("RESOURCE_EXHAUSTED") || lastError.includes("403")) {
                        keyExhausted = true;
                        break; 
                    }
                }
            }
        }

        throw new Error(lastError || "Dạ anh, hiện tại cả 2 Key đều đang bận hoặc quá tải, anh vui lòng đợi lát rồi thử lại giúp em nhé!");
    }
};
