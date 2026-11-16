import { chaptersA } from "./notes1";
import { chaptersB } from "./notes2";
import { chaptersC } from "./notes3";
import { practiceQuestions } from "./practice";
import { TAULIAH_QUESTIONS, PAPERS } from "./tauliah";
import type { Chapter } from "../types";

export const CHAPTERS: Chapter[] = [...chaptersA, ...chaptersB, ...chaptersC];
export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);
export const SEED_QUESTIONS = [...practiceQuestions, ...TAULIAH_QUESTIONS];
export { PAPERS };

export const PRACTICE_MODES = [
  { id: "bab", title: "Latihan Mengikut Bab", desc: "Pilih bab dan jawab soalan berkaitan.", icon: "📚" },
  { id: "rawak", title: "Latihan Rawak", desc: "Soalan daripada pelbagai bab.", icon: "🎲" },
  { id: "tahun", title: "Soalan Tahun Terdahulu", desc: "Soalan tauliah Kedah sebenar mengikut tahun (subjektif, semakan kendiri).", icon: "🗂️" },
  { id: "sukar", title: "Latihan Soalan Sukar", desc: "Soalan tahap lanjutan.", icon: "⛰️" },
  { id: "kefahaman", title: "Latihan Kefahaman", desc: "Soalan pemahaman konsep.", icon: "💡" },
  { id: "dhobit", title: "Latihan Dhobit", desc: "Hafal huruf, rumus dan pembahagian.", icon: "🔑" },
  { id: "kenal_hukum", title: "Latihan Kenal Hukum", desc: "Kenal pasti hukum daripada contoh ayat.", icon: "🔍" },
  { id: "tf", title: "Benar atau Salah", desc: "Nilai kenyataan tajwid.", icon: "✔️" },
  { id: "match", title: "Latihan Padanan", desc: "Padankan hukum, definisi dan huruf.", icon: "🔗" },
  { id: "fill", title: "Isi Tempat Kosong", desc: "Lengkapkan definisi atau dhobit.", icon: "✏️" },
  { id: "perbandingan", title: "Latihan Perbandingan", desc: "Bezakan hukum yang hampir sama.", icon: "⚖️" },
  { id: "murajaah", title: "Smart Murajaah", desc: "Ulang soalan yang pernah salah.", icon: "🔁" },
] as const;
