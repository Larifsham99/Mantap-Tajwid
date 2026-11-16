import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bookmark, Star } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb } from "../lib/store";
import { CHAPTERS, chapterById } from "../data";
import { Card, PageHeader, Progress, Tabs, Empty, TONES, CHAPTER_TONES } from "../components/ui";
import { norm } from "../lib/util";
import { chapterStats } from "../lib/gamification";

export default function Nota() {
  const me = useMe()!; const d = useDb();
  const [q, setQ] = useState(""); const [tab, setTab] = useState<"bab" | "penanda" | "kegemaran">("bab");
  const stats = chapterStats(d, me.id);
  const results = useMemo(() => {
    const t = norm(q); if (t.length < 2) return [];
    return CHAPTERS.flatMap((c) => c.sections.filter((s) => norm([s.title, s.takrif, s.takrifArab, ...s.huraian, s.ringkas, ...(s.contoh?.map((e) => e.arab + " " + e.huraian) ?? [])].join(" ")).includes(t)).map((s) => ({ c, s }))).slice(0, 30);
  }, [q]);
  const marks = d.bookmarks.filter((b) => b.userId === me.id && !!b.fav === (tab === "kegemaran"));
  const custom = d.customNotes.filter((n) => n.status === "diterbitkan" || n.status === "disemak");
  return (
    <div>
      <PageHeader title="Nota Tajwid" subtitle="Nota lengkap, carian, penanda & kegemaran" icon="📝" />
      <div className="relative mb-4"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="input !pl-10" placeholder="Cari nota… (cth: ikhfa, mad lazim, hamzah wasal, قلقلة)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {q.length >= 2 ? (
        <div className="space-y-2">{results.length ? results.map(({ c, s }) => <Link key={s.id} to={`/nota/${c.id}#${s.id}`} className="card block p-4 hover:ring-zamrud-300"><div className="text-xs text-emas-700">Bab {c.no}: {c.title}</div><div className="font-semibold">{s.title}</div>{s.ringkas && <div className="text-sm text-slate-500">{s.ringkas}</div>}</Link>) : <Empty title="Tiada padanan" icon="🔍">Cuba kata kunci lain.</Empty>}</div>
      ) : (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "bab", label: "Semua bab" }, { id: "penanda", label: <span className="flex items-center gap-1"><Bookmark size={14} /> Penanda</span> }, { id: "kegemaran", label: <span className="flex items-center gap-1"><Star size={14} /> Kegemaran</span> }]} />
          {tab === "bab" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {CHAPTERS.map((c, i) => (
                <Link key={c.id} to={`/nota/${c.id}`} className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-extrabold ${TONES[CHAPTER_TONES[i]].bubble}`}>{c.no}</div>
                  <div className="min-w-0 flex-1"><div className="font-bold">{c.title}</div><div className="truncate text-xs text-slate-500">{c.sections.map((s) => s.title).join(" · ")}</div><Progress value={stats[i].readPct} className="mt-2" /></div>
                  <div className="text-xs font-semibold text-slate-500">{stats[i].readPct}%</div>
                </Link>
              ))}
              {custom.length > 0 && <Card className="p-4 md:col-span-2"><div className="mb-2 font-bold">Nota tambahan guru</div>{custom.map((n) => <Link key={n.id} to={`/nota/${n.chapterId}#guru`} className="block py-1 text-sm text-zamrud-700">• {n.title} <span className="text-xs text-slate-400">({chapterById(n.chapterId)?.title}, {n.authorName})</span></Link>)}</Card>}
            </div>
          ) : marks.length ? (
            <div className="space-y-2">{marks.map((b) => <Link key={b.id} to={`/nota/${b.chapterId}${b.sectionId ? "#" + b.sectionId : ""}`} className="card flex items-center gap-3 p-4">{b.fav ? <Star className="text-emas-500" size={18} /> : <Bookmark className="text-zamrud-600" size={18} />}<div><div className="font-semibold">{b.label}</div><div className="text-xs text-slate-500">{chapterById(b.chapterId)?.title}</div></div></Link>)}</div>
          ) : <Empty title={tab === "penanda" ? "Tiada penanda" : "Tiada nota kegemaran"} icon="🔖">Tekan ikon penanda/bintang pada mana-mana seksyen nota.</Empty>}
        </>
      )}
    </div>
  );
}
