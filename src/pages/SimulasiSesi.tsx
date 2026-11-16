import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Flag, Clock, Send } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb, allQuestions } from "../lib/store";
import { examScore, gradeSubjective, saveExamAnswer, submitExam, grade } from "../lib/actions";
import { chapterById } from "../data";
import { Arabic, BarChart, Card, Empty, PageHeader, RichText, cx, Modal } from "../components/ui";
import type { Question } from "../types";

function AnswerInput({ q, value, onChange }: { q: Question; value?: string; onChange: (v: string) => void }) {
  if (q.type === "mcq" || q.type === "tf") {
    const opts = q.type === "tf" ? [{ id: "B", text: "Benar" }, { id: "S", text: "Salah" }] : q.options!;
    return <div className="grid gap-2">{opts.map((o) => <button key={o.id} onClick={() => onChange(o.id)} className={cx("flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm ring-1", value === o.id ? "bg-zamrud-50 ring-2 ring-zamrud-600 dark:bg-zamrud-500/10" : "ring-slate-200 hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/5")}><span className={cx("grid h-7 w-7 place-items-center rounded-full text-xs font-bold", value === o.id ? "bg-zamrud-700 text-white" : "bg-slate-100 dark:bg-white/10")}>{o.id.toUpperCase()}</span><RichText text={o.text} /></button>)}</div>;
  }
  if (q.type === "fill") return <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Jawapan…" />;
  if (q.type === "match") {
    const cur: Record<string, string> = value ? JSON.parse(value) : {};
    const rights = q.pairs!.map((p) => p.right).sort();
    return <div className="space-y-2">{q.pairs!.map((p) => <div key={p.left} className="grid items-center gap-2 sm:grid-cols-2"><RichText text={p.left} className="font-semibold" /><select className="input" value={cur[p.left] ?? ""} onChange={(e) => onChange(JSON.stringify({ ...cur, [p.left]: e.target.value }))}><option value="">— pilih —</option>{rights.map((r) => <option key={r}>{r}</option>)}</select></div>)}</div>;
  }
  return <textarea className="input min-h-[160px]" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Tulis jawapan anda…" />;
}

