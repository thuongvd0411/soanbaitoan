
// types.ts

export enum Difficulty {
  NB = 'Nhận biết',
  TH = 'Thông hiểu',
  VD = 'Vận dụng',
  VDC = 'Vận dụng cao'
}

export enum QuestionType {
  MultipleChoice = 'Trắc nghiệm ABCD',
  TrueFalse = 'Trắc nghiệm Đúng/Sai',
  ShortAnswer = 'Trả lời ngắn',
  Mixed = 'Câu hỏi trộn lẫn'
}

export enum ExamType {
  None = 'none',
  Test15m = '15_min',
  Test45m = '45_min',
  MidTerm1 = 'mid_term_1',
  EndTerm1 = 'end_term_1',
  MidTerm2 = 'mid_term_2',
  EndTerm2 = 'end_term_2'
}

export enum ImageMode {
  None = 'none',
  Basic = 'basic',
  Olympic = 'olympic'
}

export enum AnswerMode {
  None = 'none',
  Basic = 'basic',
  Detailed = 'detailed'
}

// Game Status
export enum GameStatus {
  Idle = 'idle',
  Loading = 'loading',
  Playing = 'playing',
  GameOver = 'game_over',
  Win = 'win'
}

export interface Question {
  id: string;
  number: number;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  choices?: string[];
  correctAnswer: string; // For game, this is usually "A", "B", "C", or "D"
  hasImage: boolean;
  imageDescription?: string;
  grade?: number;
  lesson?: string;
  chapter?: string;
  explanation: string;
  hint: string;
}

export interface AppState {
  grade: number;
  questionCount: number;
  selectedDifficulties: Difficulty[];
  lessons: string[]; // Đổi từ lesson: string sang lessons: string[]
  customLesson: string;
  questionTypes: QuestionType[];
  examType: ExamType;
  imageMode: ImageMode;
  answerMode: AnswerMode;
  imageRatio: number;
  // API Key tùy chỉnh
  customApiKey?: string;
  // Mã đồng bộ cá nhân (Sync Key)
  syncKey?: string;
  // Game state
  gameStatus: GameStatus;
}

export interface SyllabusItem {
  grade: number;
  chapters: {
    name: string;
    lessons: string[];
  }[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  config: AppState;
  questions: Question[];
}
