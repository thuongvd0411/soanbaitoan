import{c as h}from"./index-BJuGoZaV.js";const s=`
Bạn là chuyên gia chuyển đổi ngôn ngữ tự nhiên thành Query Plan cho hệ thống LMS.
Dựa vào câu hỏi của giáo viên, hãy tạo JSON Query Plan.

SCHEMA FIRESTORE THAM KHẢO:
- students: id, name, classId
- assignments: studentId, score, completed, createdAt
- tuition: studentId, amount, paid, month
- tasks: title, status, dueDate

INTENTS:
- student_progress: hỏi về sức học, lỗi sai, điểm của học sinh.
- assignment_status: hỏi học sinh làm bài chưa, nộp chưa.
- class_summary: hỏi tình hình chung cả lớp.
- tuition_status: hỏi về đóng học phí.
- teacher_salary: hỏi về lương giáo viên.
- schedule_query: hỏi lịch học.
- task_reminder: hỏi danh sách việc cần làm/nhắc việc.

YÊU CẦU:
- students: Trích xuất danh sách tên (ví dụ: ["Bảo", "Đạt"]).
- month: "current" hoặc số tháng.
- Trả về JSON thuần túy.

CÂU HỎI: "{query}"
`,a={async generatePlan(e,c){try{const t=s.replace("{query}",e),n=await h.generateContent(t,c,!0);return console.debug("CHAT_QUERY_PLAN",n),JSON.parse(n)}catch(t){return console.error("chatQueryPlanService error:",t),{intent:"unknown"}}}};export{a as chatQueryPlanService};
