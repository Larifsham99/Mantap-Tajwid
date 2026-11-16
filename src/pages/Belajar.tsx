import { Link } from "react-router-dom";
import { BookOpen, KeyRound, Dumbbell, Repeat, Award, Timer } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb, publicQuestions } from "../lib/store";
import { chapterStats, MASTERY } from "../lib/gamification";
import { CHAPTERS } from "../data";
import { Card, PageHeader, Progress, cx } from "../components/ui";

const FLOW = [
  { icon: BookOpen, t: "Baca Nota" }, { icon: KeyRound, t: "Fahami Dhobit" }, { icon: BookOpen, t: "Lihat Contoh" }, { icon: Dumbbell, t: "Latihan" },
  { icon: Repeat, t: "Ulang Soalan Salah" }, { icon: Award, t: "Kuasai Bab" }, { icon: Timer, t: "Simulasi" },
];

export default function Belajar() {
  const me = useMe()!; const d = useDb();
  const stats = chapterStats(d, me.id);
  const qs = publicQuestions(d);
  return (
    <div>
      <PageHeader title="Belajar Tajwid" subtitle="Modul pembelajaran berstruktur – 12 bab" icon="📚" />
      <Card className="mb-5 overflow-x-auto p-4">
        <div className="flex min-w-max items-center gap-2 text-xs font-semibold">
          {FLOW.map((f, i) => <div key={f.t} className="flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full bg-zamrud-50 px-3 py-1.5 text-zamrud-800 dark:bg-white/5 dark:text-zamrud-200"><f.icon size={14} />{f.t}</span>{i < FLOW.length - 1 && <span className="text-emas-500">→</span>}</div>)}
        </div>
        <p className="mt-2 text-xs text-slate-500">Syarat bab dikuasai: semua seksyen nota dibaca, sekurang-kurangnya {MASTERY.minAttempts} soalan dijawab dan ketepatan ≥ {MASTERY.minAcc}% (20 cubaan terkini).</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHAPTERS.map((c, i) => {
          const st = stats[i]; const n = qs.filter((q) => q.chapterId === c.id);
          const step = st.mastered ? 3 : st.readPct < 100 ? 0 : st.attempts < MASTERY.minAttempts ? 1 : 2;
          return (
            <Card key={c.id} className={cx("flex flex-col p-5 rise", st.mastered && "ring-2 ring-emas-400")} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-hutan-900 font-arab text-2xl text-emas-300">{c.icon}</div>
                <div className="min-w-0"><div className="text-xs font-semibold text-emas-700">BAB {c.no}</div><div className="font-bold leading-tight">{c.title}</div><div className="font-arab text-lg text-zamrud-700 dark:text-zamrud-300" dir="rtl">{c.arabTitle}</div></div>
                {st.mastered && <span className="ml-auto text-xl" title="Dikuasai">👑</span>}
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{c.summary}</p>
              <div className="mt-3 space-y-2 text-xs">
                <div><div className="flex justify-between"><span>Nota dibaca</span><span>{st.readPct}%</span></div><Progress value={st.readPct} /></div>
                <div><div className="flex justify-between"><span>Ketepatan ({st.attempts} cubaan)</span><span>{st.acc}%</span></div><Progress value={st.acc} tone={st.acc >= 80 ? "zamrud" : st.acc >= 60 ? "emas" : "rose"} /></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to={`/nota/${c.id}`} className={cx("btn !py-2 text-xs", step === 0 ? "btn-primary" : "btn-ghost")}><BookOpen size={14} /> Nota ({c.sections.length})</Link>
                <Link to={`/latih-tubi/sesi?mode=bab&bab=${c.id}`} className={cx("btn !py-2 text-xs", step === 1 || step === 2 ? "btn-primary" : "btn-ghost")}><Dumbbell size={14} /> Latihan ({n.filter((q) => q.source === "latihan").length})</Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
