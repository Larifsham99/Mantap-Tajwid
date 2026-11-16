import { CHAPTERS } from "../data";
import type { AiMessage, Question } from "../types";
import { getDB, publicQuestions } from "./store";
import { norm, shuffle } from "./util";
import { supabase } from "./supabase";

export const AI_MODES = [
  { id: "ringkas", label: "Jawapan Ringkas", hint: "Jawapan padat 3–6 baris." },
  { id: "mendalam", label: "Penerangan Mendalam", hint: "Huraian terperinci dengan contoh." },
  { id: "syarah", label: "Syarah Kitab", hint: "Huraian bergaya syarah – nyatakan matan/kitab jika berasaskan nota." },
  { id: "banding", label: "Perbandingan Hukum", hint: "Jadual persamaan & perbezaan." },
  { id: "tutor", label: "Tutor Peribadi", hint: "Bimbingan langkah demi langkah dan soalan semak faham." },
  { id: "pembina", label: "Pembina Latihan", hint: "Jana soalan latihan berserta jawapan." },
] as const;
export type AiMode = (typeof AI_MODES)[number]["id"];

// ---------- Carian nota (RAG ringkas, dijalankan dalam pelayar) ----------
interface Doc { id: string; chapterId: string; title: string; source: string; text: string }
let INDEX: Doc[] | null = null;
function buildIndex(): Doc[] {
  if (INDEX) return INDEX;
  INDEX = CHAPTERS.flatMap((c) => c.sections.map((s) => ({
    id: s.id, chapterId: c.id, title: `${c.title} › ${s.title}`, source: `Nota Tajwid Pondok – Bab ${c.no}: ${s.title}`,
    text: [s.takrif, s.takrifArab, s.maksud, ...s.huraian, ...(s.dhobit?.map((d) => `${d.arab ?? ""} ${d.teks}`) ?? []), ...(s.pembahagian?.map((p) => `${p.nama}: ${p.ket}`) ?? []),
      ...(s.jadual ? [s.jadual.head.join(" | "), ...s.jadual.rows.map((r) => r.join(" | "))] : []), ...(s.contoh?.map((e) => `${e.arab} ${e.hukum ?? ""} ${e.huraian}`) ?? []), ...(s.kesalahan ?? []), ...(s.perbandingan ?? [])].filter(Boolean).join("\n"),
  })));
  // nota tambahan guru yang telah disemak
  getDB().customNotes.filter((n) => n.status === "disemak" || n.status === "diterbitkan").forEach((n) => INDEX!.push({ id: n.id, chapterId: n.chapterId, title: n.title, source: `Nota guru (${n.authorName})`, text: n.body }));
  return INDEX;
}
export const invalidateIndex = () => { INDEX = null; };

