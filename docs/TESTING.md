# Pengujian

## Cara menjalankan

```bash
npm test             # unit (Vitest)
npm run build
npm run test:e2e     # end-to-end (Playwright; menjalankan `next start` di port 3100)
npm run lint
npm run typecheck
```

E2E memakai Chromium. Jika browser Playwright tidak ada di mesin, jalankan `npx playwright install chromium` sekali.

## Cakupan terhadap uji penerimaan MVP (PRD Part 7)

| Uji | Unit | E2E | Catatan |
| --- | --- | --- | --- |
| 1. Sumber disimpan dan draf dibuat | ✓ | ✓ | |
| 2. DNI menanyakan konteks yang hilang | ✓ | ✓ | |
| 3. Jawaban memperbarui draf tanpa kehilangan info | ✓ | ✓ | |
| 4. Reviewer melihat sumber asli dan draf | ✓ | ✓ | |
| 5. Reviewer berwenang memvalidasi | ✓ | ✓ | Termasuk penolakan self-review dan aktor AI |
| 6. Pengguna berizin mengambil pengetahuan dan sumber | ✓ | ✓ | |
| 7. Pengguna tak berizin diblokir di UI, API, pencarian, assistant, id langsung | ✓ | ✓ | Belum ada API publik; server actions memakai service yang sama |
| 8. Konflik ditandai | ✓ | ✓ | |
| 9. Pertanyaan tanpa bukti tidak mengarang kebijakan | ✓ | ✓ | |
| 10. Backup bisa direstore | — | — | Belum ada database (Fase 2) |
| 11. Bisa dipakai di desktop dan mobile | — | ✓ | Pixel 7 viewport, tanpa scroll horizontal |
| 12. Non-developer bisa submit pengetahuan | — | ✓ sebagian | Alur tanpa form panjang teruji; uji dengan pengguna nyata saat pilot |

## Hasil terakhir

Dijalankan 2026-10-26 di lingkungan pengembangan (Node 22, Chromium Playwright):

- Unit: **32 lulus, 0 gagal** (3 berkas).
- E2E: **6 lulus, 0 gagal, 1 dilewati** (tes mobile hanya berjalan di proyek `mobile`).
- Evaluation Center (dijalankan dari tes): **7 dari 7 kasus lulus**.
- `npm run lint`, `npm run typecheck`, `npm audit`: bersih.

Angka ini hanya untuk data dummy dan mock AI. Tidak ada klaim akurasi retrieval sampai ada test set representatif yang disetujui (PRD Part 8).
