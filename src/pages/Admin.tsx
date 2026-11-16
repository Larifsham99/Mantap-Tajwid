import { useRef, useState } from "react";
import { ShieldCheck, Download, Upload, Trash2, FileUp, Sparkles } from "lucide-react";
import { useMe, atLeast, ROLE_LABEL } from "../lib/auth";
import { useDb, update, getDB, setDB, resetAll, allQuestions, DEFAULT_SETTINGS } from "../lib/store";
import { BADGES } from "../lib/gamification";
import { CHAPTERS } from "../data";
import { refLabel } from "../data/refs";
import { BarChart, Card, PageHeader, Stat, Tabs, toast, Empty, RichText, StatusBadge } from "../components/ui";
import { QuestionBankManager, NotesManager, AiFeedbackPanel } from "../components/ManagePanels";
import { extractDocx, extractPdf, splitQuestions } from "../lib/importer";
import { aiExtractQuestions } from "../lib/ai";
import { DAY, dayKey, download, fmtDateTime, startOfDay, uid } from "../lib/util";
import type { DB, Question, Role } from "../types";

type Tab = "analitik" | "pengguna" | "kelas" | "bank" | "import" | "nota" | "rujukan" | "ai" | "simulasi" | "lencana" | "moderasi" | "backup" | "akses";

export default function Admin() {
  const me = useMe()!; const d = useDb();
  const [tab, setTab] = useState<Tab>("analitik");
  const isSuper = me.role === "superadmin";
  return (
    <div>
      <PageHeader title="Dashboard Admin" subtitle="Pengurusan keseluruhan aplikasi" icon={<ShieldCheck />} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "analitik", label: "Analitik" }, { id: "pengguna", label: "Pengguna" }, { id: "kelas", label: "Kelas" }, { id: "bank", label: "Bank soalan" }, { id: "import", label: "Import" }, { id: "nota", label: "Nota" },
        { id: "rujukan", label: "Rujukan" }, { id: "ai", label: "AI" }, { id: "simulasi", label: "Simulasi" }, { id: "lencana", label: "Lencana & scoreboard" }, { id: "moderasi", label: "Moderasi" }, { id: "backup", label: "Backup" }, { id: "akses", label: "Akses (RBAC)" },
      ]} />
      {tab === "analitik" && <Analitik />}
      {tab === "pengguna" && <Pengguna isSuper={isSuper} />}
      {tab === "kelas" && <Kelas />}
      {tab === "bank" && <QuestionBankManager />}
      {tab === "import" && <Import />}
      {tab === "nota" && <NotesManager />}
      {tab === "rujukan" && <Rujukan />}
      {tab === "ai" && <AiAdmin />}
      {tab === "simulasi" && <Card className="overflow-x-auto"><table className="tbl"><thead><tr><th>Pelajar</th><th>Ujian</th><th>Tarikh</th><th>Markah</th><th>Status</th><th></th></tr></thead><tbody>{d.exams.slice().reverse().map((e) => <tr key={e.id}><td>{d.users.find((u) => u.id === e.userId)?.name}</td><td>{e.title}</td><td>{fmtDateTime(e.startedAt)}</td><td>{e.score ?? "-"}/{e.maxScore ?? "-"}</td><td>{e.status}</td><td><button className="text-rose-600" onClick={() => update((x) => { x.exams = x.exams.filter((y) => y.id !== e.id); })}><Trash2 size={14} /></button></td></tr>)}</tbody></table>{!d.exams.length && <p className="p-4 text-sm text-slate-500">Tiada sesi simulasi.</p>}</Card>}
      {tab === "lencana" && <Card className="p-4">
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={d.settings.showDemo} onChange={(e) => update((x) => { x.settings.showDemo = e.target.checked; })} /> Paparkan pelajar DEMO dalam scoreboard</label>
        <div className="mb-2 font-bold">Lencana aktif</div>
        <div className="grid gap-2 sm:grid-cols-2">{BADGES.map((b) => { const off = d.disabledBadges.includes(b.id); return <label key={b.id} className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-slate-100 dark:ring-white/10"><input type="checkbox" checked={!off} onChange={() => update((x) => { x.disabledBadges = off ? x.disabledBadges.filter((y) => y !== b.id) : [...x.disabledBadges, b.id]; })} /><span className="text-xl">{b.icon}</span><div><div className="text-sm font-semibold">{b.name}</div><div className="text-xs text-slate-500">{b.desc} · {d.badges.filter((y) => y.badgeId === b.id).length} penerima</div></div></label>; })}</div>
      </Card>}
      {tab === "moderasi" && <Card className="overflow-x-auto"><table className="tbl"><thead><tr><th>Masa</th><th>Oleh</th><th>Sasaran</th><th>Tindakan</th><th>Catatan</th></tr></thead><tbody>{d.contentReviews.slice().reverse().slice(0, 200).map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDateTime(r.ts)}</td><td>{r.byName}</td><td>{r.targetType}: {r.targetId}</td><td>{r.action}</td><td>{r.note}</td></tr>)}</tbody></table>{!d.contentReviews.length && <p className="p-4 text-sm text-slate-500">Tiada log semakan kandungan.</p>}</Card>}
      {tab === "backup" && <Backup />}
      {tab === "akses" && <Card className="overflow-x-auto p-0"><table className="tbl"><thead><tr><th>Fungsi</th><th>Super Admin</th><th>Admin</th><th>Guru</th><th>Pelajar</th><th>Awam</th></tr></thead><tbody>{[
        ["Belajar, nota, latihan, simulasi, murajaah, AI", 1, 1, 1, 1, 1], ["Dashboard Guru (pelajar kelas sendiri)", 1, 1, 1, 0, 0], ["Semak jawapan / status 'Disemak'", 1, 1, 1, 0, 0], ["Terbitkan (sahkan) jawapan", 1, 1, 0, 0, 0],
        ["Import dokumen & AI ekstrak", 1, 1, 0, 0, 0], ["Pengurusan pengguna & kelas", 1, 1, 0, 0, 0], ["Lantik Admin / Super Admin", 1, 0, 0, 0, 0], ["Backup & pulih data", 1, 1, 0, 0, 0],
      ].map((r) => <tr key={r[0] as string}><td>{r[0]}</td>{r.slice(1).map((v, i) => <td key={i}>{v ? "✅" : "—"}</td>)}</tr>)}</tbody></table><p className="p-3 text-xs text-slate-500">Dalam mod Supabase, kawalan yang sama dikuatkuasakan di pelayan melalui Row Level Security (lihat supabase/schema.sql).</p></Card>}
    </div>
  );
}

