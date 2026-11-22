/**
 * ============================================================================
 * Bilik Tarbiyah Digital — Google Apps Script Backend (Code.gs)
 * ============================================================================
 * - Otomatis membuat seluruh 18 sheet tabel (Pengaturan, Kelas, Siswa [NISN & Password],
 *   Jadwal, BannerSlide, Materi, Tajwid, BankSoal, Absensi, Evaluasi, RuangKritis,
 *   Amaliyah, Tugas, Diskusi, Galeri, AyoBelajarConfig, AyoBelajarKomentar, ProfilGuruRiwayat), folder Drive
 *   langsung di dalam folder induk Spreadsheet, & data awal PAI-BP.
 * - Mendukung Autentikasi Guru (Username/Password) & Autentikasi Siswa (NISN/NISN)
 *   serta Presensi Daring Mandiri KHUSUS untuk jadwal berstatus "Sedang Berlangsung" & "Daring".
 */

const DRIVE_TUGAS_FOLDER = 'Bilik_Tarbiyah_Tugas_Siswa';
const DRIVE_MEDIA_FOLDER = 'Bilik_Tarbiyah_Media';
const DRIVE_ABSENSI_FOLDER = 'absensi';
const SCHEMA_READY_PROP_KEY = 'btd_schema_ready_v4_9';
const PUBLIC_CACHE_PREFIX = 'btd_pub_v4_';
const SESSION_TOKEN_TTL_SEC = 21600; // 6 jam
const AUTH_RATE_LIMIT_MAX = 8;
const AUTH_RATE_LIMIT_WINDOW_SEC = 900; // 15 menit

const SHEET_SCHEMAS = {
  Pengaturan: ['key', 'value'],
  Kelas: ['id', 'namaKelas', 'jenjang', 'waliKelas', 'keterangan'],
  Siswa: ['id', 'nisn', 'nama', 'kelas', 'jenisKelamin', 'status', 'password'],
  Jadwal: ['id', 'tanggal', 'semester', 'jamKe', 'kelas', 'materiId', 'materiJudul', 'jenis', 'status', 'catatan'],
  BannerSlide: ['id', 'urutan', 'badge', 'judul', 'deskripsi', 'imageUrl', 'ctaLabel', 'ctaLink', 'aktif'],
  Materi: [
    'id', 'jenjang', 'semester', 'bab', 'judul', 'elemen', 'ringkasan', 'apersepsi',
    'pemantik', 'dnaPoin', 'coverImage', 'infografisUrl', 'galeriGambar',
    'youtubeId', 'youtubeIdTambahan', 'slideUrl', 'pdfUrl', 'bukuUrl',
    'lkpdUrl', 'studiKasus', 'nilaiKbc', 'aktif'
  ],
  Tajwid: ['id', 'materiId', 'lafalArab', 'transliterasi', 'sumberAyat', 'hukum', 'alasan', 'caraBaca'],
  BankSoal: ['id', 'kelas', 'jenjang', 'semester', 'bab', 'materiId', 'materiJudul', 'pertanyaan', 'gambarUrl', 'opsi', 'kunci', 'pembahasan', 'level'],
  Absensi: ['id', 'timestamp', 'jadwalId', 'tanggal', 'jadwal', 'materi', 'kelas', 'nisn', 'nama', 'status', 'catatan', 'fotoUrl'],
  Evaluasi: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'jenjang', 'bab', 'skor', 'benar', 'totalSoal', 'waktuDetik', 'catatanGuru'],
  RuangKritis: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'materiId', 'nilaiKbc', 'analisis', 'dikurasi', 'nilai', 'catatanGuru'],
  Amaliyah: [
    'id', 'timestamp', 'nisn', 'nama', 'kelas', 'bab', 'lulusSensorGadget',
    'zeroProkrastinasi', 'petarungFokus', 'pencapaianTerbaik', 'refleksiKbc', 'nilai', 'catatanGuru'
  ],
  Tugas: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'materiId', 'bab', 'jenisTugas', 'fileUrl', 'catatan', 'nilai', 'catatanGuru'],
  Diskusi: ['id', 'timestamp', 'materiId', 'nisn', 'nama', 'kelas', 'pesan'],
  Galeri: ['id', 'judul', 'kelas', 'kategori', 'kreator', 'ringkasan', 'gambarUrl', 'tautan'],
  AyoBelajarConfig: ['id', 'kategoriId', 'judul', 'youtubeId', 'coverImage', 'prayerAudios', 'komentarAktif', 'updatedAt'],
  AyoBelajarKomentar: ['id', 'timestamp', 'topicId', 'topicTitle', 'kategoriTitle', 'nama', 'instansi', 'pekerjaan', 'email', 'noHp', 'komentar'],
  ProfilGuruRiwayat: ['id', 'kategori', 'periode', 'judul', 'instansi', 'keterangan', 'urutan']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bilik Tarbiyah DB')
    .addItem('Setup & Sinkronisasi Struktur Database Otomatis', 'setupDatabase')
    .addItem('Otorisasi & Buat Folder Drive (absensi)', 'otorisasiDriveAbsensi')
    .addToUi();
}

function otorisasiDriveAbsensi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const absFolder = getOrCreateFolder_(DRIVE_ABSENSI_FOLDER, ss);
  getOrCreateFolder_(DRIVE_TUGAS_FOLDER, ss);
  getOrCreateFolder_(DRIVE_MEDIA_FOLDER, ss);
  const msg = 'Izin Google Drive aktif! Folder "' + absFolder.getName() + '" siap menyimpan foto selfie presensi.';
  try {
    ss.toast(msg, 'Bilik Tarbiyah Drive', 6);
  } catch (e) {
    // Abaikan di luar UI Spreadsheet
  }
  return {
    ok: true,
    folderId: absFolder.getId(),
    folderName: absFolder.getName(),
    message: msg
  };
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureDatabaseReady_(ss, true);
  let folderNote = 'Drive belum terotorisasi';
  let driveReady = false;
  let driveError = '';
  try {
    const absFolder = getOrCreateFolder_(DRIVE_ABSENSI_FOLDER, ss);
    getOrCreateFolder_(DRIVE_TUGAS_FOLDER, ss);
    getOrCreateFolder_(DRIVE_MEDIA_FOLDER, ss);
    const parentFolder = getSpreadsheetParentFolder_(ss);
    folderNote = 'folder "' + parentFolder.getName() + '" / "' + absFolder.getName() + '" siap';
    driveReady = true;
  } catch (e) {
    driveError = String((e && e.message) || e || '');
    folderNote = 'DriveApp belum diizinkan (' + driveError + ')';
  }
  const sheetCount = Object.keys(SHEET_SCHEMAS).length;
  const msg = driveReady
    ? 'Database ' + sheetCount + ' sheet & folder Drive ("' + DRIVE_ABSENSI_FOLDER + '") siap digunakan (' + folderNote + ').'
    : 'Database ' + sheetCount + ' sheet siap, TETAPI Google Drive belum aktif (' + driveError + '). Buka Editor Apps Script -> jalankan fungsi otorisasiDriveAbsensi -> klik Izinkan.';
  try {
    ss.toast(msg, 'Bilik Tarbiyah DB', 6);
  } catch (toastErr) {
    // Abaikan bila dipanggil di luar UI Spreadsheet (mis. Web App API)
  }
  return {
    message: msg,
    driveReady: driveReady,
    driveError: driveError,
    sheets: Object.keys(SHEET_SCHEMAS)
  };
}

function ensureSheetColumns_(sheet, expectedHeaders, sheetName) {
  if (!sheet || sheet.getLastRow() === 0) return;
  const lastCol = Math.max(1, sheet.getLastColumn());
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((h) => String(h || '').trim());
  while (rawHeaders.length > 0 && !rawHeaders[rawHeaders.length - 1]) {
    rawHeaders.pop();
  }
  if (sheetName === 'Siswa' && rawHeaders.indexOf('nisn') === -1 && rawHeaders.indexOf('nis') !== -1) {
    const idxNis = rawHeaders.indexOf('nis') + 1;
    sheet.getRange(1, idxNis).setValue('nisn');
    rawHeaders[idxNis - 1] = 'nisn';
  }
  const missingCols = expectedHeaders.filter((h) => rawHeaders.indexOf(h) === -1);
  if (missingCols.length > 0) {
    const startCol = rawHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingCols.length).setValues([missingCols]);
    sheet.getRange(1, startCol, 1, missingCols.length)
      .setFontWeight('bold')
      .setBackground('#064e3b')
      .setFontColor('#ffffff');
  }
}

function ensureDatabaseReady_(ss, forceSeedCheck) {
  const props = PropertiesService.getScriptProperties();
  if (!forceSeedCheck && props.getProperty(SCHEMA_READY_PROP_KEY) === '1') {
    return;
  }

  let createdAny = false;

  Object.keys(SHEET_SCHEMAS).forEach((name) => {
    const expectedHeaders = SHEET_SCHEMAS[name];
    let sheet = ss.getSheetByName(name);

    if (!sheet) {
      sheet = ss.insertSheet(name);
      createdAny = true;
    }

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length)
        .setFontWeight('bold')
        .setBackground('#064e3b')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      createdAny = true;
    } else {
      ensureSheetColumns_(sheet, expectedHeaders, name);
    }
    if (name === 'Siswa' || expectedHeaders.indexOf('nisn') !== -1 || expectedHeaders.indexOf('noHp') !== -1) {
      formatNisnColumnsAsText_(sheet, expectedHeaders, 1, Math.max(sheet.getMaxRows(), 200));
    }
  });

  if (createdAny || forceSeedCheck) {
    seedInitialData_(ss);
    try {
      getOrCreateFolder_(DRIVE_TUGAS_FOLDER, ss);
      getOrCreateFolder_(DRIVE_MEDIA_FOLDER, ss);
      getOrCreateFolder_(DRIVE_ABSENSI_FOLDER, ss);
    } catch (driveErr) {
      // Abaikan bila DriveApp tidak diberi izin; upload gambar memakai Base64 < 50.000 char di Sheets
    }

    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() <= 1) {
      ss.deleteSheet(defaultSheet);
    }
  }
  props.setProperty(SCHEMA_READY_PROP_KEY, '1');
  if (forceSeedCheck) invalidatePublicCache_();
}

