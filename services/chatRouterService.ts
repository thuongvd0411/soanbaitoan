
import { firebaseService } from "./firebaseService";
import { QueryPlan } from "./chatQueryPlanService";
import { nameResolver } from "./nameResolver";

const safeParseDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    try {
        // Hỗ trợ cả / và - làm dấu phân cách
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        if (parts.length !== 3) return null;

        let day, month, year;

        if (dateStr.includes('/')) {
            // Định dạng VN: DD/MM/YYYY
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        } else {
            // Định dạng ISO: YYYY-MM-DD
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        }

        // Kiểm tra tính hợp lệ của số
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
        
        // Tạo Date theo (year, monthIndex, day)
        const d = new Date(year, month - 1, day);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) {
        return null;
    }
};

export const chatRouterService = {
    async routeAndSummary(plan: QueryPlan, ownerId: string): Promise<string> {
        try {
            switch (plan.intent) {
                case "student_progress":
                case "assignment_status":
                    console.log("Alla Routing:", plan.intent, plan.students);
                    return await this.handleStudentData(plan, ownerId);
                case "pending_assignments":
                    return await this.handlePendingAssignments(ownerId);
                case "class_summary":
                    return await this.handleClassSummary(plan.className);
                case "tuition_status":
                    return await this.handleTuitionStatus(ownerId, plan.filter);
                case "schedule_query":
                    return await this.handleScheduleQuery(plan.className);
                case "teacher_salary":
                    return await this.handleTeacherSalary(ownerId);
                case "self_info":
                    return await this.handleSelfInfo();
                default:
                    return "";
            }
        } catch (error) {
            console.error("chatRouterService error:", error);
            return "Lỗi truy vấn dữ liệu.";
        }
    },

    async handleStudentData(plan: QueryPlan, ownerId: string): Promise<string> {
        // Gemini đôi khi trả về cấu trúc nested: {entities: {students: [...]}}
        // hoặc flat: {students: [...]}. Phải xử lý cả 2 trường hợp.
        const planAny = plan as any;
        const entities = planAny.entities || {};
        
        const studentList: string[] = (
            plan.students 
            || entities.students
            || planAny.student 
            || entities.student
            || planAny.names 
            || planAny.name 
            || []
        );
        
        // Lấy month từ plan hoặc từ entities
        const month = plan.month || entities.month;
        
        console.log("Alla handleStudentData — studentList:", studentList, "month:", month, "plan:", JSON.stringify(plan));

        if (!studentList || studentList.length === 0) {
            return JSON.stringify({ error: "Không xác định được tên học sinh trong câu hỏi." });
        }
        
        const allStudents = await firebaseService.getManagementStudents();
        const globalResults = await firebaseService.getGlobalResults(ownerId);
        
        console.log("Alla DB:", { allStudents: allStudents.length, globalResults: globalResults.length });
        
        const results: Record<string, any> = {};

        for (const name of studentList) {
            const normalizedTarget = nameResolver.normalizeName(name);
            console.log("Alla matching:", name, "→ normalized:", normalizedTarget);
            
            // Tìm trong quản lý học tập
            let student = allStudents.find((s: any) => {
                const normalizedStudent = nameResolver.normalizeName(s.fullName || "");
                const parts = normalizedStudent.split(" ");
                const lastName = parts[parts.length - 1];
                return lastName === normalizedTarget || normalizedStudent.includes(normalizedTarget);
            });

            // Tìm trong kho kết quả chung (Global Results) - Dùng cho các bài làm tự do
            const matchedGlobalResults = globalResults.filter((r: any) => {
                const normalizedResultName = nameResolver.normalizeName(r.studentName || "");
                const parts = normalizedResultName.split(" ");
                const lastName = parts[parts.length - 1];
                
                // Lọc theo tháng nếu AI yêu cầu
                if (month) {
                    const d = safeParseDate(r.submittedAt);
                    if (d) {
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        
                        if (month === "current") {
                            if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
                        } else if (month === "last") {
                            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                            const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
                            if (d.getMonth() !== lastMonth || d.getFullYear() !== yearOfLastMonth) return false;
                        }
                    }
                }

                return lastName === normalizedTarget || normalizedResultName.includes(normalizedTarget);
            });

            if (!student && matchedGlobalResults.length === 0) {
                // Gợi ý tên gần giống nếu không tìm thấy ở cả 2 nguồn
                const suggestions = allStudents
                    .map((s: any) => s.fullName)
                    .filter(n => nameResolver.normalizeName(n).includes(normalizedTarget))
                    .slice(0, 3);

                results[name] = {
                    error: "Không tìm thấy học sinh.",
                    suggestions: suggestions.length > 0 ? suggestions : "Không có gợi ý."
                };
                continue;
            }

            const fullName = student ? student.fullName : (matchedGlobalResults[0]?.studentName || name);

            if (plan.intent === "assignment_status") {
                // Danh sách bài tập đã giao cho học sinh này
                const assignedExams = student?.assignedExams || [];
                
                if (assignedExams.length === 0 && matchedGlobalResults.length === 0) {
                    results[fullName] = {
                        trangThai: "Chưa được giao bài tập nào",
                        diem: "N/A"
                    };
                } else if (assignedExams.length > 0) {
                    // Kiểm tra TỪNG bài đã giao theo shareId
                    const baiTapList: any[] = [];
                    for (const exam of assignedExams) {
                        const shareIdOfExam = exam.id;
                        
                        // Tìm kết quả trong examHistory theo shareId
                        const examRecord = student?.examHistory?.find((e: any) => e.id === shareIdOfExam);
                        
                        // Tìm kết quả trong global_results theo shareId
                        const globalRecord = globalResults.find((r: any) => 
                            r.shareId === shareIdOfExam && 
                            nameResolver.normalizeName(r.studentName || "").includes(normalizedTarget)
                        );
                        
                        const isDone = exam.status === 'completed' || !!examRecord || !!globalRecord;
                        const score = examRecord?.score ?? globalRecord?.score ?? "Chưa có điểm";
                        
                        baiTapList.push({
                            tenBai: exam.title || "Bài tập",
                            ngayGiao: exam.assignedAt?.split("T")[0] || "N/A",
                            trangThai: isDone ? "Đã làm" : "Chưa làm",
                            diem: isDone ? score : "Chưa làm"
                        });
                    }
                    
                    results[fullName] = { danhSachBaiTap: baiTapList };
                } else {
                    // Không có assignedExams nhưng có global_results → bài làm tự do
                    const latestResult = matchedGlobalResults[0];
                    results[fullName] = {
                        baiTap: "Bài tập tự do (không giao chính thức)",
                        trangThai: "Đã làm",
                        diem: latestResult.score,
                        ngayNop: latestResult.submittedAt?.split("T")[0] || "N/A"
                    };
                }
            } else {
                // student_progress (hỏi về tiến độ, số buổi, điểm)
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Lọc history học tập (chỉ có ở Management Student)
                const relevantHistory = student?.history?.filter((h: any) => {
                    const d = safeParseDate(h.date);
                    if (!d) return false;
                    
                    if (month === "current") {
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    } else if (month === "last") {
                        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                        const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
                        return d.getMonth() === lastMonth && d.getFullYear() === yearOfLastMonth;
                    }
                    return true;
                }) || [];

                let wrongQuestionsAnalysis = "Không có dữ liệu bài làm chi tiết gần đây.";
                if (matchedGlobalResults.length > 0) {
                    const latestResult = matchedGlobalResults[0];
                    if (latestResult.shareId && latestResult.answers) {
                        try {
                            const examData = await firebaseService.getSharedExam(latestResult.shareId);
                            if (examData && examData.questions) {
                                const wrongList: any[] = [];
                                examData.questions.forEach((q: any) => {
                                    const studentAns = latestResult.answers[q.id];
                                    const correctAns = q.correctAnswer;
                                    const getChoiceText = (letter: string) => {
                                        if (!letter || letter === 'Bỏ trống' || !q.choices) return letter || 'Bỏ trống';
                                        const idx = letter.charCodeAt(0) - 65;
                                        if (idx >= 0 && idx < q.choices.length) {
                                            // Lấy nội dung nhưng bỏ bớt thẻ HTML phức tạp
                                            return `${letter}. ${q.choices[idx].replace(/<[^>]*>?/gm, '').trim()}`;
                                        }
                                        return letter;
                                    };

                                    if (studentAns !== correctAns) {
                                        wrongList.push({
                                            cauHoi: q.content.replace(/<[^>]*>?/gm, '').trim(),
                                            hocSinhChon: getChoiceText(studentAns),
                                            dapAnDung: getChoiceText(correctAns)
                                        });
                                    }
                                });
                                if (wrongList.length > 0) {
                                    wrongQuestionsAnalysis = `Sai ${wrongList.length} câu. Chi tiết: ` + JSON.stringify(wrongList.slice(0, 5)); // Lấy max 5 câu sai để tránh prompt quá dài
                                } else {
                                    wrongQuestionsAnalysis = "Tuyệt vời, học sinh làm đúng 100% bài gần nhất!";
                                }
                            }
                        } catch (e) {
                            console.error("Lỗi khi phân tích bài sai:", e);
                        }
                    }
                }

                results[fullName] = {
                    lop: student?.className || matchedGlobalResults[0]?.studentClass || "Tự do",
                    soBuoiHoc: relevantHistory.length,
                    thang: month === "current" ? (currentMonth + 1) : "tất cả",
                    diemGanNhat: matchedGlobalResults.length > 0 ? matchedGlobalResults[0].score : (student?.history?.[0]?.testScore ?? "N/A"),
                    ngayNopBaiGanNhat: matchedGlobalResults.length > 0 ? (matchedGlobalResults[0].submittedAt?.split("T")[0] || "N/A") : (student?.history?.[0]?.date || "N/A"),
                    nhanXetGanNhat: student?.history?.[0]?.absentReason ?? (matchedGlobalResults.length > 0 ? "Vừa hoàn thành bài tập trực tuyến" : "Chưa có nhận xét"),
                    phanTichBaiSaiGanNhat: wrongQuestionsAnalysis
                };
            }
        }

        console.log("Alla Metadata:", { allStudents: allStudents.length, globalResults: globalResults.length });
        console.log("Alla Results Map:", results);

        return JSON.stringify({
            results,
            sys_info: {
                totalStudents: allStudents.length,
                totalGlobalResults: globalResults.length,
                matchedCount: Object.keys(results).filter(k => !results[k].error).length
            }
        });
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
    },

    async handleTeacherSalary(ownerId: string): Promise<string> {
        const students = await firebaseService.getManagementStudents();
        const { calculateMonthlyStats } = await import("../utils/helpers");
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalSalary = 0;
        let totalSessions = 0;

        students.forEach(s => {
            const stats = calculateMonthlyStats(s.history, s.schedules, currentMonth, currentYear, s.baseSalary);
            totalSalary += stats.totalSalary;
            totalSessions += (stats.attendedCount + stats.makeupCount);
        });

        return JSON.stringify({
            thang: currentMonth + 1,
            nam: currentYear,
            tongLuong: totalSalary,
            tongBuoiDay: totalSessions,
            soHocSinh: students.length
        });
    },

    async handleSelfInfo(): Promise<string> {
        const students = await firebaseService.getManagementStudents();
        const classes = [...new Set(students.map(s => s.className))];
        
        return JSON.stringify({
            tenGiaoVien: "Anh Thưởng",
            soHocSinh: students.length,
            soLop: classes.length,
            danhSachLop: classes
        });
    },

    async handlePendingAssignments(ownerId: string): Promise<string> {
        const allStudents = await firebaseService.getManagementStudents();
        const globalResults = await firebaseService.getGlobalResults(ownerId);

        // Liệt kê học sinh còn bài chưa làm
        const chuaNop: any[] = [];

        for (const student of allStudents) {
            const assignedExams = student.assignedExams || [];
            if (assignedExams.length === 0) continue;

            const normalizedName = nameResolver.normalizeName(student.fullName || "");

            for (const exam of assignedExams) {
                // Coi bài đã hoàn thành nếu:
                // - exam.status === 'completed'
                // - Có record trong examHistory với cùng shareId
                // - Có bản ghi trong globalResults với cùng shareId và tên học sinh
                const inExamHistory = (student.examHistory || []).some((e: any) => e.id === exam.id);
                const inGlobalResults = globalResults.some((r: any) => {
                    const rNorm = nameResolver.normalizeName(r.studentName || "");
                    return r.shareId === exam.id && (
                        rNorm === normalizedName ||
                        normalizedName.includes(rNorm) ||
                        rNorm.includes(normalizedName)
                    );
                });

                const isDone = exam.status === 'completed' || inExamHistory || inGlobalResults;

                if (!isDone) {
                    // Format ngày giao
                    const rawDate = exam.assignedAt || exam.createdAt || "";
                    let ngayGiao = "N/A";
                    if (rawDate) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                            ngayGiao = d.toLocaleDateString('vi-VN');
                        } else {
                            ngayGiao = rawDate.split("T")[0];
                        }
                    }

                    chuaNop.push({
                        hocSinh: student.fullName,
                        baiTap: exam.title || "Bài tập",
                        ngayGiao
                    });
                }
            }
        }

        if (chuaNop.length === 0) {
            return JSON.stringify({ thongBao: "Tất cả học sinh đã hoàn thành bài tập.", chuaNop: [] });
        }

        return JSON.stringify({
            thongBao: `Còn ${chuaNop.length} bài tập chưa được nộp.`,
            chuaNop
        });
    }
};
