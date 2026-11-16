import { useSyncExternalStore } from "react";
import type { DB, Question, Settings, User } from "../types";
import { SEED_QUESTIONS, CHAPTERS } from "../data";
import { DAY, shuffle, uid } from "./util";

const KEY = "tajwid-pondok:db:v1";
export const DB_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: "system", arabicSize: 26, aiEndpoint: (import.meta.env.VITE_AI_ENDPOINT as string) || "", aiEnabled: true, dailyGoal: 20, showDemo: true,
};

// Hash untuk kata laluan demo "tajwid123" (sha256 dengan garam emel). Dikira semasa seed.
function emptyDB(): DB {
  return {
    version: DB_VERSION, users: [], classes: [], attempts: [], exams: [], review: [], xp: [], badges: [], notes: [], bookmarks: [],
    customNotes: [], customQuestions: [], questionOverrides: {}, hiddenQuestions: [], assignments: [], activity: [], ai: [], aiFeedback: [],
    contentReviews: [], disabledBadges: [], refOverrides: {}, settings: DEFAULT_SETTINGS,
  };
}

let db: DB = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      return { ...emptyDB(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    }
  } catch { /* abaikan */ }
  return emptyDB();
}

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      if (db.activity.length > 800) db.activity = db.activity.slice(-800);
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) { console.warn("Gagal simpan data", e); }
  }, 150);
}

export function getDB() { return db; }
export function setDB(next: DB) { db = next; persist(); listeners.forEach((l) => l()); }
export function update(fn: (d: DB) => void) { const next = structuredClone(db); fn(next); setDB(next); }
export function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export function useDB<T>(sel: (d: DB) => T): T { return useSyncExternalStore(subscribe, () => sel(db)); }
export const useDb = () => useDB((d) => d);

export function resetAll() { localStorage.removeItem(KEY); db = emptyDB(); listeners.forEach((l) => l()); }

// ---------- Soalan (seed + override + tersuai) ----------
let qCache: { o: unknown; c: unknown; h: unknown; list: Question[] } | null = null;
export function allQuestions(d: DB = db): Question[] {
  if (qCache && qCache.o === d.questionOverrides && qCache.c === d.customQuestions && qCache.h === d.hiddenQuestions) return qCache.list;
  const hidden = new Set(d.hiddenQuestions);
  const list = [...SEED_QUESTIONS, ...d.customQuestions]
    .filter((q) => !hidden.has(q.id))
    .map((q) => (d.questionOverrides[q.id] ? { ...q, ...d.questionOverrides[q.id] } : q));
  qCache = { o: d.questionOverrides, c: d.customQuestions, h: d.hiddenQuestions, list };
  return list;
}
/** Soalan yang boleh dilihat pelajar (draf tidak dipaparkan). */
export const publicQuestions = (d: DB = db) => allQuestions(d).filter((q) => q.status !== "draf");
export const questionById = (id: string, d: DB = db) => allQuestions(d).find((q) => q.id === id);

// ---------- Seed data demo ----------
export async function ensureSeed(hash: (email: string, pw: string) => Promise<string>) {
  if (db.users.length) return;
  const d = emptyDB();
  const now = Date.now();
  d.classes = [
    { id: "kelas-a", name: "Kelas Tauliah A (DEMO)", teacherId: "u-guru", demo: true },
    { id: "kelas-b", name: "Kelas Mutaqaddim B (DEMO)", teacherId: "u-guru", demo: true },
  ];
  const mk = async (id: string, name: string, email: string, role: User["role"], avatar: string, classId?: string): Promise<User> => ({
    id, name, email, role, avatar, classId, createdAt: now - 40 * DAY, demo: true, passHash: await hash(email, "tajwid123"),
  });
  d.users = [
    await mk("u-super", "Super Admin (Demo)", "superadmin@demo.my", "superadmin", "🛡️"),
    await mk("u-admin", "Admin Pondok (Demo)", "admin@demo.my", "admin", "🗝️"),
    await mk("u-guru", "Ustaz Demo", "guru@demo.my", "guru", "👳"),
    await mk("u-pelajar", "Pelajar Demo", "pelajar@demo.my", "pelajar", "🧕", "kelas-a"),
  ];
  const names = ["Ahmad Faris", "Nur Aisyah", "Muhammad Irfan", "Siti Khadijah", "Abdullah Hakim", "Fatimah Zahra", "Umar Al-Faruq", "Hafsah Nabilah"];
  const avatars = ["🧑", "🧕", "👦", "👧", "🧔", "🧕", "👨", "👩"];
  const practice = SEED_QUESTIONS.filter((q) => q.source === "latihan");
  names.forEach((n, i) => {
    const id = `u-demo-${i}`;
    d.users.push({ id, name: `${n} (DEMO)`, email: `demo${i}@demo.my`, role: "pelajar", avatar: avatars[i], classId: i % 2 ? "kelas-b" : "kelas-a", createdAt: now - 35 * DAY, demo: true, passHash: "-" });
    const skill = 0.45 + (i % 5) * 0.11;
    const n_ = 25 + i * 9;
    const qs = shuffle(practice, i + 7).slice(0, Math.min(n_, practice.length));
    qs.forEach((q, k) => {
      const ts = now - Math.floor(((k * 37 + i * 13) % 28) * DAY + (k % 7) * 3600_000);
      const correct = ((k * 7 + i * 3) % 100) / 100 < skill;
      d.attempts.push({ id: uid("a"), userId: id, questionId: q.id, chapterId: q.chapterId, correct, score: correct ? 1 : 0, mode: "demo", ts });
      d.xp.push({ id: uid("x"), userId: id, amount: correct ? 10 : 2, reason: "Jawab soalan (demo)", ts });
    });
    CHAPTERS.slice(0, 3 + (i % 6)).forEach((c) => d.notes.push({ userId: id, chapterId: c.id, read: c.sections.map((s) => s.id), ts: now - (i + 2) * DAY }));
    d.xp.push({ id: uid("x"), userId: id, amount: 40 * (3 + (i % 6)), reason: "Membaca nota (demo)", ts: now - (i % 5) * DAY });
  });
  d.activity.push({ id: uid("act"), userId: "u-pelajar", type: "sistem", text: "Akaun demo dicipta. Selamat datang ke Tajwid Pondok!", ts: now });
  d.assignments.push({ id: "as-demo", classId: "kelas-a", teacherId: "u-guru", title: "Latihan Nun Sakinah & Tanwin (DEMO)", questionIds: practice.filter((q) => q.chapterId === "b4").map((q) => q.id), createdAt: now - 2 * DAY, due: new Date(now + 5 * DAY).toISOString().slice(0, 10), note: "Siapkan sebelum kelas Khamis." });
  setDB(d);
}
