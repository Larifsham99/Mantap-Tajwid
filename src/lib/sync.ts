import { supabase } from "./supabase";
import { getDB, update } from "./store";

/**
 * Penyegerakan awan (pilihan). Apabila Supabase dikonfigurasi, rekod kemajuan pengguna semasa
 * (cubaan, XP, simulasi, barisan murajaah, lencana, kemajuan nota) dihantar ke jadual PostgreSQL
 * yang dilindungi Row Level Security (lihat supabase/schema.sql), dan ditarik semula ketika log masuk.
 */
export async function pushProgress(userId: string) {
  if (!supabase) return { ok: false, msg: "Supabase tidak dikonfigurasi (mod tempatan)." };
  const d = getDB();
  const mine = <T extends { userId: string }>(a: T[]) => a.filter((x) => x.userId === userId);
  const ops = [
    supabase.from("exercise_attempts").upsert(mine(d.attempts).map((a) => ({ id: a.id, user_id: userId, question_id: a.questionId, chapter_id: a.chapterId, correct: a.correct, score: a.score, given: a.given ?? null, mode: a.mode, created_at: new Date(a.ts).toISOString(), ms: a.ms ?? null }))),
    supabase.from("xp_transactions").upsert(mine(d.xp).map((x) => ({ id: x.id, user_id: userId, amount: x.amount, reason: x.reason, created_at: new Date(x.ts).toISOString() }))),
    supabase.from("exam_sessions").upsert(mine(d.exams).map((e) => ({ id: e.id, user_id: userId, title: e.title, config: e.config, question_ids: e.questionIds, answers: e.answers, started_at: new Date(e.startedAt).toISOString(), submitted_at: e.submittedAt ? new Date(e.submittedAt).toISOString() : null, score: e.score ?? null, max_score: e.maxScore ?? null, status: e.status }))),
    supabase.from("review_queue").upsert(mine(d.review).map((r) => ({ user_id: userId, question_id: r.questionId, box: r.box, due: new Date(r.due).toISOString(), lapses: r.lapses, saved: !!r.saved })), { onConflict: "user_id,question_id" }),
    supabase.from("user_badges").upsert(mine(d.badges).map((b) => ({ user_id: userId, badge_id: b.badgeId, awarded_at: new Date(b.ts).toISOString() })), { onConflict: "user_id,badge_id" }),
    supabase.from("student_progress").upsert(mine(d.notes).map((n) => ({ user_id: userId, chapter_id: n.chapterId, sections_read: n.read, last_section: n.lastSection ?? null, updated_at: new Date(n.ts).toISOString() })), { onConflict: "user_id,chapter_id" }),
  ];
  const res = await Promise.all(ops);
  const err = res.find((r) => r.error)?.error;
  return err ? { ok: false, msg: err.message } : { ok: true, msg: "Kemajuan disegerakkan ke awan." };
}

export async function pullProgress(userId: string) {
  if (!supabase) return { ok: false, msg: "Supabase tidak dikonfigurasi." };
  const [a, x, r] = await Promise.all([
    supabase.from("exercise_attempts").select("*").eq("user_id", userId),
    supabase.from("xp_transactions").select("*").eq("user_id", userId),
    supabase.from("review_queue").select("*").eq("user_id", userId),
  ]);
  if (a.error || x.error || r.error) return { ok: false, msg: (a.error || x.error || r.error)!.message };
  update((d) => {
    const haveA = new Set(d.attempts.map((y) => y.id));
    a.data!.forEach((y) => !haveA.has(y.id) && d.attempts.push({ id: y.id, userId, questionId: y.question_id, chapterId: y.chapter_id, correct: y.correct, score: y.score, given: y.given ?? undefined, mode: y.mode, ts: Date.parse(y.created_at), ms: y.ms ?? undefined }));
    const haveX = new Set(d.xp.map((y) => y.id));
    x.data!.forEach((y) => !haveX.has(y.id) && d.xp.push({ id: y.id, userId, amount: y.amount, reason: y.reason, ts: Date.parse(y.created_at) }));
    r.data!.forEach((y) => { if (!d.review.some((z) => z.userId === userId && z.questionId === y.question_id)) d.review.push({ userId, questionId: y.question_id, box: y.box, due: Date.parse(y.due), lapses: y.lapses, lastTs: Date.now(), saved: y.saved }); });
  });
  return { ok: true, msg: "Kemajuan dimuat turun daripada awan." };
}
