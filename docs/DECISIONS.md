# Keputusan Teknis, Asumsi, dan Risiko

## Keputusan dari Anton (2026-10-24)

1. Fase 0–1 hanya dengan data sintetis/dummy.
2. Pengembangan lokal dan mock data dulu; tidak membuat akun, mengaktifkan layanan berbayar, atau deploy tanpa persetujuan.
3. AI provider abstraction; mock AI dulu; tidak ada data perusahaan ke AI eksternal.
4. UI Bahasa Indonesia, struktur siap English dan Jepang; konten mengikuti bahasa sumber.
5. Mock authentication dengan peran simulasi; dirancang untuk email/password dan SSO nanti; tidak dianggap aman untuk production.
6. Fokus MVP: Capture → AI Clarification → Structured Draft → Review/Approval → Knowledge Library → Ask DNI.
7. Matriks akses dan approval default dipakai sebagai draf, bukan kebijakan resmi.

## Keputusan teknis (dapat diubah)

| # | Keputusan | Alasan |
| --- | --- | --- |
| T1 | Next.js 16 App Router + server actions, tanpa API publik | Satu aplikasi, otorisasi di server, lebih sedikit permukaan serangan |
| T2 | Penyimpanan di memori di balik `DataStore` | Sesuai keputusan lokal-dulu; bentuk data = tabel Postgres rencana |
| T3 | Aturan izin sebagai fungsi murni di `src/domain` | Mudah diuji dan dicerminkan 1:1 ke RLS Supabase |
| T4 | Semua output AI lewat skema Zod | Model diganti tanpa mengubah UI; output rusak ditolak |
| T5 | Mock AI hanya menyusun ulang kata-kata kontributor | Menjamin tidak ada detail teknis yang dikarang |
| T6 | Tanya DNI hanya memakai status terverifikasi dan resmi | Draf tidak boleh dianggap pengetahuan perusahaan |
| T7 | Penolakan akses = 404 yang sama dengan "tidak ada" | Mencegah penebakan id (IDOR) |
| T8 | Tailwind 4 dengan design tokens sendiri, tanpa pustaka komponen besar | Tampilan khas, ringan, mudah dirawat |
| T9 | Font Inter via `@fontsource` (tanpa panggilan ke Google saat build) | Build bisa berjalan di jaringan tertutup |
| T10 | Konflik dideteksi dengan heuristik dan ditandai "belum diverifikasi" | PRD: jangan menganggap relasi kritis sebagai fakta tanpa validasi |

## Asumsi

- Pengguna utama memakai desktop; mobile dipakai untuk membaca dan capture singkat.
- Satu orang punya satu departemen utama; peran bisa lebih dari satu.
- Kategori pengetahuan mengikuti daftar PRD 2.3 apa adanya.
- ID tampilan (K-0001, C-0001) cukup untuk prototipe; database nanti memakai UUID internal plus kode tampilan.

## Risiko

| Risiko | Dampak | Mitigasi saat ini |
| --- | --- | --- |
| Mock auth terbawa ke production | Siapa pun bisa menyamar | Ditolak di build production tanpa flag eksplisit; banner di setiap halaman |
| Matriks akses draf dianggap resmi | Akses salah ke data rahasia | Banner DRAF di Administrasi dan dokumen; daftar pertanyaan untuk manajemen |
| Deteksi celah berbasis aturan terlalu sederhana | Pertanyaan kurang relevan | Batas 5 pertanyaan, bisa dilewati; diganti model nyata di Fase 4 dengan kontrak yang sama |
| Pencarian kata kunci melewatkan sinonim | Jawaban "bukti tidak cukup" padahal ada | FTS dan pgvector di Fase 5; tidak ada klaim akurasi sebelum ada test set |
| Data hilang saat restart (prototipe) | Demo terganggu | Disengaja untuk Fase 0–1; Supabase di Fase 2 |
| Adopsi kontributor senior | Pengetahuan tidak tertangkap | Input satu kalimat, pertanyaan satu per satu, bisa berhenti kapan saja |

## Keputusan yang menunggu persetujuan Anton

1. Membuat proyek Supabase (paket, region data, siapa pemilik akun) untuk Fase 2.
2. Membuat proyek Vercel atau hosting lain untuk preview internal.
3. Jawaban atas pertanyaan matriks akses di `docs/ACCESS_MATRIX.md`.
4. Kebijakan retensi percakapan (usulan: chat Tanya DNI 90 hari).
5. Siapa yang mereview syarat penyedia AI dan UU PDP sebelum Fase 4.
6. Apakah `main` dibuat sebagai branch utama dan perubahan selanjutnya lewat pull request.
