
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { AppState, Difficulty, Question, QuestionType, HistoryItem, AnswerMode, ExamType, ImageMode, GameStatus, StudentFromManagement, AssignedExam } from './types';
import { generateQuestions, generateMillionaireQuestions, parseVoiceCommand } from './services/geminiService';
import { getLessonOptions } from './services/syllabusData';
import { storageService } from './services/storageService';
import { firebaseService } from './services/firebaseService';
import {
  Download, PlusCircle, BookOpen, Loader2, X, FileSignature, Menu, Trophy, Sparkles, RotateCcw, Home, HelpCircle, FastForward, HeartPulse, HandMetal, PartyPopper, Volume2, VolumeX, ArrowRight, Wallet, Info, Flame, ShieldAlert, Crown, History, Search,
  Mic, MicOff,
  Database,
  Cloud,
  CheckSquare,
  Save, ChevronRight, ListChecks, BrainCircuit, Star, Award, FileCode, Printer, RefreshCw, LogOut, PenLine, PenTool, ChevronDown, ChevronUp, Play, Gift, ImageIcon, CloudLightning, Trash2,
  Users, Calendar, BarChart3, Settings, DollarSign, Bell, MessageSquare, TrendingUp, Zap
} from 'lucide-react';
import StudentList from './components/StudentList';
import StudentDetails from './components/StudentDetails';
import DailyEntryForm from './components/DailyEntryForm';
import DailyReminders from './components/DailyReminders';
import MissingReminders from './components/MissingReminders';
import RevenueBreakdown from './components/RevenueBreakdown';
import InvestmentPanel from './components/InvestmentPanel';
import { calculateMonthlyStats, formatCurrency } from './utils/helpers';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './services/firebaseService';
import { Student, StudyRecord, Schedule } from './types';
import ChatbotPanel from './components/ChatbotPanel';


const APP_VERSION = "v5.4.8";
console.log("Alla Version:", APP_VERSION);

declare global {
  interface Window {
    MathJax: any;
  }
}

// Utility to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

/**
 * THUẬT TOÁN CÂN BẰNG ĐÁP ÁN TUYỆT ĐỐI (BULLETPROOF SHUFFLE)
 * Đã tắt theo yêu cầu: Giữ nguyên thứ tự câu/đáp án như AI trả về.
 */
const distributeAnswersEvenly = (questions: Question[]): Question[] => {
  return questions;
};

// --- Web Audio Engine ---
const playSound = (type: 'correct' | 'wrong' | 'applause' | 'celebration' | 'tick' | 'danger' | 'bonus') => {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const playOsc = (freq: number, startTime: number, duration: number, vol: number = 0.1, typeOsc: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = typeOsc;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };
  switch (type) {
    case 'correct': playOsc(523.25, ctx.currentTime, 0.2); playOsc(659.25, ctx.currentTime + 0.1, 0.3); playOsc(783.99, ctx.currentTime + 0.2, 0.5); break;
    case 'wrong': playOsc(220, ctx.currentTime, 0.5, 0.15, 'sawtooth'); break;
    case 'applause': for (let i = 0; i < 10; i++) playOsc(Math.random() * 300 + 400, ctx.currentTime + i * 0.08, 0.3, 0.04, 'triangle'); break;
    case 'tick': playOsc(1200, ctx.currentTime, 0.02, 0.02); break;
    case 'celebration': [523, 659, 783, 1046, 1318].forEach((f, i) => playOsc(f, ctx.currentTime + i * 0.15, 0.8)); break;
    case 'bonus': playOsc(880, ctx.currentTime, 0.1, 0.3); playOsc(1108, ctx.currentTime + 0.1, 0.1, 0.3); playOsc(1318, ctx.currentTime + 0.2, 0.4, 0.3); break;
  }
};

let _mathTimer: any = null;
const triggerMath = () => {
  if (_mathTimer) clearTimeout(_mathTimer);
  _mathTimer = setTimeout(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      try {
        window.MathJax.typesetClear();
        window.MathJax.typesetPromise().catch((err: any) => console.debug("MathJax error:", err));
      } catch (e) { console.debug("MathJax call failed:", e); }
    }
  }, 300); // Debounce 300ms
};

const Confetti = ({ density = 150 }: { density?: number }) => (
  <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
    {Array.from({ length: density }).map((_, i) => (
      <div key={i} className="absolute animate-confetti text-3xl"
        style={{
          left: `${Math.random() * 100}%`, top: `-10vh`,
          animationDelay: `${Math.random() * 2}s`,
          color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#f97316', '#06b6d4', '#fbbf24'][Math.floor(Math.random() * 8)]
        }}
      > {['✨', '🎉', '🎊', '⭐', '🎈'][Math.floor(Math.random() * 5)]} </div>
    ))}
  </div>
);

const ApplauseVisual = () => (
  <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-[160] flex justify-center gap-12">
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} className="animate-float-up text-6xl" style={{ animationDelay: `${i * 0.05}s` }}> 👏 </div>
    ))}
  </div>
);

