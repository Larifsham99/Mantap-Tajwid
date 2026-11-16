import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, EyeOff, Eye } from "lucide-react";
import { useDb, update, allQuestions } from "../lib/store";
import { useMe, atLeast } from "../lib/auth";
import { CHAPTERS, chapterById } from "../data";
import { Card, Modal, RichText, StatusBadge, toast, Empty, cx } from "./ui";
import QuestionEditor from "./QuestionEditor";
import { uid, norm, fmtDateTime } from "../lib/util";
import { logReview } from "../lib/actions";
import { invalidateIndex } from "../lib/ai";
import type { Question, ReviewStatus } from "../types";

export function QuestionBankManager() {
  const d = useDb(); const me = useMe()!;
  const [src, setSrc] = useState("semua"); const [st, setSt] = useState("semua"); const [ch, setCh] = useState("semua"); const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Question | null>(null); const [page, setPage] = useState(0);
  const isAdmin = atLeast(me, "admin");
  const hidden = new Set(d.hiddenQuestions);
  const list = useMemo(() => {
    const all = [...allQuestions(d), ...(isAdmin ? [] : [])];
    return all.filter((x) => (src === "semua" || x.source === src) && (st === "semua" || x.status === st) && (ch === "semua" || x.chapterId === ch) && (!q || norm(x.prompt).includes(norm(q))));
  }, [d, src, st, ch, q, isAdmin]);
  const PER = 15; const view = list.slice(page * PER, page * PER + PER);
  const newQ = (): Question => ({ id: uid("C-"), source: "custom", type: "mcq", chapterId: "b1", difficulty: 2, marks: 1, prompt: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }], answer: "a", status: "draf", createdBy: me.id });
  function quick(x: Question, s: ReviewStatus) {
    update((dd) => {
      if (x.source === "custom") { const i = dd.customQuestions.findIndex((y) => y.id === x.id); if (i >= 0) dd.customQuestions[i] = { ...dd.customQuestions[i], status: s, reviewer: me.name }; }
      else dd.questionOverrides[x.id] = { ...(dd.questionOverrides[x.id] ?? {}), status: s, reviewer: me.name };
      logReview(dd, "question", x.id, `Status → ${s}`, me);
    });
    toast(`Status dikemas kini: ${s}`);
  }
  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Cari soalan…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className="input" value={src} onChange={(e) => { setSrc(e.target.value); setPage(0); }}><option value="semua">Semua sumber</option><option value="tauliah">Tauliah Kedah</option><option value="latihan">Latihan</option><option value="custom">Tersuai / import</option></select>
        <select className="input" value={st} onChange={(e) => { setSt(e.target.value); setPage(0); }}><option value="semua">Semua status</option><option value="draf">Draf</option><option value="belum_disemak">Belum disemak</option><option value="disemak">Disemak</option><option value="diterbitkan">Diterbitkan</option></select>
        <select className="input" value={ch} onChange={(e) => { setCh(e.target.value); setPage(0); }}><option value="semua">Semua bab</option>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.no}. {c.title}</option>)}</select>
      </div>
      <div className="mb-3 flex items-center justify-between text-sm"><span className="text-slate-500">{list.length} soalan</span><button className="btn btn-primary !py-2" onClick={() => setEdit(newQ())}><Plus size={16} /> Soalan baharu</button></div>
      <div className="space-y-2">
        {view.map((x) => (
          <Card key={x.id} className={cx("p-3", hidden.has(x.id) && "opacity-50")}>
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]"><span className="chip bg-slate-100 dark:bg-white/10">{x.source === "tauliah" ? `Tauliah ${x.year} S${x.qNo}${x.part}` : x.source === "custom" ? `Tersuai${x.year ? " " + x.year : ""}` : "Latihan"}</span><span className="chip bg-slate-100 dark:bg-white/10">{x.type}</span><span>{chapterById(x.chapterId)?.title}</span><StatusBadge s={x.status} />{x.reviewer && <span className="text-slate-400">Penyemak: {x.reviewer}</span>}</div>
            <RichText text={x.prompt.length > 260 ? x.prompt.slice(0, 260) + "…" : x.prompt} className="text-sm" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setEdit(x)}><Pencil size={12} /> Sunting / semak</button>
              {x.status !== "disemak" && x.status !== "diterbitkan" && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => quick(x, "disemak")}>✓ Tanda disemak</button>}
              {isAdmin && x.status !== "diterbitkan" && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => quick(x, "diterbitkan")}>✅ Luluskan & terbit</button>}
              {isAdmin && x.source !== "custom" && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => update((dd) => { dd.hiddenQuestions = hidden.has(x.id) ? dd.hiddenQuestions.filter((y) => y !== x.id) : [...dd.hiddenQuestions, x.id]; })}>{hidden.has(x.id) ? <><Eye size={12} /> Papar</> : <><EyeOff size={12} /> Sembunyi</>}</button>}
              {x.source === "custom" && <button className="btn btn-ghost !px-2 !py-1 text-xs text-rose-600" onClick={() => { if (confirm("Padam soalan ini?")) update((dd) => { dd.customQuestions = dd.customQuestions.filter((y) => y.id !== x.id); }); }}><Trash2 size={12} /> Padam</button>}
            </div>
          </Card>
        ))}
        {!view.length && <Empty title="Tiada soalan" />}
      </div>
      {list.length > PER && <div className="mt-3 flex items-center justify-center gap-2 text-sm"><button className="btn btn-ghost !py-1" disabled={page === 0} onClick={() => setPage(page - 1)}>←</button>Halaman {page + 1}/{Math.ceil(list.length / PER)}<button className="btn btn-ghost !py-1" disabled={(page + 1) * PER >= list.length} onClick={() => setPage(page + 1)}>→</button></div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Sunting / semak soalan" wide>{edit && <QuestionEditor q={edit} onDone={() => setEdit(null)} />}</Modal>
    </div>
  );
}

