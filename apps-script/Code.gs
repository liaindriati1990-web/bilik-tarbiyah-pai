/**
 * ============================================================================
 * Bilik Tarbiyah Digital — Google Apps Script Backend (Code.gs)
 * ============================================================================
 * Arsitektur Zero-Budget IT: GitHub Pages (Frontend) + Apps Script + Google Sheets
 * Dilengkapi AUTO-SETUP DATABASE OTOMATIS:
 * - Otomatis membuat seluruh 15 sheet tabel (Pengaturan, Kelas, Siswa [NISN],
 *   Jadwal, BannerSlide, Materi, Tajwid, BankSoal, Absensi, Evaluasi, RuangKritis,
 *   Amaliyah, Tugas, Diskusi, Galeri), folder Drive langsung di dalam folder induk
 *   Spreadsheet, & data awal PAI-BP.
 * - Mendukung Autentikasi Guru (Username/Password) & Autentikasi Siswa (NISN/NISN)
 *   serta Presensi Daring Mandiri KHUSUS untuk jadwal berstatus "Sedang Berlangsung" & "Daring".
 */

const DRIVE_TUGAS_FOLDER = 'Bilik_Tarbiyah_Tugas_Siswa';
const DRIVE_MEDIA_FOLDER = 'Bilik_Tarbiyah_Media';
const DRIVE_ABSENSI_FOLDER = 'absensi';
const SCHEMA_READY_PROP_KEY = 'btd_schema_ready_v4_2';
const PUBLIC_CACHE_PREFIX = 'btd_pub_v4_';

