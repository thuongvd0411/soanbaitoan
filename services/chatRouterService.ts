
import { firebaseService } from "./firebaseService";
import { QueryPlan } from "./chatQueryPlanService";
import { nameResolver } from "./nameResolver";

export const chatRouterService = {
    async routeAndSummary(plan: QueryPlan, ownerId: string): Promise<string> {
        try {
            switch (plan.intent) {
                case "student_progress":
                case "assignment_status":
                    return await this.handleStudentData(plan, ownerId);
                case "class_summary":
                    return await this.handleClassSummary(plan.className);
                case "tuition_status":
                    return await this.handleTuitionStatus(ownerId, plan.filter);
                case "schedule_query":
                    return await this.handleScheduleQuery(plan.className);
                default:
                    return "";
            }
        } catch (error) {
            console.error("chatRouterService error:", error);
            return "Lỗi truy vấn dữ liệu.";
        }
    },

    async handleStudentData(plan: QueryPlan, ownerId: string): Promise<string> {
        if (!plan.students || plan.students.length === 0) return "Em không rõ anh hỏi về học sinh nào ạ.";
        
        const allStudents = await firebaseService.getManagementStudents();
        const results: Record<string, any> = {};

        for (const name of plan.students) {
            const normalized = nameResolver.normalizeName(name);
            const student = allStudents.find((s: any) => 
                nameResolver.normalizeName(s.fullName).includes(normalized)
            );

            if (!student) {
                // Thử tìm kiếm mờ hơn: nếu tên hỏi là một từ trong tên đầy đủ
                results[name] = "Không tìm thấy thông tin. Anh kiểm tra giúp em xem tên học sinh có đúng không ạ?";
                continue;
            }

            if (plan.intent === "assignment_status") {
                // Lấy bài tập gần nhất được giao
                const lastExam = student.assignedExams && student.assignedExams.length > 0 
                    ? student.assignedExams[0] 
                    : null;
                
                if (!lastExam) {
                    results[student.fullName] = "Chưa được giao bài nào.";
                    continue;
                }

                // Kiểm tra xem đã làm chưa và điểm số
                // Dữ liệu điểm lấy từ history (StudyRecord - dữ liệu cũ) hoặc examHistory (dữ liệu mới v5.4.4)
                const historyRecord = student.history?.find((h: any) => 
                    h.absentReason?.includes(lastExam.title) || h.absentReason?.includes(lastExam.id)
                );

                const examRecord = student.examHistory?.find((e: any) => 
                    e.id === lastExam.id || e.title === lastExam.title
                );

                const isDone = !!historyRecord || !!examRecord;
                const score = examRecord ? examRecord.score : (historyRecord?.testScore ?? "Chưa có điểm");

                results[student.fullName] = {
                    baiTap: lastExam.title,
                    trangThai: isDone ? "Đã làm" : "Chưa làm",
                    diem: score
                };
            } else {
                // student_progress
                const recentHistory = student.history?.slice(0, 5) || [];
                // Sửa lỗi logic điểm: lấy testScore trực tiếp
                results[student.fullName] = {
                    lop: student.className,
                    diemGanNhat: recentHistory[0]?.testScore ?? "N/A",
                    nhanXet: recentHistory[0]?.absentReason ?? "Không có dữ liệu gần đây"
                };
            }
        }

        return JSON.stringify(results);
    },

    async handleClassSummary(className: string | undefined): Promise<string> {
        if (!className) return "Anh muốn hỏi lớp nào ạ?";
        const students = await firebaseService.getManagementStudents();
        const classStudents = students.filter((s: any) => 
            s.className.toLowerCase().includes(className.toLowerCase())
        );
        if (classStudents.length === 0) return `Không thấy thông tin lớp ${className}.`;

        return JSON.stringify({
            lop: className,
            siSo: classStudents.length,
            hocSinh: classStudents.map(s => s.fullName).slice(0, 5)
        });
    },

    async handleTuitionStatus(ownerId: string, filter?: string): Promise<string> {
        const students = await firebaseService.getManagementStudents();
        // Giả sử tuitionStatus được lưu trong student object hoặc query riêng
        // Tạm thời trả về tóm tắt cơ bản
        const unpaid = students.filter(s => s.tuitionStatus === 'unpaid');
        return JSON.stringify({
            chuaDong: unpaid.length,
            danhSachChuaDong: unpaid.map(s => s.fullName).slice(0, 5)
        });
    },

    async handleScheduleQuery(className?: string): Promise<string> {
        const students = await firebaseService.getManagementStudents();
        const student = className 
            ? students.find(s => s.className.toLowerCase().includes(className.toLowerCase()))
            : students[0];
        
        if (!student || !student.schedules) return "Không tìm thấy lịch học.";
        return JSON.stringify({
            lop: student.className,
            lich: student.schedules
        });
    }
};
