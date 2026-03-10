
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
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

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
    }
};