const SHEET_SCHEMAS = {
  Pengaturan: ['key', 'value'],
  Kelas: ['id', 'namaKelas', 'jenjang', 'waliKelas', 'keterangan'],
  Siswa: ['id', 'nisn', 'nama', 'kelas', 'jenisKelamin', 'status'],
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
  Evaluasi: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'jenjang', 'bab', 'skor', 'benar', 'totalSoal', 'waktuDetik'],
  RuangKritis: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'materiId', 'nilaiKbc', 'analisis', 'dikurasi'],
  Amaliyah: [
    'id', 'timestamp', 'nisn', 'nama', 'kelas', 'bab', 'lulusSensorGadget',
    'zeroProkrastinasi', 'petarungFokus', 'pencapaianTerbaik', 'refleksiKbc'
  ],
  Tugas: ['id', 'timestamp', 'nisn', 'nama', 'kelas', 'bab', 'jenisTugas', 'fileUrl', 'catatan'],
  Diskusi: ['id', 'timestamp', 'materiId', 'nisn', 'nama', 'kelas', 'pesan'],
  Galeri: ['id', 'judul', 'kelas', 'kategori', 'kreator', 'ringkasan', 'gambarUrl', 'tautan']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bilik Tarbiyah DB')
    .addItem('Setup & Sinkronisasi Struktur Database Otomatis', 'setupDatabase')
    .addToUi();
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureDatabaseReady_(ss, true);
  let folderNote = 'tersimpan di Google Sheets';
  try {
    const parentFolder = getSpreadsheetParentFolder_(ss);
    folderNote = 'folder "' + parentFolder.getName() + '"';
  } catch (e) {
    // Jika DriveApp dibatasi, gambar tetap aman tersimpan Base64 < 50.000 char di Sheets
  }
  const msg = 'Database 15 sheet & seluruh kolom/pengaturan siap digunakan (' + folderNote + ').';
  try {
    ss.toast(msg, 'Bilik Tarbiyah DB', 6);
  } catch (toastErr) {
    // Abaikan bila dipanggil di luar UI Spreadsheet (mis. Web App API)
  }
  return {
    message: msg,
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
    if (name === 'Siswa' || expectedHeaders.indexOf('nisn') !== -1) {
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
    if (action && action !== 'verifyAdmin' && action !== 'verifyStudent' && action !== 'getAdminDashboard') {
      invalidatePublicCache_();
    }

    // Public Student Submissions
    if (action === 'submitEvaluasi') {
      const rec = withTimestampId_(payload, 'EVL');
      appendObjectRow_(ss.getSheetByName('Evaluasi'), SHEET_SCHEMAS.Evaluasi, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitRuangKritis') {
      const rec = withTimestampId_(payload, 'KRIT');
      appendObjectRow_(ss.getSheetByName('RuangKritis'), SHEET_SCHEMAS.RuangKritis, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitAmaliyah') {
      const rec = withTimestampId_(payload, 'AML');
      appendObjectRow_(ss.getSheetByName('Amaliyah'), SHEET_SCHEMAS.Amaliyah, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitDiskusi') {
      const rec = withTimestampId_(payload, 'DSK');
      appendObjectRow_(ss.getSheetByName('Diskusi'), SHEET_SCHEMAS.Diskusi, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === 'submitTugas') {
      const rec = withTimestampId_(payload, 'TGS');
      if (payload.fileBase64 && payload.fileName) {
        rec.fileUrl = saveBase64ToDrive_(ss, DRIVE_TUGAS_FOLDER, payload.fileBase64, payload.fileMime, payload.fileName, false);
      }
      appendObjectRow_(ss.getSheetByName('Tugas'), SHEET_SCHEMAS.Tugas, rec);
      return jsonOut_({ ok: true, data: rec });
    }

    /* ---- Portal Siswa Auth (Username = NISN, Password = NISN) ---- */
    if (action === 'verifyStudent') {
      const nisn = String(payload.nisn || '').trim();
      const pass = String(payload.password || '').trim();
      const student = findActiveStudentByNisn_(ss, nisn);
      const valid = Boolean(student && nisn && nisn === pass);
      let myAbsensi = [];
      if (valid) {
        myAbsensi = readSheetObjects_(ss.getSheetByName('Absensi')).filter(
          (a) => String(a.nisn || '').trim() === nisn
        );
      }
      return jsonOut_({
        ok: true,
        data: {
          valid: valid,
          student: valid ? student : null,
          myAbsensi: myAbsensi
        }
      });
    }

    if (action === 'submitStudentAbsensi') {
      const nisn = String(payload.nisn || '').trim();
      const pass = String(payload.password || '').trim();
      const jadwalId = String(payload.jadwalId || '').trim();
      const student = findActiveStudentByNisn_(ss, nisn);

      if (!student || !nisn || nisn !== pass) {
        return jsonOut_({ ok: false, error: 'Autentikasi siswa tidak valid.' });
      }

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

      let fotoUrl = String(payload.fotoUrl || '').trim();
      if (payload.fotoBase64) {
        const cleanKelas = String(student.kelas || 'Kelas').replace(/[^a-zA-Z0-9_-]+/g, '_');
        const safeFileName = String(payload.fotoName || ('Absensi_' + cleanKelas + '_' + nisn + '_' + jdw.tanggal + '.jpg'));
        fotoUrl = saveBase64ToDrive_(
          ss,
          DRIVE_ABSENSI_FOLDER,
          payload.fotoBase64,
          payload.fotoMime || 'image/jpeg',
          safeFileName,
          true
        );
      }

      const rec = {
        id: 'ABS-' + new Date().getTime(),
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

    // Admin Username + Password Auth
    const cfg = getSettingsMap_(ss);
    const expectedUser = String(cfg.adminUsername || 'admin').trim();
    const expectedPass = String(cfg.adminPassword || 'admin123').trim();
    const reqUser = String(body.username || payload.username || '').trim();
    const reqPass = String(body.password || payload.password || '').trim();

    if (action === 'verifyAdmin') {
      const valid = reqUser === expectedUser && reqPass === expectedPass;
      return jsonOut_({
        ok: true,
        data: {
          valid: valid,
          dashboard: valid ? buildFullAdminData_(ss) : null
        }
      });
    }

    if (reqUser !== expectedUser || reqPass !== expectedPass) {
      return jsonOut_({ ok: false, error: 'Akses ditolak: Username atau Password Guru tidak valid.' });
    }

    if (action === 'setupDatabase') {
      return jsonOut_({ ok: true, data: setupDatabase() });
    }

    if (action === 'getAdminDashboard') {
      return jsonOut_({ ok: true, data: buildFullAdminData_(ss) });
    }

    if (action === 'uploadMedia') {
      if (!payload.fileBase64 || !payload.fileName) {
        return jsonOut_({ ok: false, error: 'File gambar tidak ditemukan.' });
      }
      const imgUrl = saveBase64ToDrive_(ss, DRIVE_MEDIA_FOLDER, payload.fileBase64, payload.fileMime, payload.fileName, true);
      return jsonOut_({ ok: true, data: { url: imgUrl } });
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
      return jsonOut_({ ok: true, data: item });
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

  // Lookup ringan untuk Autocomplete 3 Rekomendasi Nama/NISN
  const siswaLookup = readSheetObjects_(ss.getSheetByName('Siswa'))
    .filter((s) => !s.status || String(s.status).toLowerCase() === 'aktif')
    .map((s) => ({
      nisn: String(s.nisn || s.id || ''),
      nama: s.nama,
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
    diskusi: readSheetObjects_(ss.getSheetByName('Diskusi')).reverse().slice(0, 60),
    galeri: readSheetObjects_(ss.getSheetByName('Galeri')).reverse(),
    ruangKritis: readSheetObjects_(ss.getSheetByName('RuangKritis'))
      .filter((r) => String(r.dikurasi) === 'true' || r.dikurasi === true)
      .reverse(),
    absensi: publicAbsensiRecap,
    evaluasi: readSheetObjects_(ss.getSheetByName('Evaluasi')).reverse().slice(0, 30),
    amaliyah: readSheetObjects_(ss.getSheetByName('Amaliyah')).reverse().slice(0, 30)
  };
}

function buildFullAdminData_(ss) {
  const base = buildPublicBootstrap_(ss);
  base.pengaturan = getSettingsMap_(ss);
  base.siswa = readSheetObjects_(ss.getSheetByName('Siswa'));
  base.absensi = readSheetObjects_(ss.getSheetByName('Absensi')).reverse();
  base.evaluasi = readSheetObjects_(ss.getSheetByName('Evaluasi')).reverse();
  base.ruangKritis = readSheetObjects_(ss.getSheetByName('RuangKritis')).reverse();
  base.amaliyah = readSheetObjects_(ss.getSheetByName('Amaliyah')).reverse();
  base.tugas = readSheetObjects_(ss.getSheetByName('Tugas')).reverse();
  base.diskusi = readSheetObjects_(ss.getSheetByName('Diskusi')).reverse();
  return base;
}

function syncClassesIntoSettings_(ss) {
  const kelasList = readSheetObjects_(ss.getSheetByName('Kelas')).map((k) => k.namaKelas).filter(Boolean);
  const cfg = getSettingsMap_(ss);
  cfg.classes = kelasList;
  saveSettingsMap_(ss, cfg);
}

function formatNisnColumnsAsText_(sheet, headers, startRow, numRows) {
  if (!sheet || !headers || numRows < 1) return;
  ['id', 'nisn'].forEach((colName) => {
    const idx = headers.indexOf(colName);
    if (idx !== -1) {
      sheet.getRange(startRow, idx + 1, numRows, 1).setNumberFormat('@');
    }
  });
}

function upsertSiswaByNisnOrId_(sheet, obj) {
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0].map(String);
  const idIdx = headers.indexOf('id');
  const nisnIdx = headers.indexOf('nisn');
  const rowValues = headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? String(obj[h]) : ''));

  for (let r = 1; r < data.length; r++) {
    const matchPrev = obj.prevId && String(data[r][idIdx]).trim() === String(obj.prevId).trim();
    const matchId = String(data[r][idIdx]).trim() === String(obj.id).trim();
    const matchNisn = obj.nisn && String(data[r][nisnIdx]).trim() === String(obj.nisn).trim();
    if (matchPrev || matchId || matchNisn) {
      formatNisnColumnsAsText_(sheet, headers, r + 1, 1);
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([rowValues]);
      return;
    }
  }
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
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function saveBase64ToDrive_(ss, folderName, base64Data, mimeType, fileName, asImageThumbnail) {
  const folder = getOrCreateFolder_(folderName, ss);
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
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