function Analitik() {
  const d = useDb();
  const days = Array.from({ length: 14 }, (_, k) => { const t = startOfDay() - (13 - k) * DAY; return { label: new Date(t).toLocaleDateString("ms-MY", { day: "numeric", month: "short" }), value: d.attempts.filter((a) => dayKey(a.ts) === dayKey(t)).length }; });
  const active7 = new Set(d.attempts.filter((a) => a.ts > Date.now() - 7 * DAY).map((a) => a.userId)).size;
  const qs = allQuestions(d);
  const byStatus = (["draf", "belum_disemak", "disemak", "diterbitkan"] as const).map((s) => ({ label: s, value: qs.filter((q) => q.status === s).length }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pengguna" value={d.users.length} hint={(["superadmin", "admin", "guru", "pelajar", "awam"] as Role[]).map((r) => `${ROLE_LABEL[r]}: ${d.users.filter((u) => u.role === r).length}`).join(" · ")} />
        <Stat label="Aktif 7 hari" value={active7} /><Stat label="Jawapan direkod" value={d.attempts.length} /><Stat label="Soalan dalam bank" value={qs.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5"><div className="mb-3 font-bold">Jawapan sehari (14 hari)</div><BarChart data={days} max={Math.max(5, ...days.map((x) => x.value))} suffix="" /></Card>
        <Card className="p-5"><div className="mb-3 font-bold">Status semakan soalan</div><BarChart data={byStatus} max={Math.max(1, ...byStatus.map((x) => x.value))} suffix="" />
          <div className="mt-4 mb-2 font-bold">Penggunaan bab</div><BarChart data={CHAPTERS.map((c) => ({ label: `${c.no}. ${c.title}`, value: d.attempts.filter((a) => a.chapterId === c.id).length }))} max={Math.max(1, ...CHAPTERS.map((c) => d.attempts.filter((a) => a.chapterId === c.id).length))} suffix="" /></Card>
      </div>
    </div>
  );
}

function Pengguna({ isSuper }: { isSuper: boolean }) {
  const d = useDb(); const me = useMe()!; const [q, setQ] = useState("");
  const roles: Role[] = isSuper ? ["superadmin", "admin", "guru", "pelajar", "awam"] : ["guru", "pelajar", "awam"];
  const list = d.users.filter((u) => !q || (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <Card className="overflow-x-auto">
      <div className="p-3"><input className="input" placeholder="Cari pengguna…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <table className="tbl"><thead><tr><th>Nama</th><th>Emel</th><th>Peranan</th><th>Kelas</th><th>Daftar</th><th></th></tr></thead>
        <tbody>{list.map((u) => { const locked = !isSuper && (u.role === "admin" || u.role === "superadmin"); return (
          <tr key={u.id}><td>{u.avatar} {u.name}{u.demo && <span className="chip ml-1 bg-slate-100 text-[10px]">DEMO</span>}</td><td className="text-xs">{u.email}</td>
            <td><select className="input !py-1" disabled={locked || u.id === me.id} value={u.role} onChange={(e) => update((x) => { x.users.find((y) => y.id === u.id)!.role = e.target.value as Role; })}>{(locked ? [u.role] : roles).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
            <td><select className="input !py-1" value={u.classId ?? ""} onChange={(e) => update((x) => { x.users.find((y) => y.id === u.id)!.classId = e.target.value || undefined; })}><option value="">—</option>{d.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
            <td className="text-xs">{new Date(u.createdAt).toLocaleDateString("ms-MY")}</td>
            <td>{!locked && u.id !== me.id && <button className="text-rose-600" title="Padam pengguna" onClick={() => { if (confirm(`Padam ${u.name} beserta rekodnya?`)) update((x) => { x.users = x.users.filter((y) => y.id !== u.id); (["attempts", "xp", "exams", "review", "badges", "notes", "bookmarks", "activity", "ai"] as const).forEach((k) => { (x as any)[k] = (x[k] as { userId: string }[]).filter((r) => r.userId !== u.id); }); }); }}><Trash2 size={14} /></button>}</td></tr>); })}</tbody></table>
    </Card>
  );
}

function Kelas() {
  const d = useDb(); const [name, setName] = useState(""); const [t, setT] = useState("");
  const teachers = d.users.filter((u) => atLeast(u, "guru"));
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="space-y-2 p-4"><div className="font-bold">Kelas baharu</div><input className="input" placeholder="Nama kelas" value={name} onChange={(e) => setName(e.target.value)} /><select className="input" value={t} onChange={(e) => setT(e.target.value)}><option value="">— Guru —</option>{teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><button className="btn btn-primary" onClick={() => { if (!name.trim()) return; update((x) => { x.classes.push({ id: uid("k-"), name: name.trim(), teacherId: t || undefined }); }); setName(""); toast("Kelas dicipta"); }}>Cipta kelas</button></Card>
      <div className="space-y-2">{d.classes.map((c) => <Card key={c.id} className="flex flex-wrap items-center gap-2 p-3"><input className="input flex-1" value={c.name} onChange={(e) => update((x) => { x.classes.find((y) => y.id === c.id)!.name = e.target.value; })} /><select className="input !w-auto" value={c.teacherId ?? ""} onChange={(e) => update((x) => { x.classes.find((y) => y.id === c.id)!.teacherId = e.target.value || undefined; })}><option value="">— Guru —</option>{teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><span className="text-xs text-slate-500">{d.users.filter((u) => u.classId === c.id).length} pelajar</span><button className="text-rose-600" onClick={() => { if (confirm("Padam kelas?")) update((x) => { x.classes = x.classes.filter((y) => y.id !== c.id); x.users.forEach((u) => { if (u.classId === c.id) u.classId = undefined; }); }); }}><Trash2 size={14} /></button></Card>)}</div>
    </div>
  );
}

function Import() {
  const d = useDb(); const me = useMe()!;
  const [text, setText] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<number | "">(""); const [ch, setCh] = useState("b1");
  const [drafts, setDrafts] = useState<Question[]>([]); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");
  async function readFile(f: File) {
    setFile(f); setBusy("Membaca dokumen…"); setMsg("");
    try {
      if (f.name.toLowerCase().endsWith(".pdf")) { const r = await extractPdf(f); setText(r.text); setMsg(r.scanned ? `⚠️ PDF ${r.pages} halaman ini kelihatan seperti imbasan (tiada lapisan teks yang bermakna). Gunakan "Ekstrak dengan AI" yang membaca imej PDF, atau taip/tampal secara manual.` : `✓ ${r.pages} halaman dibaca.`); }
      else if (f.name.toLowerCase().endsWith(".docx")) { setText(await extractDocx(f)); setMsg("✓ Dokumen Word dibaca."); }
      else { setText(await f.text()); setMsg("✓ Fail teks dibaca."); }
    } catch (e) { setMsg("Ralat membaca fail: " + (e as Error).message); }
    setBusy("");
  }
  async function viaAI() {
    setBusy("AI sedang mengekstrak soalan… (boleh mengambil masa beberapa minit)"); setMsg("");
    try {
      const out = await aiExtractQuestions(d.settings.aiEndpoint, { text: file?.name.toLowerCase().endsWith(".pdf") ? undefined : text, pdf: file?.name.toLowerCase().endsWith(".pdf") ? file : undefined });
      setDrafts(out.map((o) => ({ id: uid("C-"), source: "custom", type: "subjective", chapterId: ch, difficulty: 2, marks: 5, prompt: o.prompt, modelAnswer: "", status: "draf", year: year || undefined, qNo: o.qNo, part: o.part, section: (o.section as "A" | "B") ?? (o.qNo && o.qNo > 3 ? "B" : "A"), createdBy: me.id, updatedAt: Date.now() })));
      setMsg(`✓ AI mengekstrak ${out.length} soalan. Semak setiap satu sebelum menyimpan.`);
    } catch (e) { setMsg("AI gagal: " + (e as Error).message); }
    setBusy("");
  }
  function saveDrafts() {
    update((x) => { x.customQuestions.push(...drafts); x.contentReviews.push({ id: uid("rv"), targetType: "question", targetId: `${drafts.length} soalan`, action: "Import draf", byId: me.id, byName: me.name, ts: Date.now() }); });
    toast(`${drafts.length} soalan disimpan sebagai DRAF. Luluskan di tab Bank soalan.`); setDrafts([]);
  }
  return (
    <div className="space-y-4">
      <Card className="p-4 text-sm">Aliran import: <b>Muat naik PDF / Word / teks</b> atau <b>tampal manual</b> → <b>pecahkan automatik</b> atau <b>ekstrak dengan AI</b> → <b>sunting hasil</b> → simpan sebagai <b>DRAF</b> → tetapkan jawapan & penerangan → <b>admin meluluskan</b> sebelum diterbitkan. AI tidak boleh menerbitkan jawapan secara terus.</Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <label className="btn btn-outline w-full cursor-pointer"><FileUp size={16} /> Pilih PDF / Word (.docx) / .txt<input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} /></label>
          {file && <div className="text-xs text-slate-500">Fail: {file.name}</div>}
          <div className="grid grid-cols-2 gap-2"><div><label className="label">Tahun</label><input type="number" className="input" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} /></div><div><label className="label">Bab lalai</label><select className="input" value={ch} onChange={(e) => setCh(e.target.value)}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.no}. {c.title}</option>)}</select></div></div>
          <textarea className="input min-h-[220px] font-mono text-xs" placeholder={"Tampal teks soalan di sini…\nContoh:\nSoalan 1\na. Berikan takrif tajwid…\nb. Nyatakan hukum…"} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={!text.trim()} onClick={() => { setDrafts(splitQuestions(text, { year: year || undefined, chapterId: ch, createdBy: me.id })); setMsg("Dipecahkan secara heuristik – sila semak."); }}>Pecahkan kepada soalan</button><button className="btn btn-gold" disabled={(!text.trim() && !file) || !!busy} onClick={viaAI}><Sparkles size={16} /> Ekstrak dengan AI</button></div>
          {busy && <div className="animate-pulse text-sm text-slate-500">{busy}</div>}{msg && <div className="text-sm">{msg}</div>}
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between"><div className="font-bold">Hasil ekstraksi ({drafts.length})</div>{drafts.length > 0 && <button className="btn btn-primary !py-1.5 text-xs" onClick={saveDrafts}>Simpan semua sebagai draf</button>}</div>
          {drafts.length ? <div className="max-h-[520px] space-y-2 overflow-y-auto">{drafts.map((q, i) => <div key={q.id} className="rounded-xl p-2 ring-1 ring-slate-100 dark:ring-white/10"><div className="mb-1 flex gap-2"><input className="input !w-16 !py-1 text-xs" placeholder="No" value={q.qNo ?? ""} onChange={(e) => setDrafts(drafts.map((x, k) => k === i ? { ...x, qNo: Number(e.target.value) || undefined } : x))} /><input className="input !w-14 !py-1 text-xs" placeholder="a" value={q.part ?? ""} onChange={(e) => setDrafts(drafts.map((x, k) => k === i ? { ...x, part: e.target.value } : x))} /><select className="input !py-1 text-xs" value={q.chapterId} onChange={(e) => setDrafts(drafts.map((x, k) => k === i ? { ...x, chapterId: e.target.value } : x))}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.no}. {c.title}</option>)}</select><button className="text-rose-600" onClick={() => setDrafts(drafts.filter((_, k) => k !== i))}><Trash2 size={14} /></button></div><textarea className="input min-h-[70px] text-sm" value={q.prompt} onChange={(e) => setDrafts(drafts.map((x, k) => k === i ? { ...x, prompt: e.target.value } : x))} /></div>)}</div> : <Empty title="Belum ada hasil" icon="📄" />}
        </Card>
      </div>
    </div>
  );
}

