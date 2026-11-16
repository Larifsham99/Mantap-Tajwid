import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../lib/auth";
import { useDb, publicQuestions } from "../lib/store";
import { PRACTICE_MODES, CHAPTERS, PAPERS } from "../data";
import { Card, PageHeader, BarChart } from "../components/ui";
import { dueReviews } from "../lib/actions";
import { fmtDateTime } from "../lib/util";

export default function LatihTubi() {
  const me = useMe()!; const d = useDb();
  const [bab, setBab] = useState("b4"); const [tahun, setTahun] = useState(PAPERS[0].year);
  const qs = publicQuestions(d);
  const due = dueReviews(d, me.id).length;
  const myAssign = d.assignments.filter((a) => a.classId === me.classId);
  const recent = d.activity.filter((a) => a.userId === me.id && a.type === "latihan").slice(-5).reverse();
  const modeCount = (id: string) => {
    const obj = qs.filter((q) => q.source !== "tauliah" && q.type !== "subjective");
    if (["kefahaman", "dhobit", "kenal_hukum", "perbandingan"].includes(id)) return obj.filter((q) => q.kind === id).length;
    if (["tf", "match", "fill"].includes(id)) return obj.filter((q) => q.type === id).length;
    if (id === "sukar") return obj.filter((q) => q.difficulty === 3).length;
    if (id === "tahun") return qs.filter((q) => q.source === "tauliah").length;
    if (id === "murajaah") return due;
    if (id === "bab") return obj.filter((q) => q.chapterId === bab).length;
    return obj.length;
  };
  const href = (id: string) => id === "bab" ? `/latih-tubi/sesi?mode=bab&bab=${bab}` : id === "tahun" ? `/latih-tubi/sesi?mode=tahun&tahun=${tahun}` : `/latih-tubi/sesi?mode=${id}`;
  return (
    <div>
      <PageHeader title="Latih Tubi" subtitle="12 mod latihan – setiap jawapan disertai syarah" icon="🎯" />
      {myAssign.length > 0 && (
        <Card className="mb-4 p-4"><div className="mb-2 font-bold">📌 Tugasan daripada guru</div>
          {myAssign.map((a) => { const done = new Set(d.attempts.filter((x) => x.userId === me.id).map((x) => x.questionId)); const n = a.questionIds.filter((x) => done.has(x)).length; return (
            <div key={a.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-2 first:border-0 dark:border-white/5"><div className="flex-1"><div className="font-semibold">{a.title}</div><div className="text-xs text-slate-500">{a.questionIds.length} soalan · {n} dijawab{a.due ? ` · Tarikh akhir ${a.due}` : ""}{a.note ? ` · ${a.note}` : ""}</div></div><Link to={`/latih-tubi/sesi?mode=tugasan&id=${a.id}`} className="btn btn-primary !py-1.5 text-xs">Mula</Link></div>); })}
        </Card>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4"><label className="label">Bab (untuk Latihan Mengikut Bab)</label><select className="input" value={bab} onChange={(e) => setBab(e.target.value)}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select></Card>
        <Card className="p-4"><label className="label">Tahun (untuk Soalan Tahun Terdahulu)</label><select className="input" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>{PAPERS.map((p) => <option key={p.year} value={p.year}>{p.year} ({p.hijri})</option>)}</select></Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_MODES.map((m, i) => { const n = modeCount(m.id); return (
          <Link key={m.id} to={href(m.id)} className="card group flex gap-3 p-4 transition hover:-translate-y-0.5 hover:ring-zamrud-300 rise" style={{ animationDelay: `${i * 25}ms` }}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zamrud-50 text-xl dark:bg-white/5">{m.icon}</div>
            <div className="min-w-0"><div className="font-bold group-hover:text-zamrud-700">{String.fromCharCode(65 + i)}. {m.title}</div><div className="text-xs text-slate-500">{m.desc}</div><div className="mt-1 text-xs font-semibold text-emas-700">{n} soalan tersedia</div></div>
          </Link>); })}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="p-5"><div className="mb-3 font-bold">Rekod prestasi mengikut jenis</div>
          <BarChart data={(["mcq", "tf", "fill", "match", "subjective"] as const).map((t) => { const ids = new Set(qs.filter((q) => q.type === t).map((q) => q.id)); const a = d.attempts.filter((x) => x.userId === me.id && ids.has(x.questionId)); return { label: { mcq: "Objektif", tf: "Benar/Salah", fill: "Isi tempat kosong", match: "Padanan", subjective: "Subjektif tauliah" }[t], value: a.length ? Math.round((a.reduce((s, x) => s + x.score, 0) / a.length) * 100) : 0 }; })} />
        </Card>
        <Card className="p-5"><div className="mb-3 font-bold">Latihan terkini</div>{recent.length ? recent.map((a) => <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">{a.text}<div className="text-xs text-slate-400">{fmtDateTime(a.ts)}</div></div>) : <p className="text-sm text-slate-500">Belum ada latihan ditamatkan.</p>}</Card>
      </div>
    </div>
  );
}
