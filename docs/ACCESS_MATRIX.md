# Matriks Akses dan Approval — DRAF

> **Ini draf untuk prototipe, bukan kebijakan resmi PT Takai Seiki Indonesia.** Aturan ini harus direview dan disetujui manajemen sebelum dipakai dengan data nyata. Kode: `src/domain/permissions.ts`; tes: `tests/unit/permissions.test.ts`.

## Akses baca

Seseorang selalu bisa membaca butir yang ia kontribusikan, miliki, atau ditugaskan untuk mereview, serta butir yang diberikan lewat grant eksplisit. Selain itu:

| Klasifikasi | Siapa yang bisa membaca |
| --- | --- |
| Internal umum | Semua pengguna aktif |
| Terbatas departemen | Anggota departemen yang sama, Presiden Direktur, General Manager |
| Rahasia | Kepala departemen pemilik, Presiden Direktur |
| Sangat rahasia | Hanya grant eksplisit (tidak ada akses otomatis, termasuk untuk manajemen) |

Administrator sistem mengelola platform, bukan konten: ia tidak bisa capture dan hanya membaca butir internal umum serta butir terbatas milik departemen IT.

## Akses modul

| Modul | Peran |
| --- | --- |
| Beranda, Tanya DNI, Perpustakaan, Keputusan | Semua pengguna aktif (isi tetap difilter per butir) |
| Bagikan Pengetahuan | Semua kecuali administrator murni |
| Review | Reviewer, kepala departemen, Presiden Direktur, General Manager |
| Celah Pengetahuan | Kepala departemen, Presiden Direktur, General Manager |
| Evaluation Center | Reviewer, administrator, Presiden Direktur, General Manager |
| Administrasi | Administrator |

## Approval

| Tindakan | Status | Siapa |
| --- | --- | --- |
| Kirim untuk review | captured / ai_draft → pending_review | Kontributor atau pemilik |
| Verifikasi | pending_review → verified | Reviewer, kepala departemen pemilik, PD, GM; **bukan** kontributor |
| Minta revisi | pending_review / verified → ai_draft | Sama dengan verifikasi |
| Tetapkan resmi: standar teknis | verified → approved_official | Kepala departemen pemilik, PD, GM; bukan kontributor |
| Tetapkan resmi: kebijakan, arahan manajemen | verified → approved_official | PD atau GM; bukan kontributor |
| Tetapkan resmi: pengalaman, catatan historis, pelajaran, pengetahuan umum | — | Tidak bisa; maksimal terverifikasi |
| Tandai digantikan, arsipkan | verified / approved_official → superseded / archived | Pemilik, kepala departemen pemilik, PD, GM |
| AI atau sistem | — | Tidak pernah bisa mengubah status |

## Jadwal review

| Jenis | Interval |
| --- | --- |
| Kebijakan resmi, standar teknis | 12 bulan |
| Arahan manajemen | 6 bulan |
| Pengalaman, pelajaran, pengetahuan umum | 24 bulan |
| Catatan historis | Tidak kedaluwarsa |

## Pertanyaan untuk diputuskan manajemen

1. Apakah Presiden Direktur otomatis boleh membaca semua data sangat rahasia, atau tetap lewat grant?
2. Apakah General Manager boleh membaca semua data rahasia lintas departemen?
3. Apakah standar teknis butuh dua tingkat persetujuan (misalnya kepala departemen + Quality)?
4. Siapa yang boleh memberi grant untuk data sangat rahasia, dan apakah grant perlu tanggal kedaluwarsa?
