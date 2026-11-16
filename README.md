# TAJWID PONDOK

**Ilmu • Faham • Latih • Kuasai**

Platform pemantapan ilmu tajwid dan persediaan **peperiksaan tauliah mengajar al-Quran Negeri Kedah** – untuk pelajar pondok, calon tauliah, guru tajwid dan pembelajar kendiri.

## Ciri utama

| Menu | Fungsi |
|---|---|
| Dashboard Utama | Ucapan, tahap, XP, ketepatan, bab dikuasai/lemah, streak, sambung belajar, cadangan, cabaran harian, kedudukan, lencana, aktiviti |
| Belajar Tajwid | 12 bab berstruktur + aliran *Nota → Dhobit → Contoh → Latihan → Ulang salah → Kuasai → Simulasi* |
| Nota Tajwid | Takrif (BM & Arab), huraian, dhobit, pembahagian, jadual, contoh ayat, cara baca, kesalahan lazim, perbandingan, soalan pengukuhan, rujukan, nota guru · carian · penanda · kegemaran · progress · nota ringkas · kad imbas · peta minda · eksport PDF |
| Bank Soalan Tauliah | **250 soalan sebenar** daripada 10 kertas Kedah (2014–2019, 2022–2025), ditapis mengikut tahun/bab, dengan jawapan cadangan berlabel *Belum disemak* |
| Latih Tubi | 12 mod (bab, rawak, tahun terdahulu, sukar, kefahaman, dhobit, kenal hukum, benar/salah, padanan, isi tempat kosong, perbandingan, smart murajaah) + tugasan guru |
| Sistem Penerangan Jawapan | Betul/salah + jawapan sebenar, mengapa salah, kekeliruan lazim, syarah, dhobit, contoh, soalan pengukuhan, rujukan; butang *Baca Nota*, *Cuba Soalan Serupa*, *Simpan untuk Murajaah* |
| Simulasi Peperiksaan | 10/20/50/lengkap/ikut tahun/rawak/bab, pemasa, navigasi, tanda semakan, markah automatik objektif, penilaian kendiri & guru untuk subjektif, analisis bab, cadangan murajaah |
| Murajaah Pintar | Spaced repetition (Leitner 0→1→2→4→7→15→30 hari), soalan sering salah, bab lemah/belum dipelajari, jadual & kekerapan |
| Mursyid Tajwid AI | 6 mod (ringkas, mendalam, syarah kitab, perbandingan, tutor, pembina latihan), RAG daripada nota, sumber dinyatakan, laporan jawapan salah; mod luar talian jika AI tidak dikonfigurasi |
| Scoreboard | Keseluruhan, mingguan, kelas, penguasaan bab, ketepatan, istiqamah |
| Pencapaian | 5 tahap (Mubtadi' → Penguasaan Tajwid) dengan syarat jelas, 11 lencana |
| Profil Pelajar | Statistik, bab dikuasai/lemah, rekod ujian/latihan/murajaah, aktiviti, sunting profil |
| Dashboard Guru | Prestasi pelajar & kelas, soalan sering salah, bina tugasan, semak subjektif + komen, semak bank soalan, nota guru, semakan AI, eksport CSV |
| Dashboard Admin | Analitik, pengguna & peranan, kelas, bank soalan (aliran kelulusan), import PDF/Word/manual/AI, nota, rujukan, AI, simulasi, lencana & scoreboard, log moderasi, backup/pulih, matriks RBAC |
| Tetapan | Tema gelap/cerah, saiz teks Arab, penyegerakan awan, AI |

**Peranan:** Super Admin · Admin · Guru · Pelajar · Pengguna awam.

## Mula pantas

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # ujian unit (integriti kandungan, pemarkahan, tahap, import)
npm run build
```

Akaun demo (kata laluan `tajwid123`): `pelajar@demo.my`, `guru@demo.my`, `admin@demo.my`, `superadmin@demo.my` – atau tekan butang *Masuk sebagai…* di halaman log masuk.

## Teknologi
React 18 + TypeScript + Vite · Tailwind CSS · React Router · lucide-react · pdf.js & mammoth (import dokumen) · Supabase (Auth, PostgreSQL, RLS, Storage, Edge Functions) · Claude API (Mursyid AI) · PWA.

Struktur: `src/data` (nota, soalan latihan, bank tauliah), `src/lib` (store, auth, gamifikasi, murajaah, AI, import, sync), `src/components`, `src/pages`, `supabase/` (skema SQL + fungsi edge), `docs/`.

## Dokumentasi
- [docs/KONFIGURASI.md](docs/KONFIGURASI.md) – Supabase, AI, deploy
- [docs/KANDUNGAN.md](docs/KANDUNGAN.md) – sumber, status semakan dan had kandungan

## Penting
- Jawapan cadangan bank tauliah dan rujukan kitab berstatus **belum disemak** sehingga disahkan guru bertauliah.
- Soalan latihan **bukan** soalan rasmi tauliah. Simulasi tidak mendakwa sama dengan format rasmi.
- Modul amali bacaan (rakaman/analisis suara) **ditangguhkan** ke versi akan datang.
