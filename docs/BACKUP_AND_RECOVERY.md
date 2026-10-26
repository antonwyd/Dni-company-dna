# Backup dan Pemulihan

## Status Fase 0–1

Belum ada backup. Data prototipe hanya di memori server dan sengaja kembali ke data dummy setiap restart. Tidak ada data nyata yang perlu dilindungi.

## Rencana untuk Fase 2+ (Supabase)

1. **Backup harian otomatis** dari Supabase (tersedia di paket berbayar; perlu persetujuan) plus point-in-time recovery bila paketnya mendukung.
2. **Ekspor mandiri mingguan** (`pg_dump` terenkripsi) ke penyimpanan milik perusahaan, agar perusahaan tidak bergantung pada satu penyedia (PRD 4.3).
3. **Berkas** di Supabase Storage disalin ke penyimpanan milik perusahaan dengan jadwal yang sama.
4. **Uji restore terjadwal** (minimal per kuartal): restore ke proyek terpisah, jalankan tes otorisasi dan sampel verifikasi isi, catat hasilnya di sini. Ini memenuhi MVP TEST 10.
5. **Ekspor berformat terbuka** (JSON/CSV per tabel) untuk transisi penyedia.

## Catatan hasil uji restore

| Tanggal | Sumber backup | Hasil | Pemeriksa |
| --- | --- | --- | --- |
| — | — | Belum dilakukan | — |
