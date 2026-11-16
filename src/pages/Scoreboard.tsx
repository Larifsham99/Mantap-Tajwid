import { useState } from "react";
import { Trophy } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb } from "../lib/store";
import { leaderboard, type Board, summary } from "../lib/gamification";
import { CHAPTERS } from "../data";
import { Card, PageHeader, Tabs, cx, Empty } from "../components/ui";

export default function Scoreboard() {
  const me = useMe()!; const d = useDb();
  const [board, setBoard] = useState<Board>("keseluruhan");
  const [classId, setClassId] = useState(me.classId ?? d.classes[0]?.id ?? "");
  const [bab, setBab] = useState("b4");
  const rows = leaderboard(d, board, { classId, chapterId: bab, showDemo: d.settings.showDemo });
  const top = rows.slice(0, 3);
  return (
    <div>
      <PageHeader title="Scoreboard" subtitle="Berlumba-lumba dalam kebaikan – فَٱسْتَبِقُوا۟ ٱلْخَيْرَٰتِ" icon={<Trophy />} />
      <Tabs value={board} onChange={setBoard} tabs={[{ id: "keseluruhan", label: "Keseluruhan" }, { id: "mingguan", label: "Mingguan" }, { id: "kelas", label: "Kelas" }, { id: "bab", label: "Penguasaan bab" }, { id: "ketepatan", label: "Ketepatan" }, { id: "istiqamah", label: "Istiqamah" }]} />
      {(board === "kelas" || board === "bab") && <div className="mb-4 max-w-sm">{board === "kelas" ? <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>{d.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> : <select className="input" value={bab} onChange={(e) => setBab(e.target.value)}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select>}</div>}
      {d.settings.showDemo && <p className="mb-3 text-xs text-slate-500">Senarai mengandungi pelajar <b>DEMO</b> untuk tujuan paparan. Admin boleh menyembunyikannya di Tetapan.</p>}
      {!rows.length ? <Empty title="Tiada peserta" icon="🏆" /> : <>
        <div className="mb-4 grid grid-cols-3 items-end gap-3">
          {[top[1], top[0], top[2]].map((r, k) => r && (
            <Card key={r.user.id} className={cx("p-4 text-center", k === 1 ? "bg-gradient-to-b from-emas-100 to-white pb-6 dark:from-emas-500/20 dark:to-hutan-900" : "")}>
              <div className="text-3xl">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}</div>
              <div className="mx-auto mt-1 grid h-12 w-12 place-items-center rounded-full bg-zamrud-50 text-2xl dark:bg-white/5">{r.user.avatar}</div>
              <div className="mt-1 truncate text-sm font-bold">{r.user.name}</div><div className="text-xs text-slate-500">{r.label}</div>
            </Card>))}
        </div>
        <Card className="overflow-hidden">
          {rows.map((r) => { const s = summary(d, r.user.id); return (
            <div key={r.user.id} className={cx("flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-white/5", r.user.id === me.id && "bg-emas-50 dark:bg-emas-500/10")}>
              <div className="w-8 text-center font-extrabold text-slate-400">#{r.rank}</div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-zamrud-50 text-lg dark:bg-white/5">{r.user.avatar}</div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{r.user.name}{r.user.id === me.id && " (anda)"}</div><div className="text-xs text-slate-500">{s.lvl.level.name} · {d.classes.find((c) => c.id === r.user.classId)?.name ?? "Tiada kelas"}</div></div>
              <div className="text-right text-sm font-bold text-zamrud-700 dark:text-emas-300">{r.label}</div>
            </div>); })}
        </Card>
      </>}
    </div>
  );
}
