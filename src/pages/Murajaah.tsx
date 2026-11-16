import { Link } from "react-router-dom";
import { Repeat, Trash2 } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb, allQuestions } from "../lib/store";
import { dueReviews, removeFromReview, SRS_INTERVALS } from "../lib/actions";
import { chapterStats } from "../lib/gamification";
import { CHAPTERS, chapterById } from "../data";
import { Card, PageHeader, Stat, Empty, RichText, BarChart } from "../components/ui";
import { DAY, dayKey, fmtDate, startOfDay } from "../lib/util";

export default function Murajaah() {
  const me = useMe()!; const d = useDb();
  const items = d.review.filter((r) => r.userId === me.id);
  const due = dueReviews(d, me.id);
  const qs = allQuestions(d);
  const stats = chapterStats(d, me.id);
  const unread = stats.filter((s) => s.readPct < 100);
  const weak = stats.filter((s) => s.attempts >= 3 && s.acc < 70).sort((a, b) => a.acc - b.acc);
  const strong = stats.filter((s) => s.attempts >= 5 && s.acc >= 85);
  const answered = new Set(d.attempts.filter((a) => a.userId === me.id).map((a) => a.questionId));
  const unanswered = qs.filter((q) => q.source === "latihan" && !answered.has(q.id)).length;
  const wrongMost = Object.entries(d.attempts.filter((a) => a.userId === me.id && !a.correct).reduce<Record<string, number>>((m, a) => ((m[a.questionId] = (m[a.questionId] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const myAtt = d.attempts.filter((a) => a.userId === me.id);
  const timeMin = Math.round(myAtt.reduce((s, a) => s + (a.ms ?? 0), 0) / 60000);
  const week = Array.from({ length: 7 }, (_, k) => { const t = startOfDay() - (6 - k) * DAY; return { label: new Date(t).toLocaleDateString("ms-MY", { weekday: "short", day: "numeric" }), value: d.attempts.filter((a) => a.userId === me.id && a.mode === "murajaah" && dayKey(a.ts) === dayKey(t)).length }; });
  const upcoming = items.filter((r) => r.due > Date.now()).sort((a, b) => a.due - b.due).slice(0, 8);

  return (
    <div>
      <PageHeader title="Murajaah Pintar" subtitle="Ulang kaji adaptif dengan sistem spaced repetition (Leitner)" icon={<Repeat />} actions={<Link to="/latih-tubi/sesi?mode=murajaah" className="btn btn-gold">{due.length ? `Mula murajaah (${due.length})` : "Tiada yang tertunggak"}</Link>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="rose" label="Perlu diulang kini" value={due.length} icon="⏰" />
        <Stat tone="sky" label="Dalam barisan" value={items.length} icon="📥" />
        <Stat tone="violet" label="Soalan belum dijawab" value={unanswered} icon="🆕" />
        <Stat tone="emas" label="Masa belajar" value={`${timeMin} min`} icon="⌛" hint="Berdasarkan masa menjawab" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 font-bold">Cadangan untuk anda</div>
          <ul className="space-y-2 text-sm">
            {due.length > 0 && <li>🔁 <b>Murajaah harian:</b> ulang {due.length} soalan yang telah sampai jadual. <Link className="text-zamrud-700 underline" to="/latih-tubi/sesi?mode=murajaah">Mula</Link></li>}
            {weak.slice(0, 3).map((w) => <li key={w.chapterId}>📉 <b>Bab lemah:</b> {chapterById(w.chapterId)?.title} ({w.acc}%). <Link className="text-zamrud-700 underline" to={`/nota/${w.chapterId}`}>Ulang nota</Link> · <Link className="text-zamrud-700 underline" to={`/latih-tubi/sesi?mode=bab&bab=${w.chapterId}`}>Latihan</Link> · <Link className="text-zamrud-700 underline" to="/latih-tubi/sesi?mode=kefahaman">Soalan lebih mudah</Link></li>)}
            {unread.slice(0, 2).map((u) => <li key={u.chapterId}>📖 <b>Belum dipelajari:</b> {chapterById(u.chapterId)?.title} (nota {u.readPct}%). <Link className="text-zamrud-700 underline" to={`/nota/${u.chapterId}`}>Baca</Link></li>)}
            {strong.length > 0 && <li>🚀 <b>Cabaran:</b> anda kuat dalam {strong.map((s) => chapterById(s.chapterId)?.title).join(", ")}. <Link className="text-zamrud-700 underline" to="/latih-tubi/sesi?mode=sukar">Cuba soalan sukar</Link></li>}
            <li>📅 <b>Murajaah mingguan:</b> <Link className="text-zamrud-700 underline" to="/simulasi">Ambil ujian 20 soalan</Link> setiap minggu untuk mengukur kemajuan.</li>
          </ul>
        </Card>
        <Card className="p-5"><div className="mb-3 font-bold">Kekerapan murajaah (7 hari)</div><BarChart data={week} max={Math.max(5, ...week.map((w) => w.value))} suffix="" /></Card>
        <Card className="p-5"><div className="mb-3 font-bold">Soalan yang sering salah</div>
          {wrongMost.length ? wrongMost.map(([id, n]) => { const q = qs.find((x) => x.id === id); return q && <div key={id} className="border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5"><RichText text={q.prompt.slice(0, 160)} /><div className="text-xs text-rose-600">Salah {n} kali · {chapterById(q.chapterId)?.title}</div></div>; }) : <p className="text-sm text-slate-500">Tiada lagi. Alhamdulillah!</p>}
        </Card>
        <Card className="p-5"><div className="mb-3 font-bold">Jadual ulang kaji akan datang</div>
          <p className="mb-2 text-xs text-slate-500">Selang kotak Leitner (hari): {SRS_INTERVALS.join(" → ")}. Jawapan betul menaikkan kotak; salah kembali ke kotak 0.</p>
          {upcoming.length ? upcoming.map((r) => { const q = qs.find((x) => x.id === r.questionId); return q && <div key={r.questionId} className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5"><div className="min-w-0 flex-1"><div className="truncate">{q.prompt}</div><div className="text-xs text-slate-500">Kotak {r.box} · {fmtDate(r.due)}{r.saved ? " · disimpan manual" : ""}</div></div><button className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600" title="Buang" onClick={() => removeFromReview(me.id, r.questionId)}><Trash2 size={14} /></button></div>; }) : <Empty title="Tiada jadual akan datang" icon="🗓️" />}
        </Card>
        <Card className="p-5 lg:col-span-2"><div className="mb-3 font-bold">Tahap penguasaan setiap bab</div><BarChart data={CHAPTERS.map((c, k) => ({ label: `${c.no}. ${c.title}`, value: stats[k].acc }))} /></Card>
      </div>
    </div>
  );
}
