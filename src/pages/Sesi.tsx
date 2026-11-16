import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMe } from "../lib/auth";
import { getDB, publicQuestions } from "../lib/store";
import { completeExercise, dueReviews } from "../lib/actions";
import { PRACTICE_MODES, chapterById } from "../data";
import { shuffle, dayKey } from "../lib/util";
import QuestionPlayer, { type PlayResult } from "../components/QuestionPlayer";
import { Card, Empty, PageHeader, Progress, RichText } from "../components/ui";
import type { Question } from "../types";

function buildSet(mode: string, p: URLSearchParams, userId: string): { title: string; qs: Question[] } {
  const d = getDB(); const all = publicQuestions(d);
  const obj = all.filter((q) => q.source !== "tauliah" && q.type !== "subjective");
  const n = Number(p.get("n")) || 10;
  const title = PRACTICE_MODES.find((m) => m.id === mode)?.title ?? "Latihan";
  switch (mode) {
    case "bab": { const b = p.get("bab") || "b1"; return { title: `Latihan Bab ${chapterById(b)?.no}: ${chapterById(b)?.title}`, qs: shuffle(obj.filter((q) => q.chapterId === b)).slice(0, n) }; }
    case "tahun": { const y = Number(p.get("tahun")); return { title: `Soalan Tauliah ${y}`, qs: all.filter((q) => q.source === "tauliah" && q.year === y) }; }
    case "sukar": return { title, qs: shuffle(obj.filter((q) => q.difficulty === 3)).concat(shuffle(obj.filter((q) => q.difficulty === 2))).slice(0, n) };
    case "kefahaman": case "dhobit": case "kenal_hukum": case "perbandingan": return { title, qs: shuffle(obj.filter((q) => q.kind === mode)).slice(0, n) };
    case "tf": case "match": case "fill": return { title, qs: shuffle(obj.filter((q) => q.type === mode)).slice(0, n) };
    case "murajaah": { const ids = dueReviews(d, userId).sort((a, b) => a.due - b.due).map((r) => r.questionId); return { title: "Smart Murajaah", qs: ids.map((id) => all.find((q) => q.id === id)!).filter(Boolean).slice(0, 15) }; }
    case "harian": { const seed = Number(dayKey(Date.now()).replace(/-/g, "")); return { title: `Cabaran Harian ${dayKey(Date.now())}`, qs: shuffle(obj, seed).slice(0, 5) }; }
    case "tugasan": { const a = d.assignments.find((x) => x.id === p.get("id")); return { title: a ? `Tugasan: ${a.title}` : "Tugasan", qs: a ? a.questionIds.map((id) => all.find((q) => q.id === id)!).filter(Boolean) : [] }; }
    case "serupa": { const b = p.get("bab"); const k = p.get("kind"); const ex = p.get("ex"); return { title: "Soalan Serupa", qs: shuffle(obj.filter((q) => q.chapterId === b && q.id !== ex && (!k || q.kind === k))).slice(0, 5) }; }
    default: return { title: "Latihan Rawak", qs: shuffle(obj).slice(0, n) };
  }
}

export default function Sesi() { const [p] = useSearchParams(); return <SesiInner key={p.toString()} />; }

function SesiInner() {
  const me = useMe()!; const [p] = useSearchParams(); const nav = useNavigate();
  const mode = p.get("mode") || "rawak";
  const set = useMemo(() => buildSet(mode, p, me.id), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [res, setRes] = useState<Record<string, PlayResult>>({});
  const [done, setDone] = useState(false);
  const q = set.qs[i];
  const score = Object.values(res).reduce((s, r) => s + r.score, 0);

  if (!set.qs.length) return <div><PageHeader title={set.title} icon="🎯" /><Empty title={mode === "murajaah" ? "Tiada soalan untuk diulang kaji sekarang" : "Tiada soalan tersedia"} icon="🌿">{mode === "murajaah" ? "Soalan yang anda jawab salah akan muncul di sini mengikut jadual ulang kaji." : "Cuba mod lain."} <div className="mt-3"><Link className="btn btn-primary" to="/latih-tubi">Kembali ke Latih Tubi</Link></div></Empty></div>;

  function finish() {
    setDone(true);
    completeExercise(me.id, set.title, set.qs.length, score);
  }
  if (done) {
    const wrong = set.qs.filter((x) => res[x.id] && !res[x.id].correct);
    const pct = Math.round((score / set.qs.length) * 100);
    return (
      <div>
        <PageHeader title="Keputusan Latihan" subtitle={set.title} icon="🏁" />
        <Card className="mb-4 p-6 text-center motif">
          <div className="text-5xl font-extrabold text-zamrud-700 dark:text-emas-300">{pct}%</div>
          <div className="text-sm text-slate-500">{Math.round(score * 10) / 10} / {set.qs.length} · {Object.keys(res).length} dijawab · +20 XP tamat latihan</div>
          <div className="mt-2 text-sm font-semibold">{pct >= 80 ? "Mumtaz! Teruskan istiqamah." : pct >= 60 ? "Jayyid. Ulang soalan yang salah untuk menguasai." : "Jangan putus asa – baca semula nota dan cuba lagi."}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2"><button className="btn btn-primary" onClick={() => nav(0)}>Ulang dengan set baharu</button><Link to="/murajaah" className="btn btn-ghost">Pergi ke Murajaah</Link><Link to="/latih-tubi" className="btn btn-outline">Mod lain</Link></div>
        </Card>
        {wrong.length > 0 && <Card className="p-5"><div className="mb-2 font-bold">Soalan yang perlu diulang ({wrong.length}) – telah dimasukkan ke barisan murajaah</div>{wrong.map((w) => <div key={w.id} className="border-t border-slate-100 py-2 text-sm dark:border-white/5"><RichText text={w.prompt} /><Link className="text-xs font-semibold text-zamrud-700" to={`/nota/${w.chapterId}`}>Baca nota: {chapterById(w.chapterId)?.title} →</Link></div>)}</Card>}
      </div>
    );
  }
  return (
    <div>
      <PageHeader title={set.title} icon="🎯" actions={<button className="btn btn-ghost" onClick={finish}>Tamatkan sesi</button>} />
      <div className="mb-4 flex items-center gap-3"><Progress value={((i + (res[q.id] ? 1 : 0)) / set.qs.length) * 100} /><span className="whitespace-nowrap text-sm font-semibold">Skor {Math.round(score * 10) / 10}</span></div>
      <QuestionPlayer key={q.id} q={q} mode={mode} index={i} total={set.qs.length}
        onAnswered={(r) => setRes((s) => ({ ...s, [q.id]: r }))}
        onNext={() => (i < set.qs.length - 1 ? setI(i + 1) : finish())}
        onSimilar={q.source === "latihan" ? () => nav(`/latih-tubi/sesi?mode=serupa&bab=${q.chapterId}&kind=${q.kind ?? ""}&ex=${q.id}`) : undefined} />
    </div>
  );
}
