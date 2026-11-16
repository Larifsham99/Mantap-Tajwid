import type { DB, ExamSession, Question, ReviewItem, Role } from "../types";
import { getDB, update, allQuestions } from "./store";
import { BADGES, XP_RULES, chapterStats } from "./gamification";
import { DAY, norm, uid } from "./util";
import { CHAPTERS } from "../data";

// ---------- Murajaah pintar (Leitner / spaced repetition) ----------
export const SRS_INTERVALS = [0, 1, 2, 4, 7, 15, 30]; // hari
function srsUpdate(d: DB, userId: string, questionId: string, correct: boolean) {
  const now = Date.now();
  let it = d.review.find((r) => r.userId === userId && r.questionId === questionId);
  if (!it) {
    if (correct) return; // hanya soalan salah/ disimpan yang masuk barisan
    it = { userId, questionId, box: 0, due: now, lapses: 0, lastTs: now };
    d.review.push(it);
  }
  if (correct) { it.box = Math.min(it.box + 1, SRS_INTERVALS.length - 1); it.due = now + SRS_INTERVALS[it.box] * DAY; }
  else { it.box = 0; it.lapses += 1; it.due = now + 10 * 60_000; }
  it.lastTs = now;
}
export const dueReviews = (d: DB, userId: string) => d.review.filter((r) => r.userId === userId && r.due <= Date.now() && r.box < SRS_INTERVALS.length - 1);

function addXp(d: DB, userId: string, amount: number, reason: string) { if (amount) d.xp.push({ id: uid("x"), userId, amount, reason, ts: Date.now() }); }
function log(d: DB, userId: string, type: string, text: string, link?: string) { d.activity.push({ id: uid("act"), userId, type, text, ts: Date.now(), link }); }

function awardBadges(d: DB, userId: string) {
  const qs = allQuestions(d);
  const have = new Set(d.badges.filter((b) => b.userId === userId).map((b) => b.badgeId));
  const before = new Set(chapterStats(d, userId).filter((s) => s.mastered).map((s) => s.chapterId));
  for (const b of BADGES) {
    if (have.has(b.id) || d.disabledBadges.includes(b.id)) continue;
    if (b.check(d, userId, qs)) { d.badges.push({ userId, badgeId: b.id, ts: Date.now() }); log(d, userId, "lencana", `Memperoleh lencana "${b.name}" ${b.icon}`); }
  }
  return before;
}
function checkMastery(d: DB, userId: string, before: Set<string>) {
  chapterStats(d, userId).forEach((s) => {
    if (s.mastered && !before.has(s.chapterId) && !d.xp.some((x) => x.userId === userId && x.reason === `Kuasai bab ${s.chapterId}`)) {
      addXp(d, userId, XP_RULES.chapterMastered, `Kuasai bab ${s.chapterId}`);
      log(d, userId, "penguasaan", `Menguasai ${CHAPTERS.find((c) => c.id === s.chapterId)?.title}`);
    }
  });
}

/** Semak jawapan objektif. Mengembalikan skor 0..1 */
export function grade(q: Question, given: string | Record<string, string>): { correct: boolean; score: number } {
  if (q.type === "mcq" || q.type === "tf") { const ok = given === q.answer; return { correct: ok, score: ok ? 1 : 0 }; }
  if (q.type === "fill") { const acc = (Array.isArray(q.answer) ? q.answer : [q.answer ?? ""]).map((a) => norm(a)); const ok = acc.includes(norm(String(given))); return { correct: ok, score: ok ? 1 : 0 }; }
  if (q.type === "match" && q.pairs && typeof given === "object") { const ok = q.pairs.filter((p) => given[p.left] === p.right).length; return { correct: ok === q.pairs.length, score: ok / q.pairs.length }; }
  return { correct: false, score: 0 };
}

export function recordAnswer(userId: string, q: Question, res: { correct: boolean; score: number }, given: string, mode: string, ms?: number) {
  update((d) => {
    const before = new Set(chapterStats(d, userId).filter((s) => s.mastered).map((s) => s.chapterId));
    d.attempts.push({ id: uid("a"), userId, questionId: q.id, chapterId: q.chapterId, correct: res.correct, score: res.score, given, mode, ts: Date.now(), ms });
    const isTauliah = q.source === "tauliah";
    addXp(d, userId, isTauliah ? XP_RULES.tauliahSelf + Math.round(res.score * 6) : XP_RULES.answer + (res.correct ? XP_RULES.correct : 0), isTauliah ? "Soalan tauliah (semakan kendiri)" : res.correct ? "Jawapan betul" : "Menjawab soalan");
    srsUpdate(d, userId, q.id, res.correct);
    checkMastery(d, userId, before);
    awardBadges(d, userId);
  });
}

export function completeExercise(userId: string, title: string, total: number, score: number) {
  update((d) => { addXp(d, userId, XP_RULES.exercise, `Tamat latihan: ${title}`); log(d, userId, "latihan", `Menamatkan ${title} – ${Math.round(score)}/${total}`, "/latih-tubi"); awardBadges(d, userId); });
}

export function saveForReview(userId: string, questionId: string) {
  update((d) => {
    const it = d.review.find((r) => r.userId === userId && r.questionId === questionId);
    if (it) { it.saved = true; it.due = Math.min(it.due, Date.now()); }
    else d.review.push({ userId, questionId, box: 0, due: Date.now(), lapses: 0, lastTs: Date.now(), saved: true } as ReviewItem);
  });
}
export function removeFromReview(userId: string, questionId: string) { update((d) => { d.review = d.review.filter((r) => !(r.userId === userId && r.questionId === questionId)); }); }

