import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Dumbbell, Timer, FileText } from "lucide-react";
import { useDb, publicQuestions } from "../lib/store";
import { useMe } from "../lib/auth";
import { PAPERS, CHAPTERS, chapterById } from "../data";
import { Card, PageHeader, RichText, StatusBadge, Modal, Empty, cx } from "../components/ui";
import QuestionPlayer from "../components/QuestionPlayer";
import { norm } from "../lib/util";
import type { Question } from "../types";

export default function Bank() {
  const d = useDb(); const me = useMe()!;
  const [year, setYear] = useState<number | "semua">(PAPERS[0].year);
  const [bab, setBab] = useState("semua"); const [q, setQ] = useState("");
  const [open, setOpen] = useState<Question | null>(null);
  const all = publicQuestions(d).filter((x) => x.source === "tauliah" || (x.source === "custom" && x.year));
  const attempted = new Set(d.attempts.filter((a) => a.userId === me.id).map((a) => a.questionId));
  const list = useMemo(() => all.filter((x) => (year === "semua" || x.year === year) && (bab === "semua" || x.chapterId === bab) && (!q || norm(x.prompt).includes(norm(q)))), [all, year, bab, q]);
  const paper = year === "semua" ? undefined : PAPERS.find((p) => p.year === year);
  const years = [...new Set([...PAPERS.map((p) => p.year), ...all.map((x) => x.year!).filter(Boolean)])].sort((a, b) => b - a);
  const groups = useMemo(() => {
    const m = new Map<string, Question[]>();
    list.forEach((x) => { const k = `${x.year}|${x.section}|${x.qNo}`; m.set(k, [...(m.get(k) ?? []), x]); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }) * (year === "semua" ? 1 : -1));
  }, [list, year]);

  return (
    <div>
      <PageHeader title="Bank Soalan Tauliah Tajwid Negeri Kedah" subtitle={`${all.length} soalan daripada ${years.length} kertas sebenar (${years.at(-1)}–${years[0]})`} icon="🗂️" actions={paper && <>
        <Link to={`/latih-tubi/sesi?mode=tahun&tahun=${paper.year}`} className="btn btn-ghost"><Dumbbell size={16} /> Latih kertas {paper.year}</Link>
        <Link to={`/simulasi?tahun=${paper.year}`} className="btn btn-primary"><Timer size={16} /> Simulasi {paper.year}</Link>
      </>} />
      <Card className="mb-4 p-4 text-sm">
        <div className="flex gap-2"><span>ℹ️</span><div>Soalan asal adalah dalam <b>tulisan Jawi</b> dan dipaparkan sebagai transliterasi Rumi yang setia; ayat al-Quran disalin daripada kertas. <b>Jawapan cadangan adalah DRAF dan berstatus "Belum disemak"</b> sehingga disahkan guru penyemak melalui Dashboard Guru/Admin. Tahun 2020–2021 tiada dalam dokumen yang dibekalkan.</div></div>
      </Card>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["semua", ...years] as const).map((y) => <button key={y} onClick={() => setYear(y)} className={cx("chip !px-3 !py-1.5 text-sm", year === y ? "bg-zamrud-700 text-white" : "bg-white ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10")}>{y === "semua" ? "Semua tahun" : y}</button>)}
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_260px]">
        <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="input !pl-10" placeholder="Cari dalam soalan…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input" value={bab} onChange={(e) => setBab(e.target.value)}><option value="semua">Semua bab</option>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select>
      </div>
      {paper && (
        <Card className="mb-4 hero p-5 text-white">
          <div className="flex items-start gap-3"><FileText className="text-emas-300" /><div>
            <div className="text-lg font-bold">Peperiksaan Tauliah Mengajar Agama Islam Negeri Kedah {paper.year} ({paper.hijri})</div>
            <div className="text-sm text-zamrud-100/80">{paper.penganjur} · Kertas: {paper.subject} · {paper.date ?? ""} · {paper.duration}</div>
            <div className="mt-2 text-sm"><b>Arahan:</b> {paper.instruction}</div>
            <div className="mt-1 text-xs text-zamrud-100/70">{paper.transcriptionNote}</div>
          </div></div>
        </Card>
      )}
      {groups.length === 0 ? <Empty title="Tiada soalan sepadan" icon="🔍" /> : (
        <div className="space-y-4">
          {groups.map(([k, qs]) => { const [y, sec, no] = k.split("|"); return (
            <Card key={k} className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2"><span className="chip bg-hutan-900 text-emas-200">{y}</span><span className="font-bold">Bahagian {sec} · Soalan {no}</span><span className="text-xs text-slate-500">(25 markah)</span></div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {qs.sort((a, b) => (a.part ?? "").localeCompare(b.part ?? "")).map((x) => (
                  <button key={x.id} onClick={() => setOpen(x)} className="flex w-full gap-3 py-3 text-left hover:bg-zamrud-50/50 dark:hover:bg-white/5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zamrud-100 text-xs font-bold text-zamrud-800 dark:bg-zamrud-500/20 dark:text-zamrud-200">{x.part}</span>
                    <div className="min-w-0 flex-1"><RichText text={x.prompt.length > 420 ? x.prompt.slice(0, 420) + "…" : x.prompt} className="text-sm" />
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]"><span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{chapterById(x.chapterId)?.title}</span><StatusBadge s={x.status} />{attempted.has(x.id) && <span className="chip bg-zamrud-100 text-zamrud-800">✓ Pernah dijawab</span>}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>); })}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Soalan Tauliah" wide>
        {open && <QuestionPlayer q={open} mode="bank" />}
      </Modal>
    </div>
  );
}
