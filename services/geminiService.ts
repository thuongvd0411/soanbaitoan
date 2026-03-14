
// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { AppState, Question, QuestionType, Difficulty, AnswerMode, ExamType, ImageMode } from "../types";
import { getChapterOfLesson, getExamScope } from "./syllabusData";
import { OLYMPIC_GEOMETRY_INSTRUCTION } from "./olympicGeometryMode";

const MATH_FORMAT_INSTRUCTION = 'BẮT BUỘC: Mọi công thức, biểu thức, biến số (như x, y, a, b...), hoặc ký hiệu toán học PHẢI được bọc trong cặp dấu \\( và \\). Ví dụ: \\( y = ax^2 + b \\). TUYỆT ĐỐI KHÔNG để công thức ở dạng văn bản thuần túy.';

const GRAPHING_INSTRUCTION = `
QUY TẮC VẼ ĐỒ THỊ & HÌNH HỌC SVG CHÍNH XÁC CAO:
1. HỆ TỌA ĐỘ: ViewBox "0 0 300 300". Tâm O: (150, 150). Tỉ lệ: 30px/đơn vị.
2. ANCHOR POINTS: circle cx,cy PHẢI trùng khớp path.
3. PATH: Dùng "L" cho thẳng, "C" cho cong. fill="none", stroke-width="1.5".
4. NHÃN: x tại (290,145), y tại (155,15), O tại (155,165).
`;

const ANSWER_DISTRIBUTION_INSTRUCTION = `Phân bổ đáp án đều giữa A, B, C, D. Không quá 2 câu liên tiếp cùng đáp án.`;

const JSON_SCHEMA_INSTRUCTION = `
BẮT BUỘC trả về JSON hợp lệ. KHÔNG dùng ký tự đặc biệt ngoài JSON chuẩn.
Với công thức LaTeX, dùng \\\\( và \\\\) thay vì \\( và \\).
Cấu trúc:
{"questions":[{"content":"text","type":"Trắc nghiệm ABCD hoặc Trắc nghiệm Đúng/Sai hoặc Trả lời ngắn","difficulty":"Nhận biết","choices":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","hint":"text","explanation":"text","hasImage":false,"imageDescription":""}]}

CÁC DẠNG CÂU HỎI:
- type="Trắc nghiệm ABCD": Trắc nghiệm chọn 1 đáp án đúng từ A,B,C,D. choices có 4 phần tử. correctAnswer là "A", "B", "C" hoặc "D".
- type="Trắc nghiệm Đúng/Sai": Trắc nghiệm đúng/sai 4 ý. Content chứa câu hỏi chính. choices=["a) ...","b) ...","c) ...","d) ..."]. correctAnswer = "a)Đ, b)S, c)Đ, d)S" (BẮT BUỘC liệt kê đủ 4 ý Đ/S kèm ký hiệu a,b,c,d. TUYỆT ĐỐI KHÔNG trả về một chữ cái duy nhất như A, B, C, D cho dạng này).
- type="Trả lời ngắn": Trả lời ngắn (điền số hoặc biểu thức). choices=[] (mảng rỗng). correctAnswer là đáp án cần điền.
`;

