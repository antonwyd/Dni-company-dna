# Arsitektur DNI

Satu aplikasi Next.js (monolit modular) dengan lapisan layanan di server. Tidak ada microservice. Fase 0–1 berjalan sepenuhnya lokal dengan penyimpanan di memori, autentikasi simulasi, dan AI simulasi; batas antarmuka sudah disiapkan agar Supabase, Supabase Auth, dan penyedia AI nyata bisa dipasang tanpa mengubah UI.

## Lapisan

```
Browser (UI Next.js, Bahasa Indonesia + i18n)
   │  form + server actions, tidak ada API publik
   ▼
src/app/**            Halaman (server components) dan server actions
   │  setiap halaman memanggil requireUser() lalu service dengan user tersebut
   ▼
src/server/services   capture · review · knowledge · ask · evaluation · audit
   │  semua otorisasi lewat src/domain/permissions.ts
   ├──► src/server/ai           AIProvider (mock sekarang, Claude nanti)
   │                            hanya menerima sumber yang SUDAH lolos filter izin
   ▼
src/server/store      DataStore (memori sekarang, Supabase Postgres + RLS di Fase 2)
```

| Folder | Isi |
| --- | --- |
| `src/domain` | Tipe domain dan aturan izin murni (tanpa I/O), mudah diuji dan dicerminkan ke RLS |
| `src/server/auth` | Sesi simulasi berbasis cookie (hanya pengembangan) |
| `src/server/ai` | Kontrak output (Zod), antarmuka `AIProvider`, `MockAIProvider` |
| `src/server/services` | Logika aplikasi; menerima `Profile` pengguna sebagai parameter |
| `src/server/store` | `DataStore` di memori dan data seed sintetis |
| `src/i18n` | Kamus `id` (utama), `en`, struktur `ja` |
| `src/components` | Komponen UI dan shell navigasi |
| `tests/unit`, `tests/e2e` | Vitest dan Playwright |

## Alur utama

**Capture → Klarifikasi → Draf → Review → Perpustakaan → Tanya DNI**

1. Kontributor menulis satu kalimat. Server langsung menyimpan **sumber asli** (`knowledge_sources`) dan membuat butir pengetahuan berstatus `captured`, lalu `ai_draft`.
2. `AIProvider.nextClarification` memilih satu celah pengetahuan yang belum ditanyakan (istilah, konteks, gejala, kriteria, penanggung jawab, wewenang, masih berlaku). Pertanyaan yang sudah dijawab atau dilewati tidak diulang; maksimal 5 pertanyaan; kontributor bisa berhenti.
3. `AIProvider.structureDraft` menyusun ulang draf dari seluruh percakapan setiap kali ada jawaban. Draf hanya berisi teks kontributor sendiri; yang belum diketahui dicatat di `missingInfo`.
4. Kontributor mengirim untuk review (`pending_review`). Sistem mencari kemungkinan konflik dengan pengetahuan terverifikasi di kategori yang sama dan menandainya sebagai relasi `conflicts_with` yang **belum diverifikasi**.
5. Reviewer memverifikasi atau meminta revisi. Penetapan resmi hanya untuk jenis tertentu dan peran tertentu (lihat `docs/ACCESS_MATRIX.md`). AI tidak pernah bisa mengubah status.
6. Tanya DNI menjalankan pipeline retrieval di bawah.

## Pipeline retrieval (PRD Part 6)

1. Autentikasi pengguna (`requireUser`).
2. Resolusi izin: `readableItems(user)` dan `readableDecisions(user)`.
3. Hanya status `verified` dan `approved_official` yang dipakai. Draf tidak pernah dianggap pengetahuan perusahaan.
4. Penyaringan relevansi kata kunci (`src/server/services/search.ts`). Postgres full-text search dan pgvector menyusul di Fase 5.
5. Model hanya menerima sumber yang lolos langkah 2–4, diberi label `S1..Sn`.
6. Output divalidasi dengan Zod; sitasi yang tidak cocok dengan sumber yang dikirim dibuang dan dihitung.
7. Jawaban dikembalikan bersama daftar sumber. Jika tidak ada sumber, jawaban menyatakan bukti tidak cukup.

Keamanan tidak bergantung pada prompt: konten yang tidak boleh dilihat pengguna tidak pernah masuk ke konteks model.

## Pemisahan jenis pengetahuan

`KnowledgeType` membedakan pengalaman pribadi, arahan manajemen, kebijakan resmi, standar teknis, catatan historis, pelajaran, dan pengetahuan umum. Rekomendasi AI **tidak pernah disimpan** sebagai pengetahuan; ia hanya muncul sebagai bagian berlabel di jawaban. Keputusan historis ditampilkan dengan catatan bahwa itu bukan instruksi yang berlaku sekarang.

## Titik integrasi berikutnya

| Komponen | Sekarang | Nanti |
| --- | --- | --- |
| Penyimpanan | `DataStore` di memori | Repository Supabase Postgres dengan RLS (Fase 2) |
| Autentikasi | Cookie persona dummy | Supabase Auth email/password, opsi SSO perusahaan (Fase 2) |
| AI | `MockAIProvider` | Provider Claude di balik `AIProvider`, dijaga `DNI_ALLOW_EXTERNAL_AI` (Fase 4, setelah persetujuan data) |
| Pencarian | Skor kata kunci | Postgres FTS, pgvector bila dibutuhkan (Fase 5) |
| Berkas | Belum ada | Supabase Storage privat dengan batas tipe dan ukuran |
| Hosting | Lokal | Vercel (hanya setelah persetujuan) |
