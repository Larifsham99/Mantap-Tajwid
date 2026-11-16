import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Download, Trash2 } from "lucide-react";
import { useMe, atLeast } from "../lib/auth";
import { useDb, update, allQuestions } from "../lib/store";
import { summary, chapterStats } from "../lib/gamification";
import { gradeSubjective } from "../lib/actions";
import { CHAPTERS, chapterById } from "../data";
import { BarChart, Card, Modal, PageHeader, RichText, Stat, Tabs, Empty, toast } from "../components/ui";
import { QuestionBankManager, NotesManager, AiFeedbackPanel } from "../components/ManagePanels";
import { download, toCSV, uid, fmtDateTime, pct } from "../lib/util";
import type { User } from "../types";

type Tab = "pelajar" | "salah" | "tugasan" | "subjektif" | "bank" | "nota" | "ai";

export default function Guru() {
  const me = useMe()!; const d = useDb();
  const [tab, setTab] = useState<Tab>("pelajar");
  const myClasses = atLeast(me, "admin") ? d.classes : d.classes.filter((c) => c.teacherId === me.id);
  const [cls, setCls] = useState("semua");
  const students = d.users.filter((u) => u.role === "pelajar" && myClasses.some((c) => c.id === u.classId) && (cls === "semua" || u.classId === cls));
  const sIds = new Set(students.map((s) => s.id));
  const [detail, setDetail] = useState<User | null>(null);
  const qs = allQuestions(d);
  const rows = students.map((u) => ({ u, s: summary(d, u.id) }));
  const classAcc = CHAPTERS.map((c) => { const a = d.attempts.filter((x) => sIds.has(x.userId) && x.chapterId === c.id); return { label: `${c.no}. ${c.title}`, value: pct(a.reduce((s, x) => s + x.score, 0), a.length) }; });
  const wrong = useMemo(() => {
    const m = new Map<string, { n: number; w: number }>();
    d.attempts.filter((a) => sIds.has(a.userId)).forEach((a) => { const x = m.get(a.questionId) ?? { n: 0, w: 0 }; x.n++; if (!a.correct) x.w++; m.set(a.questionId, x); });
    return [...m.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n).slice(0, 15);
  }, [d.attempts, students.length]); // eslint-disable-line
  const pendingSubj = d.exams.filter((e) => sIds.has(e.userId) && e.status !== "berjalan").flatMap((e) => e.questionIds.filter((qid) => qs.find((q) => q.id === qid)?.type === "subjective" && e.answers[qid]?.teacherScore == null).map((qid) => ({ e, qid })));

  // Tugasan
  const [as, setAs] = useState({ classId: myClasses[0]?.id ?? "", title: "", bab: "b4", n: 10, due: "", note: "", includeTauliah: false });
  function createAssignment() {
    if (!as.title.trim() || !as.classId) return toast("Isi tajuk dan pilih kelas", "err");
    const pool = qs.filter((q) => q.chapterId === as.bab && q.status !== "draf" && (as.includeTauliah || q.source !== "tauliah"));
    const ids = pool.slice(0, as.n).map((q) => q.id);
    if (!ids.length) return toast("Tiada soalan untuk bab ini", "err");
    update((x) => { x.assignments.push({ id: uid("as"), classId: as.classId, teacherId: me.id, title: as.title, questionIds: ids, due: as.due || undefined, note: as.note || undefined, createdAt: Date.now() }); });
    toast(`Tugasan dicipta (${ids.length} soalan)`); setAs({ ...as, title: "", note: "" });
  }
  function exportReport() {
    const header = ["Nama", "Emel", "Kelas", "Tahap", "XP", "Soalan", "Ketepatan %", "Bab dikuasai", "Streak", ...CHAPTERS.map((c) => `Bab ${c.no} %`)];
    const body = rows.map(({ u, s }) => [u.name, u.email, d.classes.find((c) => c.id === u.classId)?.name ?? "", s.lvl.level.name, s.xp, s.answered, s.acc, s.mastered, s.streak, ...s.stats.map((x) => x.acc)]);
    download(`laporan-pelajar-${new Date().toISOString().slice(0, 10)}.csv`, toCSV([header, ...body]), "text/csv");
  }
  return (
    <div>
      <PageHeader title="Dashboard Guru" subtitle={`${myClasses.length} kelas · ${students.length} pelajar`} icon={<GraduationCap />} actions={<><select className="input !w-auto" value={cls} onChange={(e) => setCls(e.target.value)}><option value="semua">Semua kelas saya</option>{myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn btn-outline" onClick={exportReport}><Download size={16} /> Eksport laporan</button><Link to="/scoreboard" className="btn btn-ghost">Scoreboard kelas</Link></>} />
      {!myClasses.length && <Card className="mb-4 p-4 text-sm">Anda belum ditetapkan sebagai guru mana-mana kelas. Minta admin menetapkan kelas anda di Dashboard Admin › Kelas.</Card>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="sky" icon="🧑‍🎓" label="Pelajar" value={students.length} /><Stat tone="zamrud" icon="🎯" label="Purata ketepatan" value={`${rows.length ? Math.round(rows.reduce((s, r) => s + r.s.acc, 0) / rows.length) : 0}%`} />
        <Stat tone="emas" icon="✍️" label="Subjektif menunggu" value={pendingSubj.length} /><Stat tone="rose" icon="🤖" label="Laporan AI baharu" value={d.aiFeedback.filter((f) => f.status === "baru").length} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "pelajar", label: "Pelajar & prestasi" }, { id: "salah", label: "Soalan sering salah" }, { id: "tugasan", label: "Latihan & tugasan" }, { id: "subjektif", label: `Semak subjektif (${pendingSubj.length})` }, { id: "bank", label: "Bank soalan & jawapan" }, { id: "nota", label: "Nota" }, { id: "ai", label: "Semakan AI" }]} />
      {tab === "pelajar" && <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-x-auto"><table className="tbl"><thead><tr><th>Pelajar</th><th>Tahap</th><th>XP</th><th>Soalan</th><th>Ketepatan</th><th>Bab lemah</th></tr></thead><tbody>{rows.map(({ u, s }) => <tr key={u.id} className="cursor-pointer hover:bg-zamrud-50/50 dark:hover:bg-white/5" onClick={() => setDetail(u)}><td><span className="mr-1">{u.avatar}</span>{u.name}</td><td>{s.lvl.level.name}</td><td>{s.xp}</td><td>{s.answered}</td><td>{s.acc}%</td><td className="text-xs text-rose-600">{s.weak.map((w) => chapterById(w.chapterId)?.no).join(", ") || "—"}</td></tr>)}</tbody></table>{!rows.length && <p className="p-4 text-sm text-slate-500">Tiada pelajar.</p>}</Card>
        <Card className="p-5"><div className="mb-3 font-bold">Ketepatan kelas mengikut bab</div><BarChart data={classAcc} /></Card>
      </div>}
      {tab === "salah" && <Card className="p-4">{wrong.length ? wrong.map(([id, v]) => { const q = qs.find((x) => x.id === id); return q && <div key={id} className="border-b border-slate-100 py-2 last:border-0 dark:border-white/5"><RichText text={q.prompt.slice(0, 200)} className="text-sm" /><div className="text-xs text-rose-600">{Math.round((v.w / v.n) * 100)}% salah ({v.w}/{v.n} cubaan) · {chapterById(q.chapterId)?.title}</div></div>; }) : <Empty title="Belum cukup data" />}</Card>}
      {tab === "tugasan" && <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-4"><div className="font-bold">Bina latihan / ujian untuk kelas</div>
          <select className="input" value={as.classId} onChange={(e) => setAs({ ...as, classId: e.target.value })}>{myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="input" placeholder="Tajuk tugasan" value={as.title} onChange={(e) => setAs({ ...as, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-2"><select className="input" value={as.bab} onChange={(e) => setAs({ ...as, bab: e.target.value })}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select><input type="number" className="input" min={1} max={40} value={as.n} onChange={(e) => setAs({ ...as, n: Number(e.target.value) })} /></div>
          <div className="grid grid-cols-2 gap-2"><input type="date" className="input" value={as.due} onChange={(e) => setAs({ ...as, due: e.target.value })} /><input className="input" placeholder="Catatan" value={as.note} onChange={(e) => setAs({ ...as, note: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={as.includeTauliah} onChange={(e) => setAs({ ...as, includeTauliah: e.target.checked })} /> Sertakan soalan tauliah (subjektif)</label>
          <button className="btn btn-primary" onClick={createAssignment}>Cipta & tetapkan kepada kelas</button>
        </Card>
        <div className="space-y-2">{d.assignments.filter((a) => myClasses.some((c) => c.id === a.classId)).map((a) => { const cs = d.users.filter((u) => u.classId === a.classId && u.role === "pelajar"); const done = cs.filter((u) => a.questionIds.every((q) => d.attempts.some((x) => x.userId === u.id && x.questionId === q))).length; return (
          <Card key={a.id} className="p-3"><div className="flex items-center gap-2"><div className="flex-1"><div className="font-semibold">{a.title}</div><div className="text-xs text-slate-500">{d.classes.find((c) => c.id === a.classId)?.name} · {a.questionIds.length} soalan · {done}/{cs.length} pelajar selesai{a.due ? ` · akhir ${a.due}` : ""}</div></div><button className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600" onClick={() => update((x) => { x.assignments = x.assignments.filter((y) => y.id !== a.id); })}><Trash2 size={14} /></button></div></Card>); })}</div>
      </div>}
      {tab === "subjektif" && <div className="space-y-3">{pendingSubj.length ? pendingSubj.slice(0, 30).map(({ e, qid }) => { const q = qs.find((x) => x.id === qid)!; const u = d.users.find((x) => x.id === e.userId); const a = e.answers[qid]; return <SubjReview key={e.id + qid} title={`${u?.name} · ${e.title} · ${fmtDateTime(e.submittedAt ?? e.startedAt)}`} prompt={q.prompt} model={q.modelAnswer ?? ""} answer={a?.value ?? ""} self={a?.selfScore} marks={q.marks} onSave={(sc, cm) => { gradeSubjective(e.id, qid, sc, "guru", cm); toast("Markah disimpan"); }} />; }) : <Empty title="Tiada jawapan subjektif menunggu semakan" icon="✅" />}</div>}
      {tab === "bank" && <QuestionBankManager />}
      {tab === "nota" && <NotesManager />}
      {tab === "ai" && <AiFeedbackPanel />}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} wide>{detail && (() => { const s = summary(d, detail.id); const st = chapterStats(d, detail.id); return <div className="space-y-3"><div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="card p-2"><b>{s.xp}</b><div className="text-xs">XP</div></div><div className="card p-2"><b>{s.acc}%</b><div className="text-xs">Ketepatan</div></div><div className="card p-2"><b>{s.mastered}</b><div className="text-xs">Bab dikuasai</div></div></div><BarChart data={CHAPTERS.map((c, i) => ({ label: `${c.no}. ${c.title}`, value: st[i].acc }))} /><div className="text-xs text-slate-500">Ujian: {d.exams.filter((e) => e.userId === detail.id).map((e) => `${e.title} (${e.score ?? "-"}/${e.maxScore ?? "-"})`).join("; ") || "tiada"}</div></div>; })()}</Modal>
    </div>
  );
}

function SubjReview({ title, prompt, model, answer, self, marks, onSave }: { title: string; prompt: string; model: string; answer: string; self?: number; marks: number; onSave: (s: number, c: string) => void }) {
  const [sc, setSc] = useState(self ?? 0); const [cm, setCm] = useState("");
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <RichText text={prompt} className="my-1 text-sm font-semibold" />
      <div className="grid gap-2 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-2 text-sm dark:bg-white/5"><div className="text-xs font-bold">Jawapan pelajar</div><RichText text={answer || "—"} /></div><details className="rounded-xl bg-zamrud-50 p-2 text-sm dark:bg-white/5"><summary className="cursor-pointer text-xs font-bold">Jawapan cadangan</summary><RichText text={model} /></details></div>
      <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs">Penilaian kendiri: {self ?? "—"}/{marks}</span><input type="number" step={0.5} min={0} max={marks} className="input !w-24" value={sc} onChange={(e) => setSc(Math.min(marks, Math.max(0, Number(e.target.value))))} /><input className="input flex-1" placeholder="Komen guru" value={cm} onChange={(e) => setCm(e.target.value)} /><button className="btn btn-primary !py-2" onClick={() => onSave(sc, cm)}>Simpan markah</button></div>
    </Card>
  );
}