function Rujukan() {
  const d = useDb(); const me = useMe()!;
  return (
    <div className="space-y-3">
      <Card className="p-3 text-sm">Setiap rujukan kitab bermula dengan status <b>Belum disahkan</b>. Sahkan hanya selepas guru penyemak meneliti kitab; isi nombor halaman hanya jika telah disemak.</Card>
      {CHAPTERS.map((c) => <Card key={c.id} className="p-4"><div className="mb-2 font-bold">Bab {c.no}: {c.title}</div>{c.refs.map((r) => { const key = `${c.id}|${r.kitab}`; const o = d.refOverrides[key]; return (
        <div key={key} className="grid items-center gap-2 border-t border-slate-100 py-2 text-sm dark:border-white/5 sm:grid-cols-[1fr_auto_120px_auto]"><div>{refLabel(r)}</div>
          <StatusBadge s={o?.status === "disahkan" ? "diterbitkan" : "belum_disemak"} />
          <input className="input !py-1 text-xs" placeholder="Halaman" value={o?.halaman ?? ""} onChange={(e) => update((x) => { x.refOverrides[key] = { ...(x.refOverrides[key] ?? { status: "belum_disahkan" }), halaman: e.target.value }; })} />
          <button className="btn btn-ghost !py-1 text-xs" onClick={() => update((x) => { const cur = x.refOverrides[key]; x.refOverrides[key] = cur?.status === "disahkan" ? { ...cur, status: "belum_disahkan" } : { ...(cur ?? {}), status: "disahkan", penyemak: me.name }; })}>{o?.status === "disahkan" ? `Disahkan oleh ${o.penyemak} (batal)` : "Sahkan"}</button></div>); })}</Card>)}
    </div>
  );
}

