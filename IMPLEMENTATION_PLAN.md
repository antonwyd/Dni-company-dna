# Rencana Implementasi DNI

Status per 2026-10-26. Fokus MVP yang disetujui: **Capture → AI Clarification → Structured Draft → Review/Approval → Knowledge Library → Ask DNI**. Fitur P0 lain dibuat minimal tanpa menghilangkan fondasi arsitekturnya.

| Fase | Isi | Status |
| --- | --- | --- |
| 0 | Inspeksi lingkungan, arsitektur, desain keamanan, draf skema dan matriks akses | Selesai |
| 1 | Fondasi proyek, design system, navigasi berbasis izin, prototipe alur utama dengan data dummy | Selesai |
| 2 | Supabase Postgres, Supabase Auth, RLS, migrasi | Belum mulai (perlu persetujuan akun/layanan) |
| 3 | Capture dan penyimpanan sumber di database, autosave lintas perangkat | Belum mulai |
| 4 | AI Clarification Engine dengan provider nyata | Belum mulai (perlu persetujuan data ke AI eksternal) |
| 5 | Perpustakaan, retrieval FTS/pgvector, sitasi | Belum mulai |
| 6 | Review, approval yang bisa dikonfigurasi, versi, Decision Memory lengkap | Belum mulai |
| 7 | Uji keamanan dan Evaluation Center lengkap | Belum mulai |
| 8 | Pilot (senior management) | Belum mulai (perlu persetujuan deploy) |
| 9 | Ekspansi departemen | Belum mulai |
| 10 | Succession Intelligence (P1) | Belum mulai |

## Fase 0–1: yang dikerjakan

- Proyek Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, Zod, Vitest, Playwright, ESLint, Prettier.
- Model domain lengkap untuk semua tabel PRD 5.1 (`src/domain/types.ts`), dengan rancangan SQL di `docs/DATA_MODEL.md`.
- Draf matriks akses dan aturan approval sebagai fungsi murni yang teruji.
- `AIProvider` dengan kontrak output Zod dan `MockAIProvider` deterministik.
- Service layer untuk capture, review, perpustakaan, Tanya DNI, evaluasi, audit.
- UI: design tokens, komponen, navigasi berbasis izin, desktop dan mobile.
- Halaman: Beranda, Tanya DNI, Bagikan Pengetahuan (+ sesi), Perpustakaan (+ detail), Keputusan (+ detail), Celah Pengetahuan, Review (+ detail), Evaluation Center, Administrasi, Masuk.
- i18n: Bahasa Indonesia utama, English lengkap, struktur Jepang dengan fallback.

## Status fitur P0

| Fitur PRD | Fase 0–1 | Masih kurang |
| --- | --- | --- |
| 2.1 Knowledge Capture | Teks, sumber asli, klarifikasi, skip, berhenti, lanjutkan draf | Suara, dokumen, gambar; persistensi DB |
| 2.2 Conversational Intelligence | Deteksi 7 dari 8 celah dengan aturan; istilah umum vs spesifik perusahaan | Model nyata; deteksi konflik saat percakapan |
| 2.3 Knowledge Library | Cari, filter, detail dengan semua field wajib | Edit dan revisi oleh pemilik; FTS |
| 2.4 Relationship Engine | Relasi bertipe dengan status verifikasi; tampil di detail | UI membuat dan memverifikasi relasi |
| 2.5 Decision Memory | Daftar dan detail, informasi hilang ditandai | Form pencatatan keputusan |
| 2.6 AI Assistant | Pipeline retrieval lengkap dengan sitasi tervalidasi | Model nyata; pertanyaan lanjutan |
| 2.7 Trust & Conflict | 7 status, transisi teruji, penanda konflik | Workflow approval yang bisa dikonfigurasi di UI |
| 2.8 Knowledge-to-Action | Rekomendasi AI berlabel di jawaban | Checklist dan task draf |
| 2.9 Lifecycle | Jadwal review berdasarkan jenis; historis tidak kedaluwarsa | Notifikasi stale |
| 2.12 Evaluation Center | 7 kasus uji, run nyata, hasil tercatat | Kasus yang bisa ditambah dari UI; riwayat run |

## Langkah berikutnya yang diusulkan

1. Persetujuan untuk membuat proyek Supabase (region, paket) → Fase 2: migrasi skema, RLS, Supabase Auth, repository `DataStore` berbasis Supabase, tes RLS.
2. Form edit/revisi pengetahuan oleh pemilik dan riwayat versi yang bertambah.
3. Persiapan Fase 4: review syarat penyedia AI dan klasifikasi data yang boleh dikirim.
