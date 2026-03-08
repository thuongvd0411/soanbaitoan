// services/storageService.ts
import { Question } from '../types';

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

  // Lấy Security Headers/Params
  getSecurityParams: async () => {
    const deviceId = storageService.getDeviceId();
    const fingerprint = await storageService.getFingerprint();
    return { deviceId, fingerprint };
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
  saveQuestion: (question: Question): boolean => {
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
      return true;
    } catch (error) {
      console.error("Error saving to bank:", error);
      return false;
    }
  },

  // Nhập dữ liệu từ file backup (Merge data)
  importBank: (importedQuestions: any[]): { success: number, failed: number } => {
    try {
      if (!Array.isArray(importedQuestions)) return { success: 0, failed: 0 };

      const currentBank = storageService.getBank();
      let addedCount = 0;
      let duplicateCount = 0;

      const newBank = [...currentBank];

      importedQuestions.forEach(q => {
        // Kiểm tra cấu trúc cơ bản của câu hỏi
        if (!q.content || !q.type || !q.difficulty) {
          return;
        }

        // Kiểm tra trùng lặp nội dung
        const exists = newBank.some(existing => existing.content === q.content);
        if (!exists) {
          // Tạo ID mới để đảm bảo tính duy nhất
          const newQ = {
            ...q,
            id: `bank_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
          newBank.push(newQ);
          addedCount++;
        } else {
          duplicateCount++;
        }
      });

      localStorage.setItem(BANK_KEY, JSON.stringify(newBank));
      return { success: addedCount, failed: duplicateCount };
    } catch (error) {
      console.error("Error importing bank:", error);
      throw error;
    }
  },

  // Xóa câu hỏi khỏi kho
  removeQuestion: (id: string) => {
    const bank = storageService.getBank();
    const updatedBank = bank.filter(q => q.id !== id);
    localStorage.setItem(BANK_KEY, JSON.stringify(updatedBank));
    return updatedBank;
  },

  // Lấy câu hỏi theo bộ lọc (Lớp, Mức độ, Tập, Bài)
  filterBank: (
    grade: number | 'All',
    difficulty: string,
    volume: string = 'All',
    lesson: string = 'All'
  ) => {
    let bank = storageService.getBank();

    // Filter by Grade
    if (grade && grade !== 'All') {
      bank = bank.filter(q => q.grade === Number(grade));
    }

    // Filter by Difficulty
    if (difficulty && difficulty !== 'All') {
      bank = bank.filter(q => q.difficulty === difficulty);
    }

    // Filter by Volume (Tập 1/2 in chapter name)
    if (volume && volume !== 'All') {
      bank = bank.filter(q => q.chapter && q.chapter.includes(volume));
    }

    // Filter by Lesson name
    if (lesson && lesson !== 'All') {
      bank = bank.filter(q => q.lesson === lesson);
    }

    return bank;
  }
};