function AiAdmin() {
  const d = useDb();
  const [ep, setEp] = useState(d.settings.aiEndpoint);
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="font-bold">Konfigurasi AI</div>
        <p className="text-sm text-slate-500">Mursyid menggunakan proksi pelayan (Supabase Edge Function <code>mursyid-ai</code>) yang memanggil Claude API. Kunci API disimpan sebagai secret pelayan – tidak pernah dalam pelayar. Lihat <code>docs/KONFIGURASI.md</code>.</p>
        <div className="flex flex-wrap gap-2"><input className="input flex-1" placeholder="https://<projek>.supabase.co/functions/v1/mursyid-ai" value={ep} onChange={(e) => setEp(e.target.value)} /><button className="btn btn-primary" onClick={() => { update((x) => { x.settings.aiEndpoint = ep.trim(); }); toast("Titik akhir AI disimpan"); }}>Simpan</button></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.settings.aiEnabled} onChange={(e) => update((x) => { x.settings.aiEnabled = e.target.checked; })} /> Aktifkan AI generatif (jika dimatikan, Mursyid guna mod luar talian)</label>
        <div className="text-xs text-slate-500">Perbualan direkod: {d.ai.length} · Laporan: {d.aiFeedback.length}</div>
      </Card>
      <div className="font-bold">Laporan jawapan AI</div>
      <AiFeedbackPanel />
    </div>
  );
}

