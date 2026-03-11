
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
    orderBy
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
        if (!deviceId) return;
        try {
            const qRef = doc(db, "users", deviceId, "questionBank", question.id);
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
        if (!deviceId) return [];
        try {
            const bankRef = collection(db, "users", deviceId, "questionBank");
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
        if (!deviceId) return;
        try {
            const qRef = doc(db, "users", deviceId, "questionBank", questionId);
            await deleteDoc(qRef);
        } catch (error) {
            console.error("Firebase deleteQuestion error:", error);
        }
    },

    /**
     * Lưu lịch sử soạn thảo lên Cloud
     */
    async saveHistory(deviceId: string, historyItem: HistoryItem): Promise<void> {
        if (!deviceId) return;
        try {
            const hRef = doc(db, "users", deviceId, "history", historyItem.id);
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
        if (!deviceId) return [];
        try {
            const historyRef = collection(db, "users", deviceId, "history");
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
            const resultRef = doc(collection(db, "shared_exams", shareId, "results"));
            await setDoc(resultRef, {
                id: resultRef.id,
                ...result,
                submittedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Firebase saveStudentResult error:", error);
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
    }
};
