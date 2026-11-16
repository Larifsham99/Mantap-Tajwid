import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Timer, Play } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb, publicQuestions, getDB } from "../lib/store";
import { startExam } from "../lib/actions";
import { CHAPTERS, PAPERS } from "../data";
import { Card, PageHeader, Empty, cx } from "../components/ui";
import { shuffle, fmtDateTime } from "../lib/util";

const PRESETS = [
  { id: "u10", label: "Ujian 10 soalan", n: 10, min: 10 }, { id: "u20", label: "Ujian 20 soalan", n: 20, min: 20 }, { id: "u50", label: "Ujian 50 soalan", n: 50, min: 45 },
  { id: "lengkap", label: "Ujian lengkap", n: 999, min: 90 }, { id: "tahun", label: "Simulasi mengikut tahun", n: 0, min: 120 }, { id: "rawak", label: "Simulasi rawak (campuran)", n: 13, min: 40 }, { id: "bab", label: "Ujian khusus bab", n: 15, min: 20 },
];

export default function Simulasi() {
  const me = useMe()!; const d = useDb(); const nav = useNavigate(); const [p] = useSearchParams();
  const [preset, setPreset] = useState(p.get("tahun") ? "tahun" : "u10");
  const pr = PRESETS.find((x) => x.id === preset)!;
  const [minutes, setMinutes] = useState(pr.min);
  const [year, setYear] = useState(Number(p.get("tahun")) || PAPERS[0].year);
  const [bab, setBab] = useState("b4"); const [diff, setDiff] = useState(0); const [count, setCount] = useState(10);
  const exams = d.exams.filter((e) => e.userId === me.id).sort((a, b) => b.startedAt - a.startedAt);

  function pick(id: string) { const x = PRESETS.find((y) => y.id === id)!; setPreset(id); setMinutes(x.min); setCount(x.n === 999 ? 0 : x.n); }
  function start() {
    const all = publicQuestions(getDB());
    let obj = all.filter((q) => q.source !== "tauliah" && q.type !== "subjective");
    if (diff) obj = obj.filter((q) => q.difficulty === diff);
    let qs: string[] = []; let title = pr.label;
    if (preset === "tahun") { qs = all.filter((q) => q.source === "tauliah" && q.year === year).map((q) => q.id); title = `Simulasi Tauliah ${year}`; }
    else if (preset === "rawak") { qs = [...shuffle(obj).slice(0, 10), ...shuffle(all.filter((q) => q.source === "tauliah")).slice(0, 3)].map((q) => q.id); }
    else if (preset === "bab") { const c = CHAPTERS.find((x) => x.id === bab)!; qs = [...shuffle(obj.filter((q) => q.chapterId === bab)).slice(0, 12), ...shuffle(all.filter((q) => q.source === "tauliah" && q.chapterId === bab)).slice(0, 3)].map((q) => q.id); title = `Ujian Bab ${c.no}: ${c.title}`; }
    else { qs = shuffle(obj).slice(0, preset === "lengkap" ? obj.length : count).map((q) => q.id); if (preset !== "lengkap") title = `Ujian ${qs.length} soalan`; }
    if (!qs.length) return alert("Tiada soalan sepadan dengan pilihan anda.");
    const id = startExam(me.id, title, qs, { count: qs.length, minutes, year: preset === "tahun" ? year : undefined, chapterId: preset === "bab" ? bab : undefined, difficulty: diff || undefined, mode: preset });
    nav(`/simulasi/${id}`);
  }
  return (
    <div>
      <PageHeader title="Simulasi Peperiksaan" subtitle="Latihan bermasa dengan pemarkahan automatik & analisis" icon={<Timer />} />
      <Card className="mb-4 p-4 text-sm text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10">⚠️ Simulasi ini ialah alat latihan. Ia <b>tidak mendakwa sama sepenuhnya dengan format rasmi</b> peperiksaan tauliah Kedah. Mod "mengikut tahun" menggunakan soalan sebenar tahun tersebut (subjektif) yang dinilai secara kendiri/oleh guru.</Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mb-3 font-bold">1. Pilih mod</div>
          <div className="grid gap-2 sm:grid-cols-2">{PRESETS.map((x) => <button key={x.id} onClick={() => pick(x.id)} className={cx("rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1", preset === x.id ? "bg-zamrud-700 text-white ring-zamrud-700" : "ring-slate-200 hover:bg-zamrud-50 dark:ring-white/10 dark:hover:bg-white/5")}>{x.label}</button>)}</div>
          <div className="mb-3 mt-5 font-bold">2. Tetapan</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Tempoh (minit)</label><input type="number" min={1} max={240} className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
            {["u10", "u20", "u50"].includes(preset) && <div><label className="label">Bilangan soalan</label><input type="number" min={1} max={80} className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>}
            {preset === "tahun" && <div><label className="label">Tahun</label><select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{PAPERS.map((x) => <option key={x.year} value={x.year}>{x.year} ({x.hijri})</option>)}</select></div>}
            {preset === "bab" && <div><label className="label">Bab</label><select className="input" value={bab} onChange={(e) => setBab(e.target.value)}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select></div>}
            {preset !== "tahun" && <div><label className="label">Tahap kesukaran</label><select className="input" value={diff} onChange={(e) => setDiff(Number(e.target.value))}><option value={0}>Semua</option><option value={1}>★ Mudah</option><option value={2}>★★ Sederhana</option><option value={3}>★★★ Sukar</option></select></div>}
          </div>
          <button className="btn btn-gold mt-5 w-full sm:w-auto" onClick={start}><Play size={16} /> Mula simulasi</button>
        </Card>
        <Card className="p-5">
          <div className="mb-2 font-bold">Rekod ujian</div>
          {exams.length ? <div className="space-y-2">{exams.slice(0, 12).map((e) => <Link key={e.id} to={`/simulasi/${e.id}`} className="block rounded-xl p-2 text-sm hover:bg-zamrud-50 dark:hover:bg-white/5"><div className="font-semibold">{e.title}</div><div className="text-xs text-slate-500">{fmtDateTime(e.startedAt)} · {e.status === "berjalan" ? "⏳ Sedang berjalan" : `${e.score}/${e.maxScore} ${e.status === "disemak" ? "· disemak guru" : ""}`}</div></Link>)}</div> : <Empty title="Belum ada ujian" icon="📝" />}
        </Card>
      </div>
    </div>
  );
}
