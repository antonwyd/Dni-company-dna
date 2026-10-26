# Keamanan DNI

## Batasan prototipe Fase 0–1 (penting)

- **Autentikasi simulasi tidak aman.** Cookie `dni_mock_user` hanya berisi id persona tanpa tanda tangan; siapa pun bisa mengganti nilainya. Mode ini ditolak di build production kecuali `DNI_E2E=true` (tes lokal) atau `DNI_ALLOW_MOCK_AUTH_IN_PRODUCTION=true` (demo internal yang disetujui). Jangan deploy prototipe ini ke internet.
- **Data hanya di memori** dan hilang saat server dimulai ulang. Belum ada backup.
- **Hanya data dummy.** Semua orang, mesin, pelanggan, supplier, dan angka di seed adalah fiktif dan ditandai `synthetic: true`.
- **AI simulasi.** `MockAIProvider` tidak mengirim data ke mana pun. Provider eksternal ditolak saat start kecuali `DNI_ALLOW_EXTERNAL_AI=true`, yang tidak boleh diaktifkan sebelum ada persetujuan internal (PRD 4.4).

## Kontrol yang sudah diterapkan

| Kontrol | Implementasi |
| --- | --- |
| Otorisasi di server | Setiap halaman dan server action memanggil `requireUser()`; semua akses data lewat service yang memanggil `src/domain/permissions.ts` |
| Klasifikasi akses | 4 kelas: internal umum, terbatas departemen, rahasia, sangat rahasia; aturan di `docs/ACCESS_MATRIX.md` (draf) |
| Manajemen tidak otomatis melihat semua | Rahasia hanya kepala departemen pemilik dan Presiden Direktur; sangat rahasia hanya dengan grant eksplisit |
| Anti-IDOR | Record yang tidak ada dan record terlarang sama-sama 404; sesi capture milik orang lain sama-sama "tidak ditemukan" |
| Filter sebelum AI | Retrieval memfilter izin sebelum relevansi; model tidak pernah menerima konten terlarang |
| Validasi output model | Semua output AI divalidasi Zod; sitasi ke sumber yang tidak dikirim dibuang |
| AI tidak bisa menaikkan status | `checkApprovalAction` menolak aktor `ai` dan `system`; action server selalu memakai pengguna yang login sebagai aktor |
| Tidak ada self-review | Kontributor tidak bisa memverifikasi atau menetapkan resmi kontribusinya sendiri |
| Validasi input | Zod di setiap server action; batas panjang teks 4.000 karakter |
| Prompt injection | Konten sumber diperlakukan sebagai data; mock tidak mengeksekusi instruksi; kasus uji E-05 memakai dokumen berisi instruksi tersembunyi |
| Audit log | Append-only, hanya berisi id dan kode (tanpa isi pengetahuan); mencatat akses ditolak, akses ke data rahasia, perubahan status, pertanyaan ke Assistant |
| Header keamanan | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `X-Powered-By` dimatikan |
| Rahasia | Tidak ada rahasia di repo; `.env*` diabaikan git; `.env.example` hanya placeholder |
| Dependensi | Versi dipin exact; `npm audit` bersih saat commit |

## Yang wajib sebelum data nyata (Fase 2–8)

1. Ganti autentikasi simulasi dengan Supabase Auth (sesi aman, cookie httpOnly bertanda tangan); opsi SSO.
2. Terapkan Row Level Security yang mencerminkan `permissions.ts` dan uji dengan tes otorisasi yang sama di level database.
3. Service-role key hanya di server; tidak ada prefix `NEXT_PUBLIC_`.
4. Rate limiting untuk login, Tanya DNI, dan capture.
5. Content-Security-Policy dengan nonce.
6. Upload berkas: batas tipe dan ukuran, penyimpanan privat, pemindaian bila memungkinkan, perlakukan isi sebagai tidak tepercaya.
7. Review syarat penyedia AI (retensi, pemrosesan lintas negara, UU PDP), klasifikasi data yang boleh dikirim, dan persetujuan internal tertulis.
8. Kebijakan retensi percakapan dan workflow penghapusan.
9. Backup terenkripsi dan uji restore (MVP TEST 10).

## Melaporkan masalah keamanan

Laporkan ke pemilik repositori secara langsung, bukan lewat issue publik.
