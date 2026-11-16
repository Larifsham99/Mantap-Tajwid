import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LayoutDashboard, BookOpen, NotebookText, Archive, Dumbbell, Timer, Repeat, Bot, Trophy, Award, User, GraduationCap, ShieldCheck, Settings, LogOut, Menu, X } from "lucide-react";
import { useMe, atLeast, logout, ROLE_LABEL } from "../lib/auth";
import { cx } from "./ui";
import { useDB } from "../lib/store";
import { dueReviews } from "../lib/actions";

const NAV = [
  { to: "/", label: "Dashboard Utama", icon: LayoutDashboard, end: true },
  { to: "/belajar", label: "Belajar Tajwid", icon: BookOpen },
  { to: "/nota", label: "Nota Tajwid", icon: NotebookText },
  { to: "/bank", label: "Bank Soalan Tauliah", icon: Archive },
  { to: "/latih-tubi", label: "Latih Tubi", icon: Dumbbell },
  { to: "/simulasi", label: "Simulasi Peperiksaan", icon: Timer },
  { to: "/murajaah", label: "Murajaah Pintar", icon: Repeat, badge: true },
  { to: "/mursyid", label: "Mursyid Tajwid AI", icon: Bot },
  { to: "/scoreboard", label: "Scoreboard", icon: Trophy },
  { to: "/pencapaian", label: "Pencapaian", icon: Award },
  { to: "/profil", label: "Profil Pelajar", icon: User },
  { to: "/guru", label: "Dashboard Guru", icon: GraduationCap, role: "guru" as const },
  { to: "/admin", label: "Dashboard Admin", icon: ShieldCheck, role: "admin" as const },
  { to: "/tetapan", label: "Tetapan", icon: Settings },
];

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="./icon.svg" alt="" className="h-10 w-10 rounded-xl" />
      {!compact && <div><div className="text-[15px] font-extrabold tracking-wide text-white">TAJWID PONDOK</div><div className="text-[10px] font-semibold tracking-[.2em] text-emas-300">ILMU • FAHAM • LATIH • KUASAI</div></div>}
    </div>
  );
}

export default function Layout() {
  const me = useMe();
  const due = useDB((d) => (me ? dueReviews(d, me.id).length : 0));
  const [open, setOpen] = useState(false);
  const loc = useLocation(); const nav = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const items = NAV.filter((n) => !n.role || atLeast(me, n.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-zamrud-800 via-zamrud-900 to-hutan-900 motif-star">
      <div className="flex items-center justify-between p-4"><Brand /><button className="rounded-lg p-1 text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive ? "bg-gradient-to-r from-amber-300 to-emas-400 text-hutan-900 shadow-lg shadow-black/20" : "text-zamrud-50/85 hover:bg-white/10 hover:text-white")}>
            <n.icon size={18} /><span className="flex-1">{n.label}</span>
            {n.badge && due > 0 && <span className="rounded-full bg-rose-500 px-2 text-[11px] font-bold text-white">{due}</span>}
          </NavLink>
        ))}
      </nav>
      {me && (
        <div className="m-3 rounded-2xl bg-white/5 p-3 text-white">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-zamrud-700 text-lg">{me.avatar}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{me.name}</div><div className="text-[11px] text-emas-300">{ROLE_LABEL[me.role]}</div></div>
            <button title="Log keluar" className="rounded-lg p-1.5 hover:bg-white/10" onClick={async () => { await logout(); nav("/login"); }}><LogOut size={16} /></button></div>
        </div>
      )}
    </div>
  );

  const bottom = [NAV[0], NAV[1], NAV[4], NAV[6]];
  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-[82%] max-w-xs shadow-2xl">{sidebar}</div></div>}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-r from-zamrud-800 to-hutan-900 px-4 py-3 shadow-lg lg:hidden"><Brand /><button className="rounded-xl p-2 text-white" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button></header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zamrud-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-hutan-900/95 lg:hidden">
        {bottom.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", isActive ? "text-zamrud-700 dark:text-emas-300" : "text-slate-500")}>
            <n.icon size={20} />{n.label.split(" ")[0]}
            {n.badge && due > 0 && <span className="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-rose-500" />}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-500"><Menu size={20} />Lagi</button>
      </nav>
    </div>
  );
}
