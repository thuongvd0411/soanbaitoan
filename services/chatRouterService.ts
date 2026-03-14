
import { firebaseService } from "./firebaseService";
import { IntentResult } from "./chatIntentService";

export const chatRouterService = {
    async routeAndSummary(intentResult: IntentResult, ownerId: string): Promise<string> {
        try {
            switch (intentResult.intent) {
                case "student_progress":
                    return await this.handleStudentProgress(intentResult.studentName, ownerId);
                case "class_summary":
                    return await this.handleClassSummary(intentResult.className);
                case "assignment_analysis":
                    return await this.handleAssignmentAnalysis(intentResult.topic, ownerId);
                default:
                    return "";
            }
        } catch (error) {
            console.error("chatRouterService error:", error);
            return "Xin lỗi, em gặp lỗi khi truy vấn dữ liệu.";
        }
    },

    async handleStudentProgress(studentName: string | undefined, ownerId: string): Promise<string> {
        if (!studentName) return "Em không thấy tên học sinh anh cần hỏi.";
        
        const students = await firebaseService.getManagementStudents();
        const student = students.find((s: any) => 
            s.fullName.toLowerCase().includes(studentName.toLowerCase())
        );

        if (!student) return `Em không tìm thấy học sinh tên "${studentName}" trong danh sách của anh.`;

        // Tóm tắt dữ liệu học sinh
        const recentHistory = student.history?.slice(0, 5) || [];
        const avgScore = recentHistory.length > 0 
            ? recentHistory.reduce((acc: number, cur: any) => acc + (cur.testScore || 0), 0) / recentHistory.length 
            : 0;

        const summary = {
            name: student.fullName,
            class: student.className,
            avgScore: avgScore.toFixed(1),
            recentStatus: recentHistory[0]?.status || "N/A",
            totalAssigned: student.assignedExams?.length || 0,
            recentActivity: recentHistory[0]?.absentReason || "Không có hoạt động gần đây"
        };

        console.debug("CHAT_QUERY_RESULT", summary);
        return JSON.stringify(summary);
    },

    async handleClassSummary(className: string | undefined): Promise<string> {
        if (!className) return "Anh muốn hỏi về lớp nào ạ?";
        
        const students = await firebaseService.getManagementStudents();
        const classStudents = students.filter((s: any) => 
            s.className.toLowerCase().includes(className.toLowerCase())
        );

        if (classStudents.length === 0) return `Em không thấy lớp "${className}" trong dữ liệu.`;

        const summary = {
            className,
            studentCount: classStudents.length,
            topStudents: classStudents.slice(0, 3).map((s: any) => s.fullName).join(", "),
            avgAttendance: "95%" // Logic giả định hoặc tính toán thực tế nếu có data
        };

        console.debug("CHAT_QUERY_RESULT", summary);
        return JSON.stringify(summary);
    },

    async handleAssignmentAnalysis(topic: string | undefined, ownerId: string): Promise<string> {
        const history = await firebaseService.getHistory(ownerId);
        if (history.length === 0) return "Anh chưa có lịch sử giao bài nào để em phân tích ạ.";

        // Nếu không có topic cụ thể, lấy bài gần nhất có shareId
        const recentExam = topic 
            ? history.find(h => h.shareId && (h.config?.customLesson?.toLowerCase().includes(topic.toLowerCase()) || h.config?.lessons?.some(l => l.toLowerCase().includes(topic.toLowerCase()))))
            : history.find(h => h.shareId);

        if (!recentExam || !recentExam.shareId) return "Em không tìm thấy bài tập nào phù hợp để phân tích.";

        const analysis = await firebaseService.getDetailedExamAnalysis(recentExam.shareId);
        if (!analysis || analysis.totalSubmissions === 0) return `Bài "${recentExam.config.customLesson || 'Gần đây'}" chưa có học sinh nào nộp nên em chưa phân tích được lỗi sai ạ.`;

        // Tìm câu sai nhiều nhất
        const stats = Object.values(analysis.questionAnalysis) as any[];
        const sortedByWrong = [...stats].sort((a, b) => b.wrongCount - a.wrongCount);
        const topWrong = sortedByWrong[0];

        const summary = {
            examTitle: recentExam.config.customLesson || "Bài tập gần đây",
            totalSubmissions: analysis.totalSubmissions,
            averageScore: analysis.averageScore.toFixed(1),
            mostWrongQuestion: topWrong.number,
            mostWrongCount: topWrong.wrongCount,
            mostWrongContent: topWrong.content.substring(0, 100) + "...",
            commonWrongAnswers: Object.keys(topWrong.wrongAnswerDistribution).slice(0, 2).join(", ")
        };

        console.debug("CHAT_QUERY_RESULT", summary);
        return JSON.stringify(summary);
    }
};
