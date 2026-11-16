import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login, register, useMe } from "../lib/auth";
import { useDB } from "../lib/store";
import { cloudEnabled } from "../lib/supabase";
import type { Role } from "../types";
import { Credit } from "../components/Layout";

const DEMO = [
  { email: "pelajar@demo.my", label: "Pelajar" }, { email: "guru@demo.my", label: "Guru" }, { email: "admin@demo.my", label: "Admin" }, { email: "superadmin@demo.my", label: "Super Admin" },
];

export default function Login() {
  const me = useMe(); const nav = useNavigate(); const loc = useLocation() as { state?: { from?: string } };
  const classes = useDB((d) => d.classes);
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [f, setF] = useState({ name: "", email: "", pw: "", role: "pelajar" as Role, classId: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  if (me) return <Navigate to={loc.state?.from || "/"} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = mode === "masuk" ? await login(f.email, f.pw) : await register(f.name, f.email, f.pw, f.role, f.classId || undefined);
    setBusy(false); if (r) setErr(r); else nav(loc.state?.from || "/");
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-hutan-900 p-10 text-white motif-star lg:flex">
        <div className="flex items-center gap-3"><img src="./icon.svg" className="h-12 w-12 rounded-2xl" alt="" /><div><div className="text-xl font-extrabold tracking-wide">TAJWID PONDOK</div><div className="text-xs tracking-[.25em] text-emas-300">ILMU • FAHAM • LATIH • KUASAI</div></div></div>
        <div>
          <div className="arab-block !text-left text-4xl text-emas-200" dir="rtl">وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا</div>
          <p className="mt-2 text-sm text-zamrud-100/80">"Dan bacalah al-Quran dengan tartil." (al-Muzzammil:4)</p>
          <ul className="mt-8 space-y-2 text-sm text-zamrud-50/90">
            <li>📖 Nota tajwid 12 bab berstruktur — takrif, dhobit, jadual, contoh</li>
            <li>🗂️ Bank soalan tauliah Kedah 2014–2025 (10 kertas)</li>
            <li>🎯 Latih tubi, simulasi peperiksaan & murajaah pintar</li>
            <li>🤖 Mursyid Tajwid AI berasaskan nota</li>
          </ul>
        </div>
        <div className="text-xs text-zamrud-100/50">Pemantapan ilmu tajwid & persediaan tauliah mengajar al-Quran Negeri Kedah.</div>
      </div>
      <div className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden"><img src="./icon.svg" className="h-11 w-11 rounded-2xl" alt="" /><div><div className="text-lg font-extrabold text-hutan-900 dark:text-white">TAJWID PONDOK</div><div className="text-[10px] tracking-[.2em] text-emas-600">ILMU • FAHAM • LATIH • KUASAI</div></div></div>
          <div className="card p-6">
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-zamrud-50 p-1 dark:bg-white/5">
              {(["masuk", "daftar"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-lg py-2 text-sm font-semibold ${mode === m ? "bg-white shadow dark:bg-hutan-950" : "text-slate-500"}`}>{m === "masuk" ? "Log Masuk" : "Daftar"}</button>)}
            </div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "daftar" && <div><label className="label">Nama penuh</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>}
              <div><label className="label">Emel</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" /></div>
              <div><label className="label">Kata laluan</label><input className="input" type="password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} required autoComplete={mode === "masuk" ? "current-password" : "new-password"} /></div>
              {mode === "daftar" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Peranan</label><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}><option value="pelajar">Pelajar</option><option value="guru">Guru</option><option value="awam">Pengguna awam</option></select></div>
                  <div><label className="label">Kelas</label><select className="input" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}><option value="">— Tiada —</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
              )}
              {err && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{err}</div>}
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sila tunggu…" : mode === "masuk" ? "Log Masuk" : "Cipta Akaun"}</button>
            </form>
            <p className="mt-3 text-xs text-slate-500">{cloudEnabled ? "🔐 Disambungkan ke Supabase Auth." : "💾 Mod tempatan: akaun & data disimpan dalam pelayar ini (kata laluan disimpan sebagai hash SHA-256)."}</p>
          </div>
          <div className="mt-4 card p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-emas-700">Akaun DEMO (kata laluan: tajwid123)</div>
            <div className="grid grid-cols-2 gap-2">{DEMO.map((d) => <button key={d.email} className="btn btn-ghost !py-2 text-xs" onClick={async () => { const r = await login(d.email, "tajwid123"); if (r) setErr(r); else nav("/"); }}>Masuk sebagai {d.label}</button>)}</div>
          </div>
          <Credit className="mt-6" />
        </div>
      </div>
    </div>
  );
}