// Hàm làm sạch JSON trước khi parse
function sanitizeJSON(text: string): string {
  // Loại bỏ markdown code block nếu có
  let clean = text.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  // Fix các ký tự escape phổ biến gây lỗi JSON
  // Thay \( và \) thành \\( và \\) cho LaTeX
  clean = clean.replace(/(?<!\\)\\([^"\\\/bfnrtu{])/g, '\\\\$1');

  return clean;
}

// Hàm retry thông minh với fallback model
async function retryWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  config: { temperature: number },
  maxRetries: number = 3
): Promise<string> {
  // Cập nhật mảng model AI đầy đủ nhất, ưu tiên Gemini 3.1 nhưng fallback dần để tránh 404
  const models = ['gemini-3.1-flash', 'gemini-3.0-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
  let lastError = "";

  for (const modelName of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Alla - Try ${attempt}/${maxRetries}, model: ${modelName}`);
        const result = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: config.temperature,
            responseMimeType: "application/json",
          }
        });
        const text = result.text || "";
        if (text.length > 10) {
          return text;
        }
      } catch (error: any) {
        const msg = error.message || "";
        lastError = msg;
        console.warn(`Alla - Failed (${modelName}, attempt ${attempt}):`, msg.substring(0, 150));

        // 404 = model not found → chuyển model ngay
        if (msg.includes("404") || msg.includes("not found")) {
          break;
        }

        // 429 hoặc 503 = tạm thời quá tải → chờ lâu hơn rồi thử lại
        if (msg.includes("429") || msg.includes("503") || msg.includes("overloaded") ||
          msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("high demand")) {
          if (attempt < maxRetries) {
            const waitMs = attempt * 3000; // Đợi lâu hơn (3s, 6s, 9s)
            console.log(`Alla - Server busy, waiting ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
          // Hết retry cho model này → thử model tiếp theo
          break;
        }

        // Lỗi khác
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
    }
  }

  // Tất cả model đều thất bại
  if (lastError.includes("429") || lastError.includes("quota") || lastError.includes("RESOURCE_EXHAUSTED")) {
    throw new Error("Hệ thống AI của Google đang quá tải. Anh vui lòng đợi 1-2 phút rồi thử lại, hoặc thử dùng một API Key khác nhé.");
  }
  throw new Error("Không kết nối được AI. Anh kiểm tra mạng hoặc thử lại sau.");
}

export const generateQuestions = async (
  config: AppState,
  previousQuestions: Question[] = [],
  seed: number = 0
): Promise<Question[]> => {
  const env = (import.meta as any).env || {};
  const sysKey = env.VITE_GEMINI_API_KEY;
  const userKey = config.customApiKey;
  const apiKey = (userKey || sysKey)?.trim();

  if (!apiKey) {
    throw new Error("Lỗi: Không tìm thấy API Key. Anh vui lòng nhập Key ở Sidebar.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const lessonContext = config.customLesson ? config.customLesson : (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp");

  // Tạo thêm hướng dẫn biến đổi dựa trên seed để tránh trùng lặp khi chạy song song
  const entropyInstruction = seed > 0 ? `Lưu ý: Bạn hãy ưu tiên các khía cạnh khác nhau của chủ đề (Biến thể số ${seed}) để bộ câu hỏi không trùng với các bộ khác.` : "";

  // Xây dựng hướng dẫn dạng câu hỏi
  const selectedTypes = config.questionTypes || [QuestionType.MultipleChoice];
  const typeInstructions: string[] = [];
  if (selectedTypes.includes(QuestionType.MultipleChoice)) typeInstructions.push(`Trắc nghiệm ABCD (type="${QuestionType.MultipleChoice}"): 4 lựa chọn A,B,C,D, chọn 1 đáp án đúng`);
  if (selectedTypes.includes(QuestionType.TrueFalse)) typeInstructions.push(`Trắc nghiệm Đúng/Sai (type="${QuestionType.TrueFalse}"): Cho 4 phát biểu (a)(b)(c)(d), mỗi ý đúng hoặc sai`);
  if (selectedTypes.includes(QuestionType.ShortAnswer)) typeInstructions.push(`Trả lời ngắn (type="${QuestionType.ShortAnswer}"): Điền đáp số, không có choices`);

  const typeContext = typeInstructions.length > 0
    ? `Dạng câu hỏi cần tạo: ${typeInstructions.join('; ')}. ${selectedTypes.length > 1 ? 'Chia đều các câu hỏi cho các dạng được yêu cầu.' : ''}`
    : '';

  const prompt = `Bạn là chuyên gia Toán học Việt Nam. Soạn ${config.questionCount} câu hỏi Toán Lớp ${config.grade}.
Chủ đề: ${lessonContext}. Mức độ: ${config.selectedDifficulties.join(", ")}.
${typeContext}
${config.imageRatio > 0 ? `Khoảng ${config.imageRatio}% câu có hình SVG.` : ""}
${entropyInstruction}
${MATH_FORMAT_INSTRUCTION}
${config.imageRatio > 0 ? GRAPHING_INSTRUCTION : ""}
${ANSWER_DISTRIBUTION_INSTRUCTION}
${config.imageMode === ImageMode.Olympic ? OLYMPIC_GEOMETRY_INSTRUCTION : ""}
${JSON_SCHEMA_INSTRUCTION}`;

  try {
    const text = await retryWithFallback(ai, prompt, { temperature: 0.2 });
    const cleanText = sanitizeJSON(text);
    console.log("Alla Debug - Cleaned JSON length:", cleanText.length);

    const parsed = JSON.parse(cleanText);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `q_${Date.now()}_${i}`, number: i + 1, grade: config.grade
    }));
  } catch (error: any) {
    console.error("Alla Debug - Final Error:", error);
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
  if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

  const ai = new GoogleGenAI({ apiKey });
  const lessonContext = lessons.length > 0 ? lessons.join(", ") : "Kiến thức tổng hợp";

  const prompt = `Host Triệu Phú Toán Học. Tạo 16 câu hỏi trắc nghiệm Toán lớp ${grade}: ${lessonContext}.
${MATH_FORMAT_INSTRUCTION} ${ANSWER_DISTRIBUTION_INSTRUCTION}
${JSON_SCHEMA_INSTRUCTION}`;

  try {
    const text = await retryWithFallback(ai, prompt, { temperature: 0.3 });
    const cleanText = sanitizeJSON(text);
    const parsed = JSON.parse(cleanText);
    return parsed.questions.map((q: any, i: number) => ({
      ...q, id: `game_${Date.now()}_${i}`, number: i + 1, type: QuestionType.MultipleChoice
    }));
  } catch (error: any) {
    console.error("Alla Debug - Game Error:", error);
    throw error;
  }
};

