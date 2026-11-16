import { useState } from "react";
import type { Question, QType, ReviewStatus } from "../types";
import { CHAPTERS } from "../data";
import { update } from "../lib/store";
import { logReview } from "../lib/actions";
import { useMe, atLeast } from "../lib/auth";
import { toast } from "./ui";

/** Penyunting soalan (seed → disimpan sebagai override; tersuai → disimpan terus). */
export default function QuestionEditor({ q, onDone }: { q: Question; onDone: () => void }) {
  const me = useMe()!;
  const [f, setF] = useState<Question>(structuredClone(q));
  const isAdmin = atLeast(me, "admin");
  const statuses: ReviewStatus[] = isAdmin ? ["draf", "belum_disemak", "disemak", "diterbitkan"] : ["draf", "belum_disemak", "disemak"];
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setF({ ...f, [k]: v });

  function save() {
    if (!f.prompt.trim()) return toast("Soalan tidak boleh kosong", "err");
    if (f.type === "mcq" && (!f.options?.length || !f.answer)) return toast("Soalan objektif perlu pilihan dan jawapan", "err");
    update((d) => {
      const patch = { ...f, updatedAt: Date.now(), reviewer: f.status === "disemak" || f.status === "diterbitkan" ? me.name : f.reviewer };
      if (q.source === "custom" || d.customQuestions.some((x) => x.id === q.id)) {
        const i = d.customQuestions.findIndex((x) => x.id === q.id);
        if (i >= 0) d.customQuestions[i] = patch; else d.customQuestions.push(patch);
      } else {
        d.questionOverrides[q.id] = { prompt: patch.prompt, modelAnswer: patch.modelAnswer, explanation: patch.explanation, status: patch.status, reviewer: patch.reviewer, reviewNote: patch.reviewNote, chapterId: patch.chapterId, difficulty: patch.difficulty, marks: patch.marks, options: patch.options, answer: patch.answer, updatedAt: patch.updatedAt };
      }
      logReview(d, "question", q.id, q.status !== f.status ? `Status: ${q.status} → ${f.status}` : "Disunting", me, f.reviewNote);
    });
    toast("Soalan disimpan"); onDone();
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-4">
        <div><label className="label">Jenis</label><select className="input" value={f.type} disabled={q.source !== "custom"} onChange={(e) => set("type", e.target.value as QType)}><option value="subjective">Subjektif</option><option value="mcq">Objektif</option><option value="tf">Benar/Salah</option><option value="fill">Isi tempat kosong</option></select></div>
        <div><label className="label">Bab</label><select className="input" value={f.chapterId} onChange={(e) => set("chapterId", e.target.value)}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.no}. {c.title}</option>)}</select></div>
        <div><label className="label">Kesukaran</label><select className="input" value={f.difficulty} onChange={(e) => set("difficulty", Number(e.target.value) as 1 | 2 | 3)}><option value={1}>Mudah</option><option value={2}>Sederhana</option><option value={3}>Sukar</option></select></div>
        <div><label className="label">Markah</label><input type="number" className="input" value={f.marks} onChange={(e) => set("marks", Number(e.target.value))} /></div>
      </div>
      {q.source === "custom" && <div className="grid gap-3 sm:grid-cols-3"><div><label className="label">Tahun (jika soalan tauliah)</label><input type="number" className="input" value={f.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : undefined)} /></div><div><label className="label">No. soalan</label><input type="number" className="input" value={f.qNo ?? ""} onChange={(e) => set("qNo", e.target.value ? Number(e.target.value) : undefined)} /></div><div><label className="label">Bahagian (a, b…)</label><input className="input" value={f.part ?? ""} onChange={(e) => set("part", e.target.value)} /></div></div>}
      <div><label className="label">Soalan {q.source === "tauliah" && "(teks asal – ubah hanya untuk membetulkan transkripsi)"}</label><textarea className="input min-h-[110px]" value={f.prompt} onChange={(e) => set("prompt", e.target.value)} /></div>
      {f.type === "mcq" && (
        <div className="space-y-2"><label className="label">Pilihan jawapan (tandakan yang betul)</label>
          {(f.options ?? []).map((o, i) => <div key={o.id} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr]"><label className="flex items-center gap-1"><input type="radio" checked={f.answer === o.id} onChange={() => set("answer", o.id)} /> {o.id.toUpperCase()}</label><input className="input" value={o.text} onChange={(e) => { const opts = [...f.options!]; opts[i] = { ...o, text: e.target.value }; set("options", opts); }} /><input className="input" placeholder="Sebab betul/salah" value={o.why ?? ""} onChange={(e) => { const opts = [...f.options!]; opts[i] = { ...o, why: e.target.value }; set("options", opts); }} /></div>)}
          {(f.options?.length ?? 0) < 5 && <button className="btn btn-ghost !py-1 text-xs" onClick={() => set("options", [...(f.options ?? []), { id: "abcde"[f.options?.length ?? 0], text: "" }])}>+ Pilihan</button>}
        </div>
      )}
      {f.type === "tf" && <div><label className="label">Jawapan</label><select className="input" value={String(f.answer)} onChange={(e) => set("answer", e.target.value)}><option value="B">Benar</option><option value="S">Salah</option></select></div>}
      {f.type === "fill" && <div><label className="label">Jawapan diterima (pisahkan dengan |)</label><input className="input" value={(f.answer as string[] | undefined)?.join("|") ?? ""} onChange={(e) => set("answer", e.target.value.split("|").map((x) => x.trim()).filter(Boolean))} /></div>}
      {f.type === "subjective" && <div><label className="label">Jawapan cadangan / skema</label><textarea className="input min-h-[160px]" value={f.modelAnswer ?? ""} onChange={(e) => set("modelAnswer", e.target.value)} /></div>}
      <div><label className="label">Penerangan (mengapa jawapan betul)</label><textarea className="input min-h-[70px]" value={f.explanation?.why ?? ""} onChange={(e) => set("explanation", { ...(f.explanation ?? { why: "" }), why: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Dhobit</label><input className="input" value={f.explanation?.dhobit ?? ""} onChange={(e) => set("explanation", { ...(f.explanation ?? { why: "" }), dhobit: e.target.value })} /></div>
        <div><label className="label">Rujukan kitab (pisah dengan ;)</label><input className="input" value={f.explanation?.refs?.join("; ") ?? ""} onChange={(e) => set("explanation", { ...(f.explanation ?? { why: "" }), refs: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Status semakan</label><select className="input" value={f.status} onChange={(e) => set("status", e.target.value as ReviewStatus)}>{statuses.map((s) => <option key={s} value={s}>{{ draf: "Draf (tersembunyi)", belum_disemak: "Belum disemak", disemak: "Disemak guru", diterbitkan: "Disahkan & diterbitkan" }[s]}</option>)}</select>{!isAdmin && <div className="mt-1 text-[11px] text-slate-500">Hanya admin boleh menerbitkan (mengesahkan) jawapan.</div>}</div>
        <div><label className="label">Catatan semakan</label><input className="input" value={f.reviewNote ?? ""} onChange={(e) => set("reviewNote", e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={onDone}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
    </div>
  );
}
