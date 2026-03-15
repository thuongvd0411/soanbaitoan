
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const chatAIService = {
    async generateContent(prompt: string, config: AppState, isFlash: boolean = true, isJson: boolean = false): Promise<string> {
        const env = (import.meta as any).env || {};
        const sysKey = env.VITE_GEMINI_API_KEY;
        
        // Ưu tiên: Primary -> Secondary -> System Key, đồng thời loại bỏ các Key trùng lặp
        const rawKeys = [
            config.primaryApiKey?.trim(),
            config.secondaryApiKey?.trim(),
            sysKey?.trim()
        ].filter(Boolean) as string[];
        const keys = Array.from(new Set(rawKeys));

        if (keys.length === 0) throw new Error("API Key chưa sẵn sàng. Anh vui lòng nhập ít nhất một Key ở Sidebar.");
        
        const modelNames = isFlash 
            ? ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'] 
            : ['gemini-2.5-pro', 'gemini-2.0-pro-exp-02-05'];
        
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
        // Phân tích lỗi cuối cùng để báo cáo chuyên nghiệp hơn (tránh in ra 1 cục JSON)
        if (lastError.includes("429") || lastError.includes("quota") || lastError.includes("RESOURCE_EXHAUSTED")) {
            throw new Error("Tất cả API Key hiện tại đều bận hoặc hết hạn mức (429). Anh nhắn nhỏ nhắn hoặc đợi 1 phút rồi thử lại nhé!");
        } else if (lastError.includes("404")) {
            throw new Error("API Key của anh hiện không hỗ trợ Model này. Anh hãy kiểm tra lại cấu hình Key nhé!");
        } else if (lastError.includes("403")) {
            throw new Error("API Key của anh bị chặn truy cập (403). Anh kiểm tra lại xem Key còn hiệu lực không nhé.");
        }
        
        throw new Error("Lỗi kết nối AI (" + lastError.substring(0, 50) + "...). Anh kiểm tra mạng hoặc thử lại sau giúp em.");
    }
};