const STOP = new Set(["apa", "apakah", "yang", "dan", "atau", "dengan", "bagi", "pada", "ini", "itu", "ialah", "adalah", "dalam", "untuk", "ke", "di", "hukum", "maksud", "terangkan", "jelaskan", "beza", "perbezaan", "antara", "bagaimana", "berikan", "contoh", "saya", "tolong", "sila", "nyatakan"]);
export function searchNotes(q: string, k = 4) {
  const terms = norm(q).split(/[^\p{L}\p{N}']+/u).filter((t) => t.length > 1 && !STOP.has(t));
  if (!terms.length) return [];
  return buildIndex().map((d) => {
    const t = norm(d.title + " " + d.text); const title = norm(d.title);
    let score = 0;
    terms.forEach((w) => { const m = t.split(w).length - 1; score += m + (title.includes(w) ? 6 : 0); });
    return { d, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k).map((x) => x.d);
}

export const SYSTEM_RULES = `Anda ialah "Mursyid Tajwid", tutor ilmu tajwid (riwayat Hafs 'an 'Asim, tariq al-Syatibiyyah) untuk pelajar pondok dan calon tauliah mengajar al-Quran Negeri Kedah. Jawab dalam Bahasa Melayu; tulis teks al-Quran dan istilah Arab dalam tulisan Arab berbaris.
PRINSIP WAJIB:
1. Utamakan NOTA RUJUKAN yang diberikan. Jika jawapan berasaskan nota, sebut sumbernya dalam bahagian "Sumber:".
2. Jangan sekali-kali mereka nama kitab, petikan matan, nombor halaman, atau sanad hadith. Jika tidak pasti, nyatakan "Saya tidak pasti – sila rujuk guru".
3. Asingkan dengan jelas: "Fakta daripada nota" vs "Penerangan tambahan AI".
4. Bagi isu khilaf (fiqh/wajah qiraat), sebut bahawa ia perlu disemak guru bertauliah.
5. Akhiri setiap jawapan dengan peringatan ringkas: "Jawapan AI – sila sahkan dengan guru."`;

export interface AiReply { content: string; sources: string[]; offline: boolean }

export async function askMursyid(mode: AiMode, history: AiMessage[], endpoint: string): Promise<AiReply> {
  const last = history[history.length - 1]?.content ?? "";
  const docs = searchNotes(last, 4);
  const context = docs.map((d, i) => `[${i + 1}] ${d.source}\n${d.text.slice(0, 1800)}`).join("\n\n");
  const ep = endpoint || (import.meta.env.VITE_AI_ENDPOINT as string) || "";
  if (ep) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      else if (import.meta.env.VITE_SUPABASE_ANON_KEY) headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      const res = await fetch(ep, { method: "POST", headers, body: JSON.stringify({ mode, modeHint: AI_MODES.find((m) => m.id === mode)?.hint, context, messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })) }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return { content: data.text, sources: docs.map((d) => d.source), offline: false };
    } catch (e) {
      const off = offlineAnswer(mode, last, docs);
      return { ...off, content: `⚠️ Pelayan AI tidak dapat dihubungi (${(e as Error).message}). Memaparkan jawapan mod luar talian.\n\n` + off.content };
    }
  }
  return offlineAnswer(mode, last, docs);
}

/** Mod luar talian: BUKAN AI generatif – hanya memetik nota yang berkaitan & bank soalan. */
function offlineAnswer(mode: AiMode, _q: string, docs: Doc[]): AiReply {
  const head = "🔌 **Mod luar talian** – AI generatif belum dikonfigurasi. Berikut petikan terus daripada nota aplikasi yang paling berkaitan (tiada penerangan rekaan).\n\n";
  if (mode === "pembina") {
    const ch = docs[0]?.chapterId;
    const pool = publicQuestions().filter((x: Question) => x.source === "latihan" && (!ch || x.chapterId === ch));
    const picks = shuffle(pool).slice(0, 5);
    if (!picks.length) return { content: head + "Tiada soalan latihan berkaitan ditemui.", sources: [], offline: true };
    const body = picks.map((x, i) => {
      const ans = x.type === "mcq" ? x.options?.find((o) => o.id === x.answer)?.text : x.type === "tf" ? (x.answer === "B" ? "Benar" : "Salah") : x.type === "fill" ? (x.answer as string[])[0] : x.pairs?.map((p) => `${p.left} → ${p.right}`).join("; ");
      return `**${i + 1}. ${x.prompt}**${x.arabic ? `\n${x.arabic}` : ""}${x.options ? "\n" + x.options.map((o) => `   (${o.id}) ${o.text}`).join("\n") : ""}\n   ✅ Jawapan: ${ans}`;
    }).join("\n\n");
    return { content: head.replace("petikan terus daripada nota", "soalan daripada bank latihan") + body, sources: ["Bank soalan latihan Tajwid Pondok"], offline: true };
  }
  if (!docs.length) return { content: head + "Maaf, tiada nota yang sepadan dengan soalan anda. Cuba gunakan istilah seperti *ikhfa'*, *mad lazim*, *hamzah wasal*, *waqaf*, atau rujuk menu **Nota Tajwid**.", sources: [], offline: true };
  const take = mode === "ringkas" ? 1 : mode === "banding" ? 3 : 2;
  const body = docs.slice(0, take).map((d) => `### ${d.title}\n${d.text.split("\n").slice(0, mode === "ringkas" ? 4 : 14).join("\n")}`).join("\n\n");
  return { content: head + body + "\n\n_Sumber: " + docs.slice(0, take).map((d) => d.source).join("; ") + "_", sources: docs.slice(0, take).map((d) => d.source), offline: true };
}

/** Ekstrak soalan daripada dokumen menggunakan AI (memerlukan titik akhir AI). Hasil sentiasa DRAF. */
export async function aiExtractQuestions(endpoint: string, input: { text?: string; pdf?: File }): Promise<{ qNo?: number; part?: string; section?: string; prompt: string }[]> {
  const ep = endpoint || (import.meta.env.VITE_AI_ENDPOINT as string) || "";
  if (!ep) throw new Error("Titik akhir AI belum dikonfigurasi (Tetapan › AI).");
  let pdfBase64: string | undefined;
  if (input.pdf) {
    const buf = new Uint8Array(await input.pdf.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    pdfBase64 = btoa(bin);
  }
  const instr = `Ekstrak SEMUA soalan daripada kertas peperiksaan tajwid ini. Jika teks dalam tulisan Jawi, transliterasikan ke Rumi dengan setia tanpa mengubah maksud; kekalkan ayat al-Quran dalam tulisan Arab. JANGAN menjawab soalan dan JANGAN menambah kandungan. Pulangkan HANYA tatasusunan JSON: [{"qNo":1,"part":"a","section":"A","prompt":"..."}]`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (import.meta.env.VITE_SUPABASE_ANON_KEY) headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
  const res = await fetch(ep, { method: "POST", headers, body: JSON.stringify({ mode: "ekstrak", modeHint: "Pengekstrakan soalan – output JSON sahaja", context: "", pdfBase64, messages: [{ role: "user", content: instr + (input.text ? `\n\nTEKS:\n${input.text}` : "") }] }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json(); if (data.error) throw new Error(data.error);
  const m = String(data.text).match(/\[[\s\S]*\]/);
  if (!m) throw new Error("AI tidak memulangkan JSON yang sah.");
  return JSON.parse(m[0]);
}
