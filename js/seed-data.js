/**
 * Data Awal (Seed Data) Bilik Tarbiyah Digital — Khusus PAI & Budi Pekerti
 * Mencakup pengaturan situs, slide banner beranda, materi Kelas X-XII beserta aset gambar/infografis,
 * kartu bedah tajwid, bank soal CBT, dan contoh galeri karya.
 */
(function () {
  function makeBannerSvg(accentHex, bgA, bgB) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgA}"/>
          <stop offset="100%" stop-color="${bgB}"/>
        </linearGradient>
        <radialGradient id="glow" cx="78%" cy="28%" r="48%">
          <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="${accentHex}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#g)"/>
      <rect width="1200" height="675" fill="url(#glow)"/>
      <circle cx="930" cy="195" r="220" fill="none" stroke="${accentHex}" stroke-width="2" opacity="0.28"/>
      <circle cx="930" cy="195" r="155" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.18"/>
      <path d="M930 85 L958 148 L1026 156 L974 202 L988 268 L930 234 L872 268 L886 202 L834 156 L902 148 Z" fill="${accentHex}" fill-opacity="0.18" stroke="${accentHex}" stroke-width="2.5" opacity="0.72"/>
      <path d="M0 540 Q320 450 640 530 T1200 470 L1200 675 L0 675 Z" fill="#000000" opacity="0.16"/>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function makeInfografisEtosSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520">
      <rect width="960" height="520" rx="24" fill="#f8faf9"/>
      <rect width="960" height="96" rx="24" fill="#064e3b"/>
      <text x="480" y="48" font-family="sans-serif" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">4 DNA BER-ETOS KERJA TINGGI (VERSI ISLAM)</text>
      <text x="480" y="76" font-family="sans-serif" font-size="15" font-weight="600" fill="#fde68a" text-anchor="middle">Rujukan Materi Kelas X Bab 1 • QS. Al-Maidah: 48 &amp; QS. At-Taubah: 105</text>
      <g transform="translate(40,126)">
        <rect width="205" height="340" rx="18" fill="#ffffff" stroke="#a7f3d0" stroke-width="2"/>
        <circle cx="102" cy="64" r="32" fill="#ecfdf5"/>
        <text x="102" y="73" font-family="sans-serif" font-size="26" font-weight="800" fill="#064e3b" text-anchor="middle">1</text>
        <text x="102" y="132" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a" text-anchor="middle">Niat Karena Allah</text>
        <text x="102" y="168" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">Bekerja dan belajar</text>
        <text x="102" y="190" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">ikhlas lillahi ta'ala</text>
        <text x="102" y="212" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">sehingga bernilai ibadah.</text>
      </g>
      <g transform="translate(265,126)">
        <rect width="205" height="340" rx="18" fill="#ffffff" stroke="#fde68a" stroke-width="2"/>
        <circle cx="102" cy="64" r="32" fill="#fffbeb"/>
        <text x="102" y="73" font-family="sans-serif" font-size="26" font-weight="800" fill="#b45309" text-anchor="middle">2</text>
        <text x="102" y="132" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a" text-anchor="middle">Disiplin Waktu</text>
        <text x="102" y="168" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">Menghindari tunda</text>
        <text x="102" y="190" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">(zero prokrastinasi)</text>
        <text x="102" y="212" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">dan memaksimalkan waktu.</text>
      </g>
      <g transform="translate(490,126)">
        <rect width="205" height="340" rx="18" fill="#ffffff" stroke="#a7f3d0" stroke-width="2"/>
        <circle cx="102" cy="64" r="32" fill="#ecfdf5"/>
        <text x="102" y="73" font-family="sans-serif" font-size="26" font-weight="800" fill="#064e3b" text-anchor="middle">3</text>
        <text x="102" y="132" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a" text-anchor="middle">Pantang Menyerah</text>
        <text x="102" y="168" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">Berlomba dalam kebaikan</text>
        <text x="102" y="190" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">(fastabiqul khairat)</text>
        <text x="102" y="212" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">saat menghadapi kesulitan.</text>
      </g>
      <g transform="translate(715,126)">
        <rect width="205" height="340" rx="18" fill="#ffffff" stroke="#fde68a" stroke-width="2"/>
        <circle cx="102" cy="64" r="32" fill="#fffbeb"/>
        <text x="102" y="73" font-family="sans-serif" font-size="26" font-weight="800" fill="#b45309" text-anchor="middle">4</text>
        <text x="102" y="132" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a" text-anchor="middle">Bertanggung Jawab</text>
        <text x="102" y="168" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">Amanah menuntaskan</text>
        <text x="102" y="190" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">tugas dengan kesadaran</text>
        <text x="102" y="212" font-family="sans-serif" font-size="14" fill="#475569" text-anchor="middle">muraqabah kepada Allah.</text>
      </g>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  window.BTD_SEED = {
    pengaturan: {
      siteName: 'Bilik Tarbiyah Digital',
      siteSubtitle: 'Portal Pembelajaran PAI & Budi Pekerti',
      teacherName: 'Lia Indriati, S.Pd.I., Gr.',
      teacherNip: '',
      teacherTitle: 'Guru Pendidikan Agama Islam & Budi Pekerti',
      teacherBio:
        "Pendidik PAI-BP yang berfokus pada pembelajaran mendalam (Deep Learning), literasi Al-Qur'an digital, dan pembentukan karakter berlandaskan Kurikulum Berbasis Cinta.",
      teacherPhotoUrl: '',
      namaInstansi: 'Pemerintah Provinsi Jambi',
      schoolName: 'SMAN 20 Tebo',
      schoolNpsn: '',
      schoolAddress: 'Kabupaten Tebo, Provinsi Jambi',
      schoolCity: 'Kabupaten Tebo, Jambi',
      schoolEmail: 'paibp@sman20tebo.sch.id',
      schoolPhone: '-',
      schoolWebsite: '',
      schoolMapsUrl: '',
      schoolCoords: '-1.396500, 102.371200',
      schoolHours: 'Senin–Sabtu, 07.15–14.30 WIB',
      academicYear: 'TA 2026/2027',
      siteLogoUrl: '',
      instansiLogoUrl: '',
      schoolLogoUrl: '',
      themeBgUrl: '',
      themeColor1: '#042f24',
      themeColor2: '#064e3b',
      themeColor3: '#0f766e',
      btnGradPreset: 'zamrud-toska',
      btnColor1: '#064e3b',
      btnColor2: '#0d9488',
      classes: ['X M1', 'X M2', 'XI M1', 'XI M2', 'XII M1', 'XII M2'],
      elemenList: [
        "Al-Qur'an & Hadis",
        'Akidah',
        'Akhlak',
        'Fikih',
        'Sejarah Peradaban Islam'
      ],
      smartPaiUrl: 'https://smartpai.kemenag.go.id',
      kemenagUrl: 'https://pendis.kemenag.go.id',
      adminUsername: 'admin',
      adminPassword: 'admin123'
    },

    kelas: [
      { id: 'KLS-X-M1', namaKelas: 'X M1', jenjang: 'X', waliKelas: 'Lia Indriati, S.Pd.I., Gr.', keterangan: 'Kelas X Merdeka 1' },
      { id: 'KLS-X-M2', namaKelas: 'X M2', jenjang: 'X', waliKelas: '-', keterangan: 'Kelas X Merdeka 2' },
      { id: 'KLS-XI-M1', namaKelas: 'XI M1', jenjang: 'XI', waliKelas: '-', keterangan: 'Kelas XI Merdeka 1' },
      { id: 'KLS-XI-M2', namaKelas: 'XI M2', jenjang: 'XI', waliKelas: '-', keterangan: 'Kelas XI Merdeka 2' },
      { id: 'KLS-XII-M1', namaKelas: 'XII M1', jenjang: 'XII', waliKelas: '-', keterangan: 'Kelas XII Merdeka 1' },
      { id: 'KLS-XII-M2', namaKelas: 'XII M2', jenjang: 'XII', waliKelas: '-', keterangan: 'Kelas XII Merdeka 2' }
    ],

    siswa: [
      { id: '0091000101', nisn: '0091000101', nama: 'Ahmad Fauzan', kelas: 'X M1', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0091000102', nisn: '0091000102', nama: 'Siti Aisyah', kelas: 'X M1', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0091000103', nisn: '0091000103', nama: 'Rafa Aditya', kelas: 'X M1', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0091000104', nisn: '0091000104', nama: 'Aulia Putri', kelas: 'X M1', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0091000201', nisn: '0091000201', nama: 'Nadia Putri', kelas: 'X M2', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0091000202', nisn: '0091000202', nama: 'Farhan Hakim', kelas: 'X M2', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0081100101', nisn: '0081100101', nama: 'Muhammad Rizky', kelas: 'XI M1', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0081100102', nisn: '0081100102', nama: 'Zahra Humaira', kelas: 'XI M1', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0081100201', nisn: '0081100201', nama: 'Bagas Pratama', kelas: 'XI M2', jenisKelamin: 'L', status: 'Aktif' },
      { id: '0071200101', nisn: '0071200101', nama: 'Aulia Rahma', kelas: 'XII M1', jenisKelamin: 'P', status: 'Aktif' },
      { id: '0071200201', nisn: '0071200201', nama: 'Ilham Saputra', kelas: 'XII M2', jenisKelamin: 'L', status: 'Aktif' }
    ],

    jadwal: [
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
        catatan: 'Pembelajaran tatap muka bedah ayat dan praktik tajwid berpasangan berjalan aktif.'
      },
      {
        id: 'JDW-002',
        tanggal: '2026-11-18',
        semester: '1',
        jamKe: 'Jam 3–4 (09.00–10.30)',
        kelas: 'XI M1',
        materiId: 'MAT-XI-01',
        materiJudul: 'Bab 1: Membiasakan Berpikir Kritis & Mencintai IPTEK',
        jenis: 'Daring',
        status: 'Terlaksana',
        catatan: 'Diskusi tabayyun berita digital dan pengerjaan studi kasus ulul albab.'
      },
      {
        id: 'JDW-003',
        tanggal: '2026-11-20',
        semester: '1',
        jamKe: 'Jam 1–2 (07.15–08.45)',
        kelas: 'X M1',
        materiId: 'MAT-X-02',
        materiJudul: "Bab 2: Mewujudkan Ketauhidan dengan Syu'abul Iman",
        jenis: 'Daring',
        status: 'Sedang Berlangsung',
        catatan: 'Siswa kelas X M1 silakan login Portal Siswa untuk mengisi presensi daring dan menyimak modul Bab 2.'
      },
      {
        id: 'JDW-004',
        tanggal: '2026-11-21',
        semester: '1',
        jamKe: 'Jam 5–6 (10.45–12.15)',
        kelas: 'X M1',
        materiId: 'MAT-X-03',
        materiJudul: "Bab 3: Menghindari Berfoya-foya, Riya', Sum'ah, Takabur, dan Hasad",
        jenis: 'Luring',
        status: 'Sedang Berlangsung',
        catatan: 'Pertemuan tatap muka di kelas (presensi dicatat langsung oleh guru).'
      },
      {
        id: 'JDW-005',
        tanggal: '2026-11-20',
        semester: '1',
        jamKe: 'Jam 3–4 (09.00–10.30)',
        kelas: 'XI M1',
        materiId: 'MAT-XI-02',
        materiJudul: 'Bab 2: Bukti Beriman — Menjaga Lisan & Menutup Aib',
        jenis: 'Daring',
        status: 'Sedang Berlangsung',
        catatan: 'Pembelajaran daring sinkron dan refleksi etika bermedia sosial.'
      }
    ],

    banners: [
      {
        id: 'BNR-01',
        urutan: 1,
        badge: 'Selamat Datang',
        judul: 'Bilik Tarbiyah Digital — PAI & Budi Pekerti',
        deskripsi: 'Portal pembelajaran interaktif berbasis Deep Learning dan Kurikulum Berbasis Cinta untuk Kelas X, XI, dan XII.',
        imageUrl: makeBannerSvg('#f59e0b', '#042f24', '#0f766e'),
        ctaLabel: 'Buka Ruang Materi',
        ctaLink: '#materi',
        aktif: true
      },
      {
        id: 'BNR-02',
        urutan: 2,
        badge: 'Materi Unggulan',
        judul: 'Bedah Ayat, Tajwid Interaktif, & Analisis HOTS',
        deskripsi: 'Eksplorasi QS. Al-Maidah: 48, QS. At-Taubah: 105, dan QS. Ali Imran: 190–191 secara interaktif.',
        imageUrl: makeBannerSvg('#34d399', '#064e3b', '#0369a1'),
        ctaLabel: 'Buka Modul & Evaluasi',
        ctaLink: '#materi',
        aktif: true
      },
      {
        id: 'BNR-03',
        urutan: 3,
        badge: 'Profil Pendidik & Kurikulum Merdeka',
        judul: 'Pembelajaran PAI Interaktif & Pembinaan Karakter',
        deskripsi: 'Menyatukan literasi Al-Qur\'an, praktikum ibadah bersuara, evaluasi CBT, serta portofolio rekam jejak guru pengampu.',
        imageUrl: makeBannerSvg('#fbbf24', '#1e293b', '#065f46'),
        ctaLabel: 'Lihat Portofolio Guru',
        ctaLink: '#tentang',
        aktif: true
      }
    ],

    materi: [
      {
        id: 'MAT-X-01',
        jenjang: 'X',
        semester: '1',
        bab: 1,
        judul: 'Meraih Kesuksesan dengan Kompetisi dalam Kebaikan dan Etos Kerja',
        elemen: "Al-Qur'an & Hadis",
        ringkasan:
          'Menganalisis QS. Al-Maidah/5: 48 dan QS. At-Taubah/9: 105 tentang berlomba dalam kebaikan (fastabiqul khairat) serta etos kerja Islami yang berintegritas.',
        apersepsi:
          'Waktu terus berjalan — di lintasan mana kamu sedang berlari? Bandingkan kebiasaan rebahan & menunda waktu (prokrastinasi digital) dengan etos kerja produktif yang bernilai ibadah di sisi Allah Swt.',
        pemantik:
          '1. Mengapa banyak pelajar mengetahui pentingnya disiplin waktu, tetapi tetap terjebak prokrastinasi di media sosial?\n2. Konten edukatif atau aksi kebaikan nyata apa yang bisa kamu mulai minggu ini sebagai wujud fastabiqul khairat?',
        dnaPoin: [
          'Niat Lurus Karena Allah (Lillahi Taala)',
          'Disiplin Waktu & Anti-Prokrastinasi',
          'Pantang Menyerah & Fokus Solusi',
          'Bertanggung Jawab & Amanah'
        ],
        coverImage: '',
        infografisUrl: makeInfografisEtosSvg(),
        galeriGambar: [
          {
            id: 'GM-X1-1',
            url: makeInfografisEtosSvg(),
            caption: 'Infografis 4 DNA Etos Kerja Tinggi Versi Islam (QS. Al-Maidah: 48 & At-Taubah: 105)'
          }
        ],
        youtubeId: '4IKWLB3pi9s',
        youtubeIdTambahan: 'CU3RyTRJcvU',
        slideUrl: '',
        pdfUrl: 'https://drive.google.com/file/d/1lfg2CrksiKgezplXwIAqghrqAdNVly6c/preview',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: 'https://drive.google.com/file/d/1XZyrDERANb5lDWOsc3z3LoLXbxktf4If/preview',
        studiKasus:
          'Budi dan Andi sama-sama siswa kelas X yang mengikuti proyek bakti sosial sekolah. Budi bekerja keras merapikan logistik meski tidak diliput media, sedangkan Andi hanya aktif berfoto saat pembagian bantuan agar tampak baik di media sosial. Analisislah sikap keduanya berdasarkan QS. At-Taubah/9: 105 dan nilai keikhlasan dalam Kurikulum Berbasis Cinta!',
        nilaiKbc: 'Keikhlasan beramal, kasih sayang sosial, dan tanggung jawab terhadap amanah.',
        aktif: true
      },
      {
        id: 'MAT-X-02',
        jenjang: 'X',
        semester: '1',
        bab: 2,
        judul: "Memahami Hakikat dan Mewujudkan Ketauhidan dengan Syu'abul Iman",
        elemen: 'Akidah',
        ringkasan:
          "Memahami 77 cabang iman (Syu'abul Iman) yang terwujud melalui keyakinan hati, ucapan lisan, dan amal perbuatan sehari-hari.",
        apersepsi:
          'Iman bukan sekadar pengakuan lisan, melainkan pohon rindang dengan cabang-cabang akhlak yang buahnya dirasakan oleh sesama.',
        pemantik:
          'Cabang iman apa yang paling menantang untuk dijaga di lingkungan pergaulan remaja saat ini?',
        dnaPoin: [
          'Tashdiq bil Qalbi (Keyakinan Hati)',
          'Iqrar bil Lisan (Ucapan Jujur)',
          'Amal bil Arkan (Perbuatan Nyata)',
          'Rasa Malu Berbuat Maksiat'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: '',
        studiKasus:
          'Seorang siswa selalu rajin beribadah ritual, tetapi masih sering menyinggung perasaan temannya di grup kelas. Bagaimana konsep Syuabul Iman menilai kondisi tersebut?',
        nilaiKbc: 'Keseimbangan cinta kepada Allah (hablum minallah) dan kepedulian kepada sesama (hablum minannas).',
        aktif: true
      },
      {
        id: 'MAT-X-03',
        jenjang: 'X',
        semester: '1',
        bab: 3,
        judul: "Menghindari Berfoya-foya, Riya', Sum'ah, Takabur, dan Hasad",
        elemen: 'Akhlak',
        ringkasan:
          'Menjauhi penyakit hati dan gaya hidup konsumtif agar hidup lebih bermakna, rendah hati, dan penuh keberkahan.',
        apersepsi:
          'Di era pamer (flexing) media sosial, menjaga hati dari riya dan hasad menjadi benteng kesehatan mental sekaligus spiritual.',
        pemantik:
          'Bagaimana membedakan antara berbagi inspirasi kebaikan di media sosial dengan sikap riya atau sumah?',
        dnaPoin: [
          'Qanaah & Gaya Hidup Sederhana',
          'Ikhlas Tanpa Validasi Manusia',
          'Tawadhu (Rendah Hati)',
          'Turut Bahagia atas Nikmat Orang Lain'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: '',
        studiKasus:
          'Mengapa tren pamer barang mewah sering memicu perilaku hasad dan konsumtif di kalangan pelajar, serta bagaimana solusi pengendalian dirinya dalam Islam?',
        nilaiKbc: 'Empati terhadap sesama, pengendalian diri, dan rasa syukur penuh cinta.',
        aktif: true
      },
      {
        id: 'MAT-X-04',
        jenjang: 'X',
        semester: '1',
        bab: 4,
        judul: 'Asuransi, Bank, dan Koperasi Syariah untuk Perekonomian Umat',
        elemen: 'Fikih',
        ringkasan:
          'Memahami prinsip muamalah bebas riba, gharar, dan maysir melalui lembaga keuangan syariah yang berkeadilan.',
        apersepsi:
          'Ekonomi Islam hadir bukan sekadar mengganti istilah, tetapi menjamin keadilan dan tolong-menolong (taawun) antarsesama.',
        pemantik:
          'Apa perbedaan mendasar prinsip bagi hasil syariah dengan bunga pinjaman konvensional?',
        dnaPoin: [
          'Bebas Riba, Gharar, & Maysir',
          'Prinsip Taawun (Tolong-Menolong)',
          'Akad Jelas & Berkeadilan',
          'Keberkahan Harta'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: '',
        studiKasus:
          'Banyak remaja tergoda pinjaman online (pinjol) ilegal demi gaya hidup. Bagaimana literasi keuangan syariah melindungi generasi muda dari jeratan riba?',
        nilaiKbc: 'Kejujuran transaksi dan solidaritas ekonomi berbasis tolong-menolong.',
        aktif: true
      },
      {
        id: 'MAT-X-06',
        jenjang: 'X',
        semester: '2',
        bab: 6,
        judul: 'Menjauhi Pergaulan Bebas dan Perbuatan Zina',
        elemen: 'Akhlak',
        ringkasan:
          'Melindungi harkat dan martabat manusia dengan menjaga pergaulan sehat, adab interaksi, serta menjauhi hal-hal yang mendekati zina (QS. Al-Isra/17: 32).',
        apersepsi:
          'Islam memuliakan cinta dengan menempatkannya dalam ikatan yang suci, bertanggung jawab, dan menjaga kehormatan diri.',
        pemantik:
          'Bagaimana cara menetapkan batasan sehat (healthy boundaries) dalam pergaulan daring maupun luring di sekolah?',
        dnaPoin: [
          'Menjaga Pandangan & Kehormatan',
          'Pergaulan Sehat & Positif',
          'Menghindari Pintu-Pintu Fitnah',
          'Menyalurkan Energi pada Prestasi'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: '',
        studiKasus:
          'Bagaimana peran komunitas teman sebaya dan literasi digital Islami dalam mencegah pergaulan bebas di kalangan pelajar SMA?',
        nilaiKbc: 'Memuliakan martabat manusia dan menjaga kasih sayang dalam koridor akhlak mulia.',
        aktif: true
      },
      {
        id: 'MAT-X-10',
        jenjang: 'X',
        semester: '2',
        bab: 10,
        judul: 'Peran Tokoh Ulama dalam Penyebaran Islam di Indonesia',
        elemen: 'Sejarah Peradaban Islam',
        ringkasan:
          'Meneladani dakwah damai, bijaksana, dan kultural para ulama serta Walisongo dalam membangun peradaban Islam Nusantara.',
        apersepsi:
          'Islam masuk ke Nusantara tidak melalui paksaan, melainkan melalui keteladanan akhlak, perdagangan jujur, dan pendekatan budaya yang penuh cinta.',
        pemantik:
          'Strategi dakwah kultural Walisongo mana yang masih sangat relevan ditiru untuk menyampaikan nilai Islam yang ramah di era digital?',
        dnaPoin: [
          'Dakwah Damai Bil Hikmah',
          'Menghargai Kearifan Lokal',
          'Keteladanan Akhlak Pedagang & Ulama',
          'Cinta Tanah Air & Persatuan'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1STRKboiV1aINBq68xeQivWo1LHtlpfVn/preview',
        lkpdUrl: '',
        studiKasus:
          'Mengapa metode dakwah yang merangkul budaya setempat lebih cepat diterima masyarakat dibandingkan pendekatan konfrontatif?',
        nilaiKbc: 'Dakwah yang menyejukkan, toleran, dan menghargai keberagaman.',
        aktif: true
      },
      {
        id: 'MAT-XI-01',
        jenjang: 'XI',
        semester: '1',
        bab: 1,
        judul: 'Membiasakan Berpikir Kritis dan Semangat Mencintai IPTEK',
        elemen: "Al-Qur'an & Hadis",
        ringkasan:
          'Mengkaji QS. Ali Imran/3: 190–191 dan QS. Ar-Rahman/55: 33 untuk membangun nalar ulul albab: zikir, pikir kritis, dan penguasaan ilmu pengetahuan teknologi.',
        apersepsi:
          'Al-Quran memerintahkan manusia merenungi langit dan bumi. Pelajar Muslim sejati tidak mudah menelan hoaks, melainkan memverifikasi informasi (tabayyun) dan berkarya dengan IPTEK.',
        pemantik:
          '1. Apa ciri utama generasi ulul albab menurut QS. Ali Imran: 190–191?\n2. Bagaimana etika pemanfaatan AI dan media digital agar tetap bernilai ibadah?',
        dnaPoin: [
          'Tafakur & Tadabbur Alam Semesta',
          'Tabayyun Sebelum Menyebarkan Info',
          'Sinergi Zikir dan Pikir (Ulul Albab)',
          'Inovasi IPTEK untuk Kemaslahatan'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: 'OarXrVcaIko',
        slideUrl: 'https://docs.google.com/presentation/d/1wzF3TmIOfhtEhDh5lw8f88_B2AWaRwj7/embed?slide=id.p1',
        pdfUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: 'https://drive.google.com/file/d/12Lmq9rXxVCD3ler7NVT5SJqKPgfaOCtE/preview',
        studiKasus:
          'Beredar kabar viral di grup pesan singkat yang memicu kepanikan dan prasangka antarwarga sekolah tanpa sumber jelas. Terapkan langkah berpikir kritis ulul albab dan prinsip tabayyun untuk menyikapi situasi ini!',
        nilaiKbc: 'Kejernihan berpikir disertai kasih sayang agar teknologi menyatukan, bukan memecah belah.',
        aktif: true
      },
      {
        id: 'MAT-XI-02',
        jenjang: 'XI',
        semester: '1',
        bab: 2,
        judul: 'Bukti Beriman: Memenuhi Janji, Mensyukuri Nikmat, Memelihara Lisan, Menutupi Aib',
        elemen: 'Akidah',
        ringkasan:
          'Membuktikan keimanan lewat integritas menepati janji, bersyukur atas nikmat Allah, menjaga ucapan (lisan & ketikan jari), serta menjaga privasi/aib sesama.',
        apersepsi:
          'Di zaman digital, "lisan" juga berarti jempol yang mengetik komentar. Keimanan seseorang diuji saat ia mampu menahan diri dari ghibah digital dan penyebaran aib.',
        pemantik:
          'Mengapa menyebarkan aib orang lain melalui tangkapan layar (screenshot) sangat bertentangan dengan bukti keimanan?',
        dnaPoin: [
          'Amanah & Menepati Janji',
          'Syukur dalam Ucapan & Aksi',
          'Menjaga Lisan & Ketikan Digital',
          'Menutup Aib Saudara'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: 'xbiScpFK3gs',
        slideUrl: 'https://docs.google.com/presentation/d/1sOLMBT5Kc_iOF4XlIGmRcDEZ8veHj4_a/embed?slide=id.p1',
        pdfUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Seorang teman melakukan kesalahan pribadi dan videonya hendak disebarkan agar viral. Bagaimana sikap seorang pelajar beriman berdasarkan prinsip memelihara lisan dan menutupi aib orang lain?',
        nilaiKbc: 'Menjaga kehormatan sesama dengan empati, kelembutan tutur kata, dan kasih sayang.',
        aktif: true
      },
      {
        id: 'MAT-XI-03',
        jenjang: 'XI',
        semester: '1',
        bab: 3,
        judul: 'Menghindari Perkelahian Pelajar, Minuman Keras, dan Narkoba',
        elemen: 'Akhlak',
        ringkasan:
          'Memahami bahaya sosial, hukum Islam, dan dampak merusak kekerasan antarpelajar, khamr, serta narkotika demi menjaga jiwa dan akal (hifdzun nafs wal aql).',
        apersepsi:
          'Kekuatan sejati seorang pemuda bukan pada keberanian menyakiti teman, melainkan pada kemampuannya mengendalikan amarah dan menjaga akal tetap sehat.',
        pemantik:
          'Langkah nyata apa yang bisa dilakukan OSIS/Rohis untuk menciptakan budaya sekolah anti-tawuran dan anti-narkoba?',
        dnaPoin: [
          'Mengendalikan Amarah',
          'Menjaga Akal Sehat (Hifdzul Aql)',
          'Menolak Miras & Narkoba',
          'Persaudaraan Pelajar Damai'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Bagaimana strategi menengahi konflik antarkelompok pelajar yang dipicu ejekan di media sosial tanpa kekerasan?',
        nilaiKbc: 'Menghormati keselamatan jiwa dan membangun persahabatan yang damai.',
        aktif: true
      },
      {
        id: 'MAT-XI-04',
        jenjang: 'XI',
        semester: '1',
        bab: 4,
        judul: 'Menebarkan Islam dengan Santun dan Damai Melalui Dakwah, Khutbah, dan Tablig',
        elemen: 'Fikih',
        ringkasan:
          'Memahami ketentuan, rukun, dan etika dakwah, khutbah, serta tablig yang menyejukkan dan membangun persatuan umat.',
        apersepsi:
          'Pesan kebaikan akan menyentuh hati apabila disampaikan dengan ketulusan, tutur kata santun, dan bebas ujaran kebencian.',
        pemantik:
          'Apa perbedaan mendasar antara khutbah, tablig, dan dakwah dalam kehidupan sehari-hari pelajar?',
        dnaPoin: [
          'Ketentuan Khutbah, Tablig, Dakwah',
          'Dakwah Santun Bil Hikmah',
          'Bebas Ujaran Kebencian',
          'Keteladanan Sikap Dai Muda'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Rancanglah kerangka kultum singkat 3 menit untuk teman sebaya bertema "Cinta Lingkungan & Anti-Bullying di Sekolah"!',
        nilaiKbc: 'Menyampaikan kebenaran dengan kelembutan hati dan rasa hormat.',
        aktif: true
      },
      {
        id: 'MAT-XI-05',
        jenjang: 'XI',
        semester: '1',
        bab: 5,
        judul: 'Meneladani Jejak Langkah Ulama Indonesia yang Mendunia',
        elemen: 'Sejarah Peradaban Islam',
        ringkasan:
          'Menggali kiprah intelektual dan spiritual ulama Nusantara seperti Syekh Nawawi al-Bantani, Syekh Ahmad Khatib al-Minangkabawi, KH Hasyim Asyari, dan KH Ahmad Dahlan.',
        apersepsi:
          'Ulama Indonesia bukan hanya tokoh lokal — karya-karya mereka menjadi rujukan keilmuan Islam di Mekkah hingga dunia internasional.',
        pemantik:
          'Ketekunan belajar ulama Nusantara mana yang paling menginspirasimu untuk berkarya sejak masa SMA?',
        dnaPoin: [
          'Semangat Literasi & Menulis Karya',
          'Rihlah Ilmiah (Merantau Menuntut Ilmu)',
          'Moderasi & Cinta Tanah Air',
          'Pengabdian untuk Masyarakat'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Bagaimana kita menghidupkan kembali tradisi literasi dan menulis karya ilmiah di kalangan pelajar PAI masa kini?',
        nilaiKbc: 'Kecintaan terhadap ilmu, guru, dan tanah air.',
        aktif: true
      },
      {
        id: 'MAT-XI-06',
        jenjang: 'XI',
        semester: '2',
        bab: 6,
        judul: 'Toleransi dan Memelihara Kehidupan Manusia',
        elemen: "Al-Qur'an & Hadis",
        ringkasan:
          'Menganalisis QS. Yunus/10: 40–41 dan QS. Al-Maidah/5: 32 tentang sikap tasamuh (toleransi), menghargai perbedaan, dan memelihara keselamatan jiwa manusia.',
        apersepsi:
          'Keberagaman adalah ketetapan Allah (sunnatullah). Toleransi berarti saling menghormati dalam kemanusiaan tanpa mengorbankan prinsip akidah.',
        pemantik:
          'Mengapa QS. Al-Maidah: 32 menyamakan penyelamatan satu nyawa dengan menyelamatkan seluruh umat manusia?',
        dnaPoin: [
          'Tasamuh (Toleransi Aktif)',
          'Menghargai Keberagaman',
          'Anti-Kekerasan & Kemanusiaan',
          'Moderasi Beragama'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Di sebuah kelas terdapat siswa dengan latar belakang suku dan keyakinan berbeda. Bagaimana contoh aksi nyata moderasi beragama yang menjaga kerukunan?',
        nilaiKbc: 'Pilar utama Kurikulum Berbasis Cinta: kasih sayang lintas perbedaan dan kerukunan.',
        aktif: true
      },
      {
        id: 'MAT-XI-08',
        jenjang: 'XI',
        semester: '2',
        bab: 8,
        judul: 'Adab Menggunakan Media Sosial dalam Islam',
        elemen: 'Akhlak',
        ringkasan:
          'Menerapkan etika digital Islami: menjaga niat, tabayyun sebelum berbagi, santun berkomentar, menjaga privasi, dan memanfaatkan medsos untuk konten maslahat.',
        apersepsi:
          'Setiap unggahan, komentar, dan like kita kelak dipertanggungjawabkan. Jadikan jejak digital kita sebagai jejak amal jariyah.',
        pemantik:
          'Buatlah 3 prinsip pribadi sebelum menekan tombol "Bagikan/Kirim" di media sosial!',
        dnaPoin: [
          'Saring Sebelum Sharing (Tabayyun)',
          'Santun Berkomentar & Anti-Hate Speech',
          'Menjaga Privasi Diri & Orang Lain',
          'Konten Kreatif Penuh Manfaat'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Ketika sebuah akun anonim menghina temanmu di kolom komentar, apa langkah bijak secara digital dan moral untuk menghentikannya?',
        nilaiKbc: 'Empati di ruang digital dan membangun ekosistem internet yang ramah.',
        aktif: true
      },
      {
        id: 'MAT-XI-09',
        jenjang: 'XI',
        semester: '2',
        bab: 9,
        judul: 'Ketentuan Pernikahan dalam Islam',
        elemen: 'Fikih',
        ringkasan:
          'Memahami hukum, rukun, syarat, hak-kewajiban suami istri, dan hikmah membangun keluarga sakinah, mawaddah, wa rahmah.',
        apersepsi:
          'Keluarga yang sehat berawal dari kesiapan mental, spiritual, tanggung jawab, dan pemahaman hukum yang matang.',
        pemantik:
          'Mengapa kesiapan ilmu, kedewasaan emosi, dan tanggung jawab menjadi kunci membangun keluarga sakinah?',
        dnaPoin: [
          'Tujuan Sakinah Mawaddah Rahmah',
          'Syarat & Rukun Pernikahan',
          'Kesetaraan Tanggung Jawab & Kasih Sayang',
          'Pencegahan Pernikahan Usia Dini'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://drive.google.com/file/d/1Q9AR9EehLoZnYl0GyqPbKsVKOJ_5lxol/preview',
        lkpdUrl: '',
        studiKasus:
          'Mengapa Islam menekankan konsep musyawarah dan kasih sayang (muasyarah bil maruf) dalam keluarga?',
        nilaiKbc: 'Cinta kasih yang bertanggung jawab dalam bingkai sakinah mawaddah wa rahmah.',
        aktif: true
      },
      {
        id: 'MAT-XII-01',
        jenjang: 'XII',
        semester: '1',
        bab: 1,
        judul: 'Sabar dalam Menghadapi Musibah dan Ujian',
        elemen: "Al-Qur'an & Hadis",
        ringkasan:
          'Mengkaji QS. Al-Baqarah/2: 155–156 dan QS. Ibrahim/14: 9 tentang ketangguhan mental, kesabaran aktif, dan husnuzan kepada Allah saat diuji.',
        apersepsi:
          'Sabar bukan pasrah tanpa usaha, melainkan keteguhan hati untuk tetap berbuat baik dan mencari solusi terbaik di tengah kesulitan.',
        pemantik:
          'Bagaimana membedakan sikap sabar yang produktif dengan sikap menyerah pada keadaan?',
        dnaPoin: [
          'Sabar dalam Ketaatan',
          'Sabar Menahan Diri dari Maksiat',
          'Sabar Saat Menerima Ujian (Istirja)',
          'Ikhtiar & Tawakal Positif'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://smartpai.kemenag.go.id',
        lkpdUrl: '',
        studiKasus:
          'Seorang siswa kelas XII gagal lolos seleksi jalur awal perguruan tinggi impiannya dan mulai putus asa. Bagaimana bimbingan konsep sabar dan husnuzan memulihkan semangatnya?',
        nilaiKbc: 'Kasih sayang diri sendiri, penguatan teman sebaya, dan prasangka baik kepada Allah.',
        aktif: true
      },
      {
        id: 'MAT-XII-04',
        jenjang: 'XII',
        semester: '1',
        bab: 4,
        judul: 'Kewarisan dalam Islam: Berbagi dalam Kearifan dan Keadilan',
        elemen: 'Fikih',
        ringkasan:
          'Memahami ketentuan ilmu faraid (ahli waris, bagian dzawil furudh, ashabah) sebagai wujud keadilan sosial dan penjagaan kerukunan keluarga.',
        apersepsi:
          'Aturan waris Islam diturunkan langsung rinciannya agar pembagian harta peninggalan berjalan adil dan tidak memutus tali silaturahmi keluarga.',
        pemantik:
          'Mengapa dalam hukum waris Islam pembagian hak selalu sejalan dengan besarnya tanggung jawab nafkah dalam keluarga?',
        dnaPoin: [
          'Rukun & Sebab Mewarisi',
          'Bagian Pasti (Dzawil Furudh)',
          'Keadilan Proporsional Syariat',
          'Menjaga Silaturahmi Keluarga'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://smartpai.kemenag.go.id',
        lkpdUrl: '',
        studiKasus:
          'Seorang wafat meninggalkan istri, 1 anak laki-laki, dan 1 anak perempuan dengan total harta bersih Rp240.000.000 (setelah melunasi utang dan wasiat). Hitunglah bagian masing-masing ahli waris beserta alasannya!',
        nilaiKbc: 'Menjaga keutuhan kasih sayang keluarga melalui keadilan pembagian hak.',
        aktif: true
      },
      {
        id: 'MAT-XII-08',
        jenjang: 'XII',
        semester: '2',
        bab: 8,
        judul: 'Menerapkan Sikap Toleransi, Cinta Tanah Air, dan Moderasi Beragama',
        elemen: 'Akhlak',
        ringkasan:
          'Menginternalisasi sikap tasamuh, cinta tanah air (hubbul wathan), dan peran generasi muda Muslim menjaga harmoni bangsa Indonesia.',
        apersepsi:
          'Cinta agama dan cinta tanah air tidak pernah bertentangan — keduanya saling menguatkan untuk membangun Indonesia yang damai dan bermartabat.',
        pemantik:
          'Kontribusi nyata apa yang dapat dilakukan alumni SMA dalam merawat persatuan di kampus dan masyarakat?',
        dnaPoin: [
          'Tasamuh & Kerukunan Umat',
          'Hubbul Wathan Minal Iman',
          'Anti-Radikalisme & Intoleransi',
          'Kolaborasi Kebaikan Lintas Elemen'
        ],
        coverImage: '',
        infografisUrl: '',
        galeriGambar: [],
        youtubeId: '',
        slideUrl: '',
        pdfUrl: '',
        bukuUrl: 'https://smartpai.kemenag.go.id',
        lkpdUrl: '',
        studiKasus:
          'Bagaimana peran pelajar Muslim ketika terjadi perbedaan pendapat keagamaan maupun sosial di ruang publik agar tetap menjunjung adab dan persatuan?',
        nilaiKbc: 'Islam Rahmatan lil Alamin: mencintai sesama warga bangsa dengan tulus.',
        aktif: true
      }
    ],

    tajwid: [
      {
        id: 'TJW-01',
        materiId: 'MAT-X-01',
        lafalArab: 'لِكُلٍّ جَعَلْنَا',
        transliterasi: "Likullin ja'alnaa",
        sumberAyat: 'QS. Al-Maidah: 48',
        hukum: 'Ikhfa Haqiqi',
        alasan: 'Terdapat kasrah tanwin (ـٍ) pada huruf lam bertemu huruf jim (ج).',
        caraBaca: 'Dibaca samar-samar antara izhar dan idgham dengan dengung (ghunnah) sepanjang 2 harakat.'
      },
      {
        id: 'TJW-02',
        materiId: 'MAT-X-01',
        lafalArab: 'فَاسْتَبِقُوا الْخَيْرَاتِ',
        transliterasi: 'Fastabiqul khairaat',
        sumberAyat: 'QS. Al-Maidah: 48',
        hukum: 'Alif Lam Qamariyah & Mad Arid Lissukun',
        alasan: 'Alif lam bertemu huruf kha (خ) yang bersifat qamariyah; di akhir waqaf terdapat mad thabii sebelum huruf mati.',
        caraBaca: 'Huruf lam dibaca jelas; jika waqaf di akhir ayat, bunyi "raat" dipanjangkan 2, 4, atau 6 harakat.'
      },
      {
        id: 'TJW-03',
        materiId: 'MAT-X-01',
        lafalArab: 'فَسَيَرَى اللَّهُ',
        transliterasi: 'Fasayarallaahu',
        sumberAyat: 'QS. At-Taubah: 105',
        hukum: 'Tafkhim pada Lam Jalalah',
        alasan: 'Lafadz Jalalah (الله) didahului oleh huruf berharakat fathah.',
        caraBaca: 'Huruf lam pada lafadz Allah dibaca tebal dan penuh (mulut agak membulat).'
      },
      {
        id: 'TJW-04',
        materiId: 'MAT-X-01',
        lafalArab: 'عَمَلَكُمْ وَرَسُولُهُ',
        transliterasi: "'Amalakum wa rasuuluhuu",
        sumberAyat: 'QS. At-Taubah: 105',
        hukum: 'Idzhar Syafawi',
        alasan: 'Mim sukun (مْ) bertemu huruf wawu (و).',
        caraBaca: 'Huruf mim mati dibaca jelas dengan merapatkan bibir tanpa mendengung panjang.'
      },
      {
        id: 'TJW-05',
        materiId: 'MAT-X-01',
        lafalArab: 'كُنتُمْ تَعْمَلُونَ',
        transliterasi: "Kuntum ta'maluun",
        sumberAyat: 'QS. At-Taubah: 105',
        hukum: 'Ikhfa Haqiqi & Idzhar Syafawi',
        alasan: 'Nun sukun bertemu ta (ت) adalah Ikhfa Haqiqi; mim sukun bertemu ta (ت) adalah Idzhar Syafawi.',
        caraBaca: 'Pada "kun-tum" disamarkan berdengung 2 harakat, sedangkan mim sukun pada "tum ta" dibaca jelas.'
      },
      {
        id: 'TJW-06',
        materiId: 'MAT-XI-01',
        lafalArab: 'لِأُولِي الْأَلْبَابِ',
        transliterasi: 'Li-ulil albaab',
        sumberAyat: 'QS. Ali Imran: 190',
        hukum: 'Alif Lam Qamariyah & Qalqalah Kubra',
        alasan: 'Alif lam bertemu hamzah/alif, dan huruf ba (ب) di akhir kalimat disukunkan karena waqaf.',
        caraBaca: 'Lam dibaca jelas; huruf ba akhir dipantulkan secara kuat saat berhenti (waqaf).'
      },
      {
        id: 'TJW-07',
        materiId: 'MAT-XI-01',
        lafalArab: 'مِن ذِكْرِ اللَّهِ',
        transliterasi: 'Min dzikrillaah',
        sumberAyat: 'Tematik Ulul Albab',
        hukum: 'Ikhfa Haqiqi & Tarqiq Lam Jalalah',
        alasan: 'Nun sukun bertemu dzal (ذ) dibaca ikhfa; Lafadz Jalalah didahului harakat kasrah.',
        caraBaca: 'Dengung samar 2 harakat pada nun mati, lalu lafadz Allah dibaca tipis (tarqiq).'
      },
      {
        id: 'TJW-08',
        materiId: 'MAT-XI-02',
        lafalArab: 'وَتَشْكُرُونَ',
        transliterasi: 'Wa tasykuruun',
        sumberAyat: 'Tematik Syukur Nikmat',
        hukum: 'Mad Arid Lissukun',
        alasan: 'Huruf mad (wawu sukun setelah dhammah) berada sebelum huruf akhir yang disukunkan ketika waqaf.',
        caraBaca: 'Boleh dipanjangkan 2, 4, atau 6 harakat secara konsisten saat berhenti.'
      }
    ],

    bankSoal: [
      {
        id: 'SOAL-01',
        jenjang: 'X',
        bab: 1,
        pertanyaan:
          'Dalam QS. Al-Maidah/5: 48 Allah Swt. memerintahkan umat Islam untuk berlomba-lomba dalam kebaikan (fastabiqul khairat). Sikap pelajar SMA yang paling mencerminkan ayat tersebut adalah...',
        opsi: [
          'Menunda tugas kelompok hingga mendekati tenggat waktu agar tidak terlalu lelah',
          'Aktif meningkatkan prestasi, membantu teman belajar, dan disiplin menyelesaikan amanah tepat waktu',
          'Menyalahkan teman jika proyek kelas gagal karena merasa sudah paling pintar',
          'Hanya mengerjakan tugas yang diberi nilai tambahan oleh guru',
          'Berusaha mengalahkan teman dengan menyembunyikan sumber belajar yang dimiliki'
        ],
        kunci: 1,
        pembahasan:
          'Fastabiqul khairat bermakna kompetisi sehat dalam kebaikan yang produktif, kolaboratif, dan penuh keikhlasan—bukan menjatuhkan orang lain.',
        level: 'HOTS (C4)'
      },
      {
        id: 'SOAL-02',
        jenjang: 'X',
        bab: 1,
        pertanyaan:
          'Perhatikan potongan ayat berikut: لِكُلٍّ جَعَلْنَا (QS. Al-Maidah: 48). Hukum bacaan tajwid pada kasrah tanwin bertemu huruf jim adalah...',
        opsi: [
          'Idzhar Halqi',
          'Idgham Bighunnah',
          'Ikhfa Haqiqi',
          'Iqlab',
          'Idzhar Syafawi'
        ],
        kunci: 2,
        pembahasan:
          'Huruf jim (ج) termasuk 15 huruf Ikhfa Haqiqi. Ketika nun mati atau tanwin bertemu jim, bacaannya disamarkan disertai dengung 2 harakat.',
        level: 'C2'
      },
      {
        id: 'SOAL-03',
        jenjang: 'X',
        bab: 1,
        pertanyaan:
          'Berdasarkan QS. At-Taubah/9: 105, Allah Swt., Rasul-Nya, dan orang-orang mukmin akan melihat setiap amal perbuatan manusia. Implikasi terkuat ayat ini bagi etos kerja pelajar di era digital adalah...',
        opsi: [
          'Mengerjakan ujian dengan jujur meskipun pengawas sedang tidak berada di ruangan',
          'Membuat dokumentasi foto setiap kali membantu orang tua agar dipuji warganet',
          'Menggunakan aplikasi AI untuk menyalin seluruh jawaban tugas tanpa membacanya',
          'Menunggu perintah guru berkali-kali sebelum memulai piket kelas',
          'Mengutamakan hasil akhir instan walaupun melanggar aturan sekolah'
        ],
        kunci: 0,
        pembahasan:
          'Kesadaran muraqabah (merasa diawasi Allah) melahirkan integritas tinggi dan kerja profesional meski tidak ada pengawasan manusia.',
        level: 'HOTS (C5)'
      },
      {
        id: 'SOAL-04',
        jenjang: 'X',
        bab: 1,
        pertanyaan:
          'Lafadz فَسَيَرَى اللَّهُ pada QS. At-Taubah: 105 memiliki hukum bacaan Lam Jalalah yang dibaca...',
        opsi: [
          'Tarqiq (tipis) karena huruf sebelumnya berharakat kasrah',
          'Tafkhim (tebal) karena didahului huruf berharakat fathah',
          'Qalqalah karena berada di tengah kalimat',
          'Idgham Bilaghunnah karena tidak menggunakan dengung',
          'Mad Wajib Muttashil selama 5 harakat'
        ],
        kunci: 1,
        pembahasan:
          'Lam Jalalah pada lafadz Allah dibaca tafkhim (tebal) apabila huruf sebelumnya berharakat fathah atau dhammah.',
        level: 'C3'
      },
      {
        id: 'SOAL-05',
        jenjang: 'X',
        bab: 1,
        pertanyaan:
          'Pada potongan ayat عَمَلَكُمْ وَرَسُولُهُ hukum bacaan mim sukun bertemu wawu adalah...',
        opsi: [
          'Ikhfa Syafawi',
          'Idgham Mimi',
          'Idzhar Syafawi',
          'Mad Thabii',
          'Ghunnah Musyaddadah'
        ],
        kunci: 2,
        pembahasan:
          'Mim sukun bertemu huruf selain mim dan ba disebut Idzhar Syafawi dan harus dibaca jelas, terutama saat bertemu wawu dan fa agar tidak tertukar menjadi ikhfa.',
        level: 'C2'
      },
      {
        id: 'SOAL-06',
        jenjang: 'XI',
        bab: 1,
        pertanyaan:
          'Menurut QS. Ali Imran/3: 190–191, ciri utama seorang Ulul Albab dalam merespons fenomena alam dan perkembangan IPTEK adalah...',
        opsi: [
          'Mengutamakan penelitian rasional sambil mengabaikan nilai ketuhanan',
          'Mengingat Allah dalam setiap keadaan (zikir) sekaligus memikirkan ciptaan-Nya secara kritis (pikir)',
          'Menghindari teknologi modern karena dikhawatirkan merusak tradisi',
          'Menerima semua berita viral di media sosial tanpa melakukan verifikasi',
          'Hanya fokus menghafal teori tanpa melakukan aksi nyata'
        ],
        kunci: 1,
        pembahasan:
          'QS. Ali Imran: 191 menggambarkan Ulul Albab memadukan zikir (spiritualitas) dan tafakur/pikir kritis sehingga teknologi selalu diarahkan untuk kemaslahatan.',
        level: 'HOTS (C4)'
      },
      {
        id: 'SOAL-07',
        jenjang: 'XI',
        bab: 1,
        pertanyaan:
          'Ketika menerima pesan berantai di grup kelas yang berisi kabar menyudutkan guru atau teman tanpa bukti valid, langkah pertama yang sesuai prinsip berpikir kritis Islami adalah...',
        opsi: [
          'Langsung meneruskan ke grup lain agar cepat diketahui banyak orang',
          'Memberi komentar emosional sebelum mengecek sumber beritanya',
          'Melakukan tabayyun (klarifikasi fakta dan sumber) serta tidak menyebarkan kabar yang belum pasti',
          'Menghapus akun media sosial seluruh anggota grup',
          'Memercayainya jika jumlah yang menyebarkan sudah sangat banyak'
        ],
        kunci: 2,
        pembahasan:
          'Tabayyun adalah pilar berpikir kritis dalam Islam (QS. Al-Hujurat: 6) guna mencegah fitnah dan perpecahan.',
        level: 'HOTS (C4)'
      },
      {
        id: 'SOAL-08',
        jenjang: 'XI',
        bab: 2,
        pertanyaan:
          'Salah satu bukti beriman yang sangat relevan di ruang digital saat ini adalah memelihara lisan dan menutupi aib sesama. Tindakan yang mencerminkan perilaku tersebut adalah...',
        opsi: [
          'Membagikan tangkapan layar percakapan pribadi teman sebagai bahan bercanda',
          'Menasihati teman secara empat mata dengan santun tanpa mempermalukannya di media sosial',
          'Membuat utas sindiran agar pelaku kesalahan merasa jera di depan publik',
          'Menjanjikan bantuan namun membatalkannya tanpa kabar',
          'Menganggap komentar kasar di kolom publik sebagai hal wajar'
        ],
        kunci: 1,
        pembahasan:
          'Menjaga kehormatan saudara dan menasihati dengan kelembutan secara tertutup merupakan cermin keimanan dan Kurikulum Berbasis Cinta.',
        level: 'HOTS (C5)'
      },
      {
        id: 'SOAL-09',
        jenjang: 'XII',
        bab: 1,
        pertanyaan:
          'Makna sabar yang tepat ketika seorang pelajar mengalami kegagalan dalam seleksi perlombaan atau ujian menurut perspektif PAI adalah...',
        opsi: [
          'Berhenti berusaha dan menyalahkan kondisi sekitar',
          'Menahan diri dari keluh kesah berlebihan, mengevaluasi kekurangan, dan terus berikhtiar dengan husnuzan',
          'Melampiaskan kekecewaan di media sosial dengan kata-kata kasar',
          'Menghindari semua aktivitas belajar agar tidak gagal lagi',
          'Membandingkan diri terus-menerus hingga merasa rendah diri'
        ],
        kunci: 1,
        pembahasan:
          'Kesabaran dalam Islam bersifat aktif dan konstruktif: menjaga ketenangan jiwa, melakukan refleksi, dan bangkit berikhtiar kembali.',
        level: 'HOTS (C4)'
      },
      {
        id: 'SOAL-10',
        jenjang: 'XII',
        bab: 4,
        pertanyaan:
          'Seorang wafat meninggalkan ahli waris yang terdiri dari seorang istri dan seorang anak laki-laki dengan total harta waris bersih Rp160.000.000. Berapakah bagian istri menurut ketentuan ilmu faraid?',
        opsi: [
          'Rp40.000.000 (1/4 karena ada anak)',
          'Rp20.000.000 (1/8 karena ada anak)',
          'Rp80.000.000 (1/2 dari harta)',
          'Rp53.333.000 (1/3 dari harta)',
          'Rp140.000.000 sebagai ashabah'
        ],
        kunci: 1,
        pembahasan:
          'Dalam QS. An-Nisa: 12, istri memperoleh bagian 1/8 apabila pewaris meninggalkan anak/keturunan (1/8 x Rp160.000.000 = Rp20.000.000), sedangkan sisanya (Rp140.000.000) menjadi bagian anak laki-laki sebagai ashabah.',
        level: 'HOTS (C3)'
      }
    ],

    absensi: [
      {
        id: 'ABS-001',
        timestamp: '2026-08-18T07:35:00',
        jadwalId: 'JDW-001',
        tanggal: '2026-08-18',
        jadwal: 'Jam 1–2 (07.15–08.45)',
        materi: 'Bab 1: Kompetisi dalam Kebaikan dan Etos Kerja (QS. Al-Maidah: 48)',
        kelas: 'X M1',
        nisn: '0091000101',
        nama: 'Ahmad Fauzan',
        status: 'Hadir',
        catatan: 'Aktif bedah ayat'
      },
      {
        id: 'ABS-002',
        timestamp: '2026-08-18T07:35:00',
        jadwalId: 'JDW-001',
        tanggal: '2026-08-18',
        jadwal: 'Jam 1–2 (07.15–08.45)',
        materi: 'Bab 1: Kompetisi dalam Kebaikan dan Etos Kerja (QS. Al-Maidah: 48)',
        kelas: 'X M1',
        nisn: '0091000102',
        nama: 'Siti Aisyah',
        status: 'Hadir',
        catatan: ''
      },
      {
        id: 'ABS-003',
        timestamp: '2026-08-18T07:35:00',
        jadwalId: 'JDW-001',
        tanggal: '2026-08-18',
        jadwal: 'Jam 1–2 (07.15–08.45)',
        materi: 'Bab 1: Kompetisi dalam Kebaikan dan Etos Kerja (QS. Al-Maidah: 48)',
        kelas: 'X M1',
        nisn: '0091000103',
        nama: 'Rafa Aditya',
        status: 'Izin',
        catatan: 'Izin lomba sekolah'
      },
      {
        id: 'ABS-004',
        timestamp: '2026-08-18T07:35:00',
        jadwalId: 'JDW-001',
        tanggal: '2026-08-18',
        jadwal: 'Jam 1–2 (07.15–08.45)',
        materi: 'Bab 1: Kompetisi dalam Kebaikan dan Etos Kerja (QS. Al-Maidah: 48)',
        kelas: 'X M1',
        nisn: '0091000104',
        nama: 'Aulia Putri',
        status: 'Hadir',
        catatan: ''
      },
      {
        id: 'ABS-005',
        timestamp: '2026-11-18T09:00:00',
        jadwalId: 'JDW-002',
        tanggal: '2026-11-18',
        jadwal: 'Jam 3–4 (09.00–10.30)',
        materi: 'Bab 1: Membiasakan Berpikir Kritis & Mencintai IPTEK',
        kelas: 'XI M1',
        nisn: '0081100101',
        nama: 'Muhammad Rizky',
        status: 'Hadir',
        catatan: ''
      },
      {
        id: 'ABS-006',
        timestamp: '2026-11-18T09:00:00',
        jadwalId: 'JDW-002',
        tanggal: '2026-11-18',
        jadwal: 'Jam 3–4 (09.00–10.30)',
        materi: 'Bab 1: Membiasakan Berpikir Kritis & Mencintai IPTEK',
        kelas: 'XI M1',
        nisn: '0081100102',
        nama: 'Zahra Humaira',
        status: 'Hadir',
        catatan: ''
      }
    ],

    evaluasi: [
      {
        id: 'EVL-001',
        timestamp: '2026-11-18T09:10:00',
        nama: 'Ahmad Fauzan (Contoh)',
        kelas: 'X M1',
        jenjang: 'X',
        bab: 1,
        skor: 100,
        benar: 5,
        totalSoal: 5,
        waktuDetik: 145
      },
      {
        id: 'EVL-002',
        timestamp: '2026-11-18T09:18:00',
        nama: 'Siti Aisyah (Contoh)',
        kelas: 'X M1',
        jenjang: 'X',
        bab: 1,
        skor: 80,
        benar: 4,
        totalSoal: 5,
        waktuDetik: 170
      },
      {
        id: 'EVL-003',
        timestamp: '2026-11-18T10:05:00',
        nama: 'Muhammad Rizky (Contoh)',
        kelas: 'XI M1',
        jenjang: 'XI',
        bab: 1,
        skor: 100,
        benar: 2,
        totalSoal: 2,
        waktuDetik: 92
      }
    ],

    ruangKritis: [
      {
        id: 'KRIT-001',
        timestamp: '2026-11-18T09:25:00',
        nama: 'Siswa X M1 (Terkurasi)',
        kelas: 'X M1',
        materiId: 'MAT-X-01',
        analisis:
          'Berdasarkan QS. At-Taubah: 105, sikap Budi lebih mencerminkan etos kerja Islami karena Allah dan Rasul-Nya menilai kesungguhan amal di balik layar, bukan sekadar pencitraan foto. Namun Andi tetap bisa diajak berkolaborasi secara santun agar dokumentasi ditujukan untuk inspirasi kebaikan, bukan pamer.',
        nilaiKbc: 'Keikhlasan & Empati Kolaborasi',
        dikurasi: true
      },
      {
        id: 'KRIT-002',
        timestamp: '2026-11-18T10:20:00',
        nama: 'Siswa XI M1 (Terkurasi)',
        kelas: 'XI M1',
        materiId: 'MAT-XI-01',
        analisis:
          'Pelajar ulul albab tidak langsung menyebarkan kabar yang belum tentu benar. Langkah pertamanya adalah tabayyun ke pihak sekolah/wali kelas, menenangkan suasana dengan kata-kata lembut, dan mengajak teman menjaga kedamaian sekolah.',
        nilaiKbc: 'Tabayyun & Kasih Sayang',
        dikurasi: true
      }
    ],

    amaliyah: [
      {
        id: 'AML-001',
        timestamp: '2026-11-18T19:30:00',
        nama: 'Siti Aisyah (Contoh)',
        kelas: 'X M1',
        bab: 'Bab 1: Etos Kerja & Fastabiqul Khairat',
        lulusSensorGadget: true,
        zeroProkrastinasi: true,
        petarungFokus: true,
        pencapaianTerbaik: 'Membatasi screen time hiburan maksimal 1 jam/hari dan langsung merapikan catatan tajwid sepulang sekolah.',
        refleksiKbc: 'Menolong adik belajar mengaji di rumah dengan penuh kesabaran dan kasih sayang.'
      }
    ],

    tugas: [
      {
        id: 'TGS-001',
        timestamp: '2026-11-18T14:20:00',
        nama: 'Ahmad Fauzan (Contoh)',
        kelas: 'X M1',
        bab: 'Bab 1 (Kelas X)',
        jenisTugas: 'Infografis Etos Kerja Islami',
        fileUrl: 'https://drive.google.com/file/d/1XZyrDERANb5lDWOsc3z3LoLXbxktf4If/preview',
        catatan: 'TugasPAIBP_XM1_AhmadFauzan.pdf'
      }
    ],

    diskusi: [
      {
        id: 'DSK-001',
        timestamp: '2026-11-18T08:40:00',
        materiId: 'MAT-X-01',
        nama: 'Perwakilan Kelas X M1',
        kelas: 'X M1',
        pesan: 'Dari video bedah ayat QS. Al-Maidah: 48 hari ini, saya belajar bahwa perbedaan di sekolah adalah peluang untuk saling berlomba memberi manfaat, bukan saling merendahkan.'
      },
      {
        id: 'DSK-002',
        timestamp: '2026-11-18T08:52:00',
        materiId: 'MAT-X-01',
        nama: 'Perwakilan Kelas X M2',
        kelas: 'X M2',
        pesan: 'Tantangan terbesar saya adalah menunda tugas karena scroll medsos. Mulai hari ini saya pakai target 25 menit belajar fokus tanpa HP!'
      }
    ],

    galeri: [
      {
        id: 'GAL-001',
        judul: 'Analisis HOTS Terbaik: Ikhlas Bekerja ala QS. At-Taubah 105',
        kelas: 'X M1',
        kategori: 'Analisis HOTS',
        kreator: 'Siswa X M1 (Pilihan Guru)',
        ringkasan:
          'Menjelaskan perbandingan etos kerja Budi vs Andi secara mendalam dengan mengaitkan konsep muraqabah (diawasi Allah) dan etika dokumentasi sosial media.',
        gambarUrl: '',
        tautan: ''
      },
      {
        id: 'GAL-002',
        judul: 'Jurnal Amaliyah: Gerakan Anti-Prokrastinasi & Peduli Sesama',
        kelas: 'X M2',
        kategori: 'Amaliyah KBC',
        kreator: 'Siswa X M2 (Pilihan Guru)',
        ringkasan:
          'Konsisten menyelesaikan tantangan mingguan Zero Prokrastinasi selama 7 hari penuh dan menginisiasi pojok baca doa di kelas.',
        gambarUrl: '',
        tautan: ''
      },
      {
        id: 'GAL-003',
        judul: 'Karya Tabayyun Digital & Poster Anti-Hoaks Ulul Albab',
        kelas: 'XI M1',
        kategori: 'Karya Kreatif',
        kreator: 'Siswa XI M1 (Pilihan Guru)',
        ringkasan:
          'Infografis edukatif tentang 4 langkah saring sebelum sharing berdasarkan QS. Ali Imran: 190–191 dan adab bermedia sosial.',
        gambarUrl: '',
        tautan: ''
      }
    ],

    belajarCategoriesMeta: [
      { id: 'cat-thaharah', kategoriId: 'thaharah', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Thaharah & Bersuci' },
      { id: 'cat-shalat', kategoriId: 'shalat', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Shalat Wajib & Sunnah' },
      { id: 'cat-jenazah', kategoriId: 'jenazah', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Penyelenggaraan Jenazah' },
      { id: 'cat-zakat', kategoriId: 'zakat', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Zakat & Simulasi Hitungan' },
      { id: 'cat-haji', kategoriId: 'haji', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Haji & Umrah (Manasik)' },
      { id: 'cat-tajwid', kategoriId: 'tajwid', kategoriTitle: 'Kartu Kategori Utama', defaultJudul: 'Ilmu Tajwid & Contoh Suara' }
    ],

    belajarTopicsMeta: [
      { id: 'thaharah-wudhu', kategoriId: 'thaharah', kategoriTitle: 'Thaharah & Bersuci', defaultJudul: 'Praktikum Wudhu Lengkap', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Wudhu Sesuai Syariat Bimas Islam Kemenag' },
      { id: 'thaharah-tayamum', kategoriId: 'thaharah', kategoriTitle: 'Thaharah & Bersuci', defaultJudul: 'Praktikum Tayamum', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Tayamum Fiqih Islam Kemenag' },
      { id: 'thaharah-mandi', kategoriId: 'thaharah', kategoriTitle: 'Thaharah & Bersuci', defaultJudul: 'Praktikum Mandi Wajib (Janabah/Haid)', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Mandi Wajib Junub PAI Kemenag' },

      { id: 'shalat-fardhu', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Fardhu 5 Waktu', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Fardhu Lengkap Tuntunan Kemenag' },
      { id: 'shalat-jumat', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Jumat & Dua Khutbah', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Jumat dan Khutbah PAI Kemenag' },
      { id: 'shalat-dhuha', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Dhuha', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Dhuha dan Doa Kemenag' },
      { id: 'shalat-tahajud', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Tahajud & Witir', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Tahajud dan Witir Kemenag' },
      { id: 'shalat-tarawih', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Tarawih & Witir', defaultYoutubeId: '', youtubeQuery: 'Tuntunan Shalat Tarawih Ramadhan Kemenag RI' },
      { id: 'shalat-hajat-istikharah', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Hajat & Istikharah', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Hajat dan Istikharah Kemenag' },
      { id: 'shalat-id-gerhana', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: 'Shalat Idul Fitri/Adha & Gerhana', defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Idul Fitri dan Gerhana Bimas Islam Kemenag' },
      { id: 'shalat-jama-qashar', kategoriId: 'shalat', kategoriTitle: 'Shalat Wajib & Sunnah', defaultJudul: "Shalat Jama' & Qashar", defaultYoutubeId: '', youtubeQuery: 'Tata Cara Shalat Jamak dan Qashar PAI Kemenag' },

      { id: 'jenazah-mandi', kategoriId: 'jenazah', kategoriTitle: 'Penyelenggaraan Jenazah', defaultJudul: '1. Memandikan Jenazah', defaultYoutubeId: 'EUy787UM6Sr', youtubeQuery: 'Tutorial Memandikan Jenazah Kemenag RI' },
      { id: 'jenazah-kafan', kategoriId: 'jenazah', kategoriTitle: 'Penyelenggaraan Jenazah', defaultJudul: '2. Mengkafani Jenazah', defaultYoutubeId: 'EUy787UM6Sr', youtubeQuery: 'Tutorial Mengkafani Jenazah Laki dan Perempuan Kemenag' },
      { id: 'jenazah-shalat', kategoriId: 'jenazah', kategoriTitle: 'Penyelenggaraan Jenazah', defaultJudul: '3. Menyalatkan Jenazah', defaultYoutubeId: 'QH6QfzK6aYM', youtubeQuery: 'Tutorial Shalat Jenazah Resmi Kemenag RI' },
      { id: 'jenazah-kubur', kategoriId: 'jenazah', kategoriTitle: 'Penyelenggaraan Jenazah', defaultJudul: '4. Menguburkan Jenazah', defaultYoutubeId: 'QH6QfzK6aYM', youtubeQuery: 'Tutorial Menguburkan Jenazah Pemulasaraan Kemenag' },

      { id: 'zakat-fitrah', kategoriId: 'zakat', kategoriTitle: 'Zakat & Simulasi Hitungan', defaultJudul: '1. Praktikum Zakat Fitrah', defaultYoutubeId: 'FhvxhoAAYiX', youtubeQuery: 'Literasi Zakat Fitrah Bimas Islam Kemenag BAZNAS' },
      { id: 'zakat-maal', kategoriId: 'zakat', kategoriTitle: 'Zakat & Simulasi Hitungan', defaultJudul: '2. Zakat Maal (Emas, Tabungan & Pertanian)', defaultYoutubeId: 'GqRjM-3eZF_4', youtubeQuery: 'Zakat Mal Bimas Islam Kemenag BAZNAS' },
      { id: 'zakat-profesi', kategoriId: 'zakat', kategoriTitle: 'Zakat & Simulasi Hitungan', defaultJudul: '3. Zakat Profesi & 8 Golongan Asnaf', defaultYoutubeId: 'GqRjM-3eZF_4', youtubeQuery: 'Zakat Penghasilan Profesi BAZNAS Kemenag' },
      { id: 'zakat-simulasi', kategoriId: 'zakat', kategoriTitle: 'Zakat & Simulasi Hitungan', defaultJudul: '4. Simulasi & Hitungan Zakat Interaktif', defaultYoutubeId: 'FhvxhoAAYiX', youtubeQuery: 'Cara Menghitung Zakat Mal dan Fitrah BAZNAS Kemenag' },

      { id: 'haji-syarat-rukun', kategoriId: 'haji', kategoriTitle: 'Haji & Umrah (Manasik)', defaultJudul: '1. Rukun, Wajib, & Jenis Pelaksanaan Haji', defaultYoutubeId: 'dYKstMQiKW0', youtubeQuery: 'Manasik Haji Online Rukun Haji Kemenag RI' },
      { id: 'haji-ihram-miqat', kategoriId: 'haji', kategoriTitle: 'Haji & Umrah (Manasik)', defaultJudul: '2. Praktikum Ihram, Miqat & Talbiyah', defaultYoutubeId: 'NGnqYq16t6c', youtubeQuery: 'Manasik Haji Online Niat Ihram Kemenag RI' },
      { id: 'haji-thawaf-sai', kategoriId: 'haji', kategoriTitle: 'Haji & Umrah (Manasik)', defaultJudul: "3. Praktikum Thawaf, Sa'i & Tahallul", defaultYoutubeId: 'Q8s-Xw83MKA', youtubeQuery: 'Manasik Haji Online Thawaf dan Sai Kemenag RI' },
      { id: 'haji-wukuf-jumrah', kategoriId: 'haji', kategoriTitle: 'Haji & Umrah (Manasik)', defaultJudul: '4. Wukuf Arafah, Mabit & Lempar Jumrah', defaultYoutubeId: 'yXaoKUYeKjo', youtubeQuery: 'Manasik Haji Online Wukuf di Arafah Kemenag RI' },

      { id: 'tajwid-makhraj', kategoriId: 'tajwid', kategoriTitle: 'Ilmu Tajwid & Contoh Suara', defaultJudul: '1. Makharijul Huruf (5 Tempat Keluar Huruf)', defaultYoutubeId: 'QFYwyvI7fdH', youtubeQuery: 'Ilmu Tajwid Makharijul Huruf Lajnah Kemenag RI' },
      { id: 'tajwid-nun', kategoriId: 'tajwid', kategoriTitle: 'Ilmu Tajwid & Contoh Suara', defaultJudul: '2. Hukum Nun Sukun & Tanwin', defaultYoutubeId: 'HaOkAPB7xHH', youtubeQuery: 'Hukum Nun Sukun dan Tanwin Lajnah Kemenag PAI' },
      { id: 'tajwid-mim', kategoriId: 'tajwid', kategoriTitle: 'Ilmu Tajwid & Contoh Suara', defaultJudul: '3. Hukum Mim Sukun & Ghunnah', defaultYoutubeId: 'HaOkAPB7xHH', youtubeQuery: 'Hukum Mim Sukun Idzhar Ikhfa Idgham Mimi Tajwid' },
      { id: 'tajwid-mad-qalqalah', kategoriId: 'tajwid', kategoriTitle: 'Ilmu Tajwid & Contoh Suara', defaultJudul: '4. Hukum Mad (Panjang) & Qalqalah', defaultYoutubeId: 'QFYwyvI7fdH', youtubeQuery: 'Hukum Bacaan Mad dan Qalqalah Lajnah Kemenag' },
      { id: 'tajwid-lam-waqaf', kategoriId: 'tajwid', kategoriTitle: 'Ilmu Tajwid & Contoh Suara', defaultJudul: "5. Lam Ta'rif (Al-) & Tanda-Tanda Waqaf", defaultYoutubeId: 'g0v2K_X9SyA', youtubeQuery: 'Al Qamariyah Al Syamsiyah Tanda Waqaf Lajnah Kemenag' }
    ],

    belajarTopicPrayers: {
      'thaharah-wudhu': [
        { key: '0', label: 'Niat Wudhu', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-wudhu.mp3' },
        { key: '1', label: 'Doa Setelah Wudhu', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' }
      ],
      'thaharah-tayamum': [
        { key: '0', label: 'Niat Tayamum', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-tayamum.mp3' }
      ],
      'thaharah-mandi': [
        { key: '0', label: 'Niat Mandi Wajib Janabah', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-mandi-janabah.mp3' },
        { key: '1', label: 'Niat Mandi Wajib Setelah Haid', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-mandi-haid.mp3' }
      ],
      'shalat-fardhu': [
        { key: '0', label: 'Niat Shalat Dzuhur', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-shalat-dzuhur.mp3' },
        { key: '1', label: 'Bacaan Rukuk, I\'tidal & Sujud', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' }
      ],
      'shalat-jumat': [
        { key: '0', label: 'Niat Shalat Jumat (Makmum)', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-shalat-jumat.mp3' }
      ],
      'shalat-dhuha': [
        { key: '0', label: 'Niat & Doa Shalat Dhuha', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-doa-dhuha.mp3' }
      ],
      'shalat-tahajud': [
        { key: '0', label: 'Niat Shalat Tahajud & Witir', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-tahajud-witir.mp3' }
      ],
      'shalat-tarawih': [
        { key: '0', label: 'Niat Shalat Tarawih (Makmum)', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-tarawih.mp3' }
      ],
      'shalat-hajat-istikharah': [
        { key: '0', label: 'Niat Shalat Hajat & Istikharah', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-hajat-istikharah.mp3' }
      ],
      'shalat-id-gerhana': [
        { key: '0', label: 'Bacaan Tasbih Shalat Id', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/tasbih-id.mp3' }
      ],
      'shalat-jama-qashar': [
        { key: '0', label: 'Niat Jama\' Taqdim Qashar', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-jama-qashar.mp3' }
      ],
      'jenazah-mandi': [
        { key: '0', label: 'Niat Memandikan Jenazah (Laki/Perempuan)', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-mandi-jenazah.mp3' }
      ],
      'jenazah-kafan': [
        { key: '0', label: 'Doa Saat Mengkafani Jenazah', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/doa-mengkafani.mp3' }
      ],
      'jenazah-shalat': [
        { key: '0', label: 'Niat Shalat Jenazah (Mayyiti/Mayyitati)', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-shalat-jenazah.mp3' },
        { key: '1', label: 'Doa Takbir ke-3 Jenazah', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' },
        { key: '2', label: 'Doa Takbir ke-4 & Salam', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/doa-takbir4-jenazah.mp3' }
      ],
      'jenazah-kubur': [
        { key: '0', label: 'Bacaan Meletakkan & Doa Mengubur Jenazah', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' }
      ],
      'zakat-fitrah': [
        { key: '0', label: 'Niat Zakat Fitrah', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-zakat-fitrah.mp3' }
      ],
      'zakat-maal': [
        { key: '0', label: 'Niat Zakat Maal', builtin: true, source: 'Audio Arab Otomatis', defaultAudioUrl: 'audio/niat-zakat-maal.mp3' }
      ],
      'zakat-profesi': [
        { key: '0', label: 'Dalil 8 Asnaf (QS. At-Taubah: 60)', builtin: true, source: 'Qari Al-Husary / Alafasy' }
      ],
      'haji-syarat-rukun': [
        { key: '0', label: 'Dalil Istitha\'ah (QS. Ali \'Imran: 97)', builtin: true, source: 'Qari Al-Husary / Alafasy' }
      ],
      'haji-ihram-miqat': [
        { key: '0', label: 'Kalimat Talbiyah Haji & Umrah', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' }
      ],
      'haji-thawaf-sai': [
        { key: '0', label: 'Doa Rukun Yamani (QS. Al-Baqarah: 201)', builtin: true, source: 'Qari Al-Husary / Alafasy' }
      ],
      'haji-wukuf-jumrah': [
        { key: '0', label: 'Takbir Melontar Jumrah', builtin: true, source: 'Syaikh Hamad (Hisnul Muslim)' }
      ]
    },

    guruRiwayat: [
      {
        id: 'RWT-01',
        kategori: 'Mengajar',
        periode: '2021 – Sekarang',
        judul: 'Guru Mata Pelajaran PAI & Budi Pekerti',
        instansi: 'SMAN 20 Tebo, Provinsi Jambi',
        keterangan: 'Mengampu pembelajaran PAI-BP Kelas X, XI, XII serta pembinaan karakter dan keagamaan siswa.',
        urutan: 1
      },
      {
        id: 'RWT-02',
        kategori: 'Pendidikan',
        periode: 'Lulus S1 & PPG',
        judul: 'S1 Pendidikan Agama Islam (PAI) & PPG Dalam Jabatan (Gr.)',
        instansi: 'UIN / LPTK Kementerian Agama RI',
        keterangan: 'Kualifikasi akademik Pendidikan Agama Islam bersertifikat pendidik profesional.',
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
        keterangan: 'Peningkatan kompetensi pedagogik, perancangan soal HOTS, dan literasi digital pendidikan agama.',
        urutan: 4
      }
    ],

    belajarConfig: [],
    belajarKomentar: []
  };
})();
