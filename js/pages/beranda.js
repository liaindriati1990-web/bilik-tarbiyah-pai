/**
 * Halaman Beranda — Bilik Tarbiyah Digital
 * Menampilkan Hero Banner Slider (dikelola dari Admin), statistik live, akses cepat, & pilar Kemenag.
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.beranda = function renderBeranda(container) {
  const { escapeHtml, safeUrl, resolveImageUrl } = window.BTD_UI;
  const api = window.BTD_API;
  const cfg = api.state.data.pengaturan;
  const stats = api.getAnalytics();

  const slides = (api.state.data.banners || [])
    .filter((b) => b.aktif !== false)
    .sort((a, b) => Number(a.urutan || 0) - Number(b.urutan || 0));

  const teacherPhoto = resolveImageUrl(cfg.teacherPhotoUrl);
  const teacherInitial = escapeHtml((cfg.teacherName || 'L').trim().charAt(0).toUpperCase());
  const instansiLogo = resolveImageUrl(cfg.instansiLogoUrl);
  const schoolLogo = resolveImageUrl(cfg.schoolLogoUrl);
  const instansiName = String(cfg.namaInstansi || 'Pemerintah Provinsi Jambi').trim();
  const schoolName = String(cfg.schoolName || 'Satuan Pendidikan').trim();
  const defaultSlideFallback =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#042f24"/><stop offset="100%" stop-color="#0f766e"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="940" cy="180" r="190" fill="#f59e0b" opacity="0.16"/><path d="M940 80 L965 138 L1026 146 L980 188 L992 248 L940 218 L888 248 L900 188 L854 146 L915 138 Z" fill="#f59e0b" fill-opacity="0.22" stroke="#fde68a" stroke-width="2"/></svg>`
    );

  let activeSlide = 0;

  container.innerHTML = `
    <section class="hero hero-modern">
      <div class="hero-orb hero-orb-1" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-2" aria-hidden="true"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="hero-eyebrow">✨ Inovasi Pembelajaran Digital PAI • Kurikulum Merdeka</span>

          <div class="hero-instansi-bar">
            <div class="hero-dual-logos" aria-label="Logo Instansi dan Logo Sekolah">
              ${instansiLogo
      ? `<img class="hero-emblem-img" src="${escapeHtml(instansiLogo)}" alt="Logo ${escapeHtml(instansiName)}" />`
      : `<span class="hero-emblem-placeholder" title="Logo Instansi (atur di Panel Guru → Logo & Tema)">🏛️</span>`
    }
              ${schoolLogo
      ? `<img class="hero-emblem-img" src="${escapeHtml(schoolLogo)}" alt="Logo ${escapeHtml(schoolName)}" />`
      : `<span class="hero-emblem-placeholder" title="Logo Sekolah (atur di Panel Guru → Logo & Tema)">🏫</span>`
    }
            </div>
            <div class="hero-instansi-text">
              <span class="hero-instansi-name">${escapeHtml(instansiName)}</span>
              <strong class="hero-school-name">${escapeHtml(schoolName)}</strong>
            </div>
          </div>

          <h1>${escapeHtml(cfg.siteName)}: Belajar PAI Lebih <span class="hero-title-accent">Bermakna, Kritis, &amp; Penuh Cinta</span></h1>
          <p class="hero-lead">
            Ekosistem pembelajaran <strong>Pendidikan Agama Islam &amp; Budi Pekerti</strong> berbasis
            <strong>Deep Learning</strong> dan <strong>Kurikulum Berbasis Cinta (KBC)</strong> — memadukan
            bedah ayat &amp; tajwid interaktif, ruang kritis HOTS, evaluasi CBT langsung, serta jurnal amaliyah siswa
            dalam satu portal terintegrasi.
          </p>
          <div class="hero-actions">
            <a href="#materi" class="btn btn-gold hero-btn-glow">📖 Mulai Belajar Sekarang</a>
            <a href="#riwayat" class="btn btn-ghost-light">📅 Jadwal &amp; Riwayat Mengajar</a>
            <button type="button" class="btn btn-ghost-light" id="home-open-login">🔐 Login Siswa / Guru</button>
          </div>

          <div class="teacher-chip card-hover card-wiggle-click">
            ${teacherPhoto
      ? `<img class="teacher-avatar teacher-avatar-lg" src="${escapeHtml(teacherPhoto)}" alt="${escapeHtml(cfg.teacherName)}" />`
      : `<div class="teacher-avatar teacher-avatar-lg">${teacherInitial}</div>`
    }
            <div style="line-height:1.3;">
              <strong style="font-size:14px;display:block;color:#fff;">${escapeHtml(cfg.teacherName)}</strong>
              <small style="font-size:12px;color:#d1fae5;">${escapeHtml(cfg.teacherTitle || 'Guru PAI-BP')} • ${escapeHtml(schoolName)} (${escapeHtml(cfg.academicYear)})</small>
            </div>
          </div>
        </div>

        <!-- Hero Banner Slider -->
        <div class="hero-slider-wrap">
          <div class="hero-slider" id="hero-slider" aria-label="Slider Banner Halaman Depan">
            ${slides.length > 0
      ? `<div class="slider-counter-badge" id="slider-counter">Slide 1 / ${slides.length}</div>`
      : ''
    }
            <div class="hero-slider-track">
              ${slides.length === 0
      ? `<div class="hero-slide active" style="display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">
                      <div>
                        <span class="tag tag-gold">Bilik Tarbiyah Digital</span>
                        <h4 style="margin:12px 0 6px;">Belum Ada Slide Banner Aktif</h4>
                        <p style="font-size:13px;color:#a7f3d0;">Tambahkan atau unggah foto banner dari Panel Guru → Banner Slide.</p>
                      </div>
                    </div>`
      : slides
        .map((s, idx) => {
          const img = resolveImageUrl(s.imageUrl) || defaultSlideFallback;
          const ctaHref = safeUrl(s.ctaLink) || '#materi';
          return `<div class="hero-slide ${idx === 0 ? 'active' : ''}" data-slide-idx="${idx}">
                          <img src="${escapeHtml(img)}" alt="${escapeHtml(s.judul)}" />
                          <div class="hero-slide-caption">
                            ${s.badge ? `<span class="tag tag-gold">${escapeHtml(s.badge)}</span>` : ''}
                            <h4>${escapeHtml(s.judul)}</h4>
                            ${s.deskripsi ? `<p>${escapeHtml(s.deskripsi)}</p>` : ''}
                            ${s.ctaLabel
              ? `<div style="margin-top:8px;"><a href="${escapeHtml(ctaHref)}" class="btn btn-gold btn-sm">${escapeHtml(s.ctaLabel)} →</a></div>`
              : ''
            }
                          </div>
                        </div>`;
        })
        .join('')
    }
            </div>

            ${slides.length > 1
      ? `<div class="slider-controls-bar">
                     <button type="button" class="slider-nav-btn" id="slider-prev" aria-label="Slide sebelumnya">‹</button>
                     <div class="slider-dots">
                       ${slides
        .map(
          (_, idx) => `<button type="button" class="slider-dot ${idx === 0 ? 'active' : ''}" data-slide-dot="${idx}" aria-label="Pilih slide ${idx + 1}"></button>`
        )
        .join('')}
                     </div>
                     <button type="button" class="slider-nav-btn" id="slider-next" aria-label="Slide berikutnya">›</button>
                   </div>`
      : ''
    }
          </div>
        </div>
      </div>
    </section>

    <!-- Floating Live Bento Metrics Strip -->
    <section class="hero-metrics-float">
      <div class="container">
        <div class="mini-stats mini-stats-bento">
          <div class="mini-stat mini-stat-card card-hover tone-emerald">
            <div class="mini-stat-icon is-emerald">📚</div>
            <div>
              <strong>${stats.totalMateri}</strong>
              <span>Bab Materi PAI (X–XII)</span>
            </div>
          </div>
          <div class="mini-stat mini-stat-card card-hover tone-gold">
            <div class="mini-stat-icon is-gold">🕌</div>
            <div>
              <strong>${stats.totalTajwid}</strong>
              <span>Kartu Bedah Tajwid Interaktif</span>
            </div>
          </div>
          <div class="mini-stat mini-stat-card card-hover tone-sky">
            <div class="mini-stat-icon is-sky">🎯</div>
            <div>
              <strong>${stats.avgScore}</strong>
              <span>Rata-rata Skor Smart Test</span>
            </div>
          </div>
          <div class="mini-stat mini-stat-card card-hover tone-rose">
            <div class="mini-stat-icon is-rose">🌟</div>
            <div>
              <strong>${stats.totalAmaliyah + stats.totalHots}</strong>
              <span>Refleksi HOTS &amp; Amaliyah</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Akses Cepat 4 Pilar -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <span class="section-kicker">Navigasi Utama Portal</span>
            <h2>Akses Cepat Ekosistem Pembelajaran</h2>
            <p>Semua aktivitas belajar PAI terpusat dalam satu portal — ringan kuota dan responsif di smartphone.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="home-open-ai">✨ Buka Asisten Belajar PAI</button>
        </div>

        <div class="grid grid-4">
          <a href="#materi" class="card card-hover quick-bento-card tone-emerald accent-emerald">
            <div class="quick-bento-top">
              <span class="quick-bento-icon is-emerald">📖</span>
              <span class="tag tag-emerald">1. Pembelajaran</span>
            </div>
            <h3>Ruang Materi, Evaluasi &amp; Amaliyah</h3>
            <p>
              Apersepsi, video &amp; gambar, bedah tajwid, ruang renungan, analisis HOTS, Smart Test, &amp; jurnal amaliyah terpadu per bab.
            </p>
            <span class="quick-bento-link">Buka Ruang Materi →</span>
          </a>

          <a href="#riwayat" class="card card-hover quick-bento-card tone-sky accent-sky">
            <div class="quick-bento-top">
              <span class="quick-bento-icon is-sky">📅</span>
              <span class="tag tag-sky">2. Pantauan Publik</span>
            </div>
            <h3>Jadwal &amp; Riwayat PAI</h3>
            <p>
              Lihat jadwal pembelajaran Daring/Luring dan riwayat materi terlaksana per bulan lengkap dengan rekap kehadirannya.
            </p>
            <span class="quick-bento-link">Cek Jadwal &amp; Riwayat →</span>
          </a>

          <a href="#siswa" class="card card-hover quick-bento-card tone-gold accent-gold">
            <div class="quick-bento-top">
              <span class="quick-bento-icon is-gold">🎓</span>
              <span class="tag tag-gold">3. Akun NISN</span>
            </div>
            <h3>Portal Siswa (NISN)</h3>
            <p>
              Masuk dengan NISN untuk memantau profil belajar, mengisi presensi Daring, serta mengerjakan aktivitas tiap bab.
            </p>
            <span class="quick-bento-link">Masuk Portal Siswa →</span>
          </a>

          <a href="#tentang?tab=galeri" class="card card-hover quick-bento-card tone-violet accent-violet">
            <div class="quick-bento-top">
              <span class="quick-bento-icon is-violet">🏆</span>
              <span class="tag tag-violet">4. Apresiasi</span>
            </div>
            <h3>Galeri Karya Siswa</h3>
            <p>
              Etalase analisis HOTS terbaik, jurnal amaliyah inspiratif, dan prestasi siswa yang terkurasi aman privasinya.
            </p>
            <span class="quick-bento-link">Jelajahi Karya Siswa →</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Pilar Kebijakan Kemenag -->
    <section class="section" style="background:#fff;border-top:1px solid var(--slate-200);border-bottom:1px solid var(--slate-200);">
      <div class="container">
        <div class="section-header">
          <div>
            <span class="section-kicker">Landasan Pedagogis</span>
            <h2>Pilar Pedagogis &amp; Inovasi Kemenag RI</h2>
            <p>Dirancang selaras dengan arah transformasi PAI Kemenag: Pembelajaran Mendalam, Kasih Sayang, dan Digitalisasi Hemat Biaya.</p>
          </div>
        </div>

        <div class="grid grid-3">
          <div class="card card-hover pilar-modern-card tone-teal">
            <div class="pilar-card-head">
              <span class="tag tag-emerald">Mindful &amp; Meaningful</span>
              <span class="pilar-step-num">01</span>
            </div>
            <h3>Alur Deep Learning 5 Tahap</h3>
            <p>
              Setiap bab membimbing siswa melewati <strong>Apersepsi Kontekstual</strong>, <strong>Bedah Ayat &amp; Tajwid</strong>,
              <strong>Ruang Renungan</strong>, <strong>Studi Kasus HOTS</strong>, hingga <strong>Aksi Nyata Amaliyah</strong>.
            </p>
          </div>

          <div class="card card-hover pilar-modern-card tone-rose">
            <div class="pilar-card-head">
              <span class="tag tag-rose">Mahabbah &amp; Rahmatan lil 'Alamin</span>
              <span class="pilar-step-num">02</span>
            </div>
            <h3>Kurikulum Berbasis Cinta (KBC)</h3>
            <p>
              Menghidupkan nilai kasih sayang kepada Allah, empati antarsesama, moderasi beragama, serta etika digital
              santun dalam refleksi harian siswa.
            </p>
          </div>

          <div class="card card-hover pilar-modern-card tone-gold">
            <div class="pilar-card-head">
              <span class="tag tag-gold">Zero-Budget IT Infrastructure</span>
              <span class="pilar-step-num">03</span>
            </div>
            <h3>Gratis, Cepat, &amp; Mudah Direplikasi</h3>
            <p>
              Frontend statis di <strong>GitHub Pages</strong> terhubung ke <strong>Google Apps Script + Google Sheets</strong>
              tanpa sewa server, bebas iklan, dan siap diduplikasi guru PAI di seluruh Indonesia.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Hadis & CTA -->
    <section class="section">
      <div class="container">
        <div class="hadis-box hadis-showcase">
          <span class="tag tag-gold" style="margin-bottom:12px;">✨ Kata Mutiara Ilmu • HR. Muslim</span>
          <blockquote>
            "Barang siapa menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga."
          </blockquote>
          <p class="hadis-sub">
            Siap memperkuat pemahaman agama sekaligus membuktikan iman lewat karya nyata hari ini?
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            <a href="#materi" class="btn btn-gold">Buka Ruang Materi Kelas X, XI, XII</a>
            <a href="#riwayat" class="btn btn-ghost-light">Lihat Jadwal &amp; Riwayat Pembelajaran</a>
            <a href="#tentang" class="btn btn-ghost-light">Tentang Kami &amp; Portofolio</a>
          </div>
        </div>
      </div>
    </section>
  `;

  function showSlide(nextIdx) {
    if (!slides.length) return;
    activeSlide = (nextIdx + slides.length) % slides.length;
    container.querySelectorAll('[data-slide-idx]').forEach((el) => {
      el.classList.toggle('active', Number(el.getAttribute('data-slide-idx')) === activeSlide);
    });
    container.querySelectorAll('[data-slide-dot]').forEach((el) => {
      el.classList.toggle('active', Number(el.getAttribute('data-slide-dot')) === activeSlide);
    });
    const counter = document.getElementById('slider-counter');
    if (counter) counter.textContent = `Slide ${activeSlide + 1} / ${slides.length}`;
  }

  if (slides.length > 1) {
    const prev = document.getElementById('slider-prev');
    const next = document.getElementById('slider-next');
    if (prev) prev.addEventListener('click', () => showSlide(activeSlide - 1));
    if (next) next.addEventListener('click', () => showSlide(activeSlide + 1));
    container.querySelectorAll('[data-slide-dot]').forEach((dot) => {
      dot.addEventListener('click', () => showSlide(Number(dot.getAttribute('data-slide-dot'))));
    });

    let hovered = false;
    const sliderEl = document.getElementById('hero-slider');
    if (sliderEl) {
      sliderEl.addEventListener('mouseenter', () => { hovered = true; });
      sliderEl.addEventListener('mouseleave', () => { hovered = false; });
    }

    const timer = setInterval(() => {
      if (!document.getElementById('hero-slider')) {
        clearInterval(timer);
        return;
      }
      if (!hovered) showSlide(activeSlide + 1);
    }, 5500);
  }

  const aiBtn = document.getElementById('home-open-ai');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => window.BTD_UI.openAiAssistantModal());
  }

  const loginBtn = document.getElementById('home-open-login');
  if (loginBtn && window.BTD_UI.openLoginChoiceModal) {
    loginBtn.addEventListener('click', () => window.BTD_UI.openLoginChoiceModal());
  }
};
