// services/storageService.ts
import { Question, HistoryItem } from '../types';
import { firebaseService } from './firebaseService';

const BANK_KEY = 'math_app_question_bank_v1';
const DEVICE_ID_KEY = 'math_app_device_id';
const FINGERPRINT_KEY = 'math_app_fingerprint';

export const storageService = {
  // Sinh hoặc lấy Device ID (UUID v4)
  getDeviceId: (): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  },

  // Tạo Fingerprint từ thông tin trình duyệt (SHA-256)
  getFingerprint: async (): Promise<string> => {
    const cached = localStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;

    const nav = window.navigator;
    const screen = window.screen;
    const components = [
      nav.userAgent,
      nav.platform,
      nav.language,
      new Date().getTimezoneOffset().toString(),
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString()
    ];

    const dataString = components.join('|');
    const msgUint8 = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    localStorage.setItem(FINGERPRINT_KEY, hashHex);
    return hashHex;
  },

  // Lấy Security Headers/Params (Hỗ trợ SyncKey)
  getSecurityParams: async (customSyncKey?: string) => {
    const deviceId = storageService.getDeviceId();
    const fingerprint = await storageService.getFingerprint();
    const syncId = customSyncKey || deviceId;
    return { deviceId, fingerprint, syncId };
  },

  // Lấy toàn bộ câu hỏi trong kho
  getBank: (): Question[] => {
    try {
      const data = localStorage.getItem(BANK_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading bank:", error);
      return [];
    }
  },

  // Lưu một câu hỏi vào kho
  saveQuestion: (question: Question, syncId?: string): boolean => {
    try {
      const bank = storageService.getBank();
      // Kiểm tra trùng lặp (dựa trên nội dung)
      const exists = bank.some(q => q.content === question.content);
      if (exists) return false; // Đã tồn tại

      // Tạo bản sao mới để không ảnh hưởng ID của phiên làm việc hiện tại
      const newSavedQuestion = {
        ...question,
        id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID mới cho kho
        number: 0 // Reset số thứ tự
      };

      const updatedBank = [newSavedQuestion, ...bank];
      localStorage.setItem(BANK_KEY, JSON.stringify(updatedBank));

      // Đồng bộ lên Cloud (Firebase) dùng syncId nếu có
      const finalSyncId = syncId || storageService.getDeviceId();
      firebaseService.saveQuestion(finalSyncId, newSavedQuestion).catch(console.error);

      return true;
    } catch (error) {
      console.error("Error saving to bank:", error);
      return false;
    }
  },

  // Nhập dữ liệu từ file backup (Merge data)
  importBank: (importedQuestions: any[], syncId?: string): { success: number, failed: number } => {
    try {
      if (!Array.isArray(importedQuestions)) return { success: 0, failed: 0 };

      const currentBank = storageService.getBank();
      let addedCount = 0;
      let duplicateCount = 0;

      const newBank = [...currentBank];

      importedQuestions.forEach(q => {
        if (!q.content || !q.type || !q.difficulty) return;
        const exists = newBank.some(existing => existing.content === q.content);
        if (!exists) {
          const newQ = { ...q, id: `bank_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
          newBank.push(newQ);
          addedCount++;
        } else {
          duplicateCount++;
        }
      });

      localStorage.setItem(BANK_KEY, JSON.stringify(newBank));

      // Đồng bộ Cloud
      const finalSyncId = syncId || storageService.getDeviceId();
      if (addedCount > 0) {
        newBank.forEach(q => {
          firebaseService.saveQuestion(finalSyncId, q).catch(console.error);
        });
      }

      return { success: addedCount, failed: duplicateCount };
    } catch (error) {
      console.error("Error importing bank:", error);
      throw error;
    }
  },

  // Xóa câu hỏi khỏi kho
  removeQuestion: (id: string, syncId?: string) => {
    const bank = storageService.getBank();
    const updatedBank = bank.filter(q => q.id !== id);
    localStorage.setItem(BANK_KEY, JSON.stringify(updatedBank));

    // Xóa trên Cloud
    const finalSyncId = syncId || storageService.getDeviceId();
    firebaseService.deleteQuestion(finalSyncId, id).catch(console.error);

    return updatedBank;
  },

  // Lấy câu hỏi theo bộ lọc...
  filterBank: (grade: number | 'All', difficulty: string, volume: string = 'All', lesson: string = 'All') => {
    let bank = storageService.getBank();
    if (grade && grade !== 'All') bank = bank.filter(q => q.grade === Number(grade));
    if (difficulty && difficulty !== 'All') bank = bank.filter(q => q.difficulty === difficulty);
    if (volume && volume !== 'All') bank = bank.filter(q => q.chapter && q.chapter.includes(volume));
    if (lesson && lesson !== 'All') bank = bank.filter(q => q.lesson === lesson);
    return bank;
  },

  // Hàm đồng bộ toàn diện từ Local lên Cloud
  syncCloud: async (syncId?: string): Promise<void> => {
    try {
      const finalSyncId = syncId || storageService.getDeviceId();
      const localBank = storageService.getBank();
      for (const q of localBank) {
        await firebaseService.saveQuestion(finalSyncId, q);
      }
      console.log("Alla Sync - Cloud Pushed Successfully for ID:", finalSyncId);
    } catch (error) {
      console.error("Alla Sync - Error pushing to cloud:", error);
      throw error;
    }
  },

  // Hàm tải dữ liệu từ Cloud về Local
  pullCloud: async (syncId?: string): Promise<void> => {
    try {
      const finalSyncId = syncId || storageService.getDeviceId();
      const cloudBank = await firebaseService.getBank(finalSyncId);

      if (cloudBank.length > 0) {
        localStorage.setItem(BANK_KEY, JSON.stringify(cloudBank));
        console.log("Alla Sync - Cloud Pulled Successfully", cloudBank.length, "questions for ID:", finalSyncId);
      }
    } catch (error) {
      console.error("Alla Sync - Error pulling from cloud:", error);
      throw error;
    }
  }
};