// Supabase Edge Function: mursyid-ai
// Proksi selamat ke Claude API untuk "Mursyid Tajwid AI". Kunci API disimpan sebagai secret
// pelayan (ANTHROPIC_API_KEY) dan TIDAK pernah dihantar ke pelayar.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy mursyid-ai
// Kemudian tetapkan VITE_AI_ENDPOINT=https://<projek>.supabase.co/functions/v1/mursyid-ai
import Anthropic from "npm:@anthropic-ai/sdk";

const SYSTEM_RULES = `Anda ialah "Mursyid Tajwid", tutor ilmu tajwid (riwayat Hafs 'an 'Asim, tariq al-Syatibiyyah) untuk pelajar pondok dan calon tauliah mengajar al-Quran Negeri Kedah. Jawab dalam Bahasa Melayu; tulis teks al-Quran dan istilah Arab dalam tulisan Arab berbaris.
PRINSIP WAJIB:
1. Utamakan NOTA RUJUKAN yang diberikan. Jika jawapan berasaskan nota, sebut sumbernya dalam bahagian "Sumber:".
2. Jangan sekali-kali mereka nama kitab, petikan matan, nombor halaman, atau sanad hadith. Jika tidak pasti, nyatakan "Saya tidak pasti – sila rujuk guru".
3. Asingkan dengan jelas: "Fakta daripada nota" vs "Penerangan tambahan AI".
4. Bagi isu khilaf (fiqh/wajah qiraat), sebut bahawa ia perlu disemak guru bertauliah.
5. Akhiri setiap jawapan dengan peringatan ringkas: "Jawapan AI – sila sahkan dengan guru."`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new Anthropic(); // membaca ANTHROPIC_API_KEY daripada persekitaran

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  try {
    const { mode, modeHint, context, messages, pdfBase64 } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("messages diperlukan");
    // deno-lint-ignore no-explicit-any
    const clean: any[] = messages.slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: String(m.content).slice(0, mode === "ekstrak" ? 60000 : 6000),
    }));
    // Mod ekstrak: lampirkan PDF (termasuk PDF imbasan) supaya Claude boleh membacanya.
    if (mode === "ekstrak" && typeof pdfBase64 === "string" && pdfBase64.length < 25_000_000) {
      const last = clean[clean.length - 1];
      last.content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
        { type: "text", text: last.content },
      ];
    }
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: mode === "ekstrak" ? 16000 : 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SYSTEM_RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: `MOD: ${mode} – ${modeHint ?? ""}\n\nNOTA RUJUKAN (daripada aplikasi):\n${String(context ?? "(tiada)").slice(0, 12000)}` },
      ],
      messages: clean,
    } as never);
    if ((response as { stop_reason?: string }).stop_reason === "refusal") {
      return Response.json({ text: "Maaf, permintaan ini tidak dapat dijawab. Sila ubah soalan atau rujuk guru." }, { headers: cors });
    }
    const text = (response.content as { type: string; text?: string }[])
      .filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return Response.json({ text }, { headers: cors });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "Had kadar dicapai – cuba sebentar lagi." }, { status: 429, headers: cors });
    if (e instanceof Anthropic.APIError) return Response.json({ error: `Ralat API (${e.status})` }, { status: 502, headers: cors });
    return Response.json({ error: (e as Error).message }, { status: 400, headers: cors });
  }
});