function Backup() {
  const ref = useRef<HTMLInputElement>(null); const me = useMe()!;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4"><div className="mb-2 font-bold">Eksport (backup)</div><p className="mb-3 text-sm text-slate-500">Muat turun semua data aplikasi (JSON). Kata laluan disimpan sebagai hash.</p><button className="btn btn-primary" onClick={() => download(`tajwid-pondok-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getDB(), null, 1), "application/json")}><Download size={16} /> Muat turun backup</button></Card>
      <Card className="p-4"><div className="mb-2 font-bold">Import (pulih)</div><p className="mb-3 text-sm text-slate-500">Gantikan data semasa dengan fail backup.</p><input ref={ref} type="file" accept=".json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const data = JSON.parse(await f.text()) as DB; if (!Array.isArray(data.users)) throw new Error("Format tidak sah"); if (!confirm("Gantikan semua data semasa?")) return; setDB({ ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings }, refOverrides: data.refOverrides ?? {}, sessionUserId: data.users.some((u) => u.id === me.id) ? me.id : data.sessionUserId }); toast("Data dipulihkan"); } catch (err) { toast("Gagal: " + (err as Error).message, "err"); } }} /><button className="btn btn-outline" onClick={() => ref.current?.click()}><Upload size={16} /> Pilih fail backup</button></Card>
      <Card className="p-4"><div className="mb-2 font-bold text-rose-600">Set semula</div><p className="mb-3 text-sm text-slate-500">Padam semua data tempatan dan kembali ke data demo.</p><button className="btn btn-danger" onClick={() => { if (confirm("Padam SEMUA data? Tindakan ini tidak boleh diundur.")) { resetAll(); location.reload(); } }}><Trash2 size={16} /> Set semula aplikasi</button></Card>
      <Card className="p-4 md:col-span-3 text-xs text-slate-500"><RichText text={"Nota: Dalam mod tempatan, data disimpan dalam pelayar (localStorage). Untuk berbilang peranti dan pengguna sebenar, aktifkan Supabase (lihat docs/KONFIGURASI.md) – kemajuan pelajar akan disegerakkan ke PostgreSQL dengan Row Level Security."} /></Card>
    </div>
  );
}
