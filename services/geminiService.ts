
// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { AppState, Question, QuestionType, Difficulty, AnswerMode, ExamType, ImageMode } from "../types";
import { getChapterOfLesson, getExamScope } from "./syllabusData";
import { OLYMPIC_GEOMETRY_INSTRUCTION } from "./olympicGeometryMode";

const MATH_FORMAT_INSTRUCTION = 'BẮT BUỘC: Mọi công thức, biểu thức, biến số (như x, y, a, b...), hoặc ký hiệu toán học PHẢI được bọc trong cặp dấu \\( và \\). Ví dụ: \\( y = ax^2 + b \\). TUYỆT ĐỐI KHÔNG để công thức ở dạng văn bản thuần túy.';

const GRAPHING_INSTRUCTION = `
QUY TẮC VẼ ĐỒ THỊ & HÌNH HỌC SVG CHÍNH XÁC CAO (ZERO TOLERANCE):
1. HỆ TỌA ĐỘ CHUẨN:
   - ViewBox: "0 0 300 300".
   - Tâm O (Gốc tọa độ): (150, 150).
   - Tỉ lệ: 1 đơn vị toán học = 30 pixel.
   - Công thức: X_px = 150 + (x * 30), Y_px = 150 - (y * 30).

2. RÀNG BUỘC ĐIỂM CHỐT (ANCHOR POINTS):
   - Mọi <circle> đánh dấu điểm PHẢI có tọa độ cx, cy trùng khớp tuyệt đối với tọa độ trong đường <path>.

3. KỸ THUẬT VẼ PATH:
   - Đường thẳng: Dùng lệnh "L".
   - Đường cong: Dùng lệnh "C" (Cubic Bezier).
   - Đặt fill="none" và stroke-width="1.5" cho mọi nét vẽ hàm số.

4. NHÃN (LABELS):
   - Đặt nhãn x tại (290, 145), nhãn y tại (155, 15). Nhãn O tại (155, 165).
`;

const ANSWER_DISTRIBUTION_INSTRUCTION = `
QUY TẮC PHÂN BỔ ĐÁP ÁN:
- AI PHẢI nỗ lực phân bổ đáp án đúng ngẫu nhiên giữa A, B, C, D.
- Không được để quá 2 câu liên tiếp có cùng một chữ cái đáp án đúng.
`;

const JSON_SCHEMA_INSTRUCTION = `
BẮT BUỘC trả về JSON với cấu trúc:
{
  "questions": [
    {
      "content": "Nội dung câu hỏi (LaTeX bọc trong \\\\( ... \\\\))",
      "type": "Trắc nghiệm ABCD",
      "difficulty": "Nhận biết | Thông hiểu | Vận dụng | Vận dụng cao",
      "choices": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "correctAnswer": "A hoặc B hoặc C hoặc D",
      "hint": "Gợi ý tư duy",
      "explanation": "Lời giải chi tiết",
      "hasImage": false,
      "imageDescription": "Mã SVG hoàn chỉnh nếu có hình"
    }
  ]
}
`;

export const generateQuestions = async (
  config: AppState,
  previousQuestions: Question[] = [],
  onProgress?: (percent: number) => void
): Promise<Question[]> => {
  const env = (import.meta as any).env || {};
  const sysKey = env.VITE_GEMINI_API_KEY;
  const userKey = config.customApiKey;
  const apiKey = (userKey || sysKey)?.trim();

  console.log(`Alla Debug - [v5.3] API Key Check:
    - User Key: ${userKey ? "OK (" + userKey.substring(0, 5) + "...)" : "None"}
    - Sys Key: ${sysKey ? "OK (" + sysKey.substring(0, 5) + "...)" : "None"}
    - Active: ${apiKey ? "Selected" : "FAIL"}
  `);

  if (!apiKey) {
    throw new Error("Lỗi: Không tìm thấy API Key. Anh vui lòng nhập Key ở Sidebar.");
  }

  // SDK mới: dùng GoogleGenAI với apiKey string trực tiếp
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Bạn là một chuyên gia giáo dục Toán học Việt Nam.
    NHIỆM VỤ: Tạo câu hỏi Toán chuẩn chương trình GDPT 2018.
    ${MATH_FORMAT_INSTRUCTION}
    ${GRAPHING_INSTRUCTION}
    ${ANSWER_DISTRIBUTION_INSTRUCTION}
    ${config.imageMode === ImageMode.Olympic ? OLYMPIC_GEOMETRY_INSTRUCTION : ""}
    ${JSON_SCHEMA_INSTRUCTION}
  `;

  const lessonContext = config.customLesson ? config.customLesson : (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp");
  const prompt = `${systemInstruction}\n\nSoạn ${config.questionCount} câu hỏi Toán Lớp ${config.grade}. Chủ đề: ${lessonContext}. Mức độ: ${config.selectedDifficulties.join(", ")}. Khoảng ${config.imageRatio}% có hình vẽ SVG. TRẢ VỀ JSON.`;

  try {
    // API mới: ai.models.generateContent()
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      }
    });

    const text = result.text || "";
    console.log("Alla Debug - Raw response length:", text.length);
    const parsed = JSON.parse(text);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `q_${Date.now()}_${i}`, number: i + 1, grade: config.grade
    }));
  } catch (error: any) {
    console.error("Alla Debug - Gemini Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Lỗi: API Key này đã HẾT LƯỢT DÙNG (Quota Exceeded). Anh vui lòng đổi Key khác hoặc chờ 1 lúc ạ.");
    }
    throw error;
  }
};

export const generateMillionaireQuestions = async (
  grade: number,
  lessons: string[],
  config: AppState
): Promise<Question[]> => {
  const env = (import.meta as any).env || {};
  const apiKey = (config.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();

  if (!apiKey) throw new Error("API Key cho Game chưa sẵn sàng.");

  const ai = new GoogleGenAI({ apiKey });
  const lessonContext = lessons.length > 0 ? lessons.join(", ") : "Kiến thức tổng hợp";
  const prompt = `Host Triệu Phú Toán Học. Tạo 16 câu hỏi trắc nghiệm Toán lớp ${grade}: ${lessonContext}.
  ${MATH_FORMAT_INSTRUCTION} ${GRAPHING_INSTRUCTION} ${ANSWER_DISTRIBUTION_INSTRUCTION}
  ${JSON_SCHEMA_INSTRUCTION}
  TRẢ VỀ JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      }
    });

    const text = result.text || "";
    const parsed = JSON.parse(text);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `game_${Date.now()}_${i}`, number: i + 1, type: QuestionType.MultipleChoice
    }));
  } catch (error: any) {
    console.error("Alla Debug - Game Gemini Error:", error);
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Lỗi: API Key đã hết lượt. Vui lòng thử Key khác.");
    }
    throw error;
  }
};
