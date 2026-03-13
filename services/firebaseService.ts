
import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    onSnapshot
} from "firebase/firestore";
import { Question, HistoryItem } from "../types";

// Cấu hình Firebase sẽ được nạp từ biến môi trường
const env = (import.meta as any).env;
const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
};

// Debug log chi tiết từng biến Firebase
console.log("Alla Firebase Config Status:", {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId,
    storageBucket: !!firebaseConfig.storageBucket,
    messagingSenderId: !!firebaseConfig.messagingSenderId,
    appId: !!firebaseConfig.appId,
    // Log giá trị projectId (không nhạy cảm) để kiểm tra
    projectIdValue: firebaseConfig.projectId || "MISSING!"
});

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const firebaseService = {
    /**
     * Lưu một câu hỏi vào kho tư liệu trên Cloud
     */
    async saveQuestion(deviceId: string, question: Question): Promise<void> {
        // Tắt filter deviceId theo yêu cầu mới
        try {
            const qRef = doc(db, "global_questionBank", question.id);
            await setDoc(qRef, {
                ...question,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Firebase saveQuestion error:", error);
            throw error;
        }
    },

    /**
     * Tải toàn bộ kho tư liệu từ Cloud
     */
    async getBank(deviceId: string): Promise<Question[]> {
        // Tắt filter deviceId
        try {
            const bankRef = collection(db, "global_questionBank");
            const q = query(bankRef, orderBy("number", "asc"));
            const querySnapshot = await getDocs(q);
            const questions: Question[] = [];
            querySnapshot.forEach((doc) => {
                questions.push(doc.data() as Question);
            });
            return questions;
        } catch (error) {
            console.error("Firebase getBank error:", error);
            return [];
        }
    },

    /**
     * Xóa một câu hỏi khỏi Cloud
     */
    async deleteQuestion(deviceId: string, questionId: string): Promise<void> {
        try {
            const qRef = doc(db, "global_questionBank", questionId);
            await deleteDoc(qRef);
        } catch (error) {
            console.error("Firebase deleteQuestion error:", error);
        }
    },

    /**
     * Lưu lịch sử soạn thảo lên Cloud
     */
    async saveHistory(deviceId: string, historyItem: HistoryItem): Promise<void> {
        try {
            const hRef = doc(db, "global_history", historyItem.id);
            await setDoc(hRef, {
                ...historyItem,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Firebase saveHistory error:", error);
        }
    },

    /**
     * Tải lịch sử từ Cloud
     */
    async getHistory(deviceId: string): Promise<HistoryItem[]> {
        try {
            const historyRef = collection(db, "global_history");
            const q = query(historyRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const history: HistoryItem[] = [];
            querySnapshot.forEach((doc) => {
                history.push(doc.data() as HistoryItem);
            });
            return history;
        } catch (error) {
            console.error("Firebase getHistory error:", error);
            return [];
        }
    },

    /**
     * Lưu phiếu bài tập chia sẻ cho học sinh (Public Read)
     */
    async saveSharedExam(questions: Question[], config: any, existingShareId?: string): Promise<string> {
        try {
            // Tối ưu hóa dung lượng: Loại bỏ khoảng trắng thừa trong SVG nếu có
            const optimizedQuestions = questions.map(q => {
                if (q.hasImage && q.imageDescription && q.imageDescription.includes('<svg')) {
                    return {
                        ...q,
                        imageDescription: q.imageDescription.replace(/>\s+</g, '><').trim()
                    };
                }
                return q;
            });

            const data = {
                questions: optimizedQuestions,
                config,
                createdAt: new Date().toISOString()
            };

            // Kiểm tra dung lượng ước tính (Firestore giới hạn 1MB)
            const stringSize = JSON.stringify(data).length;
            if (stringSize > 1000000) {
                throw new Error("Bộ đề này quá lớn (nhiều hình vẽ). Anh vui lòng giảm số câu hỏi hoặc giảm tỷ lệ hình vẽ xuống nhé.");
            }

            const shareId = existingShareId || ("share_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36));
            const sRef = doc(db, "shared_exams", shareId);
            await setDoc(sRef, {
                shareId,
                ...data
            });
            return shareId;
        } catch (error) {
            console.error("Firebase saveSharedExam error:", error);
            throw error;
        }
    },

    async getSharedExam(shareId: string): Promise<{ questions: Question[], config: any } | null> {
        if (!shareId) return null;
        try {
            const sRef = doc(db, "shared_exams", shareId);
            const docSnap = await getDoc(sRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    questions: data.questions || [],
                    config: data.config || {}
                };
            }
            return null;
        } catch (error) {
            console.error("Firebase getSharedExam error:", error);
            return null;
        }
    },

    /**
     * Nộp bài của Học sinh
     */
    async saveStudentResult(shareId: string, result: { studentName: string, studentClass: string, score: number, answers: Record<string, any> }): Promise<void> {
        if (!shareId) return;
        try {
            const timestamp = new Date().toISOString();
            const resultData = {
                id: "",
                shareId,
                ...result,
                submittedAt: timestamp
            };

            const resultRef = doc(collection(db, "shared_exams", shareId, "results"));
            resultData.id = resultRef.id;
            await setDoc(resultRef, resultData);
        } catch (error) {
            console.error("Firebase saveStudentResult error:", error);
            throw error;
        }
    },

    /**
     * Lưu kết quả vào thống kê global của giáo viên
     */
    async saveGlobalResult(ownerId: string, result: any): Promise<void> {
        try {
            const timestamp = new Date().toISOString();
            const globalRef = doc(collection(db, "global_results"));
            await setDoc(globalRef, {
                id: globalRef.id,
                ...result,
                submittedAt: timestamp
            });
        } catch (error) {
            console.error("Firebase saveGlobalResult error:", error);
            throw error;
        }
    },

    /**
     * Lấy toàn bộ kết quả của 1 mã đề
     */
    async getStudentResults(shareId: string): Promise<any[]> {
        if (!shareId) return [];
        try {
            const resultsRef = collection(db, "shared_exams", shareId, "results");
            const q = query(resultsRef, orderBy("score", "desc"));
            const snapshot = await getDocs(q);
            const results: any[] = [];
            snapshot.forEach(doc => results.push(doc.data()));
            return results;
        } catch (error) {
            console.error("Firebase getStudentResults error:", error);
            return [];
        }
    },

    /**
     * Lấy toàn bộ kết quả của tất cả các đề (phục vụ thống kê)
     */
    async getGlobalResults(ownerId: string): Promise<any[]> {
        try {
            const resultsRef = collection(db, "global_results");
            const q = query(resultsRef, orderBy("submittedAt", "desc"));
            const snapshot = await getDocs(q);
            const results: any[] = [];
            snapshot.forEach(doc => results.push(doc.data()));
            return results;
        } catch (error) {
            console.error("Firebase getGlobalResults error:", error);
            return [];
        }
    },

    /**
     * Xóa một kết quả khỏi dữ liệu chung
     */
    async deleteGlobalResult(resultId: string): Promise<void> {
        if (!resultId) return;
        try {
            await deleteDoc(doc(db, "global_results", resultId));
        } catch (error) {
            console.error("Firebase deleteGlobalResult error:", error);
            throw error;
        }
    },

    /**
     * --- TÍCH HỢP VỚI QUẢN LÝ HỌC TẬP ---
     */

    /**
     * Lấy danh sách học sinh từ dự án Quản lý học tập
     */
    async getManagementStudents(): Promise<any[]> {
        try {
            const docRef = doc(db, 'appData', 'studentsData_v5');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return Array.isArray(data.students) ? data.students : [];
            }
            return [];
        } catch (error) {
            console.error("Firebase getManagementStudents error:", error);
            return [];
        }
    },

    /**
     * Đồng bộ toàn bộ dữ liệu học sinh (giữ nguyên logic gốc của quanlyhoc)
     */
    async syncManagementData(students: any[]): Promise<void> {
        try {
            const docRef = doc(db, 'appData', 'studentsData_v5');
            // Loại bỏ undefined để tránh lỗi Firestore
            const sanitized = JSON.parse(JSON.stringify(students, (key, value) => {
                return value === undefined ? null : value;
            }));
            await setDoc(docRef, { students: sanitized });
        } catch (error) {
            console.error("Firebase syncManagementData error:", error);
            throw error;
        }
    },

    /**
     * Giao bài tập cho một học sinh cụ thể
     */
    async assignExamToStudent(studentId: string, assignedExam: any): Promise<void> {
        try {
            const docRef = doc(db, 'appData', 'studentsData_v5');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const students = Array.isArray(data.students) ? [...data.students] : [];

                const studentIndex = students.findIndex((s: any) => s.id === studentId);
                if (studentIndex !== -1) {
                    const student = { ...students[studentIndex] };
                    if (!student.assignedExams) student.assignedExams = [];

                    // Thêm bài tập mới vào đầu danh sách
                    student.assignedExams = [assignedExam, ...student.assignedExams];

                    students[studentIndex] = student;

                    // Lưu lại bằng hàm sync đã sanitized
                    await this.syncManagementData(students);
                }
            }
        } catch (error) {
            console.error("Firebase assignExamToStudent error:", error);
            throw error;
        }
    },

    /**
     * Đồng bộ điểm bài tập vào lịch sử học tập (History) của học sinh
     */
    async addExamRecordToStudent(studentId: string, recordInfo: { title: string, score: number, shareId: string }): Promise<void> {
        try {
            const docRef = doc(db, 'appData', 'studentsData_v5');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const students = Array.isArray(data.students) ? [...data.students] : [];

                const studentIndex = students.findIndex((s: any) => s.id === studentId);
                if (studentIndex !== -1) {
                    const student = { ...students[studentIndex] };
                    if (!student.history) student.history = [];

                    // Tạo bản ghi history mới loại "Bài tập"
                    const newRecord = {
                        id: "exam_" + Date.now(),
                        date: new Date().toISOString().split('T')[0],
                        weekday: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, // Fix 0..6 (CN..T7) -> (T2..CN)
                        session: "Bài tập" as any, // Dùng as any để bypass enum nếu cần, hoặc ép kiểu
                        status: 'attended',
                        homework: 'N/A',
                        formulaTest: 'N/A',
                        oldLessonTest: 'N/A',
                        regularHomeworkResult: 'N/A',
                        testScore: recordInfo.score,
                        evalNewKnowledge: recordInfo.score,
                        evalQuantity: 100, // Mặc định 100%
                        ignoreEarlyStats: true,
                        ignoreMidStats: false,
                        ignoreLateStats: true,
                        ignoreOutsideStats: true,
                        ignoreTestStats: false,
                        absentReason: `Làm bài: ${recordInfo.title}`,
                        mockTests: []
                    };

                    student.history = [newRecord, ...student.history];

                    // Cập nhật trạng thái bài tập đã giao
                    if (student.assignedExams) {
                        const examIndex = student.assignedExams.findIndex((e: any) => e.id === recordInfo.shareId);
                        if (examIndex !== -1) {
                            student.assignedExams[examIndex] = {
                                ...student.assignedExams[examIndex],
                                status: 'completed'
                            };
                        }
                    }

                    students[studentIndex] = student;
                    await this.syncManagementData(students);
                }
            }
        } catch (error) {
            console.error("Firebase addExamRecordToStudent error:", error);
            throw error;
        }
    }
};

export { db };