export function markSectionRead(userId: string, chapterId: string, sectionId: string) {
  const d0 = getDB();
  const np0 = d0.notes.find((n) => n.userId === userId && n.chapterId === chapterId);
  if (np0?.read.includes(sectionId) && np0.lastSection === sectionId) return;
  update((d) => {
    const before = new Set(chapterStats(d, userId).filter((s) => s.mastered).map((s) => s.chapterId));
    let np = d.notes.find((n) => n.userId === userId && n.chapterId === chapterId);
    if (!np) { np = { userId, chapterId, read: [], ts: Date.now() }; d.notes.push(np); }
    np.lastSection = sectionId; np.ts = Date.now();
    if (!np.read.includes(sectionId)) {
      np.read.push(sectionId);
      addXp(d, userId, XP_RULES.noteSection, "Membaca nota");
      const ch = CHAPTERS.find((c) => c.id === chapterId)!;
      if (ch.sections.every((s) => np!.read.includes(s.id))) log(d, userId, "nota", `Selesai membaca nota ${ch.title}`, `/nota/${chapterId}`);
    }
    checkMastery(d, userId, before);
    awardBadges(d, userId);
  });
}

export function toggleBookmark(userId: string, chapterId: string, sectionId: string | undefined, label: string, fav = false) {
  update((d) => {
    const i = d.bookmarks.findIndex((b) => b.userId === userId && b.chapterId === chapterId && b.sectionId === sectionId && !!b.fav === fav);
    if (i >= 0) d.bookmarks.splice(i, 1);
    else d.bookmarks.push({ id: uid("bm"), userId, chapterId, sectionId, label, ts: Date.now(), fav });
  });
}

// ---------- Simulasi ----------
export function startExam(userId: string, title: string, questionIds: string[], config: ExamSession["config"]) {
  const id = uid("ex");
  update((d) => { d.exams.push({ id, userId, title, config, questionIds, answers: {}, startedAt: Date.now(), status: "berjalan" }); });
  return id;
}
export function saveExamAnswer(examId: string, qid: string, patch: Partial<ExamSession["answers"][string]>) {
  update((d) => { const e = d.exams.find((x) => x.id === examId); if (e) e.answers[qid] = { ...e.answers[qid], ...patch }; });
}
export function examScore(e: ExamSession, qs: Question[]) {
  let score = 0; let max = 0; let pending = 0;
  e.questionIds.forEach((id) => {
    const q = qs.find((x) => x.id === id); if (!q) return;
    max += q.marks; const a = e.answers[id];
    if (q.type === "subjective") { const s = a?.teacherScore ?? a?.selfScore; if (s == null) pending++; else score += s; }
    else if (a?.value != null) { const g = grade(q, q.type === "match" ? JSON.parse(a.value || "{}") : a.value); score += g.score * q.marks; }
  });
  return { score: Math.round(score * 10) / 10, max, pending };
}
export function submitExam(examId: string) {
  update((d) => {
    const e = d.exams.find((x) => x.id === examId); if (!e || e.status !== "berjalan") return;
    const qs = allQuestions(d);
    e.questionIds.forEach((id) => {
      const q = qs.find((x) => x.id === id); const a = e.answers[id]; if (!q) return;
      if (q.type !== "subjective" && a?.value != null) {
        const g = grade(q, q.type === "match" ? JSON.parse(a.value || "{}") : a.value);
        a.correct = g.correct;
        d.attempts.push({ id: uid("a"), userId: e.userId, questionId: q.id, chapterId: q.chapterId, correct: g.correct, score: g.score, given: a.value, mode: "simulasi", ts: Date.now() });
        srsUpdate(d, e.userId, q.id, g.correct);
      } else if (q.type !== "subjective") {
        d.attempts.push({ id: uid("a"), userId: e.userId, questionId: q.id, chapterId: q.chapterId, correct: false, score: 0, given: "", mode: "simulasi", ts: Date.now() });
        srsUpdate(d, e.userId, q.id, false);
      }
    });
    e.submittedAt = Date.now(); e.status = "dihantar";
    const s = examScore(e, qs); e.score = s.score; e.maxScore = s.max;
    addXp(d, e.userId, XP_RULES.exam, `Tamat simulasi: ${e.title}`);
    log(d, e.userId, "simulasi", `Menghantar ${e.title} – ${s.score}/${s.max}${s.pending ? ` (${s.pending} subjektif menunggu semakan)` : ""}`, `/simulasi/${e.id}`);
    awardBadges(d, e.userId);
  });
}
export function gradeSubjective(examId: string, qid: string, score: number, by: "self" | "guru", comment?: string) {
  update((d) => {
    const e = d.exams.find((x) => x.id === examId); if (!e) return;
    const a = (e.answers[qid] ||= {});
    if (by === "self") a.selfScore = score; else { a.teacherScore = score; a.teacherComment = comment; }
    const s = examScore(e, allQuestions(d)); e.score = s.score; e.maxScore = s.max;
    if (by === "guru" && s.pending === 0) e.status = "disemak";
  });
}

// ---------- Pengurusan ----------
export function setRole(userId: string, role: Role) { update((d) => { const u = d.users.find((x) => x.id === userId); if (u) u.role = role; }); }
export function logReview(d: DB, targetType: "question" | "note" | "answer", targetId: string, action: string, by: { id: string; name: string }, note?: string) {
  d.contentReviews.push({ id: uid("rv"), targetType, targetId, action, byId: by.id, byName: by.name, note, ts: Date.now() });
}
