import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui";
import { useDB, ensureSeed } from "./lib/store";
import { useMe, atLeast, hashPw } from "./lib/auth";
import type { Role } from "./types";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const Belajar = lazy(() => import("./pages/Belajar"));
const Nota = lazy(() => import("./pages/Nota"));
const NotaBab = lazy(() => import("./pages/NotaBab"));
const Bank = lazy(() => import("./pages/Bank"));
const LatihTubi = lazy(() => import("./pages/LatihTubi"));
const Sesi = lazy(() => import("./pages/Sesi"));
const Simulasi = lazy(() => import("./pages/Simulasi"));
const SimulasiSesi = lazy(() => import("./pages/SimulasiSesi"));
const Murajaah = lazy(() => import("./pages/Murajaah"));
const Mursyid = lazy(() => import("./pages/Mursyid"));
const Scoreboard = lazy(() => import("./pages/Scoreboard"));
const Pencapaian = lazy(() => import("./pages/Pencapaian"));
const Profil = lazy(() => import("./pages/Profil"));
const Guru = lazy(() => import("./pages/Guru"));
const Admin = lazy(() => import("./pages/Admin"));
const Tetapan = lazy(() => import("./pages/Tetapan"));

function Guard({ children, role }: { children: ReactNode; role?: Role }) {
  const me = useMe(); const loc = useLocation();
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (role && !atLeast(me, role)) return <div className="card p-8 text-center"><div className="text-4xl">🔒</div><div className="mt-2 font-bold">Akses terhad</div><p className="text-sm text-slate-500">Halaman ini hanya untuk peranan {role} dan ke atas.</p></div>;
  return <>{children}</>;
}

function ThemeSync() {
  const s = useDB((d) => d.settings);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", s.theme === "dark" || (s.theme === "system" && mq.matches));
    apply(); mq.addEventListener("change", apply);
    document.documentElement.style.setProperty("--arab-size", `${s.arabicSize}px`);
    return () => mq.removeEventListener("change", apply);
  }, [s.theme, s.arabicSize]);
  return null;
}

const Loading = () => <div className="grid min-h-[40vh] place-items-center text-sm text-slate-500"><div className="animate-pulse">Memuatkan…</div></div>;

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { ensureSeed(hashPw).finally(() => setReady(true)); }, []);
  if (!ready) return <Loading />;
  const g = (el: ReactNode, role?: Role) => <Guard role={role}><Suspense fallback={<Loading />}>{el}</Suspense></Guard>;
  return (
    <HashRouter>
      <ThemeSync />
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={g(<Dashboard />)} />
          <Route path="belajar" element={g(<Belajar />)} />
          <Route path="nota" element={g(<Nota />)} />
          <Route path="nota/:id" element={g(<NotaBab />)} />
          <Route path="bank" element={g(<Bank />)} />
          <Route path="latih-tubi" element={g(<LatihTubi />)} />
          <Route path="latih-tubi/sesi" element={g(<Sesi />)} />
          <Route path="simulasi" element={g(<Simulasi />)} />
          <Route path="simulasi/:id" element={g(<SimulasiSesi />)} />
          <Route path="murajaah" element={g(<Murajaah />)} />
          <Route path="mursyid" element={g(<Mursyid />)} />
          <Route path="scoreboard" element={g(<Scoreboard />)} />
          <Route path="pencapaian" element={g(<Pencapaian />)} />
          <Route path="profil" element={g(<Profil />)} />
          <Route path="guru" element={g(<Guru />, "guru")} />
          <Route path="admin" element={g(<Admin />, "admin")} />
          <Route path="tetapan" element={g(<Tetapan />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
