
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
    where,
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
                ownerId, // Thêm ownerId để lọc
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
            const q = query(
                resultsRef, 
                orderBy("submittedAt", "desc")
            );
            const snapshot = await getDocs(q);
            const results: any[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Lọc in-memory: Dữ liệu thuộc về owner này HOẶC dữ liệu cũ chưa có ownerId (legacy data)
                if (!data.ownerId || data.ownerId === ownerId) {
                    results.push(data);
                }
            });
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
     * Đồng bộ điểm bài tập vào lịch sử làm bài (ExamHistory) của học sinh
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
                    
                    // Khởi tạo examHistory nếu chưa có
                    if (!student.examHistory) student.examHistory = [];

                    // Tạo bản ghi examHistory mới
                    const newExamRecord = {
                        id: recordInfo.shareId,
                        title: recordInfo.title,
                        date: new Date().toISOString().split('T')[0],
                        score: recordInfo.score
                    };

                    // Thêm vào đầu danh sách
                    student.examHistory = [newExamRecord, ...student.examHistory];

                    // Vẫn giữ cập nhật status trong assignedExams nếu có
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
    },

    /**
     * Phân tích chi tiết mức độ hoàn thành và các lỗi sai của một mã đề
     */
    async getDetailedExamAnalysis(shareId: string): Promise<any> {
        if (!shareId) return null;
        try {
            // 1. Lấy thông tin gốc của đề bài
            const examData = await this.getSharedExam(shareId);
            if (!examData) return null;

            // 2. Lấy toàn bộ kết quả nộp bài
            const results = await this.getStudentResults(shareId);
            if (results.length === 0) return { questions: examData.questions, results: [], analysis: {} };

            // 3. Phân tích từng câu hỏi
            const analysis: Record<number, any> = {};
            examData.questions.forEach((q: Question) => {
                analysis[q.number] = {
                    questionId: q.id,
                    content: q.content,
                    correctAnswer: q.correctAnswer,
                    totalAttempts: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    wrongAnswerDistribution: {} as Record<string, number>,
                    isTrueFalse: q.type?.includes('Đúng/Sai'),
                    isShortAnswer: q.type?.includes('ngắn')
                };
            });

            results.forEach(res => {
                examData.questions.forEach((q: Question) => {
                    const studentAns = res.answers[q.id];
                    if (studentAns === undefined || studentAns === null) return;

                    const stats = analysis[q.number];
                    stats.totalAttempts++;

                    // Kiểm tra đúng sai tùy theo loại câu hỏi
                    let isCorrect = false;
                    if (stats.isTrueFalse) {
                        // So sánh chuỗi "a)Đ, b)S, ..."
                        isCorrect = studentAns === q.correctAnswer;
                    } else if (stats.isShortAnswer) {
                        isCorrect = String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                    } else {
                        isCorrect = studentAns === q.correctAnswer;
                    }

                    if (isCorrect) {
                        stats.correctCount++;
                    } else {
                        stats.wrongCount++;
                        const ansKey = typeof studentAns === 'object' ? JSON.stringify(studentAns) : String(studentAns);
                        stats.wrongAnswerDistribution[ansKey] = (stats.wrongAnswerDistribution[ansKey] || 0) + 1;
                    }
                });
            });

            return {
                examConfig: examData.config,
                totalSubmissions: results.length,
                averageScore: results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length,
                questionAnalysis: analysis
            };
        } catch (error) {
            console.error("Firebase getDetailedExamAnalysis error:", error);
            return null;
        }
    },

    /**
     * --- TÍCH HỢP AI ĐẦU TƯ ---
     */

    /**
     * Tải lịch sử chat Đầu Tư
     */
    async getInvestmentChat(userId: string): Promise<any[]> {
        if (!userId) return [];
        try {
            const docRef = doc(db, 'investment_history', userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.messages || [];
            }
            return [];
        } catch (error) {
            console.error("Firebase getInvestmentChat error:", error);
            return [];
        }
    },

    /**
     * Lưu lịch sử chat Đầu Tư
     */
    async saveInvestmentChat(userId: string, messages: any[]): Promise<void> {
        if (!userId || !messages) return;
        try {
            const docRef = doc(db, 'investment_history', userId);
            
            // Lọc bỏ message quá dài, hoặc cắt bớt độ dài nếu cần thiết tiết kiệm dung lượng
            const safeMessages = messages.map(m => ({
                role: m.role,
                content: m.content.substring(0, 5000), // Max 5000 ký tự mỗi tin
                timestamp: m.timestamp || new Date().toISOString()
            }));

            await setDoc(docRef, { 
                messages: safeMessages,
                lastUpdated: new Date().toISOString() 
            }, { merge: true });
        } catch (error) {
            console.error("Firebase saveInvestmentChat error:", error);
            throw error;
        }
    },

    /**
     * Xóa lịch sử chat dựa vào timeframe (1h, 1d, all)
     */
    async deleteInvestmentChat(userId: string, timeframe: '1h' | '1d' | 'all'): Promise<void> {
        if (!userId) return;
        try {
            if (timeframe === 'all') {
                await deleteDoc(doc(db, 'investment_history', userId));
                return;
            }

            const docRef = doc(db, 'investment_history', userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                let messages = data.messages || [];
                const now = Date.now();
                const timeAgo = timeframe === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

                // Giữ lại các tin nhắn cũ hơn khoảng thời gian bị xóa
                messages = messages.filter((m: any) => {
                    if (!m.timestamp) return false; // Không có timestamp -> coi như mới -> xóa
                    const msgTime = new Date(m.timestamp).getTime();
                    return (now - msgTime) > timeAgo;
                });

                await setDoc(docRef, { messages, lastUpdated: new Date().toISOString() }, { merge: true });
            }
        } catch (error) {
            console.error("Firebase deleteInvestmentChat error:", error);
            throw error;
        }
    },

    /**
     * Lấy báo cáo vĩ mô trong ngày
     */
    async getMacroReport(dateStr: string): Promise<string | null> {
        if (!dateStr) return null;
        try {
            const docRef = doc(db, 'macro_reports', dateStr.replace(/\//g, '-'));
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().content || null;
            }
            return null;
        } catch (error) {
            console.error("Firebase getMacroReport error:", error);
            return null;
        }
    },

    /**
     * Lưu báo cáo vĩ mô trong ngày
     */
    async saveMacroReport(dateStr: string, content: string): Promise<void> {
        if (!dateStr || !content) return;
        try {
            const docRef = doc(db, 'macro_reports', dateStr.replace(/\//g, '-'));
            await setDoc(docRef, { 
                content,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Firebase saveMacroReport error:", error);
            throw error;
        }
    },

    /**
     * Lấy tin tức trong ngày
     */
    async getNewsReport(dateStr: string): Promise<string | null> {
        if (!dateStr) return null;
        try {
            const docRef = doc(db, 'news_reports', dateStr.replace(/\//g, '-'));
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().content || null;
            }
            return null;
        } catch (error) {
            console.error("Firebase getNewsReport error:", error);
            return null;
        }
    },

    /**
     * Lưu tin tức trong ngày
     */
    async saveNewsReport(dateStr: string, content: string): Promise<void> {
        if (!dateStr || !content) return;
        try {
            const docRef = doc(db, 'news_reports', dateStr.replace(/\//g, '-'));
            await setDoc(docRef, { 
                content,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Firebase saveNewsReport error:", error);
            throw error;
        }
    },

    /**
     * Lấy dữ liệu thị trường từ Firestore
     */
    async getMarketData(symbol: string): Promise<any | null> {
        if (!symbol) return null;
        try {
            const docRef = doc(db, 'market_data', symbol.toUpperCase());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error(`Firebase getMarketData error for ${symbol}:`, error);
            return null;
        }
    },

    /**
     * Cập nhật dữ liệu thị trường vào Firestore
     */
    async updateMarketData(symbol: string, data: any): Promise<void> {
        if (!symbol || !data) return;
        try {
            const docRef = doc(db, 'market_data', symbol.toUpperCase());
            await setDoc(docRef, {
                ...data,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error(`Firebase updateMarketData error for ${symbol}:`, error);
            throw error;
        }
    }
};

export { db };
