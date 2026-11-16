import type { Question } from "../types";
import { uid } from "./util";

/** Ekstrak teks daripada PDF (lapisan teks). PDF imbasan tidak mempunyai teks – perlukan AI/OCR. */
export async function extractPdf(file: File): Promise<{ text: string; pages: number; scanned: boolean }> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
  }
  const letters = text.replace(/\s/g, "").length;
  return { text, pages: doc.numPages, scanned: letters < doc.numPages * 40 };
}

export async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return res.value;
}

/**
 * Pecahkan teks kepada soalan draf secara heuristik:
 * - "Soalan 1" / "Soalan Pertama" memulakan blok soalan
 * - "a." "b." "(a)" "1." memulakan bahagian
 * Hasil SENTIASA berstatus "draf" dan mesti disemak & diluluskan admin sebelum diterbitkan.
 */
export function splitQuestions(text: string, meta: { year?: number; chapterId: string; createdBy: string }): Question[] {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const out: Question[] = [];
  let qNo = 0; let cur: string[] = []; let part = "";
  const flush = () => {
    const prompt = cur.join("\n").trim();
    if (prompt.length > 8) out.push({
      id: uid("C-"), source: "custom", type: "subjective", chapterId: meta.chapterId, difficulty: 2, marks: 5, prompt,
      modelAnswer: "", status: "draf", year: meta.year, qNo: qNo || undefined, part: part || undefined, createdBy: meta.createdBy, updatedAt: Date.now(),
      section: qNo && qNo > 3 ? "B" : "A",
    });
    cur = [];
  };
  for (const l of lines) {
    const mQ = l.match(/^(soalan|sual|question)\s*(\d+|pertama|kedua|ketiga|keempat|kelima)/i);
    if (mQ) { flush(); const map: Record<string, number> = { pertama: 1, kedua: 2, ketiga: 3, keempat: 4, kelima: 5 }; qNo = Number(mQ[2]) || map[mQ[2].toLowerCase()] || qNo + 1; part = ""; continue; }
    const mP = l.match(/^\(?([a-h])[).]\s+(.*)$/i);
    if (mP) { flush(); part = mP[1].toLowerCase(); cur.push(mP[2]); continue; }
    cur.push(l);
  }
  flush();
  return out;
}
