import { Award } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb } from "../lib/store";
import { BADGES, LEVELS, summary, XP_RULES } from "../lib/gamification";
import { Card, PageHeader, Progress, cx } from "../components/ui";
import { fmtDate } from "../lib/util";

export default function Pencapaian() {
  const me = useMe()!; const d = useDb();
  const s = summary(d, me.id);
  const mine = new Map(d.badges.filter((b) => b.userId === me.id).map((b) => [b.badgeId, b.ts]));
  const badges = BADGES.filter((b) => !d.disabledBadges.includes(b.id));
  return (
    <div>
      <PageHeader title="Pencapaian" subtitle={`${mine.size}/${badges.length} lencana · ${s.xp} XP`} icon={<Award />} />
      <Card className="mb-5 p-5">
        <div className="mb-3 font-bold">Tahap penguasaan</div>
        <div className="grid gap-3 sm:grid-cols-5">
          {LEVELS.map((l, i) => { const reached = i <= s.lvl.idx; return (
            <div key={l.id} className={cx("rounded-2xl p-3 text-center ring-1", reached ? "bg-zamrud-700 text-white ring-zamrud-700" : "ring-slate-200 dark:ring-white/10", i === s.lvl.idx && "ring-4 ring-emas-400")}>
              <div className="font-arab text-xl">{l.arab}</div><div className="text-sm font-bold">{l.name}</div><div className={cx("mt-1 text-[11px]", reached ? "text-zamrud-100" : "text-slate-500")}>{l.desc}</div>
            </div>); })}
        </div>
        {s.lvl.next && <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>Kemajuan ke {s.lvl.next.name}</span><span>{s.xp}/{s.lvl.next.minXp} XP · {s.mastered}/{s.lvl.next.minMastered} bab</span></div><Progress value={s.lvl.progress} tone="emas" /></div>}
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => { const got = mine.get(b.id); return (
          <Card key={b.id} className={cx("flex items-center gap-4 p-4", !got && "opacity-60 grayscale")}>
            <div className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl", got ? "bg-emas-100 dark:bg-emas-500/20" : "bg-slate-100 dark:bg-white/5")}>{b.icon}</div>
            <div><div className="font-bold">{b.name}</div><div className="text-xs text-slate-500">{b.desc}</div><div className="mt-1 text-xs font-semibold">{got ? <span className="text-zamrud-700 dark:text-zamrud-300">✓ Diperoleh {fmtDate(got)}</span> : "🔒 Belum diperoleh"}</div></div>
          </Card>); })}
      </div>
      <Card className="mt-5 p-5 text-sm">
        <div className="mb-2 font-bold">Cara memperoleh XP</div>
        <div className="grid gap-1 sm:grid-cols-2">
          <div>• Menjawab soalan: +{XP_RULES.answer} XP</div><div>• Jawapan betul: +{XP_RULES.correct} XP tambahan</div>
          <div>• Soalan tauliah (semakan kendiri): +{XP_RULES.tauliahSelf}–{XP_RULES.tauliahSelf + 6} XP</div><div>• Menamatkan latihan: +{XP_RULES.exercise} XP</div>
          <div>• Menamatkan simulasi: +{XP_RULES.exam} XP</div><div>• Membaca satu seksyen nota: +{XP_RULES.noteSection} XP</div>
          <div>• Menguasai satu bab: +{XP_RULES.chapterMastered} XP</div><div>• Murajaah konsisten: lencana 30 Hari Murajaah</div>
        </div>
      </Card>
    </div>
  );
}
