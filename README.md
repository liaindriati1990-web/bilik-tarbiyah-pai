# Bilik Tarbiyah Digital — Portal Pembelajaran Interaktif PAI & Budi Pekerti

Aplikasi web pembelajaran **Pendidikan Agama Islam dan Budi Pekerti (PAI-BP)** berbasis **GitHub Pages (Frontend Statis)** + **Google Apps Script (Backend API)** + **Google Sheets & Google Drive (Database & Penyimpanan Media)**.

Dirancang dari hasil transformasi situs Google Sites referensi dengan fokus penuh pada pembelajaran PAI (tanpa PKN), selaras dengan arah inovasi **Apresiasi Guru PAI Kemenag RI** (*Deep Learning*, *Kurikulum Berbasis Cinta*, *Smart PAI*, dan konsep *Zero-Budget IT Infrastructure*).

---

## Arsitektur 3 Peran (Publik, Portal Siswa, & Panel Guru)

1. **Halaman Umum / Publik (Terbuka Tanpa Login):**
   - **Beranda:** Hero Banner Slider unggahan guru, statistik pembelajaran, & Asisten Belajar PAI.
   - **Ruang Materi PAI (Kelas X, XI, XII):** Alur *Deep Learning* 5 tahap (*Apersepsi*, *Video/Slide/PDF/Gambar/Bedah Tajwid Interaktif*, *Ruang Renungan*, *Ruang Kritis HOTS*, *E-LKPD*).
   - **Jadwal & Riwayat Pembelajaran (`#riwayat`):** Filter per **Bulan**, **Kelas**, **Jenis (`Daring`/`Luring`)**, dan **Status (`Terlaksana`/`Sedang Berlangsung`)**. Klik kartu pertemuan untuk melihat rekapan data mengajar (materi, catatan guru, & jumlah hadir/izin/sakit/alpa) secara *read-only*.
   - **Zona Evaluasi (`PAIBP Smart Test` CBT & `Upload Tugas`), Amaliyah KBC, Galeri Karya Terkurasi, & Portofolio Inovasi STAR.**
   - **Autocomplete 3 Rekomendasi Siswa:** Di form kuis, upload tugas, renungan, ruang kritis, & amaliyah, cukup ketik beberapa huruf nama atau **NISN** maka otomatis muncul maksimal **3 rekomendasi siswa** dari Master Data Siswa yang diimpor guru.

2. **Portal Siswa (`#siswa` — Login Username = NISN & Password = NISN):**
   - Menampilkan profil resmi siswa, ringkasan aktivitas belajar, serta jadwal pembelajaran kelasnya.
   - **Presensi Daring Mandiri Terkunci Jadwal:** Siswa hanya dapat mengisi presensi pada jadwal kelasnya yang berjenis **Daring** dan berstatus **Sedang Berlangsung**. Jadwal berstatus **Terlaksana** atau berjenis **Luring** otomatis terkunci.

3. **Panel Guru (`#admin` — Sidebar Menu Kiri + Login Username/Password):**
   - **Dashboard:** Analitik pembelajaran, grafik rerata skor CBT & daftar hadir.
   - **Kelola Siswa & Kelas:**
     - *Data Kelas* (CRUD kelas via modal + tombol **`Lihat Daftar Siswa`**).
     - *Data Siswa Ber-NISN* (**NISN wajib sebagai ID siswa**, tambah/edit via modal, **Unduh Template Excel `.xlsx`**, & **Import massal Excel/CSV**).
   - **Jadwal Pembelajaran:** CRUD jadwal (`Daring`/`Luring`, `Sedang Berlangsung`/`Terlaksana`) via modal, **Presensi Siswa** (`modal-xl`) langsung dari baris jadwal (termasuk **Cetak Presensi ExcelJS** bergaris presisi dengan kop merge-center), serta tetap bisa input manual meski jadwal sudah `Terlaksana`.
   - **Banner Depan & Galeri**, **Materi, Multi-Gambar & Tajwid**, **Bank Soal CBT**, **Rekap & Ekspor CSV/Cetak**, serta **Koneksi & Akun**.

---

## Panduan Pemasangan & Update `Code.gs`

1. Buka Google Spreadsheet Anda → **Extensions → Apps Script**.
2. Salin seluruh isi [`apps-script/Code.gs`](apps-script/Code.gs) ke editor Apps Script → **Save**.
3. Klik **Deploy → Manage deployments → Edit (ikon pensil) → Version: New version → Deploy** (atau *New deployment → Web app*, Execute as: *Me*, Who has access: *Anyone*).
4. **Auto-Setup Database:** Saat Web App diakses atau saat menjalankan `setupDatabase()`, script otomatis membuat/memperbarui **15 sheet** (`Pengaturan`, `Kelas`, `Siswa`, `Jadwal`, `BannerSlide`, `Materi`, `Tajwid`, `BankSoal`, `Absensi`, `Evaluasi`, `RuangKritis`, `Amaliyah`, `Tugas`, `Diskusi`, `Galeri`), 2 folder Drive (`Bilik_Tarbiyah_Tugas_Siswa` & `Bilik_Tarbiyah_Media`) **di folder Drive yang sama dengan Spreadsheet**, dan data awal.
5. Tempel URL Web App ke [`js/config.js`](js/config.js) atau lewat **Panel Guru → Koneksi & Akun**.
6. Publikasikan seluruh isi folder ke **GitHub Pages** (`Settings → Pages → Deploy from main branch`).