export default function SimulasiSesi() {
  const { id } = useParams(); const me = useMe()!; const d = useDb();
  const e = d.exams.find((x) => x.id === id);
  const qs = useMemo(() => (e ? e.questionIds.map((qid) => allQuestions(d).find((q) => q.id === qid)!).filter(Boolean) : []), [e?.id, d.questionOverrides]); // eslint-disable-line
  const [i, setI] = useState(0); const [now, setNow] = useState(Date.now()); const [confirm, setConfirm] = useState(false);
  const running = e?.status === "berjalan";
  const left = e ? Math.max(0, Math.round((e.startedAt + e.config.minutes * 60_000 - now) / 1000)) : 0;
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [running]);
  useEffect(() => { if (running && left === 0 && e) submitExam(e.id); }, [running, left, e]);
  if (!e || (e.userId !== me.id && me.role === "pelajar")) return <Empty title="Ujian tidak dijumpai" />;
  const q = qs[i];

  if (running) {
    const ans = e.answers[q.id];
    const answered = qs.filter((x) => e.answers[x.id]?.value).length;
    return (
      <div>
        <PageHeader title={e.title} subtitle={`${answered}/${qs.length} dijawab`} icon="📝" actions={<button className="btn btn-gold" onClick={() => setConfirm(true)}><Send size={16} /> Hantar jawapan</button>} />
        <div className="sticky top-14 z-20 mb-4 flex items-center gap-3 rounded-2xl bg-hutan-900 px-4 py-2 text-white lg:top-2"><Clock size={18} className="text-emas-300" /><span className={cx("font-mono text-lg font-bold", left < 60 && "text-rose-300")}>{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-emas-400" style={{ width: `${(answered / qs.length) * 100}%` }} /></div></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-xs"><span className="chip bg-hutan-900 text-emas-200">Soalan {i + 1}/{qs.length}</span><span className="chip bg-slate-100 dark:bg-white/10">{q.marks} markah</span>{q.source === "tauliah" && <span className="chip bg-emas-100 text-emas-700">Tauliah {q.year} S{q.qNo}({q.part})</span>}
              <button className={cx("ml-auto chip", ans?.flagged ? "bg-amber-400 text-hutan-900" : "bg-slate-100 dark:bg-white/10")} onClick={() => saveExamAnswer(e.id, q.id, { flagged: !ans?.flagged })}><Flag size={12} /> {ans?.flagged ? "Ditanda" : "Tanda untuk semakan"}</button></div>
            <RichText text={q.prompt} className="mb-3 font-semibold" />
            {q.arabic && <Arabic className="mb-3" refText={q.arabicRef}>{q.arabic}</Arabic>}
            <AnswerInput q={q} value={ans?.value} onChange={(v) => saveExamAnswer(e.id, q.id, { value: v })} />
            <div className="mt-4 flex justify-between"><button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Sebelum</button>{i < qs.length - 1 ? <button className="btn btn-primary" onClick={() => setI(i + 1)}>Seterusnya →</button> : <button className="btn btn-gold" onClick={() => setConfirm(true)}>Hantar</button>}</div>
          </Card>
          <Card className="h-fit p-4"><div className="mb-2 text-xs font-bold uppercase text-slate-500">Navigasi soalan</div>
            <div className="grid grid-cols-6 gap-1.5">{qs.map((x, k) => { const a = e.answers[x.id]; return <button key={x.id} onClick={() => setI(k)} className={cx("relative h-9 rounded-lg text-xs font-bold", k === i ? "ring-2 ring-emas-400" : "", a?.value ? "bg-zamrud-600 text-white" : "bg-slate-100 dark:bg-white/10")}>{k + 1}{a?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400" />}</button>; })}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-500"><div>🟩 dijawab · ⬜ belum · 🟨 ditanda</div></div>
          </Card>
        </div>
        <Modal open={confirm} onClose={() => setConfirm(false)} title="Hantar jawapan?"><p className="text-sm">Anda telah menjawab {answered} daripada {qs.length} soalan. {qs.length - answered > 0 && `${qs.length - answered} soalan belum dijawab.`} Jawapan tidak boleh diubah selepas dihantar.</p><div className="mt-4 flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setConfirm(false)}>Kembali</button><button className="btn btn-primary" onClick={() => { submitExam(e.id); setConfirm(false); }}>Hantar sekarang</button></div></Modal>
      </div>
    );
  }

  // ---------- Keputusan ----------
  const sc = examScore(e, qs);
  const byCh = new Map<string, { s: number; m: number }>();
  qs.forEach((x) => { const a = e.answers[x.id]; let s = 0; if (x.type === "subjective") s = a?.teacherScore ?? a?.selfScore ?? 0; else if (a?.value) s = grade(x, x.type === "match" ? JSON.parse(a.value) : a.value).score * x.marks; const c = byCh.get(x.chapterId) ?? { s: 0, m: 0 }; c.s += s; c.m += x.marks; byCh.set(x.chapterId, c); });
  const weak = [...byCh.entries()].filter(([, v]) => v.s / v.m < 0.6);
  const pct = sc.max ? Math.round((sc.score / sc.max) * 100) : 0;
  const mins = Math.round(((e.submittedAt ?? Date.now()) - e.startedAt) / 60000);
  return (
    <div>
      <PageHeader title={`Keputusan: ${e.title}`} subtitle={`Dihantar · ${mins} minit · ${e.status === "disemak" ? "Disemak guru" : sc.pending ? `${sc.pending} soalan subjektif menunggu penilaian` : "Selesai"}`} icon="🏁" actions={<Link to="/simulasi" className="btn btn-ghost">Simulasi baharu</Link>} />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card className="p-6 text-center motif"><div className="text-5xl font-extrabold text-zamrud-700 dark:text-emas-300">{pct}%</div><div className="text-sm text-slate-500">{sc.score} / {sc.max} markah</div><div className="mt-1 text-xs">{pct >= 80 ? "Mumtaz" : pct >= 65 ? "Jayyid jiddan" : pct >= 50 ? "Jayyid" : "Perlu ulang kaji"}</div></Card>
        <Card className="p-5 md:col-span-2"><div className="mb-3 font-bold">Analisis prestasi mengikut bab</div><BarChart data={[...byCh.entries()].map(([k, v]) => ({ label: chapterById(k)?.title ?? k, value: Math.round((v.s / v.m) * 100) }))} />
          {weak.length > 0 && <div className="mt-3 text-sm"><b>Cadangan murajaah:</b> {weak.map(([k]) => <Link key={k} className="mr-2 text-zamrud-700 underline" to={`/nota/${k}`}>{chapterById(k)?.title}</Link>)} · <Link to="/murajaah" className="font-semibold text-emas-700">Buka Murajaah Pintar →</Link></div>}
        </Card>
      </div>
      <div className="space-y-3">
        {qs.map((x, k) => {
          const a = e.answers[x.id];
          const g = x.type !== "subjective" && a?.value ? grade(x, x.type === "match" ? JSON.parse(a.value) : a.value) : null;
          const right = x.type === "mcq" ? x.options?.find((o) => o.id === x.answer)?.text : x.type === "tf" ? (x.answer === "B" ? "Benar" : "Salah") : x.type === "fill" ? (x.answer as string[])[0] : x.type === "match" ? x.pairs?.map((p) => `${p.left} → ${p.right}`).join("; ") : undefined;
          const given = x.type === "mcq" ? x.options?.find((o) => o.id === a?.value)?.text : x.type === "tf" ? (a?.value === "B" ? "Benar" : a?.value === "S" ? "Salah" : "") : a?.value;
          return (
            <Card key={x.id} className={cx("p-4", x.type !== "subjective" && (g?.correct ? "ring-1 ring-zamrud-300" : "ring-1 ring-rose-300"))}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs"><span className="chip bg-hutan-900 text-emas-200">{k + 1}</span><span>{chapterById(x.chapterId)?.title}</span>{x.type !== "subjective" && <span className={cx("chip", g?.correct ? "bg-zamrud-100 text-zamrud-800" : "bg-rose-100 text-rose-700")}>{g?.correct ? "Betul" : a?.value ? "Salah" : "Tidak dijawab"}</span>}</div>
              <RichText text={x.prompt} className="text-sm font-semibold" />
              {x.arabic && <div className="arab-block text-xl">{x.arabic}</div>}
              {x.type !== "subjective" ? (
                <div className="mt-2 space-y-1 text-sm">
                  <div>Jawapan anda: <b>{x.type === "match" && a?.value ? Object.entries(JSON.parse(a.value)).map(([l, r]) => `${l} → ${r}`).join("; ") : given || "—"}</b></div>
                  {!g?.correct && <div className="text-zamrud-700 dark:text-zamrud-300">Jawapan betul: <b><RichText text={right ?? ""} className="inline" /></b></div>}
                  {x.explanation && <details className="rounded-xl bg-zamrud-50/70 p-3 dark:bg-white/5"><summary className="cursor-pointer font-semibold">Penerangan jawapan</summary><RichText text={x.explanation.why} className="mt-1" />{!g?.correct && x.options?.find((o) => o.id === a?.value)?.why && <p className="mt-1 text-rose-700">Mengapa pilihan anda salah: {x.options.find((o) => o.id === a?.value)!.why}</p>}{x.explanation.confusion && <p className="mt-1"><b>Kekeliruan lazim:</b> {x.explanation.confusion}</p>}<Link to={`/nota/${x.chapterId}`} className="mt-1 inline-block text-xs font-semibold text-zamrud-700">Baca nota berkaitan →</Link></details>}
                </div>
              ) : (
                <div className="mt-2 space-y-2 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><div className="text-xs font-bold text-slate-500">Jawapan anda</div><RichText text={a?.value || "—"} /></div>
                  <details className="rounded-xl bg-zamrud-50/70 p-3 dark:bg-white/5"><summary className="cursor-pointer font-semibold">Jawapan cadangan (belum disemak guru)</summary><RichText text={x.modelAnswer ?? ""} className="mt-1" /></details>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">Penilaian kendiri:</span>{[0, x.marks / 2, x.marks].map((v) => <button key={v} className={cx("chip !px-3 !py-1", a?.selfScore === v ? "bg-zamrud-700 text-white" : "bg-slate-100 dark:bg-white/10")} onClick={() => gradeSubjective(e.id, x.id, v, "self")}>{v}/{x.marks}</button>)}
                    {a?.teacherScore != null && <span className="chip bg-sky-100 text-sky-800">Markah guru: {a.teacherScore}/{x.marks}</span>}</div>
                  {a?.teacherComment && <div className="rounded-xl bg-sky-50 p-2 text-xs dark:bg-sky-500/10">💬 Komen guru: {a.teacherComment}</div>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
