# DNI — Company DNA Intelligence System

Sistem pengetahuan dan intelijen perusahaan untuk PT Takai Seiki Indonesia. DNI menangkap pengalaman, keputusan, dan keahlian operasional, lalu menjadikannya pengetahuan yang bersumber jelas, terverifikasi, dan aman diakses.

> **Status: prototipe Fase 0–1.** Semua data adalah **data dummy**. Autentikasi dan AI masih **simulasi**. Jangan masukkan data perusahaan asli atau rahasia, dan jangan deploy ke production.

## Yang sudah berjalan

- **Bagikan pengetahuan**: mulai dari satu kalimat, DNI bertanya satu per satu (istilah, konteks, gejala, kriteria, penanggung jawab, wewenang), kontributor bisa menjawab, melewati, atau berhenti kapan saja. Draf terstruktur disusun hanya dari kata-kata kontributor.
- **Review**: reviewer melihat sumber asli dan draf berdampingan, lalu memverifikasi, meminta revisi, atau menetapkan sebagai resmi sesuai wewenangnya.
- **Perpustakaan**: pencarian dan filter, detail lengkap dengan sumber, pemilik, status, versi, klasifikasi, relasi, dan riwayat.
- **Tanya DNI**: jawaban hanya dari pengetahuan terverifikasi yang boleh dilihat penanya, dengan sitasi, batas persetujuan, informasi yang belum ada, dan tingkat keyakinan. Jika bukti tidak ada, DNI mengatakannya.
- **Keputusan, Celah Pengetahuan, Evaluation Center, Administrasi**: versi minimal.

Lihat [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) untuk status per fase.

## Menjalankan secara lokal

Prasyarat: Node.js 20.9 atau lebih baru.

```bash
npm install
cp .env.example .env.local   # opsional; default sudah mock
npm run dev                  # http://localhost:3000
```

Buka `/login` dan pilih salah satu persona dummy. Data tersimpan di memori server dan kembali ke data awal setiap kali server dimulai ulang.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build production |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tes unit (Vitest) |
| `npm run test:e2e` | Tes end-to-end (Playwright, build dulu dengan `npm run build`) |

## Dokumentasi

- [ARCHITECTURE.md](ARCHITECTURE.md) — arsitektur dan alur data
- [SECURITY.md](SECURITY.md) — model keamanan dan batasan prototipe
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — rencana dan status fase
- [CHANGELOG.md](CHANGELOG.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — rancangan skema database
- [docs/ACCESS_MATRIX.md](docs/ACCESS_MATRIX.md) — draf matriks akses dan approval
- [docs/DECISIONS.md](docs/DECISIONS.md) — keputusan teknis, asumsi, risiko, dan keputusan yang menunggu persetujuan
- [docs/TESTING.md](docs/TESTING.md) — strategi dan hasil pengujian
- [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md)
- Tangkapan layar desktop dan mobile: [docs/screenshots](docs/screenshots)
