import { Link } from "react-router-dom";
import { Flame, Target, CheckCircle2, Sparkles, BookOpen, Play, Trophy, Repeat } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb } from "../lib/store";
import { summary, leaderboard, BADGES } from "../lib/gamification";
import { dueReviews } from "../lib/actions";
import { CHAPTERS, chapterById } from "../data";
import { Card, Progress, Stat, Empty } from "../components/ui";
import { timeAgo, dayKey } from "../lib/util";

export default function Dashboard() {
  const me = useMe()!; const d = useDb();
  const s = summary(d, me.id);
  const due = dueReviews(d, me.id).length;
  const rankRow = leaderboard(d, "keseluruhan", { showDemo: d.settings.showDemo }).find((r) => r.user.id === me.id);
  const lastNote = d.notes.filter((n) => n.userId === me.id).sort((a, b) => b.ts - a.ts)[0];
  const lastCh = lastNote ? chapterById(lastNote.chapterId) : undefined;
  const nextCh = s.stats.find((st) => !st.mastered);
  const weakest = [...s.stats].filter((x) => x.attempts >= 3).sort((a, b) => a.acc - b.acc)[0];
  const myBadges = d.badges.filter((b) => b.userId === me.id);
  const activity = d.activity.filter((a) => a.userId === me.id).slice(-6).reverse();
  const today = dayKey(Date.now());
  const doneToday = d.attempts.filter((a) => a.userId === me.id && a.mode === "harian" && dayKey(a.ts) === today).length;
  const hour = new Date().getHours();
  const salam = hour < 12 ? "Selamat pagi" : hour < 15 ? "Selamat tengah hari" : hour < 19 ? "Selamat petang" : "Selamat malam";

  return (
    <div className="space-y-5">
      <Card className="hero relative overflow-hidden p-5 text-white rise sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-emas-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-4xl ring-2 ring-emas-400/60">{me.avatar}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-emas-200">Assalamu'alaikum 👋 · {salam}</div>
            <div className="truncate text-2xl font-extrabold">{me.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><span className="chip bg-emas-400 text-hutan-900">{s.lvl.level.name} <span className="font-arab">{s.lvl.level.arab}</span></span><span className="text-zamrud-100/80">{s.xp} XP</span>{rankRow && <span className="text-zamrud-100/80">· Kedudukan #{rankRow.rank}</span>}</div>
          </div>
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-xs text-zamrud-100/80"><span>Ke tahap {s.lvl.next?.name ?? "maksimum"}</span><span>{s.lvl.progress}%</span></div>
            <Progress value={s.lvl.progress} tone="emas" className="!bg-white/15" />
            {s.lvl.next && <div className="mt-1 text-[11px] text-zamrud-100/70">Syarat: {s.lvl.next.desc}</div>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="sky" label="Soalan dijawab" value={s.answered} icon={<Target size={16} />} />
        <Stat tone="zamrud" label="Ketepatan" value={`${s.acc}%`} icon={<CheckCircle2 size={16} />} />
        <Stat tone="violet" label="Bab dikuasai" value={`${s.mastered}/12`} icon={<BookOpen size={16} />} />
        <Stat tone="emas" label="Streak" value={`${s.streak} hari`} icon={<Flame size={16} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Langkah seterusnya</h2><Sparkles size={18} className="text-emas-500" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {lastCh && (
              <Link to={`/nota/${lastCh.id}#${lastNote!.lastSection ?? ""}`} className="rounded-2xl bg-zamrud-50 p-4 transition hover:bg-zamrud-100 dark:bg-white/5">
                <div className="text-xs font-semibold text-zamrud-700 dark:text-zamrud-300">SAMBUNG PEMBELAJARAN</div>
                <div className="mt-1 font-bold">Bab {lastCh.no}: {lastCh.title}</div>
                <div className="text-xs text-slate-500">Dibaca {timeAgo(lastNote!.ts)}</div>
              </Link>
            )}
            {nextCh && (() => { const c = chapterById(nextCh.chapterId)!; return (
              <Link to={nextCh.readPct < 100 ? `/nota/${c.id}` : `/latih-tubi/sesi?mode=bab&bab=${c.id}`} className="rounded-2xl bg-emas-50 p-4 transition hover:bg-emas-100 dark:bg-emas-500/10">
                <div className="text-xs font-semibold text-emas-700">CADANGAN</div>
                <div className="mt-1 font-bold">{nextCh.readPct < 100 ? "Baca nota" : "Latihan"} Bab {c.no}: {c.title}</div>
                <div className="text-xs text-slate-500">Nota {nextCh.readPct}% · Ketepatan {nextCh.acc}% ({nextCh.attempts} cubaan)</div>
              </Link>); })()}
            {weakest && weakest.acc < 70 && (
              <Link to={`/latih-tubi/sesi?mode=bab&bab=${weakest.chapterId}`} className="rounded-2xl bg-rose-50 p-4 transition hover:bg-rose-100 dark:bg-rose-500/10">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">BAB LEMAH</div>
                <div className="mt-1 font-bold">{chapterById(weakest.chapterId)!.title}</div>
                <div className="text-xs text-slate-500">Ketepatan {weakest.acc}% – ulang latihan</div>
              </Link>
            )}
            <Link to="/murajaah" className="rounded-2xl bg-sky-50 p-4 transition hover:bg-sky-100 dark:bg-sky-500/10">
              <div className="flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300"><Repeat size={12} /> MURAJAAH</div>
              <div className="mt-1 font-bold">{due ? `${due} soalan menunggu ulang kaji` : "Tiada ulang kaji tertunggak"}</div>
              <div className="text-xs text-slate-500">Sistem spaced repetition</div>
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Cabaran Harian</h2>
          <p className="text-sm text-slate-500">5 soalan rawak hari ini. Ganjaran XP tambahan setiap jawapan betul.</p>
          <Progress value={(Math.min(doneToday, 5) / 5) * 100} className="my-3" tone="emas" />
          <div className="mb-3 text-xs text-slate-500">{Math.min(doneToday, 5)}/5 selesai</div>
          <Link to="/latih-tubi/sesi?mode=harian" className="btn btn-gold w-full"><Play size={16} /> {doneToday >= 5 ? "Ulang cabaran" : "Mula cabaran"}</Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Penguasaan bab</h2><Link to="/belajar" className="text-sm font-semibold text-zamrud-700 dark:text-zamrud-300">Lihat semua →</Link></div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {s.stats.map((st) => { const c = CHAPTERS.find((x) => x.id === st.chapterId)!; return (
              <Link to={`/nota/${c.id}`} key={c.id} className="group">
                <div className="flex items-center justify-between text-sm"><span className="truncate font-medium group-hover:text-zamrud-700">{c.no}. {c.title}</span><span className="text-xs text-slate-500">{st.mastered ? "✅ Dikuasai" : `${Math.round(st.readPct * 0.5 + st.acc * 0.5)}%`}</span></div>
                <Progress value={st.mastered ? 100 : st.readPct * 0.5 + st.acc * 0.5} className="mt-1" tone={st.mastered ? "zamrud" : st.attempts >= 3 && st.acc < 60 ? "rose" : "emas"} />
              </Link>); })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Lencana</h2><Link to="/pencapaian" className="text-xs font-semibold text-zamrud-700">Semua</Link></div>
            {myBadges.length ? <div className="flex flex-wrap gap-2">{myBadges.map((b) => { const def = BADGES.find((x) => x.id === b.badgeId); return def && <span key={b.badgeId} title={def.desc} className="chip bg-emas-100 text-emas-700 dark:bg-emas-500/20 dark:text-emas-200">{def.icon} {def.name}</span>; })}</div> : <p className="text-sm text-slate-500">Belum ada lencana. Mulakan dengan membaca Bab 1!</p>}
          </Card>
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Aktiviti terkini</h2><Trophy size={16} className="text-emas-500" /></div>
            {activity.length ? <ul className="space-y-2 text-sm">{activity.map((a) => <li key={a.id} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zamrud-500" /><div><div>{a.text}</div><div className="text-xs text-slate-400">{timeAgo(a.ts)}</div></div></li>)}</ul> : <Empty title="Tiada aktiviti" />}
          </Card>
        </div>
      </div>
    </div>
  );
}