function seedInitialData_(ss) {
  const cfgSheet = ss.getSheetByName('Pengaturan');
  const defaults = [
    ['siteName', 'Bilik Tarbiyah Digital'],
    ['siteSubtitle', 'Portal Pembelajaran PAI & Budi Pekerti'],
    ['teacherName', 'Lia Indriati, S.Pd.I., Gr.'],
    ['teacherNip', ''],
    ['teacherTitle', 'Guru PAI & Budi Pekerti'],
    ['teacherBio', 'Pendidik PAI-BP yang berfokus pada pembelajaran mendalam (Deep Learning) dan Kurikulum Berbasis Cinta.'],
    ['teacherPhotoUrl', ''],
    ['namaInstansi', 'Pemerintah Provinsi Jambi'],
    ['schoolName', 'SMAN 20 Tebo'],
    ['schoolNpsn', ''],
    ['schoolAddress', 'Kabupaten Tebo, Provinsi Jambi'],
    ['schoolCity', 'Kabupaten Tebo, Jambi'],
    ['schoolEmail', 'paibp@sman20tebo.sch.id'],
    ['schoolPhone', '-'],
    ['schoolWebsite', ''],
    ['schoolMapsUrl', ''],
    ['schoolCoords', '-1.396500, 102.371200'],
    ['schoolHours', 'Senin–Sabtu, 07.15–14.30 WIB'],
    ['academicYear', 'TA 2026/2027'],
    ['siteLogoUrl', ''],
    ['instansiLogoUrl', ''],
    ['schoolLogoUrl', ''],
    ['themeBgUrl', ''],
    ['themeColor1', '#042f24'],
    ['themeColor2', '#064e3b'],
    ['themeColor3', '#0f766e'],
    ['btnGradPreset', 'zamrud-toska'],
    ['btnColor1', '#064e3b'],
    ['btnColor2', '#0d9488'],
    ['classes', JSON.stringify(['X M1', 'X M2', 'XI M1', 'XI M2', 'XII M1', 'XII M2'])],
    ['elemenList', JSON.stringify(["Al-Qur'an & Hadis", 'Akidah', 'Akhlak', 'Fikih', 'Sejarah Peradaban Islam'])],
    ['smartPaiUrl', 'https://smartpai.kemenag.go.id'],
    ['kemenagUrl', 'https://pendis.kemenag.go.id'],
    ['adminUsername', 'admin'],
    ['adminPassword', 'admin123']
  ];
  if (cfgSheet.getLastRow() <= 1) {
    cfgSheet.getRange(2, 1, defaults.length, 2).setNumberFormat('@');
    cfgSheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
  } else {
    const existingKeys = {};
    const curKeys = cfgSheet.getRange(2, 1, cfgSheet.getLastRow() - 1, 1).getValues();
    curKeys.forEach((r) => {
      const k = String(r[0] || '').trim();
      if (k) existingKeys[k] = true;
    });
    const missingDefaults = defaults.filter((pair) => !existingKeys[pair[0]]);
    if (missingDefaults.length > 0) {
      const startRow = cfgSheet.getLastRow() + 1;
      cfgSheet.getRange(startRow, 1, missingDefaults.length, 2).setNumberFormat('@');
      cfgSheet.getRange(startRow, 1, missingDefaults.length, 2).setValues(missingDefaults);
    }
  }

  const kelasSheet = ss.getSheetByName('Kelas');
  if (kelasSheet.getLastRow() <= 1) {
    const starterKelas = [
      { id: 'KLS-X-M1', namaKelas: 'X M1', jenjang: 'X', waliKelas: 'Lia Indriati, S.Pd.I., Gr.', keterangan: 'Kelas X Merdeka 1' },
      { id: 'KLS-X-M2', namaKelas: 'X M2', jenjang: 'X', waliKelas: '-', keterangan: 'Kelas X Merdeka 2' },
      { id: 'KLS-XI-M1', namaKelas: 'XI M1', jenjang: 'XI', waliKelas: '-', keterangan: 'Kelas XI Merdeka 1' },
      { id: 'KLS-XI-M2', namaKelas: 'XI M2', jenjang: 'XI', waliKelas: '-', keterangan: 'Kelas XI Merdeka 2' },
      { id: 'KLS-XII-M1', namaKelas: 'XII M1', jenjang: 'XII', waliKelas: '-', keterangan: 'Kelas XII Merdeka 1' },
      { id: 'KLS-XII-M2', namaKelas: 'XII M2', jenjang: 'XII', waliKelas: '-', keterangan: 'Kelas XII Merdeka 2' }
    ];
    starterKelas.forEach((k) => appendObjectRow_(kelasSheet, SHEET_SCHEMAS.Kelas, k));
  }

  const siswaSheet = ss.getSheetByName('Siswa');
  if (siswaSheet.getLastRow() <= 1) {
    const starterSiswa = [
      { id: '0091000101', nisn: '0091000101', nama: 'Ahmad Fauzan', kelas: 'X M1', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0091000102', nisn: '0091000102', nama: 'Siti Aisyah', kelas: 'X M1', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0091000103', nisn: '0091000103', nama: 'Rafa Aditya', kelas: 'X M1', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0091000201', nisn: '0091000201', nama: 'Nadia Putri', kelas: 'X M2', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0081100101', nisn: '0081100101', nama: 'Muhammad Rizky', kelas: 'XI M1', jenisKelamin: 'L', status: 'Aktif' }
    ];
    starterSiswa.forEach((s) => appendObjectRow_(siswaSheet, SHEET_SCHEMAS.Siswa, s));
  }

  const jadwalSheet = ss.getSheetByName('Jadwal');
  if (jadwalSheet.getLastRow() <= 1) {
    const starterJadwal = [
      {
        id: 'JDW-001',
        tanggal: '2026-08-18',
        semester: '1',
        jamKe: 'Jam 1–2 (07.15–08.45)',
        kelas: 'X M1',
        materiId: 'MAT-X-01',
        materiJudul: 'Bab 1: Kompetisi dalam Kebaikan dan Etos Kerja (QS. Al-Maidah: 48)',
        jenis: 'Luring',
        status: 'Terlaksana',
        catatan: 'Pembelajaran tatap muka bedah ayat dan praktik tajwid.'
      },
      {
        id: 'JDW-002',
        tanggal: '2026-11-20',
        semester: '1',
        jamKe: 'Jam 1–2 (07.15–08.45)',
        kelas: 'X M1',
        materiId: 'MAT-X-02',
        materiJudul: "Bab 2: Mewujudkan Ketauhidan dengan Syu'abul Iman",
        jenis: 'Daring',
        status: 'Sedang Berlangsung',
        catatan: 'Siswa kelas X M1 mengisi presensi daring di Portal Siswa.'
      }
    ];
    starterJadwal.forEach((j) => appendObjectRow_(jadwalSheet, SHEET_SCHEMAS.Jadwal, j));
  }

  const bannerSheet = ss.getSheetByName('BannerSlide');
  if (bannerSheet.getLastRow() <= 1) {
    const starterBanners = [
      {
        id: 'BNR-01',
        urutan: 1,
        badge: 'Selamat Datang',
        judul: 'Bilik Tarbiyah Digital — PAI & Budi Pekerti',
        deskripsi: 'Portal pembelajaran interaktif berbasis Deep Learning dan Kurikulum Berbasis Cinta.',
        imageUrl: '',
        ctaLabel: 'Buka Ruang Materi',
        ctaLink: '#materi',
        aktif: true
      }
    ];
    starterBanners.forEach((b) => appendObjectRow_(bannerSheet, SHEET_SCHEMAS.BannerSlide, b));
  }

  const matSheet = ss.getSheetByName('Materi');
  if (matSheet.getLastRow() <= 1) {
    const starterMateri = [
      {
        id: 'MAT-X-01',
        jenjang: 'X',
        semester: '1',
        bab: 1,
        judul: 'Meraih Kesuksesan dengan Kompetisi dalam Kebaikan dan Etos Kerja',
        elemen: "Al-Qur'an & Hadis",
        ringkasan: 'Menganalisis QS. Al-Maidah/5: 48 dan QS. At-Taubah/9: 105 tentang berlomba dalam kebaikan (fastabiqul khairat) serta etos kerja Islami.',
        apersepsi: 'Waktu terus berjalan — bandingkan kebiasaan prokrastinasi digital dengan etos kerja produktif yang bernilai ibadah.',
        pemantik: '1. Mengapa banyak pelajar mengetahui pentingnya disiplin waktu, tetapi tetap terjebak prokrastinasi?\n2. Aksi kebaikan apa yang bisa kamu mulai minggu ini?',
        dnaPoin: JSON.stringify(['Niat Lurus Karena Allah', 'Disiplin Waktu & Anti-Prokrastinasi', 'Pantang Menyerah', 'Bertanggung Jawab & Amanah']),
        coverImage: '',
        infografisUrl: '',
        galeriGambar: JSON.stringify([]),
        youtubeId: '4IKWLB3pi9s',
        youtubeIdTambahan: 'CU3RyTRJcvU',
        slideUrl: '',
        pdfUrl: 'https://drive.google.com/file/d/1lfg2CrksiKgezplXwIAqghrqAdNVly6c/preview',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: 'https://drive.google.com/file/d/1XZyrDERANb5lDWOsc3z3LoLXbxktf4If/preview',
        studiKasus: 'Budi bekerja keras merapikan logistik proyek sekolah tanpa disorot kamera, sedangkan Andi hanya aktif berfoto demi unggahan media sosial. Analisislah sikap keduanya menurut QS. At-Taubah: 105!',
        nilaiKbc: 'Keikhlasan beramal, kasih sayang sosial, dan tanggung jawab amanah.',
        aktif: true
      }
    ];
    starterMateri.forEach((m) => appendObjectRow_(matSheet, SHEET_SCHEMAS.Materi, m));
  }

  const tjSheet = ss.getSheetByName('Tajwid');
  if (tjSheet.getLastRow() <= 1) {
    const starterTajwid = [
      { id: 'TJW-01', materiId: 'MAT-X-01', lafalArab: 'لِكُلٍّ جَعَلْنَا', transliterasi: "Likullin ja'alnaa", sumberAyat: 'QS. Al-Maidah: 48', hukum: 'Ikhfa Haqiqi', alasan: 'Kasrah tanwin bertemu huruf jim (ج).', caraBaca: 'Dibaca samar berdengung 2 harakat.' },
      { id: 'TJW-02', materiId: 'MAT-X-01', lafalArab: 'فَاسْتَبِقُوا الْخَيْرَاتِ', transliterasi: 'Fastabiqul khairaat', sumberAyat: 'QS. Al-Maidah: 48', hukum: 'Alif Lam Qamariyah & Mad Arid Lissukun', alasan: 'Alif lam bertemu kha dan mad sebelum waqaf.', caraBaca: 'Lam dibaca jelas; akhir ayat dipanjangkan 2/4/6 harakat.' }
    ];
    starterTajwid.forEach((t) => appendObjectRow_(tjSheet, SHEET_SCHEMAS.Tajwid, t));
  }

  const soalSheet = ss.getSheetByName('BankSoal');
  if (soalSheet.getLastRow() <= 1) {
    const starterSoal = [
      {
        id: 'SOAL-01',
        kelas: 'X M1',
        jenjang: 'X',
        semester: '1',
        bab: 1,
        materiId: 'MAT-X-01',
        materiJudul: 'Bab 1: Meraih Kesuksesan dengan Kompetisi dalam Kebaikan dan Etos Kerja',
        pertanyaan: 'Sikap pelajar SMA yang paling mencerminkan fastabiqul khairat (QS. Al-Maidah: 48) adalah...',
        gambarUrl: '',
        opsi: JSON.stringify([
          'Menunda tugas kelompok hingga tenggat akhir',
          'Aktif berprestasi, membantu teman belajar, dan disiplin menyelesaikan amanah',
          'Menyalahkan teman saat proyek gagal',
          'Hanya bekerja jika ada nilai tambahan',
          'Menyembunyikan sumber belajar agar menang sendiri'
        ]),
        kunci: 1,
        pembahasan: 'Fastabiqul khairat bermakna berlomba dalam kebaikan secara sehat dan kolaboratif.',
        level: 'HOTS (C4)'
      }
    ];
    starterSoal.forEach((s) => appendObjectRow_(soalSheet, SHEET_SCHEMAS.BankSoal, s));
  }

  const abCfgSheet = ss.getSheetByName('AyoBelajarConfig');
  if (abCfgSheet && abCfgSheet.getLastRow() <= 1) {
    const nowIso = new Date().toISOString();
    const starterBelajar = [
      { id: 'thaharah-wudhu', kategoriId: 'thaharah', judul: 'Praktikum Wudhu Lengkap', youtubeId: '' },
      { id: 'thaharah-tayamum', kategoriId: 'thaharah', judul: 'Praktikum Tayamum', youtubeId: '' },
      { id: 'thaharah-mandi', kategoriId: 'thaharah', judul: 'Praktikum Mandi Wajib (Janabah/Haid)', youtubeId: '' },
      { id: 'shalat-fardhu', kategoriId: 'shalat', judul: 'Shalat Fardhu 5 Waktu', youtubeId: '' },
      { id: 'shalat-jumat', kategoriId: 'shalat', judul: 'Shalat Jumat & Dua Khutbah', youtubeId: '' },
      { id: 'shalat-dhuha', kategoriId: 'shalat', judul: 'Shalat Dhuha', youtubeId: '' },
      { id: 'shalat-tahajud', kategoriId: 'shalat', judul: 'Shalat Tahajud & Witir', youtubeId: '' },
      { id: 'shalat-tarawih', kategoriId: 'shalat', judul: 'Shalat Tarawih & Witir', youtubeId: '' },
      { id: 'shalat-hajat-istikharah', kategoriId: 'shalat', judul: 'Shalat Hajat & Istikharah', youtubeId: '' },
      { id: 'shalat-id-gerhana', kategoriId: 'shalat', judul: 'Shalat Idul Fitri/Adha & Gerhana', youtubeId: '' },
      { id: 'shalat-jama-qashar', kategoriId: 'shalat', judul: "Shalat Jama' & Qashar", youtubeId: '' },
      { id: 'jenazah-mandi', kategoriId: 'jenazah', judul: '1. Memandikan Jenazah', youtubeId: 'EUy787UM6Sr' },
      { id: 'jenazah-kafan', kategoriId: 'jenazah', judul: '2. Mengkafani Jenazah', youtubeId: 'EUy787UM6Sr' },
      { id: 'jenazah-shalat', kategoriId: 'jenazah', judul: '3. Menyalatkan Jenazah', youtubeId: 'QH6QfzK6aYM' },
      { id: 'jenazah-kubur', kategoriId: 'jenazah', judul: '4. Menguburkan Jenazah', youtubeId: 'QH6QfzK6aYM' },
      { id: 'zakat-fitrah', kategoriId: 'zakat', judul: '1. Praktikum Zakat Fitrah', youtubeId: 'FhvxhoAAYiX' },
      { id: 'zakat-maal', kategoriId: 'zakat', judul: '2. Zakat Maal (Emas, Tabungan & Pertanian)', youtubeId: 'GqRjM-3eZF_4' },
      { id: 'zakat-profesi', kategoriId: 'zakat', judul: '3. Zakat Profesi & 8 Golongan Asnaf', youtubeId: 'GqRjM-3eZF_4' },
      { id: 'zakat-simulasi', kategoriId: 'zakat', judul: '4. Simulasi & Hitungan Zakat Interaktif', youtubeId: 'FhvxhoAAYiX' },
      { id: 'haji-syarat-rukun', kategoriId: 'haji', judul: '1. Rukun, Wajib, & Jenis Pelaksanaan Haji', youtubeId: 'dYKstMQiKW0' },
      { id: 'haji-ihram-miqat', kategoriId: 'haji', judul: '2. Praktikum Ihram, Miqat & Talbiyah', youtubeId: 'NGnqYq16t6c' },
      { id: 'haji-thawaf-sai', kategoriId: 'haji', judul: "3. Praktikum Thawaf, Sa'i & Tahallul", youtubeId: 'Q8s-Xw83MKA' },
      { id: 'haji-wukuf-jumrah', kategoriId: 'haji', judul: '4. Wukuf Arafah, Mabit & Lempar Jumrah', youtubeId: 'yXaoKUYeKjo' },
      { id: 'tajwid-makhraj', kategoriId: 'tajwid', judul: '1. Makharijul Huruf (5 Tempat Keluar Huruf)', youtubeId: 'QFYwyvI7fdH' },
      { id: 'tajwid-nun', kategoriId: 'tajwid', judul: '2. Hukum Nun Sukun & Tanwin', youtubeId: 'HaOkAPB7xHH' },
      { id: 'tajwid-mim', kategoriId: 'tajwid', judul: '3. Hukum Mim Sukun & Ghunnah', youtubeId: 'HaOkAPB7xHH' },
      { id: 'tajwid-mad-qalqalah', kategoriId: 'tajwid', judul: '4. Hukum Mad (Panjang) & Qalqalah', youtubeId: 'QFYwyvI7fdH' },
      { id: 'tajwid-lam-waqaf', kategoriId: 'tajwid', judul: "5. Lam Ta'rif (Al-) & Tanda-Tanda Waqaf", youtubeId: 'g0v2K_X9SyA' }
    ];
    const abRows = starterBelajar.map((item) => [
      item.id,
      item.kategoriId,
      item.judul,
      item.youtubeId,
      '',
      '',
      'true',
      nowIso
    ]);
    abCfgSheet.getRange(2, 1, abRows.length, SHEET_SCHEMAS.AyoBelajarConfig.length).setNumberFormat('@');
    abCfgSheet.getRange(2, 1, abRows.length, SHEET_SCHEMAS.AyoBelajarConfig.length).setValues(abRows);
  }

  const rwtSheet = ss.getSheetByName('ProfilGuruRiwayat');
  if (rwtSheet && rwtSheet.getLastRow() <= 1) {
    const starterRiwayat = [
      {
        id: 'RWT-01',
        kategori: 'Mengajar',
        periode: '2021 – Sekarang',
        judul: 'Guru Mata Pelajaran PAI & Budi Pekerti',
        instansi: 'SMAN 20 Tebo, Provinsi Jambi',
        keterangan: 'Mengampu pembelajaran PAI-BP Kelas X, XI, XII serta pembinaan karakter peserta didik.',
        urutan: 1
      },
      {
        id: 'RWT-02',
        kategori: 'Pendidikan',
        periode: 'Lulus S1 & PPG',
        judul: 'S1 Pendidikan Agama Islam (PAI) & PPG Dalam Jabatan (Gr.)',
        instansi: 'UIN / LPTK Kementerian Agama RI',
        keterangan: 'Kualifikasi akademik S1 Pendidikan Agama Islam bersertifikat pendidik profesional.',
        urutan: 2
      },
      {
        id: 'RWT-03',
        kategori: 'Penghargaan',
        periode: '2025',
        judul: 'Inovator Pembelajaran Digital PAI-BP Terintegrasi',
        instansi: 'Lingkup Sekolah & MGMP PAI',
        keterangan: 'Pengembangan media pembelajaran interaktif berbasis Deep Learning & Kurikulum Berbasis Cinta.',
        urutan: 3
      },
      {
        id: 'RWT-04',
        kategori: 'Diklat',
        periode: '2024',
        judul: 'Diklat Implementasi Kurikulum Merdeka & Asesmen HOTS PAI',
        instansi: 'Balai Diklat Keagamaan / Ditjen Pendis Kemenag RI',
        keterangan: 'Peningkatan kompetensi pedagogik, pemanfaatan AI edukatif, dan literasi digital PAI.',
        urutan: 4
      }
    ];
    starterRiwayat.forEach((r) => appendObjectRow_(rwtSheet, SHEET_SCHEMAS.ProfilGuruRiwayat, r));
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureDatabaseReady_(ss, false);

    const action = (e && e.parameter && e.parameter.action) || 'ping';
    if (action === 'ping') {
      return jsonOut_({
        ok: true,
        data: { status: 'Bilik Tarbiyah Digital Apps Script Active (Auto-Database Ready)' }
      });
    }
    if (action === 'getBootstrapData') {
      return jsonOutText_(getCachedPublicBootstrapJson_(ss));
    }
    if (action === 'getLatestJadwal') {
      const jadwalRows = readSheetObjects_(ss.getSheetByName('Jadwal')).reverse();
      return jsonOut_({
        ok: true,
        data: {
          jadwal: jadwalRows,
          fetchedAt: new Date().toISOString()
        }
      });
    }
    return jsonOut_({ ok: false, error: 'Aksi GET tidak dikenali: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(15000);
    hasLock = true;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureDatabaseReady_(ss, false);

    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const payload = body.payload || {};
    if (action && action !== 'verifyAdmin' && action !== 'verifyStudent' && action !== 'getAdminDashboard' && action !== 'getStudentPortalData') {
      invalidatePublicCache_();
    }

    if (action === 'logoutSession') {
      revokeSessionToken_(body.token || payload.token);
      revokeSessionToken_(body.studentToken || payload.studentToken);
      return jsonOut_({ ok: true, data: { loggedOut: true } });
    }

    // Authenticated Student Submissions (Wajib Sesi Siswa Terverifikasi atau Admin)
    if (action === 'submitEvaluasi') {
      const verifiedStu = verifySubmissionStudent_(ss, body, payload);
      if (!verifiedStu.ok) return jsonOut_({ ok: false, error: verifiedStu.error });
      const totalSoal = Math.max(0, Math.round(Number(payload.totalSoal || 0)));
      const rawBenar = Math.max(0, Math.round(Number(payload.benar || 0)));
      const benar = totalSoal > 0 ? Math.min(totalSoal, rawBenar) : rawBenar;
      const skor = Math.min(100, Math.max(0, Math.round(Number(payload.skor || 0))));
      const rec = withTimestampId_({
        nisn: verifiedStu.nisn,
        nama: verifiedStu.nama,
        kelas: verifiedStu.kelas,
        jenjang: sanitizeSheetText_(payload.jenjang, 16),
        bab: sanitizeSheetText_(payload.bab, 40),
        skor: Number.isFinite(skor) ? skor : 0,
        benar: Number.isFinite(benar) ? benar : 0,
        totalSoal: Number.isFinite(totalSoal) ? totalSoal : 0,
        waktuDetik: Math.max(0, Math.round(Number(payload.waktuDetik || 0))),
        catatanGuru: ''
      }, 'EVL');
      appendObjectRow_(ss.getSheetByName('Evaluasi'), SHEET_SCHEMAS.Evaluasi, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitRuangKritis') {
      const verifiedStu = verifySubmissionStudent_(ss, body, payload);
      if (!verifiedStu.ok) return jsonOut_({ ok: false, error: verifiedStu.error });
      const rec = withTimestampId_({
        nisn: verifiedStu.nisn,
        nama: verifiedStu.nama,
        kelas: verifiedStu.kelas,
        materiId: sanitizeSheetText_(payload.materiId, 40),
        nilaiKbc: sanitizeSheetText_(payload.nilaiKbc, 120),
        analisis: sanitizeMultiLineSheetText_(payload.analisis, 2500),
        dikurasi: false,
        nilai: '',
        catatanGuru: ''
      }, 'KRIT');
      appendObjectRow_(ss.getSheetByName('RuangKritis'), SHEET_SCHEMAS.RuangKritis, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitAmaliyah') {
      const verifiedStu = verifySubmissionStudent_(ss, body, payload);
      if (!verifiedStu.ok) return jsonOut_({ ok: false, error: verifiedStu.error });
      const rec = withTimestampId_({
        nisn: verifiedStu.nisn,
        nama: verifiedStu.nama,
        kelas: verifiedStu.kelas,
        bab: sanitizeSheetText_(payload.bab, 40),
        lulusSensorGadget: Boolean(payload.lulusSensorGadget),
        zeroProkrastinasi: Boolean(payload.zeroProkrastinasi),
        petarungFokus: Boolean(payload.petarungFokus),
        pencapaianTerbaik: sanitizeMultiLineSheetText_(payload.pencapaianTerbaik, 1000),
        refleksiKbc: sanitizeMultiLineSheetText_(payload.refleksiKbc, 1000),
        nilai: '',
        catatanGuru: ''
      }, 'AML');
      appendObjectRow_(ss.getSheetByName('Amaliyah'), SHEET_SCHEMAS.Amaliyah, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitDiskusi') {
      const verifiedStu = verifySubmissionStudent_(ss, body, payload);
      if (!verifiedStu.ok) return jsonOut_({ ok: false, error: verifiedStu.error });
      const rec = withTimestampId_({
        materiId: sanitizeSheetText_(payload.materiId, 40),
        nisn: verifiedStu.nisn,
        nama: verifiedStu.nama,
        kelas: verifiedStu.kelas,
        pesan: sanitizeMultiLineSheetText_(payload.pesan, 1500)
      }, 'DSK');
      appendObjectRow_(ss.getSheetByName('Diskusi'), SHEET_SCHEMAS.Diskusi, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitTugas') {
      const verifiedStu = verifySubmissionStudent_(ss, body, payload);
      if (!verifiedStu.ok) return jsonOut_({ ok: false, error: verifiedStu.error });
      let safeFileUrl = isSafeHttpUrlOrEmpty_(payload.fileUrl) ? String(payload.fileUrl || '').trim() : '';
      if (payload.fileBase64 && payload.fileName) {
        const up = validateDriveUpload_(payload.fileBase64, payload.fileMime, payload.fileName, { allowDocs: true, maxBytes: 10 * 1024 * 1024 });
        if (!up.ok) return jsonOut_({ ok: false, error: up.error });
        safeFileUrl = saveBase64ToDrive_(ss, DRIVE_TUGAS_FOLDER, payload.fileBase64, up.mimeType, up.fileName, false);
      }
      if (!safeFileUrl && payload.fileUrl) {
        return jsonOut_({ ok: false, error: 'Tautan file tugas wajib memakai URL https:// atau http:// yang valid.' });
      }
      const rec = withTimestampId_({
        nisn: verifiedStu.nisn,
        nama: verifiedStu.nama,
        kelas: verifiedStu.kelas,
        materiId: sanitizeSheetText_(payload.materiId, 40),
        bab: sanitizeSheetText_(payload.bab, 120),
        jenisTugas: sanitizeSheetText_(payload.jenisTugas, 120),
        fileUrl: safeFileUrl,
        catatan: sanitizeMultiLineSheetText_(payload.catatan, 800),
        nilai: '',
        catatanGuru: ''
      }, 'TGS');
      appendObjectRow_(ss.getSheetByName('Tugas'), SHEET_SCHEMAS.Tugas, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitBelajarKomentar') {
      const komSheet = ss.getSheetByName('AyoBelajarKomentar');
      const cfgSheet = ss.getSheetByName('AyoBelajarConfig');
      ensureSheetColumns_(komSheet, SHEET_SCHEMAS.AyoBelajarKomentar, 'AyoBelajarKomentar');
      ensureSheetColumns_(cfgSheet, SHEET_SCHEMAS.AyoBelajarConfig, 'AyoBelajarConfig');

      const topicId = String(payload.topicId || '').trim();
      const nama = sanitizeSheetText_(payload.nama, 80);
      const instansi = sanitizeSheetText_(payload.instansi, 100);
      const pekerjaan = sanitizeSheetText_(payload.pekerjaan, 60);
      const email = String(payload.email || '').trim().slice(0, 100);
      const noHpRaw = String(payload.noHp || '').replace(/[^\d+]/g, '').slice(0, 20);
      const komentar = sanitizeSheetText_(payload.komentar, 650);

      if (!topicId || nama.length < 2 || instansi.length < 2 || pekerjaan.length < 2 || !komentar || komentar.length < 4) {
        return jsonOut_({ ok: false, error: 'Semua kolom wajib diisi lengkap (Nama, Instansi/Sekolah, Pekerjaan, Email, No. HP, dan Komentar).' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return jsonOut_({ ok: false, error: 'Format alamat Email tidak valid.' });
      }
      if (noHpRaw.replace(/\D/g, '').length < 8) {
        return jsonOut_({ ok: false, error: 'Nomor HP/WhatsApp wajib minimal 8 digit angka.' });
      }

      const cfgRow = readSheetObjects_(cfgSheet).find((c) => String(c.id) === topicId);
      if (cfgRow && (cfgRow.komentarAktif === false || String(cfgRow.komentarAktif).toLowerCase() === 'false')) {
        return jsonOut_({ ok: false, error: 'Kolom komentar untuk praktikum ini sedang dinonaktifkan oleh Guru.' });
      }

      const checkFields = [nama, instansi, pekerjaan, komentar].join(' ');
      if (containsProfanityOrSpam_(checkFields)) {
        return jsonOut_({
          ok: false,
          error: 'Komentar diblokir karena mengandung kata kasar/tidak pantas atau tautan terlarang. Gunakan bahasa yang santun dan sesuai konteks PAI.'
        });
      }

      const rec = withTimestampId_({
        topicId: topicId,
        topicTitle: sanitizeSheetText_(payload.topicTitle || (cfgRow && cfgRow.judul) || topicId, 120),
        kategoriTitle: sanitizeSheetText_(payload.kategoriTitle || '', 80),
        nama: nama,
        instansi: instansi,
        pekerjaan: pekerjaan,
        email: email,
        noHp: noHpRaw,
        komentar: komentar
      }, 'KMNT');
      const nextRow = komSheet.getLastRow() + 1;
      formatNisnColumnsAsText_(komSheet, SHEET_SCHEMAS.AyoBelajarKomentar, nextRow, 1);
      appendObjectRow_(komSheet, SHEET_SCHEMAS.AyoBelajarKomentar, rec);
      invalidatePublicCache_();
      const publicRec = Object.assign({}, rec);
      delete publicRec.email;
      delete publicRec.noHp;
      return jsonOut_({ ok: true, data: publicRec });
    }

    /* ---- Portal Siswa Auth (Username = NISN, Password = Kustom / Standar NISN) ---- */
    if (action === 'verifyStudent') {
      const nisn = String(payload.nisn || '').replace(/^'+/, '').trim();
      const pass = String(payload.password || '').trim();
      const rlKey = 'stu:' + (nisn || 'empty');
      if (isRateLimited_(rlKey)) {
        return jsonOut_({ ok: false, error: 'Terlalu banyak percobaan login gagal. Silakan tunggu 15 menit sebelum mencoba lagi.' });
      }
      const student = findActiveStudentByNisn_(ss, nisn);
      const valid = checkStudentCredential_(student, pass);
      if (!valid) {
        recordAuthFailure_(rlKey);
      } else {
        clearAuthFailures_(rlKey);
      }
      const sessionToken = valid ? issueSessionToken_('student', { nisn: nisn }) : '';
      const bundle = valid ? buildStudentPortalBundle_(ss, student, nisn) : {
        myAbsensi: [],
        myRuangKritis: [],
        myEvaluasi: [],
        myAmaliyah: [],
        myTugas: [],
        myDiskusi: [],
        jadwal: []
      };
      return jsonOut_({
        ok: true,
        data: Object.assign({
          valid: valid,
          sessionToken: sessionToken,
          student: valid ? sanitizeStudentForClient_(student, true) : null
        }, bundle)
      });
    }

    if (action === 'getStudentPortalData') {
      const authStu = checkStudentAuthOrToken_(ss, body, payload);
      if (!authStu.ok) {
        return jsonOut_({ ok: false, error: 'Sesi siswa tidak valid. Silakan login kembali.' });
      }
      const bundle = buildStudentPortalBundle_(ss, authStu.student, authStu.nisn);
      return jsonOut_({
        ok: true,
        data: Object.assign({
          student: sanitizeStudentForClient_(authStu.student, true),
          fetchedAt: new Date().toISOString()
        }, bundle)
      });
    }

    if (action === 'submitStudentAbsensi') {
      const authStu = checkStudentAuthOrToken_(ss, body, payload);
      if (!authStu.ok) {
        return jsonOut_({ ok: false, error: 'Autentikasi siswa tidak valid.' });
      }
      const nisn = authStu.nisn;
      const student = authStu.student;
      const jadwalId = String(payload.jadwalId || '').trim();

      const jdw = readSheetObjects_(ss.getSheetByName('Jadwal')).find((j) => String(j.id) === jadwalId);
      if (!jdw) {
        return jsonOut_({ ok: false, error: 'Jadwal pembelajaran tidak ditemukan.' });
      }
      if (String(jdw.kelas) !== String(student.kelas)) {
        return jsonOut_({ ok: false, error: 'Jadwal ini bukan untuk kelas Anda.' });
      }
      if (String(jdw.jenis) !== 'Daring') {
        return jsonOut_({ ok: false, error: 'Presensi mandiri hanya tersedia untuk pembelajaran Daring.' });
      }
      if (String(jdw.status) !== 'Sedang Berlangsung') {
        return jsonOut_({ ok: false, error: 'Presensi ditutup karena pembelajaran sudah Terlaksana atau belum berlangsung.' });
      }

      const absSheet = ss.getSheetByName('Absensi');
      ensureSheetColumns_(absSheet, SHEET_SCHEMAS.Absensi, 'Absensi');
      const absValues = absSheet.getDataRange().getValues();
      const absHeaders = absValues[0].map(String);
      const jIdCol = absHeaders.indexOf('jadwalId');
      const nisnCol = absHeaders.indexOf('nisn');
      const statusCol = absHeaders.indexOf('status');
      let existingRowNum = -1;
      for (let r = 1; r < absValues.length; r++) {
        const rJId = jIdCol !== -1 ? String(absValues[r][jIdCol]).trim() : '';
        const rNisn = nisnCol !== -1 ? String(absValues[r][nisnCol]).replace(/^'+/, '').trim() : '';
        if (rJId === jadwalId && rNisn === nisn) {
          const rStatus = statusCol !== -1 ? String(absValues[r][statusCol] || '').trim().toLowerCase() : '';
          if (rStatus && rStatus !== 'belum absen') {
            return jsonOut_({ ok: false, error: 'Anda sudah mengisi presensi untuk jadwal ini.' });
          }
          existingRowNum = r + 1;
          break;
        }
      }

      const recId = String(payload.recordId || '').trim() || ('ABS-' + new Date().getTime());
      let fotoUrl = isSafeHttpUrlOrEmpty_(payload.fotoUrl) ? String(payload.fotoUrl || '').trim() : '';
      if (payload.fotoBase64) {
        const safeFileName = String(payload.fotoName || formatAbsensiSelfieFileName_(jdw.tanggal, student.kelas, nisn, recId));
        const upSelfie = validateDriveUpload_(payload.fotoBase64, payload.fotoMime || 'image/jpeg', safeFileName, { imagesOnly: true, maxBytes: 5 * 1024 * 1024 });
        if (!upSelfie.ok) return jsonOut_({ ok: false, error: upSelfie.error });
        try {
          fotoUrl = saveBase64ToDrive_(
            ss,
            DRIVE_ABSENSI_FOLDER,
            payload.fotoBase64,
            upSelfie.mimeType,
            upSelfie.fileName,
            true
          );
        } catch (driveErr) {
          const rawMsg = String((driveErr && driveErr.message) || driveErr || '');
          const isPerm = /izin|permission|access denied|akses ditolak|unauthorized|authorization/i.test(rawMsg);
          if (isPerm) {
            return jsonOut_({
              ok: false,
              error: 'Akses ditolak DriveApp (' + rawMsg + '). Solusi untuk Guru: (1) Buka Editor Apps Script -> pilih fungsi "otorisasiDriveAbsensi" -> klik Jalankan (Run) & klik Izinkan/Allow akses Google Drive; (2) Di Deploy -> Kelola Deployment -> Edit -> pastikan "Jalankan sebagai: Saya (pemilik)" & "Yang memiliki akses: Siapa saja" lalu pilih Versi Baru.'
            });
          }
          throw driveErr;
        }
      }

      const rec = {
        id: recId,
        timestamp: new Date().toISOString(),
        jadwalId: jdw.id,
        tanggal: jdw.tanggal,
        jadwal: jdw.jamKe,
        materi: jdw.materiJudul,
        kelas: student.kelas,
        nisn: nisn,
        nama: student.nama,
        status: String(payload.status || 'Hadir'),
        catatan: String(payload.catatan || 'Presensi daring selfie oleh siswa'),
        fotoUrl: fotoUrl
      };
      const rowValues = absHeaders.map((h) => (rec[h] !== undefined && rec[h] !== null ? rec[h] : ''));
      const targetRowNum = existingRowNum > 0 ? existingRowNum : absSheet.getLastRow() + 1;
      formatNisnColumnsAsText_(absSheet, absHeaders, targetRowNum, 1);
      absSheet.getRange(targetRowNum, 1, 1, absHeaders.length).setValues([rowValues]);
      return jsonOut_({ ok: true, data: { record: rec } });
    }

    if (action === 'changeStudentPassword') {
      const authStu = checkStudentAuthOrToken_(ss, body, payload);
      if (!authStu.ok) {
        return jsonOut_({ ok: false, error: 'Sesi akun siswa tidak valid. Silakan login ulang.' });
      }
      const nisn = authStu.nisn;
      const student = authStu.student;
      const newPass = String(payload.newPassword || '').trim();
      const confirmPass = String(payload.confirmPassword || '').trim();
      const siswaSheet = ss.getSheetByName('Siswa');
      ensureSheetColumns_(siswaSheet, SHEET_SCHEMAS.Siswa, 'Siswa');
      if (!newPass || newPass.length < 4 || newPass.length > 64) {
        return jsonOut_({ ok: false, error: 'Password baru harus terdiri dari 4–64 karakter.' });
      }
      if (newPass !== confirmPass) {
        return jsonOut_({ ok: false, error: 'Konfirmasi ulangi password baru tidak cocok.' });
      }
      const storedPass = newPass === nisn ? '' : newPass;
      upsertSiswaByNisnOrId_(siswaSheet, Object.assign({}, student, {
        id: nisn,
        nisn: nisn,
        password: storedPass
      }));
      return jsonOut_({
        ok: true,
        data: {
          changed: true,
          nisn: nisn,
          hasCustomPassword: Boolean(storedPass)
        }
      });
    }

    // Admin Username + Password / Session Token Auth
    const cfg = getSettingsMap_(ss);
    const expectedUser = String(cfg.adminUsername || 'admin').trim();
    const expectedPass = String(cfg.adminPassword || 'admin123').trim();
    const reqUser = String(body.username || payload.username || '').trim();
    const reqPass = String(body.password || payload.password || '').trim();

    if (action === 'verifyAdmin') {
      const admRlKey = 'adm:' + (reqUser || 'admin');
      if (isRateLimited_(admRlKey)) {
        return jsonOut_({ ok: false, error: 'Terlalu banyak percobaan login Admin gagal. Silakan tunggu 15 menit sebelum mencoba lagi.' });
      }
      const valid = safeEqualStr_(reqUser, expectedUser) && safeEqualStr_(reqPass, expectedPass);
      if (!valid) {
        recordAuthFailure_(admRlKey);
      } else {
        clearAuthFailures_(admRlKey);
      }
      const sessionToken = valid ? issueSessionToken_('admin', { username: expectedUser }) : '';
      return jsonOut_({
        ok: true,
        data: {
          valid: valid,
          sessionToken: sessionToken,
          dashboard: valid ? buildFullAdminData_(ss) : null
        }
      });
    }

    const tokenAdmin = resolveSessionToken_(body.token || payload.token, 'admin');
    const isAdminValid =
      Boolean(tokenAdmin && safeEqualStr_(tokenAdmin.username, expectedUser)) ||
      (safeEqualStr_(reqUser, expectedUser) && safeEqualStr_(reqPass, expectedPass));
    if (!isAdminValid) {
      return jsonOut_({ ok: false, error: 'Akses ditolak: Sesi atau kredensial Guru tidak valid. Silakan login ulang.' });
    }

    if (action === 'setupDatabase') {
      return jsonOut_({ ok: true, data: setupDatabase() });
    }

    if (action === 'getAdminDashboard') {
      return jsonOut_({ ok: true, data: buildFullAdminData_(ss) });
    }

    if (action === 'uploadMedia') {
      if (!payload.fileBase64 || !payload.fileName) {
        return jsonOut_({ ok: false, error: 'File media tidak ditemukan.' });
      }
      const isAudioUpload = /^audio\//i.test(String(payload.fileMime || '')) || /\.(mp3|wav|m4a|ogg|webm)$/i.test(String(payload.fileName || ''));
      const upMed = validateDriveUpload_(payload.fileBase64, payload.fileMime, payload.fileName, {
        allowDocs: !isAudioUpload,
        allowAudio: isAudioUpload,
        maxBytes: 10 * 1024 * 1024
      });
      if (!upMed.ok) return jsonOut_({ ok: false, error: upMed.error });
      const mediaUrl = saveBase64ToDrive_(
        ss,
        DRIVE_MEDIA_FOLDER,
        payload.fileBase64,
        upMed.mimeType,
        upMed.fileName,
        isAudioUpload ? 'audio' : true
      );
      return jsonOut_({ ok: true, data: { url: mediaUrl } });
    }

    /* ---- Admin: Kelas, Siswa (Wajib NISN), Jadwal, Daftar Hadir ---- */
    if (action === 'saveKelas') {
      upsertObjectRow_(ss.getSheetByName('Kelas'), SHEET_SCHEMAS.Kelas, payload, 'id');
      syncClassesIntoSettings_(ss);
      return jsonOut_({ ok: true, data: payload });
    }

    if (action === 'deleteKelas') {
      deleteById_(ss.getSheetByName('Kelas'), payload.id);
      syncClassesIntoSettings_(ss);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveSiswa') {
      const nisn = String(payload.nisn || payload.nis || payload.id || '').replace(/^'+/, '').trim();
      if (!/^\d{10}$/.test(nisn)) {
        return jsonOut_({ ok: false, error: 'NISN wajib tepat 10 digit angka (0–9).' });
      }
      const siswaSheet = ss.getSheetByName('Siswa');
      ensureSheetColumns_(siswaSheet, SHEET_SCHEMAS.Siswa, 'Siswa');
      const prevId = String(payload.prevId || '').replace(/^'+/, '').trim();
      const existingAll = readSheetObjects_(siswaSheet);
      const dup = existingAll.find((s) => {
        const sNisn = String(s.nisn || s.id || '').replace(/^'+/, '').trim();
        const sId = String(s.id || '').replace(/^'+/, '').trim();
        if (prevId && (sId === prevId || sNisn === prevId)) return false;
        return sNisn === nisn;
      });
      if (dup) {
        return jsonOut_({ ok: false, error: 'NISN ' + nisn + ' sudah digunakan oleh siswa ' + dup.nama + ' (' + dup.kelas + ').' });
      }
      const item = Object.assign({}, payload, { id: nisn, nisn: nisn });
      upsertSiswaByNisnOrId_(siswaSheet, item);
      return jsonOut_({ ok: true, data: sanitizeStudentForClient_(item, true) });
    }

    if (action === 'resetStudentPassword') {
      const targetKey = String(payload.id || payload.nisn || '').replace(/^'+/, '').trim();
      if (!targetKey) {
        return jsonOut_({ ok: false, error: 'NISN siswa yang akan direset tidak valid.' });
      }
      const siswaSheet = ss.getSheetByName('Siswa');
      ensureSheetColumns_(siswaSheet, SHEET_SCHEMAS.Siswa, 'Siswa');
      const student = readSheetObjects_(siswaSheet).find(
        (s) => String(s.nisn || '').replace(/^'+/, '').trim() === targetKey || String(s.id || '').replace(/^'+/, '').trim() === targetKey
      );
      if (!student) {
        return jsonOut_({ ok: false, error: 'Data siswa dengan NISN tersebut tidak ditemukan.' });
      }
      const cleanNisn = String(student.nisn || student.id || targetKey).replace(/^'+/, '').trim();
      upsertSiswaByNisnOrId_(siswaSheet, Object.assign({}, student, {
        id: cleanNisn,
        nisn: cleanNisn,
        password: ''
      }));
      return jsonOut_({
        ok: true,
        data: { reset: true, nisn: cleanNisn, hasCustomPassword: false }
      });
    }

    if (action === 'deleteSiswa') {
      deleteById_(ss.getSheetByName('Siswa'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'importSiswaBatch') {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const siswaSheet = ss.getSheetByName('Siswa');
      const existingAll = readSheetObjects_(siswaSheet);
      const seen = {};
      let importedCount = 0;
      let skippedCount = 0;
      rows.forEach((r) => {
        const nisn = String(r.nisn || r.nis || r.id || '').replace(/^'+/, '').trim();
        const nama = String(r.nama || '').trim();
        const kelas = String(r.kelas || '').trim();
        if (!/^\d{10}$/.test(nisn) || !nama || !kelas || seen[nisn]) {
          skippedCount++;
          return;
        }
        const dupOther = existingAll.find(
          (s) => String(s.nisn || s.id || '').trim() === nisn && String(s.nama || '').trim().toLowerCase() !== nama.toLowerCase()
        );
        if (dupOther) {
          skippedCount++;
          return;
        }
        seen[nisn] = true;
        upsertSiswaByNisnOrId_(siswaSheet, Object.assign({}, r, { id: nisn, nisn: nisn, nama: nama, kelas: kelas }));
        importedCount++;
      });
      return jsonOut_({ ok: true, data: { imported: importedCount, skipped: skippedCount } });
    }

    if (action === 'saveJadwal') {
      upsertObjectRow_(ss.getSheetByName('Jadwal'), SHEET_SCHEMAS.Jadwal, payload, 'id');
      return jsonOut_({ ok: true, data: payload });
    }

    if (action === 'deleteJadwal') {
      deleteById_(ss.getSheetByName('Jadwal'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveAbsensiBatch') {
      const sheet = ss.getSheetByName('Absensi');
      ensureSheetColumns_(sheet, SHEET_SCHEMAS.Absensi, 'Absensi');
      const jadwalId = String(payload.jadwalId || '');
      const tanggal = String(payload.tanggal || '');
      const jadwal = String(payload.jadwal || '');
      const kelas = String(payload.kelas || '');
      const records = Array.isArray(payload.records) ? payload.records : [];

      replaceSessionAbsensi_(sheet, jadwalId, tanggal, jadwal, kelas, records);
      return jsonOut_({ ok: true, data: { saved: records.length } });
    }

    /* ---- Admin: Banner, Materi, Tajwid, Soal, Galeri, Pengaturan ---- */
    if (action === 'saveBanner') {
      upsertObjectRow_(ss.getSheetByName('BannerSlide'), SHEET_SCHEMAS.BannerSlide, payload, 'id');
      return jsonOut_({ ok: true, data: { id: payload.id || '', saved: true } });
    }

    if (action === 'deleteBanner') {
      deleteById_(ss.getSheetByName('BannerSlide'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveMateri') {
      const materiSheet = ss.getSheetByName('Materi');
      ensureSheetColumns_(materiSheet, SHEET_SCHEMAS.Materi, 'Materi');
      const item = Object.assign({}, payload, {
        dnaPoin: Array.isArray(payload.dnaPoin) ? JSON.stringify(payload.dnaPoin) : String(payload.dnaPoin || '[]'),
        galeriGambar: Array.isArray(payload.galeriGambar) ? JSON.stringify(payload.galeriGambar) : String(payload.galeriGambar || '[]')
      });
      const keys = Object.keys(item);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const vStr = item[k] !== undefined && item[k] !== null ? String(item[k]) : '';
        if (vStr.length > 49500) {
          return jsonOut_({
            ok: false,
            error: 'Data kolom "' + k + '" melebihi batas 50.000 karakter Google Sheets (' + vStr.length + ' karakter). Kurangi jumlah gambar atau kompres ulang gambarnya.'
          });
        }
      }
      upsertObjectRow_(materiSheet, SHEET_SCHEMAS.Materi, item, 'id');
      return jsonOut_({ ok: true, data: { id: item.id || '', saved: true } });
    }

    if (action === 'deleteMateri') {
      deleteById_(ss.getSheetByName('Materi'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveTajwid') {
      upsertObjectRow_(ss.getSheetByName('Tajwid'), SHEET_SCHEMAS.Tajwid, payload, 'id');
      return jsonOut_({ ok: true, data: payload });
    }

    if (action === 'deleteTajwid') {
      deleteById_(ss.getSheetByName('Tajwid'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveSoal') {
      const soalSheet = ss.getSheetByName('BankSoal');
      ensureSheetColumns_(soalSheet, SHEET_SCHEMAS.BankSoal);
      const item = Object.assign({}, payload, {
        opsi: JSON.stringify(payload.opsi || [])
      });
      upsertObjectRow_(soalSheet, SHEET_SCHEMAS.BankSoal, item, 'id');
      return jsonOut_({ ok: true, data: payload });
    }

    if (action === 'deleteSoal') {
      deleteById_(ss.getSheetByName('BankSoal'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'importSoalBatch') {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const soalSheet = ss.getSheetByName('BankSoal');
      ensureSheetColumns_(soalSheet, SHEET_SCHEMAS.BankSoal);
      const data = soalSheet.getDataRange().getValues();
      const sheetHeaders = data[0].map(String);
      const newRows = [];
      let importedCount = 0;

      rows.forEach((r, idx) => {
        const pertanyaan = String(r.pertanyaan || '').trim();
        if (!pertanyaan) return;
        const item = Object.assign({}, r, {
          id: r.id || ('SOAL-' + new Date().getTime() + '-' + idx),
          opsi: JSON.stringify(Array.isArray(r.opsi) ? r.opsi : [])
        });
        const existIdx = data.slice(1).findIndex((row) => String(row[0]) === String(item.id));
        if (existIdx >= 0) {
          upsertObjectRow_(soalSheet, sheetHeaders, item, 'id');
        } else {
          newRows.push(sheetHeaders.map((h) => (item[h] !== undefined && item[h] !== null ? item[h] : '')));
        }
        importedCount++;
      });

      if (newRows.length > 0) {
        const startRow = soalSheet.getLastRow() + 1;
        soalSheet.getRange(startRow, 1, newRows.length, sheetHeaders.length).setValues(newRows);
      }

      return jsonOut_({ ok: true, data: { imported: importedCount } });
    }

    if (action === 'saveRuangKritisNilai') {
      return updateGradedSheetRow_(
        ss,
        'RuangKritis',
        SHEET_SCHEMAS.RuangKritis,
        payload,
        'Data Ruang Kritis tidak ditemukan.',
        true
      );
    }

    if (action === 'saveTugasNilai') {
      return updateGradedSheetRow_(
        ss,
        'Tugas',
        SHEET_SCHEMAS.Tugas,
        payload,
        'Data Tugas tidak ditemukan.',
        false
      );
    }

    if (action === 'saveAmaliyahNilai') {
      return updateGradedSheetRow_(
        ss,
        'Amaliyah',
        SHEET_SCHEMAS.Amaliyah,
        payload,
        'Data Jurnal Amaliyah tidak ditemukan.',
        false
      );
    }

    if (action === 'saveEvaluasiNilai') {
      const sheet = ss.getSheetByName('Evaluasi');
      ensureSheetColumns_(sheet, SHEET_SCHEMAS.Evaluasi, 'Evaluasi');
      const id = String(payload.id || '').trim();
      if (!id) {
        return jsonOut_({ ok: false, error: 'ID data evaluasi CBT tidak valid.' });
      }
      const existing = readSheetObjects_(sheet).find((r) => String(r.id) === id);
      if (!existing) {
        return jsonOut_({ ok: false, error: 'Data hasil Evaluasi CBT tidak ditemukan.' });
      }
      const nextSkor = payload.skor !== undefined && String(payload.skor).trim() !== ''
        ? Math.min(100, Math.max(0, Number(payload.skor)))
        : Number(existing.skor || 0);
      if (!Number.isFinite(nextSkor)) {
        return jsonOut_({ ok: false, error: 'Skor Evaluasi harus berupa angka 0–100.' });
      }
      const maxSoal = Math.max(0, Number(existing.totalSoal || 0));
      let nextBenar = existing.benar !== undefined ? Number(existing.benar || 0) : 0;
      if (payload.benar !== undefined && String(payload.benar).trim() !== '') {
        const bVal = Math.max(0, Math.round(Number(payload.benar)));
        if (!Number.isFinite(bVal)) {
          return jsonOut_({ ok: false, error: 'Jumlah jawaban benar tidak valid.' });
        }
        nextBenar = maxSoal > 0 ? Math.min(maxSoal, bVal) : bVal;
      }
      const merged = Object.assign({}, existing, {
        skor: nextSkor,
        benar: nextBenar,
        catatanGuru: payload.catatanGuru !== undefined ? String(payload.catatanGuru) : (existing.catatanGuru || '')
      });
      upsertObjectRow_(sheet, SHEET_SCHEMAS.Evaluasi, merged, 'id');
      return jsonOut_({ ok: true, data: merged });
    }

    if (action === 'saveGaleri') {
      upsertObjectRow_(ss.getSheetByName('Galeri'), SHEET_SCHEMAS.Galeri, payload, 'id');
      return jsonOut_({ ok: true, data: { id: payload.id || '', saved: true } });
    }

    if (action === 'deleteGaleri') {
      deleteById_(ss.getSheetByName('Galeri'), payload.id);
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'updatePengaturan') {
      saveSettingsMap_(ss, payload);
      return jsonOut_({ ok: true, data: { saved: true } });
    }

    if (action === 'saveBelajarConfig') {
      const cfgSheet = ss.getSheetByName('AyoBelajarConfig');
      ensureSheetColumns_(cfgSheet, SHEET_SCHEMAS.AyoBelajarConfig, 'AyoBelajarConfig');
      const topicId = String(payload.id || '').trim();
      if (!topicId) {
        return jsonOut_({ ok: false, error: 'ID topik praktikum tidak valid.' });
      }
      const existing = readSheetObjects_(cfgSheet).find((c) => String(c.id) === topicId) || {};
      let nextCoverImage = existing.coverImage ? String(existing.coverImage) : '';
      if (payload.coverImage !== undefined) {
        const rawImg = String(payload.coverImage || '').trim();
        if (!rawImg) {
          nextCoverImage = '';
        } else if (
          /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(rawImg) ||
          /^https?:\/\/\S+$/i.test(rawImg) ||
          /^[a-zA-Z0-9_./-]+$/.test(rawImg)
        ) {
          nextCoverImage = rawImg;
        } else {
          return jsonOut_({ ok: false, error: 'Format gambar cover tidak valid. Gunakan upload crop Base64 atau URL https://' });
        }
      }
      if (nextCoverImage.length > 49500) {
        return jsonOut_({ ok: false, error: 'Ukuran gambar Base64 melebihi batas sel Spreadsheet (49.500 karakter). Silakan potong ulang gambar.' });
      }
      let nextPrayerAudiosStr = existing.prayerAudios ? String(existing.prayerAudios) : '';
      if (payload.prayerAudios !== undefined) {
        const rawMap = typeof payload.prayerAudios === 'string'
          ? safeJsonParse_(payload.prayerAudios, {})
          : (payload.prayerAudios && typeof payload.prayerAudios === 'object' ? payload.prayerAudios : {});
        const cleanMap = {};
        Object.keys(rawMap || {}).forEach((k) => {
          const val = String(rawMap[k] || '').trim();
          if (!val) return;
          if (/^https?:\/\/\S+$/i.test(val) || /^data:audio\/(?:mpeg|mp3|wav|ogg|webm|mp4|aac);base64,[A-Za-z0-9+/=]+$/i.test(val)) {
            cleanMap[String(k).slice(0, 32)] = val;
          }
        });
        nextPrayerAudiosStr = Object.keys(cleanMap).length ? JSON.stringify(cleanMap) : '';
      }
      if (nextPrayerAudiosStr.length > 49500) {
        return jsonOut_({ ok: false, error: 'Ukuran data audio Base64 melebihi batas sel Spreadsheet (49.500 karakter). Gunakan URL/Drive atau file MP3 lebih pendek.' });
      }
      const item = {
        id: topicId,
        kategoriId: String(payload.kategoriId || existing.kategoriId || '').trim(),
        judul: sanitizeSheetText_(payload.judul !== undefined ? payload.judul : existing.judul, 140),
        youtubeId: payload.youtubeId !== undefined ? extractYoutubeId_(payload.youtubeId) : String(existing.youtubeId || ''),
        coverImage: nextCoverImage,
        prayerAudios: nextPrayerAudiosStr,
        komentarAktif:
          payload.komentarAktif !== undefined
            ? (payload.komentarAktif === false || String(payload.komentarAktif).toLowerCase() === 'false' ? 'false' : 'true')
            : (String(existing.komentarAktif || 'true').toLowerCase() === 'false' ? 'false' : 'true'),
        updatedAt: new Date().toISOString()
      };
      upsertObjectRow_(cfgSheet, SHEET_SCHEMAS.AyoBelajarConfig, item, 'id');
      return jsonOut_({ ok: true, data: item });
    }

    if (action === 'deleteBelajarKomentar') {
      deleteById_(ss.getSheetByName('AyoBelajarKomentar'), payload.id);
      invalidatePublicCache_();
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    if (action === 'saveGuruRiwayat') {
      const rwtSheet = ss.getSheetByName('ProfilGuruRiwayat');
      ensureSheetColumns_(rwtSheet, SHEET_SCHEMAS.ProfilGuruRiwayat, 'ProfilGuruRiwayat');
      const allowedCats = ['Mengajar', 'Pendidikan', 'Penghargaan', 'Diklat'];
      const rawCat = String(payload.kategori || 'Mengajar').trim();
      const kategori = allowedCats.indexOf(rawCat) !== -1 ? rawCat : 'Mengajar';
      const judul = sanitizeSheetText_(payload.judul, 160);
      if (!judul) {
        return jsonOut_({ ok: false, error: 'Judul riwayat guru tidak boleh kosong.' });
      }
      const cleanId = String(payload.id || '').trim() || ('RWT-' + new Date().getTime());
      const item = {
        id: cleanId,
        kategori: kategori,
        periode: sanitizeSheetText_(payload.periode, 60),
        judul: judul,
        instansi: sanitizeSheetText_(payload.instansi, 160),
        keterangan: sanitizeSheetText_(payload.keterangan, 400),
        urutan: Math.max(1, Math.round(Number(payload.urutan) || 1))
      };
      upsertObjectRow_(rwtSheet, SHEET_SCHEMAS.ProfilGuruRiwayat, item, 'id');
      invalidatePublicCache_();
      return jsonOut_({ ok: true, data: item });
    }

    if (action === 'deleteGuruRiwayat') {
      deleteById_(ss.getSheetByName('ProfilGuruRiwayat'), payload.id);
      invalidatePublicCache_();
      return jsonOut_({ ok: true, data: { deleted: payload.id } });
    }

    return jsonOut_({ ok: false, error: 'Aksi POST tidak dikenali: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

/* -------------------- Helper Functions -------------------- */

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOutText_(jsonStr) {
  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function invalidatePublicCache_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll([
      PUBLIC_CACHE_PREFIX + 'meta',
      PUBLIC_CACHE_PREFIX + '0',
      PUBLIC_CACHE_PREFIX + '1',
      PUBLIC_CACHE_PREFIX + '2',
      PUBLIC_CACHE_PREFIX + '3'
    ]);
  } catch (e) {
    // Abaikan bila CacheService tidak tersedia
  }
}

function getCachedPublicBootstrapJson_(ss) {
  try {
    const cache = CacheService.getScriptCache();
    const countRaw = cache.get(PUBLIC_CACHE_PREFIX + 'meta');
    if (countRaw) {
      const count = Number(countRaw);
      if (count > 0 && count <= 4) {
        const keys = [];
        for (let i = 0; i < count; i++) keys.push(PUBLIC_CACHE_PREFIX + i);
        const parts = cache.getAll(keys);
        let combined = '';
        let ok = true;
        for (let i = 0; i < count; i++) {
          const piece = parts[PUBLIC_CACHE_PREFIX + i];
          if (!piece) { ok = false; break; }
          combined += piece;
        }
        if (ok && combined) return combined;
      }
    }
    const freshStr = JSON.stringify({ ok: true, data: buildPublicBootstrap_(ss) });
    const chunkLen = 90000;
    const chunks = [];
    for (let p = 0; p < freshStr.length; p += chunkLen) {
      chunks.push(freshStr.slice(p, p + chunkLen));
    }
    if (chunks.length > 0 && chunks.length <= 4) {
      const toPut = {};
      toPut[PUBLIC_CACHE_PREFIX + 'meta'] = String(chunks.length);
      chunks.forEach((c, idx) => { toPut[PUBLIC_CACHE_PREFIX + idx] = c; });
      cache.putAll(toPut, 120);
    }
    return freshStr;
  } catch (e) {
    return JSON.stringify({ ok: true, data: buildPublicBootstrap_(ss) });
  }
}

function withTimestampId_(obj, prefix) {
  return Object.assign({}, obj, {
    id: obj.id || (prefix + '-' + new Date().getTime()),
    timestamp: obj.timestamp || new Date().toISOString()
  });
}

function buildStudentPortalBundle_(ss, student, nisn) {
  const cleanNisn = String(nisn || '').replace(/^'+/, '').trim();
  const matchStudentRow = (row) => {
    const rNisn = String(row.nisn || row.nis || '').replace(/^'+/, '').trim();
    if (rNisn && cleanNisn && rNisn === cleanNisn) return true;
    return !rNisn && row.nama === student.nama && row.kelas === student.kelas;
  };
  return {
    myAbsensi: readSheetObjects_(ss.getSheetByName('Absensi')).filter(matchStudentRow),
    myRuangKritis: readSheetObjects_(ss.getSheetByName('RuangKritis')).filter(matchStudentRow).reverse(),
    myEvaluasi: readSheetObjects_(ss.getSheetByName('Evaluasi')).filter(matchStudentRow).reverse(),
    myAmaliyah: readSheetObjects_(ss.getSheetByName('Amaliyah')).filter(matchStudentRow).reverse(),
    myTugas: readSheetObjects_(ss.getSheetByName('Tugas')).filter(matchStudentRow).reverse(),
    myDiskusi: readSheetObjects_(ss.getSheetByName('Diskusi')).filter(matchStudentRow).reverse(),
    jadwal: readSheetObjects_(ss.getSheetByName('Jadwal')).reverse()
  };
}

function getEffectiveStudentPassword_(student) {
  if (!student) return '';
  const custom = String(student.password || '').trim();
  if (custom) return custom;
  return String(student.nisn || student.id || '').replace(/^'+/, '').trim();
}

function checkStudentCredential_(student, inputPass) {
  const pass = String(inputPass || '').trim();
  if (!student || !pass) return false;
  return getEffectiveStudentPassword_(student) === pass;
}

function sanitizeStudentForClient_(student, includeFlags) {
  if (!student) return null;
  const copy = Object.assign({}, student);
  const cleanNisn = String(copy.nisn || copy.id || '').replace(/^'+/, '').trim();
  const rawPass = String(copy.password || '').trim();
  delete copy.password;
  if (includeFlags) {
    copy.hasCustomPassword = Boolean(rawPass && rawPass !== cleanNisn);
  }
  return copy;
}

function updateGradedSheetRow_(ss, sheetName, schema, payload, notFoundMsg, allowCurate) {
  const sheet = ss.getSheetByName(sheetName);
  ensureSheetColumns_(sheet, schema, sheetName);
  const id = String(payload.id || '').trim();
  if (!id) {
    return jsonOut_({ ok: false, error: 'ID data penilaian tidak valid.' });
  }
  const existing = readSheetObjects_(sheet).find((r) => String(r.id) === id);
  if (!existing) {
    return jsonOut_({ ok: false, error: notFoundMsg });
  }
  const patch = {
    nilai: payload.nilai !== undefined ? String(payload.nilai) : (existing.nilai || ''),
    catatanGuru: payload.catatanGuru !== undefined ? String(payload.catatanGuru) : (existing.catatanGuru || '')
  };
  if (allowCurate) {
    patch.dikurasi = payload.dikurasi !== undefined ? Boolean(payload.dikurasi) : existing.dikurasi;
  }
  const merged = Object.assign({}, existing, patch);
  upsertObjectRow_(sheet, schema, merged, 'id');
  return jsonOut_({ ok: true, data: merged });
}

function findActiveStudentByNisn_(ss, nisn) {
  const clean = String(nisn || '').trim();
  if (!clean) return null;
  const rows = readSheetObjects_(ss.getSheetByName('Siswa'));
  return rows.find(
    (s) =>
      String(s.nisn || s.id || '').trim() === clean &&
      (!s.status || String(s.status).toLowerCase() === 'aktif')
  ) || null;
}

function buildPublicBootstrap_(ss) {
  const cfg = getSettingsMap_(ss);
  const kelasRows = readSheetObjects_(ss.getSheetByName('Kelas'));
  if (kelasRows.length) {
    cfg.classes = kelasRows.map((k) => k.namaKelas).filter(Boolean);
  }
  const publicCfg = Object.assign({}, cfg);
  delete publicCfg.adminUsername;
  delete publicCfg.adminPassword;

  // Data statistik agregat siswa tanpa mengekspos NISN ataupun nama lengkap ke publik
  const siswaLookup = readSheetObjects_(ss.getSheetByName('Siswa'))
    .filter((s) => !s.status || String(s.status).toLowerCase() === 'aktif')
    .map((s) => ({
      kelas: s.kelas,
      status: s.status || 'Aktif'
    }));

  // Data rekapan publik (tanpa NISN) agar halaman Riwayat & Jadwal dapat menampilkan detail pertemuan
  const publicAbsensiRecap = readSheetObjects_(ss.getSheetByName('Absensi')).map((a) => ({
    id: a.id,
    jadwalId: a.jadwalId,
    tanggal: a.tanggal,
    jadwal: a.jadwal,
    materi: a.materi,
    kelas: a.kelas,
    nama: a.nama,
    status: a.status,
    catatan: a.catatan,
    fotoUrl: a.fotoUrl || ''
  })).reverse();

  return {
    pengaturan: publicCfg,
    kelas: kelasRows,
    siswaLookup: siswaLookup,
    jadwal: readSheetObjects_(ss.getSheetByName('Jadwal')).reverse(),
    banners: readSheetObjects_(ss.getSheetByName('BannerSlide')).map((b) => {
      b.aktif = b.aktif === '' ? true : String(b.aktif) !== 'false' && b.aktif !== false;
      return b;
    }),
    materi: readSheetObjects_(ss.getSheetByName('Materi')).map((m) => {
      m.dnaPoin = safeJsonParse_(m.dnaPoin, []);
      m.galeriGambar = safeJsonParse_(m.galeriGambar, []);
      m.aktif = m.aktif === '' ? true : String(m.aktif) !== 'false' && m.aktif !== false;
      return m;
    }),
    tajwid: readSheetObjects_(ss.getSheetByName('Tajwid')),
    bankSoal: readSheetObjects_(ss.getSheetByName('BankSoal')).map((s) => {
      s.opsi = safeJsonParse_(s.opsi, []);
      s.kunci = Number(s.kunci || 0);
      return s;
    }),
    diskusi: readSheetObjects_(ss.getSheetByName('Diskusi')).map((d) => ({
      id: d.id,
      timestamp: d.timestamp,
      materiId: d.materiId,
      nama: d.nama,
      kelas: d.kelas,
      pesan: d.pesan
    })).reverse().slice(0, 60),
    galeri: readSheetObjects_(ss.getSheetByName('Galeri')).reverse(),
    ruangKritis: readSheetObjects_(ss.getSheetByName('RuangKritis'))
      .filter((r) => String(r.dikurasi) === 'true' || r.dikurasi === true)
      .map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        nama: r.nama,
        kelas: r.kelas,
        materiId: r.materiId,
        nilaiKbc: r.nilaiKbc,
        analisis: r.analisis,
        dikurasi: true,
        nilai: r.nilai || '',
        catatanGuru: r.catatanGuru || ''
      }))
      .reverse(),
    absensi: publicAbsensiRecap,
    evaluasi: readSheetObjects_(ss.getSheetByName('Evaluasi')).map((ev) => ({
      id: ev.id,
      timestamp: ev.timestamp,
      kelas: ev.kelas,
      jenjang: ev.jenjang,
      bab: ev.bab,
      skor: ev.skor,
      benar: ev.benar,
      totalSoal: ev.totalSoal,
      waktuDetik: ev.waktuDetik
    })).reverse().slice(0, 30),
    amaliyah: readSheetObjects_(ss.getSheetByName('Amaliyah')).map((am) => ({
      id: am.id,
      timestamp: am.timestamp,
      nama: am.nama,
      kelas: am.kelas,
      bab: am.bab,
      lulusSensorGadget: am.lulusSensorGadget,
      zeroProkrastinasi: am.zeroProkrastinasi,
      petarungFokus: am.petarungFokus,
      pencapaianTerbaik: am.pencapaianTerbaik,
      refleksiKbc: am.refleksiKbc
    })).reverse().slice(0, 30),
    belajarConfig: readSheetObjects_(ss.getSheetByName('AyoBelajarConfig')).map((c) => ({
      id: c.id,
      kategoriId: c.kategoriId,
      judul: c.judul,
      youtubeId: c.youtubeId || '',
      coverImage: c.coverImage || '',
      prayerAudios: c.prayerAudios ? safeJsonParse_(c.prayerAudios, {}) : {},
      komentarAktif: String(c.komentarAktif) !== 'false' && c.komentarAktif !== false,
      updatedAt: c.updatedAt || ''
    })),
    belajarKomentar: readSheetObjects_(ss.getSheetByName('AyoBelajarKomentar'))
      .map((k) => ({
        id: k.id,
        timestamp: k.timestamp,
        topicId: k.topicId,
        topicTitle: k.topicTitle,
        kategoriTitle: k.kategoriTitle,
        nama: k.nama,
        instansi: k.instansi,
        pekerjaan: k.pekerjaan,
        komentar: k.komentar
      }))
      .reverse()
      .slice(0, 200),
    guruRiwayat: (ss.getSheetByName('ProfilGuruRiwayat')
      ? readSheetObjects_(ss.getSheetByName('ProfilGuruRiwayat'))
      : []
    ).sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999))
  };
}

function buildFullAdminData_(ss) {
  const base = buildPublicBootstrap_(ss);
  base.pengaturan = getSettingsMap_(ss);
  base.siswa = readSheetObjects_(ss.getSheetByName('Siswa')).map((s) => sanitizeStudentForClient_(s, true));
  base.absensi = readSheetObjects_(ss.getSheetByName('Absensi')).reverse();
  base.evaluasi = readSheetObjects_(ss.getSheetByName('Evaluasi')).reverse();
  base.ruangKritis = readSheetObjects_(ss.getSheetByName('RuangKritis')).reverse();
  base.amaliyah = readSheetObjects_(ss.getSheetByName('Amaliyah')).reverse();
  base.tugas = readSheetObjects_(ss.getSheetByName('Tugas')).reverse();
  base.diskusi = readSheetObjects_(ss.getSheetByName('Diskusi')).reverse();
  base.belajarKomentar = readSheetObjects_(ss.getSheetByName('AyoBelajarKomentar')).reverse();
  return base;
}

function sanitizeSheetText_(raw, maxLen) {
  let clean = String(raw || '').replace(/[\r\n\t]+/g, ' ').replace(/[<>]/g, '').trim();
  if (maxLen && clean.length > maxLen) clean = clean.slice(0, maxLen);
  if (/^[=+\-@]/.test(clean)) clean = "'" + clean;
  return clean;
}

function sanitizeMultiLineSheetText_(raw, maxLen) {
  let clean = String(raw || '').replace(/\r\n/g, '\n').replace(/[<>]/g, '').trim();
  if (maxLen && clean.length > maxLen) clean = clean.slice(0, maxLen);
  if (/^[=+\-@]/.test(clean)) clean = "'" + clean;
  return clean;
}

function isSafeHttpUrlOrEmpty_(raw) {
  const val = String(raw || '').trim();
  if (!val) return true;
  return /^https?:\/\/\S+$/i.test(val);
}

function safeEqualStr_(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  let diff = sa.length ^ sb.length;
  const len = Math.max(sa.length, sb.length);
  for (let i = 0; i < len; i++) {
    const ca = i < sa.length ? sa.charCodeAt(i) : 0;
    const cb = i < sb.length ? sb.charCodeAt(i) : 0;
    diff |= (ca ^ cb);
  }
  return diff === 0;
}

function isRateLimited_(key) {
  try {
    const raw = CacheService.getScriptCache().get('btd_rl_' + key);
    return Number(raw || 0) >= AUTH_RATE_LIMIT_MAX;
  } catch (e) {
    return false;
  }
}

function recordAuthFailure_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cur = Number(cache.get('btd_rl_' + key) || 0) + 1;
    cache.put('btd_rl_' + key, String(cur), AUTH_RATE_LIMIT_WINDOW_SEC);
  } catch (e) {}
}

function clearAuthFailures_(key) {
  try {
    CacheService.getScriptCache().remove('btd_rl_' + key);
  } catch (e) {}
}

function issueSessionToken_(role, data) {
  const tok = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  try {
    CacheService.getScriptCache().put(
      'btd_tok_' + tok,
      JSON.stringify(Object.assign({ role: role, issuedAt: Date.now() }, data || {})),
      SESSION_TOKEN_TTL_SEC
    );
  } catch (e) {}
  return tok;
}

function resolveSessionToken_(token, expectedRole) {
  const clean = String(token || '').trim();
  if (!clean || clean.length < 24) return null;
  try {
    const raw = CacheService.getScriptCache().get('btd_tok_' + clean);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (expectedRole && parsed.role !== expectedRole)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function revokeSessionToken_(token) {
  const clean = String(token || '').trim();
  if (!clean) return;
  try {
    CacheService.getScriptCache().remove('btd_tok_' + clean);
  } catch (e) {}
}

function checkStudentAuthOrToken_(ss, body, payload) {
  const tokStr = (body && (body.studentToken || body.token)) || (payload && (payload.studentToken || payload.token)) || '';
  const tokData = resolveSessionToken_(tokStr, 'student');
  const nisn = String((tokData && tokData.nisn) || (payload && payload.nisn) || '').replace(/^'+/, '').trim();
  if (!nisn) return { ok: false };
  const student = findActiveStudentByNisn_(ss, nisn);
  if (!student) return { ok: false };
  if (tokData && String(tokData.nisn) === nisn) {
    return { ok: true, nisn: nisn, student: student };
  }
  const pass = String((payload && (payload.currentPassword || payload.password)) || '').trim();
  if (checkStudentCredential_(student, pass)) {
    return { ok: true, nisn: nisn, student: student };
  }
  return { ok: false };
}

function verifySubmissionStudent_(ss, body, payload) {
  const stuAuth = checkStudentAuthOrToken_(ss, body, payload);
  if (stuAuth.ok) {
    return {
      ok: true,
      nisn: stuAuth.nisn,
      nama: String(stuAuth.student.nama || payload.nama || '').trim(),
      kelas: String(stuAuth.student.kelas || payload.kelas || '').trim()
    };
  }
  // Juga izinkan jika dikirim melalui sesi Guru Admin yang valid
  const cfg = getSettingsMap_(ss);
  const expectedUser = String(cfg.adminUsername || 'admin').trim();
  const expectedPass = String(cfg.adminPassword || 'admin123').trim();
  const tokAdm = resolveSessionToken_((body && body.token) || (payload && payload.token), 'admin');
  const reqUser = String((body && body.username) || (payload && payload.username) || '').trim();
  const reqPass = String((body && body.password) || (payload && payload.password) || '').trim();
  const isAdmin =
    Boolean(tokAdm && safeEqualStr_(tokAdm.username, expectedUser)) ||
    (safeEqualStr_(reqUser, expectedUser) && safeEqualStr_(reqPass, expectedPass));
  if (isAdmin) {
    const cleanNisn = String((payload && payload.nisn) || '').replace(/^'+/, '').trim();
    const stuRow = cleanNisn ? findActiveStudentByNisn_(ss, cleanNisn) : null;
    return {
      ok: true,
      nisn: cleanNisn,
      nama: sanitizeSheetText_((stuRow && stuRow.nama) || (payload && payload.nama) || 'Siswa', 100),
      kelas: sanitizeSheetText_((stuRow && stuRow.kelas) || (payload && payload.kelas) || '-', 32)
    };
  }
  return { ok: false, error: 'Akses ditolak: Silakan login dengan akun Siswa (NISN) sebelum mengirim data.' };
}

function validateDriveUpload_(base64Str, mimeType, fileName, opts) {
  const rawB64 = String(base64Str || '').trim();
  const maxBytes = (opts && opts.maxBytes) || 5 * 1024 * 1024;
  if (!rawB64 || rawB64.length * 0.75 > maxBytes) {
    return { ok: false, error: 'Ukuran berkas terlalu besar (maksimal ' + Math.round(maxBytes / (1024 * 1024)) + ' MB).' };
  }
  const cleanName = String(fileName || 'berkas').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[._]+/, '') || 'berkas';
  const extMatch = cleanName.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const ext = extMatch ? extMatch[1] : '';
  const imageExts = ['jpg', 'jpeg', 'png', 'webp'];
  const docExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'];
  const audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];
  let allowedExts = imageExts;
  if (opts && opts.allowAudio) allowedExts = audioExts;
  else if (!(opts && opts.imagesOnly)) allowedExts = imageExts.concat(docExts);
  if (!ext || allowedExts.indexOf(ext) === -1) {
    return {
      ok: false,
      error: 'Tipe berkas tidak diizinkan (' + (ext || 'tanpa ekstensi') + '). ' + (opts && opts.allowAudio ? 'Gunakan MP3, WAV, M4A, OGG, atau WebM.' : 'Gunakan JPG/PNG/WebP' + (opts && opts.imagesOnly ? '.' : ' atau PDF/Dokumen Office.'))
    };
  }
  const cleanMime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (/svg|html|javascript|ecmascript|php|exe|sh/.test(cleanMime)) {
    return { ok: false, error: 'MIME tipe berkas diblokir demi keamanan.' };
  }
  return { ok: true, fileName: cleanName, mimeType: cleanMime || 'application/octet-stream' };
}

function containsProfanityOrSpam_(raw) {
  const txt = String(raw || '').toLowerCase();
  if (!txt) return false;
  if (/<script|javascript:|on\w+=/i.test(txt)) return true;
  if (/https?:\/\/\S+|www\.\S+/i.test(txt)) return true;
  const badPattern = /\b(anjing|anjg|anjir|asu|babi|bangsat|bgst|bajingan|bego|goblok|tolol|idiot|kontol|memek|ngentot|ngewe|jancok|jancuk|cok|pantek|kimak|pukimak|pepek|jembut|lonte|pelacur|sundal|bencong|banci|tai|taik|kampret|keparat|brengsek|setan|iblis|bangke|bacot|bct|bokep|porno|porn|judol|slot|gacor|togel|fuck|shit|bitch|asshole|bastard|dick|pussy|whore|slut)\b/i;
  return badPattern.test(txt);
}

function extractYoutubeId_(raw) {
  const val = String(raw || '').trim();
  if (!val) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
  const m = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return m ? m[1] : '';
}

function syncClassesIntoSettings_(ss) {
  const kelasList = readSheetObjects_(ss.getSheetByName('Kelas')).map((k) => k.namaKelas).filter(Boolean);
  const cfg = getSettingsMap_(ss);
  cfg.classes = kelasList;
  saveSettingsMap_(ss, cfg);
}

function formatNisnColumnsAsText_(sheet, headers, startRow, numRows) {
  if (!sheet || !headers || numRows < 1) return;
  ['id', 'nisn', 'password', 'noHp'].forEach((colName) => {
    const idx = headers.indexOf(colName);
    if (idx !== -1) {
      sheet.getRange(startRow, idx + 1, numRows, 1).setNumberFormat('@');
    }
  });
}

function upsertSiswaByNisnOrId_(sheet, obj) {
  ensureSheetColumns_(sheet, SHEET_SCHEMAS.Siswa, 'Siswa');
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0].map(String);
  const idIdx = headers.indexOf('id');
  const nisnIdx = headers.indexOf('nisn');
  const passIdx = headers.indexOf('password');

  for (let r = 1; r < data.length; r++) {
    const matchPrev = obj.prevId && String(data[r][idIdx]).trim() === String(obj.prevId).trim();
    const matchId = String(data[r][idIdx]).trim() === String(obj.id).trim();
    const matchNisn = obj.nisn && String(data[r][nisnIdx]).trim() === String(obj.nisn).trim();
    if (matchPrev || matchId || matchNisn) {
      const mergedObj = Object.assign({}, obj);
      if (mergedObj.password === undefined && passIdx !== -1) {
        mergedObj.password = String(data[r][passIdx] || '');
      }
      const rowValues = headers.map((h) => (mergedObj[h] !== undefined && mergedObj[h] !== null ? String(mergedObj[h]) : ''));
      formatNisnColumnsAsText_(sheet, headers, r + 1, 1);
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([rowValues]);
      return;
    }
  }
  const rowValues = headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? String(obj[h]) : ''));
  const nextRow = sheet.getLastRow() + 1;
  formatNisnColumnsAsText_(sheet, headers, nextRow, 1);
  sheet.getRange(nextRow, 1, 1, headers.length).setValues([rowValues]);
}

function replaceSessionAbsensi_(sheet, jadwalId, tanggal, jadwal, kelas, records) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const jIdIdx = headers.indexOf('jadwalId');
  const tglIdx = headers.indexOf('tanggal');
  const jdwIdx = headers.indexOf('jadwal');
  const klsIdx = headers.indexOf('kelas');

  for (let r = data.length - 1; r >= 1; r--) {
    const rowJId = jIdIdx !== -1 ? String(data[r][jIdIdx]) : '';
    const rowTgl = data[r][tglIdx] instanceof Date
      ? Utilities.formatDate(data[r][tglIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(data[r][tglIdx]);
    const matchByJadwalId = jadwalId && rowJId === jadwalId;
    const matchByMeta = !jadwalId && rowTgl === tanggal && String(data[r][jdwIdx]) === jadwal && String(data[r][klsIdx]) === kelas;
    if (matchByJadwalId || matchByMeta) {
      sheet.deleteRow(r + 1);
    }
  }

  if (records.length > 0) {
    const rowsToInsert = records.map((obj) =>
      headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''))
    );
    const startRow = sheet.getLastRow() + 1;
    formatNisnColumnsAsText_(sheet, headers, startRow, rowsToInsert.length);
    sheet.getRange(startRow, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
  }
}

function getSettingsMap_(ss) {
  const rows = readSheetObjects_(ss.getSheetByName('Pengaturan'));
  const map = {};
  rows.forEach((r) => {
    if (r.key === 'classes' || r.key === 'elemenList') {
      map[r.key] = safeJsonParse_(r.value, []);
    } else {
      map[r.key] = r.value;
    }
  });
  return map;
}

function saveSettingsMap_(ss, obj) {
  const sheet = ss.getSheetByName('Pengaturan');
  const keys = Object.keys(obj);
  const rows = keys.map((k) => [
    k,
    Array.isArray(obj[k]) ? JSON.stringify(obj[k]) : String(obj[k] === undefined || obj[k] === null ? '' : obj[k])
  ]);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([SHEET_SCHEMAS.Pengaturan])
    .setFontWeight('bold')
    .setBackground('#064e3b')
    .setFontColor('#ffffff');
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 2).setNumberFormat('@');
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

function readSheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const range = sheet.getDataRange();
  const data = range.getValues();
  const headers = data[0];
  const needsDisplay = sheet.getName() === 'Siswa' || headers.indexOf('nisn') !== -1;
  const displays = needsDisplay ? range.getDisplayValues() : null;
  return data.slice(1).map((row, rowIdx) => {
    const obj = {};
    headers.forEach((h, i) => {
      const hStr = String(h);
      if (row[i] instanceof Date && hStr === 'tanggal') {
        obj[h] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else if (displays && (hStr === 'nisn' || hStr === 'id')) {
        obj[h] = String(displays[rowIdx + 1][i] || row[i] || '').replace(/^'+/, '').trim();
      } else {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

function appendObjectRow_(sheet, headers, obj) {
  const row = headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
  const nextRow = sheet.getLastRow() + 1;
  formatNisnColumnsAsText_(sheet, headers, nextRow, 1);
  sheet.getRange(nextRow, 1, 1, headers.length).setValues([row]);
}

function upsertObjectRow_(sheet, headers, obj, idKey) {
  const data = sheet.getDataRange().getValues();
  const sheetHeaders = data[0].map(String);
  const idIdx = sheetHeaders.indexOf(idKey);
  const rowValues = sheetHeaders.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idIdx]) === String(obj[idKey])) {
      formatNisnColumnsAsText_(sheet, sheetHeaders, r + 1, 1);
      sheet.getRange(r + 1, 1, 1, sheetHeaders.length).setValues([rowValues]);
      return;
    }
  }
  const nextRow = sheet.getLastRow() + 1;
  formatNisnColumnsAsText_(sheet, sheetHeaders, nextRow, 1);
  sheet.getRange(nextRow, 1, 1, sheetHeaders.length).setValues([rowValues]);
}

function deleteById_(sheet, id) {
  if (!sheet || sheet.getLastRow() <= 1) return;
  const data = sheet.getDataRange().getValues();
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][0]) === String(id)) {
      sheet.deleteRow(r + 1);
    }
  }
}

function getSpreadsheetParentFolder_(ss) {
  const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
  try {
    const ssFile = DriveApp.getFileById(spreadsheet.getId());
    const parents = ssFile.getParents();
    if (parents.hasNext()) {
      return parents.next();
    }
  } catch (e) {
    // Fallback ke Root Drive
  }
  return DriveApp.getRootFolder();
}

function getOrCreateFolder_(folderName, ss) {
  const parentFolder = getSpreadsheetParentFolder_(ss);
  try {
    const folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
    return parentFolder.createFolder(folderName);
  } catch (parentErr) {
    const root = DriveApp.getRootFolder();
    const rootFolders = root.getFoldersByName(folderName);
    if (rootFolders.hasNext()) return rootFolders.next();
    return root.createFolder(folderName);
  }
}

function formatAbsensiSelfieFileName_(tanggal, kelas, nisn, recId) {
  let datePart = '';
  const tglStr = String(tanggal || '').trim();
  const m4 = tglStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m2 = tglStr.match(/^(\d{2})-(\d{2})-(\d{2})/);
  if (m4) {
    datePart = m4[1].slice(2) + '-' + m4[2] + '-' + m4[3];
  } else if (m2) {
    datePart = m2[1] + '-' + m2[2] + '-' + m2[3];
  } else {
    const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
    datePart = Utilities.formatDate(new Date(), tz, 'yy-MM-dd');
  }
  const cleanKelas = String(kelas || 'Kelas').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Kelas';
  const cleanNisn = String(nisn || 'NISN').trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'NISN';
  const cleanId = String(recId || ('ABS-' + new Date().getTime())).trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
  return datePart + '_Absensi_' + cleanKelas + '_' + cleanNisn + '_' + cleanId + '.jpg';
}

function saveBase64ToDrive_(ss, folderName, base64Data, mimeType, fileName, asImageThumbnail) {
  const folder = getOrCreateFolder_(folderName, ss);
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr1) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr2) {
      // Tetap lanjut meski domain membatasi perubahan izin link publik
    }
  }
  if (asImageThumbnail === 'audio') {
    return 'https://drive.google.com/uc?export=open&id=' + file.getId();
  }
  if (asImageThumbnail) {
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
  }
  return file.getUrl();
}

function safeJsonParse_(str, fallback) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : (str || fallback);
  } catch (e) {
    return fallback;
  }
}
