import type { Role, User } from "../types";
import { getDB, update, useDB } from "./store";
import { sha256, uid } from "./util";
import { supabase } from "./supabase";

export const hashPw = (email: string, pw: string) => sha256(`tajwid-pondok|${email.toLowerCase().trim()}|${pw}`);

export const ROLE_LABEL: Record<Role, string> = { superadmin: "Super Admin", admin: "Admin", guru: "Guru", pelajar: "Pelajar", awam: "Pengguna Awam" };
const RANK: Record<Role, number> = { awam: 0, pelajar: 1, guru: 2, admin: 3, superadmin: 4 };
export const atLeast = (u: User | undefined, r: Role) => !!u && RANK[u.role] >= RANK[r];

export function useMe() { return useDB((d) => d.users.find((u) => u.id === d.sessionUserId)); }
export const currentUser = () => { const d = getDB(); return d.users.find((u) => u.id === d.sessionUserId); };

export async function login(email: string, pw: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: pw });
    if (!error && data.user) return linkCloudUser(data.user.id, e, (data.user.user_metadata?.name as string) || e.split("@")[0]);
    // jatuh balik ke akaun tempatan (cth. akaun demo)
  }
  const u = getDB().users.find((x) => x.email.toLowerCase() === e);
  if (!u || u.passHash === "-") return "Akaun tidak dijumpai atau tidak boleh log masuk.";
  if (u.passHash !== (await hashPw(e, pw))) return "Kata laluan salah.";
  update((d) => { d.sessionUserId = u.id; });
  return null;
}

function linkCloudUser(cloudId: string, email: string, name: string) {
  update((d) => {
    let u = d.users.find((x) => x.id === cloudId || x.email === email);
    if (!u) { u = { id: cloudId, name, email, role: "pelajar", avatar: "🙂", createdAt: Date.now(), passHash: "-cloud" }; d.users.push(u); }
    d.sessionUserId = u.id;
  });
  return null;
}

export async function register(name: string, email: string, pw: string, role: Role, classId?: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!name.trim() || !/^\S+@\S+\.\S+$/.test(e)) return "Sila isi nama dan emel yang sah.";
  if (pw.length < 6) return "Kata laluan sekurang-kurangnya 6 aksara.";
  if (getDB().users.some((u) => u.email.toLowerCase() === e)) return "Emel sudah didaftarkan.";
  const safeRole: Role = role === "guru" || role === "awam" ? role : "pelajar"; // admin hanya boleh dilantik oleh admin
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email: e, password: pw, options: { data: { name, role: safeRole } } });
    if (error) return error.message;
    if (data.user) return linkCloudUser(data.user.id, e, name);
  }
  const passHash = await hashPw(e, pw);
  update((d) => {
    const id = uid("u-");
    d.users.push({ id, name: name.trim(), email: e, passHash, role: safeRole, classId, avatar: "🙂", createdAt: Date.now() });
    d.sessionUserId = id;
    d.activity.push({ id: uid("act"), userId: id, type: "sistem", text: "Akaun didaftarkan. Selamat datang!", ts: Date.now() });
  });
  return null;
}

export async function logout() { if (supabase) await supabase.auth.signOut().catch(() => {}); update((d) => { d.sessionUserId = undefined; }); }

export async function changePassword(userId: string, oldPw: string, newPw: string) {
  const u = getDB().users.find((x) => x.id === userId); if (!u) return "Pengguna tidak dijumpai.";
  if (u.passHash !== (await hashPw(u.email, oldPw))) return "Kata laluan lama salah.";
  if (newPw.length < 6) return "Kata laluan baharu sekurang-kurangnya 6 aksara.";
  const h = await hashPw(u.email, newPw);
  update((d) => { const x = d.users.find((y) => y.id === userId)!; x.passHash = h; });
  return null;
}
