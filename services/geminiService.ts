
// services/geminiService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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

const questionSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          content: { type: SchemaType.STRING, description: "Nội dung câu hỏi Toán. Sử dụng LaTeX bọc trong \\( ... \\)." },
          type: { type: SchemaType.STRING, description: "Loại câu hỏi (ABCD, Đúng/Sai, Trả lời ngắn)." },
          difficulty: { type: SchemaType.STRING, description: "Mức độ kiến thức." },
          choices: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Các phương án trả lời. KHÔNG bao gồm nhãn A., B., C., D. ở đầu nội dung." },
          correctAnswer: { type: SchemaType.STRING, description: "Chữ cái nhãn đáp án đúng (A, B, C, hoặc D)." },
          hint: { type: SchemaType.STRING, description: "Gợi ý tư duy cho học sinh." },
          explanation: { type: SchemaType.STRING, description: "Lời giải chi tiết từng bước, chính xác tuyệt đối." },
          hasImage: { type: SchemaType.BOOLEAN },
          imageDescription: { type: SchemaType.STRING, description: "Mã SVG hoàn chỉnh. Tọa độ đường path và tọa độ circle phải trùng nhau tuyệt đối dựa trên hệ số 30px/đơn vị." }
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

  const apiKey = (userKey || sysKey)?.trim();

  // Diagnostic Logs cho v5.2.6
  console.log(`Alla Debug - [v5.2.6] (Gemini 2.0 Upgrade) API Key Check:
    - User/Custom Key: ${userKey ? "OK (" + userKey.substring(0, 5) + "...)" : "None"}
    - System Key: ${sysKey ? "OK (" + sysKey.substring(0, 5) + "...)" : "None"}
    - Active Key: ${apiKey ? "Selected" : "FAIL"}
  `);

  if (!apiKey) {
    throw new Error("Lỗi: Không tìm thấy API Key. Anh vui lòng nhập Key cá nhân ở Sidebar.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `
      Bạn là một chuyên gia giáo dục Toán học Việt Nam.
      NHIỆM VỤ: Tạo câu hỏi Toán chuẩn chương trình GDPT 2018.
      
      YÊU CẦU ĐỘ CHÍNH XÁC HÌNH HỌC:
      - Bạn phải tính toán tọa độ pixel thực tế TRƯỚC khi viết mã SVG.
      - Quy tắc: Mọi điểm tròn <circle> đánh dấu đều PHẢI nằm CHÍNH XÁC trên đường kẻ <path>.
      
      ${MATH_FORMAT_INSTRUCTION}
      ${GRAPHING_INSTRUCTION}
      ${ANSWER_DISTRIBUTION_INSTRUCTION}
      ${config.imageMode === ImageMode.Olympic ? OLYMPIC_GEOMETRY_INSTRUCTION : ""}
    `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: questionSchema,
      temperature: 0.2
    }
  });

  const lessonContext = config.customLesson ? config.customLesson : (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp");
  const prompt = `Soạn ${config.questionCount} câu hỏi Toán Lớp ${config.grade}. Chủ đề: ${lessonContext}. Mức độ: ${config.selectedDifficulties.join(", ")}. Khoảng ${config.imageRatio}% có hình vẽ SVG minh họa cực kỳ chính xác tọa độ.`;

  try {
    const result = await model.generateContent(prompt);
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

  if (!apiKey) throw new Error("API Key cho Game chưa sẵn sàng.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `Host Triệu Phú Toán Học. Tạo 16 câu hỏi trắc nghiệm. ${MATH_FORMAT_INSTRUCTION} ${GRAPHING_INSTRUCTION} ${ANSWER_DISTRIBUTION_INSTRUCTION}`,
    generationConfig: { responseMimeType: "application/json", responseSchema: questionSchema, temperature: 0.3 }
  });

  const lessonContext = lessons.length > 0 ? lessons.join(", ") : "Kiến thức tổng hợp";
  try {
    const result = await model.generateContent(`Tạo 16 câu hỏi Triệu phú Toán lớp ${grade}: ${lessonContext}. Đảm bảo hình vẽ SVG chuẩn pixel.`);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `game_${Date.now()}_${i}`, number: i + 1, type: QuestionType.MultipleChoice
    }));
  } catch (error: any) {
    console.error("Alla Debug - Game Gemini Error:", error);
    throw error;
  }
};