export function NotesManager() {
  const d = useDb(); const me = useMe()!; const isAdmin = atLeast(me, "admin");
  const [f, setF] = useState({ id: "", chapterId: "b1", title: "", body: "" });
  const notes = d.customNotes.filter((n) => isAdmin || n.authorId === me.id).sort((a, b) => b.ts - a.ts);
  function save() {
    if (!f.title.trim() || !f.body.trim()) return toast("Isi tajuk dan kandungan", "err");
    update((dd) => {
      if (f.id) { const n = dd.customNotes.find((x) => x.id === f.id)!; Object.assign(n, { chapterId: f.chapterId, title: f.title, body: f.body, ts: Date.now(), status: isAdmin ? n.status : "disemak" }); }
      else dd.customNotes.push({ id: uid("cn"), chapterId: f.chapterId, title: f.title, body: f.body, authorId: me.id, authorName: me.name, status: isAdmin ? "diterbitkan" : "disemak", ts: Date.now() });
      logReview(dd, "note", f.id || "baru", f.id ? "Nota disunting" : "Nota ditambah", me);
    });
    invalidateIndex(); setF({ id: "", chapterId: f.chapterId, title: "", body: "" }); toast("Nota disimpan");
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-2 font-bold">{f.id ? "Sunting nota" : "Tambah nota guru"}</div>
        <div className="space-y-2">
          <select className="input" value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value })}>{CHAPTERS.map((c) => <option key={c.id} value={c.id}>Bab {c.no}: {c.title}</option>)}</select>
          <input className="input" placeholder="Tajuk" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <textarea className="input min-h-[180px]" placeholder="Kandungan (boleh campur teks Arab; baris baharu dikekalkan)" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          <div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Simpan</button>{f.id && <button className="btn btn-ghost" onClick={() => setF({ id: "", chapterId: "b1", title: "", body: "" })}>Batal</button>}</div>
          <p className="text-xs text-slate-500">Nota guru dipaparkan kepada pelajar sebagai "Nota tambahan guru" {isAdmin ? "(terus diterbitkan)." : "(berstatus 'Disemak guru'; admin boleh menyahterbit)."}</p>
        </div>
      </Card>
      <div className="space-y-2">
        {notes.map((n) => (
          <Card key={n.id} className="p-3">
            <div className="flex items-center gap-2 text-xs"><span className="font-semibold">{chapterById(n.chapterId)?.title}</span><StatusBadge s={n.status} /><span className="text-slate-400">{n.authorName} · {fmtDateTime(n.ts)}</span></div>
            <div className="font-bold">{n.title}</div><RichText text={n.body.slice(0, 220)} className="text-sm" />
            <div className="mt-2 flex gap-1.5"><button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setF({ id: n.id, chapterId: n.chapterId, title: n.title, body: n.body })}><Pencil size={12} /> Sunting</button>
              {isAdmin && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => update((dd) => { const x = dd.customNotes.find((y) => y.id === n.id)!; x.status = x.status === "diterbitkan" ? "draf" : "diterbitkan"; })}>{n.status === "diterbitkan" ? "Nyahterbit" : "Terbitkan"}</button>}
              <button className="btn btn-ghost !px-2 !py-1 text-xs text-rose-600" onClick={() => { if (confirm("Padam nota?")) { update((dd) => { dd.customNotes = dd.customNotes.filter((y) => y.id !== n.id); }); invalidateIndex(); } }}><Trash2 size={12} /> Padam</button></div>
          </Card>
        ))}
        {!notes.length && <Empty title="Belum ada nota guru" icon="📝" />}
      </div>
    </div>
  );
}