const BankCheck = ({ amount, date, isBonus = false, memo }: { amount: string, date: string, isBonus?: boolean, memo?: string }) => (
  <div className={`max-w-4xl w-full border-[8px] md:border-[12px] p-4 md:p-8 shadow-2xl relative overflow-hidden font-serif text-gray-800 animate-in zoom-in-95 duration-700 ${isBonus ? 'bg-[#f0f9ff] border-blue-500' : 'bg-[#fdfaf1] border-[#c5a059]'}`}>
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${isBonus ? '#3b82f6' : '#c5a059'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
    {isBonus && <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-black px-6 py-1.5 uppercase tracking-widest transform rotate-45 translate-x-8 translate-y-4 shadow-md z-10">Bonus</div>}
    <div className="flex justify-between items-start border-b-2 border-gray-300 pb-2 mb-6">
      <div className="flex flex-col">
        <h3 className={`text-xl md:text-3xl font-black italic tracking-tighter ${isBonus ? 'text-blue-700' : 'text-[#8b6b23]'}`}>MATH BANK GLOBAL</h3>
        <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Education Excellence Trust</p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-[9px] md:text-[10px] font-bold uppercase text-gray-400">Date</p>
        <p className="text-sm md:text-lg font-bold border-b border-dashed border-gray-400 px-2 min-w-[100px] text-center">{date}</p>
      </div>
    </div>
    <div className="space-y-6 md:space-y-8 relative px-2">
      <div className="flex flex-wrap items-end gap-2 md:gap-4">
        <span className="text-[10px] md:text-sm font-bold uppercase text-gray-500 shrink-0 pb-1">Pay to:</span>
        <div className="flex-1 border-b-2 border-dotted border-gray-400 pb-1 text-base md:text-2xl font-bold italic px-2 text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">Nhà Vô Địch Toán Học</div>
      </div>
      <div className="flex flex-col md:flex-row items-end gap-6">
        <div className="flex-1 flex flex-wrap items-end gap-2 md:gap-4 w-full">
          <span className="text-[10px] md:text-sm font-bold uppercase text-gray-500 shrink-0 pb-1">Amount:</span>
          <div className="flex-1 border-b-2 border-dotted border-gray-400 pb-1 text-sm md:text-xl font-bold px-2 text-gray-800 break-words">{amount} Dollars</div>
        </div>
        <div className={`border-2 p-2 md:p-3 min-w-[140px] md:min-w-[200px] text-center rounded-lg shadow-inner shrink-0 ${isBonus ? 'bg-blue-50 border-blue-500' : 'bg-[#f0e6cc] border-[#c5a059]'}`}>
          <span className={`text-lg md:text-2xl font-black ${isBonus ? 'text-blue-700' : 'text-[#8b6b23]'}`}>$ {amount}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 md:gap-4">
        <span className="text-[10px] md:text-sm font-bold uppercase text-gray-500 shrink-0 pb-1">For:</span>
        <div className="flex-1 border-b-2 border-dotted border-gray-400 pb-1 text-sm md:text-lg font-bold italic px-2 text-gray-700"> {isBonus ? 'Phần thưởng kỹ năng xuất sắc' : (memo || 'Triệu phú Toán Học')} </div>
      </div>
    </div>
    <div className="mt-8 md:mt-12 flex justify-between items-end">
      <div className="text-[8px] md:text-[10px] text-gray-300 font-mono tracking-widest w-1/2 break-all"> {isBonus ? 'BONUS_VERIFIED_NO_HELP_GRANT' : '010203040506070809 // MATH_TOKEN_VERIFIED'} </div>
      <div className="text-center w-40 md:w-64">
        <p className="text-[8px] md:text-[10px] font-bold uppercase text-gray-400 mb-2">Authorized Signature</p>
        <div className="text-2xl md:text-4xl text-blue-900 rotate-[-4deg] mb-1 select-none" style={{ fontFamily: 'Brush Script MT, cursive' }}> ThuongVuongDuc </div>
        <div className="h-0.5 w-full bg-gray-300"></div>
      </div>
    </div>
  </div>
);

const MillionaireGame = ({ questions: initialQuestions, onClose, onRestart, grade, lessonName }: any) => {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing'>('ready');
  const [questions, setQuestions] = useState([...initialQuestions]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<'none' | 'correct' | 'wrong'>('none');
  const [gameResult, setGameResult] = useState<'playing' | 'win' | 'lost' | 'stopped'>('playing');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [hiddenChoices, setHiddenChoices] = useState<string[]>([]);
  const [hintActive, setHintActive] = useState(false);
  const [lifelines, setLifelines] = useState({ fiftyFifty: true, hint: true, autoPass: true, revive: true, changeQuestion: true });
  const [hasUsedHelp, setHasUsedHelp] = useState(false);
  const [showHiddenReward, setShowHiddenReward] = useState(false);
  const [isHalved, setIsHalved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wantsCheck, setWantsCheck] = useState(false);
  const [viewCheckMode, setViewCheckMode] = useState(false);
  const currentQ = questions[currentIndex] || {};
  const rewardStrings = ["20", "40", "60", "100", "200", "300", "600", "1,000", "1,400", "2,200", "3,000", "4,000", "6,000", "8,500", "15,000"];
  const isFinalQuestion = currentIndex === 14;

  useLayoutEffect(() => {
    const timer = setTimeout(triggerMath, 150);
    return () => clearTimeout(timer);
  }, [currentIndex, questions, selectedAnswer, gameResult, answerState, showSuccessScreen, hiddenChoices, hintActive, historyOpen, viewCheckMode, gamePhase, showHiddenReward]);

  const handleAnswer = (choiceLabel: string) => {
    if (selectedAnswer || gameResult !== 'playing' || showSuccessScreen || showHiddenReward) return;
    setSelectedAnswer(choiceLabel);
    const isCorrect = choiceLabel === currentQ.correctAnswer;
    if (isCorrect) {
      setAnswerState('correct'); setShowCelebration(true);
      if (!isMuted) { playSound('correct'); playSound('applause'); }
      const isPassingQ10 = currentIndex === 9;
      if (currentIndex === 14) {
        if (!isMuted) playSound('celebration');
        setTimeout(() => setGameResult('win'), 2500);
      } else {
        setTimeout(() => {
          if (isPassingQ10 && !hasUsedHelp) { setShowHiddenReward(true); setShowCelebration(false); if (!isMuted) playSound('bonus'); } else { setShowSuccessScreen(true); setShowCelebration(false); }
        }, 1300);
      }
    } else {
      setTimeout(() => {
        setAnswerState('wrong'); if (!isMuted) playSound('wrong');
        setTimeout(() => setGameResult('lost'), 1000);
      }, 800);
    }
  };

  const handleUseLifeline = (type: string) => {
    setHasUsedHelp(true); if (!isMuted) playSound('tick');
    if (type === '5050') {
      const incorrect = ['A', 'B', 'C', 'D'].filter(l => l !== currentQ.correctAnswer).sort(() => 0.5 - Math.random()).slice(0, 2);
      setHiddenChoices(incorrect);
      setLifelines(p => ({ ...p, fiftyFifty: false }));
    }
    if (type === 'hint') {
      setHintActive(true);
      setLifelines(p => ({ ...p, hint: false }));
    }
    if (type === 'change') {
      handleChangeQuestion();
    }
    if (type === 'pass') {
      setLifelines(p => ({ ...p, autoPass: false }));
      handleAnswer(currentQ.correctAnswer);
    }
    if (type === 'revive') {
      setLifelines(p => ({ ...p, revive: false }));
      setIsHalved(true);
      setGameResult('playing');
      setSelectedAnswer(null);
      setAnswerState('none');
    }
  };

  const handleStop = () => {
    if (selectedAnswer || gameResult !== 'playing') return;
    if (confirm("Dừng cuộc chơi?")) setGameResult('stopped');
  };

  const handleChangeQuestion = () => {
    if (!lifelines.changeQuestion || selectedAnswer || gameResult !== 'playing') return;
    const spareQ = questions[15];
    if (spareQ) {
      const newQuestions = [...questions];
      const currentQCopy = { ...newQuestions[currentIndex] };
      newQuestions[currentIndex] = { ...spareQ, number: currentIndex + 1 };
      newQuestions[15] = currentQCopy;
      setQuestions(newQuestions);
      setLifelines(prev => ({ ...prev, changeQuestion: false }));
      setHiddenChoices([]);
      setHintActive(false);
      if (!isMuted) playSound('tick');
    }
  };

  const formatRewardValue = (rewardStr: string) => {
    if (!isHalved) return rewardStr;
    const val = parseFloat(rewardStr.replace(/,/g, ''));
    return (val / 2).toLocaleString('en-US');
  };

  if (gamePhase === 'ready') {
    return (
      <div className="fixed inset-0 bg-[#000830] z-[200] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-2xl w-full text-center space-y-8 animate-in zoom-in duration-700">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.5)] animate-bounce-once"> <Trophy size={64} className="text-white" /> </div>
          <div> <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 mb-4 drop-shadow-sm"> Triệu Phú Toán Học </h1>
            <div className="inline-block px-6 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-md"> <p className="text-blue-200 font-bold uppercase tracking-widest text-sm md:text-base"> {lessonName || `Lớp ${grade} - Tổng hợp`} </p> </div>
          </div>
          <div className="max-w-xl w-full bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl mb-6 mx-auto animate-in slide-in-from-bottom-10 fade-in duration-700 text-left">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400 shrink-0"> <Gift size={24} /> </div>
              <div> <p className="text-white font-bold text-lg leading-tight mb-1">Thử thách & Phần thưởng</p> <p className="text-sm text-gray-300">Hãy vượt qua thử thách và tìm kiếm phần thưởng ẩn <span className="text-yellow-400 font-black">$5,000</span>.</p> </div>
            </div>
          </div>
          <button onClick={() => { setGamePhase('playing'); if (!isMuted) playSound('tick'); }} className="group relative inline-flex items-center justify-center px-8 py-5 text-lg font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:-translate-y-1 shadow-2xl transition-all">
            <span className="mr-3 uppercase tracking-widest">Bắt đầu ngay</span> <Play className="group-hover:translate-x-1 transition-transform" fill="currentColor" />
          </button>
          <button onClick={onClose} className="block mx-auto text-xs text-gray-500 uppercase font-bold hover:text-white transition-colors mt-4">Quay lại Menu</button>
        </div>
      </div>
    );
  }

  if (showHiddenReward) {
    return (
      <div className="fixed inset-0 bg-[#000830]/95 z-[250] flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-500">
        <Confetti density={200} />
        <div className="max-w-3xl w-full transform scale-90 md:scale-100 transition-all">
          <div className="text-center mb-8"> <h2 className="text-3xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 mb-2">Phần Thưởng Ẩn!</h2> <p className="text-blue-200 font-medium italic">Vượt qua 10 câu không dùng trợ giúp!</p> </div>
          <BankCheck amount="5,000" date={new Date().toLocaleDateString('vi-VN')} isBonus={true} />
          <div className="mt-10 text-center">
            <button onClick={() => { setShowHiddenReward(false); setShowSuccessScreen(true); }} className="bg-white text-blue-900 font-black px-10 py-4 rounded-full text-xl shadow-2xl hover:scale-105 transition-all uppercase flex items-center gap-3 mx-auto"> Tiếp tục hành trình <ArrowRight /> </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameResult === 'win' || gameResult === 'stopped' || viewCheckMode) {
    let rawReward = "0";
    if (gameResult === 'win') { rawReward = rewardStrings[14]; }
    else if (gameResult === 'stopped') { rawReward = answerState === 'correct' ? rewardStrings[currentIndex] : (currentIndex > 0 ? rewardStrings[currentIndex - 1] : "0"); }
    else if (gameResult === 'lost' || viewCheckMode) { rawReward = currentIndex >= 10 ? rewardStrings[9] : (currentIndex >= 5 ? rewardStrings[4] : "0"); }
    const finalRewardDisplay = formatRewardValue(rawReward);
    const shortLesson = lessonName ? (lessonName.length > 35 ? lessonName.substring(0, 35) + '...' : lessonName) : 'Tổng hợp';
    const checkMemo = `Triệu phú Toán Học - Lớp ${grade} - ${shortLesson}`;
    return (
      <div className="fixed inset-0 bg-[#000830] z-[200] flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
        {(gameResult === 'win' && !viewCheckMode) && <><Confetti density={400} /><ApplauseVisual /></>}
        {(wantsCheck || viewCheckMode) ? (
          <div className="flex flex-col items-center gap-12 w-full animate-in slide-in-from-bottom-20 duration-1000">
            <BankCheck amount={finalRewardDisplay} date={new Date().toLocaleDateString('vi-VN')} memo={checkMemo} />
            <div className="flex gap-4">
              <button onClick={onRestart} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-8 py-4 rounded-2xl shadow-xl transition-all uppercase flex items-center gap-3"><RotateCcw /> TRẬN MỚI</button>
              <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all uppercase text-xs">THOÁT</button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-gradient-to-br from-blue-900 via-blue-950 to-black p-10 rounded-[60px] border-4 border-yellow-500 shadow-2xl text-center animate-in zoom-in duration-500">
            <div className="mb-8">
              {gameResult === 'win' ? <Trophy size={100} className="text-yellow-400 mx-auto animate-bounce mb-6" /> : <Award size={100} className="text-blue-400 mx-auto mb-6" />}
              <h1 className="text-4xl md:text-6xl font-black uppercase text-white mb-4"> {gameResult === 'win' ? 'VÔ ĐỊCH' : 'PHẦN THƯỞNG'} </h1>
              <p className="text-xl md:text-3xl font-black text-yellow-400 mb-2 uppercase">$ {finalRewardDisplay}</p>
              {isHalved && <p className="text-red-400 text-xs font-bold uppercase tracking-widest">(Đã trừ 50% Hồi sinh)</p>}
            </div>
            <div className="flex flex-col md:flex-row gap-4 mt-10">
              <button onClick={onRestart} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-3xl text-xl transition-all flex items-center justify-center gap-3"><RotateCcw /> CHƠI TRẬN MỚI</button>
              <button onClick={onClose} className="px-8 py-5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-3xl uppercase text-xs">MENU</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 bg-[#000830]/90 z-[160] flex items-center justify-center p-6 text-white animate-in zoom-in duration-300">
        <div className="max-w-md w-full bg-gradient-to-b from-blue-900 to-[#000830] border-4 border-green-500 p-10 rounded-[50px] text-center space-y-8 shadow-2xl">
          <div className="bg-green-500 rounded-full w-24 h-24 mx-auto flex items-center justify-center animate-bounce"><CheckSquare size={48} /></div>
          <div> <h2 className="text-3xl font-black uppercase mb-2 text-green-400">CHÍNH XÁC!</h2> <p className="text-white font-bold text-xl">Thưởng: <span className="text-yellow-400">$ {rewardStrings[currentIndex]}</span></p> </div>
          <button onClick={() => { setShowSuccessScreen(false); setCurrentIndex(prev => prev + 1); setSelectedAnswer(null); setAnswerState('none'); setHiddenChoices([]); setHintActive(false); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-3xl text-2xl transition-all transform hover:scale-105">TIẾP THEO</button>
          <button onClick={() => setGameResult('stopped')} className="text-xs uppercase font-black text-gray-500 hover:text-white transition-colors underline">Dừng chơi & bảo toàn</button>
        </div>
      </div>
    );
  }

  if (gameResult === 'lost') {
    let safeIndex = currentIndex >= 10 ? 9 : (currentIndex >= 5 ? 4 : -1);
    const safeMoneyDisplay = formatRewardValue(safeIndex === -1 ? "0" : rewardStrings[safeIndex]);
    const canRevive = lifelines.revive && currentIndex < 12;
    return (
      <div className="fixed inset-0 bg-[#000830] z-[200] flex items-center justify-center p-4 text-white animate-in fade-in duration-500">
        <div className="max-w-xl w-full bg-gradient-to-b from-blue-900 to-[#000830] border-4 border-red-500 p-8 rounded-[40px] text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-red-600 rounded-full flex items-center justify-center mb-4"><ShieldAlert size={32} /></div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">TIẾC QUÁ!</h2>
          <div className="bg-white/5 p-5 rounded-3xl text-left border border-white/10"> <p className="text-[10px] font-black text-orange-400 mb-2 uppercase">Đáp án đúng {currentQ.correctAnswer}:</p> <div className="text-lg md:text-xl mb-4 font-bold text-green-400" dangerouslySetInnerHTML={{ __html: currentQ.choices?.[currentQ.correctAnswer.charCodeAt(0) - 65] || "" }}></div> <div className="text-xs italic bg-black/40 p-4 rounded-xl border-l-4 border-orange-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentQ.explanation }}></div> </div>
          <p className="font-bold text-blue-200 uppercase">Về với: <span className="text-orange-400 text-2xl font-black">$ {safeMoneyDisplay}</span></p>
          <div className="flex flex-col gap-4">
            {canRevive && <button onClick={() => handleUseLifeline('revive')} className="bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-2xl uppercase italic shadow-xl text-xs">SỬ DỤNG HỒI SINH</button>}
            <button onClick={onRestart} className="bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm">TRẬN MỚI</button>
            <button onClick={onClose} className="text-xs opacity-50 underline hover:opacity-100 uppercase font-black">Về Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="game-canvas" className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-[#000830] text-white overflow-hidden font-sans">
      {(showCelebration || (currentIndex === 14 && answerState === 'correct')) && <><Confetti density={300} /><ApplauseVisual /></>}
      <div className="w-full md:w-64 flex md:flex-col-reverse justify-between overflow-x-auto no-scrollbar shadow-2xl shrink-0 border-b md:border-b-0 md:border-r border-blue-900 bg-[#001253]">
        <div className="flex md:flex-col-reverse w-max md:w-full p-2 gap-1 md:gap-0">
          {rewardStrings.map((lvl, idx) => (
            <div key={idx} className={`flex items-center gap-3 px-4 py-2 rounded-full text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${currentIndex === idx ? 'bg-orange-500 scale-110 shadow-2xl z-10 border-2 border-white' : (idx < currentIndex ? 'text-orange-300 opacity-60' : 'text-blue-300 opacity-40')} ${idx === 4 || idx === 9 || idx === 14 ? 'border border-yellow-400/50 bg-white/5' : ''}`}>
              <span className="w-4 md:w-6 text-right font-black">{idx + 1}</span> <span className="flex-1">$ {lvl}</span> {(idx === 4 || idx === 9 || idx === 14) && <Crown size={12} className="text-yellow-400" />}
            </div>
          ))}
        </div>
      </div>
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-colors duration-1000 ${isFinalQuestion ? 'bg-black' : 'bg-[#000830]'}`}>
        <div className="absolute top-4 left-4 right-4 flex justify-between z-50">
          <div className="flex gap-2">
            <button onClick={() => setHistoryOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shadow-lg"><History size={20} /></button>
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shadow-lg">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
            <button onClick={triggerMath} className="p-2 bg-blue-600/30 hover:bg-blue-600/60 text-white rounded-full transition-all shadow-lg"><RefreshCw size={20} /></button>
          </div>
          <div className="flex gap-3">
            <button onClick={handleStop} className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-full border-b-4 border-yellow-700 transition-all text-[10px] md:text-xs uppercase"><Wallet size={16} /> Dừng chơi</button>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pt-24 pb-24 md:px-16 flex flex-col no-scrollbar">
          <div className="w-full max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center">
            <div className={`px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-3 mb-8 mx-auto border-2 ${currentIndex === 14 ? 'bg-red-600 border-yellow-400 text-white animate-pulse' : 'bg-blue-900/50 border-blue-400/30 text-blue-200'}`}> <Crown size={14} className={currentIndex === 14 ? "text-yellow-400" : "text-orange-400"} /> {currentIndex === 14 ? "TRẬN CHIẾN CUỐI CÙNG" : `CÂU HỎI SỐ ${currentIndex + 1}`} </div>
            <div className={`bg-gradient-to-b p-8 md:p-14 rounded-[40px] shadow-2xl mb-10 border-y-4 ${isFinalQuestion ? 'from-red-900 to-black border-red-500' : 'from-[#001253] to-[#000830] border-blue-500/30'}`}> <h2 className={`text-white font-serif leading-relaxed text-justify overflow-x-auto no-scrollbar ${isFinalQuestion ? 'text-2xl md:text-4xl font-black italic' : 'text-xl md:text-3xl'}`} dangerouslySetInnerHTML={{ __html: currentQ.content }}></h2> </div>
            {currentQ.hasImage && (
              <div className="mb-10 mx-auto max-w-lg bg-white/10 p-4 rounded-3xl border border-white/20 shadow-inner svg-container" dangerouslySetInnerHTML={{ __html: currentQ.imageDescription! }}></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {currentQ.choices?.map((choice: string, idx: number) => {
                const label = String.fromCharCode(65 + idx);
                if (hiddenChoices.includes(label)) return null;
                const isSelected = selectedAnswer === label;
                const isCorrect = answerState === 'correct' && isSelected;
                const isWrong = answerState === 'wrong' && isSelected;
                return (
                  <button key={idx} disabled={!!selectedAnswer} onClick={() => { if (!isMuted) playSound('tick'); handleAnswer(label); }} className="group relative transition-all transform active:scale-95 duration-200">
                    <div className={`relative border-2 py-5 px-8 rounded-full transition-all duration-300 ${isCorrect ? 'bg-green-600 border-green-400' : isWrong ? 'bg-red-600 border-red-400' : isSelected ? 'bg-orange-500 border-white' : 'bg-blue-950/60 border-blue-500/40 hover:border-white shadow-xl'}`}>
                      <div className="flex items-center gap-4 text-left"> <span className="font-black shrink-0 text-lg md:text-3xl text-orange-400 group-hover:text-white">{label}:</span> <span className="text-white font-medium overflow-x-auto no-scrollbar text-base md:text-2xl" dangerouslySetInnerHTML={{ __html: choice }}></span> </div>
                    </div>
                  </button>);
              })}
            </div>
            {hintActive && <div className="mt-8 p-6 bg-blue-900/40 border-2 border-orange-500/30 rounded-[35px] text-sm md:text-xl italic text-orange-200 overflow-x-auto animate-in slide-in-from-bottom-4 shadow-2xl" dangerouslySetInnerHTML={{ __html: currentQ.hint }}></div>}
          </div>
        </div>
        <div className="w-full bg-black/90 backdrop-blur-2xl border-t border-white/10 p-4 md:p-8 flex justify-around items-center shrink-0 safe-area-bottom shadow-2xl">
          <button onClick={() => handleUseLifeline('5050')} disabled={!lifelines.fiftyFifty || !!selectedAnswer} className={`flex flex-col items-center gap-2 group transition-all ${!lifelines.fiftyFifty ? 'opacity-20 pointer-events-none' : 'hover:scale-110'}`}> <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-blue-500/50 flex items-center justify-center font-black text-xs md:text-2xl transition-all group-hover:bg-blue-500">50:50</div> <span className="text-[10px] uppercase font-black opacity-60">Loại trừ</span> </button>
          <button onClick={() => handleUseLifeline('hint')} disabled={!lifelines.hint || !!selectedAnswer} className={`flex flex-col items-center gap-2 group transition-all ${!lifelines.hint ? 'opacity-20 pointer-events-none' : 'hover:scale-110'}`}> <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-orange-500/50 flex items-center justify-center transition-all group-hover:bg-orange-500"><HelpCircle size={32} /></div> <span className="text-[10px] uppercase font-black opacity-60">Gợi ý</span> </button>
          <button onClick={() => handleUseLifeline('change')} disabled={!lifelines.changeQuestion || !!selectedAnswer} className={`flex flex-col items-center gap-2 group transition-all ${!lifelines.changeQuestion ? 'opacity-20 pointer-events-none' : 'hover:scale-110'}`}> <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-purple-500/50 flex items-center justify-center transition-all group-hover:bg-purple-500"><RefreshCw size={32} /></div> <span className="text-[10px] uppercase font-black opacity-60">Đổi câu</span> </button>
          <button onClick={() => handleUseLifeline('pass')} disabled={!lifelines.autoPass || !!selectedAnswer || isFinalQuestion} className={`flex flex-col items-center gap-2 group transition-all ${(!lifelines.autoPass || isFinalQuestion) ? 'opacity-20 pointer-events-none' : 'hover:scale-110'}`}> <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-green-500/50 flex items-center justify-center transition-all group-hover:bg-green-500"><FastForward size={32} /></div> <span className="text-[10px] uppercase font-black opacity-60">Vượt qua</span> </button>
        </div>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 bg-black/80 z-[180] flex justify-end" onClick={() => setHistoryOpen(false)}>
          <div className="w-4/5 md:w-96 bg-blue-950 h-full p-8 overflow-y-auto animate-in slide-in-from-right duration-400" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10"> <h3 className="font-black uppercase text-base flex items-center gap-3 tracking-tighter text-blue-300"><History size={20} className="text-yellow-400" /> HÀNH TRÌNH </h3> <button onClick={() => setHistoryOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={28} /></button> </div>
            <div className="space-y-6">
              {questions.slice(0, currentIndex).map((q: any, i: number) => (
                <div key={i} className="p-5 rounded-3xl border text-xs bg-white/5 border-white/10"> <p className="font-black text-orange-400 mb-2 uppercase text-[10px]">CÂU {i + 1}</p> <div className="line-clamp-3 opacity-90 mb-4 text-white italic text-sm" dangerouslySetInnerHTML={{ __html: q.content }}></div> <div className="text-[10px] bg-green-900/40 p-4 rounded-2xl text-green-300 border border-green-500/30" dangerouslySetInnerHTML={{ __html: q.explanation }}></div> </div>
              ))}
              {currentIndex === 0 && <p className="text-center text-gray-500 py-20 italic">Bắt đầu để lưu lịch sử.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LessonPicker = ({ grade, selectedLessons, onChange }: { grade: number, selectedLessons: string[], onChange: (lessons: string[]) => void }) => {
  const chapters = getLessonOptions(grade);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const toggleChapter = (chapName: string) => setExpandedChapters(prev => prev.includes(chapName) ? prev.filter(c => c !== chapName) : [...prev, chapName]);
  const toggleLesson = (lesson: string) => { const newSelected = selectedLessons.includes(lesson) ? selectedLessons.filter(l => l !== lesson) : [...selectedLessons, lesson]; onChange(newSelected); };
  const selectAllInChapter = (lessons: string[]) => { const allPresent = lessons.every(l => selectedLessons.includes(l)); if (allPresent) { onChange(selectedLessons.filter(l => !lessons.includes(l))); } else { onChange(Array.from(new Set([...selectedLessons, ...lessons]))); } };
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar border rounded-xl p-2 bg-gray-50/50">
      {chapters.map((chap) => {
        const isExpanded = expandedChapters.includes(chap.name);
        const countInChap = chap.lessons.filter(l => selectedLessons.includes(l)).length;
        return (
          <div key={chap.name} className="border-b last:border-0 border-gray-100 pb-1">
            <div className="flex items-center justify-between p-2 hover:bg-gray-100/50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleChapter(chap.name)}>
              <div className="flex items-center gap-2"> <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-gray-400" /></span> <span className={`text-[11px] font-bold ${countInChap > 0 ? 'text-primary' : 'text-gray-600'}`}>{chap.name.split(':')[0]}</span> {countInChap > 0 && <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-black">{countInChap}</span>} </div>
              <button onClick={(e) => { e.stopPropagation(); selectAllInChapter(chap.lessons); }} className="text-[9px] font-black uppercase text-gray-400 hover:text-primary transition-colors"> {chap.lessons.every(l => selectedLessons.includes(l)) ? 'Bỏ chọn' : 'Chọn hết'} </button>
            </div>
            {isExpanded && (<div className="pl-6 py-1 space-y-1 animate-in slide-in-from-top-2 duration-200"> {chap.lessons.map(less => (<label key={less} className="flex items-center gap-2 py-1 cursor-pointer group"> <input type="checkbox" checked={selectedLessons.includes(less)} onChange={() => toggleLesson(less)} className="rounded text-primary h-3.5 w-3.5 border-gray-300" /> <span className={`text-[11px] transition-colors ${selectedLessons.includes(less) ? 'text-primary font-bold' : 'text-gray-500 group-hover:text-gray-800'}`}>{less}</span> </label>))} </div>)}
          </div>
        );
      })}
    </div>
  );
};

interface SidebarProps {
  config: AppState;
  setConfig: React.Dispatch<React.SetStateAction<AppState>>;
  onGenerate: () => void;
  onStartGame: () => void;
  onVoiceCompose: () => void;
  isListening: boolean;
  isLoading: boolean;
  onShowHistory: () => void;
  onShowBank: () => void;
  onShowStats: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'main' | 'edu' | 'invest';
  setActiveTab: (tab: 'main' | 'edu' | 'invest') => void;
  hideValues: boolean;
  setHideValues: (v: boolean) => void;
  setSelectedStudentId: (id: string | null) => void;
  isViewerMode: boolean;
}

const Sidebar = ({
  config, setConfig, onGenerate, onStartGame, onVoiceCompose, isListening, isLoading,
  onShowHistory, onShowBank, onShowStats, onSync, isSyncing, isOpen, onClose,
  activeTab, setActiveTab, hideValues, setHideValues, setSelectedStudentId,
  isViewerMode
}: SidebarProps) => {
  const [isKeyConfigCollapsed, setIsKeyConfigCollapsed] = useState(() => {
    return localStorage.getItem('alla_key_config_collapsed') === 'true';
  });

  const saveKeyCollapsed = (collapsed: boolean) => {
    setIsKeyConfigCollapsed(collapsed);
    localStorage.setItem('alla_key_config_collapsed', String(collapsed));
  };

  const handleDifficultyChange = (diff: Difficulty) => { setConfig((prev: AppState) => { const exists = prev.selectedDifficulties.includes(diff); if (exists) return { ...prev, selectedDifficulties: prev.selectedDifficulties.filter(d => d !== diff) }; return { ...prev, selectedDifficulties: [...prev.selectedDifficulties, diff] }; }); };
  const handleTypeChange = (type: QuestionType) => { setConfig((prev: AppState) => { const exists = prev.questionTypes.includes(type); if (exists) { if (prev.questionTypes.length === 1) return prev; return { ...prev, questionTypes: prev.questionTypes.filter(t => t !== type) }; } return { ...prev, questionTypes: [...prev.questionTypes, type] }; }); };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in" onClick={onClose} />}
      <div className={`fixed md:relative inset-y-0 left-0 w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto p-4 flex flex-col no-print z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-6 text-primary"> <div className="flex items-center gap-2"><BookOpen size={28} /><h1 className="text-xl font-black uppercase tracking-tighter text-blue-900">Quản Lý Công Việc</h1></div> <button onClick={onClose} className="md:hidden p-2"><X size={24} /></button> </div>
        <div className="space-y-6 flex-1">
          <div className="bg-orange-50 rounded-2xl border border-orange-100 shadow-sm mb-4 overflow-hidden transition-all">
            <div 
              className="p-4 flex justify-between items-center cursor-pointer hover:bg-orange-100/50 transition-colors"
              onClick={() => saveKeyCollapsed(!isKeyConfigCollapsed)}
            >
              <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 pointer-events-none">
                <ShieldAlert size={14} /> Cấu hình Gemini API Key
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-400 opacity-50">{APP_VERSION}</span>
                {isKeyConfigCollapsed ? <ChevronDown size={14} className="text-orange-400" /> : <ChevronUp size={14} className="text-orange-400" />}
              </div>
            </div>
            
            {!isKeyConfigCollapsed && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-orange-400 uppercase mb-1 block">Key Chính (Primary)</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Dán API Key chính..."
                        className="w-full border border-orange-200 rounded-xl p-3 pr-10 text-xs focus:ring-2 ring-orange-500/20 outline-none bg-white shadow-inner"
                        value={config.primaryApiKey || ''}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          setConfig((prev: AppState) => ({ ...prev, primaryApiKey: newKey }));
                          localStorage.setItem('math_app_primary_api_key', newKey);
                        }}
                      />
                      {config.primaryApiKey && (
                        <button
                          onClick={() => {
                            setConfig((prev: AppState) => ({ ...prev, primaryApiKey: '' }));
                            localStorage.removeItem('math_app_primary_api_key');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-300 hover:text-orange-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black text-orange-400 uppercase mb-1 block">Key Phụ (Secondary)</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Dán API Key dự phòng..."
                        className="w-full border border-orange-200 rounded-xl p-3 pr-10 text-xs focus:ring-2 ring-orange-500/20 outline-none bg-white shadow-inner"
                        value={config.secondaryApiKey || ''}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          setConfig((prev: AppState) => ({ ...prev, secondaryApiKey: newKey }));
                          localStorage.setItem('math_app_secondary_api_key', newKey);
                        }}
                      />
                      {config.secondaryApiKey && (
                        <button
                          onClick={() => {
                            setConfig((prev: AppState) => ({ ...prev, secondaryApiKey: '' }));
                            localStorage.removeItem('math_app_secondary_api_key');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-300 hover:text-orange-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black text-cyan-500 uppercase mb-1 block">OpenAI (GPT-4.1 mini) Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Dán OpenAI API Key..."
                        className="w-full border border-cyan-200 rounded-xl p-3 pr-10 text-xs focus:ring-2 ring-cyan-500/20 outline-none bg-white shadow-inner"
                        value={config.openaiApiKey || ''}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          setConfig((prev: AppState) => ({ ...prev, openaiApiKey: newKey }));
                          localStorage.setItem('math_app_openai_api_key', newKey);
                        }}
                      />
                      {config.openaiApiKey && (
                        <button
                          onClick={() => {
                            setConfig((prev: AppState) => ({ ...prev, openaiApiKey: '' }));
                            localStorage.removeItem('math_app_openai_api_key');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-300 hover:text-cyan-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lựa chọn chế độ Key */}
                <div className="mt-4 pt-3 border-t border-orange-100">
                  <label className="text-[9px] font-black text-orange-400 uppercase mb-2 block">Chế độ sử dụng Key</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer transition-colors ${config.selectedKeyMode === 'system' ? 'bg-orange-100/50 font-bold text-orange-700' : 'text-gray-500 hover:bg-orange-50'}`}>
                      <input type="radio" value="system" name="keyMode" 
                        checked={config.selectedKeyMode === 'system'} 
                        onChange={() => {
                          setConfig((prev: AppState) => ({...prev, selectedKeyMode: 'system'}));
                          localStorage.setItem('math_app_selected_key_mode', 'system');
                        }}
                        className="accent-orange-500 w-4 h-4" /> 
                      Sử dụng Key Mặc định (Hệ thống)
                    </label>
                    <label className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer transition-colors ${config.selectedKeyMode === 'primary' ? 'bg-orange-100/50 font-bold text-orange-700' : 'text-gray-500 hover:bg-orange-50'}`}>
                      <input type="radio" value="primary" name="keyMode" 
                        checked={config.selectedKeyMode === 'primary'} 
                        onChange={() => {
                          setConfig((prev: AppState) => ({...prev, selectedKeyMode: 'primary'}));
                          localStorage.setItem('math_app_selected_key_mode', 'primary');
                        }}
                        className="accent-orange-500 w-4 h-4" /> 
                      Sử dụng Key Chính
                    </label>
                    <label className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer transition-colors ${config.selectedKeyMode === 'secondary' ? 'bg-orange-100/50 font-bold text-orange-700' : 'text-gray-500 hover:bg-orange-50'}`}>
                      <input type="radio" value="secondary" name="keyMode" 
                        checked={config.selectedKeyMode === 'secondary'} 
                        onChange={() => {
                          setConfig((prev: AppState) => ({...prev, selectedKeyMode: 'secondary'}));
                          localStorage.setItem('math_app_selected_key_mode', 'secondary');
                        }}
                        className="accent-orange-500 w-4 h-4" /> 
                      Sử dụng Key Phụ (Dự phòng)
                    </label>
                  </div>
                </div>

                <p className="text-[9px] text-orange-400 mt-3 leading-relaxed italic">
                  Alla sẽ tôn trọng tùy chọn trên và chỉ sử dụng đúng Key anh đã chọn.
                </p>
              </div>
            )}
          </div>

          <div className="mb-6 flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
            <button
              onClick={() => setActiveTab('main')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'main' ? 'bg-white text-primary shadow-lg border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <PlusCircle size={14} /> Soạn bài
            </button>
            <button
              onClick={() => setActiveTab('edu')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'edu' ? 'bg-white text-indigo-600 shadow-lg border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users size={14} /> Lớp học
            </button>
            <button
              onClick={() => setActiveTab('invest')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'invest' ? 'bg-[#0a0f19] text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)] border border-cyan-500/30' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <TrendingUp size={14} /> AI Đầu tư
            </button>
          </div>

          <div className={activeTab === 'main' ? 'block space-y-6' : 'hidden'}>
            {config.examType === ExamType.None && (
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Khối lớp</label>
                <div className="mb-4">
                  <select
                    value={config.grade}
                    onChange={(e) => setConfig({ ...config, grade: parseInt(e.target.value), lessons: [] })}
                    className="w-full bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold py-2 px-3 rounded-xl focus:border-primary outline-none transition-all shadow-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>Khối lớp {g}</option>
                    ))}
                  </select>
                </div>
                <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Nội dung bài học (Chọn nhiều)</label>
                <LessonPicker grade={config.grade} selectedLessons={config.lessons} onChange={(lessons) => setConfig({ ...config, lessons })} />
                <div className="mt-3">
                  <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Hoặc nhập yêu cầu riêng</label>
                  <input type="text" placeholder="Nhập chủ đề tùy chỉnh..." className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 ring-primary/20 outline-none" value={config.customLesson} onChange={(e) => setConfig({ ...config, customLesson: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Số câu hỏi</label>
                <input type="number" min={1} max={50} className="w-full border border-gray-300 rounded-lg p-2 font-bold focus:ring-2 ring-primary/20 outline-none" value={config.questionCount} onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Lời giải</label>
                <select className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 ring-primary/20 outline-none" value={config.answerMode} onChange={(e) => setConfig({ ...config, answerMode: e.target.value as AnswerMode })}>
                  <option value={AnswerMode.None}>Không hiển thị</option>
                  <option value={AnswerMode.Basic}>Đáp án ngắn gọn</option>
                  <option value={AnswerMode.Detailed}>Lời giải chi tiết</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest flex items-center justify-between">
                <span>Tỷ lệ hình vẽ (SVG)</span>
                <span className="bg-gray-200 text-gray-700 px-1.5 rounded">{config.imageRatio}%</span>
              </label>
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-gray-400" />
                <input type="range" min="0" max="100" step="10" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" value={config.imageRatio} onChange={(e) => setConfig({ ...config, imageRatio: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Mức độ nhận thức</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(Difficulty).map(diff => (
                  <button key={diff} onClick={() => handleDifficultyChange(diff)} className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${config.selectedDifficulties.includes(diff) ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{diff}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest">Dạng câu hỏi</label>
              <div className="flex flex-wrap gap-1.5">
                {[QuestionType.MultipleChoice, QuestionType.TrueFalse, QuestionType.ShortAnswer].map(qt => (
                  <button key={qt} onClick={() => handleTypeChange(qt)} className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${config.questionTypes.includes(qt) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{qt}</button>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 shadow-sm text-center relative overflow-hidden group">
              <Trophy size={28} className="mx-auto text-purple-600 mb-1" />
              <p className="text-[10px] font-black text-purple-700 uppercase mb-3 tracking-tighter italic">Ai Là Triệu Phú Toán Học</p>
              <button onClick={() => { onStartGame(); onClose(); }} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] uppercase border-b-4 border-indigo-800">BẮT ĐẦU CHƠI</button>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => { onVoiceCompose(); onClose(); }}
              disabled={isLoading || isListening}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black uppercase text-sm transition-all shadow-lg mb-3 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95'}`}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              {isListening ? 'Alla Đang Nghe...' : 'Soạn bằng Giọng nói'}
            </button>

            <button onClick={() => { onGenerate(); onClose(); }} disabled={isLoading} className="w-full bg-primary hover:bg-blue-800 text-white font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-tight transition-all border-b-4 border-blue-900"> {isLoading ? <Loader2 className="animate-spin" /> : <PlusCircle size={22} />} Soạn bộ câu hỏi AI </button>

            <button
              onClick={() => { onSync(); }}
              disabled={isSyncing}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[10px] transition-all border border-blue-100"
            >
              <Cloud className={isSyncing ? "animate-pulse" : ""} size={18} />
              {isSyncing ? "Đang đồng bộ..." : "Đồng bộ đám mây"}
            </button>

            <div className="flex gap-2"> <button onClick={onShowHistory} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 transition-colors"><History size={14} /> Lịch sử</button> <button onClick={onShowBank} className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 rounded-xl text-[10px] border border-amber-200 uppercase flex items-center justify-center gap-1 transition-colors"><Database size={14} /> Kho lưu</button> </div>
            <button onClick={onShowStats} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[10px] transition-all border border-indigo-100">
              <Trophy size={18} />
              Thống kê điểm số
            </button>
          </div>
        </div>
        {!isViewerMode && activeTab === 'edu' && (
          <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-3 text-indigo-900 mb-4">
                <Users size={20} className="shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-tighter">Công cụ lớp học</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => { setHideValues(!hideValues); onClose(); }}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-200 text-indigo-700 font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                >
                  {hideValues ? 'Hiện số dư/học phí' : 'Ẩn số dư/học phí'}
                  <DollarSign size={14} />
                </button>
                <button
                  onClick={() => { setSelectedStudentId(null); onClose(); }}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-200 text-indigo-700 font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
                >
                  Danh sách học sinh
                  <ListChecks size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-3 text-amber-900 mb-4">
                <Calendar size={20} className="shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-tighter">Nhắc nhở học tập</span>
              </div>
              <button
                onClick={() => { triggerMath(); onClose(); }}
                className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200 text-amber-700 font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-all"
              >
                Làm mới dữ liệu
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}
        <div className="mt-auto pt-10 pb-4 text-center opacity-20 select-none">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">Alla System {APP_VERSION}</span>
        </div>
      </div >
    </>
  );
};

// Component bảo vệ nội dung MathJax khỏi React re-render
const MathContent = React.memo(({ html, className }: { html: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
      triggerMath();
    }
  }, [html]);

  return <div ref={ref} className={className} />;
}, (prev, next) => prev.html === next.html);

const QuestionItem = ({ question, onSave, readOnly = false, studentAnswer, onAnswerChange, showResult = false }: any) => {
  const isSvg = question.imageDescription && question.imageDescription.trim().startsWith('<svg');
  const [isSaved, setIsSaved] = useState(false);

  const isTrueFalse = question.type?.includes('Đúng/Sai') || question.type === 'DUNGSAI';
  const isShortAnswer = question.type?.includes('ngắn') || question.type === 'NGANGON';

  return (
    <div className={`mb-12 break-inside-avoid relative group ${readOnly ? 'p-6 border rounded-2xl bg-white mb-6 shadow-sm ' + (showResult ? 'border-gray-200' : 'border-indigo-100 hover:border-indigo-300 transition-colors') : ''}`}>
      {!readOnly && (<div className="absolute -right-3 top-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 no-print"> <button onClick={() => { onSave?.(question); setIsSaved(true); setTimeout(() => setIsSaved(false), 2000); }} className={`p-2.5 rounded-full shadow-lg text-white transition-all transform hover:scale-110 active:scale-90 ${isSaved ? 'bg-green-500' : 'bg-gray-400 hover:bg-primary'}`}> {isSaved ? <CheckSquare size={18} /> : <Save size={18} />} </button> </div>)}
      <div className="flex gap-2 items-baseline mb-4"> <span className="font-black text-primary text-xl">Câu {question.number}.</span> {!readOnly && <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-wider">{question.difficulty}</span>} {readOnly && showResult && <span className="ml-auto text-xs font-bold uppercase px-3 py-1 rounded-full border bg-gray-100 text-gray-500">Đã nộp</span>} </div>
      <MathContent html={question.content} className="text-justify text-gray-900 leading-relaxed text-lg font-serif overflow-x-auto no-scrollbar mb-4" />
      {question.hasImage && (<div className="my-8 mx-auto max-w-full md:max-w-md bg-white p-4 rounded-3xl shadow-sm border border-gray-100 svg-container"> {isSvg ? <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: question.imageDescription! }} /> : <div className="p-8 border-2 border-dashed border-gray-300 rounded-2xl w-full text-center text-xs text-gray-400 font-medium italic">Hình minh họa đề bài</div>} </div>)}

      {/* RENDER DUNG/SAI */}
      {isTrueFalse && question.choices && (
        <div className="flex flex-col gap-3 mt-6 ml-4">
          {question.choices.map((choice: string, idx: number) => {
            const currentAns = studentAnswer ? studentAnswer[idx] : null;
            return (
              <div key={idx} className="flex gap-4 items-start p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <MathContent html={choice} className="flex-1 mt-1 text-lg font-serif overflow-x-auto no-scrollbar" />
                {readOnly && (
                  <div className="flex gap-2 shrink-0">
                    <button disabled={showResult} onClick={() => { const newAns = { ...(studentAnswer || {}) }; newAns[idx] = 'Đ'; onAnswerChange?.(newAns); }} className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-all shadow-sm ${currentAns === 'Đ' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-400 border-gray-200 border hover:bg-green-50 hover:text-green-600 hover:border-green-300'} ${showResult ? 'opacity-70 cursor-not-allowed' : ''}`}>Đ</button>
                    <button disabled={showResult} onClick={() => { const newAns = { ...(studentAnswer || {}) }; newAns[idx] = 'S'; onAnswerChange?.(newAns); }} className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-all shadow-sm ${currentAns === 'S' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-400 border-gray-200 border hover:bg-red-50 hover:text-red-600 hover:border-red-300'} ${showResult ? 'opacity-70 cursor-not-allowed' : ''}`}>S</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER TRA LOI NGAN */}
      {isShortAnswer && (
        <div className="mt-6 ml-4">
          {readOnly ? (
            <input disabled={showResult} type="text" placeholder="Nhập đáp án của em..." value={studentAnswer || ''} onChange={(e) => onAnswerChange?.(e.target.value)} className={`w-full md:w-1/2 border-2 p-3 text-lg font-bold rounded-xl outline-none focus:border-indigo-500 shadow-sm transition-all ${showResult ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-white border-indigo-200 text-indigo-900 focus:ring-4 ring-indigo-500/10'}`} />
          ) : (
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 text-sm font-medium italic w-full md:w-1/2">
              (Học sinh sẽ điền đáp án ngắn vào ô trống này)
            </div>
          )}
        </div>
      )}

      {/* RENDER ABCD */}
      {!isTrueFalse && !isShortAnswer && question.choices && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 mt-6 ml-4">
          {question.choices.map((choice: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = studentAnswer === letter;
            return (
              <div key={idx} onClick={() => { if (readOnly && !showResult) onAnswerChange?.(letter); }} className={`flex gap-3 items-start p-2 rounded-xl transition-all ${readOnly && !showResult ? 'cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100' : 'group/choice'} ${isSelected && readOnly ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : ''}`}>
                <span className={`font-black px-2.5 py-1 rounded-lg text-sm border transition-all shadow-sm ${isSelected && readOnly ? 'bg-indigo-600 text-white border-indigo-700' : (!readOnly ? 'text-gray-900 bg-gray-100 border-gray-200 group-hover/choice:bg-primary group-hover/choice:text-white' : 'text-gray-500 bg-white border-gray-200 group-hover:bg-indigo-100 group-hover:text-indigo-600')}`}>
                  {letter}.
                </span>
                <MathContent html={choice} className={`text-lg font-serif overflow-x-auto no-scrollbar mt-0.5 transition-colors ${isSelected && readOnly ? 'text-indigo-900' : (!readOnly ? 'group-hover/choice:text-primary' : 'text-gray-700')}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [config, setConfig] = useState<AppState>({
    grade: 12,
    questionCount: 10,
    selectedDifficulties: [Difficulty.NB, Difficulty.TH],
    lessons: [],
    customLesson: '',
    questionTypes: [QuestionType.MultipleChoice],
    answerMode: AnswerMode.Basic,
    imageRatio: 0,
    examType: ExamType.None,
    imageMode: ImageMode.None,
    gameStatus: GameStatus.Idle,
    primaryApiKey: localStorage.getItem('math_app_primary_api_key') || '',
    secondaryApiKey: localStorage.getItem('math_app_secondary_api_key') || '',
    openaiApiKey: localStorage.getItem('math_app_openai_api_key') || '',
    selectedKeyMode: (localStorage.getItem('math_app_selected_key_mode') as 'system' | 'primary' | 'secondary') || 'system'
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    return storageService.getHistoryLocal() || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States cho tính năng Chia sẻ bài tập qua Link
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [shareConfig, setShareConfig] = useState<any>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("AI Đang soạn thảo...");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [managementStudents, setManagementStudents] = useState<StudentFromManagement[]>([]);
  const [selectedStudentIdForShare, setSelectedStudentIdForShare] = useState<string>("");
  const [statsMonth, setStatsMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [statsClass, setStatsClass] = useState<string>("All");

  // States cho Học sinh làm bài
  // --- QUẢN LÝ HỌC TẬP STATE ---
  const [activeTab, setActiveTab] = useState<'main' | 'edu' | 'invest'>('main');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [hideValues, setHideValues] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'loading' | 'success' | 'error'>('idle');
  const [isChatOpen, setIsChatOpen] = useState(false);


  // Khôi phục và đồng bộ realtime từ Firebase cho Quản lý học tập
  useEffect(() => {
    const docRef = doc(db, 'appData', 'studentsData_v5');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.students)) {
          setStudents(data.students);
          setManagementStudents(data.students as any); // Sync với dropdown chia sẻ
        }
      }
    }, (error) => {
      console.error("Lỗi Firebase Sync Education:", error);
    });

    return () => unsubscribe();
  }, []);

  // Các hàm logic cho Quản lý học tập
  const addStudent = async (name: string, className: string, baseSalary: number, schedules: Schedule[]) => {
    if (!name?.trim()) return;
    const newStudent: Student = {
      id: "std_" + Date.now().toString(),
      fullName: name.trim(),
      className: className || 'Lớp 1',
      baseSalary: baseSalary || 0,
      schedules: Array.isArray(schedules) ? schedules : [],
      history: []
    };
    const next = [...students, newStudent];
    setStudents(next);
    await firebaseService.syncManagementData(next);
  };

  const updateStudent = async (id: string, name: string, className: string, baseSalary: number, schedules: Schedule[]) => {
    const next = students.map(s =>
      s.id === id ? { ...s, fullName: name.trim(), className, baseSalary, schedules } : s
    );
    setStudents(next);
    await firebaseService.syncManagementData(next);
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('Xóa học sinh này?')) {
      const next = students.filter(s => s.id !== id);
      setStudents(next);
      if (selectedStudentId === id) setSelectedStudentId(null);
      await firebaseService.syncManagementData(next);
    }
  };

  const saveRecord = async (recordData: Omit<StudyRecord, 'id'> | StudyRecord) => {
    if (!selectedStudentId) return;
    const next = students.map(s => {
      if (s.id !== selectedStudentId) return s;
      let newHistory = [...(s.history || [])];
      if ('id' in recordData && recordData.id) {
        newHistory = newHistory.map(r => r.id === recordData.id ? (recordData as StudyRecord) : r);
      } else {
        const newRecord = { ...recordData, id: "rec_" + Date.now().toString() } as StudyRecord;
        newHistory.push(newRecord);
      }
      return { ...s, history: newHistory };
    });
    setStudents(next);
    await firebaseService.syncManagementData(next);
    setIsAddingRecord(false);
    setEditingRecord(null);
  };

  const deleteRecord = async (recordId: string) => {
    if (!selectedStudentId) return;
    const next = students.map(s => {
      if (s.id !== selectedStudentId) return s;
      return { ...s, history: (s.history || []).filter(r => r.id !== recordId) };
    });
    setStudents(next);
    await firebaseService.syncManagementData(next);
  };

  const selectedStudent = useMemo(() =>
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const calculateScore = () => {
    let totalCorrect = 0;
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return { score: 0, details: {} };

    const pointsPerQuestion = 10 / totalQuestions;
    const details: Record<string, { isCorrect: boolean, score: number, label: string }> = {};

    questions.forEach(q => {
      const uAns = studentAnswers[q.id];
      const isTrueFalse = q.type?.includes('Đúng/Sai') || q.type === 'DUNGSAI';
      const isShortAnswer = q.type?.includes('ngắn') || q.type === 'NGANGON';

      if (!uAns) {
        details[q.id] = { isCorrect: false, score: 0, label: isTrueFalse ? "Đúng 0/4" : `đáp án ${q.correctAnswer} - Sai` };
        return;
      }

      if (isTrueFalse) {
        // Fallback logic: thử parse từ correctAnswer, nếu không ra gì thì thử explanation
        let tfMap = parseTFCorrectAnswer(String(q.correctAnswer));
        if (Object.keys(tfMap).length < 4 && q.explanation) {
          const fallbackMap = parseTFCorrectAnswer(q.explanation);
          // Lấy map nào có nhiều key hơn
          if (Object.keys(fallbackMap).length > Object.keys(tfMap).length) {
            tfMap = fallbackMap;
          }
        }

        let correctParts = 0;
        const choices = q.choices || [];

        // So sánh bằng cách tìm chữ cái a, b, c, d trong nội dung choice
        choices.forEach((choiceText: string, idx: number) => {
          const studentAns = uAns[idx];
          if (!studentAns) return;

          // Tìm xem choice này là câu a, b, c hay d
          const lowerLevel = choiceText.toLowerCase();
          let letterFound = '';
          ['a', 'b', 'c', 'd'].forEach(l => {
            if (lowerLevel.startsWith(l + ')') || lowerLevel.includes(' ' + l + ')') || lowerLevel.includes('>' + l + ')')) {
              letterFound = l;
            }
          });

          // Nếu không thấy ở đầu, thử regex
          if (!letterFound) {
            const match = lowerLevel.match(/([abcd])\)/);
            if (match) letterFound = match[1];
          }

          if (letterFound && tfMap[letterFound] === studentAns) {
            correctParts++;
          } else if (!letterFound) {
            // Fallback: nếu không tìm thấy chữ cái trong choice, dùng index dự phòng
            const fallbackLetter = ['a', 'b', 'c', 'd'][idx];
            if (tfMap[fallbackLetter] === studentAns) correctParts++;
          }
        });

        const questionScore = (correctParts / 4) * pointsPerQuestion;
        totalCorrect += (correctParts / 4);
        details[q.id] = {
          isCorrect: correctParts === 4,
          score: Math.round(questionScore * 100) / 100,
          label: `Bảng đáp án - Đúng ${correctParts}/4`
        };
      } else if (isShortAnswer) {
        const isCorr = String(uAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
        if (isCorr) totalCorrect += 1;
        details[q.id] = {
          isCorrect: isCorr,
          score: isCorr ? Math.round(pointsPerQuestion * 100) / 100 : 0,
          label: `đáp án ${q.correctAnswer} - ${isCorr ? 'Đúng' : 'Sai'}`
        };
      } else {
        const isCorr = uAns === q.correctAnswer;
        if (isCorr) totalCorrect += 1;
        details[q.id] = {
          isCorrect: isCorr,
          score: isCorr ? Math.round(pointsPerQuestion * 100) / 100 : 0,
          label: `đáp án ${q.correctAnswer} - ${isCorr ? 'Đúng' : 'Sai'}`
        };
      }
    });

    const finalScore = Math.round((totalCorrect / totalQuestions) * 10 * 10) / 10;
    return { score: finalScore, details };
  };

  // Hàm helper: parse đáp án Đúng/Sai linh hoạt — trả về Map theo chữ cái a, b, c, d
  const parseTFCorrectAnswer = (correctAnswer: string): Record<string, 'Đ' | 'S'> => {
    try {
      const str = correctAnswer;
      const lowerStr = str.toLowerCase();
      const result: Record<string, 'Đ' | 'S'> = {};
      const letters = ['a', 'b', 'c', 'd'];

      // Tìm vị trí của a), b), c), d) trong chuỗi
      const positions: { letter: string; pos: number }[] = [];
      for (const l of letters) {
        const pattern = l + ')';
        let searchFrom = 0;
        while (true) {
          const found = lowerStr.indexOf(pattern, searchFrom);
          if (found === -1) break;
          // Chấp nhận nếu ở đầu, sau dấu cách/phẩy/chấm HOẶC sau dấu ) của LaTeX
          if (found === 0 || /[\s,.;\)]/.test(lowerStr[found - 1])) {
            positions.push({ letter: l, pos: found });
            break;
          }
          searchFrom = found + 1;
        }
      }

      positions.sort((a, b) => a.pos - b.pos);

      // Tách từng đoạn và tìm "đúng"/"sai"
      for (let p = 0; p < positions.length; p++) {
        const start = positions[p].pos;
        const end = p + 1 < positions.length ? positions[p + 1].pos : str.length;
        const segment = str.substring(start, end).toLowerCase();

        // Kiểm tra 40 ký tự đầu của segment
        const head = segment.substring(0, Math.min(40, segment.length));
        if (head.includes('đúng') || head.includes('đ)') || head.match(/[):]\s*đ(?!\w)/)) {
          result[positions[p].letter] = 'Đ';
        } else if (head.includes('sai') || head.includes('s)') || head.match(/[):]\s*s(?!\w)/)) {
          result[positions[p].letter] = 'S';
        } else {
          // Fallback: tìm từ cuối cùng "đúng" hoặc "sai" trong toàn đoạn
          const lastD = segment.lastIndexOf('đúng');
          const lastS = segment.lastIndexOf('sai');
          if (lastD > lastS && lastD !== -1) result[positions[p].letter] = 'Đ';
          else if (lastS !== -1) result[positions[p].letter] = 'S';
        }
      }

      console.log('Alla T/F Parser Result:', result);
      return result;
    } catch (e) {
      console.error("parseTFCorrectAnswer error:", e);
      return {};
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('math_app_history');
    if (saved) setHistory(JSON.parse(saved));

    // Load Custom API Key
    const savedKey = localStorage.getItem('math_app_custom_api_key');
    if (savedKey) {
      setConfig(prev => ({
        ...prev,
        customApiKey: savedKey
      }));
    }

    // Xử lý Share Link — nếu có param ?share=xxx, vào thẳng viewer mode
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('share');
    if (sharedId) {
      setIsViewerMode(true);
      setShowActivateModal(false); // BỎ QUA kích hoạt bản quyền cho học sinh
      setLoadingMessage("Đang mở link bài tập...");
      setIsLoading(true);
      firebaseService.getSharedExam(sharedId).then(data => {
        if (data && data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setShareConfig(data.config);
          setShareId(sharedId); // CRITICAL: Lưu shareId để đảm bảo nộp bài được lưu lên Firebase

          // NEW: Nếu đề có gán cho học sinh cụ thể, tự động điền tên từ hệ thống quản lý
          if (data.config?.assignedStudentId) {
            firebaseService.getManagementStudents().then(allStudents => {
              const student = allStudents.find(s => s.id === data.config.assignedStudentId);
              if (student) {
                setStudentName(student.fullName);
                setStudentClass(student.className || `Lớp ${data.config.grade || 12}`);
              }
            });
          }
        } else {
          alert("Link bài tập không hợp lệ hoặc đã bị xóa!");
          window.location.href = window.location.pathname;
        }
      }).catch(err => {
        console.error("Lỗi khi tải bài tập chia sẻ", err);
        alert("Lỗi khi tải bài tập. Vui lòng thử lại sau.");
      }).finally(() => {
        setIsLoading(false);
      });
    }

    // === FIREBASE SYNC: Tải lịch sử từ Cloud ===
    (async () => {
      try {
        const ownerId = storageService.getOwnerId();
        if (ownerId) {
          const cloudHistory = await firebaseService.getHistory(ownerId);
          if (cloudHistory.length > 0) {
            setHistory(cloudHistory);
            localStorage.setItem('math_app_history', JSON.stringify(cloudHistory));
          }
        }
      } catch (err) {
        console.error("Firebase sync failed, using local:", err);
      }
    })();

    // Nạp danh sách học sinh từ dự án Quản lý học tập
    if (!isViewerMode) {
      firebaseService.getManagementStudents().then(setManagementStudents);
    }

  }, [isViewerMode]);

  // Tự động lưu cấu hình
  useEffect(() => {
    if (config.customApiKey !== undefined) {
      if (config.customApiKey) localStorage.setItem('math_app_custom_api_key', config.customApiKey);
      else localStorage.removeItem('math_app_custom_api_key');
    }
  }, [config.customApiKey]);
  useLayoutEffect(() => {
    const timer = setTimeout(triggerMath, 200);
    return () => clearTimeout(timer);
  }, [questions, gameQuestions, config.gameStatus, config.answerMode, isLoading, isViewerMode]);

  const handleGenerate = async () => {
    if (config.examType === ExamType.None && config.lessons.length === 0 && !config.customLesson) return alert("Vui lòng chọn chủ đề!");
    setLoadingMessage("AI Đang soạn thảo...");
    setIsLoading(true);
    setProgress(0);

    let generatedData: { questions: Question[], historyItem: HistoryItem } | null = null;

    try {
      const session = localStorage.getItem('math_app_license_session');
      if (!session || JSON.parse(session).status !== 'ACTIVE') {
        throw new Error("LICENSE_REQUIRED");
      }

      const CHUNK_SIZE = 10;
      const totalRequested = config.questionCount;
      const chunks = [];
      let rem = totalRequested;
      while (rem > 0) {
        chunks.push(Math.min(rem, CHUNK_SIZE));
        rem -= CHUNK_SIZE;
      }

      let allQuestions: Question[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkSize = chunks[i];
        try {
          const chunkConfig = { ...config, questionCount: chunkSize };
          const res = await generateQuestions(chunkConfig, allQuestions, i + 1);
          allQuestions = [...allQuestions, ...res];
          setProgress(((i + 1) / chunks.length) * 100);
        } catch (err: any) {
          console.error(`Lỗi chunk ${i + 1}:`, err);
          if (allQuestions.length > 0) {
            alert(`AI chỉ tạo được ${allQuestions.length} câu. Phần còn lại bị lỗi: ${err.message}`);
            break;
          }
          throw err;
        }
      }

      const finalQuestions = distributeAnswersEvenly(allQuestions).map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx}`,
        number: idx + 1
      }));

      if (finalQuestions.length === 0) {
        throw new Error("Không tạo được câu hỏi nào. Anh vui lòng thử lại.");
      }

      setQuestions(finalQuestions);
      setProgress(100);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        config: { ...config },
        questions: finalQuestions
      };

      const updated = [newHistoryItem, ...history].slice(0, 15);
      setHistory(updated);
      localStorage.setItem('math_app_history', JSON.stringify(updated));

      // Lưu biến local để upload ngầm sau khi tắt loading
      generatedData = { questions: finalQuestions, historyItem: newHistoryItem };

    } catch (e: any) {
      console.error("Generate Error:", e);
      if (e.message === "LICENSE_REQUIRED") alert("Vui lòng kích hoạt bản quyền!");
      else alert("Lỗi soạn thảo: " + (e.message || "Vui lòng thử lại sau ít phút."));
      setProgress(0);
    } finally {
      setIsLoading(false);
    }

    // Upload Firebase chạy ngầm — KHÔNG block UI
    if (generatedData) {
      firebaseService.saveSharedExam(generatedData.questions, config)
        .then(id => { setShareId(id); console.log("Auto-shared exam ID:", id); })
        .catch(err => console.error("Auto-share failed:", err));

      const ownerId = storageService.getOwnerId();
      if (ownerId) {
        firebaseService.saveHistory(ownerId, generatedData.historyItem).catch(console.error);
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const ownerId = storageService.getOwnerId();
      if (!ownerId) throw new Error("Không xác định được Owner ID.");

      // Đẩy dữ liệu local lên Cloud trước
      await storageService.syncCloud();

      // Rồi kéo dữ liệu từ Cloud về
      const [cloudHistory, cloudBank] = await Promise.all([
        firebaseService.getHistory(ownerId),
        firebaseService.getBank(ownerId)
      ]);

      if (cloudHistory.length > 0) {
        setHistory(prev => {
          const combined = [...cloudHistory, ...prev];
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          const finalSorted = unique.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
          storageService.saveHistoryLocal(finalSorted);
          return finalSorted;
        });
      }

      if (cloudBank.length > 0) {
        const currentLocalBank = storageService.getBank();
        const combinedBank = [...cloudBank, ...currentLocalBank];
        const uniqueBank = Array.from(new Map(combinedBank.map(q => [q.content, q])).values());
        localStorage.setItem('math_app_question_bank_v1', JSON.stringify(uniqueBank));
      }

      alert("Đồng bộ thành công! Dữ liệu đã được cập nhật từ đám mây.");
    } catch (err: any) {
      alert("Lỗi đồng bộ: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShareLink = async () => {
    if (questions.length === 0) return alert("Chưa có đề để chia sẻ!");

    setIsSharing(true);
    try {
      // Tạo shareId ngay lập tức nếu chưa có
      let currentShareId = shareId;
      if (!currentShareId) {
        currentShareId = "share_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        setShareId(currentShareId);
      }

      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${currentShareId}`;

      // Cập nhật shareId vào history gần nhất để tiện xem Bảng Điểm
      if (history.length > 0) {
        const updatedHistory = [...history];
        if (!updatedHistory[0].shareId) {
          updatedHistory[0].shareId = currentShareId;
          if (selectedStudentIdForShare) {
            updatedHistory[0].assignedStudentId = selectedStudentIdForShare;
          }
          setHistory(updatedHistory);
          localStorage.setItem('math_app_history', JSON.stringify(updatedHistory));
          const ownerId = storageService.getOwnerId();
          if (ownerId) firebaseService.saveHistory(ownerId, updatedHistory[0]).catch(console.error);
        }
      }

      // NEW: Giao bài cho học sinh trong hệ thống Quản lý học tập
      if (selectedStudentIdForShare) {
        const student = managementStudents.find(s => s.id === selectedStudentIdForShare);
        if (student) {
          const assignedExam: AssignedExam = {
            id: currentShareId,
            title: config.customLesson || (config.lessons.length > 0 ? config.lessons.join(", ") : "Bài tập Toán"),
            link: shareUrl,
            assignedAt: new Date().toISOString(),
            status: 'assigned'
          };
          try {
            await firebaseService.assignExamToStudent(selectedStudentIdForShare, assignedExam);
            alert(`Đã giao bài cho học sinh: ${student.fullName}`);
          } catch (assignErr) {
            console.error("Lỗi khi giao bài cho học sinh:", assignErr);
          }
        }
      }

      // Copy link cho anh ngay lập tức — KHÔNG CHỜ Firebase
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link đã copy! Đang lưu lên đám mây ngầm...\n" + shareUrl);
      } catch (copyErr) {
        window.prompt("Copy link bên dưới để gửi cho học sinh:", shareUrl);
      }

      // Upload Firebase ngầm với timeout 10 giây
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase timeout")), 10000));
      try {
        const ownerId = storageService.getOwnerId();
        // Đính kèm assignedStudentId vào metadata của đề
        const shareDataConfig = {
          ...config,
          ownerId,
          assignedStudentId: selectedStudentIdForShare || null
        };

        await Promise.race([
          firebaseService.saveSharedExam(questions, shareDataConfig, currentShareId),
          timeoutPromise
        ]);
        console.log("Share saved to Firebase with integration:", currentShareId);
      } catch (firebaseErr) {
        console.error("Firebase share upload failed (link vẫn hoạt động nếu retry):", firebaseErr);
      }
    } catch (err: any) {
      console.error("Share failed:", err);
      alert("Lỗi chia sẻ: " + (err.message || "Không rõ nguyên nhân."));
    } finally {
      setIsSharing(false);
    }
  };

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activationToken, setActivationToken] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const LICENSE_SERVER_URL = 'https://script.google.com/macros/s/AKfycbzojyLK8je1IsaOZWh18ljiw4Nb7sQt4wcWITrn6HmRIAAw2iZ0sw0Z4RBWqf3JIdeDwA/exec';

  const handleActivate = async () => {
    if (!activationToken.trim()) return alert("Vui lòng nhập Token!");

    setIsActivating(true);
    try {
      const { deviceId, fingerprint } = await storageService.getSecurityParams();

      if (!deviceId || !fingerprint) {
        throw new Error("MISSING_SECURITY_INFO");
      }

      // Tạo ownerId từ hash token — tất cả máy cùng token sẽ có cùng ownerId
      const tokenTrimmed = activationToken.trim();
      const tokenBytes = new TextEncoder().encode(tokenTrimmed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', tokenBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const ownerId = 'owner_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);

      const params = new URLSearchParams({
        token: tokenTrimmed,
        deviceId: deviceId,
        fingerprint: fingerprint,
        action: 'activate'
      });

      console.log("Alla Debug - Activating with URL:", `${LICENSE_SERVER_URL}?${params.toString()}`);

      const response = await fetch(`${LICENSE_SERVER_URL}?${params.toString()}`);
      const result = await response.json();
      console.log("Alla Debug - Server Result:", result);

      if (result.status === 'ACTIVE' || result.status === 'SUCCESS' || result.ok === true) {
        localStorage.setItem('math_app_license_session', JSON.stringify({
          status: 'ACTIVE',
          token: tokenTrimmed,
          deviceId,
          fingerprint,
          ownerId, // ID chung cho tất cả các máy cùng token
          expiry: result.expiry || 'Vĩnh viễn'
        }));
        alert("Kích hoạt thành công! Chào mừng anh Thưởng.");
        setShowActivateModal(false);

        // Kích hoạt đồng bộ Cloud ngay lập tức sau khi có License
        setIsSyncing(true);
        storageService.syncCloud().finally(() => setIsSyncing(false));
      } else if (result.error === 'TOKEN_CLONED' || result.message === 'TOKEN_CLONED' || result.status === 'TOKEN_CLONED') {
        localStorage.removeItem('math_app_license_session');
        setShowActivateModal(true);
        alert("LỖI: Token này đã được sử dụng cho thiết bị khác (TOKEN_CLONED). Ứng dụng sẽ bị khóa.");
      } else {
        alert("Lỗi: " + (result.message || result.error || "Token không hợp lệ"));
      }
    } catch (error) {
      console.error("Activation error:", error);
      alert("Lỗi kết nối máy chủ bản quyền.");
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    const checkSecurity = async () => {
      // Đảm bảo sinh fingerprint ngay khi load
      await storageService.getFingerprint();

      // Alla Debug - Kiểm tra biến môi trường (không log giá trị)
      const env = (import.meta as any).env;
      console.log("Alla Debug - [v5.2] Environment Check:", {
        VITE_GEMINI_API_KEY: !!env?.VITE_GEMINI_API_KEY,
        VITE_FIREBASE_API_KEY: !!env?.VITE_FIREBASE_API_KEY,
        BASE_URL: env?.BASE_URL,
        MODE: env?.MODE
      });

      // Nếu đang ở viewer mode (học sinh xem bài), KHÔNG cần kiểm tra bản quyền
      const params = new URLSearchParams(window.location.search);
      if (params.get('share')) {
        return; // Học sinh không cần kích hoạt
      }

      const sessionStr = localStorage.getItem('math_app_license_session');
      if (!sessionStr) {
        setShowActivateModal(true);
        return;
      }

      const session = JSON.parse(sessionStr);
      const { deviceId, fingerprint } = await storageService.getSecurityParams();

      // Kiểm tra tính nhất quán cục bộ
      if (session.deviceId !== deviceId || session.fingerprint !== fingerprint) {
        localStorage.removeItem('math_app_license_session');
        setShowActivateModal(true);
        alert("Phát hiện thay đổi thiết bị hoặc sao chép dữ liệu trái phép. Vui lòng kích hoạt lại.");
        return;
      }

      // Nếu đã có license, thực hiện đồng bộ từ Cloud về máy dùng ownerId
      setIsSyncing(true);
      try {
        await storageService.pullCloud();
        const ownerId = storageService.getOwnerId();
        // Load nhẹ nhàng dưới background
        firebaseService.getHistory(ownerId).then((cloudHistory) => {
          if (cloudHistory.length > 0) {
            setHistory(prev => {
              const combined = [...cloudHistory, ...prev];
              const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
              const finalSorted = unique.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

              // Backup lại xuống local
              storageService.saveHistoryLocal(finalSorted);
              return finalSorted;
            });
          }
        }).catch(err => console.error("Initial history fetch failed:", err));
      } catch (err) {
        console.error("Initial cloud pull failed:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    checkSecurity();
  }, []);

  const handleStartGame = async () => {
    // Kiểm tra bảo mật trước khi cho phép chơi
    const session = localStorage.getItem('math_app_license_session');
    if (!session || JSON.parse(session).status !== 'ACTIVE') {
      return alert("Vui lòng kích hoạt bản quyền để sử dụng tính năng này!");
    }

    setIsLoading(true); setProgress(0);
    const progressTimer = setInterval(() => setProgress(prev => prev >= 98 ? 98 : prev + 4), 500);
    try {
      const res = await generateMillionaireQuestions(config.grade, config.lessons.length > 0 ? config.lessons : [config.customLesson || "Tổng hợp"], config);
      const balancedRes = distributeAnswersEvenly(res);
      setGameQuestions(balancedRes);
      setConfig(prev => ({ ...prev, gameStatus: GameStatus.Playing }));

      // Tự động lưu Cloud dùng ownerId -> Giờ đổi thành lưu Local rồi syncCloud lo
      const historyRecord = {
        id: 'game_' + Date.now(),
        timestamp: Date.now(),
        config: { ...config },
        questions: balancedRes
      };

      setHistory(prev => {
        const newHist = [historyRecord, ...prev].slice(0, 20);
        storageService.saveHistoryLocal(newHist);
        return newHist;
      });

      const ownerId = storageService.getOwnerId();
      if (ownerId) {
        firebaseService.saveHistory(ownerId, historyRecord).catch(console.error);
      }
    } catch (e) { alert("Lỗi trò chơi: " + (e as Error).message); } finally { clearInterval(progressTimer); setIsLoading(false); }
  };

  const handleBackup = () => { const data = storageService.getBank(); const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'math_bank.json'; a.click(); };

  const handleExportHTML = () => {
    const title = `Phiếu Bài Tập Toán Lớp ${config.grade} - ${config.customLesson || (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp")}`;
    const questionsHtml = questions.map(q => `
                    <div class="question-item">
                      <div style="font-weight: bold; float: left; margin-right: 5px;">Câu ${q.number}.</div>
                      <div style="text-align: justify; display: inline;"> ${q.content} </div>
                      ${q.hasImage && q.imageDescription ? `<div class="image-container">${q.imageDescription}</div>` : ''}
                      ${q.choices ? `<div class="choices-container"> ${q.choices.map((c, i) => `<div class="choice"><b>${String.fromCharCode(65 + i)}.</b> ${c}</div>`).join('')} </div>` : ''}
                    </div>
                    `).join('');
    const answersTableHtml = `<table class="answer-table"> <tr class="answer-header"> ${questions.map(q => `<td>${q.number}</td>`).join('')} </tr> <tr> ${questions.map(q => `<td><b>${q.correctAnswer}</b></td>`).join('')} </tr> </table>`;
    const detailedSolutionsHtml = config.answerMode === AnswerMode.Detailed ? `<div style="margin-top: 20px;"> <h3>LỜI GIẢI CHI TIẾT</h3> ${questions.map(q => `<div class="explanation-item"> <div class="explanation-label">Câu ${q.number}:</div> <div>${q.explanation}</div> </div>`).join('')} </div>` : '';
    const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="vi">
                      <head>
                        <meta charset="UTF-8">
                          <title>${title}</title>
                          <style>
                            @page {size: A4; margin: 20mm; }
                            body {font - family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.3; color: #000; background: white; }
                            .header {text - align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                            .header h1 {font - size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase; }
                            .header p {font - size: 14pt; font-style: italic; margin: 5px 0 0 0; }
                            .question-item {margin - bottom: 12px; page-break-inside: avoid; clear: both; }
                            .choices-container {display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin-top: 5px; margin-left: 20px; }
                            .image-container {text - align: center; margin: 10px 0; }
                            .image-container svg {max - height: 250px; width: auto; max-width: 100%; overflow: visible; }
                            .answer-section {page -break-before: always; margin-top: 20px; }
                            .answer-table {width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12pt; text-align: center; }
                            .answer-table td, .answer-table th {border: 1px solid #000; padding: 4px; }
                            .answer-header {background - color: #f0f0f0; font-weight: bold; }
                            .explanation-item {margin - bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; page-break-inside: avoid; }
                            .explanation-label {font - weight: bold; color: #000; text-decoration: underline; }
                            mjx-container {font - size: 100% !important; }
                          </style>
                          <script> window.MathJax = {tex: {inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']], processEscapes: true }, svg: {fontCache: 'global' }, startup: {typeset: true} }; </script>
                          <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
                      </head>
                      <body>
                        <div class="header">
                          <h1>Phiếu Bài Tập Toán Lớp ${config.grade}</h1>
                          <p>${config.customLesson || (config.lessons.length > 0 ? config.lessons.join(", ") : "Tổng hợp")}</p>
                          <div style="margin-top: 15px; font-weight: bold; font-size: 14pt; display: flex; justify-content: space-between; padding: 0 40px; text-align: left;">
                            <span>Họ và tên: ....................................................................</span>
                            <span>Lớp: ${config.grade}............</span>
                          </div>
                        </div>
                        ${questionsHtml}
                        <div class="answer-section"> <div class="header" style="border:none; margin-bottom:10px;"><h3>BẢNG ĐÁP ÁN</h3></div> ${answersTableHtml} ${detailedSolutionsHtml} </div>
                      </body>
                    </html>
                    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Phieu_Lop_${config.grade}.html`;
    link.click();
  };

  const handleShowStats = async () => {
    const ownerId = storageService.getOwnerId();
    if (!ownerId) return alert("Anh cần kích hoạt bản quyền để sử dụng tính năng này nhé.");

    setIsLoading(true);
    setLoadingMessage("Đang tải dữ liệu thống kê...");
    try {
      const results = await firebaseService.getGlobalResults(ownerId);
      setGlobalResults(results);
      setShowStatsModal(true);
    } catch (err) {
      alert("Lỗi khi tải dữ liệu thống kê!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceCompose = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Trình duyệt của anh không hỗ trợ giọng nói. Anh dùng Chrome hoặc Edge nhé!");

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    let silenceTimer: any = null;
    let fullTranscript = "";
    const SILENCE_LIMIT = 2000; // 2 giây im lặng

    const stopRecognition = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      recognition.stop();
    };

    recognition.onstart = () => {
      setIsListening(true);
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(stopRecognition, SILENCE_LIMIT + 1000);
    };

    recognition.onresult = (event: any) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(stopRecognition, SILENCE_LIMIT);

      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript;
        } else {
          currentTranscript += event.results[i][0].transcript;
        }
      }
      const combined = (fullTranscript + currentTranscript).toLowerCase();
      console.log("Alla Dynamic Voice:", combined);

      // Điều kiện kích hoạt đặc biệt: Nếu nghe thấy cụm từ "bắt đầu đi"
      if (combined.includes("bắt đầu đi") || combined.includes("bắt đầu di")) {
        console.log("Alla Voice: Trigger 'Bắt đầu đi' detected!");
        stopRecognition();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (event.error !== 'no-speech') {
        alert("Lỗi Micro: " + event.error);
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);

      const finalCommand = fullTranscript.trim();
      if (finalCommand.length > 3) {
        setLoadingMessage(`Đang phân tích lệnh: "${finalCommand}"...`);
        setIsLoading(true);

        try {
          const partialConfig = await parseVoiceCommand(finalCommand, config);
          setConfig(prev => {
            const newConfig = { ...prev, ...partialConfig };
            setTimeout(() => {
              handleGenerateWithConfig(newConfig);
            }, 100);
            return newConfig;
          });
        } catch (err) {
          alert("Alla không hiểu lệnh này hoặc lỗi kết nối AI.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    recognition.start();
  };

  // Hàm bổ trợ để generate trực tiếp với config mới
  const handleGenerateWithConfig = async (newConfig: AppState) => {
    setIsLoading(true); setProgress(0);
    const progressTimer = setInterval(() => setProgress(prev => prev >= 98 ? 98 : prev + 4), 500);
    try {
      const res = await generateQuestions(newConfig);
      setQuestions(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const historyRecord = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        config: { ...newConfig },
        questions: res
      };

      setHistory(prev => {
        const newHist = [historyRecord, ...prev].slice(0, 20);
        storageService.saveHistoryLocal(newHist);
        return newHist;
      });

      const ownerId = storageService.getOwnerId();
      if (ownerId) {
        firebaseService.saveHistory(ownerId, historyRecord).catch(console.error);
      }
    } catch (e) {
      alert("Lỗi AI: " + (e as Error).message);
    } finally {
      clearInterval(progressTimer);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 font-sans overflow-hidden">
      <header className="md:hidden bg-primary text-white p-4 flex flex-col gap-4 sticky top-0 z-30 shadow-lg no-print">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-black uppercase"><BookOpen size={24} /> {isViewerMode ? 'BÀI TẬP VỀ NHÀ' : 'Quản Lý Học Tập'}</div>
          <div className="flex items-center gap-2">
            <button onClick={triggerMath} className="p-2 bg-white/20 rounded-full"><RefreshCw size={20} /></button>
            {!isViewerMode && <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu size={28} /></button>}
          </div>
        </div>
        {!isViewerMode && (
          <div className="flex bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('main')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'main' ? 'bg-white text-primary shadow-sm' : 'text-white/70'}`}
            >
              Soạn bài
            </button>
            <button
              onClick={() => setActiveTab('edu')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'edu' ? 'bg-white text-primary shadow-sm' : 'text-white/70'}`}
            >
              Lớp học
            </button>
            <button
              onClick={() => setActiveTab('invest')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'invest' ? 'bg-[#0a0f19] text-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.3)]' : 'text-white/70'}`}
            >
              AI Đầu Tư
            </button>
          </div>
        )}
      </header>
      {!isViewerMode ? (
        <Sidebar
          config={config}
          setConfig={setConfig}
          onGenerate={handleGenerate}
          onStartGame={handleStartGame}
          onVoiceCompose={handleVoiceCompose}
          isListening={isListening}
          isLoading={isLoading}
          onShowHistory={() => setShowHistoryModal(true)}
          onShowBank={() => setShowBankModal(true)}
          onShowStats={handleShowStats}
          onSync={handleSync}
          isSyncing={isSyncing}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hideValues={hideValues}
          setHideValues={setHideValues}
          setSelectedStudentId={setSelectedStudentId}
          isViewerMode={isViewerMode}
        />
      ) : null}
      <main className={`flex-1 overflow-y-auto h-screen relative no-print ${activeTab === 'invest' ? 'bg-[#05070a] p-0' : 'bg-gray-200/40 p-3 md:p-10'}`}>
        {activeTab === 'invest' ? (
          <InvestmentPanel geminiApiKey={config.selectedKeyMode === 'secondary' ? (config.secondaryApiKey || '') : (config.primaryApiKey || '')} openaiApiKey={config.openaiApiKey || ''} />
        ) : activeTab === 'edu' ? (
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-500">
            {/* PHẦN QUẢN LÝ HỌC TẬP - PORTED FROM quanlyhoc */}
            {!selectedStudentId ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <MissingReminders
                  students={students}
                  onSelectStudent={setSelectedStudentId}
                  onAddRecord={() => setIsAddingRecord(true)}
                />

                <DailyReminders
                  students={students}
                  onSelectStudent={setSelectedStudentId}
                  onAddRecord={() => setIsAddingRecord(true)}
                />

                <RevenueBreakdown students={students} hideValues={hideValues} />

                <StudentList
                  students={students || []}
                  onAdd={addStudent}
                  onUpdate={updateStudent}
                  onDelete={deleteStudent}
                  onSelect={(s) => setSelectedStudentId(s.id)}
                  hideValues={hideValues}
                />
              </div>
            ) : (
              <StudentDetails
                student={selectedStudent!}
                onBack={() => setSelectedStudentId(null)}
                onAddRecord={() => setIsAddingRecord(true)}
                onEditRecord={(r) => setEditingRecord(r)}
                onDeleteRecord={deleteRecord}
                hideValues={hideValues}
              />
            )}

            {(isAddingRecord || editingRecord) && selectedStudent && (
              <DailyEntryForm
                student={selectedStudent}
                initialRecord={editingRecord || undefined}
                onSave={recordData => saveRecord(recordData)}
                onClose={() => { setIsAddingRecord(false); setEditingRecord(null); }}
              />
            )}
          </div>
        ) : config.gameStatus === GameStatus.Playing && gameQuestions.length > 0 ? (
          <MillionaireGame questions={gameQuestions} grade={config.grade} lessonName={config.customLesson || (config.lessons.length > 0 ? config.lessons.join(", ") : "")} onClose={() => setConfig(prev => ({ ...prev, gameStatus: GameStatus.Idle }))} onRestart={handleStartGame} />
        ) : questions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-5xl mx-auto animate-in fade-in duration-700">
            <ChatbotPanel 
                isOpen={true} 
                onClose={() => {}} 
                config={config} 
                ownerId={storageService.getOwnerId() || ''} 
                isEmbedded={true} 
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white shadow-2xl p-6 md:p-16 min-h-[29.7cm] rounded-none md:rounded-lg animate-in slide-in-from-bottom-6 duration-500 relative">
            <div className="text-center mb-16 border-b-2 border-black pb-8 relative">
              <h1 className="text-2xl md:text-4xl font-black uppercase font-serif text-gray-900 leading-tight">
                {isViewerMode ? 'PHIẾU BÀI TẬP VỀ NHÀ' : `Phiếu Bài Tập Toán Lớp ${config.grade}`}
              </h1>
              <p className="text-xl text-gray-500 italic font-serif mt-2">
                {isViewerMode ? (shareConfig?.customLesson || 'Bài tập được giao') : (config.customLesson || (config.lessons.length > 0 ? config.lessons.join(", ") : "Kiểm tra kiến thức"))}
              </p>
            </div>

            {/* THÔNG TIN HỌC SINH LÀM BÀI */}
            {isViewerMode && !isSubmitted && (
              <div className="mb-10 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row gap-4 max-w-xl mx-auto shadow-sm no-print">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-indigo-900 mb-2">Họ và Tên Học Sinh <span className="text-gray-400 font-normal ml-2">(không bắt buộc)</span></label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nhập họ tên của em..." className="w-full border-2 border-indigo-200 outline-none focus:border-indigo-500 px-4 py-3 rounded-xl font-medium text-gray-800 shadow-sm transition-all" />
                </div>
              </div>
            )}

            {/* NÚT CHIA SẺ DÀNH CHO GIÁO VIÊN VỚI TÍCH HỢP HỌC SINH */}
            {!isViewerMode && (
              <div className="flex flex-col items-end mb-8 no-print gap-4">
                {managementStudents.length > 0 && (
                  <div className="flex items-center gap-3 bg-indigo-50 p-2 pl-4 rounded-2xl border border-indigo-100 w-full md:w-auto">
                    <span className="text-xs font-black text-indigo-900 uppercase tracking-tighter">Giao cho học sinh:</span>
                    <select
                      value={selectedStudentIdForShare}
                      onChange={(e) => setSelectedStudentIdForShare(e.target.value)}
                      className="bg-white border-2 border-indigo-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-indigo-500 min-w-[200px]"
                    >
                      <option value="">-- Copy link tự do --</option>
                      {managementStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.className})</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleShareLink}
                  disabled={isSharing}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider disabled:opacity-50"
                >
                  {isSharing ? <Loader2 size={16} className="animate-spin" /> : <div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> <span>{selectedStudentIdForShare ? 'Giao Bài & Copy Link' : 'Chia sẻ Link Học Sinh'}</span></div>}
                </button>
              </div>
            )}

            <div className="content-area"> {questions.map(q => <QuestionItem key={q.id} question={q} onSave={!isViewerMode ? (quest: any) => storageService.saveQuestion(quest) : undefined} readOnly={isViewerMode} studentAnswer={studentAnswers[q.id]} onAnswerChange={(val: any) => setStudentAnswers(prev => ({ ...prev, [q.id]: val }))} showResult={isSubmitted} />)}

              {/* PHU LUC LÀM BÀI CHO HỌC SINH */}
              {isViewerMode && !isSubmitted && questions.length > 0 && (
                <div className="mt-12 flex justify-center no-print">
                  <button disabled={isSubmittingResult} onClick={async () => {
                    setIsSubmittingResult(true);
                    try {
                      let finalScore = 0;
                      try {
                        const scoreResult = calculateScore();
                        finalScore = scoreResult.score || 0;
                      } catch (scoreErr) {
                        console.error("Score calculation error:", scoreErr);
                      }

                      console.log("Alla Submit Debug:", { shareId, finalScore, hasConfig: !!shareConfig, ownerId: shareConfig?.ownerId });

                      if (shareId) {
                        const finalName = studentName.trim() || 'Khách';
                        const finalClass = shareConfig?.grade ? `Lớp ${shareConfig.grade}` : 'Không rõ';
                        const ownerId = shareConfig?.ownerId;

                        // Bước 1: Lưu vào đề (bắt buộc)
                        try {
                          await firebaseService.saveStudentResult(shareId, {
                            studentName: finalName,
                            studentClass: finalClass,
                            score: finalScore,
                            answers: studentAnswers
                          });
                        } catch (saveErr: any) {
                          console.warn("Lưu vào shared_exams failed:", saveErr?.message);
                        }

                        // Bước 2: Lưu vào thống kê global (không bắt buộc)
                        if (ownerId) {
                          try {
                            await firebaseService.saveGlobalResult(ownerId, {
                              shareId,
                              studentName: finalName,
                              studentClass: finalClass,
                              score: finalScore,
                              answers: studentAnswers,
                              lessonName: shareConfig?.customLesson || `Bài tập Lớp ${shareConfig?.grade || ''}`
                            });
                          } catch (globalErr: any) {
                            console.warn("Lưu vào globalResults failed (không ảnh hưởng):", globalErr?.message);
                          }
                        }
                        // Bước 3: Đồng bộ điểm vào hồ sơ học sinh (nếu có assignedStudentId)
                        if (shareConfig?.assignedStudentId) {
                          try {
                            await firebaseService.addExamRecordToStudent(shareConfig.assignedStudentId, {
                              title: shareConfig.customLesson || `Bài tập Lớp ${shareConfig.grade}`,
                              score: finalScore,
                              shareId: shareId
                            });
                            console.log("Synced exam result to student history.");
                          } catch (syncErr: any) {
                            console.warn("Đồng bộ điểm vào hồ sơ thất bại:", syncErr?.message);
                          }
                        }
                      } else {
                        console.warn("Alla: shareId is null, cannot save result!");
                      }
                      setIsSubmitted(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch (err: any) {
                      console.error("Submit error:", err);
                      alert("Lỗi nộp bài: " + (err?.message || err?.code || "Firebase không phản hồi. Anh kiểm tra kết nối mạng."));
                    } finally {
                      setIsSubmittingResult(false);
                    }
                  }} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl py-4 px-12 rounded-full shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] border-b-4 border-emerald-800 hover:translate-y-1 hover:border-b-0 transition-all uppercase tracking-widest disabled:opacity-50">
                    {isSubmittingResult ? 'Đang Nộp Bài...' : 'Nộp Bài Ngay'}
                  </button>
                </div>
              )}

              {isViewerMode && isSubmitted && (
                <div className="mt-12 p-8 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-3xl text-center shadow-inner no-print animate-in zoom-in-95 duration-500">
                  <h2 className="text-3xl font-black text-indigo-900 mb-2 uppercase">Kết Quả Làm Bài</h2>
                  <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 my-6 drop-shadow-sm">{calculateScore().score}<span className="text-3xl text-indigo-400">/10</span></div>
                  <p className="text-lg text-indigo-700 font-medium">Bên dưới là đáp án chi tiết. Em hãy đối chiếu với bài làm của mình nhé!</p>
                </div>
              )}

              {/* ĐÁP ÁN VÀ LỜI GIẢI */}
              {((!isViewerMode && config.answerMode !== AnswerMode.None) || (isViewerMode && isSubmitted)) && (
                <div className="mt-20 pt-10 border-t-2 border-dashed border-gray-300 break-before-page">
                  <div className="flex items-center justify-center gap-4 mb-10"> <div className="h-0.5 flex-1 bg-gray-200"></div> <h2 className="text-2xl font-black uppercase tracking-widest text-gray-400">ĐÁP ÁN VÀ LỜI GIẢI</h2> <div className="h-0.5 flex-1 bg-gray-200"></div> </div>
                  <div className="space-y-10">
                    {questions.map(q => {
                      const isTrueFalse = q.type?.includes('Đúng/Sai') || q.type === 'DUNGSAI';
                      const resDetails = calculateScore().details[q.id];

                      let tfAnswers: (string | null)[] = [null, null, null, null];
                      if (isTrueFalse) {
                        let tfMap = parseTFCorrectAnswer(String(q.correctAnswer));
                        if (Object.keys(tfMap).length < 4 && q.explanation) {
                          const fallbackMap = parseTFCorrectAnswer(q.explanation);
                          if (Object.keys(fallbackMap).length > Object.keys(tfMap).length) {
                            tfMap = fallbackMap;
                          }
                        }

                        // Map kết quả vào bảng dựa trên chữ cái trong choice
                        (q.choices || []).forEach((choiceText: string, idx: number) => {
                          const lowerLevel = choiceText.toLowerCase();
                          let letterFound = '';
                          ['a', 'b', 'c', 'd'].forEach(l => {
                            if (lowerLevel.startsWith(l + ')') || lowerLevel.includes(' ' + l + ')') || lowerLevel.includes('>' + l + ')')) {
                              letterFound = l;
                            }
                          });
                          if (!letterFound) {
                            const match = lowerLevel.match(/([abcd])\)/);
                            if (match) letterFound = match[1];
                          }

                          const finalLetter = letterFound || ['a', 'b', 'c', 'd'][idx];
                          const ans = tfMap[finalLetter];
                          tfAnswers[idx] = ans === 'Đ' ? 'Đúng' : (ans === 'S' ? 'Sai' : '?');
                        });
                      }

                      return (
                        <div key={`ans_${q.id}`} className="p-6 bg-gray-50 rounded-3xl border border-gray-200">
                          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-black">C{q.number}</div>
                            <span className={`font-black text-lg uppercase ${resDetails?.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                              Câu {q.number}: {resDetails?.label} - {resDetails?.score} điểm
                            </span>
                          </div>

                          {isTrueFalse && (
                            <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                              <table className="w-full text-center text-sm md:text-base">
                                <thead>
                                  <tr className="bg-gray-100/50 text-gray-600 font-bold border-b border-gray-200">
                                    <th className="py-2 border-r border-gray-200 w-1/4">Phát biểu a)</th>
                                    <th className="py-2 border-r border-gray-200 w-1/4">Phát biểu b)</th>
                                    <th className="py-2 border-r border-gray-200 w-1/4">Phát biểu c)</th>
                                    <th className="py-2 w-1/4">Phát biểu d)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="font-black font-serif text-lg">
                                    <td className={`py-3 border-r border-gray-200 ${tfAnswers[0] === 'Đúng' ? 'text-green-600' : 'text-red-500'}`}>{tfAnswers[0]}</td>
                                    <td className={`py-3 border-r border-gray-200 ${tfAnswers[1] === 'Đúng' ? 'text-green-600' : 'text-red-500'}`}>{tfAnswers[1]}</td>
                                    <td className={`py-3 border-r border-gray-200 ${tfAnswers[2] === 'Đúng' ? 'text-green-600' : 'text-red-500'}`}>{tfAnswers[2]}</td>
                                    <td className={`py-3 ${tfAnswers[3] === 'Đúng' ? 'text-green-600' : 'text-red-500'}`}>{tfAnswers[3]}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {(!isViewerMode ? config.answerMode === AnswerMode.Detailed : true) && q.explanation && (
                            <MathContent html={q.explanation} className="text-base text-gray-700 leading-relaxed font-serif bg-white p-5 rounded-2xl border border-gray-100 shadow-inner" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {questions.length > 0 && config.gameStatus === GameStatus.Idle && !isViewerMode && (
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-40">
            <button onClick={handleShareLink} title="Chia sẻ Link cho Phụ huynh/Học sinh" className="bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl border-b-4 border-indigo-800 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>
            <button onClick={triggerMath} title="Làm mới" className="bg-blue-600 text-white p-5 rounded-2xl shadow-2xl border-b-4 border-blue-800"><RefreshCw size={28} /></button>
            <button onClick={handleExportHTML} title="Xuất HTML" className="bg-amber-600 text-white p-5 rounded-2xl shadow-2xl border-b-4 border-amber-800"><FileCode size={28} /></button>
            <button onClick={() => window.print()} title="In" className="bg-green-600 text-white p-5 rounded-2xl shadow-2xl border-b-4 border-green-800"><Printer size={28} /></button>
            <button onClick={handleGenerate} title="Soạn lại" className="bg-primary text-white p-5 rounded-2xl shadow-2xl hover:scale-110 transition-all active:scale-90 border-b-4 border-blue-900"><PlusCircle size={28} /></button>
          </div>
        )}
      </main>
      {isSyncing && (
        <div className="fixed top-24 right-8 z-[60] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-white/90 backdrop-blur-md border border-blue-100 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest whitespace-nowrap">Đang đồng bộ Cloud...</span>
            <CloudLightning size={12} className="text-blue-500 animate-bounce" />
          </div>
        </div>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 border-4 border-white animate-in zoom-in-95">
            <div className="relative w-24 h-24 mx-auto"> <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div> <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent animate-spin"></div> <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-primary">{Math.round(progress)}%</div> </div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{loadingMessage}</h3>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner"><div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
          </div>
        </div>
      )}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg h-full md:max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"> <h2 className="font-black text-sm uppercase text-primary flex items-center gap-2"><History size={18} /> Nhật ký</h2> <button onClick={() => setShowHistoryModal(false)} className="p-2"><X size={24} /></button> </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? <p className="text-center text-gray-400 py-12">Trống</p> : history.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-2xl p-4 hover:border-primary hover:bg-blue-50 cursor-pointer">
                  <div className="flex justify-between items-center" onClick={() => { setQuestions(item.questions); setConfig(item.config); setShowHistoryModal(false); }}>
                    <p className="font-black text-gray-800">Lớp {item.config.grade}</p>
                    <ChevronRight size={16} />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                    {item.shareId && (
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setLoadingMessage("Đang tải bảng điểm...");
                          setIsLoading(true);
                          const res = await firebaseService.getStudentResults(item.shareId!);
                          setResultsData(res);
                          setShowResultsModal(true);
                        } catch (err) {
                          alert("Lỗi tải bảng điểm!");
                        } finally {
                          setIsLoading(false);
                        }
                      }} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-indigo-200 transition-colors">
                        Bảng Điểm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THỐNG KÊ TOÀN DIỆN */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 md:p-10 animate-in fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-full md:max-h-[90vh] flex flex-col overflow-hidden border-4 border-indigo-100">
            <div className="p-8 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h2 className="font-black text-2xl uppercase text-indigo-900 flex items-center gap-3">
                  <Award className="text-indigo-600" size={32} />
                  Báo Cáo Thống Kê Điểm Số
                  <button onClick={handleShowStats} className="ml-2 p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors" title="Làm mới dữ liệu">
                    <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </h2>
                <p className="text-gray-500 font-medium text-sm mt-1">Phân tích kết quả học tập của tất cả học sinh</p>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="p-3 hover:bg-white rounded-full transition-colors shadow-sm"><X size={32} /></button>
            </div>

            {/* BỘ LỌC */}
            <div className="p-6 bg-gray-50/80 border-b flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Lọc theo Tháng</label>
                <input
                  type="month"
                  value={statsMonth}
                  onChange={(e) => setStatsMonth(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl p-3 font-bold text-gray-700 outline-none focus:border-indigo-500 bg-white transition-all shadow-sm"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Lọc theo Lớp</label>
                <select
                  value={statsClass}
                  onChange={(e) => setStatsClass(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl p-3 font-bold text-gray-700 outline-none focus:border-indigo-500 bg-white transition-all shadow-sm"
                >
                  <option value="All">Tất cả các lớp</option>
                  {Array.from(new Set(globalResults.map(r => r.studentClass))).filter(Boolean).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="bg-indigo-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg">
                  <div className="px-2">
                    <p className="text-[10px] font-black uppercase opacity-60">Tổng số bài làm</p>
                    <p className="text-2xl font-black">
                      {globalResults.filter(r => {
                        const dateMatch = r.submittedAt?.startsWith(statsMonth);
                        const classMatch = statsClass === "All" || r.studentClass === statsClass;
                        return dateMatch && classMatch;
                      }).length}
                    </p>
                  </div>
                  <Sparkles size={24} className="mr-2 opacity-50" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {globalResults.length === 0 ? (
                <div className="text-center py-32">
                  <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History size={48} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Chưa có dữ liệu thống kê tập trung.</p>
                  <p className="text-gray-300 text-xs mt-2 italic">Dữ liệu sẽ bắt đầu cập nhật từ các bài nộp mới nhất.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="overflow-x-auto rounded-[30px] border border-gray-200 shadow-xl bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-indigo-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="px-8 py-5">Học Sinh</th>
                          <th className="px-8 py-5">Lớp / Nhãn</th>
                          <th className="px-8 py-5 text-center">Điểm số</th>
                          <th className="px-8 py-5">Thời gian nộp</th>
                          <th className="px-8 py-5">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {globalResults
                          .filter(r => {
                            const dateMatch = r.submittedAt?.startsWith(statsMonth);
                            const classMatch = statsClass === "All" || r.studentClass === statsClass;
                            return dateMatch && classMatch;
                          })
                          .map((res: any, idx: number) => (
                            <tr key={idx} className="hover:bg-indigo-50/50 transition-colors group">
                              <td className="px-8 py-5">
                                <p className="font-black text-gray-900 text-lg">{res.studentName}</p>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase">ID: {res.id?.substring(0, 8)}</p>
                              </td>
                              <td className="px-8 py-5">
                                <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-black uppercase border border-gray-200">
                                  {res.studentClass || 'Tự do'}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-xl shadow-sm ${res.score >= 8 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : res.score >= 5 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                  {res.score}
                                  <span className="text-[10px] opacity-50 uppercase">/ 10</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-gray-500 font-bold text-sm">{new Date(res.submittedAt).toLocaleDateString('vi-VN')}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-medium">{new Date(res.submittedAt).toLocaleTimeString('vi-VN')}</p>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async () => {
                                      setLoadingMessage("Đang tải đề gốc...");
                                      setIsLoading(true);
                                      try {
                                        const data = await firebaseService.getSharedExam(res.shareId);
                                        if (data) {
                                          setQuestions(data.questions);
                                          setShareConfig(data.config);
                                          setStudentAnswers(res.answers || {});
                                          setIsSubmitted(true);
                                          setIsViewerMode(true);
                                          setShowStatsModal(false);
                                        }
                                      } catch (e) { alert("Lỗi tải đề!"); }
                                      finally { setIsLoading(false); }
                                    }}
                                    className="p-3 bg-white border-2 border-gray-200 text-gray-400 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 transition-all group-hover:shadow-md"
                                    title="Xem chi tiết bài làm của em này"
                                  >
                                    <Search size={20} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Bạn có chắc muốn xóa bài làm của học sinh ${res.studentName} không?`)) {
                                        try {
                                          await firebaseService.deleteGlobalResult(res.id);
                                          // Update state local
                                          setGlobalResults(prev => prev.filter(item => item.id !== res.id));
                                        } catch (e) {
                                          alert("Lỗi khi xóa bảng điểm.");
                                        }
                                      }
                                    }}
                                    className="p-3 bg-white border-2 border-gray-200 text-gray-400 rounded-2xl hover:border-red-500 hover:text-red-600 transition-all group-hover:shadow-md"
                                    title="Xóa bài làm này"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL BẢNG ĐIỂM HỌC SINH */}
      {showResultsModal && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-full md:max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
              <h2 className="font-black text-lg uppercase text-indigo-900 flex items-center gap-2">Bảng Điểm Tổng Hợp</h2>
              <button onClick={() => setShowResultsModal(false)} className="p-2"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {resultsData.length === 0 ? (
                <div className="text-center py-20 text-gray-500 font-medium tracking-wide">Chưa có học sinh nào nộp bài ở đề này.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 text-sm font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 border-b">Học Sinh</th>
                        <th className="px-6 py-4 border-b">Lớp</th>
                        <th className="px-6 py-4 border-b text-center">Điểm</th>
                        <th className="px-6 py-4 border-b">Thời gian nộp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultsData.map((res: any, idx: number) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{res.studentName}</td>
                          <td className="px-6 py-4 text-gray-600 font-medium">{res.studentClass}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">{res.score}/10</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(res.submittedAt).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-amber-50"> <div className="flex items-center gap-3 text-amber-800"><Database size={24} /><h2 className="font-black uppercase text-lg">Kho tư liệu</h2></div> <div className="flex gap-2"> <button onClick={handleBackup} className="px-4 py-2 bg-white border border-amber-200 rounded-xl text-[10px] font-black uppercase text-amber-800"><Download size={14} /> Export JSON</button> <button onClick={() => setShowBankModal(false)} className="p-2"><X size={28} /></button> </div> </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-gray-50/50"> {storageService.getBank().length === 0 ? <div className="text-center py-32"><Search size={64} className="mx-auto text-gray-200" /><p className="text-gray-400 uppercase tracking-widest text-xs font-bold">Trống.</p></div> : <div className="grid grid-cols-1 gap-6"> {storageService.getBank().map(q => <QuestionItem key={q.id} question={q} readOnly={true} />)} </div>} </div>
          </div>
        </div>
      )}
      {showActivateModal && (
        <div className="fixed inset-0 bg-[#000000]/95 z-[200] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500 font-sans">
          <div className="bg-gradient-to-b from-[#111928] to-[#0A0F1C] rounded-[32px] w-full max-w-[440px] p-10 text-center border-2 border-cyan-800/40 relative overflow-hidden shadow-[0_0_80px_-15px_rgba(6,182,212,0.3)]">

            {/* Hiệu ứng viền Cyberpunk */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg"></div>

            {/* Icon Khiên Neon */}
            <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full"></div>
              <div className="absolute inset-2 bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-[3px] border-cyan-500 rounded-2xl rotate-45 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
              <ShieldAlert size={52} className="text-cyan-400 relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            </div>

            <h2 className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 uppercase tracking-widest mb-3">Hệ thống bảo mật</h2>
            <p className="text-cyan-100/60 text-[13px] font-medium mb-10 leading-relaxed px-2">Hệ thống bảo mật, bạn cần nhập Key.</p>

            <div className="space-y-4 relative z-10">
              <div className="relative group">
                <input
                  type="text"
                  value={activationToken}
                  onChange={(e) => setActivationToken(e.target.value)}
                  placeholder="Nhập Token của bạn..."
                  className="w-full bg-[#1A253A]/80 border border-cyan-800/60 rounded-xl px-12 py-4 font-bold text-center text-cyan-50 placeholder:text-cyan-700 focus:border-cyan-400 focus:bg-[#1E2E4A]/80 flex items-center outline-none transition-all group-hover:border-cyan-500 shadow-inner"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1.5 items-center">
                  <div className="w-4 h-4 border border-cyan-500 rounded-sm opacity-60"></div>
                  <FileSignature size={18} className="text-cyan-500" />
                </div>
              </div>

              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="relative overflow-hidden w-full bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-black py-4.5 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[13px] group border border-cyan-300/30"
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmZmYwNSIvPjwvc3ZnPg==')] opacity-50 mix-blend-overlay pointer-events-none"></div>
                {isActivating ? <Loader2 className="animate-spin" /> : <>Kích hoạt ngay <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
              </button>

              <div className="flex items-center justify-center gap-4 my-6 opacity-60">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-700"></div>
                <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">OR</span>
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-cyan-700"></div>
              </div>

              <button
                onClick={() => {
                  const input = window.prompt("Dán link bài tập vào đây (hoặc chỉ dán mã share):");
                  if (!input) return;
                  let shareCode = input.trim();
                  const match = shareCode.match(/[?&]share=([^&]+)/);
                  if (match) shareCode = match[1];
                  if (shareCode) {
                    window.location.href = `${window.location.pathname}?share=${shareCode}`;
                  } else {
                    alert("Mã không hợp lệ. Vui lòng thử lại.");
                  }
                }}
                className="w-full bg-[#0F1D15] hover:bg-[#163024] border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-[12px] shadow-[inset_0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]"
              >
                <PenLine size={16} /> Chỉ Phục Vụ Làm Bài
              </button>
            </div>

            <p className="mt-10 text-[9px] font-bold text-cyan-800/60 uppercase tracking-[0.3em]">Xây dựng bởi ThuongVd & Alla {APP_VERSION}</p>
          </div>
        </div>
      )}

      {/* ALLA CHATBOT ASSISTANT - Nút nổi chỉ hiện khi đã có đề bài để tránh trùng lặp */}
      {!isViewerMode && (
        <>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all z-[60] ${
              isChatOpen ? 'bg-red-500 text-white rotate-90' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:scale-110 active:scale-90 hover:shadow-blue-500/40'
            }`}
          >
            {isChatOpen ? <X size={28} /> : <img src="/soanbaitoan/alla-avatar.png" alt="Alla" className="w-full h-full object-cover rounded-2xl animate-pulse" />}
          </button>
          
          <ChatbotPanel 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            config={config}
            ownerId={storageService.getOwnerId() || ''}
          />
        </>
      )}
    </div>
  );
}
