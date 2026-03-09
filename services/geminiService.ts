
// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
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
   - Ví dụ: Nếu bạn vẽ Parabol đi qua điểm (1,1), bạn phải vẽ <circle cx="180" cy="120" ... /> VÀ trong đường path, tọa độ phải đi qua chính xác (180, 120).
   - Tuyệt đối không để đường vẽ lệch khỏi các vòng tròn đánh dấu điểm.

3. KỸ THUẬT VẼ PATH:
   - Đường thẳng: Dùng lệnh "L".
   - Đường cong: Dùng lệnh "C" (Cubic Bezier). Phải tính toán điểm kiểm soát (control points) sao cho đường cong thực sự đi qua các điểm chốt đã đánh dấu bằng circle.
   - Đặt fill="none" và stroke-width="1.5" cho mọi nét vẽ hàm số.

4. NHÃN (LABELS):
   - Đặt nhãn x tại (290, 145), nhãn y tại (155, 15). Nhãn O tại (155, 165).
`;

const ANSWER_DISTRIBUTION_INSTRUCTION = `
QUY TẮC PHÂN BỔ ĐÁP ÁN:
- AI PHẢI nỗ lực phân bổ đáp án đúng ngẫu nhiên giữa A, B, C, D.
- Không được để quá 2 câu liên tiếp có cùng một chữ cái đáp án đúng.
- Ngay cả khi tạo 40 câu, hãy đảm bảo số lượng A, B, C, D xấp xỉ 10 mỗi loại.
`;

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: "Nội dung câu hỏi Toán. Sử dụng LaTeX bọc trong \\( ... \\)." },
          type: { type: Type.STRING, description: "Loại câu hỏi (ABCD, Đúng/Sai, Trả lời ngắn)." },
          difficulty: { type: Type.STRING, description: "Mức độ kiến thức." },
          choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các phương án trả lời. KHÔNG bao gồm nhãn A., B., C., D. ở đầu nội dung." },
          correctAnswer: { type: Type.STRING, description: "Chữ cái nhãn đáp án đúng (A, B, C, hoặc D)." },
          hint: { type: Type.STRING, description: "Gợi ý tư duy cho học sinh." },
          explanation: { type: Type.STRING, description: "Lời giải chi tiết từng bước, chính xác tuyệt đối." },
          hasImage: { type: Type.BOOLEAN },
          imageDescription: { type: Type.STRING, description: "Mã SVG hoàn chỉnh. Tọa độ đường path và tọa độ circle phải trùng nhau tuyệt đối dựa trên hệ số 30px/đơn vị." }
        },
        required: ["content", "choices", "correctAnswer", "difficulty", "hint", "explanation"]
      }
    }
  }
};

export const generateQuestions = async (
  config: AppState,
  previousQuestions: Question[] = [],
  onProgress?: (percent: number) => void
): Promise<Question[]> => {
  const env = (import.meta as any).env || {};
  const sysKey = env.VITE_GEMINI_API_KEY;
  const userKey = config.customApiKey;

  // Ưu tiên customApiKey từ config, sau đó mới đến biến môi trường
  const apiKey = (userKey || sysKey)?.trim();

  console.log(`Alla Debug - [v5.2.4] API Key Check:
    - User/Custom Key: ${userKey ? "Sẵn sàng (Đầu: " + userKey.substring(0, 5) + "...)" : "Trống"}
    - System Key: ${sysKey ? "Sẵn sàng (Đầu: " + sysKey.substring(0, 5) + "...)" : "Trống (Lỗi deploy?)"}
    - Final Key used: ${apiKey ? "Đã chọn" : "KHÔNG CÓ"}
  `);

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
    const errorMsg = `Lỗi AI: Không tìm thấy API Key hợp lệ. 
    [Dành cho anh Thưởng]:
    - Nếu anh đã nhập Key cá nhân: Có thể Key bị lỗi hoặc chưa lưu. Hãy thử xóa đi nhập lại.
    - Nếu dùng Key hệ thống: GitHub chưa cấp Key hoặc Secret bị sai tên.`;
    throw new Error(errorMsg);
  }

  // FIX v5.2.4: SDK @google/genai yêu cầu truyền Object { apiKey: string, dangerouslyAllowBrowser: true }
  const ai = new GoogleGenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemInstruction = `
    Bạn là một chuyên gia giáo dục Toán học Việt Nam.
    NHIỆM VỤ: Tạo câu hỏi Toán chuẩn chương trình GDPT 2018.
    
    YÊU CẦU ĐỘ CHÍNH XÁC HÌNH HỌC:
    - Bạn phải tính toán tọa độ pixel thực tế TRƯỚC khi viết mã SVG.
    - Quy tắc: Mọi điểm tròn <circle> đánh dấu đều PHẢI nằm CHÍNH XÁC trên đường kẻ <path>.
    - Không được có sai số giữa tọa độ cx,cy của điểm và tọa độ x,y của đường path.
    
    ${MATH_FORMAT_INSTRUCTION}
    ${GRAPHING_INSTRUCTION}
    ${ANSWER_DISTRIBUTION_INSTRUCTION}
    ${config.imageMode === ImageMode.Olympic ? OLYMPIC_GEOMETRY_INSTRUCTION : ""}
  `;

  const lessonContext = config.customLesson ? config.customLesson : (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp");
  const prompt = `Soạn ${config.questionCount} câu hỏi Toán Lớp ${config.grade}. Chủ đề: ${lessonContext}. Mức độ: ${config.selectedDifficulties.join(", ")}. Khoảng ${config.imageRatio}% có hình vẽ SVG minh họa cực kỳ chính xác tọa độ.`;

  try {
    const result = await ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.2
      }
    }).generateContent(prompt);

    const text = result.response.text();
    const parsed = JSON.parse(text);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `q_${Date.now()}_${i}`, number: i + 1, grade: config.grade
    }));
  } catch (error: any) {
    console.error("Alla Debug - Gemini Error:", error);
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

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
    throw new Error("API Key cho Game chưa được nạp. Vui lòng kiểm tra Cấu hình.");
  }

  const ai = new GoogleGenAI({ apiKey, dangerouslyAllowBrowser: true });
  const lessonContext = lessons.length > 0 ? lessons.join(", ") : "Kiến thức tổng hợp";
  const systemInstruction = `Host Triệu Phú Toán Học. Tạo 16 câu hỏi trắc nghiệm. ${MATH_FORMAT_INSTRUCTION} ${GRAPHING_INSTRUCTION} ${ANSWER_DISTRIBUTION_INSTRUCTION}`;
  try {
    const response = await ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      generationConfig: { responseMimeType: "application/json", responseSchema: questionSchema, temperature: 0.3 }
    }).generateContent(`Tạo 16 câu hỏi Triệu phú Toán lớp ${grade}: ${lessonContext}. Đảm bảo hình vẽ SVG chuẩn pixel.`);

    const text = response.response.text();
    const parsed = JSON.parse(text);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `game_${Date.now()}_${i}`, number: i + 1, type: QuestionType.MultipleChoice
    }));
  } catch (error: any) {
    console.error("Alla Debug - Game Gemini Error:", error);
    throw error;
  }
};
