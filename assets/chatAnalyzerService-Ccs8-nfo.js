import{chatAIService as i}from"./chatAIService-BsiPejI9.js";import"./index-Bqc08exA.js";const a=`
BẠN LÀ: Chuyên gia phân tích ý định cho hệ thống LMS Soạn Toán AI.
NHIỆM VỤ: Phân tích yêu cầu của anh Thưởng và trả về JSON cấu trúc định dạng bên dưới.

PHÂN LOẠI:
1. system_query: Hỏi về dữ liệu (học sinh, lớp, điểm, lương, lịch học, lỗi sai kiến thức, tiến độ...).
2. ai_task: Yêu cầu tạo nội dung mới (soạn đề, giải toán, viết đoạn văn...).
3. general_chat: Chào hỏi, tán gẫu, hỏi kiến thức chung không liên quan dữ liệu hệ thống.

YÊU CẦU JSON (KHÔNG MÃ MARKDOWN):
{
  "type": "system_query" | "ai_task" | "general_chat",
  "plan": {
    "intent": "student_progress" | "assignment_status" | "pending_assignments" | "class_summary" | "tuition_status" | "teacher_salary" | "schedule_query" | "self_info",
    "students": ["Tên học sinh"],
    "month": "current" | "last" | null
  },
  "content": "Yêu cầu gốc hoặc prompt bổ sung"
}

LƯU Ý RIÊNG:
- Nếu hỏi "Bảo sai kiến thức gì", "Làm bài chưa": type là "system_query", intent là "student_progress".
- Nếu hỏi "ai chưa làm bài", "còn bạn nào chưa nộp bài", "ai chưa hoàn thành", "bạn nào chưa làm xong": type là "system_query", intent là "pending_assignments".
- Nếu xưng hô: Gọi học sinh là "Bảo", "em Bảo", "bạn Bảo".

CÂU HỎI: "{query}"
`,u={async analyze(t,h){try{const n=a.replace("{query}",t),e=await i.generateContent(n,h,!0,!0);let s=e.trim();const c=e.match(/\{[\s\S]*\}/);return c&&(s=c[0]),JSON.parse(s)}catch(n){return console.error("chatAnalyzerService error:",n),{type:"general_chat",content:t}}}};export{u as chatAnalyzerService};
