import { describe, it, expect } from "vitest";
import { SEED_QUESTIONS, CHAPTERS, PAPERS } from "../src/data";
import { levelFor, LEVELS } from "../src/lib/gamification";
import { grade } from "../src/lib/actions";
import { splitQuestions } from "../src/lib/importer";
import { norm } from "../src/lib/util";

describe("integriti kandungan", () => {
  it("ID soalan unik", () => {
    const ids = SEED_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("setiap soalan merujuk bab yang wujud", () => {
    const ch = new Set(CHAPTERS.map((c) => c.id));
    SEED_QUESTIONS.forEach((q) => expect(ch.has(q.chapterId), q.id).toBe(true));
  });
  it("jawapan objektif wujud dalam pilihan", () => {
    SEED_QUESTIONS.filter((q) => q.type === "mcq").forEach((q) => expect(q.options!.some((o) => o.id === q.answer), q.id).toBe(true));
    SEED_QUESTIONS.filter((q) => q.type === "tf").forEach((q) => expect(["B", "S"]).toContain(q.answer));
  });
  it("12 bab dengan seksyen nota", () => {
    expect(CHAPTERS).toHaveLength(12);
    CHAPTERS.forEach((c) => { expect(c.sections.length).toBeGreaterThan(0); expect(c.refs.length).toBeGreaterThan(0); });
  });
  it("10 kertas tauliah 2014–2025, semua belum disemak & ada jawapan cadangan", () => {
    expect(PAPERS.map((p) => p.year).sort()).toEqual([2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025]);
    PAPERS.forEach((p) => {
      expect(p.questions.length).toBeGreaterThanOrEqual(20);
      p.questions.forEach((q) => { expect(q.status).toBe("belum_disemak"); expect((q.modelAnswer ?? "").length).toBeGreaterThan(5); });
    });
  });
  it("tiada nombor halaman kitab direka", () => {
    CHAPTERS.forEach((c) => c.refs.forEach((r) => { expect(r.halaman).toBeUndefined(); expect(r.status).toBe("belum_disahkan"); }));
  });
});

describe("pemarkahan", () => {
  const mcq = SEED_QUESTIONS.find((q) => q.type === "mcq")!;
  it("mcq betul / salah", () => {
    expect(grade(mcq, mcq.answer as string).correct).toBe(true);
    expect(grade(mcq, "zz").correct).toBe(false);
  });
  it("isi tempat kosong abaikan harakat & huruf besar", () => {
    const f = SEED_QUESTIONS.find((q) => q.type === "fill" && (q.answer as string[]).includes("جد"))!;
    expect(grade(f, "جَدٍّ").correct).toBe(true);
    expect(norm("JaD ")).toBe("jad");
  });
  it("padanan separa", () => {
    const m = SEED_QUESTIONS.find((q) => q.type === "match")!;
    const all = Object.fromEntries(m.pairs!.map((p) => [p.left, p.right]));
    expect(grade(m, all).score).toBe(1);
    const half = { ...all, [m.pairs![0].left]: "salah" };
    expect(grade(m, half).score).toBeCloseTo((m.pairs!.length - 1) / m.pairs!.length);
  });
});

describe("tahap", () => {
  it("syarat XP + bab", () => {
    expect(levelFor(0, 0).level.id).toBe("mubtadi");
    expect(levelFor(600, 2).level.id).toBe("mubtadi");
    expect(levelFor(600, 3).level.id).toBe("mutawassit");
    expect(levelFor(99999, 12).level.id).toBe(LEVELS.at(-1)!.id);
  });
});

describe("import", () => {
  it("pecahkan teks kepada soalan draf", () => {
    const qs = splitQuestions("Soalan 1\na. Berikan takrif tajwid.\nb. Nyatakan hukum mempelajarinya.\nSoalan 4\na. Jelaskan waqaf tam.", { chapterId: "b1", createdBy: "u", year: 2026 });
    expect(qs).toHaveLength(3);
    expect(qs.every((q) => q.status === "draf")).toBe(true);
    expect(qs[2].qNo).toBe(4); expect(qs[2].section).toBe("B"); expect(qs[1].part).toBe("b");
  });
});
