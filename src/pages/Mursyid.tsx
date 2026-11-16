import { useEffect, useRef, useState } from "react";
import { Send, Flag, Plus, Bot, Trash2 } from "lucide-react";
import { useMe } from "../lib/auth";
import { useDb, update } from "../lib/store";
import { AI_MODES, askMursyid, type AiMode } from "../lib/ai";
import { Card, PageHeader, RichText, Modal, cx, toast } from "../components/ui";
import { uid } from "../lib/util";
import type { AiConversation } from "../types";

const STARTERS = ["Apakah beza ikhfa' haqiqi dan ikhfa' syafawi?", "Terangkan hukum mad lazim dan pembahagiannya", "Bagaimana membariskan hamzah wasal pada ٱمْشُوا۟?", "Bina 5 soalan latihan tentang hukum ra'", "Susun pelan ulang kaji 7 hari untuk tauliah", "Apakah waqaf Jibril?"];

export default function Mursyid() {
  const me = useMe()!; const d = useDb();
  const convs = d.ai.filter((c) => c.userId === me.id).sort((a, b) => b.ts - a.ts);
  const [cid, setCid] = useState<string | null>(convs[0]?.id ?? null);
  const conv = convs.find((c) => c.id === cid);
  const [mode, setMode] = useState<AiMode>((conv?.mode as AiMode) ?? "mendalam");
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ idx: number; excerpt: string } | null>(null); const [reason, setReason] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conv?.messages.length, busy]);
  const configured = !!(d.settings.aiEndpoint || import.meta.env.VITE_AI_ENDPOINT);

  async function send(text = input) {
    if (!text.trim() || busy) return;
    let id = cid;
    const userMsg = { role: "user" as const, content: text.trim(), ts: Date.now() };
    if (!id) { id = uid("ai"); const c: AiConversation = { id, userId: me.id, mode, title: text.slice(0, 60), messages: [userMsg], ts: Date.now() }; update((x) => { x.ai.push(c); }); setCid(id); }
    else update((x) => { const c = x.ai.find((y) => y.id === id)!; c.messages.push(userMsg); c.ts = Date.now(); c.mode = mode; });
    setInput(""); setBusy(true);
    const history = [...(conv?.messages ?? []), userMsg];
    const r = await askMursyid(mode, history, d.settings.aiEnabled ? d.settings.aiEndpoint : "");
    update((x) => { const c = x.ai.find((y) => y.id === id)!; c.messages.push({ role: "assistant", content: r.content, ts: Date.now(), sources: r.sources, offline: r.offline }); });
    setBusy(false);
  }
  function submitReport() {
    if (!report || !conv) return;
    update((x) => { x.aiFeedback.push({ id: uid("fb"), userId: me.id, convId: conv.id, msgIndex: report.idx, excerpt: report.excerpt.slice(0, 600), reason, status: "baru", ts: Date.now() }); });
    setReport(null); setReason(""); toast("Laporan dihantar kepada guru/admin untuk semakan");
  }
  return (
    <div>
      <PageHeader title="Mursyid Tajwid AI" subtitle="Tutor AI berasaskan nota – jawapan boleh disemak guru" icon={<Bot />} actions={<button className="btn btn-ghost" onClick={() => setCid(null)}><Plus size={16} /> Perbualan baharu</button>} />
      {!configured && <Card className="mb-4 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">🔌 AI generatif belum dikonfigurasi. Mursyid sedang berjalan dalam <b>mod luar talian</b> – ia memetik terus nota aplikasi dan bank soalan (tiada penjanaan teks). Admin boleh menetapkan titik akhir AI di <b>Tetapan</b> (lihat docs/KONFIGURASI.md).</Card>}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="hidden h-fit p-3 lg:block">
          <div className="mb-2 px-1 text-xs font-bold uppercase text-slate-500">Sejarah</div>
          {convs.length ? convs.map((c) => <div key={c.id} className={cx("group flex items-center rounded-xl px-2 py-2 text-sm", c.id === cid ? "bg-zamrud-50 font-semibold dark:bg-white/5" : "hover:bg-slate-50 dark:hover:bg-white/5")}><button className="flex-1 truncate text-left" onClick={() => { setCid(c.id); setMode(c.mode as AiMode); }}>{c.title}</button><button className="hidden text-slate-400 hover:text-rose-600 group-hover:block" onClick={() => { update((x) => { x.ai = x.ai.filter((y) => y.id !== c.id); }); if (cid === c.id) setCid(null); }}><Trash2 size={14} /></button></div>) : <div className="px-1 text-xs text-slate-400">Tiada perbualan.</div>}
        </Card>
        <Card className="flex min-h-[60vh] flex-col p-0">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 dark:border-white/10">{AI_MODES.map((m) => <button key={m.id} title={m.hint} onClick={() => setMode(m.id)} className={cx("whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold", mode === m.id ? "bg-zamrud-700 text-white" : "text-slate-600 hover:bg-zamrud-50 dark:text-slate-300 dark:hover:bg-white/5")}>{m.label}</button>)}</div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!conv && <div className="motif rounded-2xl p-6 text-center"><div className="text-4xl">🕌</div><div className="mt-2 font-bold">Assalamu'alaikum! Apa yang ingin anda fahami hari ini?</div><div className="mt-3 flex flex-wrap justify-center gap-2">{STARTERS.map((s) => <button key={s} className="chip bg-white px-3 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-zamrud-50 dark:bg-white/5 dark:ring-white/10" onClick={() => send(s)}>{s}</button>)}</div></div>}
            {conv?.messages.map((m, k) => (
              <div key={k} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[92%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "bg-zamrud-700 text-white" : "bg-krim-50 ring-1 ring-emas-200 dark:bg-white/5 dark:ring-white/10")}>
                  <RichText text={m.content} />
                  {m.role === "assistant" && <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-emas-200/60 pt-2 text-[11px] text-slate-500 dark:border-white/10">
                    <span className={cx("chip", m.offline ? "bg-slate-200 text-slate-700" : "bg-violet-100 text-violet-800")}>{m.offline ? "Petikan nota (luar talian)" : "Dijana AI – perlu semakan guru"}</span>
                    {m.sources?.length ? <span>Sumber nota: {m.sources.join("; ")}</span> : null}
                    <button className="ml-auto flex items-center gap-1 text-rose-600 hover:underline" onClick={() => setReport({ idx: k, excerpt: m.content })}><Flag size={12} /> Laporkan jawapan salah</button>
                  </div>}
                </div>
              </div>
            ))}
            {busy && <div className="text-sm text-slate-500 animate-pulse">Mursyid sedang menyusun jawapan…</div>}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 border-t border-slate-100 p-3 dark:border-white/10" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" placeholder={`Tanya Mursyid (${AI_MODES.find((m) => m.id === mode)?.label})…`} value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn btn-primary" disabled={busy || !input.trim()}><Send size={16} /></button>
          </form>
        </Card>
      </div>
      <Modal open={!!report} onClose={() => setReport(null)} title="Laporkan jawapan AI">
        <p className="mb-2 text-sm text-slate-500">Nyatakan kesilapan atau kebimbangan anda. Laporan akan disemak oleh guru/admin.</p>
        <textarea className="input min-h-[100px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cth: kadar mad yang dinyatakan tidak tepat bagi riwayat Hafs…" />
        <div className="mt-3 flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setReport(null)}>Batal</button><button className="btn btn-danger" disabled={!reason.trim()} onClick={submitReport}>Hantar laporan</button></div>
      </Modal>
    </div>
  );
}