/**
 * Chuyển đổi giọng nói thành cấu hình ứng dụng
 */
export const parseVoiceCommand = async (
  voiceText: string,
  currentConfig: AppState
): Promise<Partial<AppState>> => {
  const env = (import.meta as any).env || {};
  const apiKey = (currentConfig.customApiKey || env.VITE_GEMINI_API_KEY)?.trim();
  if (!apiKey) throw new Error("API Key chưa sẵn sàng.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Bạn là trợ lý AI cho ứng dụng Soạn Toán. 
Nhiệm vụ: Phân tích câu lệnh giọng nói của người dùng và chuyển đổi thành cấu hình JSON.

CÂU LỆNH GIỌNG NÓI: "${voiceText}"

Cấu hình hiện tại để tham khảo:
${JSON.stringify({
    grade: currentConfig.grade,
    questionCount: currentConfig.questionCount,
    questionTypes: currentConfig.questionTypes,
    lessons: currentConfig.lessons,
    customLesson: currentConfig.customLesson
  })}

Yêu cầu trích xuất các trường sau (chỉ trả về các trường có sự thay đổi hoặc được nhắc đến):
- grade (số): Lớp (1-12)
- questionCount (số): Số lượng câu hỏi
- selectedDifficulties (mảng string): Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao
- questionTypes (mảng string): Trắc nghiệm ABCD, Trắc nghiệm Đúng/Sai, Trả lời ngắn
- customLesson (string): Chủ đề bài học hoặc yêu cầu riêng

BẮT BUỘC trả về JSON thuần túy, không giải thích gì thêm.
Ví dụ: {"grade": 10, "questionCount": 5, "customLesson": "Phương trình bậc hai"}
`;

  try {
    const text = await retryWithFallback(ai, prompt, { temperature: 0.1 });
    const cleanText = sanitizeJSON(text);
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Alla Debug - Voice Parse Error:", error);
    return {};
  }
};
