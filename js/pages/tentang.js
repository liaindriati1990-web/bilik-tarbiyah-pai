/**
 * Halaman Tentang Kami — Bilik Tarbiyah Digital
 * Terdiri dari 4 tab terstruktur:
 * 1. Portofolio Inovasi Kemenag (Best Practice STAR & Metrik Live)
 * 2. Kontak Kami (Identitas & Alamat Sekolah, Email, Telepon/WA, Guru Pengampu)
 * 3. Galeri Karya & Refleksi Siswa Terkurasi
 * 4. Kebijakan Privasi & Dasar Hukum Pengembangan
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.tentang = function renderTentang(container, routeParams = {}) {
  const { escapeHtml, safeUrl, resolveImageUrl, renderBarChart, openImageLightbox } = window.BTD_UI;
  const api = window.BTD_API;

  const validTabs = ['portofolio', 'kontak', 'galeri', 'privasi'];
  let activeTab = validTabs.includes(routeParams.tab) ? routeParams.tab : 'portofolio';
  let filterJenjang = 'Semua';

  function sanitizeEmail(val) {
    const clean = String(val || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) ? clean : '';
  }

  function sanitizeWaUrl(phone) {
    const digits = String(phone || '').replace(/[^\d]/g, '');
    if (digits.length < 8) return '';
    const norm = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
    return `https://wa.me/${norm}`;
  }

  function renderPortofolioTab(cfg, stats) {
    const classBars = stats.classChart.map((c) => ({ label: c.label, value: c.avg }));
    const teacherPhoto = resolveImageUrl(cfg.teacherPhotoUrl);
    const teacherInitial = escapeHtml((cfg.teacherName || 'L').trim().charAt(0).toUpperCase());
    const allRiwayat = typeof api.getGuruRiwayatList === 'function'
      ? api.getGuruRiwayatList()
      : (Array.isArray(api.state.data.guruRiwayat) ? api.state.data.guruRiwayat : []);

    const sectionsMeta = [
      { key: 'Mengajar', icon: '🏫', title: 'Riwayat Mengajar', tagCls: 'tag-emerald', empty: 'Belum ada data riwayat mengajar.' },
      { key: 'Pendidikan', icon: '🎓', title: 'Riwayat Pendidikan', tagCls: 'tag-sky', empty: 'Belum ada data riwayat pendidikan.' },
      { key: 'Penghargaan', icon: '🏆', title: 'Riwayat Penghargaan &amp; Prestasi', tagCls: 'tag-gold', empty: 'Belum ada data riwayat penghargaan.' },
      { key: 'Diklat', icon: '📜', title: 'Riwayat Diklat &amp; Pelatihan', tagCls: 'tag-violet', empty: 'Belum ada data riwayat diklat.' }
    ];

    const grouped = {};
    sectionsMeta.forEach((s) => {
      grouped[s.key] = allRiwayat.filter((r) => String(r && r.kategori || '').toLowerCase() === s.key.toLowerCase());
    });

    const renderSectionCard = (meta) => {
      const rows = grouped[meta.key] || [];
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            <div>
              <span class="tag ${meta.tagCls}">${meta.icon} ${meta.title}</span>
            </div>
            <small style="color:var(--slate-500);font-weight:700;">${rows.length} Catatan</small>
          </div>
          ${rows.length === 0
            ? `<p style="margin:0;font-size:13.5px;color:var(--slate-500);">${meta.empty}</p>`
            : `<div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width:140px;">Periode / Tahun</th>
                      <th>${meta.key === 'Pendidikan' ? 'Jenjang &amp; Program Studi' : meta.key === 'Penghargaan' ? 'Penghargaan / Prestasi' : meta.key === 'Diklat' ? 'Nama Diklat / Pelatihan' : 'Jabatan / Bidang Tugas'}</th>
                      <th>Instansi / Penyelenggara</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows
                      .map(
                        (r) => `<tr>
                          <td><strong>${escapeHtml(r.periode || '-')}</strong></td>
                          <td><strong>${escapeHtml(r.judul || '-')}</strong></td>
                          <td>${escapeHtml(r.instansi || '-')}</td>
                          <td style="font-size:13px;color:var(--slate-700);">${escapeHtml(r.keterangan || '-')}</td>
                        </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
          }
        </div>
      `;
    };

    return `
      <div class="grid grid-2">
        <div class="card card-hover card-wiggle-click tone-emerald teacher-identity-card">
          <span class="tag tag-emerald">Profil Pendidik &amp; Satuan Pendidikan</span>
          <div class="teacher-identity-head">
            ${
              teacherPhoto
                ? `<img class="teacher-showcase-photo-sm" src="${escapeHtml(teacherPhoto)}" alt="${escapeHtml(cfg.teacherName)}" />`
                : `<div class="teacher-showcase-photo-sm teacher-showcase-placeholder">${teacherInitial}</div>`
            }
            <div class="teacher-identity-meta">
              <h2 style="margin:0 0 4px;">${escapeHtml(cfg.teacherName)}</h2>
              <p style="margin:0;color:#ffffff;font-size:13.5px;">
                ${escapeHtml(cfg.teacherTitle || 'Guru PAI & Budi Pekerti')} • <strong>${escapeHtml(cfg.schoolName)}</strong> (${escapeHtml(cfg.academicYear)})
              </p>
              ${cfg.teacherNip ? `<small style="color:rgba(255,255,255,0.92);">NIP/NUPTK: ${escapeHtml(cfg.teacherNip)}</small>` : ''}
            </div>
          </div>
          <p class="teacher-identity-bio">
            ${escapeHtml(cfg.teacherBio || 'Pendidik PAI-BP yang berfokus pada pembelajaran mendalam (Deep Learning) dan Kurikulum Berbasis Cinta.')}
          </p>
          <div class="teacher-identity-links">
            <a href="${escapeHtml(safeUrl(cfg.kemenagUrl) || 'https://pendis.kemenag.go.id')}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost-light btn-sm">Ditjen Pendis Kemenag ↗</a>
          </div>
        </div>

        <div class="card">
          <span class="tag tag-gold">📊 Rekam Jejak Portofolio Pendidik</span>
          <h3 style="margin:10px 0 12px;">Ringkasan Kualifikasi &amp; Pengalaman Guru</h3>
          <div class="grid grid-2 portfolio-mini-grid-2x2" style="margin-bottom:12px;">
            <div class="callout callout-emerald portfolio-mini-stat">
              <div class="portfolio-mini-num" style="color:var(--emerald-900);">${(grouped.Mengajar || []).length}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">🏫 Riwayat Mengajar</div>
            </div>
            <div class="callout portfolio-mini-stat">
              <div class="portfolio-mini-num" style="color:var(--slate-900);">${(grouped.Pendidikan || []).length}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">🎓 Riwayat Pendidikan</div>
            </div>
            <div class="callout callout-gold portfolio-mini-stat">
              <div class="portfolio-mini-num" style="color:var(--gold-600);">${(grouped.Penghargaan || []).length}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">🏆 Penghargaan &amp; Prestasi</div>
            </div>
            <div class="callout portfolio-mini-stat">
              <div class="portfolio-mini-num" style="color:var(--slate-900);">${(grouped.Diklat || []).length}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">📜 Diklat &amp; Pelatihan</div>
            </div>
          </div>
          <small style="color:var(--slate-600);display:block;">Data profil &amp; rekam jejak dikelola langsung oleh Guru Pengampu melalui Pengaturan Identitas Guru.</small>
        </div>
      </div>

      ${sectionsMeta.map(renderSectionCard).join('')}

      <div class="grid grid-2">
        <div class="card">
          <h3 style="margin:0 0 12px;">📈 Indikator Dampak Pembelajaran Kelas</h3>
          <div class="grid grid-2 portfolio-mini-grid-2x2">
            <div class="callout callout-emerald portfolio-mini-stat">
              <div class="portfolio-mini-num is-impact" style="color:var(--emerald-900);">${stats.attendanceRate}%</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">Persentase Kehadiran (${stats.totalAbsensi} catatan)</div>
            </div>
            <div class="callout callout-gold portfolio-mini-stat">
              <div class="portfolio-mini-num is-impact" style="color:var(--gold-600);">${stats.masteryRate}%</div>
              <div class="portfolio-mini-label" style="color:var(--slate-700);">Ketuntasan Evaluasi (Skor ≥ 75)</div>
            </div>
            <div class="callout portfolio-mini-stat">
              <div class="portfolio-mini-num is-impact" style="color:var(--slate-900);">${stats.totalHots}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-600);">Respons Analisis Ruang Kritis HOTS</div>
            </div>
            <div class="callout portfolio-mini-stat">
              <div class="portfolio-mini-num is-impact" style="color:var(--slate-900);">${stats.totalAmaliyah}</div>
              <div class="portfolio-mini-label" style="color:var(--slate-600);">Jurnal Amaliyah &amp; Karakter KBC</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 12px;">📊 Rata-Rata Nilai Evaluasi per Kelas</h3>
          ${renderBarChart(classBars, ' poin')}
        </div>
      </div>
    `;
  }

  function renderKontakTab(cfg) {
    const logoSrc = resolveImageUrl(cfg.schoolLogoUrl || cfg.siteLogoUrl);
    const teacherPhoto = resolveImageUrl(cfg.teacherPhotoUrl);
    const teacherInitial = escapeHtml((cfg.teacherName || 'L').trim().charAt(0).toUpperCase());
    const emailClean = sanitizeEmail(cfg.schoolEmail);
    const waUrl = sanitizeWaUrl(cfg.schoolPhone);
    const webUrl = safeUrl(cfg.schoolWebsite);
    const mapsUrl = safeUrl(cfg.schoolMapsUrl);

    return `
      <div class="grid grid-2">
        <div class="card card-hover card-wiggle-click tone-emerald">
          <span class="tag tag-emerald">Identitas Resmi Satuan Pendidikan</span>
          <div style="display:flex;align-items:center;gap:14px;margin:14px 0;">
            ${
              logoSrc
                ? `<img src="${escapeHtml(logoSrc)}" alt="Logo ${escapeHtml(cfg.schoolName)}" style="width:68px;height:68px;border-radius:14px;object-fit:contain;padding:4px;border:1.5px solid var(--emerald-200);background:#f8fafc;flex-shrink:0;" />`
                : `<div style="width:68px;height:68px;border-radius:14px;background:var(--emerald-900);color:#fde68a;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;flex-shrink:0;">🏫</div>`
            }
            <div>
              ${cfg.namaInstansi ? `<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:var(--emerald-700);margin-bottom:2px;">${escapeHtml(cfg.namaInstansi)}</div>` : ''}
              <h2 style="margin:0 0 4px;">${escapeHtml(cfg.schoolName || 'Satuan Pendidikan')}</h2>
              <small style="color:var(--slate-600);">
                ${cfg.schoolNpsn ? `NPSN: <strong>${escapeHtml(cfg.schoolNpsn)}</strong> • ` : ''}${escapeHtml(cfg.academicYear || '')}
              </small>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <tbody>
                <tr><th style="width:155px;">Alamat Sekolah</th><td>${escapeHtml(cfg.schoolAddress || '-')}</td></tr>
                <tr><th>Kabupaten / Provinsi</th><td>${escapeHtml(cfg.schoolCity || '-')}</td></tr>
                <tr><th>Email Layanan</th><td>${emailClean ? `<a href="mailto:${escapeHtml(emailClean)}">${escapeHtml(emailClean)}</a>` : escapeHtml(cfg.schoolEmail || '-')}</td></tr>
                <tr><th>Telepon / WhatsApp</th><td>${escapeHtml(cfg.schoolPhone || '-')}</td></tr>
                <tr><th>Jam Layanan</th><td>${escapeHtml(cfg.schoolHours || 'Senin–Sabtu, 07.15–14.30 WIB')}</td></tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;">
            ${emailClean ? `<a href="mailto:${escapeHtml(emailClean)}" class="btn btn-primary btn-sm">✉️ Kirim Email</a>` : ''}
            ${waUrl ? `<a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-sm">💬 Hubungi via WhatsApp ↗</a>` : ''}
            ${webUrl ? `<a href="${escapeHtml(webUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">🌐 Website Sekolah ↗</a>` : ''}
            ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">📍 Lihat Lokasi Maps ↗</a>` : ''}
          </div>
        </div>

        <div class="card card-hover card-wiggle-click tone-gold" id="card-teacher-showcase">
          <span class="tag tag-gold">✨ Pendidik &amp; Pengelola Portal PAI</span>
          <div class="teacher-showcase-row">
            ${
              teacherPhoto
                ? `<img class="teacher-showcase-photo" src="${escapeHtml(teacherPhoto)}" alt="${escapeHtml(cfg.teacherName)}" />`
                : `<div class="teacher-showcase-photo teacher-showcase-placeholder">${teacherInitial}</div>`
            }
            <div class="teacher-showcase-meta">
              <h2 style="margin:0 0 6px;">${escapeHtml(cfg.teacherName)}</h2>
              <div style="font-size:14px;font-weight:700;color:var(--emerald-800);margin-bottom:4px;">${escapeHtml(cfg.teacherTitle || 'Guru PAI & Budi Pekerti')}</div>
              ${cfg.teacherNip ? `<small style="display:block;color:var(--slate-600);margin-bottom:8px;">NIP / NUPTK: <strong>${escapeHtml(cfg.teacherNip)}</strong></small>` : ''}
              <span class="tag tag-emerald">${escapeHtml(cfg.schoolName || '')}</span>
            </div>
          </div>

          <div class="callout callout-emerald" style="margin-bottom:14px;">
            <p style="margin:0;font-size:13.8px;color:var(--slate-700);">
              ${escapeHtml(cfg.teacherBio || 'Pengampu pembelajaran Pendidikan Agama Islam dan Budi Pekerti dengan pendekatan Deep Learning & Kurikulum Berbasis Cinta.')}
            </p>
          </div>

          <div class="callout">
            <strong style="font-size:13.5px;color:var(--slate-900);">Bantuan Akun Siswa &amp; Konsultasi Belajar</strong>
            <p style="margin:6px 0 0;font-size:13.3px;color:var(--slate-600);">
              Apabila peserta didik mengalami kendala NISN pada Portal Siswa, perbaikan data kelas, atau konfirmasi tugas daring, silakan hubungi Guru Pengampu melalui kontak resmi sekolah di samping.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderGaleriTab() {
    const galeri = (api.state.data.galeri || []).filter((g) => {
      if (filterJenjang === 'Semua') return true;
      return String(g.kelas || '').toUpperCase().startsWith(filterJenjang + ' ');
    });
    const curatedHots = (api.state.data.ruangKritis || []).filter((r) => r.dikurasi);

    return `
      <div class="filter-bar">
        <div class="filter-group">
          ${['Semua', 'X', 'XI', 'XII']
            .map(
              (j) => `<button type="button" class="tab-btn ${filterJenjang === j ? 'active' : ''}" data-gal-filter="${j}">
                ${j === 'Semua' ? 'Semua Kelas' : 'Kelas ' + j}
              </button>`
            )
            .join('')}
        </div>
        <span class="tag tag-emerald">Total ${galeri.length} Karya Terkurasi</span>
      </div>

      <div class="grid grid-3">
        ${
          galeri.length === 0
            ? `<div class="card" style="grid-column:1/-1;text-align:center;">Belum ada karya terkurasi pada filter kelas ini.</div>`
            : galeri
                .map((g) => {
                  const imgSrc = resolveImageUrl(g.gambarUrl);
                  return `<article class="card card-hover" style="display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                    <div>
                      ${imgSrc ? `<img class="card-cover-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(g.judul)}" style="cursor:pointer;" data-gal-zoom="${escapeHtml(imgSrc)}" data-gal-title="${escapeHtml(g.judul)}" />` : ''}
                      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                        <span class="tag tag-gold">${escapeHtml(g.kategori)}</span>
                        <span class="tag tag-emerald">${escapeHtml(g.kelas)}</span>
                      </div>
                      <h3 style="margin:0 0 8px;font-size:17px;">${escapeHtml(g.judul)}</h3>
                      <p style="margin:0;font-size:13.8px;color:var(--slate-600);">${escapeHtml(g.ringkasan)}</p>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--slate-100);">
                      <small style="color:var(--slate-500);font-weight:600;">👤 ${escapeHtml(g.kreator)}</small>
                      ${
                        ((window.BTD_UI && window.BTD_UI.safeNavUrl) || safeUrl)(g.tautan)
                          ? `<a href="${escapeHtml(((window.BTD_UI && window.BTD_UI.safeNavUrl) || safeUrl)(g.tautan))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Lihat Karya ↗</a>`
                          : ''
                      }
                    </div>
                  </article>`;
                })
                .join('')
        }
      </div>

      <div class="card">
        <div class="section-header" style="margin-bottom:14px;">
          <div>
            <h2 style="font-size:20px;">Sorotan Analisis Ruang Kritis (HOTS) Pilihan Guru</h2>
            <p>Contoh penalaran kritis siswa yang memadukan dalil Al-Qur'an dan nilai Kurikulum Berbasis Cinta.</p>
          </div>
        </div>
        <div class="grid grid-2">
          ${
            curatedHots.length === 0
              ? `<p style="color:var(--slate-500);margin:0;">Belum ada analisis HOTS yang dikurasi guru.</p>`
              : curatedHots
                  .map(
                    (h) => `<div class="callout callout-emerald">
                      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                        <strong>Siswa ${escapeHtml(h.kelas || '')} (Terkurasi Guru)</strong>
                        <span class="tag tag-gold">${escapeHtml(h.nilaiKbc)}</span>
                      </div>
                      <p style="margin:0;font-size:13.8px;color:var(--slate-700);">"${escapeHtml(h.analisis)}"</p>
                    </div>`
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  function renderPrivasiTab(cfg) {
    return `
      <div class="grid grid-2">
        <div class="card">
          <span class="tag tag-emerald">Landasan Yuridis &amp; Kebijakan Pendidikan</span>
          <h2 style="margin:10px 0 12px;">Dasar Hukum Pengembangan Portal</h2>
          <p style="margin:0 0 14px;font-size:13.8px;color:var(--slate-600);">
            Pengembangan dan penyelenggaraan <strong>${escapeHtml(cfg.siteName)}</strong> di <strong>${escapeHtml(cfg.schoolName)}</strong> berpedoman pada ketentuan peraturan perundang-undangan yang berlaku di Indonesia:
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13.5px;color:var(--slate-700);">
            <div class="callout">
              <strong>1. UU No. 20 Tahun 2003 — Sistem Pendidikan Nasional</strong>
              <p style="margin:4px 0 0;">Menjamin hak peserta didik mendapatkan pendidikan agama sesuai agama yang dianut serta memanfaatkan teknologi pembelajaran yang bermutu.</p>
            </div>
            <div class="callout">
              <strong>2. UU No. 14 Tahun 2005 — Guru dan Dosen</strong>
              <p style="margin:4px 0 0;">Mandat pengembangan kompetensi pedagogik dan profesional guru melalui pemanfaatan teknologi informasi dan inovasi pembelajaran.</p>
            </div>
            <div class="callout">
              <strong>3. PP No. 55 Tahun 2007 — Pendidikan Agama &amp; Pendidikan Keagamaan</strong>
              <p style="margin:4px 0 0;">Mengatur penyelenggaraan Pendidikan Agama Islam yang membentuk manusia beriman, bertakwa, dan berakhlak mulia.</p>
            </div>
            <div class="callout">
              <strong>4. UU No. 27 Tahun 2022 — Perlindungan Data Pribadi (UU PDP)</strong>
              <p style="margin:4px 0 0;">Mengatur pemrosesan data pribadi peserta didik secara terbatas, sah, transparan, dan aman sesuai tujuan pendidikan sekolah.</p>
            </div>
            <div class="callout">
              <strong>5. UU No. 11 Tahun 2008 jo. UU No. 1 Tahun 2024 (UU ITE) &amp; Kebijakan PAI Kemenag RI</strong>
              <p style="margin:4px 0 0;">Mendukung ekosistem digital sekolah yang beretika, Implementasi Kurikulum Merdeka PAI, serta program <em>Smart PAI</em> dan <em>Kurikulum Berbasis Cinta (KBC)</em> Ditjen Pendis Kemenag RI.</p>
            </div>
          </div>
        </div>

        <div class="card">
          <span class="tag tag-sky">Tata Kelola Keamanan &amp; Privasi Siswa</span>
          <h2 style="margin:10px 0 12px;">Kebijakan Privasi Pengguna</h2>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13.8px;color:var(--slate-700);">
            <div class="callout callout-emerald">
              <strong>1. Data yang Dikelola</strong>
              <p style="margin:5px 0 0;">
                Portal memproses data akademik terbatas berupa Nama Siswa, NISN, Kelas, Daftar Hadir, Skor Smart Test CBT, Refleksi HOTS/Amaliyah, serta berkas tugas yang diunggah peserta didik.
              </p>
            </div>
            <div class="callout">
              <strong>2. Tujuan Penggunaan Eksklusif Pendidikan</strong>
              <p style="margin:5px 0 0;">
                Seluruh data digunakan semata-mata untuk proses pembelajaran, asesmen formatif/sumatif, pembinaan karakter, dan pelaporan akademik internal oleh Guru Pengampu di ${escapeHtml(cfg.schoolName)}. Data tidak diperjualbelikan atau dibagikan kepada pihak komersial mana pun.
              </p>
            </div>
            <div class="callout">
              <strong>3. Kontrol Akses &amp; Penyimpanan Terisolasi</strong>
              <p style="margin:5px 0 0;">
                Database tersimpan secara terisolasi pada penyimpanan resmi milik Sekolah/Madrasah pengampu. Halaman umum hanya menayangkan informasi publik, agenda belajar, serta karya yang telah dikurasi dan disetujui guru; akses pengubahan nilai dan data kelas terkunci oleh otentikasi Panel Guru, sementara presensi daring siswa terkunci dengan NISN per jadwal aktif.
              </p>
            </div>
            <div class="callout callout-gold">
              <strong>4. Hak Koreksi &amp; Penghapusan Data</strong>
              <p style="margin:5px 0 0;">
                Peserta didik maupun orang tua/wali berhak mengajukan pembaruan atau penghapusan data yang keliru melalui Guru Pengampu pada tab <strong>Kontak Kami</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const cfg = api.state.data.pengaturan || {};
    const stats = api.getAnalytics();
    const tabs = [
      { id: 'portofolio', label: '👩‍🏫 Portofolio Guru' },
      { id: 'kontak', label: '📞 Kontak Kami' },
      { id: 'galeri', label: `🏆 Galeri Karya (${(api.state.data.galeri || []).length})` },
      { id: 'privasi', label: '⚖️ Kebijakan Privasi & Dasar Hukum' }
    ];

    let tabHtml = '';
    if (activeTab === 'portofolio') tabHtml = renderPortofolioTab(cfg, stats);
    else if (activeTab === 'kontak') tabHtml = renderKontakTab(cfg);
    else if (activeTab === 'galeri') tabHtml = renderGaleriTab();
    else tabHtml = renderPrivasiTab(cfg);

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Profil Pendidik, Galeri, &amp; Transparansi Portal PAI</span>
            <h1>Tentang Kami — ${escapeHtml(cfg.siteName)}</h1>
            <p>${escapeHtml(cfg.schoolName)} • ${escapeHtml(cfg.academicYear)} — Portofolio rekam jejak guru pengampu, informasi kontak sekolah, etalase karya siswa, serta dasar hukum &amp; privasi data.</p>
          </div>
          ${
            activeTab === 'portofolio'
              ? `<button type="button" class="btn btn-gold btn-sm no-print" id="btn-print-portfolio">🖨️ Cetak / Simpan PDF Portofolio</button>`
              : ''
          }
        </div>
      </div>

      <div class="container" style="display:flex;flex-direction:column;gap:22px;">
        <div class="tabs tentang-tab-bar no-print">
          ${tabs
            .map(
              (t) => `<button type="button" class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-tentang-tab="${t.id}">${escapeHtml(t.label)}</button>`
            )
            .join('')}
        </div>

        ${tabHtml}
      </div>
    `;

    container.querySelectorAll('[data-tentang-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tentang-tab');
        render();
      });
    });

    const printBtn = document.getElementById('btn-print-portfolio');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    container.querySelectorAll('[data-gal-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterJenjang = btn.getAttribute('data-gal-filter');
        render();
      });
    });

    container.querySelectorAll('[data-gal-zoom]').forEach((img) => {
      img.addEventListener('click', () => {
        openImageLightbox(img.getAttribute('data-gal-title'), img.getAttribute('data-gal-zoom'));
      });
    });
  }

  render();
};
