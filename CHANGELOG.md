# Changelog

## 0.1.0 — 2026-10-26 (Fase 0–1, prototipe)

### Ditambahkan
- Fondasi proyek: Next.js 16, TypeScript strict, Tailwind CSS 4, Zod, Vitest, Playwright, ESLint, Prettier.
- Model domain DNI, draf matriks akses dan aturan approval.
- Mock AI provider dengan kontrak output tervalidasi; penjaga untuk provider eksternal.
- Alur Capture → Klarifikasi → Draf → Review → Perpustakaan → Tanya DNI dengan data dummy.
- Halaman minimal: Keputusan, Celah Pengetahuan, Evaluation Center, Administrasi.
- Autentikasi simulasi dengan 8 persona dummy.
- i18n: Bahasa Indonesia, English, struktur Jepang.
- Audit log append-only, header keamanan.
- Dokumentasi arsitektur, keamanan, data model, matriks akses, keputusan, pengujian, backup.
- Tes unit (32) dan end-to-end (6 skenario, desktop dan mobile).
