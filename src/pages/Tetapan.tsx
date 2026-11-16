import { useState } from "react";
import { Settings, Cloud } from "lucide-react";
import { useMe, atLeast } from "../lib/auth";
import { useDb, update } from "../lib/store";
import { cloudEnabled } from "../lib/supabase";
import { pushProgress, pullProgress } from "../lib/sync";
import { Card, PageHeader, toast, cx } from "../components/ui";
import { download } from "../lib/util";

export default function Tetapan() {
  const me = useMe()!; const d = useDb(); const s = d.settings;
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof s>) => update((x) => { x.settings = { ...x.settings, ...patch }; });
  return (
    <div>
      <PageHeader title="Tetapan" icon={<Settings />} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="font-bold">Paparan</div>
          <div><label className="label">Tema</label><div className="grid grid-cols-3 gap-2">{(["light", "dark", "system"] as const).map((t) => <button key={t} onClick={() => set({ theme: t })} className={cx("rounded-xl py-2 text-sm font-semibold ring-1", s.theme === t ? "bg-zamrud-700 text-white ring-zamrud-700" : "ring-slate-200 dark:ring-white/10")}>{{ light: "☀️ Cerah", dark: "🌙 Gelap", system: "🖥️ Sistem" }[t]}</button>)}</div></div>
          <div><label className="label">Saiz teks Arab: {s.arabicSize}px</label><input type="range" min={18} max={40} value={s.arabicSize} onChange={(e) => set({ arabicSize: Number(e.target.value) })} className="w-full accent-emerald-700" /><div className="arab-block">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div></div>
          <div><label className="label">Sasaran soalan harian</label><input type="number" min={5} max={200} className="input" value={s.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })} /></div>
        </Card>
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2 font-bold"><Cloud size={18} /> Data & penyegerakan</div>
          <p className="text-sm text-slate-500">{cloudEnabled ? "Supabase dikonfigurasi. Anda boleh menyegerakkan kemajuan ke awan." : "Mod tempatan: data disimpan dalam pelayar ini sahaja. Admin boleh mengaktifkan Supabase (lihat docs/KONFIGURASI.md)."}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={!cloudEnabled || busy} onClick={async () => { setBusy(true); const r = await pushProgress(me.id); setBusy(false); toast(r.msg, r.ok ? "ok" : "err"); }}>Hantar ke awan</button>
            <button className="btn btn-ghost" disabled={!cloudEnabled || busy} onClick={async () => { setBusy(true); const r = await pullProgress(me.id); setBusy(false); toast(r.msg, r.ok ? "ok" : "err"); }}>Muat turun dari awan</button>
            <button className="btn btn-outline" onClick={() => { const mine = <T extends { userId: string }>(a: T[]) => a.filter((x) => x.userId === me.id); download(`kemajuan-${me.name.replace(/\s+/g, "-")}.json`, JSON.stringify({ user: { name: me.name, email: me.email }, attempts: mine(d.attempts), xp: mine(d.xp), exams: mine(d.exams), review: mine(d.review), badges: mine(d.badges), notes: mine(d.notes) }, null, 1), "application/json"); }}>Eksport kemajuan saya</button>
          </div>
        </Card>
        <Card className="space-y-2 p-5 md:col-span-2">
          <div className="font-bold">Mursyid Tajwid AI</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.aiEnabled} onChange={(e) => set({ aiEnabled: e.target.checked })} /> Guna AI generatif apabila tersedia</label>
          {atLeast(me, "admin") ? <div className="flex flex-wrap gap-2"><input className="input flex-1" placeholder="URL titik akhir AI (Supabase Edge Function)" defaultValue={s.aiEndpoint} onBlur={(e) => set({ aiEndpoint: e.target.value.trim() })} /></div> : <p className="text-xs text-slate-500">Titik akhir AI: {s.aiEndpoint || import.meta.env.VITE_AI_ENDPOINT ? "dikonfigurasi" : "belum dikonfigurasi (mod luar talian)"}.</p>}
        </Card>
        <Card className="p-5 text-sm md:col-span-2">
          <div className="mb-1 font-bold">Tentang aplikasi</div>
          <p>TAJWID PONDOK v1.0 — Ilmu • Faham • Latih • Kuasai. Platform pemantapan ilmu tajwid & persediaan tauliah mengajar al-Quran Negeri Kedah.</p>
          <p className="mt-1 text-xs text-slate-500">Modul amali bacaan (rakaman/analisis suara) ditangguhkan ke versi akan datang. Semua kandungan berlabel "belum disemak" perlu disahkan guru bertauliah. Soalan latihan BUKAN soalan rasmi tauliah.</p>
        </Card>
      </div>
    </div>
  );
}
