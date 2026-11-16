# Konfigurasi TAJWID PONDOK

Aplikasi berfungsi **sepenuhnya tanpa konfigurasi** dalam *mod tempatan* (data dalam `localStorage` pelayar, kata laluan disimpan sebagai hash SHA-256). Untuk penggunaan sebenar berbilang pengguna/peranti, aktifkan Supabase dan AI seperti di bawah.

## 1. Pembolehubah persekitaran

Salin `.env.example` → `.env`:

| Pembolehubah | Kegunaan |
|---|---|
| `VITE_SUPABASE_URL` | URL projek Supabase |
| `VITE_SUPABASE_ANON_KEY` | Kunci *anon* awam Supabase (selamat untuk pelayar; data dilindungi RLS) |
| `VITE_AI_ENDPOINT` | URL fungsi `mursyid-ai`, cth. `https://<projek>.supabase.co/functions/v1/mursyid-ai` |

> Jangan sekali-kali letak kunci API Anthropic dalam `.env` frontend. Kunci AI hanya disimpan sebagai *secret* pelayan.

## 2. Supabase (Auth + PostgreSQL + RLS + Storage)

1. Cipta projek di supabase.com.
2. SQL Editor → tampal & jalankan `supabase/schema.sql` (jadual, pandangan, fungsi peranan, polisi Row Level Security, baldi storage `imports`, lencana asas).
3. Authentication → aktifkan *Email*.
4. Lantik admin pertama secara manual (sekali sahaja):
   ```sql
   update profiles set role = 'superadmin' where id = (select id from auth.users where email = 'emel-anda@contoh.my');
   ```
5. Tetapkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, bina semula aplikasi.

Apabila Supabase aktif: log masuk/daftar menggunakan Supabase Auth; pengguna boleh menekan **Tetapan › Hantar ke awan / Muat turun dari awan** untuk menyegerakkan cubaan, XP, simulasi, barisan murajaah, lencana dan kemajuan nota (`src/lib/sync.ts`). Polisi RLS memastikan pelajar hanya melihat data sendiri, guru melihat pelajar kelasnya, dan hanya admin boleh *menerbitkan* jawapan.

## 3. Mursyid Tajwid AI (Claude API)

Fungsi edge `supabase/functions/mursyid-ai` memanggil Claude API (model `claude-opus-5-5`, dengan *server-side fallback* apabila permintaan ditolak oleh pengelas keselamatan).

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy mursyid-ai
```

Kemudian tetapkan `VITE_AI_ENDPOINT` atau isi URL di **Dashboard Admin › AI**.

Ciri:
- **Prinsip AI** dalam system prompt: utamakan nota aplikasi (RAG – petikan nota dihantar sebagai konteks), jangan mereka kitab/halaman/sanad, bezakan fakta nota vs penerangan AI, nyatakan ketidakpastian, peringatan semakan guru.
- **Mod ekstrak**: Dashboard Admin › Import › *Ekstrak dengan AI* menghantar PDF (termasuk PDF **imbasan Jawi** seperti kertas tauliah) kepada Claude untuk ditranskripsi kepada soalan **draf**. Hasil mesti disemak & diluluskan admin.
- **Laporan**: pelajar boleh melaporkan jawapan AI yang salah; guru/admin menyemak di Dashboard Guru › Semakan AI.

Tanpa AI, Mursyid berjalan dalam **mod luar talian**: ia hanya memetik nota dan bank soalan yang sedia ada (tiada teks dijana) dan melabelkannya dengan jelas.

## 4. Penerbitan (deploy)

```bash
npm install
npm run build      # hasil dalam dist/
npm run preview    # uji setempat
```

`dist/` ialah laman statik (HashRouter, laluan relatif) – boleh dihoskan di Netlify, Vercel, Cloudflare Pages, GitHub Pages atau Supabase Storage. PWA: `manifest.webmanifest` + `sw.js` (cache app shell) membolehkan "Tambah ke skrin utama" di Android.
