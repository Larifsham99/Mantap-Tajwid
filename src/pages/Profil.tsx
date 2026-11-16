import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe, ROLE_LABEL, changePassword } from "../lib/auth";
import { useDb, update } from "../lib/store";
import { summary, leaderboard, BADGES } from "../lib/gamification";
import { CHAPTERS, chapterById } from "../data";
import { BarChart, Card, PageHeader, Stat, Tabs, toast, Modal } from "../components/ui";
import { fmtDateTime, fmtDate } from "../lib/util";

const AVATARS = ["🙂", "🧕", "🧔", "👳", "🧑", "👦", "👧", "👨‍🎓", "👩‍🎓", "🌙", "📖", "🕌"];

export default function Profil() {
  const me = useMe()!; const d = useDb();
  const s = summary(d, me.id);
  const rank = leaderboard(d, "keseluruhan", { showDemo: d.settings.showDemo }).find((r) => r.user.id === me.id)?.rank;
  const [tab, setTab] = useState<"perkembangan" | "ujian" | "latihan" | "murajaah" | "aktiviti">("perkembangan");
  const [edit, setEdit] = useState(false); const [f, setF] = useState({ name: me.name, avatar: me.avatar, classId: me.classId ?? "", bio: me.bio ?? "" });
  const [pw, setPw] = useState({ old: "", nw: "" });
  const exams = d.exams.filter((e) => e.userId === me.id).sort((a, b) => b.startedAt - a.startedAt);
  const acts = d.activity.filter((a) => a.userId === me.id).slice().reverse();
  const reviewAtt = d.attempts.filter((a) => a.userId === me.id && a.mode === "murajaah").slice(-30).reverse();
  return (
    <div>
      <PageHeader title="Profil Pelajar" icon="👤" actions={<button className="btn btn-ghost" onClick={() => setEdit(true)}>Sunting profil</button>} />
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-zamrud-50 text-5xl ring-2 ring-emas-300 dark:bg-white/5">{me.avatar}</div>
        <div className="min-w-0 flex-1"><div className="text-xl font-extrabold">{me.name}</div><div className="text-sm text-slate-500">{me.email} · {ROLE_LABEL[me.role]} · {d.classes.find((c) => c.id === me.classId)?.name ?? "Tiada kelas"}</div>{me.bio && <div className="mt-1 text-sm">{me.bio}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">{d.badges.filter((b) => b.userId === me.id).map((b) => { const x = BADGES.find((y) => y.id === b.badgeId); return x && <span key={b.badgeId} className="chip bg-emas-100 text-emas-700" title={x.desc}>{x.icon} {x.name}</span>; })}</div></div>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Tahap" value={s.lvl.level.name} /><Stat label="XP" value={s.xp} /><Stat label="Ranking" value={rank ? `#${rank}` : "—"} />
        <Stat label="Soalan" value={s.answered} /><Stat label="Ketepatan" value={`${s.acc}%`} /><Stat label="Streak" value={`${s.streak} hari`} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "perkembangan", label: "Perkembangan" }, { id: "ujian", label: `Rekod ujian (${exams.length})` }, { id: "latihan", label: "Rekod latihan" }, { id: "murajaah", label: "Sejarah murajaah" }, { id: "aktiviti", label: "Aktiviti" }]} />
      {tab === "perkembangan" && <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5"><div className="mb-3 font-bold">Ketepatan mengikut bab</div><BarChart data={CHAPTERS.map((c, i) => ({ label: `${c.no}. ${c.title}`, value: s.stats[i].acc }))} /></Card>
        <Card className="p-5"><div className="mb-2 font-bold">Bab dikuasai ({s.mastered})</div>{s.stats.filter((x) => x.mastered).map((x) => <div key={x.chapterId} className="text-sm">👑 {chapterById(x.chapterId)?.title}</div>)}{!s.mastered && <p className="text-sm text-slate-500">Belum ada.</p>}
          <div className="mb-2 mt-4 font-bold">Bab lemah ({s.weak.length})</div>{s.weak.map((x) => <Link key={x.chapterId} to={`/latih-tubi/sesi?mode=bab&bab=${x.chapterId}`} className="block text-sm text-rose-600">⚠️ {chapterById(x.chapterId)?.title} – {x.acc}%</Link>)}{!s.weak.length && <p className="text-sm text-slate-500">Tiada bab lemah dikesan.</p>}</Card>
      </div>}
      {tab === "ujian" && <Card className="overflow-x-auto"><table className="tbl"><thead><tr><th>Ujian</th><th>Tarikh</th><th>Markah</th><th>Status</th></tr></thead><tbody>{exams.map((e) => <tr key={e.id}><td><Link className="font-semibold text-zamrud-700" to={`/simulasi/${e.id}`}>{e.title}</Link></td><td>{fmtDateTime(e.startedAt)}</td><td>{e.score ?? "—"}/{e.maxScore ?? "—"}</td><td>{e.status}</td></tr>)}</tbody></table>{!exams.length && <p className="p-4 text-sm text-slate-500">Tiada rekod.</p>}</Card>}
      {tab === "latihan" && <Card className="p-4">{acts.filter((a) => a.type === "latihan").map((a) => <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">{a.text}<div className="text-xs text-slate-400">{fmtDateTime(a.ts)}</div></div>)}{!acts.some((a) => a.type === "latihan") && <p className="text-sm text-slate-500">Tiada rekod.</p>}</Card>}
      {tab === "murajaah" && <Card className="p-4">{reviewAtt.map((a) => <div key={a.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5"><span>{chapterById(a.chapterId)?.title}</span><span className={a.correct ? "text-zamrud-600" : "text-rose-600"}>{a.correct ? "Betul" : "Salah"} · {fmtDate(a.ts)}</span></div>)}{!reviewAtt.length && <p className="text-sm text-slate-500">Tiada sesi murajaah.</p>}</Card>}
      {tab === "aktiviti" && <Card className="p-4">{acts.slice(0, 50).map((a) => <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">{a.text}<div className="text-xs text-slate-400">{fmtDateTime(a.ts)}</div></div>)}</Card>}

      <Modal open={edit} onClose={() => setEdit(false)} title="Sunting profil">
        <div className="space-y-3">
          <div><label className="label">Nama</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Avatar</label><div className="flex flex-wrap gap-2">{AVATARS.map((a) => <button key={a} onClick={() => setF({ ...f, avatar: a })} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${f.avatar === a ? "bg-zamrud-100 ring-2 ring-zamrud-600" : "bg-slate-100 dark:bg-white/5"}`}>{a}</button>)}</div></div>
          <div><label className="label">Kelas</label><select className="input" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}><option value="">— Tiada —</option>{d.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Bio</label><input className="input" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
          <button className="btn btn-primary w-full" onClick={() => { update((x) => { const u = x.users.find((y) => y.id === me.id)!; u.name = f.name.trim() || u.name; u.avatar = f.avatar; u.classId = f.classId || undefined; u.bio = f.bio; }); setEdit(false); toast("Profil dikemas kini"); }}>Simpan</button>
          {!me.passHash.startsWith("-") && <div className="border-t border-slate-100 pt-3 dark:border-white/10"><div className="label">Tukar kata laluan</div><div className="grid gap-2 sm:grid-cols-2"><input className="input" type="password" placeholder="Lama" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /><input className="input" type="password" placeholder="Baharu" value={pw.nw} onChange={(e) => setPw({ ...pw, nw: e.target.value })} /></div><button className="btn btn-outline mt-2" onClick={async () => { const r = await changePassword(me.id, pw.old, pw.nw); toast(r ?? "Kata laluan ditukar", r ? "err" : "ok"); if (!r) setPw({ old: "", nw: "" }); }}>Tukar</button></div>}
        </div>
      </Modal>
    </div>
  );
}
