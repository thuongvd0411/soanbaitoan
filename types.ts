
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

export interface StudentResult {
  id?: string;
  studentName: string;
  studentClass: string;
  score: number;
  answers: Record<string, any>;
  submittedAt: string;
}

export interface ExamHistoryRecord {
  id: string; // shareId
  title: string;
  date: string;
  score: number;
  details?: any;
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
  shareId?: string;
  assignedStudentId?: string; // Liên kết với học sinh trong Quản lý học tập
}

// --- CÁC LOẠI DỮ LIỆU TỪ QUẢN LÝ HỌC TẬP ---
export type SessionType = 'Sáng' | 'Chiều' | 'Tối';
export type HomeworkStatus = 'Không làm' | 'Làm thiếu' | 'Đạt yêu cầu' | 'N/A';
export type RegularHomeworkResult = 'Hoàn thành' | 'Không hoàn thành' | 'N/A';
export type AttendanceStatus = 'attended' | 'absent' | 'makeup';

export type TriStateResult = 'Đạt' | 'Chưa đạt' | 'N/A';
export type YesNoNAResult = 'Có' | 'Không' | 'N/A';

export interface Schedule {
  id: string;
  weekday: number; // 0 (T2) -> 6 (CN)
  session: SessionType;
}

export interface MockTest {
  id: string;
  date: string;
  score: number;
}

export interface StudyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weekday: number; // 0 -> 6
  session: SessionType;
  status: AttendanceStatus;
  absentReason?: string;

  // Đầu buổi
  homework: HomeworkStatus;
  formulaTest: TriStateResult;
  oldLessonTest: TriStateResult;
  regularHomeworkResult: RegularHomeworkResult;
  ignoreEarlyStats: boolean;

  // Trong buổi
  evalNewKnowledge: number | 'N/A';
  evalQuantity: number | 'N/A';
  ignoreMidStats: boolean;

  // Cuối buổi
  assignedHomework: YesNoNAResult;
  ignoreLateStats: boolean;

  // Ngoài buổi
  hasRegularHomework: YesNoNAResult;
  ignoreOutsideStats: boolean;

  // Điểm kiểm tra định kỳ
  testScore?: number;
  ignoreTestStats: boolean;

  mockTests: MockTest[];
}

export interface AssignedExam {
  id: string;      // shareId từ Soạn Toán AI
  title: string;   // Tên bài tập/Chương học
  link: string;    // URL bài tập
  assignedAt: string;
  status: 'assigned' | 'completed';
}

export interface Student {
  id: string;
  fullName: string;
  className: string;
  baseSalary: number;
  schedules: Schedule[];
  history: StudyRecord[];
  assignedExams?: AssignedExam[];
  examHistory?: ExamHistoryRecord[];
}

export interface MonthlyStats {
  month: number;
  year: number;
  totalSessions: number;
  attendedCount: number;
  absentCount: number;
  makeupCount: number;
  totalSalary: number;
  avgScores: {
    knowledge: number;
    quantity: number;
    test: number;
  };
  homeworkCounts: {
    none: number;
    incomplete: number;
    satisfactory: number;
  };
  formulaPassCount: number;
  oldLessonPassCount: number;
  assignedHomeworkCount: number;
  noHomeworkCount: number;
  regularHomeworkPassCount: number;
  hasRegularHomeworkCount: number;
  activeCount: number;
  validHomeworkCount: number;
  validKnowledgeCount: number;
  validTestCount: number;
  validAssignedCount: number;
  validOutsideCount: number;
}

// Giữ nguyên StudentFromManagement để tương thích với code soanbaitoan đã sửa ở bước trước (nếu cần)
export type StudentFromManagement = Student;
