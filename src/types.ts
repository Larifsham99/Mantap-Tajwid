// ===== Jenis data teras TAJWID PONDOK =====

export type Role = 'superadmin' | 'admin' | 'guru' | 'pelajar' | 'awam';

export interface User {
  id: string;
  name: string;
  email: string;
  passHash: string;
  role: Role;
  classId?: string;
  avatar: string; // emoji / huruf
  createdAt: number;
  demo?: boolean;
  bio?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId?: string;
  demo?: boolean;
}

/** Status semakan kandungan */
export type ReviewStatus = 'draf' | 'belum_disemak' | 'disemak' | 'diterbitkan';

export interface Reference {
  kitab: string;
  pengarang: string;
  bab?: string;
  halaman?: string; // hanya jika disahkan
  status: 'disahkan' | 'belum_disahkan';
  penyemak?: string;
}

// ----- Nota -----
export interface NoteExample {
  arab: string;
  ref?: string; // cth: al-Baqarah:2
  hukum?: string;
  huraian: string;
}

export interface NoteTable {
  caption?: string;
  head: string[];
  rows: string[][];
}

export interface NoteSection {
  id: string;
  title: string;
  takrif?: string; // takrif istilah (BM)
  takrifArab?: string;
  maksud?: string;
  huraian: string[]; // perenggan
  dhobit?: { arab?: string; teks: string }[];
  pembahagian?: { nama: string; ket: string }[];
  jadual?: NoteTable;
  contoh?: NoteExample[];
  caraBaca?: string;
  kesalahan?: string[];
  perbandingan?: string[];
  pengukuhan?: string[]; // soalan pengukuhan
  ringkas?: string; // nota ringkas
}

export interface Chapter {
  id: string; // b1..b12
  no: number;
  title: string;
  arabTitle: string;
  summary: string;
  icon: string;
  sections: NoteSection[];
  refs: Reference[];
  mindmap: { root: string; branches: { label: string; leaves: string[] }[] };
  flashcards: { front: string; back: string }[];
}

// ----- Soalan -----
export type QType = 'mcq' | 'tf' | 'fill' | 'match' | 'subjective';
export type QSource = 'tauliah' | 'latihan' | 'custom';
export type PracticeKind = 'kefahaman' | 'dhobit' | 'kenal_hukum' | 'perbandingan' | 'umum';

export interface QOption {
  id: string;
  text: string;
  why?: string; // sebab pilihan ini salah/betul
}

export interface Explanation {
  why: string; // mengapa jawapan betul
  concept?: string; // huraian konsep
  identify?: string; // kaedah mengenal pasti hukum
  dhobit?: string;
  examples?: string[];
  confusion?: string; // di mana kekeliruan lazim berlaku
  compare?: string; // perbandingan hukum hampir sama
  refs?: string[];
}

export interface Question {
  id: string;
  source: QSource;
  type: QType;
  kind?: PracticeKind;
  chapterId: string;
  topic?: string;
  difficulty: 1 | 2 | 3;
  marks: number;
  prompt: string;
  arabic?: string; // ayat / kalimah
  arabicRef?: string;
  options?: QOption[];
  answer?: string | string[]; // mcq: id pilihan; tf: 'B'|'S'; fill: jawapan diterima
  pairs?: { left: string; right: string }[]; // match
  modelAnswer?: string; // subjektif — jawapan cadangan
  explanation?: Explanation;
  status: ReviewStatus;
  reviewer?: string;
  reviewNote?: string;
  // khusus tauliah
  year?: number;
  hijri?: string;
  section?: 'A' | 'B';
  qNo?: number; // soalan ke-
  part?: string; // a,b,c..
  demo?: boolean;
  createdBy?: string;
  updatedAt?: number;
}

export interface TauliahPaper {
  year: number;
  hijri: string;
  date?: string;
  penganjur: string;
  subject: string;
  instruction: string;
  duration: string;
  questions: Question[];
  transcriptionNote: string;
}

// ----- Rekod -----
export interface Attempt {
  id: string;
  userId: string;
  questionId: string;
  chapterId: string;
  correct: boolean;
  score: number; // 0..1
  given?: string;
  mode: string;
  ts: number;
  ms?: number;
}

export interface ExamAnswer {
  value?: string;
  correct?: boolean; // objektif
  selfScore?: number; // subjektif — penilaian kendiri (0..marks)
  teacherScore?: number;
  teacherComment?: string;
  flagged?: boolean;
}

export interface ExamSession {
  id: string;
  userId: string;
  title: string;
  config: { count: number; minutes: number; year?: number; chapterId?: string; difficulty?: number; mode: string };
  questionIds: string[];
  answers: Record<string, ExamAnswer>;
  startedAt: number;
  submittedAt?: number;
  score?: number;
  maxScore?: number;
  status: 'berjalan' | 'dihantar' | 'disemak';
}

export interface ReviewItem {
  userId: string;
  questionId: string;
  box: number; // Leitner 0..5
  due: number;
  lapses: number;
  lastTs: number;
  saved?: boolean; // disimpan manual
}

export interface XpTx { id: string; userId: string; amount: number; reason: string; ts: number }
export interface UserBadge { userId: string; badgeId: string; ts: number }
export interface NoteProgress { userId: string; chapterId: string; read: string[]; lastSection?: string; ts: number }
export interface Bookmark { id: string; userId: string; chapterId: string; sectionId?: string; label: string; ts: number; fav?: boolean }
export interface CustomNote { id: string; chapterId: string; title: string; body: string; authorId: string; authorName: string; status: ReviewStatus; ts: number }
export interface Assignment { id: string; classId: string; teacherId: string; title: string; questionIds: string[]; due?: string; createdAt: number; note?: string }
export interface Activity { id: string; userId: string; type: string; text: string; ts: number; link?: string }

export interface AiMessage { role: 'user' | 'assistant'; content: string; ts: number; sources?: string[]; offline?: boolean }
export interface AiConversation { id: string; userId: string; mode: string; title: string; messages: AiMessage[]; ts: number }
export interface AiFeedback { id: string; userId: string; convId: string; msgIndex: number; excerpt: string; reason: string; status: 'baru' | 'disemak' | 'ditolak'; ts: number; reviewer?: string; reviewerNote?: string }

export interface ContentReview { id: string; targetType: 'question' | 'note' | 'answer'; targetId: string; action: string; byId: string; byName: string; note?: string; ts: number }

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  arabicSize: number; // px
  aiEndpoint: string;
  aiEnabled: boolean;
  dailyGoal: number;
  showDemo: boolean;
}

export interface DB {
  version: number;
  users: User[];
  classes: ClassRoom[];
  attempts: Attempt[];
  exams: ExamSession[];
  review: ReviewItem[];
  xp: XpTx[];
  badges: UserBadge[];
  notes: NoteProgress[];
  bookmarks: Bookmark[];
  customNotes: CustomNote[];
  customQuestions: Question[];
  questionOverrides: Record<string, Partial<Question>>;
  hiddenQuestions: string[];
  assignments: Assignment[];
  activity: Activity[];
  ai: AiConversation[];
  aiFeedback: AiFeedback[];
  contentReviews: ContentReview[];
  disabledBadges: string[];
  refOverrides: Record<string, { status: 'disahkan' | 'belum_disahkan'; penyemak?: string; halaman?: string }>;
  settings: Settings;
  sessionUserId?: string;
}