export function AiFeedbackPanel() {
  const d = useDb(); const me = useMe()!;
  const [note, setNote] = useState<Record<string, string>>({});
  const items = d.aiFeedback.slice().sort((a, b) => b.ts - a.ts);
  if (!items.length) return <Empty title="Tiada laporan jawapan AI" icon="🤖">Laporan daripada pelajar akan muncul di sini.</Empty>;
  return (
    <div className="space-y-2">
      {items.map((f) => { const u = d.users.find((x) => x.id === f.userId); const conv = d.ai.find((c) => c.id === f.convId); const question = conv?.messages[f.msgIndex - 1]?.content; return (
        <Card key={f.id} className="p-4">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs"><span className={cx("chip", f.status === "baru" ? "bg-rose-100 text-rose-700" : f.status === "disemak" ? "bg-zamrud-100 text-zamrud-800" : "bg-slate-200")}>{f.status}</span><span>{u?.name}</span><span className="text-slate-400">{fmtDateTime(f.ts)}</span></div>
          {question && <div className="text-sm"><b>Soalan:</b> {question}</div>}
          <div className="mt-1 rounded-xl bg-slate-50 p-2 text-xs dark:bg-white/5"><RichText text={f.excerpt} /></div>
          <div className="mt-1 text-sm"><b>Laporan:</b> {f.reason}</div>
          {f.reviewerNote && <div className="mt-1 text-xs text-sky-700">Ulasan penyemak ({f.reviewer}): {f.reviewerNote}</div>}
          {f.status === "baru" && <div className="mt-2 flex flex-wrap gap-2"><input className="input flex-1" placeholder="Ulasan/pembetulan guru" value={note[f.id] ?? ""} onChange={(e) => setNote({ ...note, [f.id]: e.target.value })} />
            <button className="btn btn-primary !py-1.5 text-xs" onClick={() => update((dd) => { const x = dd.aiFeedback.find((y) => y.id === f.id)!; x.status = "disemak"; x.reviewer = me.name; x.reviewerNote = note[f.id]; })}>Sahkan & ulas</button>
            <button className="btn btn-ghost !py-1.5 text-xs" onClick={() => update((dd) => { const x = dd.aiFeedback.find((y) => y.id === f.id)!; x.status = "ditolak"; x.reviewer = me.name; x.reviewerNote = note[f.id]; })}>Tolak</button></div>}
        </Card>); })}
    </div>
  );
}
