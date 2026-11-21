/**
 * Halaman Ruang Materi PAI (Kelas X, XI, XII)
 * Terintegrasi 6 Tahap Deep Learning & KBC:
 * 1. Apersepsi & DNA (Umum)
 * 2. Video, Gambar & Bedah Tajwid (Umum)
 * 3. Ruang Renungan (Wajib Login Siswa)
 * 4. Ruang Kritis HOTS (Wajib Login Siswa)
 * 5. Evaluasi Smart Test CBT, E-LKPD & Upload Tugas (Wajib Login Siswa)
 * 6. Amaliyah KBC (Wajib Login Siswa)
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.materi = function renderMateri(container, routeParams = {}) {
  const {
    escapeHtml,
    safeUrl,
    resolveImageUrl,
    showToast,
    openDocModal,
    openImageLightbox,
    openStudentLoginModal,
    syncChromeMetadata,
    formatDateId
  } = window.BTD_UI;
  const api = window.BTD_API;

  const PROTECTED_TABS = new Set(['renungan', 'kritis', 'evaluasi', 'amaliyah']);
  const TAB_LABELS = {
    renungan: '3. Ruang Renungan',
    kritis: '4. Ruang Kritis (HOTS)',
    evaluasi: '5. Evaluasi & E-LKPD',
    amaliyah: '6. Amaliyah (KBC)'
  };
  const ALL_VALID_TABS = ['apersepsi', 'eksplorasi', 'renungan', 'kritis', 'evaluasi', 'amaliyah'];
  const requestedTab = routeParams.tab === 'lkpd' ? 'evaluasi' : routeParams.tab;
  const initialTab = ALL_VALID_TABS.includes(requestedTab) ? requestedTab : 'apersepsi';

  const state = {
    jenjang: routeParams.jenjang && routeParams.jenjang !== 'Semua' ? routeParams.jenjang : null,
    semester: routeParams.semester || 'Semua',
    elemen: 'Semua',
    search: '',
    selectedId: routeParams.id || null,
    activeTab: initialTab,
    pendingTabHint: PROTECTED_TABS.has(requestedTab) ? requestedTab : null,
    evalSubTab: routeParams.tab === 'lkpd' ? 'tugas' : 'cbt', // 'cbt' | 'tugas'
    evalQuizPhase: 'setup', // 'setup' | 'running' | 'result'
    evalQuestions: [],
    evalAnswers: {},
    evalIndex: 0,
    evalSecondsLeft: 0,
    evalStartedAt: 0,
    evalTimerId: null,
    evalLastResult: null
  };

  function clearEvalTimer() {
    if (state.evalTimerId) {
      clearInterval(state.evalTimerId);
      state.evalTimerId = null;
    }
  }

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  if (typeof window !== 'undefined' && !window.__btdMateriCleanupBound) {
    window.__btdMateriCleanupBound = true;
    window.addEventListener('hashchange', () => {
      if (typeof window.__btdClearMateriTimer === 'function') window.__btdClearMateriTimer();
    });
  }
  window.__btdClearMateriTimer = clearEvalTimer;

  function promptLoginForTab(targetTab, customTitle, customSubtitle) {
    const label = TAB_LABELS[targetTab] || 'Aktivitas Siswa';
    const onSuccess = () => {
      state.activeTab = targetTab || state.activeTab;
      if (PROTECTED_TABS.has(state.activeTab) === false) state.activeTab = 'renungan';
      state.evalQuizPhase = 'setup';
      renderDetail();
    };
    if (typeof openStudentLoginModal === 'function') {
      openStudentLoginModal({
        title: customTitle || `🔐 Login Siswa — Akses ${label}`,
        subtitle:
          customSubtitle ||
          `Untuk mengakses dan mengisi ${label}, silakan masuk terlebih dahulu menggunakan NISN Anda. Data Nama, NISN, dan Kelas akan terisi otomatis.`,
        onSuccess
      });
    } else {
      window.location.hash = '#siswa';
    }
  }

  const getSmtLabel = (smt) => (String(smt || '1') === '2' ? 'Semester 2 (Genap)' : 'Semester 1 (Ganjil)');

  function getAvailableJenjangList() {
    const active = (api.state.data.materi || []).filter((m) => m.aktif !== false);
    const list = ['X', 'XI', 'XII'];
    active.forEach((m) => {
      const j = String(m.jenjang || '').trim();
      if (j && !list.includes(j)) list.push(j);
    });
    return list;
  }

  function getFilteredMateri() {
    return (api.state.data.materi || [])
      .filter((m) => m.aktif !== false)
      .filter((m) => !state.jenjang || m.jenjang === state.jenjang)
      .filter((m) => state.semester === 'Semua' || String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === state.semester)
      .filter((m) => state.elemen === 'Semua' || m.elemen === state.elemen)
      .filter((m) => {
        if (!state.search) return true;
        const q = state.search.toLowerCase();
        return (
          String(m.judul || '').toLowerCase().includes(q) ||
          String(m.ringkasan || '').toLowerCase().includes(q) ||
          String(m.elemen || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(a.bab) - Number(b.bab));
  }

  function renderClassSelection() {
    const allActive = (api.state.data.materi || []).filter((m) => m.aktif !== false);
    const jenjangList = getAvailableJenjangList();
    const classStyles = {
      X: { tone: 'tone-emerald', iconBg: 'is-emerald', icon: '📘', tag: 'tag-emerald', desc: 'Fondasi Akidah, Al-Qur’an Hadis, Akhlak Mulia, dan Sejarah Masuknya Islam di Indonesia.' },
      XI: { tone: 'tone-sky', iconBg: 'is-sky', icon: '📗', tag: 'tag-sky', desc: 'Pendalaman Berpikir Kritis, Peradaban Islam, Etika Bermedia Digital, dan Munakahat.' },
      XII: { tone: 'tone-violet', iconBg: 'is-violet', icon: '📕', tag: 'tag-violet', desc: 'Penguatan Etos Sabar, Iman Hari Akhir, Mawaris, Moderasi Beragama, & Masa Depan Umat.' }
    };

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Kurikulum Merdeka • Deep Learning PAI</span>
            <h1>Ruang Materi Pendidikan Agama Islam</h1>
            <p>Pilih kotak kelas di bawah ini untuk membuka bab materi, apersepsi, video &amp; gambar, tajwid interaktif, ruang renungan, ruang kritis HOTS, evaluasi CBT, dan jurnal amaliyah.</p>
          </div>
          <a href="https://smartpai.kemenag.go.id" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-sm">
            📚 Referensi Smart PAI Kemenag ↗
          </a>
        </div>
      </div>

      <div class="container">
        <div class="section-header" style="margin-bottom:18px;">
          <div>
            <span class="section-kicker">Pilih Tingkatan Kelas</span>
            <h2>Daftar Kelas Pembelajaran PAI</h2>
            <p>Klik salah satu kotak kelas untuk melihat seluruh bab materi kelas tersebut.</p>
          </div>
        </div>
        ${state.pendingTabHint
        ? `<div class="callout callout-gold" style="margin-bottom:16px;">
                <strong>ℹ️ ${escapeHtml(TAB_LABELS[state.pendingTabHint] || 'Evaluasi & Amaliyah')} Terintegrasi di Ruang Materi:</strong> Pilih kelas dan buka bab materi terlebih dahulu, lalu klik tab ${escapeHtml(TAB_LABELS[state.pendingTabHint] || '')}.
              </div>`
        : ''
      }

        <div class="grid grid-3">
          ${jenjangList
        .map((j, idx) => {
          const items = allActive.filter((m) => m.jenjang === j);
          const smt1 = items.filter((m) => String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === '1').length;
          const smt2 = items.filter((m) => String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === '2').length;
          const fallbackTones = ['tone-gold', 'tone-rose', 'tone-teal'];
          const meta = classStyles[j] || {
            tone: fallbackTones[idx % fallbackTones.length],
            iconBg: 'is-gold',
            icon: '📚',
            tag: 'tag-gold',
            desc: `Kumpulan bab pembelajaran PAI & Budi Pekerti lengkap untuk Kelas ${j}.`
          };
          return `
                <article class="card card-hover class-picker-card ${meta.tone}" data-pick-class="${escapeHtml(j)}" role="button" tabindex="0">
                  <div class="quick-bento-top">
                    <span class="quick-bento-icon ${meta.iconBg}">${meta.icon}</span>
                    <span class="tag ${meta.tag}">${items.length} Bab Materi</span>
                  </div>
                  <h2 style="margin:0 0 8px;font-size:23px;color:var(--slate-900);">Kelas ${escapeHtml(j)}</h2>
                  <p style="margin:0 0 14px;font-size:13.8px;color:var(--slate-700);flex:1;">${escapeHtml(meta.desc)}</p>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
                    <span class="tag tag-emerald">Smt 1: ${smt1} Bab</span>
                    <span class="tag tag-sky">Smt 2: ${smt2} Bab</span>
                  </div>
                  <button type="button" class="btn btn-primary btn-block" data-pick-class="${escapeHtml(j)}">
                    Buka Daftar Materi Kelas ${escapeHtml(j)} →
                  </button>
                </article>
              `;
        })
        .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-pick-class]').forEach((el) => {
      const pick = () => {
        state.jenjang = el.getAttribute('data-pick-class');
        state.semester = 'Semua';
        state.elemen = 'Semua';
        state.search = '';
        renderCatalog();
      };
      el.addEventListener('click', (e) => {
        if (el.tagName !== 'BUTTON' && e.target && typeof e.target.closest === 'function' && e.target.closest('button[data-pick-class]')) {
          return;
        }
        pick();
      });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        });
      }
    });
  }

  function renderCatalog() {
    if (!state.jenjang) {
      renderClassSelection();
      return;
    }

    const elemenList = api.state.data.pengaturan.elemenList || [];
    const items = getFilteredMateri();

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <button type="button" class="btn btn-ghost-light btn-sm" id="btn-back-classes" style="margin-bottom:10px;">
              ← Kembali ke Pilih Kelas
            </button>
            <div>
              <span class="eyebrow">Kurikulum Merdeka • Deep Learning PAI • Kelas ${escapeHtml(state.jenjang)}</span>
            </div>
            <h1>Materi PAI Kelas ${escapeHtml(state.jenjang)}</h1>
            <p>Menampilkan seluruh bab materi Kelas ${escapeHtml(state.jenjang)}. Klik salah satu kartu bab untuk membuka apersepsi, video, tajwid, &amp; LKPD.</p>
          </div>
          <a href="https://smartpai.kemenag.go.id" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-sm">
            📚 Referensi Smart PAI Kemenag ↗
          </a>
        </div>
      </div>

      <div class="container">
        <div class="filter-bar filter-row-3col">
          <select id="filter-semester" class="select" aria-label="Filter Semester PAI">
            <option value="Semua" ${state.semester === 'Semua' ? 'selected' : ''}>Semua Semester</option>
            <option value="1" ${state.semester === '1' ? 'selected' : ''}>Smt 1 (Ganjil)</option>
            <option value="2" ${state.semester === '2' ? 'selected' : ''}>Smt 2 (Genap)</option>
          </select>
          <select id="filter-elemen" class="select" aria-label="Filter Elemen PAI">
            <option value="Semua">Semua Elemen PAI</option>
            ${elemenList
        .map((el) => `<option value="${escapeHtml(el)}" ${state.elemen === el ? 'selected' : ''}>${escapeHtml(el)}</option>`)
        .join('')}
          </select>
          <input type="search" id="filter-search" aria-label="Cari judul bab atau topik PAI" class="input" placeholder="Cari judul bab atau topik Kelas ${escapeHtml(state.jenjang)}..." value="${escapeHtml(state.search)}" />
        </div>

        ${items.length === 0
        ? `<div class="card" style="text-align:center;padding:40px;">
                <p style="margin:0 0 12px;color:var(--slate-600);">Belum ada materi Kelas ${escapeHtml(state.jenjang)} yang sesuai filter saat ini.</p>
                <button type="button" class="btn btn-outline" id="btn-reset-materi-filter">Tampilkan Semua Bab Kelas ${escapeHtml(state.jenjang)}</button>
              </div>`
        : `<div class="grid grid-3">
                ${items
          .map((m) => {
            const tajwidCount = (api.state.data.tajwid || []).filter((t) => t.materiId === m.id).length;
            const coverSrc = resolveImageUrl(m.coverImage);
            const imgCount = (m.galeriGambar || []).length + (m.infografisUrl ? 1 : 0);
            return `
                      <article class="card card-hover" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
                        <div>
                          ${coverSrc ? `<img class="card-cover-img" src="${escapeHtml(coverSrc)}" alt="${escapeHtml(m.judul)}" />` : ''}
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                            <span class="tag tag-emerald">Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)}</span>
                            <span class="tag tag-sky">${escapeHtml(getSmtLabel(m.semester || (Number(m.bab) <= 5 ? '1' : '2')))}</span>
                            <span class="tag tag-gold">${escapeHtml(m.elemen)}</span>
                          </div>
                          <h3 style="margin:0 0 8px;font-size:17px;line-height:1.35;color:var(--slate-900);">${escapeHtml(m.judul)}</h3>
                          <p style="margin:0;font-size:13.5px;color:var(--slate-600);">${escapeHtml(m.ringkasan)}</p>
                        </div>

                        <div>
                          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                            ${tajwidCount ? `<span class="tag tag-sky">🔎 ${tajwidCount} Bedah Tajwid</span>` : ''}
                            ${m.youtubeId ? `<span class="tag">▶️ Video</span>` : ''}
                            ${imgCount ? `<span class="tag">🖼️ ${imgCount} Gambar/Infografis</span>` : ''}
                            ${m.lkpdUrl ? `<span class="tag">📄 E-LKPD</span>` : ''}
                          </div>
                          <button type="button" class="btn btn-primary btn-block" data-open-materi="${escapeHtml(m.id)}">
                            Buka Modul Pembelajaran →
                          </button>
                        </div>
                      </article>
                    `;
          })
          .join('')}
              </div>`
      }
      </div>
    `;

    const backClassesBtn = document.getElementById('btn-back-classes');
    if (backClassesBtn) {
      backClassesBtn.addEventListener('click', () => {
        state.jenjang = null;
        state.semester = 'Semua';
        state.elemen = 'Semua';
        state.search = '';
        renderCatalog();
      });
    }

    const smtSel = document.getElementById('filter-semester');
    if (smtSel) {
      smtSel.addEventListener('change', () => {
        state.semester = smtSel.value;
        renderCatalog();
      });
    }

    const elSel = document.getElementById('filter-elemen');
    if (elSel) {
      elSel.addEventListener('change', () => {
        state.elemen = elSel.value;
        renderCatalog();
      });
    }

    const searchInp = document.getElementById('filter-search');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        state.search = searchInp.value;
        renderCatalog();
        const fresh = document.getElementById('filter-search');
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(fresh.value.length, fresh.value.length);
        }
      });
    }

    const resetBtn = document.getElementById('btn-reset-materi-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.semester = 'Semua';
        state.elemen = 'Semua';
        state.search = '';
        renderCatalog();
      });
    }

    container.querySelectorAll('[data-open-materi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        clearEvalTimer();
        state.selectedId = btn.getAttribute('data-open-materi');
        state.evalQuizPhase = 'setup';
        const stuOk = typeof api.isStudentSessionValid === 'function' ? api.isStudentSessionValid() : Boolean(api.state.studentSession);
        if (state.pendingTabHint && !stuOk) {
          state.activeTab = 'apersepsi';
          const wantTab = state.pendingTabHint;
          state.pendingTabHint = null;
          renderDetail();
          promptLoginForTab(wantTab);
          return;
        }
        state.activeTab = state.pendingTabHint || 'apersepsi';
        state.pendingTabHint = null;
        renderDetail();
      });
    });
  }

  function getMateriQuestions(m, stu) {
    const allSoal = api.state.data.bankSoal || [];
    const byMateriOrBab = allSoal.filter(
      (s) => (s.materiId && s.materiId === m.id) || (s.jenjang === m.jenjang && Number(s.bab) === Number(m.bab))
    );
    if (!stu || !stu.kelas) return byMateriOrBab;
    const stuKelas = String(stu.kelas).trim().toLowerCase();
    return byMateriOrBab.filter((s) => {
      const sKelas = String(s.kelas || '').trim().toLowerCase();
      return !sKelas || sKelas === stuKelas;
    });
  }

  function renderLockedStudentIdentity(prefix, stu) {
    const stuNisn = String(stu.nisn || stu.id || '');
    return `
      <div class="form-row-3">
        <div class="field">
          <label for="${prefix}-nama">Nama Siswa (Otomatis)</label>
          <input id="${prefix}-nama" class="input student-locked-input" readonly value="${escapeHtml(stu.nama || '')}" />
        </div>
        <div class="field">
          <label for="${prefix}-nisn">NISN</label>
          <input id="${prefix}-nisn" class="input student-locked-input" readonly value="${escapeHtml(stuNisn)}" />
        </div>
        <div class="field">
          <label for="${prefix}-kelas">Kelas</label>
          <input id="${prefix}-kelas" class="input student-locked-input" readonly value="${escapeHtml(stu.kelas || '')}" />
        </div>
      </div>
    `;
  }

  function renderStudentSessionBar(stu) {
    const stuNisn = String(stu.nisn || stu.id || '');
    return `
      <div class="student-session-bar">
        <div class="student-session-info">
          <span class="tag tag-emerald">✓ Akun Siswa Terdeteksi</span>
          <strong>${escapeHtml(stu.nama)}</strong>
          <span>• NISN: <code>${escapeHtml(stuNisn)}</code></span>
          <span class="tag tag-sky">Kelas ${escapeHtml(stu.kelas)}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="btn-materi-stu-logout">🚪 Keluar / Ganti Siswa</button>
      </div>
    `;
  }

  function renderStudentGateCard(tabId, m) {
    const label = TAB_LABELS[tabId] || 'Menu Ini';
    return `
      <div class="card student-lock-gate">
        <span class="tag tag-gold">🔒 Khusus Siswa Login (NISN)</span>
        <h3>Login Siswa Diperlukan untuk Mengakses ${escapeHtml(label)}</h3>
        <p>
          Untuk menulis refleksi, mengirim analisis HOTS, mengerjakan Evaluasi Smart Test, mengunggah tugas, atau mengisi Jurnal Amaliyah pada
          <strong>Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}</strong>, silakan masuk terlebih dahulu menggunakan NISN Anda.
          Identitas Nama, NISN, dan Kelas akan otomatis terisi setelah login berhasil.
        </p>
        <div style="max-width:440px;margin:0 auto 16px;text-align:left;">
          <input class="input" readonly placeholder="Klik di sini atau tombol di bawah untuk login NISN..." data-require-login="${escapeHtml(tabId)}" style="cursor:pointer;text-align:center;" />
        </div>
        <button type="button" class="btn btn-primary" data-require-login="${escapeHtml(tabId)}">
          🔐 Login Siswa Sekarang (NISN)
        </button>
      </div>
    `;
  }

  function renderDetail() {
    const m = (api.state.data.materi || []).find((x) => x.id === state.selectedId);
    if (!m) {
      clearEvalTimer();
      state.selectedId = null;
      renderCatalog();
      return;
    }

    const stu = (typeof api.isStudentSessionValid === 'function' ? api.isStudentSessionValid() : Boolean(api.state.studentSession))
      ? api.state.studentSession
      : null;
    if (PROTECTED_TABS.has(state.activeTab) && !stu) {
      // Tetap render detail, tab terproteksi menampilkan lock gate jika diakses langsung via URL
    }

    const tajwidList = (api.state.data.tajwid || []).filter((t) => t.materiId === m.id);
    const diskusiList = (api.state.data.diskusi || []).filter((d) => d.materiId === m.id);
    const babSoalList = getMateriQuestions(m, stu);
    const lockIcon = stu ? '' : '🔒 ';

    const coverSrc = resolveImageUrl(m.coverImage);
    const infoSrc = resolveImageUrl(m.infografisUrl);
    const extraImages = (Array.isArray(m.galeriGambar) ? m.galeriGambar : []).filter((g) => resolveImageUrl(g.url));

    const tabs = [
      { id: 'apersepsi', label: '1. Apersepsi & DNA' },
      { id: 'eksplorasi', label: '2. Video, Gambar & Tajwid' },
      { id: 'renungan', label: `${lockIcon}3. Ruang Renungan (${diskusiList.length})` },
      { id: 'kritis', label: `${lockIcon}4. Ruang Kritis (HOTS)` },
      { id: 'evaluasi', label: `${lockIcon}5. Evaluasi (${babSoalList.length} Soal)` },
      { id: 'amaliyah', label: `${lockIcon}6. Amaliyah (KBC)` }
    ];

    let tabBody = '';

    if (state.activeTab === 'apersepsi') {
      const dnaHtml = (m.dnaPoin || []).length
        ? `<div class="grid grid-2" style="margin-top:14px;">
            ${m.dnaPoin
          .map(
            (pt, idx) => `<div class="callout callout-emerald">
                  <span class="tag tag-emerald">DNA Karakter #${idx + 1}</span>
                  <div style="font-weight:700;margin-top:6px;color:var(--slate-900);">${escapeHtml(pt)}</div>
                </div>`
          )
          .join('')}
          </div>`
        : '';

      tabBody = `
        <div class="grid grid-2">
          <div class="card">
            ${coverSrc ? `<img class="card-cover-img" src="${escapeHtml(coverSrc)}" alt="Ilustrasi ${escapeHtml(m.judul)}" style="cursor:pointer;" data-zoom-img="${escapeHtml(coverSrc)}" data-zoom-title="Ilustrasi Bab ${escapeHtml(m.bab)}" />` : ''}
            <span class="tag tag-gold">Apersepsi Bermakna (Mindful Learning)</span>
            <h3 style="margin:10px 0 8px;">Mengaitkan Materi dengan Kehidupan Nyata</h3>
            <p style="margin:0 0 14px;color:var(--slate-700);">${escapeHtml(m.apersepsi)}</p>
            <div class="callout callout-gold">
              <strong>❤️ Nilai Kurikulum Berbasis Cinta (KBC):</strong>
              <p style="margin:6px 0 0;font-size:13.8px;">${escapeHtml(m.nilaiKbc || 'Kasih sayang kepada Allah, sesama, dan lingkungan.')}</p>
            </div>
          </div>

          <div class="card">
            <span class="tag tag-sky">Pertanyaan Pemantik Diskusi</span>
            <h3 style="margin:10px 0 8px;">Coba Renungkan &amp; Analisis!</h3>
            <div style="white-space:pre-line;color:var(--slate-700);background:var(--slate-100);padding:14px;border-radius:12px;">
              ${escapeHtml(m.pemantik)}
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" data-switch-tab="eksplorasi">Lanjut ke Eksplorasi Materi →</button>
              <button type="button" class="btn btn-outline btn-sm" data-switch-tab="renungan">Tulis Renungan Sekarang</button>
            </div>
          </div>
        </div>
        ${dnaHtml}
      `;
    } else if (state.activeTab === 'eksplorasi') {
      const yt1 = m.youtubeId ? `https://www.youtube.com/embed/${encodeURIComponent(m.youtubeId)}` : '';
      const yt2 = m.youtubeIdTambahan ? `https://www.youtube.com/embed/${encodeURIComponent(m.youtubeIdTambahan)}` : '';

      const combinedImages = [];
      if (infoSrc) {
        combinedImages.push({ url: infoSrc, caption: `Infografis Utama: ${m.judul}` });
      }
      extraImages.forEach((g) => {
        const u = resolveImageUrl(g.url);
        if (u && u !== infoSrc) combinedImages.push({ url: u, caption: g.caption || m.judul });
      });

      tabBody = `
        <div class="grid grid-2" style="margin-bottom:20px;">
          <div class="card">
            <h3 style="margin:0 0 12px;">🎬 Video Pembelajaran &amp; Bedah Ayat</h3>
            ${yt1
          ? `<div class="embed-frame"><iframe src="${escapeHtml(yt1)}" title="Video Materi PAI" allowfullscreen loading="lazy"></iframe></div>`
          : `<div class="callout">Video materi untuk bab ini belum ditautkan oleh guru. Anda dapat mempelajari gambar materi, buku siswa, atau menambah link video melalui Panel Guru.</div>`
        }
            ${yt2
          ? `<div style="margin-top:12px;"><a href="https://www.youtube.com/watch?v=${encodeURIComponent(m.youtubeIdTambahan)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">▶️ Tonton Video Pendukung Bab Ini ↗</a></div>`
          : ''
        }
          </div>

          <div class="card">
            <h3 style="margin:0 0 12px;">📚 Bahan Ajar, Slide PPT, &amp; Buku Siswa</h3>
            <p style="color:var(--slate-600);font-size:13.8px;margin-top:0;">${escapeHtml(m.ringkasan)}</p>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
              ${safeUrl(m.pdfUrl)
          ? `<button type="button" class="btn btn-primary" data-preview-url="${escapeHtml(m.pdfUrl)}" data-preview-title="Modul / PDF: ${escapeHtml(m.judul)}">📄 Buka Modul PDF Materi</button>`
          : ''
        }
              ${safeUrl(m.slideUrl)
          ? `<button type="button" class="btn btn-gold" data-preview-url="${escapeHtml(m.slideUrl)}" data-preview-title="Slide Presentasi: ${escapeHtml(m.judul)}">🖼️ Buka Slide Presentasi (PPTX)</button>`
          : ''
        }
              ${safeUrl(m.bukuUrl)
          ? `<button type="button" class="btn btn-outline" data-preview-url="${escapeHtml(m.bukuUrl)}" data-preview-title="Buku Siswa PAI Kelas ${escapeHtml(m.jenjang)}">📘 Buka Buku Siswa PAI Kelas ${escapeHtml(m.jenjang)}</button>`
          : ''
        }
              <a href="https://smartpai.kemenag.go.id" target="_blank" rel="noopener noreferrer" class="btn btn-outline">🌐 Portal Buku Smart PAI Kemenag ↗</a>
            </div>
          </div>
        </div>

        ${combinedImages.length
          ? `<div class="card" style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
                  <div>
                    <h3 style="margin:0;">🖼️ Infografis &amp; Galeri Gambar Materi</h3>
                    <p style="margin:4px 0 0;font-size:13.5px;color:var(--slate-600);">Klik gambar mana saja untuk memperbesar tampilan (lightbox).</p>
                  </div>
                  <span class="tag tag-gold">${combinedImages.length} Media Gambar</span>
                </div>
                <div class="media-gallery-grid">
                  ${combinedImages
            .map(
              (img, idx) => `<div class="media-thumb-card">
                        <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.caption)}" data-zoom-img="${escapeHtml(img.url)}" data-zoom-title="Media Gambar #${idx + 1}" data-zoom-caption="${escapeHtml(img.caption)}" />
                        <div class="media-thumb-caption">${escapeHtml(img.caption)}</div>
                      </div>`
            )
            .join('')}
                </div>
              </div>`
          : ''
        }

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
            <div>
              <h3 style="margin:0;">🔎 Konten Bedah Tajwid Interaktif</h3>
              <p style="margin:4px 0 0;font-size:13.5px;color:var(--slate-600);">Klik setiap potongan ayat untuk membedah hukum bacaan, alasan kaidah, dan cara membacanya.</p>
            </div>
            <span class="tag tag-emerald">${tajwidList.length} Butir Tajwid</span>
          </div>

          ${tajwidList.length === 0
          ? `<p style="margin:0;color:var(--slate-500);">Belum ada kartu bedah tajwid untuk bab ini. Guru dapat menambahkannya melalui Panel Guru → CRUD Materi &amp; Tajwid.</p>`
          : `<div class="tajwid-accordion">
                  ${tajwidList
            .map(
              (t, i) => `
                        <div class="tajwid-item">
                          <button type="button" class="tajwid-trigger" data-tajwid-toggle="${escapeHtml(t.id)}" aria-expanded="${i === 0 ? 'true' : 'false'}">
                            <div class="tajwid-trigger-left">
                              <span class="arabic-text" style="font-size:24px;line-height:1.7;">${escapeHtml(t.lafalArab)}</span>
                              <span style="font-weight:700;color:var(--slate-800);font-size:14px;">
                                ${escapeHtml(t.transliterasi)} <span style="font-weight:500;color:var(--slate-500);">(${escapeHtml(t.sumberAyat)})</span>
                              </span>
                            </div>
                            <span class="tag tag-gold">${escapeHtml(t.hukum)} ▾</span>
                          </button>
                          <div class="tajwid-body" id="tjw-body-${escapeHtml(t.id)}" ${i === 0 ? '' : 'hidden'}>
                            <div class="tajwid-detail-grid">
                              <div class="tajwid-box">
                                <small>Hukum Bacaan</small>
                                <strong>${escapeHtml(t.hukum)}</strong>
                              </div>
                              <div class="tajwid-box">
                                <small>Alasan Kaidah</small>
                                <span>${escapeHtml(t.alasan)}</span>
                              </div>
                              <div class="tajwid-box">
                                <small>Cara Membaca</small>
                                <span>${escapeHtml(t.caraBaca)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      `
            )
            .join('')}
                </div>`
        }
        </div>
      `;
    } else if (state.activeTab === 'renungan') {
      if (!stu) {
        tabBody = renderStudentGateCard('renungan', m);
      } else {
        tabBody = `
          ${renderStudentSessionBar(stu)}
          <div class="grid grid-2">
            <div class="card">
              <h3 style="margin:0 0 8px;">💬 Tulis Renungan Hari Ini</h3>
              <p style="margin:0 0 14px;font-size:13.5px;color:var(--slate-600);">
                Pengganti Padlet yang terintegrasi langsung ke Google Sheets. Identitas Nama, NISN, dan Kelas otomatis mengikuti akun login Anda.
              </p>
              <form id="form-diskusi" class="form-grid">
                ${renderLockedStudentIdentity('dsk', stu)}
                <div class="field">
                  <label for="dsk-pesan">Refleksi / Hikmah yang Didapat</label>
                  <textarea id="dsk-pesan" class="textarea" required placeholder="Tuliskan pelajaran terpenting dan niat perbaikan dirimu..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Kirim ke Papan Renungan</button>
              </form>
            </div>

            <div class="card">
              <h3 style="margin:0 0 14px;">📝 Papan Renungan Kelas (${diskusiList.length})</h3>
              <div style="display:flex;flex-direction:column;gap:12px;max-height:420px;overflow-y:auto;">
                ${diskusiList.length === 0
            ? '<p style="color:var(--slate-500);">Belum ada renungan untuk bab ini. Jadilah yang pertama menulis!</p>'
            : diskusiList
              .map(
                (d) => `<div style="padding:13px;border-radius:12px;background:var(--slate-100);border-left:4px solid var(--emerald-700);">
                            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
                              <strong style="font-size:13.5px;">${escapeHtml(d.nama)}</strong>
                              <span class="tag tag-emerald">${escapeHtml(d.kelas)} • ${formatDateId(d.timestamp)}</span>
                            </div>
                            <p style="margin:0;font-size:13.5px;color:var(--slate-700);">${escapeHtml(d.pesan)}</p>
                          </div>`
              )
              .join('')
          }
              </div>
            </div>
          </div>
        `;
      }
    } else if (state.activeTab === 'kritis') {
      if (!stu) {
        tabBody = renderStudentGateCard('kritis', m);
      } else {
        tabBody = `
          ${renderStudentSessionBar(stu)}
          <div class="grid grid-2">
            <div class="card">
              <span class="tag tag-gold">Studi Kasus &amp; Analisis HOTS</span>
              <h3 style="margin:10px 0 10px;">Masalah Kontekstual Untuk Dianalisis</h3>
              <div class="callout callout-gold" style="margin-bottom:14px;">
                <p style="margin:0;font-size:14.5px;color:var(--slate-900);">${escapeHtml(m.studiKasus)}</p>
              </div>
              <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
                <strong>Panduan Menjawab (Deep Learning):</strong> Kaitkan analisis dengan dalil Al-Qur'an/Hadis pada bab ini,
                identifikasi nilai kasih sayang (<em>Kurikulum Berbasis Cinta</em>), dan berikan solusi praktis yang bisa diterapkan pelajar.
              </p>
            </div>

            <div class="card">
              <h3 style="margin:0 0 12px;">✍️ Kirim Jawaban Ruang Kritis</h3>
              <form id="form-ruang-kritis" class="form-grid">
                ${renderLockedStudentIdentity('kr', stu)}
                <div class="field">
                  <label for="kr-kbc">Nilai Kurikulum Berbasis Cinta yang Terkait</label>
                  <select id="kr-kbc" class="select">
                    <option>Keikhlasan &amp; Cinta kepada Allah</option>
                    <option>Empati &amp; Kasih Sayang Sesama</option>
                    <option>Tabayyun &amp; Etika Digital Santun</option>
                    <option>Toleransi &amp; Moderasi Beragama</option>
                    <option>Tanggung Jawab &amp; Kepedulian Sosial</option>
                  </select>
                </div>
                <div class="field">
                  <label for="kr-analisis">Uraian Analisis HOTS Anda</label>
                  <textarea id="kr-analisis" class="textarea" rows="5" required placeholder="Tuliskan argumen, dasar dalil, serta solusi nyatamu..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Simpan Jawaban ke Database</button>
              </form>
            </div>
          </div>
        `;
      }
    } else if (state.activeTab === 'evaluasi') {
      if (!stu) {
        tabBody = renderStudentGateCard('evaluasi', m);
      } else {
        const subTabsHtml = `
          <div class="tabs" style="margin-bottom:14px;">
            <button type="button" class="tab-btn ${state.evalSubTab === 'cbt' ? 'active' : ''}" data-mat-eval-sub="cbt">📝 PAIBP Smart Test (${babSoalList.length} Soal)</button>
            <button type="button" class="tab-btn ${state.evalSubTab === 'tugas' ? 'active' : ''}" data-mat-eval-sub="tugas">📄 E-LKPD &amp; Upload Tugas Bab Ini</button>
          </div>
        `;
        let evalContent = '';
        if (state.evalSubTab === 'cbt') {
          if (state.evalQuizPhase === 'running' && state.evalQuestions.length > 0) {
            const q = state.evalQuestions[state.evalIndex];
            const letters = ['A', 'B', 'C', 'D', 'E'];
            const answeredCount = Object.keys(state.evalAnswers).length;
            evalContent = `
              <div class="quiz-header-bar">
                <div>
                  <strong>${escapeHtml(stu.nama)}</strong> (${escapeHtml(stu.kelas)}) • Kelas ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}
                  <div style="font-size:12.5px;color:#a7f3d0;">Terjawab ${answeredCount} dari ${state.evalQuestions.length} soal</div>
                </div>
                <div class="quiz-timer" id="mat-cbt-timer">⏱️ ${formatTimer(state.evalSecondsLeft)}</div>
              </div>
              <div class="grid quiz-split-grid">
                <div class="card">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span class="tag tag-emerald">Soal ${state.evalIndex + 1} / ${state.evalQuestions.length}</span>
                    <span class="tag tag-gold">${escapeHtml(q.level || 'HOTS')}</span>
                  </div>
                  ${safeUrl(q.gambarUrl)
                ? `<div class="quiz-question-img-wrap">
                          <img src="${escapeHtml(resolveImageUrl(q.gambarUrl))}" alt="Gambar Soal #${state.evalIndex + 1}" data-soal-zoom="${escapeHtml(q.gambarUrl)}" data-zoom-title="Gambar Soal #${state.evalIndex + 1}" title="Klik untuk memperbesar gambar" />
                          <div style="margin-top:4px;"><small style="color:var(--slate-500);">🔍 Klik gambar untuk memperbesar</small></div>
                        </div>`
                : ''
              }
                  <h3 style="margin:0 0 18px;font-size:17px;line-height:1.5;color:var(--slate-900);">${escapeHtml(q.pertanyaan)}</h3>
                  <div style="display:flex;flex-direction:column;gap:10px;">
                    ${(q.opsi || [])
                .map((opt, idx) => {
                  const isSelected = state.evalAnswers[q.id] === idx;
                  return `<button type="button" class="quiz-option ${isSelected ? 'selected' : ''}" data-mat-pick-opt="${idx}">
                          <span class="quiz-option-letter">${letters[idx] || idx + 1}</span>
                          <span style="text-align:left;">${escapeHtml(opt)}</span>
                        </button>`;
                })
                .join('')}
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:10px;margin-top:20px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-outline" id="btn-mat-cbt-prev" ${state.evalIndex === 0 ? 'disabled' : ''}>← Sebelumnya</button>
                    ${state.evalIndex < state.evalQuestions.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-mat-cbt-next">Selanjutnya →</button>`
                : `<button type="button" class="btn btn-gold" id="btn-mat-cbt-finish">✅ Selesai &amp; Kumpulkan</button>`
              }
                  </div>
                </div>
                <div class="card">
                  <h4 style="margin:0 0 10px;">Navigasi Nomor</h4>
                  <div class="quiz-nav-dots" style="margin-bottom:16px;">
                    ${state.evalQuestions
                .map((item, idx) => {
                  const cls =
                    idx === state.evalIndex
                      ? 'current'
                      : state.evalAnswers[item.id] !== undefined
                        ? 'answered'
                        : '';
                  return `<button type="button" class="quiz-dot ${cls}" data-mat-jump-q="${idx}">${idx + 1}</button>`;
                })
                .join('')}
                  </div>
                  <button type="button" class="btn btn-gold btn-block" id="btn-mat-cbt-finish-side">Kumpulkan Jawaban</button>
                </div>
              </div>
            `;
          } else if (state.evalQuizPhase === 'result' && state.evalLastResult) {
            const res = state.evalLastResult;
            const letters = ['A', 'B', 'C', 'D', 'E'];
            const predikat = res.skor >= 90 ? 'Mumtaz (Sangat Baik)' : res.skor >= 75 ? 'Jayyid (Tuntas)' : 'Perlu Penguatan';
            evalContent = `
              <div class="card" style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div>
                    <span class="tag tag-emerald">Hasil PAIBP Smart Test</span>
                    <h2 style="margin:8px 0 4px;">${escapeHtml(res.nama)} — ${escapeHtml(res.kelas)}</h2>
                    <p style="margin:0;color:var(--slate-600);">
                      Kelas ${escapeHtml(res.jenjang)} Bab ${escapeHtml(res.bab)} • Waktu: ${res.waktuDetik} detik • Predikat: <strong>${predikat}</strong>
                    </p>
                  </div>
                  <div style="text-align:center;padding:14px 24px;border-radius:16px;background:var(--emerald-900);color:#fff;">
                    <div style="font-size:12px;color:#a7f3d0;">SKOR AKHIR</div>
                    <div style="font-size:34px;font-weight:800;line-height:1.1;">${res.skor}</div>
                    <div style="font-size:12.5px;color:#fde68a;">Benar ${res.benar} / ${res.totalSoal}</div>
                  </div>
                </div>
                <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-primary" id="btn-mat-cbt-retry">🔄 Ulangi Evaluasi Bab Ini</button>
                  <button type="button" class="btn btn-gold" data-switch-tab="amaliyah">🌟 Lanjut ke 6. Amaliyah →</button>
                </div>
              </div>
              <div class="card">
                <h3 style="margin:0 0 14px;">📖 Pembahasan Soal &amp; Umpan Balik</h3>
                <div style="display:flex;flex-direction:column;gap:14px;">
                  ${state.evalQuestions
                .map((q, idx) => {
                  const picked = state.evalAnswers[q.id];
                  const correct = Number(q.kunci);
                  const isRight = picked === correct;
                  return `<div class="callout ${isRight ? 'callout-emerald' : ''}" style="${isRight ? '' : 'background:var(--rose-50);border-color:#fecdd3;'}">
                        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
                          <strong>Soal #${idx + 1}</strong>
                          <span class="tag ${isRight ? 'tag-emerald' : 'tag-rose'}">${isRight ? '✓ Benar' : '✕ Perlu Review'}</span>
                        </div>
                        ${safeUrl(q.gambarUrl)
                      ? `<div class="quiz-question-img-wrap" style="margin-bottom:8px;">
                                <img src="${escapeHtml(resolveImageUrl(q.gambarUrl))}" alt="Gambar Soal #${idx + 1}" style="max-height:170px;" data-soal-zoom="${escapeHtml(q.gambarUrl)}" data-zoom-title="Gambar Soal #${idx + 1}" />
                              </div>`
                      : ''
                    }
                        <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(q.pertanyaan)}</p>
                        <p style="margin:0 0 4px;font-size:13.5px;">
                          Jawaban Anda: <strong>${picked !== undefined ? letters[picked] + '. ' + escapeHtml(q.opsi[picked]) : 'Tidak dijawab'}</strong><br/>
                          Kunci Jawaban: <strong>${letters[correct]}. ${escapeHtml(q.opsi[correct])}</strong>
                        </p>
                        <p style="margin:6px 0 0;font-size:13.5px;color:var(--slate-700);">
                          <strong>Pembahasan:</strong> ${escapeHtml(q.pembahasan)}
                        </p>
                      </div>`;
                })
                .join('')}
                </div>
              </div>
            `;
          } else {
            evalContent = `
              <div class="grid grid-2">
                <div class="card">
                  <span class="tag tag-emerald">PAIBP Smart Test (CBT)</span>
                  <h3 style="margin:10px 0 8px;">Evaluasi Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}</h3>
                  <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.8px;">
                    Identitas peserta didik otomatis memakai data akun login Anda. Nilai akhir &amp; pembahasan otomatis tersimpan ke Google Sheets.
                  </p>
                  <form id="form-mat-cbt-start" class="form-grid">
                    ${renderLockedStudentIdentity('mcbt', stu)}
                    <div class="callout callout-emerald" style="font-size:13.5px;">
                      <strong>Paket Ujian Aktif:</strong> Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)} (${babSoalList.length} soal • Durasi ${Math.max(1, babSoalList.length * 2)} menit)
                    </div>
                    <button type="submit" class="btn btn-primary" ${babSoalList.length ? '' : 'disabled'}>
                      🚀 Mulai Kerjakan Evaluasi Sekarang
                    </button>
                  </form>
                </div>
                <div class="card">
                  <span class="tag tag-gold">Lembar Kerja Peserta Didik (E-LKPD)</span>
                  <h3 style="margin:10px 0 8px;">Akses Dokumen E-LKPD &amp; Upload Tugas</h3>
                  <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.8px;">
                    Pratinjau dokumen E-LKPD Bab ${escapeHtml(m.bab)} dan kumpulkan berkas tugas Anda secara terpadu di tab Upload Tugas.
                  </p>
                  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
                    ${safeUrl(m.lkpdUrl)
                ? `<button type="button" class="btn btn-outline" data-preview-url="${escapeHtml(m.lkpdUrl)}" data-preview-title="E-LKPD Kelas ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}">📄 Pratinjau E-LKPD</button>`
                : `<span class="tag tag-gold">E-LKPD PDF belum ditautkan</span>`
              }
                    <button type="button" class="btn btn-gold" data-mat-eval-sub="tugas">📤 Buka Form Upload Tugas Bab Ini →</button>
                  </div>
                  <div class="callout" style="font-size:13px;">
                    <strong>Tips Kejujuran (Muraqabah):</strong> Kerjakan soal secara mandiri dengan niat mencari ilmu dan keridhaan Allah Swt.
                  </div>
                </div>
              </div>
            `;
          }
        } else {
          evalContent = `
            <div class="grid grid-2">
              <div class="card">
                <span class="tag tag-emerald">Upload Tugas Pembelajaran PAI-BP</span>
                <h3 style="margin:10px 0 8px;">Kumpulkan Tugas / E-LKPD Bab ${escapeHtml(m.bab)}</h3>
                <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.5px;">
                  Identitas Nama, NISN, dan Kelas otomatis terisi sesuai akun siswa Anda. Unggah file gambar/PDF (maks. 2 MB) atau tempel tautan Drive/Canva.
                </p>
                <form id="form-mat-upload-tugas" class="form-grid">
                  ${renderLockedStudentIdentity('mtgs', stu)}
                  <div class="form-row-2">
                    <div class="field">
                      <label for="mtgs-bab">Bab / Materi PAI</label>
                      <input id="mtgs-bab" class="input" required value="Bab ${escapeHtml(m.bab)} (Kls ${escapeHtml(m.jenjang)}) — ${escapeHtml(m.judul)}" />
                    </div>
                    <div class="field">
                      <label for="mtgs-jenis">Jenis Tugas</label>
                      <select id="mtgs-jenis" class="select">
                        <option>LKPD / Latihan Tertulis</option>
                        <option>Infografis / Poster Islami</option>
                        <option>Video Praktik Ibadah / Hafalan</option>
                        <option>Rangkuman / Peta Konsep</option>
                      </select>
                    </div>
                  </div>
                  <div class="field">
                    <label for="mtgs-file">Pilih File Gambar/PDF (Opsional, Maks. 2 MB)</label>
                    <input id="mtgs-file" type="file" class="input" accept="image/*,.pdf" />
                  </div>
                  <div class="field">
                    <label for="mtgs-link">Atau Tempel Tautan Tugas (Google Drive / Canva / YouTube)</label>
                    <input id="mtgs-link" type="url" class="input" placeholder="https://drive.google.com/..." />
                  </div>
                  <div class="field">
                    <label for="mtgs-catatan">Catatan Tambahan</label>
                    <input id="mtgs-catatan" class="input" placeholder="Keterangan singkat tugas..." />
                  </div>
                  <button type="submit" class="btn btn-primary">📤 Kirim Tugas Sekarang</button>
                </form>
              </div>
              <div class="card">
                <span class="tag tag-gold">Pratinjau Dokumen E-LKPD</span>
                <h3 style="margin:10px 0 8px;">Lembar Kerja Bab ${escapeHtml(m.bab)}</h3>
                <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.8px;">
                  Buka panduan tugas dan lembar kerja resmi dari guru pada bab ini sebelum mengirim berkas tugas Anda.
                </p>
                ${safeUrl(m.lkpdUrl)
              ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
                        <button type="button" class="btn btn-primary" data-preview-url="${escapeHtml(m.lkpdUrl)}" data-preview-title="E-LKPD Kelas ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}">📄 Pratinjau E-LKPD</button>
                        <a href="${escapeHtml(m.lkpdUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Buka di Tab Baru ↗</a>
                      </div>`
              : `<div class="callout callout-gold" style="margin-bottom:16px;">E-LKPD PDF belum ditautkan pada bab ini — gunakan instruksi di Ruang Kritis atau unggah tugas langsung di formulir samping.</div>`
            }
                <div class="callout callout-emerald" style="font-size:13.5px;">
                  <strong>Tips Karakter Hebat:</strong> "Berlombalah dalam kebaikan (<em>fastabiqul khairat</em>) — kumpulkan tugas tepat waktu dengan jujur dan mandiri."
                </div>
              </div>
            </div>
          `;
        }
        tabBody = `${renderStudentSessionBar(stu)}${subTabsHtml}${evalContent}`;
      }
    } else if (state.activeTab === 'amaliyah') {
      if (!stu) {
        tabBody = renderStudentGateCard('amaliyah', m);
      } else {
        const recentAml = (api.state.data.amaliyah || []).slice(0, 6);
        tabBody = `
          ${renderStudentSessionBar(stu)}
          <div class="grid grid-2">
            <div class="card">
              <span class="tag tag-rose">Amaliyah &amp; Kurikulum Berbasis Cinta</span>
              <h3 style="margin:10px 0 8px;">Jurnal Amaliyah Bab ${escapeHtml(m.bab)}</h3>
              <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.5px;">
                Identitas Nama, NISN, dan Kelas terisi otomatis dari akun siswa Anda. Laporkan aksi nyata kebaikan sebagai buah pemahaman materi ini.
              </p>
              <form id="form-mat-amaliyah" class="form-grid">
                ${renderLockedStudentIdentity('maml', stu)}
                <div class="field">
                  <label for="maml-bab">Tema / Bab Tantangan</label>
                  <input id="maml-bab" class="input" required value="Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}" />
                </div>
                <div class="field">
                  <label>Checklist Pembiasaan Mingguan</label>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <label class="check-card">
                      <input type="checkbox" id="maml-gadget" />
                      <span><strong>📱 Lulus Sensor Gadget:</strong> Membatasi hiburan gawai dan mendahulukan ibadah serta tugas belajar.</span>
                    </label>
                    <label class="check-card">
                      <input type="checkbox" id="maml-prokras" />
                      <span><strong>⏱️ Zero Prokrastinasi:</strong> Menyelesaikan pekerjaan/ibadah tepat waktu tanpa menunda.</span>
                    </label>
                    <label class="check-card">
                      <input type="checkbox" id="maml-fokus" />
                      <span><strong>⚔️ Petarung Fokus:</strong> Tetap tekun dan pantang menyerah saat belajar materi sulit.</span>
                    </label>
                  </div>
                </div>
                <div class="field">
                  <label for="maml-capaian">Pencapaian Terbaikmu Minggu Ini</label>
                  <textarea id="maml-capaian" class="textarea" rows="3" required placeholder="Ceritakan 1 pencapaian nyata yang paling kamu syukuri..."></textarea>
                </div>
                <div class="field">
                  <label for="maml-kbc">Aksi Nyata Cinta Kasih (Kurikulum Berbasis Cinta)</label>
                  <textarea id="maml-kbc" class="textarea" rows="3" required placeholder="Contoh: Membantu teman yang kesulitan, berbakti kepada orang tua, atau menjaga kerukunan kelas..."></textarea>
                </div>
                <button type="submit" class="btn btn-gold">🌟 Simpan Jurnal Amaliyah</button>
              </form>
            </div>

            <div class="card">
              <h3 style="margin:0 0 12px;">✨ Jejak Kebaikan Siswa Terbaru (${recentAml.length})</h3>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${recentAml.length === 0
            ? '<p style="color:var(--slate-500);">Belum ada catatan amaliyah siswa. Jadilah yang pertama berbagi inspirasi kebaikan!</p>'
            : recentAml
              .map(
                (item) => `<div class="callout callout-emerald">
                            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
                              <strong>Siswa ${escapeHtml(item.kelas)}</strong>
                              <span class="tag tag-emerald">${escapeHtml(item.kelas)}</span>
                            </div>
                            <p style="margin:0 0 6px;font-size:13.5px;"><strong>Pencapaian:</strong> ${escapeHtml(item.pencapaianTerbaik)}</p>
                            <p style="margin:0;font-size:13px;color:var(--emerald-900);"><strong>❤️ Aksi KBC:</strong> ${escapeHtml(item.refleksiKbc)}</p>
                          </div>`
              )
              .join('')
          }
              </div>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <button type="button" class="btn btn-ghost-light btn-sm" id="btn-back-materi" style="margin-bottom:10px;">
              ← Kembali ke Daftar Bab
            </button>
            <div>
              <span class="eyebrow">Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)} • ${escapeHtml(m.elemen)}</span>
            </div>
            <h1>${escapeHtml(m.judul)}</h1>
          </div>
          <button type="button" class="btn btn-gold btn-sm" id="btn-detail-ai">✨ Tanya Asisten PAI Bab Ini</button>
        </div>
      </div>

      <div class="container">
        <div class="tabs">
          ${tabs
        .map(
          (t) => `<button type="button" class="tab-btn ${state.activeTab === t.id ? 'active' : ''}" data-detail-tab="${t.id}">
                ${escapeHtml(t.label)}
              </button>`
        )
        .join('')}
        </div>

        ${tabBody}
      </div>
    `;

    document.getElementById('btn-back-materi').addEventListener('click', () => {
      clearEvalTimer();
      state.selectedId = null;
      if (!state.jenjang) state.jenjang = m.jenjang;
      renderCatalog();
    });

    document.getElementById('btn-detail-ai').addEventListener('click', () => {
      window.BTD_UI.openAiAssistantModal();
    });

    const stuLogoutBtn = document.getElementById('btn-materi-stu-logout');
    if (stuLogoutBtn) {
      stuLogoutBtn.addEventListener('click', () => {
        clearEvalTimer();
        api.logoutStudent();
        if (typeof syncChromeMetadata === 'function') syncChromeMetadata();
        showToast('Akun siswa dikeluarkan.', 'warning');
        state.activeTab = 'apersepsi';
        state.evalQuizPhase = 'setup';
        renderDetail();
      });
    }

    container.querySelectorAll('[data-detail-tab], [data-switch-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTab = btn.getAttribute('data-detail-tab') || btn.getAttribute('data-switch-tab');
        if (!nextTab) return;
        const stuOk = typeof api.isStudentSessionValid === 'function' ? api.isStudentSessionValid() : Boolean(api.state.studentSession);
        if (PROTECTED_TABS.has(nextTab) && !stuOk) {
          promptLoginForTab(nextTab);
          return;
        }
        clearEvalTimer();
        state.activeTab = nextTab;
        if (nextTab === 'evaluasi') state.evalQuizPhase = 'setup';
        renderDetail();
      });
    });

    container.querySelectorAll('[data-require-login]').forEach((el) => {
      const targetTab = el.getAttribute('data-require-login') || state.activeTab;
      const triggerLogin = (e) => {
        if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e) e.preventDefault();
        promptLoginForTab(targetTab);
      };
      el.addEventListener('click', triggerLogin);
      if (el.tagName === 'INPUT') {
        el.addEventListener('focus', () => promptLoginForTab(targetTab));
        el.addEventListener('keydown', triggerLogin);
      }
    });

    container.querySelectorAll('[data-mat-eval-sub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        clearEvalTimer();
        state.evalSubTab = btn.getAttribute('data-mat-eval-sub') || 'cbt';
        state.evalQuizPhase = 'setup';
        renderDetail();
      });
    });

    container.querySelectorAll('[data-preview-url]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openDocModal(btn.getAttribute('data-preview-title'), btn.getAttribute('data-preview-url'));
      });
    });

    container.querySelectorAll('[data-zoom-img], [data-soal-zoom]').forEach((img) => {
      img.addEventListener('click', () => {
        openImageLightbox(
          img.getAttribute('data-zoom-title') || 'Gambar',
          img.getAttribute('data-zoom-img') || img.getAttribute('data-soal-zoom') || '',
          img.getAttribute('data-zoom-caption') || ''
        );
      });
    });

    container.querySelectorAll('[data-tajwid-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tajwid-toggle');
        const body = document.getElementById('tjw-body-' + id);
        if (!body) return;
        const willOpen = body.hidden;
        body.hidden = !willOpen;
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });

    const formDiskusi = document.getElementById('form-diskusi');
    if (formDiskusi && stu) {
      formDiskusi.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = formDiskusi.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          const res = await api.submitDiskusi({
            materiId: m.id,
            nisn: String(stu.nisn || stu.id || ''),
            nama: stu.nama,
            kelas: stu.kelas,
            pesan: document.getElementById('dsk-pesan').value.trim()
          });
          showToast(
            res.mode === 'live'
              ? 'Renungan berhasil disimpan ke Google Sheets!'
              : 'Renungan ditambahkan (Mode Demo Lokal).'
          );
          renderDetail();
        } catch (err) {
          showToast('Gagal menyimpan renungan: ' + err.message, 'error');
          submitBtn.disabled = false;
        }
      });
    }

    const formKritis = document.getElementById('form-ruang-kritis');
    if (formKritis && stu) {
      formKritis.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = formKritis.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          const res = await api.submitRuangKritis({
            materiId: m.id,
            nisn: String(stu.nisn || stu.id || ''),
            nama: stu.nama,
            kelas: stu.kelas,
            nilaiKbc: document.getElementById('kr-kbc').value,
            analisis: document.getElementById('kr-analisis').value.trim(),
            dikurasi: false
          });
          showToast(
            res.mode === 'live'
              ? 'Analisis HOTS berhasil dikirim ke Google Sheets!'
              : 'Analisis HOTS tersimpan (Mode Demo Lokal).'
          );
          const analEl = document.getElementById('kr-analisis');
          if (analEl) analEl.value = '';
        } catch (err) {
          showToast('Gagal mengirim analisis: ' + err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    function finishMateriQuiz(autoSubmitted = false) {
      clearEvalTimer();
      const total = state.evalQuestions.length;
      let benar = 0;
      state.evalQuestions.forEach((q) => {
        if (state.evalAnswers[q.id] === Number(q.kunci)) benar += 1;
      });
      const skor = total ? Math.round((benar / total) * 100) : 0;
      const waktuDetik = Math.max(1, Math.round((Date.now() - state.evalStartedAt) / 1000));
      const payload = {
        nisn: String(stu.nisn || stu.id || ''),
        nama: stu.nama,
        kelas: stu.kelas,
        jenjang: m.jenjang,
        bab: Number(m.bab),
        skor,
        benar,
        totalSoal: total,
        waktuDetik
      };
      state.evalLastResult = payload;
      state.evalQuizPhase = 'result';
      renderDetail();

      api
        .submitEvaluasi(payload)
        .then((res) => {
          showToast(
            (autoSubmitted ? 'Waktu habis! ' : '') +
            (res.mode === 'live'
              ? 'Nilai Smart Test tersimpan ke Google Sheets!'
              : 'Nilai Smart Test tercatat (Mode Demo Lokal).')
          );
        })
        .catch((err) => showToast('Gagal mengirim nilai ke server: ' + err.message, 'error'));
    }

    const startEvalForm = document.getElementById('form-mat-cbt-start');
    if (startEvalForm && stu) {
      startEvalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!babSoalList.length) {
          showToast('Belum ada soal CBT untuk bab ini.', 'warning');
          return;
        }
        state.evalQuestions = babSoalList.slice();
        state.evalAnswers = {};
        state.evalIndex = 0;
        state.evalSecondsLeft = state.evalQuestions.length * 120;
        state.evalStartedAt = Date.now();
        state.evalQuizPhase = 'running';

        clearEvalTimer();
        state.evalTimerId = setInterval(() => {
          const timerEl = document.getElementById('mat-cbt-timer');
          if (!timerEl) {
            clearEvalTimer();
            return;
          }
          state.evalSecondsLeft -= 1;
          timerEl.textContent = '⏱️ ' + formatTimer(Math.max(0, state.evalSecondsLeft));
          if (state.evalSecondsLeft <= 0) {
            finishMateriQuiz(true);
          }
        }, 1000);
        renderDetail();
      });
    }

    container.querySelectorAll('[data-mat-pick-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = state.evalQuestions[state.evalIndex];
        if (!q) return;
        state.evalAnswers[q.id] = Number(btn.getAttribute('data-mat-pick-opt'));
        renderDetail();
      });
    });

    container.querySelectorAll('[data-mat-jump-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.evalIndex = Number(btn.getAttribute('data-mat-jump-q'));
        renderDetail();
      });
    });

    const prevEvalBtn = document.getElementById('btn-mat-cbt-prev');
    if (prevEvalBtn) {
      prevEvalBtn.addEventListener('click', () => {
        if (state.evalIndex > 0) {
          state.evalIndex -= 1;
          renderDetail();
        }
      });
    }
    const nextEvalBtn = document.getElementById('btn-mat-cbt-next');
    if (nextEvalBtn) {
      nextEvalBtn.addEventListener('click', () => {
        if (state.evalIndex < state.evalQuestions.length - 1) {
          state.evalIndex += 1;
          renderDetail();
        }
      });
    }
    [document.getElementById('btn-mat-cbt-finish'), document.getElementById('btn-mat-cbt-finish-side')].forEach((b) => {
      if (b) b.addEventListener('click', () => finishMateriQuiz(false));
    });

    const retryEvalBtn = document.getElementById('btn-mat-cbt-retry');
    if (retryEvalBtn) {
      retryEvalBtn.addEventListener('click', () => {
        state.evalQuizPhase = 'setup';
        renderDetail();
      });
    }

    const matUploadForm = document.getElementById('form-mat-upload-tugas');
    if (matUploadForm && stu) {
      matUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('mtgs-file');
        const linkInput = document.getElementById('mtgs-link').value.trim();
        const babVal = document.getElementById('mtgs-bab').value.trim();
        const jenisTugas = document.getElementById('mtgs-jenis').value;
        const catatan = document.getElementById('mtgs-catatan').value.trim();
        const file = fileInput.files && fileInput.files[0];

        if (!file && !linkInput) {
          showToast('Pilih file untuk diunggah atau tempelkan tautan tugas.', 'warning');
          return;
        }
        if (file && file.size > 2 * 1024 * 1024) {
          showToast('Ukuran file melebihi 2 MB. Kompres atau gunakan tautan Google Drive.', 'warning');
          return;
        }

        const submitBtn = matUploadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          let fileBase64 = '';
          let fileMime = '';
          let fileName = '';
          if (file) {
            fileMime = file.type || 'application/octet-stream';
            const ext = (file.name.split('.').pop() || 'dat').toLowerCase();
            fileName = `TugasPAIBP_${String(stu.kelas || '').replace(/\s+/g, '')}_${String(stu.nama || '').replace(/\s+/g, '_')}.${ext}`;
            fileBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const resStr = String(reader.result || '');
                resolve(resStr.includes(',') ? resStr.split(',')[1] : resStr);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
          const res = await api.submitTugas({
            nisn: String(stu.nisn || stu.id || ''),
            nama: stu.nama,
            kelas: stu.kelas,
            bab: babVal,
            jenisTugas,
            fileUrl: linkInput || (fileName ? 'Disimpan lokal / Drive: ' + fileName : ''),
            fileBase64,
            fileMime,
            fileName,
            catatan
          });
          showToast(
            res.mode === 'live'
              ? 'Tugas berhasil diunggah ke Google Drive & dicatat di Sheets!'
              : 'Tugas tercatat dalam Mode Demo Lokal.'
          );
          if (fileInput) fileInput.value = '';
          document.getElementById('mtgs-link').value = '';
          document.getElementById('mtgs-catatan').value = '';
        } catch (err) {
          showToast('Gagal mengunggah tugas: ' + err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    const matAmlForm = document.getElementById('form-mat-amaliyah');
    if (matAmlForm && stu) {
      matAmlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = matAmlForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Menyimpan Jurnal...';
        try {
          const res = await api.submitAmaliyah({
            nisn: String(stu.nisn || stu.id || ''),
            nama: stu.nama,
            kelas: stu.kelas,
            bab: document.getElementById('maml-bab').value.trim(),
            lulusSensorGadget: document.getElementById('maml-gadget').checked,
            zeroProkrastinasi: document.getElementById('maml-prokras').checked,
            petarungFokus: document.getElementById('maml-fokus').checked,
            pencapaianTerbaik: document.getElementById('maml-capaian').value.trim(),
            refleksiKbc: document.getElementById('maml-kbc').value.trim()
          });
          showToast(
            res.mode === 'live'
              ? 'Jurnal Amaliyah tersimpan ke Google Sheets!'
              : 'Jurnal Amaliyah dicatat (Mode Demo Lokal).'
          );
          renderDetail();
        } catch (err) {
          showToast('Gagal menyimpan jurnal amaliyah: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🌟 Simpan Jurnal Amaliyah';
        }
      });
    }
  }

  if (state.selectedId) renderDetail();
  else renderCatalog();
};
