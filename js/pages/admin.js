/**
 * Panel Guru / Admin — Table-First & Modal Popup Architecture
 * - Sidebar menu kiri
 * - Login Username/Password dengan animasi loading
 * - Setiap halaman tampil ringkas hanya dengan Tabel + Filter + Search + Pagination (10/20/50)
 * - Seluruh form Tambah / Edit / Import Excel / Presensi Siswa terbuka di Modal Popup lebar (lg/xl)
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.admin = function renderAdmin(container) {
  const {
    escapeHtml,
    safeUrl,
    resolveImageUrl,
    showToast,
    formatDateId,
    renderBarChart,
    openModal,
    closeModal,
    openConfirmModal,
    openPdfPreviewModal,
    buildKopSuratPdfHtml,
    openImageCropModal,
    openImageLightbox,
    renderPasswordInput,
    bindPasswordToggles,
    confirmLogoutAction
  } = window.BTD_UI;
  const api = window.BTD_API;
  const todayIso = new Date().toISOString().slice(0, 10);

  const MONTHS = [
    { val: 'Semua', label: 'Semua Bulan' },
    { val: '01', label: 'Januari' }, { val: '02', label: 'Februari' }, { val: '03', label: 'Maret' },
    { val: '04', label: 'April' }, { val: '05', label: 'Mei' }, { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' }, { val: '08', label: 'Agustus' }, { val: '09', label: 'September' },
    { val: '10', label: 'Oktober' }, { val: '11', label: 'November' }, { val: '12', label: 'Desember' }
  ];

  const DEFAULT_ELEMEN_OPTIONS = [
    "Al-Qur'an & Hadis",
    'Akidah',
    'Akhlak',
    'Fikih',
    'Sejarah Peradaban Islam',
    'Moderasi Beragama',
    'Muamalah & Ekonomi Syariah',
    'Etika Digital & Adab Bermedia Sosial'
  ];

  const makePager = () => ({ page: 1, pageSize: 10 });

  const state = {
    tab: 'dashboard', // 'dashboard' | 'siswaKelas' | 'jadwal' | 'banner' | 'materi' | 'soal' | 'rekap' | 'belajar' | 'pengaturan'
    tabSiswa: 'kelas', // 'kelas' | 'siswa'
    tabBanner: 'banner', // 'banner' | 'galeri'
    tabMateri: 'materi', // 'materi' | 'tajwid'
    tabBelajar: 'praktikum', // 'praktikum' | 'komentar'
    selectedSoalJenjang: null, // Jenjang ('X' | 'XI' | 'XII') yang diklik pada tampilan kartu Bank Soal
    rekapSub: 'evaluasi', // 'evaluasi' | 'ruangKritis' | 'amaliyah' | 'tugas'
    tabPengaturan: 'guru', // 'guru' | 'sekolah' | 'tema' | 'akun'
    filters: {
      kelasSearch: '',
      siswaKelas: 'Semua',
      siswaSearch: '',
      jadwalBulan: 'Semua',
      jadwalSemester: 'Semua',
      jadwalKelas: 'Semua',
      jadwalJenis: 'Semua',
      jadwalStatus: 'Semua',
      jadwalSearch: '',
      bannerSearch: '',
      galeriKelas: 'Semua',
      galeriSearch: '',
      materiJenjang: 'Semua',
      materiSemester: 'Semua',
      materiBab: 'Semua',
      materiSearch: '',
      tajwidMateriId: 'Semua',
      tajwidSearch: '',
      soalKelas: 'Semua',
      soalSemester: 'Semua',
      soalBab: 'Semua',
      soalSearch: '',
      rekapKelas: 'Semua',
      rekapSearch: '',
      belajarKategori: 'Semua',
      belajarSearch: '',
      komentarTopik: 'Semua',
      komentarSearch: '',
      guruRiwayatKat: 'Semua'
    },
    tables: {
      kelas: makePager(),
      siswa: makePager(),
      jadwal: makePager(),
      banner: makePager(),
      galeri: makePager(),
      materi: makePager(),
      tajwid: makePager(),
      soal: makePager(),
      rekap: makePager(),
      belajar: { page: 1, pageSize: 50 },
      komentar: makePager()
    }
  };

  /* -------------------- Shared Pagination & Helpers -------------------- */
  function paginate(items, key) {
    const pager = state.tables[key] || (state.tables[key] = makePager());
    const pageSize = Number(pager.pageSize || 10);
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (pager.page > totalPages) pager.page = totalPages;
    if (pager.page < 1) pager.page = 1;
    const startIdx = (pager.page - 1) * pageSize;
    return {
      pageItems: items.slice(startIdx, startIdx + pageSize),
      page: pager.page,
      pageSize,
      total,
      totalPages,
      startIdx
    };
  }

  function renderPaginationBar(meta, key) {
    const startShow = meta.total === 0 ? 0 : meta.startIdx + 1;
    const endShow = Math.min(meta.total, meta.startIdx + meta.pageSize);
    return `
      <div class="pagination-bar no-print">
        <div>
          Menampilkan <strong>${startShow}–${endShow}</strong> dari <strong>${meta.total}</strong> data
        </div>
        <div class="pagination-controls">
          <label for="ps-${key}" style="font-weight:600;">Baris:</label>
          <select id="ps-${key}" class="select" data-page-size="${key}">
            ${[10, 20, 50].map((n) => `<option value="${n}" ${meta.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-outline btn-sm" data-page-prev="${key}" ${meta.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span>Hal <strong>${meta.page}</strong> / ${meta.totalPages}</span>
          <button type="button" class="btn btn-outline btn-sm" data-page-next="${key}" ${meta.page >= meta.totalPages ? 'disabled' : ''}>Next ›</button>
        </div>
      </div>
    `;
  }

  function bindPaginationEvents() {
    container.querySelectorAll('[data-page-size]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const key = sel.getAttribute('data-page-size');
        state.tables[key].pageSize = Number(sel.value);
        state.tables[key].page = 1;
        renderDashboard();
      });
    });
    container.querySelectorAll('[data-page-prev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-page-prev');
        if (state.tables[key].page > 1) {
          state.tables[key].page -= 1;
          renderDashboard();
        }
      });
    });
    container.querySelectorAll('[data-page-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-page-next');
        state.tables[key].page += 1;
        renderDashboard();
      });
    });
  }

  function bindSearchInput(id, filterKey, tableKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.filters[filterKey] = el.value;
      if (tableKey && state.tables[tableKey]) state.tables[tableKey].page = 1;
      renderDashboard();
      const fresh = document.getElementById(id);
      if (fresh) {
        fresh.focus();
        fresh.setSelectionRange(fresh.value.length, fresh.value.length);
      }
    });
  }

  function bindSelectFilter(id, filterKey, tableKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      state.filters[filterKey] = el.value;
      if (tableKey && state.tables[tableKey]) state.tables[tableKey].page = 1;
      renderDashboard();
    });
  }

  function getClassNamesList() {
    const fromMaster = (api.state.data.kelas || []).map((k) => k.namaKelas).filter(Boolean);
    if (fromMaster.length) return fromMaster;
    return (api.state.data.pengaturan && api.state.data.pengaturan.classes) || ['X M1', 'X M2'];
  }

  function getFilteredJadwalRows() {
    const q = state.filters.jadwalSearch.trim().toLowerCase();
    const sorted = (api.state.data.jadwal || []).slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
    return sorted.filter((j) => {
      const jSmt = String(j.semester || (Number(String(j.tanggal || '').slice(5, 7)) >= 1 && Number(String(j.tanggal || '').slice(5, 7)) <= 6 ? '2' : '1'));
      if (state.filters.jadwalBulan !== 'Semua' && String(j.tanggal || '').slice(5, 7) !== state.filters.jadwalBulan) return false;
      if (state.filters.jadwalSemester !== 'Semua' && jSmt !== state.filters.jadwalSemester) return false;
      if (state.filters.jadwalKelas !== 'Semua' && j.kelas !== state.filters.jadwalKelas) return false;
      if (state.filters.jadwalJenis !== 'Semua' && j.jenis !== state.filters.jadwalJenis) return false;
      if (state.filters.jadwalStatus !== 'Semua' && j.status !== state.filters.jadwalStatus) return false;
      if (q) {
        return String(j.materiJudul || '').toLowerCase().includes(q) || String(j.catatan || '').toLowerCase().includes(q);
      }
      return true;
    });
  }

  const QUICK_GRADE_CHIPS = [
    { val: 'A', isLetter: true },
    { val: 'B', isLetter: true },
    { val: 'C', isLetter: true },
    { val: 'D', isLetter: true },
    { val: 'E', isLetter: true },
    { val: '100', isLetter: false },
    { val: '95', isLetter: false },
    { val: '90', isLetter: false },
    { val: '85', isLetter: false },
    { val: '80', isLetter: false },
    { val: '75', isLetter: false }
  ];

  function isEntryUngraded(item) {
    return !item || item.nilai === undefined || item.nilai === null || String(item.nilai).trim() === '';
  }

  function resolveKelasJenjang(namaKelas) {
    const clean = String(namaKelas || '').trim();
    if (!clean) return '';
    const kls = (api.state.data.kelas || []).find(
      (k) => String(k.namaKelas || '').trim().toLowerCase() === clean.toLowerCase()
    );
    if (kls && kls.jenjang) return String(kls.jenjang).trim().toUpperCase();
    const m = clean.match(/^(XII|XI|X)\b/i);
    return m ? m[1].toUpperCase() : '';
  }

  function rkMatchesMateri(r, m) {
    if (!r || !m) return false;
    if (r.materiId && m.id && String(r.materiId) === String(m.id)) return true;
    const rJen = resolveKelasJenjang(r.kelas);
    const mJen = String(m.jenjang || '').trim().toUpperCase();
    if (!r.materiId && rJen && mJen && rJen === mJen) {
      const mKbc = String(m.nilaiKbc || '').trim().toLowerCase();
      const rKbc = String(r.nilaiKbc || '').trim().toLowerCase();
      if (mKbc && rKbc && (rKbc === mKbc || rKbc.includes(mKbc.slice(0, 12)))) return true;
    }
    return false;
  }

  function tugasMatchesMateri(t, m) {
    if (!t || !m) return false;
    if (t.materiId && m.id && String(t.materiId) === String(m.id)) return true;
    const mJen = String(m.jenjang || '').trim().toUpperCase();
    const tJen = resolveKelasJenjang(t.kelas);
    if (mJen && tJen && mJen !== tJen) return false;
    const babNum = String(m.bab || '').trim();
    const tBabRaw = String(t.bab || '').trim().toLowerCase();
    if (!babNum || !tBabRaw) return false;
    const babRegex = new RegExp(`(?:^|\\bbab\\s*)${babNum}(?:\\b|\\s|:|$)`, 'i');
    return babRegex.test(tBabRaw);
  }

  function getUngradedStats() {
    const rkAll = api.state.data.ruangKritis || [];
    const tugasAll = api.state.data.tugas || [];
    const ungradedRK = rkAll.filter(isEntryUngraded);
    const ungradedTugas = tugasAll.filter(isEntryUngraded);
    const normalizeKelas = (val) => String(val || '').trim().toLowerCase();

    return {
      ungradedRK,
      ungradedTugas,
      rkCount: ungradedRK.length,
      tugasCount: ungradedTugas.length,
      totalCount: ungradedRK.length + ungradedTugas.length,
      byKelas(namaKelas) {
        const key = normalizeKelas(namaKelas);
        const rk = ungradedRK.filter((r) => normalizeKelas(r.kelas) === key).length;
        const tugas = ungradedTugas.filter((t) => normalizeKelas(t.kelas) === key).length;
        return { rk, tugas, total: rk + tugas };
      },
      byMateri(m) {
        const rk = ungradedRK.filter((r) => rkMatchesMateri(r, m)).length;
        const tugas = ungradedTugas.filter((t) => tugasMatchesMateri(t, m)).length;
        return { rk, tugas, total: rk + tugas };
      }
    };
  }

  function renderRedBadge(count, tooltip = '') {
    const n = Number(count || 0);
    if (n <= 0) return '';
    return `<span class="nav-alert-badge" title="${escapeHtml(tooltip || `${n} tugas/jawaban belum dinilai`)}">${n}</span>`;
  }

  function renderCardCornerBadge(count, tooltip = '') {
    const n = Number(count || 0);
    if (n <= 0) return '';
    return `<span class="card-corner-badge" title="${escapeHtml(tooltip || `${n} tugas/jawaban belum dinilai`)}">${n}</span>`;
  }

  function jumpToUngradedRekap({ sub = 'auto', kelasFilter = 'Semua', materiObj = null } = {}) {
    const stats = getUngradedStats();
    let targetSub = sub;
    if (targetSub === 'auto') {
      if (materiObj) {
        const mStats = stats.byMateri(materiObj);
        targetSub = mStats.tugas > 0 ? 'tugas' : 'ruangKritis';
      } else if (kelasFilter !== 'Semua') {
        const kStats = stats.byKelas(kelasFilter);
        targetSub = kStats.tugas > 0 ? 'tugas' : 'ruangKritis';
      } else {
        targetSub = stats.tugasCount > 0 ? 'tugas' : 'ruangKritis';
      }
    }
    state.tab = 'rekap';
    state.rekapSub = targetSub;
    state.filters.rekapKelas = kelasFilter;
    let searchTxt = '';
    if (materiObj) {
      const pool = api.state.data[targetSub] || [];
      if (targetSub === 'tugas') {
        const probe = `Bab ${materiObj.bab}`;
        if (pool.some((r) => JSON.stringify(r).toLowerCase().includes(probe.toLowerCase()))) searchTxt = probe;
      } else if (materiObj.id) {
        if (pool.some((r) => String(r.materiId) === String(materiObj.id))) searchTxt = materiObj.id;
      }
    }
    state.filters.rekapSearch = searchTxt;
    state.tables.rekap.page = 1;
    renderDashboard();
  }

  function openSubmissionGradingModal({
    modalTitle,
    infoHtml,
    nilaiLabel,
    currentNilai,
    currentCatatan,
    showCurateCheckbox = false,
    currentDikurasi = false,
    saveButtonLabel = '💾 Simpan Nilai',
    savingLabel = 'Menyimpan Nilai...',
    onSave
  }) {
    const hasExistingNilai = currentNilai !== undefined && currentNilai !== null && String(currentNilai).trim() !== '';
    openModal(
      modalTitle,
      `<form id="modal-form-submission-grade" class="form-grid">
        <div class="callout callout-emerald" style="font-size:13.5px;">
          ${infoHtml}
        </div>

        <div class="field">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <label for="sub-grade-nilai" style="margin:0;">${escapeHtml(nilaiLabel || 'Nilai (Angka 0–100 atau Huruf A/B/C/D/E)')}</label>
            ${hasExistingNilai
              ? `<span class="tag tag-emerald">Nilai Saat Ini: <strong>${escapeHtml(String(currentNilai))}</strong></span>`
              : ''}
          </div>
          <input id="sub-grade-nilai" class="input" placeholder="Contoh: 90, 87.5, A, B+, dll..." value="${escapeHtml(currentNilai !== undefined && currentNilai !== null ? String(currentNilai) : '')}" />
          <div class="grade-quick-chips">
            ${QUICK_GRADE_CHIPS
              .map(
                (g) => `<button type="button" class="grade-quick-chip ${g.isLetter ? 'is-letter' : ''}" data-quick-sub-grade="${escapeHtml(g.val)}">${escapeHtml(g.val)}</button>`
              )
              .join('')}
            ${hasExistingNilai
              ? `<button type="button" class="btn btn-outline btn-sm" id="sub-grade-clear" style="margin-left:auto;color:var(--rose-600);border-color:#fda4af;">↺ Kosongkan Nilai</button>`
              : ''}
          </div>
        </div>

        <div class="field">
          <label for="sub-grade-catatan">Catatan / Umpan Balik Guru (Opsional)</label>
          <textarea id="sub-grade-catatan" class="textarea" rows="3" placeholder="Tuliskan apresiasi atau saran perbaikan untuk peserta didik...">${escapeHtml(currentCatatan || '')}</textarea>
        </div>

        ${showCurateCheckbox
          ? `<label class="check-card">
              <input type="checkbox" id="sub-grade-curate" ${currentDikurasi ? 'checked' : ''} />
              <span><strong>🌟 Tandai sebagai Analisis Terkurasi (Contoh Kelas)</strong></span>
            </label>`
          : ''}

        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="sub-grade-cancel">Tutup</button>
          <button type="submit" class="btn btn-primary" id="sub-grade-save">${saveButtonLabel}</button>
        </div>
      </form>`,
      { size: 'md' }
    );

    const inp = document.getElementById('sub-grade-nilai');
    const catInp = document.getElementById('sub-grade-catatan');
    document.querySelectorAll('[data-quick-sub-grade]').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (inp) {
          inp.value = chip.getAttribute('data-quick-sub-grade') || '';
          inp.focus();
        }
      });
    });
    const clearBtn = document.getElementById('sub-grade-clear');
    if (clearBtn && inp) {
      clearBtn.addEventListener('click', () => {
        inp.value = '';
        if (catInp) catInp.value = '';
        inp.focus();
        showToast('Kolom nilai dikosongkan. Klik Simpan untuk mengembalikan ke status Belum Dinilai.', 'warning');
      });
    }
    document.getElementById('sub-grade-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-submission-grade').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById('sub-grade-save');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-inline"></span> ${escapeHtml(savingLabel)}`;
      try {
        const nilaiVal = document.getElementById('sub-grade-nilai').value.trim();
        const catVal = document.getElementById('sub-grade-catatan').value.trim();
        const curEl = document.getElementById('sub-grade-curate');
        const curVal = curEl ? Boolean(curEl.checked) : false;
        await onSave({ nilai: nilaiVal, catatanGuru: catVal, dikurasi: curVal });
        closeModal();
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan nilai: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = saveButtonLabel;
      }
    });
  }

  function openEvaluasiEditModal(row) {
    if (!row) return;
    const maxSoal = Math.max(0, Number(row.totalSoal || 0));
    openModal(
      `✏️ Edit Nilai CBT — ${row.nama || 'Siswa'}`,
      `<form id="modal-form-evl-edit" class="form-grid">
        <div class="callout callout-emerald" style="font-size:13.5px;">
          <strong>${escapeHtml(row.nama || '')}</strong> (${escapeHtml(row.kelas || '-')}) • NISN: <code>${escapeHtml(row.nisn || '-')}</code><br/>
          <strong>Paket Soal:</strong> Kelas ${escapeHtml(row.jenjang || '-')} • Bab ${escapeHtml(row.bab || '-')} (${maxSoal} soal)
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="evl-edit-skor">Skor Akhir CBT (0–100)</label>
            <input id="evl-edit-skor" type="number" min="0" max="100" step="1" class="input" required value="${escapeHtml(String(row.skor !== undefined ? row.skor : 0))}" />
          </div>
          <div class="field">
            <label for="evl-edit-benar">Jumlah Jawaban Benar${maxSoal > 0 ? ` (Maks ${maxSoal})` : ''}</label>
            <input id="evl-edit-benar" type="number" min="0" ${maxSoal > 0 ? `max="${maxSoal}"` : ''} step="1" class="input" value="${escapeHtml(String(row.benar !== undefined ? row.benar : 0))}" />
          </div>
        </div>
        <div class="field">
          <label for="evl-edit-catatan">Catatan Penyesuaian Guru (Opsional)</label>
          <textarea id="evl-edit-catatan" class="textarea" rows="3" placeholder="Misal: Perbaikan nilai remidi / penyesuaian bonus esai...">${escapeHtml(row.catatanGuru || '')}</textarea>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="evl-edit-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="evl-edit-save">💾 Simpan Perubahan Nilai</button>
        </div>
      </form>`,
      { size: 'md' }
    );
    document.getElementById('evl-edit-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-evl-edit').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById('evl-edit-save');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan Perubahan...';
      try {
        const skor = Number(document.getElementById('evl-edit-skor').value);
        const benar = Number(document.getElementById('evl-edit-benar').value);
        const catatanGuru = document.getElementById('evl-edit-catatan').value.trim();
        await api.gradeEvaluasi({ id: row.id, skor, benar, catatanGuru });
        closeModal();
        showToast(`Nilai CBT untuk ${row.nama || 'siswa'} berhasil diperbarui menjadi ${skor}!`);
        renderDashboard();
      } catch (err) {
        showToast('Gagal mengedit nilai CBT: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Perubahan Nilai';
      }
    });
  }

  function getFilteredRekapRows(key) {
    const rawRows = api.state.data[key] || [];
    const q = state.filters.rekapSearch.trim().toLowerCase();
    return rawRows.filter((r) => {
      if (state.filters.rekapKelas !== 'Semua' && r.kelas !== state.filters.rekapKelas) return false;
      if (!q) return true;
      return JSON.stringify(r).toLowerCase().includes(q);
    });
  }

  function getRekapExportSpec(key) {
    const rows = getFilteredRekapRows(key);
    const klsLabel = state.filters.rekapKelas === 'Semua' ? 'Semua Kelas' : state.filters.rekapKelas;
    const todayTxt = formatDateId(todayIso);

    if (key === 'evaluasi') {
      return {
        fileName: `Rekap_Nilai_CBT_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Nilai CBT',
        title: 'REKAP NILAI PAIBP SMART TEST (CBT)',
        subtitle: `Filter Kelas: ${klsLabel}  |  Dicetak: ${todayTxt}`,
        headers: ['No', 'Tanggal', 'NISN', 'Nama Peserta Didik', 'Kelas', 'Paket Materi', 'Skor', 'Benar / Soal', 'Durasi (Detik)', 'Catatan Guru'],
        rows: rows.map((e, i) => [
          i + 1,
          formatDateId(e.timestamp),
          String(e.nisn || '-'),
          e.nama || '',
          e.kelas || '-',
          `Kelas ${e.jenjang || '-'} Bab ${e.bab || '-'}`,
          Number(e.skor || 0),
          `${e.benar || 0}/${e.totalSoal || 0}`,
          Number(e.waktuDetik || 0),
          e.catatanGuru || '-'
        ]),
        centerCols: [0, 1, 2, 4, 5, 6, 7, 8],
        textCols: [2],
        summaryText: `Total Peserta Evaluasi: ${rows.length} Siswa`,
        orientation: 'landscape'
      };
    }

    if (key === 'ruangKritis') {
      return {
        fileName: `Rekap_Ruang_Kritis_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Ruang Kritis',
        title: 'REKAP ANALISIS HOTS & RUANG KRITIS SISWA',
        subtitle: `Filter Kelas: ${klsLabel}  |  Dicetak: ${todayTxt}`,
        headers: ['No', 'Tanggal', 'NISN', 'Nama Peserta Didik', 'Kelas', 'Nilai KBC', 'Uraian Analisis HOTS', 'Nilai', 'Catatan Guru', 'Status Kurasi'],
        rows: rows.map((r, i) => [
          i + 1,
          formatDateId(r.timestamp),
          String(r.nisn || '-'),
          r.nama || '',
          r.kelas || '-',
          r.nilaiKbc || '-',
          r.analisis || '',
          r.nilai !== undefined && r.nilai !== null && String(r.nilai).trim() !== '' ? String(r.nilai) : '-',
          r.catatanGuru || '-',
          r.dikurasi ? 'Terkurasi di Galeri' : 'Belum Dikurasi'
        ]),
        centerCols: [0, 1, 2, 4, 7, 9],
        textCols: [2, 7],
        summaryText: `Total Analisis Ruang Kritis: ${rows.length} Respons`,
        orientation: 'landscape'
      };
    }

    if (key === 'amaliyah') {
      return {
        fileName: `Rekap_Amaliyah_KBC_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Amaliyah KBC',
        title: 'REKAP JURNAL AMALIYAH & KURIKULUM BERBASIS CINTA',
        subtitle: `Filter Kelas: ${klsLabel}  |  Dicetak: ${todayTxt}`,
        headers: ['No', 'Tanggal', 'NISN', 'Nama Peserta Didik', 'Kelas', 'Bab', 'Sensor Gadget', 'Zero Prokrastinasi', 'Petarung Fokus', 'Aksi Nyata Terbaik', 'Refleksi KBC', 'Nilai', 'Catatan Guru'],
        rows: rows.map((a, i) => [
          i + 1,
          formatDateId(a.timestamp),
          String(a.nisn || '-'),
          a.nama || '',
          a.kelas || '-',
          `Bab ${a.bab || '-'}`,
          a.lulusSensorGadget ? 'Ya' : 'Belum',
          a.zeroProkrastinasi ? 'Ya' : 'Belum',
          a.petarungFokus ? 'Ya' : 'Belum',
          a.pencapaianTerbaik || '-',
          a.refleksiKbc || '-',
          a.nilai !== undefined && a.nilai !== null && String(a.nilai).trim() !== '' ? String(a.nilai) : '-',
          a.catatanGuru || '-'
        ]),
        centerCols: [0, 1, 2, 4, 5, 6, 7, 8, 11],
        textCols: [2, 11],
        summaryText: `Total Jurnal Amaliyah: ${rows.length} Catatan`,
        orientation: 'landscape'
      };
    }

    return {
      fileName: `Rekap_Tugas_Daring_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
      sheetName: 'Tugas Daring',
      title: 'REKAP PENGUMPULAN TUGAS DARING SISWA',
      subtitle: `Filter Kelas: ${klsLabel}  |  Dicetak: ${todayTxt}`,
      headers: ['No', 'Tanggal', 'NISN', 'Nama Peserta Didik', 'Kelas', 'Bab', 'Jenis Tugas', 'Tautan / Berkas', 'Catatan Siswa', 'Nilai', 'Catatan Guru'],
      rows: rows.map((t, i) => [
        i + 1,
        formatDateId(t.timestamp),
        String(t.nisn || '-'),
        t.nama || '',
        t.kelas || '-',
        `Bab ${t.bab || '-'}`,
        t.jenisTugas || '-',
        t.fileUrl || '-',
        t.catatan || '-',
        t.nilai !== undefined && t.nilai !== null && String(t.nilai).trim() !== '' ? String(t.nilai) : '-',
        t.catatanGuru || '-'
      ]),
      centerCols: [0, 1, 2, 4, 5, 6, 9],
      textCols: [2, 9],
      summaryText: `Total Tugas Daring Masuk: ${rows.length} Berkas`,
      orientation: 'landscape'
    };
  }

  function buildScheduleAttendanceRecords({ jadwalId, tanggal, kelas, jamKe }) {
    const siswaList = api.state.data.siswa || [];
    const students = siswaList.filter((s) => s.kelas === kelas && (s.status || 'Aktif') === 'Aktif');
    const existingRows = (api.state.data.absensi || []).filter((a) => {
      if (jadwalId && a.jadwalId) return a.jadwalId === jadwalId;
      return a.tanggal === tanggal && a.kelas === kelas && a.jadwal === jamKe;
    });
    if (!students.length) {
      return existingRows.map((r) => ({
        nisn: String(r.nisn || r.nis || ''),
        nama: String(r.nama || ''),
        status: r.status || 'Belum Absen',
        catatan: r.catatan || '',
        fotoUrl: r.fotoUrl || ''
      }));
    }
    return students.map((s) => {
      const nisn = String(s.nisn || s.nis || s.id || '');
      const prev = existingRows.find((r) => (nisn && String(r.nisn || r.nis || '') === nisn) || r.nama === s.nama);
      return {
        nisn,
        nama: s.nama,
        status: (prev && prev.status) || 'Belum Absen',
        catatan: (prev && prev.catatan) || '',
        fotoUrl: (prev && prev.fotoUrl) || ''
      };
    });
  }

  function openAttendancePdfPreview({ kelas, tanggal, tanggalLabel, jam, materi, jenis, statusJadwal, records }) {
    const cfg = api.state.data.pengaturan || {};
    const counts = { 'Belum Absen': 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    const tableRows = (records || []).map((rec, idx) => {
      const stRaw = String(rec.status || 'Belum Absen').trim() || 'Belum Absen';
      const stLower = stRaw.toLowerCase();
      if (stLower === 'hadir') counts.Hadir++;
      else if (stLower === 'izin') counts.Izin++;
      else if (stLower === 'sakit') counts.Sakit++;
      else if (stLower === 'alpa') counts.Alpa++;
      else counts['Belum Absen']++;
      const noteText = String(rec.catatan || '').trim();
      const combinedNote = [noteText, rec.fotoUrl ? '[Foto Selfie Terlampir]' : ''].filter(Boolean).join(' • ') || '-';
      return [
        idx + 1,
        String(rec.nisn || '-'),
        String(rec.nama || ''),
        stRaw,
        combinedNote
      ];
    });

    const cleanKelas = String(kelas || 'Kelas').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const cleanTgl = String(tanggal || 'tanggal').replace(/[^0-9-]+/g, '_');
    const docHtml = buildKopSuratPdfHtml({
      fileNameTitle: `Daftar_Hadir_${cleanKelas}_${cleanTgl}`,
      docTitle: 'DAFTAR HADIR PESERTA DIDIK',
      docSubtitle: `Mata Pelajaran Pendidikan Agama Islam & Budi Pekerti  •  Tahun Ajaran ${cfg.academicYear || '2026/2027'}`,
      metaPairs: [
        { label: 'Kelas', value: kelas || '-' },
        { label: 'Tanggal', value: tanggalLabel || tanggal || '-' },
        { label: 'Jam Pelajaran', value: jam || '-' },
        { label: 'Mode / Status', value: [jenis, statusJadwal].filter(Boolean).join(' • ') || 'Tatap Muka / Daring' },
        { label: 'Materi Pokok', value: materi || '-' }
      ],
      tableHeaders: ['No', 'NISN', 'Nama Peserta Didik', 'Status Kehadiran', 'Catatan'],
      tableRows,
      centerCols: [0, 1, 3],
      summaryText: `REKAP KEHADIRAN: Total ${tableRows.length} Siswa   |   Hadir: ${counts.Hadir}   |   Izin: ${counts.Izin}   |   Sakit: ${counts.Sakit}   |   Alpa: ${counts.Alpa}   |   Belum Absen: ${counts['Belum Absen']}`,
      signaturePlaceDate: `${cfg.schoolCity || 'Tebo'}, ${tanggalLabel || tanggal || formatDateId(todayIso)}`,
      orientation: 'portrait',
      cfg
    });

    openPdfPreviewModal({
      modalTitle: `📄 Pratinjau PDF Daftar Hadir — ${kelas || '-'}`,
      docHtml
    });
  }

  function attachModalUpload(fileInputId, urlInputId, prefix, opts = {}) {
    const inp = document.getElementById(fileInputId);
    const urlInp = document.getElementById(urlInputId);
    if (!inp || !urlInp) return;
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      try {
        showToast('Mengompres gambar ke Base64 (< 46.000 char)...', 'warning');
        const res = await api.uploadImageMedia(file, prefix, opts);
        urlInp.value = res.url;
        inp.value = '';
        if (opts.previewId) {
          const prevEl = document.getElementById(opts.previewId);
          if (prevEl) {
            prevEl.innerHTML = `<img src="${escapeHtml(resolveImageUrl(res.url))}" alt="Pratinjau" style="width:100%;height:100%;object-fit:cover;" />`;
          }
        }
        showToast(`Gambar siap (${res.charCount.toLocaleString('id-ID')} karakter Base64, aman untuk Google Sheets).`);
      } catch (err) {
        showToast('Gagal mengolah gambar: ' + err.message, 'error');
      }
    });
  }

  function attachCropUpload({
    fileInputId,
    urlInputId,
    previewId,
    title,
    ratioLabel,
    aspectRatio,
    outWidth,
    outHeight,
    maxChars = 46000,
    freeCrop = false,
    lockRatio = false,
    preferPng = false,
    preserveTransparency = false,
    fitMode = 'cover',
    onDoneNotice
  }) {
    const inp = document.getElementById(fileInputId);
    if (!inp) return;
    inp.addEventListener('change', () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      inp.value = '';
      openImageCropModal({
        file,
        title,
        ratioLabel,
        aspectRatio,
        outWidth,
        outHeight,
        maxChars,
        freeCrop,
        lockRatio,
        preferPng,
        preserveTransparency,
        fitMode,
        onCropped(dataUrl, meta) {
          const urlInp = document.getElementById(urlInputId);
          if (urlInp) urlInp.value = dataUrl;
          if (previewId) {
            const prev = document.getElementById(previewId);
            if (prev) {
              const fit = preserveTransparency ? 'contain' : 'cover';
              prev.innerHTML = `<img src="${escapeHtml(resolveImageUrl(dataUrl))}" alt="Pratinjau" style="width:100%;height:100%;object-fit:${fit};" />`;
            }
          }
          const chars = (meta && meta.charCount) || dataUrl.length;
          showToast(onDoneNotice || `Gambar di-crop ${ratioLabel} (${chars.toLocaleString('id-ID')} char Base64 < 50.000) & siap disimpan.`);
        }
      });
    });
  }

  /* -------------------- Login Screen -------------------- */
  function renderLogin() {
    container.innerHTML = `
      <div class="page-banner">
        <div class="container">
          <span class="eyebrow">Akses Pendidik &amp; Pengelola Kelas</span>
          <h1>Panel Guru — Bilik Tarbiyah Digital</h1>
          <p>Kelola data kelas, daftar siswa ber-NISN (import Excel), jadwal pembelajaran, daftar hadir mengajar, materi, bank soal, serta rekap nilai.</p>
        </div>
      </div>

      <div class="container" style="max-width:520px;">
        <div class="card">
          <h2 style="margin:0 0 8px;">🔐 Login Panel Guru</h2>
          <p style="margin:0 0 16px;color:var(--slate-600);font-size:13.8px;">
            Masuk menggunakan <strong>Username</strong> dan <strong>Password</strong> guru yang terdaftar di Spreadsheet / Pengaturan.
          </p>
          <form id="form-admin-login" class="form-grid">
            <div class="field">
              <label for="admin-user-input">Username</label>
              <input id="admin-user-input" type="text" class="input" required placeholder="Masukkan username guru" autocomplete="username" />
            </div>
            <div class="field">
              <label for="admin-pass-input">Password</label>
              ${renderPasswordInput({
      id: 'admin-pass-input',
      required: true,
      placeholder: 'Masukkan password',
      autocomplete: 'current-password'
    })}
            </div>
            <button type="submit" class="btn btn-primary" id="btn-login-submit">Masuk ke Panel Guru</button>
          </form>
          <div class="login-loading-banner" id="login-loading-banner" hidden>
            <span class="spinner-inline dark"></span>
            <span>Sedang memverifikasi akun &amp; memuat data dari database, mohon tunggu...</span>
          </div>
          <div id="login-error-box" class="callout" style="margin-top:12px;background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:13.5px;font-weight:600;" hidden></div>
        </div>
      </div>
    `;

    bindPasswordToggles(container);

    const form = document.getElementById('form-admin-login');
    const userInp = document.getElementById('admin-user-input');
    const passInp = document.getElementById('admin-pass-input');
    const btn = document.getElementById('btn-login-submit');
    const loadingBanner = document.getElementById('login-loading-banner');
    const errBox = document.getElementById('login-error-box');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.hidden = true;
      btn.disabled = true;
      userInp.readOnly = true;
      passInp.readOnly = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Memproses Login...';
      loadingBanner.hidden = false;

      try {
        const ok = await api.verifyAdmin(userInp.value, passInp.value);
        if (ok) {
          if (window.BTD_UI && typeof window.BTD_UI.syncChromeMetadata === 'function') {
            window.BTD_UI.syncChromeMetadata();
          }
          showToast('Berhasil masuk ke Panel Guru.');
          renderDashboard();
        } else {
          loadingBanner.hidden = true;
          errBox.textContent = 'Username atau password tidak sesuai. Periksa kembali akun Anda.';
          errBox.hidden = false;
          showToast('Username atau password tidak sesuai.', 'error');
          btn.disabled = false;
          userInp.readOnly = false;
          passInp.readOnly = false;
          btn.textContent = 'Masuk ke Panel Guru';
        }
      } catch (err) {
        loadingBanner.hidden = true;
        errBox.textContent = 'Gagal terhubung ke server: ' + err.message;
        errBox.hidden = false;
        showToast('Gagal memverifikasi login: ' + err.message, 'error');
        btn.disabled = false;
        userInp.readOnly = false;
        passInp.readOnly = false;
        btn.textContent = 'Masuk ke Panel Guru';
      }
    });
  }

  /* -------------------- Excel Template & Parser Helpers -------------------- */
  function downloadStudentTemplate() {
    const sampleRows = [
      { NISN: '0091000191', 'Nama Lengkap': 'Abdullah Azzam', Kelas: 'X M1', 'Jenis Kelamin': 'L', Status: 'Aktif' },
      { NISN: '0091000192', 'Nama Lengkap': 'Aisyah Humaira', Kelas: 'X M1', 'Jenis Kelamin': 'P', Status: 'Aktif' }
    ];

    if (window.XLSX) {
      const wb = window.XLSX.utils.book_new();
      const wsData = window.XLSX.utils.json_to_sheet(sampleRows);
      wsData['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
      // Paksa format Teks ('@') pada kolom A (NISN) agar angka 0 di depan tidak hilang di Excel
      for (let r = 2; r <= 200; r++) {
        const ref = 'A' + r;
        if (!wsData[ref]) wsData[ref] = { t: 's', v: '', z: '@' };
        else {
          wsData[ref].t = 's';
          wsData[ref].v = String(wsData[ref].v || '');
          wsData[ref].z = '@';
        }
      }
      window.XLSX.utils.book_append_sheet(wb, wsData, 'DataSiswa');

      const wsGuide = window.XLSX.utils.aoa_to_sheet([
        ['PETUNJUK PENGISIAN TEMPLATE DATA SISWA (NISN WAJIB 10 ANGKA)'],
        ['Kolom NISN', 'Wajib diisi TEPAT 10 digit angka unik (contoh: 0091000191). Format kolom sudah Teks (@) agar angka 0 di depan tidak hilang.'],
        ['Kolom Nama Lengkap', 'Wajib diisi nama lengkap siswa'],
        ['Kolom Kelas', 'Wajib diisi sesuai nama kelas (contoh: X M1, X M2, XI M1, XII M1)'],
        ['Kolom Jenis Kelamin', 'Isi L (Laki-laki) atau P (Perempuan)'],
        ['Kolom Status', 'Isi Aktif, Pindah, atau Lulus']
      ]);
      wsGuide['!cols'] = [{ wch: 24 }, { wch: 76 }];
      window.XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

      window.XLSX.writeFile(wb, 'Template_Data_Siswa_NISN_Bilik_Tarbiyah.xlsx');
      showToast('Template Excel (.xlsx) format Teks NISN 10 angka berhasil diunduh.');
      return;
    }

    api.exportTableExcel({
      fileName: 'Template_Data_Siswa_NISN_Bilik_Tarbiyah.xlsx',
      sheetName: 'DataSiswa',
      title: 'TEMPLATE IMPORT DATA SISWA (NISN 10 ANGKA)',
      subtitle: 'Isi kolom NISN tepat 10 angka unik (format Teks agar 0 di depan terjaga).',
      headers: ['NISN', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Status'],
      rows: sampleRows.map((r) => [r.NISN, r['Nama Lengkap'], r.Kelas, r['Jenis Kelamin'], r.Status]),
      centerCols: [0, 2, 3, 4],
      textCols: [0],
      orientation: 'portrait'
    })
      .then(() => showToast('Template Excel (.xlsx) berhasil diunduh.'))
      .catch((err) => showToast('Gagal membuat template Excel: ' + err.message, 'error'));
  }

  function normalizeImportedRow(raw) {
    const map = {};
    Object.keys(raw || {}).forEach((k) => {
      map[String(k).trim().toLowerCase()] = raw[k];
    });
    const rawNisn = map.nisn !== undefined && map.nisn !== '' ? map.nisn : (map.nis || map['id siswa'] || map['no induk'] || '');
    const nisn = String(rawNisn).replace(/^'+/, '').trim();
    const nama = String(map['nama lengkap'] || map.nama || map['nama siswa'] || '').trim();
    const kelas = String(map.kelas || map.rombel || (state.filters.siswaKelas !== 'Semua' ? state.filters.siswaKelas : '')).trim();
    const jk = String(map['jenis kelamin'] || map.jk || map.kelamin || map.gender || 'L').trim();
    const status = String(map.status || 'Aktif').trim() || 'Aktif';
    return { nisn, nama, kelas, jenisKelamin: jk, status };
  }

  async function parseExcelOrCsvFile(file, rowMapper = normalizeImportedRow) {
    const name = (file.name || '').toLowerCase();
    if (window.XLSX && !name.endsWith('.csv')) {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // raw: false membaca tampilan teks terformat agar 0 di depan tidak terhapus
      const rawRows = window.XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
      return rawRows.map(rowMapper);
    }
    if (window.XLSX && name.endsWith('.csv')) {
      const text = await file.text();
      const wb = window.XLSX.read(text, { type: 'string', raw: true });
      const rawRows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' });
      return rawRows.map(rowMapper);
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const splitLine = (line) => line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((l) => {
      const cols = splitLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
      return rowMapper(obj);
    });
  }

  function inferJenjangFromName(name) {
    const up = String(name || '').trim().toUpperCase();
    if (/^XII(\b|[^I])/.test(up) || up === '12') return 'XII';
    if (/^XI(\b|[^I])/.test(up) || up === '11') return 'XI';
    if (/^X(\b|[^I])/.test(up) || up === '10') return 'X';
    return up;
  }

  function resolveSoalJenjang(s) {
    if (s && s.jenjang) return String(s.jenjang).trim().toUpperCase();
    if (s && s.kelas) {
      const kHit = (api.state.data.kelas || []).find(
        (k) => String(k.namaKelas || '').trim().toLowerCase() === String(s.kelas).trim().toLowerCase()
      );
      if (kHit && kHit.jenjang) return String(kHit.jenjang).trim().toUpperCase();
      return inferJenjangFromName(s.kelas);
    }
    return 'X';
  }

  function getSoalJenjangList() {
    const baseOrder = ['X', 'XI', 'XII'];
    const set = new Set();
    (api.state.data.kelas || []).forEach((k) => {
      const j = String(k.jenjang || inferJenjangFromName(k.namaKelas)).trim().toUpperCase();
      if (j) set.add(j);
    });
    (api.state.data.materi || []).forEach((m) => {
      const j = String(m.jenjang || '').trim().toUpperCase();
      if (j) set.add(j);
    });
    (api.state.data.bankSoal || []).forEach((s) => {
      const j = resolveSoalJenjang(s);
      if (j) set.add(j);
    });
    const ordered = baseOrder.filter((j) => set.has(j));
    set.forEach((j) => {
      if (!ordered.includes(j)) ordered.push(j);
    });
    return ordered;
  }

  function getRombelListByJenjang(jenjang) {
    const cleanJ = String(jenjang || '').trim().toUpperCase();
    const rombels = [];
    const seen = new Set();
    const pushName = (n) => {
      const clean = String(n || '').trim();
      if (!clean || seen.has(clean.toLowerCase())) return;
      seen.add(clean.toLowerCase());
      rombels.push(clean);
    };
    (api.state.data.kelas || []).forEach((k) => {
      const kJ = String(k.jenjang || inferJenjangFromName(k.namaKelas)).trim().toUpperCase();
      if (kJ === cleanJ) pushName(k.namaKelas);
    });
    (api.state.data.bankSoal || []).forEach((s) => {
      if (s.kelas && resolveSoalJenjang(s) === cleanJ) pushName(s.kelas);
    });
    return rombels;
  }

  function soalBelongsToJenjang(s, jenjang) {
    if (!jenjang) return true;
    return resolveSoalJenjang(s) === String(jenjang).trim().toUpperCase();
  }

  function getMateriByJenjang(jenjang) {
    const cleanJ = String(jenjang || '').trim().toUpperCase();
    const all = api.state.data.materi || [];
    const filtered = cleanJ
      ? all.filter((m) => String(m.jenjang || '').trim().toUpperCase() === cleanJ)
      : all;
    return filtered.slice().sort(
      (a, b) =>
        Number(a.semester || (Number(a.bab) <= 5 ? 1 : 2)) -
        Number(b.semester || (Number(b.bab) <= 5 ? 1 : 2)) ||
        Number(a.bab) - Number(b.bab)
    );
  }

  function resolveSoalMateriTitle(s) {
    if (s.materiJudul) return String(s.materiJudul);
    const hit = (api.state.data.materi || []).find(
      (m) =>
        (s.materiId && m.id === s.materiId) ||
        (String(m.jenjang || '').toUpperCase() === String(s.jenjang || '').toUpperCase() &&
          Number(m.bab) === Number(s.bab))
    );
    return hit ? `Bab ${hit.bab}: ${hit.judul}` : `Bab ${s.bab || '-'}`;
  }

  function normalizeImportedSoalRow(raw) {
    const map = {};
    Object.keys(raw || {}).forEach((k) => {
      map[String(k).trim().toLowerCase()] = raw[k];
    });
    const pick = (keys) => {
      for (let i = 0; i < keys.length; i++) {
        if (map[keys[i]] !== undefined && String(map[keys[i]]).trim() !== '') {
          return String(map[keys[i]]).trim();
        }
      }
      return '';
    };
    return {
      semester: pick(['semester', 'smt']),
      bab: pick(['bab', 'no bab', 'nomor bab']),
      pertanyaan: pick(['pertanyaan', 'teks pertanyaan', 'soal']),
      opsiA: pick(['pilihan a', 'opsi a', 'a']),
      opsiB: pick(['pilihan b', 'opsi b', 'b']),
      opsiC: pick(['pilihan c', 'opsi c', 'c']),
      opsiD: pick(['pilihan d', 'opsi d', 'd']),
      opsiE: pick(['pilihan e', 'opsi e', 'e']),
      kunci: pick(['kunci (a-e)', 'kunci jawaban', 'kunci', 'jawaban']),
      level: pick(['level kognitif', 'level', 'taksonomi']) || 'HOTS (C4)',
      pembahasan: pick(['pembahasan', 'penjelasan'])
    };
  }

  function downloadSoalTemplate(jenjangVal = 'X', defaultKelasName = '') {
    const jenjang = String(jenjangVal && typeof jenjangVal === 'object' ? jenjangVal.jenjang : jenjangVal || 'X').trim().toUpperCase();
    const kelasName =
      defaultKelasName ||
      (jenjangVal && typeof jenjangVal === 'object' ? String(jenjangVal.namaKelas || '') : '');
    const scopeLabel = kelasName ? `${kelasName} (Jenjang ${jenjang})` : `Kelas ${jenjang} (Semua Rombel)`;
    const materiList = getMateriByJenjang(jenjang);
    const firstBab = materiList[0] ? Number(materiList[0].bab) : 1;
    const firstSmt = materiList[0] ? String(materiList[0].semester || (firstBab <= 5 ? '1' : '2')) : '1';

    const sampleRows = [
      {
        Semester: Number(firstSmt),
        Bab: firstBab,
        Pertanyaan: 'Dalam menghadapi perbedaan pendapat di sekolah, sikap pelajar yang mencerminkan akhlak Islami dan Kurikulum Berbasis Cinta adalah...',
        'Pilihan A': 'Memaksakan kehendak kepada teman sekelas',
        'Pilihan B': 'Menghargai pendapat teman dengan santun dan bermusyawarah mencari mufakat',
        'Pilihan C': 'Menghindari kerja kelompok agar tidak berdebat',
        'Pilihan D': 'Mengkritik teman di media sosial',
        'Pilihan E': 'Menunggu keputusan tanpa memberi saran apa pun',
        'Kunci (A-E)': 'B',
        'Level Kognitif': 'HOTS (C4)',
        Pembahasan: 'Musyawarah dan menghargai perbedaan merupakan ajaran pokok akhlak mulia dalam Islam.'
      },
      {
        Semester: Number(firstSmt),
        Bab: firstBab,
        Pertanyaan: 'Apabila nun mati atau tanwin bertemu huruf jim (ج), hukum bacaan tajwidnya adalah...',
        'Pilihan A': 'Idzhar Halqi',
        'Pilihan B': 'Idgham Bighunnah',
        'Pilihan C': 'Ikhfa Haqiqi',
        'Pilihan D': 'Iqlab',
        'Pilihan E': 'Idgham Bilaghunnah',
        'Kunci (A-E)': 'C',
        'Level Kognitif': 'C2',
        Pembahasan: 'Jim termasuk salah satu dari 15 huruf Ikhfa Haqiqi sehingga dibaca samar disertai dengung.'
      }
    ];

    if (window.XLSX) {
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.json_to_sheet(sampleRows);
      ws['!cols'] = [
        { wch: 10 },
        { wch: 8 },
        { wch: 48 },
        { wch: 26 },
        { wch: 26 },
        { wch: 26 },
        { wch: 26 },
        { wch: 26 },
        { wch: 14 },
        { wch: 16 },
        { wch: 42 }
      ];
      window.XLSX.utils.book_append_sheet(wb, ws, 'BankSoal');

      const guideRows = [
        [`DAFTAR MATERI TERSIMPAN & PETUNJUK PENGISIAN (${scopeLabel})`],
        ['Aturan Umum', `Semua soal pada file ini otomatis masuk ke Jenjang Kelas ${jenjang}${kelasName ? ` (Rombel ${kelasName})` : ' (Semua Rombel)'}.`],
        ['Kolom Semester', 'Isi angka 1 (Ganjil) atau 2 (Genap). Jika dikosongkan, mengikuti semester materi pada Bab terpilih.'],
        ['Kolom Bab', 'Isi angka nomor Bab sesuai daftar materi di bawah (contoh: 1, 2, 3).'],
        ['Kolom Pilihan A–E', 'Pilihan A–D wajib diisi. Pilihan E boleh dikosongkan jika memakai 4 pilihan ganda.'],
        ['Kolom Kunci (A-E)', 'Wajib diisi huruf A, B, C, D, atau E.'],
        [],
        ['Bab', 'Semester', 'Jenjang', 'Judul Materi Tersimpan']
      ];
      if (materiList.length === 0) {
        guideRows.push([1, 'Semester 1 (Ganjil)', jenjang, 'Belum ada materi tersimpan untuk jenjang ini']);
      } else {
        materiList.forEach((m) => {
          const smt = String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === '2' ? 'Semester 2 (Genap)' : 'Semester 1 (Ganjil)';
          guideRows.push([Number(m.bab), smt, m.jenjang, m.judul]);
        });
      }
      const wsGuide = window.XLSX.utils.aoa_to_sheet(guideRows);
      wsGuide['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 64 }];
      window.XLSX.utils.book_append_sheet(wb, wsGuide, 'Daftar_Materi');

      const safeName = String(kelasName || `Kelas_${jenjang}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
      window.XLSX.writeFile(wb, `Template_Bank_Soal_${safeName}_Bilik_Tarbiyah.xlsx`);
      showToast(`Template Bank Soal (.xlsx) untuk ${scopeLabel} berhasil diunduh.`);
      return;
    }

    api.exportTableExcel({
      fileName: `Template_Bank_Soal_${String(kelasName || `Kelas_${jenjang}`).replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`,
      sheetName: 'BankSoal',
      title: `TEMPLATE IMPORT BANK SOAL CBT (${scopeLabel})`,
      subtitle: 'Isi Kunci Jawaban dengan huruf A, B, C, D, atau E. Pilihan E opsional.',
      headers: ['Semester', 'Bab', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Pilihan E', 'Kunci (A-E)', 'Level Kognitif', 'Pembahasan'],
      rows: sampleRows.map((r) => [
        r.Semester, r.Bab, r.Pertanyaan, r['Pilihan A'], r['Pilihan B'], r['Pilihan C'], r['Pilihan D'], r['Pilihan E'],
        r['Kunci (A-E)'], r['Level Kognitif'], r.Pembahasan
      ]),
      centerCols: [0, 1, 8, 9],
      orientation: 'landscape'
    })
      .then(() => showToast('Template Excel (.xlsx) Bank Soal berhasil diunduh.'))
      .catch((err) => showToast('Gagal membuat template Bank Soal: ' + err.message, 'error'));
  }

  /* -------------------- MODAL POPUPS (CRUD, IMPORT, PRESENSI) -------------------- */
  function openKelasModal(existing = null) {
    openModal(
      existing ? `Edit Kelas: ${existing.namaKelas}` : 'Tambah Kelas Baru',
      `<form id="modal-form-kelas" class="form-grid">
        <input type="hidden" id="mk-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="form-row-2">
          <div class="field">
            <label for="mk-nama">Nama Kelas</label>
            <input id="mk-nama" class="input" required placeholder="Contoh: X M3" value="${existing ? escapeHtml(existing.namaKelas) : ''}" />
          </div>
          <div class="field">
            <label for="mk-jenjang">Jenjang</label>
            <select id="mk-jenjang" class="select">
              ${['X', 'XI', 'XII'].map((j) => `<option value="${j}" ${existing && existing.jenjang === j ? 'selected' : ''}>Kelas ${j}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="mk-wali">Wali Kelas</label>
          <input id="mk-wali" class="input" placeholder="Nama wali kelas..." value="${existing ? escapeHtml(existing.waliKelas || '') : ''}" />
        </div>
        <div class="field">
          <label for="mk-ket">Keterangan</label>
          <input id="mk-ket" class="input" placeholder="Contoh: Kelas X Merdeka 3" value="${existing ? escapeHtml(existing.keterangan || '') : ''}" />
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mk-cancel">Batal</button>
          <button type="submit" class="btn btn-primary">${existing ? '💾 Simpan Perubahan' : '➕ Simpan Kelas'}</button>
        </div>
      </form>`,
      { size: 'lg' }
    );
    document.getElementById('mk-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-kelas').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveKelas({
          id: document.getElementById('mk-id').value || undefined,
          namaKelas: document.getElementById('mk-nama').value.trim(),
          jenjang: document.getElementById('mk-jenjang').value,
          waliKelas: document.getElementById('mk-wali').value.trim() || '-',
          keterangan: document.getElementById('mk-ket').value.trim()
        });
        closeModal();
        showToast('Data kelas berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan kelas: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Simpan';
      }
    });
  }

  function openSiswaModal(existing = null) {
    const classNames = getClassNamesList();
    const defaultKelas = existing ? existing.kelas : (state.filters.siswaKelas !== 'Semua' ? state.filters.siswaKelas : classNames[0]);
    const initialNisn = existing ? String(existing.nisn || existing.nis || existing.id || '') : '';
    openModal(
      existing ? `Edit Siswa: ${existing.nama}` : 'Tambah Siswa Baru (Wajib NISN 10 Angka)',
      `<form id="modal-form-siswa" class="form-grid">
        <input type="hidden" id="ms-prev-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="form-row-2">
          <div class="field">
            <label for="ms-nisn">NISN (Wajib Tepat 10 Digit Angka)</label>
            <input id="ms-nisn" type="text" inputmode="numeric" maxlength="20" class="input" required placeholder="Contoh: 0091000105" value="${escapeHtml(initialNisn)}" />
            <small class="hint" id="ms-nisn-hint">Ketik tepat 10 angka (0 di depan tetap aman). Terisi: <strong>${initialNisn.length}/10</strong> angka.</small>
          </div>
          <div class="field">
            <label for="ms-nama">Nama Lengkap Siswa</label>
            <input id="ms-nama" class="input" required placeholder="Nama lengkap..." value="${existing ? escapeHtml(existing.nama) : ''}" />
          </div>
        </div>
        <div id="ms-nisn-alert" class="callout" role="alert" style="padding:10px 14px;background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:13.2px;font-weight:700;" hidden></div>
        <div class="form-row-2">
          <div class="field">
            <label for="ms-kelas">Kelas</label>
            <select id="ms-kelas" class="select" required>
              ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${defaultKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="ms-jk">Jenis Kelamin</label>
            <select id="ms-jk" class="select">
              <option value="L" ${existing && existing.jenisKelamin === 'L' ? 'selected' : ''}>Laki-laki (L)</option>
              <option value="P" ${existing && existing.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan (P)</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="ms-status">Status Keaktifan</label>
          <select id="ms-status" class="select">
            ${['Aktif', 'Pindah', 'Lulus'].map((st) => `<option value="${st}" ${existing && existing.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </div>
        ${existing
          ? `<div class="callout callout-gold" style="padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <div>
                  <strong style="display:block;font-size:13.5px;">🔐 Keamanan Password Akun Siswa</strong>
                  <small id="ms-pass-status" style="color:var(--slate-700);">
                    Status saat ini: ${existing.hasCustomPassword || (existing.password && String(existing.password).trim() !== initialNisn)
                      ? '<strong style="color:#047857;">Password Kustom (Diubah Siswa)</strong>'
                      : `<strong>Standar NISN (${escapeHtml(initialNisn)})</strong>`}
                  </small>
                </div>
                <button type="button" class="btn btn-outline btn-sm" id="btn-ms-reset-pass">🔄 Reset Password ke Standar NISN</button>
              </div>
            </div>`
          : ''}
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="ms-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="ms-submit">${existing ? '💾 Simpan Perubahan' : '➕ Simpan Siswa'}</button>
        </div>
      </form>`,
      { size: 'lg' }
    );

    const nisnInp = document.getElementById('ms-nisn');
    const prevIdInp = document.getElementById('ms-prev-id');
    const hintEl = document.getElementById('ms-nisn-hint');
    const alertEl = document.getElementById('ms-nisn-alert');

    function validateModalNisn({ triggerToast = false, forceEmptyCheck = false } = {}) {
      const val = api.normalizeNisn(nisnInp.value);
      const prevId = prevIdInp ? prevIdInp.value : '';

      if (hintEl) {
        const isTen = /^\d{10}$/.test(val);
        hintEl.innerHTML = isTen
          ? `Format NISN valid: <strong style="color:var(--emerald-800);">${val.length}/10 angka ✓</strong>`
          : `Ketik tepat 10 angka (0 di depan tetap aman). Terisi: <strong>${val.length}/10</strong> angka.`;
      }

      if (!val && !forceEmptyCheck) {
        if (alertEl) alertEl.hidden = true;
        nisnInp.style.borderColor = '';
        return { ok: true, msg: '' };
      }

      const lenCheck = api.validateNisn10(val);
      if (!lenCheck.valid) {
        if (alertEl) {
          alertEl.textContent = '⚠️ ' + lenCheck.message;
          alertEl.hidden = false;
        }
        nisnInp.style.borderColor = '#e11d48';
        if (triggerToast) showToast(lenCheck.message, 'error');
        return { ok: false, msg: lenCheck.message };
      }

      const dup = api.findDuplicateNisnStudent(lenCheck.nisn, prevId);
      if (dup) {
        const dupMsg = `NISN ${lenCheck.nisn} sudah digunakan oleh siswa ${dup.nama} (Kelas ${dup.kelas})!`;
        if (alertEl) {
          alertEl.textContent = '⚠️ ' + dupMsg;
          alertEl.hidden = false;
        }
        nisnInp.style.borderColor = '#e11d48';
        if (triggerToast) showToast(dupMsg, 'error');
        return { ok: false, msg: dupMsg };
      }

      if (alertEl) alertEl.hidden = true;
      nisnInp.style.borderColor = '#059669';
      return { ok: true, msg: '' };
    }

    nisnInp.addEventListener('input', () => {
      const val = api.normalizeNisn(nisnInp.value);
      // Cek cepat real-time saat mengetik: jika tepat 10 angka & ganda langsung muncul alert
      const triggerDupNow = val.length === 10 && Boolean(api.findDuplicateNisnStudent(val, prevIdInp ? prevIdInp.value : ''));
      validateModalNisn({ triggerToast: triggerDupNow, forceEmptyCheck: false });
    });

    // Saat pindah kolom / tab dari input NISN, otomatis alert bila kurang/lebih dari 10 angka atau ganda
    nisnInp.addEventListener('blur', () => {
      validateModalNisn({ triggerToast: true, forceEmptyCheck: false });
    });

    const resetPassBtn = document.getElementById('btn-ms-reset-pass');
    if (resetPassBtn && existing) {
      resetPassBtn.addEventListener('click', () => {
        const targetNisn = api.normalizeNisn(nisnInp ? nisnInp.value : '') || initialNisn;
        openConfirmModal({
          icon: '🔑',
          title: 'Reset Password Siswa ke NISN',
          message: `Apakah Anda yakin ingin mereset password siswa ini agar kembali menggunakan standar NISN (${targetNisn})?`,
          itemLabel: `${existing.nama} • NISN: ${targetNisn}`,
          confirmText: 'YA, Reset ke NISN',
          cancelText: 'TIDAK',
          confirmLoadingLabel: 'Mereset Password...',
          loadingText: 'Sedang mereset password akun siswa ke standar NISN...',
          errorPrefix: 'Gagal mereset password siswa: ',
          danger: false,
          onConfirm: async () => {
            await api.resetStudentPassword(initialNisn || targetNisn);
            existing.hasCustomPassword = false;
            existing.password = '';
            const statusEl = document.getElementById('ms-pass-status');
            if (statusEl) {
              statusEl.innerHTML = `Status saat ini: <strong>Standar NISN (${escapeHtml(targetNisn)})</strong>`;
            }
            renderDashboard();
          },
          successMessage: `Password ${existing.nama} berhasil direset ke standar NISN (${targetNisn}).`
        });
      });
    }

    document.getElementById('ms-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-siswa').addEventListener('submit', async (e) => {
      e.preventDefault();
      const resCheck = validateModalNisn({ triggerToast: true, forceEmptyCheck: true });
      if (!resCheck.ok) {
        nisnInp.focus();
        return;
      }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveSiswa({
          prevId: document.getElementById('ms-prev-id').value || undefined,
          nisn: api.normalizeNisn(nisnInp.value),
          nama: document.getElementById('ms-nama').value.trim(),
          kelas: document.getElementById('ms-kelas').value,
          jenisKelamin: document.getElementById('ms-jk').value,
          status: document.getElementById('ms-status').value
        });
        closeModal();
        showToast('Data siswa ber-NISN 10 angka berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        if (alertEl) {
          alertEl.textContent = '⚠️ ' + err.message;
          alertEl.hidden = false;
        }
        showToast('Gagal menyimpan siswa: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = existing ? '💾 Simpan Perubahan' : '➕ Simpan Siswa';
      }
    });
  }

  function openImportSiswaModal() {
    openModal(
      '📥 Import Data Siswa dari Excel (.xlsx / .csv)',
      `<div class="form-grid">
        <div class="callout callout-emerald">
          <strong>Panduan Import Cerdas &amp; Validasi NISN 10 Angka:</strong>
          <ol style="margin:8px 0 0;padding-left:18px;font-size:13.5px;">
            <li>Unduh template Excel resmi — kolom <strong>NISN</strong> sudah disetel format <strong>Teks</strong> agar angka <code>0</code> di depan tidak hilang.</li>
            <li>Setiap NISN wajib <strong>tepat 10 digit angka</strong> dan <strong>tidak ganda</strong>.</li>
            <li>Bila ada baris NISN yang salah/ganda, siswa valid tetap tersimpan sementara daftar siswa bermasalah akan ditampilkan untuk diperbaiki.</li>
          </ol>
          <div style="margin-top:12px;">
            <button type="button" class="btn btn-gold btn-sm" id="mi-dl-tpl">📄 Unduh Template Excel (.xlsx)</button>
          </div>
        </div>
        <div class="field">
          <label for="mi-file">Pilih File Excel / CSV</label>
          <input id="mi-file" type="file" class="input" accept=".xlsx,.xls,.csv" />
        </div>
        <div id="mi-report-host"></div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mi-cancel">Tutup</button>
          <button type="button" class="btn btn-primary" id="mi-submit">⬆️ Import Sekarang</button>
        </div>
      </div>`,
      { size: 'lg' }
    );
    document.getElementById('mi-dl-tpl').addEventListener('click', downloadStudentTemplate);
    document.getElementById('mi-cancel').addEventListener('click', closeModal);
    document.getElementById('mi-submit').addEventListener('click', async () => {
      const fileInp = document.getElementById('mi-file');
      const reportHost = document.getElementById('mi-report-host');
      const file = fileInp && fileInp.files && fileInp.files[0];
      if (!file) {
        showToast('Pilih file Excel/CSV terlebih dahulu.', 'warning');
        return;
      }
      const btn = document.getElementById('mi-submit');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Memvalidasi &amp; Mengimpor...';
      try {
        const parsed = await parseExcelOrCsvFile(file);
        const res = await api.importSiswaBatch(parsed);

        if (res.rejectedCount === 0) {
          closeModal();
          showToast(`Berhasil mengimpor ${res.savedCount} dari ${res.total} siswa (100% valid)!`);
          renderDashboard();
          return;
        }

        // Ada siswa yang gagal karena NISN salah / ganda -> tetap tampilkan rincian di modal!
        if (res.savedCount > 0) renderDashboard();
        if (reportHost) {
          reportHost.innerHTML = `
            <div class="callout callout-gold" style="margin-top:6px;">
              <strong>⚠️ Hasil Import Sebagian: Dari ${res.total} siswa, ${res.savedCount} tersimpan dan ${res.rejectedCount} tidak tersimpan karena NISN salah / ganda.</strong>
              <p style="margin:6px 0 10px;font-size:13px;color:var(--slate-700);">
                Silakan cek dan perbaiki daftar siswa di bawah ini pada file Excel lalu import kembali:
              </p>
              <div class="table-wrap" style="max-height:240px;">
                <table>
                  <thead><tr><th>Baris</th><th>Nama Siswa</th><th>Kelas</th><th>NISN Tertulis</th><th>Keterangan Kesalahan</th></tr></thead>
                  <tbody>
                    ${res.rejectedRows
              .map(
                (r) => `<tr>
                          <td>#${r.rowNo}</td>
                          <td><strong>${escapeHtml(r.nama)}</strong></td>
                          <td>${escapeHtml(r.kelas)}</td>
                          <td><code>${escapeHtml(r.nisn)}</code></td>
                          <td style="color:var(--rose-600);font-weight:600;font-size:12.5px;">${escapeHtml(r.reason)}</td>
                        </tr>`
              )
              .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        showToast(
          `${res.savedCount} siswa tersimpan, ${res.rejectedCount} siswa dilewati (NISN salah/ganda). Cek daftar di modal!`,
          'warning'
        );
        btn.disabled = false;
        btn.textContent = '⬆️ Import Ulang File';
      } catch (err) {
        showToast('Gagal import Excel: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '⬆️ Import Sekarang';
      }
    });
  }

  function openJadwalModal(existing = null) {
    const classNames = getClassNamesList();
    const materiList = api.state.data.materi || [];
    const curSmt = existing ? String(existing.semester || '1') : '1';
    openModal(
      existing ? 'Edit Jadwal Pembelajaran' : 'Tambah Jadwal Pembelajaran PAI',
      `<form id="modal-form-jadwal" class="form-grid">
        <input type="hidden" id="mj-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="form-row-3">
          <div class="field">
            <label for="mj-tgl">Tanggal Pembelajaran</label>
            <input id="mj-tgl" type="date" class="input" required value="${existing ? escapeHtml(existing.tanggal) : todayIso}" />
          </div>
          <div class="field">
            <label for="mj-semester">Semester</label>
            <select id="mj-semester" class="select" required>
              <option value="1" ${curSmt === '1' ? 'selected' : ''}>Semester 1 (Ganjil)</option>
              <option value="2" ${curSmt === '2' ? 'selected' : ''}>Semester 2 (Genap)</option>
            </select>
          </div>
          <div class="field">
            <label for="mj-kelas">Kelas</label>
            <select id="mj-kelas" class="select" required>
              ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${existing && existing.kelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mj-jam">Jam Pelajaran</label>
            <input id="mj-jam" list="mj-jam-list" class="input" required value="${existing ? escapeHtml(existing.jamKe) : 'Jam 1–2 (07.15–08.45)'}" />
            <datalist id="mj-jam-list">
              <option value="Jam 1–2 (07.15–08.45)"></option>
              <option value="Jam 3–4 (09.00–10.30)"></option>
              <option value="Jam 5–6 (10.45–12.15)"></option>
              <option value="Jam 7–8 (13.00–14.30)"></option>
            </datalist>
          </div>
          <div class="field">
            <label for="mj-mat-sel">Pilih Bab Materi PAI (Opsional)</label>
            <select id="mj-mat-sel" class="select">
              <option value="">-- Pilih untuk isi judul otomatis --</option>
              ${materiList
        .map(
          (m) => `<option value="${escapeHtml(m.id)}" data-title="Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}" data-semester="${escapeHtml(String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')))}" ${existing && existing.materiId === m.id ? 'selected' : ''}>
                    Kls ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}
                  </option>`
        )
        .join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="mj-judul">Judul Materi / Topik Pertemuan</label>
          <input id="mj-judul" class="input" required placeholder="Contoh: Bab 1: Kompetisi dalam Kebaikan..." value="${existing ? escapeHtml(existing.materiJudul) : ''}" />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mj-jenis">Jenis Pembelajaran</label>
            <select id="mj-jenis" class="select">
              <option value="Daring" ${existing && existing.jenis === 'Daring' ? 'selected' : ''}>💻 Daring (Siswa Bisa Absen)</option>
              <option value="Luring" ${!existing || existing.jenis === 'Luring' ? 'selected' : ''}>🏫 Luring / Tatap Muka</option>
            </select>
          </div>
          <div class="field">
            <label for="mj-status">Status Pelaksanaan</label>
            <select id="mj-status" class="select">
              <option value="Sedang Berlangsung" ${!existing || existing.status !== 'Terlaksana' ? 'selected' : ''}>🟢 Sedang Berlangsung (Siswa Bisa Absen Daring)</option>
              <option value="Terlaksana" ${existing && existing.status === 'Terlaksana' ? 'selected' : ''}>✓ Terlaksana (Absen Siswa Ditutup)</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="mj-catatan">Catatan / Ringkasan Mengajar</label>
          <textarea id="mj-catatan" class="textarea" rows="2">${existing ? escapeHtml(existing.catatan || '') : ''}</textarea>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mj-cancel">Batal</button>
          <button type="submit" class="btn btn-primary">${existing ? '💾 Simpan Perubahan' : '➕ Simpan Jadwal'}</button>
        </div>
      </form>`,
      { size: 'lg' }
    );
    const matSel = document.getElementById('mj-mat-sel');
    const titleInp = document.getElementById('mj-judul');
    const smtSel = document.getElementById('mj-semester');
    matSel.addEventListener('change', () => {
      const opt = matSel.options[matSel.selectedIndex];
      const t = opt && opt.getAttribute('data-title');
      const s = opt && opt.getAttribute('data-semester');
      if (t) titleInp.value = t;
      if (s && smtSel) smtSel.value = s;
    });
    document.getElementById('mj-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-jadwal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveJadwal({
          id: document.getElementById('mj-id').value || undefined,
          tanggal: document.getElementById('mj-tgl').value,
          semester: document.getElementById('mj-semester').value,
          jamKe: document.getElementById('mj-jam').value.trim(),
          kelas: document.getElementById('mj-kelas').value,
          materiId: document.getElementById('mj-mat-sel').value,
          materiJudul: document.getElementById('mj-judul').value.trim(),
          jenis: document.getElementById('mj-jenis').value,
          status: document.getElementById('mj-status').value,
          catatan: document.getElementById('mj-catatan').value.trim()
        });
        closeModal();
        showToast('Jadwal pembelajaran berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan jadwal: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Simpan';
      }
    });
  }

  function openAbsensiModal(jadwalItem = null) {
    const classNames = getClassNamesList();
    const siswaList = api.state.data.siswa || [];
    let curJadwalId = jadwalItem ? jadwalItem.id : '';
    let curTanggal = jadwalItem ? jadwalItem.tanggal : todayIso;
    let curKelas = jadwalItem ? jadwalItem.kelas : (classNames[0] || 'X M1');
    let curJam = jadwalItem ? jadwalItem.jamKe : 'Jam 1–2 (07.15–08.45)';
    let curMateri = jadwalItem ? jadwalItem.materiJudul : 'Pembelajaran PAI';

    function renderModalChecklistHtml() {
      const records = buildScheduleAttendanceRecords({
        jadwalId: curJadwalId,
        tanggal: curTanggal,
        kelas: curKelas,
        jamKe: curJam
      });
      const isDaring = Boolean(jadwalItem && jadwalItem.jenis === 'Daring');

      if (!records.length) {
        return `<div class="callout callout-gold">Belum ada siswa aktif pada kelas <strong>${escapeHtml(curKelas)}</strong>. Tambahkan siswa terlebih dahulu di tab Data Siswa.</div>`;
      }

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <strong>Daftar Siswa Kelas ${escapeHtml(curKelas)} (${records.length} siswa)</strong>
          <button type="button" class="btn btn-outline btn-sm" id="ma-mark-all">✓ Tandai Semua Hadir</button>
        </div>
        <div class="table-wrap" style="max-height:36vh;">
          <table>
            <thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Status Kehadiran</th><th>Catatan${isDaring ? ' &amp; Foto Selfie' : ''}</th></tr></thead>
            <tbody>
              ${records
          .map((r, idx) => {
            const nisn = String(r.nisn || '');
            const st = r.status || 'Belum Absen';
            const note = r.catatan || '';
            const fotoUrl = String(r.fotoUrl || '').trim();
            return `<tr data-ma-row data-nisn="${escapeHtml(nisn)}" data-nama="${escapeHtml(r.nama)}" data-foto-url="${escapeHtml(fotoUrl)}">
                    <td>${idx + 1}</td>
                    <td><code>${escapeHtml(nisn)}</code></td>
                    <td><strong>${escapeHtml(r.nama)}</strong></td>
                    <td>
                      <select class="select ma-status" aria-label="Status hadir ${escapeHtml(r.nama)}" style="min-width:128px;">
                        ${['Belum Absen', 'Hadir', 'Izin', 'Sakit', 'Alpa'].map((x) => `<option value="${x}" ${st === x ? 'selected' : ''}>${x}</option>`).join('')}
                      </select>
                    </td>
                    <td>
                      <div class="absen-catatan-cell">
                        ${isDaring && fotoUrl
                ? `<button type="button" class="btn btn-gold btn-sm absen-view-foto-btn" data-view-absen-foto="${escapeHtml(fotoUrl)}" data-foto-nama="${escapeHtml(r.nama)}" data-foto-status="${escapeHtml(st)}">📸 Lihat Foto</button>`
                : ''
              }
                        <input class="input ma-note" aria-label="Catatan ${escapeHtml(r.nama)}" value="${escapeHtml(note)}" placeholder="Catatan..." />
                      </div>
                    </td>
                  </tr>`;
          })
          .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    openModal(
      jadwalItem ? `Presensi Siswa • ${jadwalItem.kelas} (${formatDateId(jadwalItem.tanggal)})` : 'Catat Daftar Hadir Mengajar',
      `<form id="modal-form-absen" class="form-grid">
        <div class="form-row-2">
          <div class="field">
            <label for="ma-tgl">Tanggal Mengajar</label>
            <input id="ma-tgl" type="date" class="input" required value="${escapeHtml(curTanggal)}" ${jadwalItem ? 'readonly' : ''} />
          </div>
          <div class="field">
            <label for="ma-kelas">Kelas</label>
            <select id="ma-kelas" class="select" ${jadwalItem ? 'disabled' : ''}>
              ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${curKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="ma-jam">Jadwal / Jam Ke</label>
            <input id="ma-jam" class="input" required value="${escapeHtml(curJam)}" />
          </div>
          <div class="field">
            <label for="ma-materi">Materi Pertemuan</label>
            <input id="ma-materi" class="input" required value="${escapeHtml(curMateri)}" />
          </div>
        </div>
        <div id="ma-checklist-host">${renderModalChecklistHtml()}</div>
        ${jadwalItem && jadwalItem.status === 'Terlaksana'
        ? `<div class="callout" style="font-size:13px;padding:10px 14px;">
                ℹ️ Jadwal berstatus <strong>Terlaksana</strong> (presensi mandiri siswa ditutup), namun Guru tetap dapat mencatat atau memperbarui daftar hadir secara manual di sini.
              </div>`
        : ''
      }
        <div class="modal-sticky-actions">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-gold" id="ma-export-excel">📊 Unduh Excel</button>
            <button type="button" class="btn btn-outline" id="ma-export-pdf">📄 Unduh PDF (Kop Surat)</button>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline" id="ma-cancel">Tutup</button>
            <button type="submit" class="btn btn-primary" id="ma-submit">💾 Simpan Daftar Hadir</button>
          </div>
        </div>
      </form>`,
      { size: 'xl' }
    );

    const bindChecklistActions = () => {
      const markAll = document.getElementById('ma-mark-all');
      if (markAll) {
        markAll.addEventListener('click', () => {
          document.querySelectorAll('.ma-status').forEach((sel) => { sel.value = 'Hadir'; });
          showToast('Seluruh siswa ditandai Hadir.');
        });
      }
      document.querySelectorAll('[data-view-absen-foto]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const url = btn.getAttribute('data-view-absen-foto') || '';
          const nama = btn.getAttribute('data-foto-nama') || 'Siswa';
          const rowEl = btn.closest('[data-ma-row]');
          const statusEl = rowEl && rowEl.querySelector('.ma-status');
          const curStatus = statusEl ? statusEl.value : (btn.getAttribute('data-foto-status') || 'Hadir');
          openImageLightbox(
            `📸 Foto Selfie Presensi — ${nama}`,
            url,
            `Kelas ${curKelas} • ${formatDateId(curTanggal)} (${curJam}) • Status: ${curStatus}`
          );
        });
      });
    };
    bindChecklistActions();

    const collectModalAbsensiPayload = () => {
      const rows = Array.from(document.querySelectorAll('[data-ma-row]')).map((tr) => ({
        nisn: tr.getAttribute('data-nisn'),
        nama: tr.getAttribute('data-nama'),
        status: tr.querySelector('.ma-status').value,
        catatan: tr.querySelector('.ma-note').value.trim(),
        fotoUrl: tr.getAttribute('data-foto-url') || ''
      }));
      const tglVal = document.getElementById('ma-tgl').value;
      const jamVal = document.getElementById('ma-jam').value.trim();
      const matVal = document.getElementById('ma-materi').value.trim();
      return {
        kelas: curKelas,
        tanggal: tglVal,
        tanggalLabel: formatDateId(tglVal),
        jam: jamVal,
        materi: matVal,
        jenis: jadwalItem ? jadwalItem.jenis : '',
        statusJadwal: jadwalItem ? jadwalItem.status : '',
        records: rows
      };
    };

    const exportExcelBtn = document.getElementById('ma-export-excel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', async () => {
        const payload = collectModalAbsensiPayload();
        if (!payload.records.length) {
          showToast('Belum ada data siswa pada kelas ini untuk diunduh ke Excel.', 'warning');
          return;
        }
        const prevText = exportExcelBtn.textContent;
        exportExcelBtn.disabled = true;
        exportExcelBtn.innerHTML = '<span class="spinner-inline dark"></span> Menyiapkan Excel...';
        try {
          const fname = await api.exportAttendanceExcel(payload);
          showToast(`Presensi Excel "${fname}" berhasil diunduh.`);
        } catch (err) {
          showToast('Gagal mengunduh Excel: ' + err.message, 'error');
        } finally {
          exportExcelBtn.disabled = false;
          exportExcelBtn.textContent = prevText;
        }
      });
    }

    const exportPdfBtn = document.getElementById('ma-export-pdf');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        const payload = collectModalAbsensiPayload();
        if (!payload.records.length) {
          showToast('Belum ada data siswa pada kelas ini untuk pratinjau PDF.', 'warning');
          return;
        }
        openAttendancePdfPreview(payload);
      });
    }

    const klsEl = document.getElementById('ma-kelas');
    const tglEl = document.getElementById('ma-tgl');
    if (klsEl && !jadwalItem) {
      klsEl.addEventListener('change', () => {
        curKelas = klsEl.value;
        document.getElementById('ma-checklist-host').innerHTML = renderModalChecklistHtml();
        bindChecklistActions();
      });
    }
    if (tglEl && !jadwalItem) {
      tglEl.addEventListener('change', () => {
        curTanggal = tglEl.value;
        document.getElementById('ma-checklist-host').innerHTML = renderModalChecklistHtml();
        bindChecklistActions();
      });
    }

    document.getElementById('ma-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-absen').addEventListener('submit', async (e) => {
      e.preventDefault();
      const rows = Array.from(document.querySelectorAll('[data-ma-row]')).map((tr) => ({
        nisn: tr.getAttribute('data-nisn'),
        nama: tr.getAttribute('data-nama'),
        status: tr.querySelector('.ma-status').value,
        catatan: tr.querySelector('.ma-note').value.trim(),
        fotoUrl: tr.getAttribute('data-foto-url') || ''
      }));
      if (!rows.length) {
        showToast('Tidak ada siswa untuk disimpan.', 'warning');
        return;
      }
      const btn = document.getElementById('ma-submit');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan Daftar Hadir...';
      try {
        const count = await api.saveAbsensiBatch({
          jadwalId: curJadwalId,
          tanggal: document.getElementById('ma-tgl').value,
          jadwal: document.getElementById('ma-jam').value.trim(),
          materi: document.getElementById('ma-materi').value.trim(),
          kelas: curKelas,
          records: rows
        });
        closeModal();
        showToast(`Daftar hadir ${count} siswa kelas ${curKelas} tersimpan!`);
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan daftar hadir: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Daftar Hadir';
      }
    });
  }

  function openBannerModal(existing = null) {
    const count = (api.state.data.banners || []).length;
    openModal(
      existing ? 'Edit Slide Banner Depan' : 'Tambah Slide Banner Depan',
      `<form id="modal-form-banner" class="form-grid">
        <input type="hidden" id="mb-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="form-row-2">
          <div class="field">
            <label for="mb-urutan">Urutan Tampil</label>
            <input id="mb-urutan" type="number" min="1" class="input" required value="${existing ? escapeHtml(existing.urutan || 1) : count + 1}" />
          </div>
          <div class="field">
            <label for="mb-badge">Label Badge</label>
            <input id="mb-badge" class="input" value="${existing ? escapeHtml(existing.badge || '') : 'Info PAI'}" />
          </div>
        </div>
        <div class="field">
          <label for="mb-judul">Judul Slide Banner</label>
          <input id="mb-judul" class="input" required value="${existing ? escapeHtml(existing.judul) : ''}" />
        </div>
        <div class="field">
          <label for="mb-desc">Deskripsi Singkat</label>
          <textarea id="mb-desc" class="textarea" rows="2">${existing ? escapeHtml(existing.deskripsi || '') : ''}</textarea>
        </div>
        <div class="upload-box">
          <label for="mb-file" style="display:block;font-weight:700;font-size:13.5px;margin-bottom:6px;">✂️ Upload &amp; Crop Slide Banner (Rasio Tetap 16:9 Sesuai Hero Slider)</label>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div id="mb-preview" style="width:160px;height:90px;border-radius:10px;border:1.5px solid var(--slate-300);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              ${existing && resolveImageUrl(existing.imageUrl) ? `<img src="${escapeHtml(resolveImageUrl(existing.imageUrl))}" alt="Pratinjau Slide" style="width:100%;height:100%;object-fit:cover;" />` : '<small style="color:var(--slate-500);">16:9</small>'}
            </div>
            <div style="flex:1;min-width:220px;">
              <input id="mb-file" type="file" class="input" accept="image/*" />
              <small style="display:block;margin-top:4px;color:var(--slate-600);">Pilih gambar untuk memotong manual rasio <strong>16:9</strong>. Disimpan otomatis Base64 tajam (&lt; 46.000 karakter) langsung ke Google Sheets.</small>
            </div>
          </div>
          <input id="mb-url" aria-label="URL Gambar Banner" class="input" style="margin-top:8px;" placeholder="Data / URL gambar banner (otomatis terisi setelah crop)" value="${existing ? escapeHtml(existing.imageUrl || '') : ''}" />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mb-cta-label">Teks Tombol CTA</label>
            <input id="mb-cta-label" class="input" value="${existing ? escapeHtml(existing.ctaLabel || '') : 'Pelajari Sekarang'}" />
          </div>
          <div class="field">
            <label for="mb-cta-link">Tujuan Tombol</label>
            <input id="mb-cta-link" class="input" value="${existing ? escapeHtml(existing.ctaLink || '#materi') : '#materi'}" />
          </div>
        </div>
        <label class="check-card">
          <input type="checkbox" id="mb-aktif" ${!existing || existing.aktif !== false ? 'checked' : ''} />
          <span>Aktifkan slide ini di slider halaman Beranda</span>
        </label>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mb-cancel">Batal</button>
          <button type="submit" class="btn btn-primary">💾 Simpan Banner</button>
        </div>
      </form>`,
      { size: 'lg' }
    );
    attachCropUpload({
      fileInputId: 'mb-file',
      urlInputId: 'mb-url',
      previewId: 'mb-preview',
      title: '✂️ Potong Gambar Slide Banner (Rasio 16:9)',
      ratioLabel: '16:9',
      aspectRatio: 16 / 9,
      outWidth: 960,
      outHeight: 540,
      maxChars: 46000
    });
    document.getElementById('mb-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-banner').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveBanner({
          id: document.getElementById('mb-id').value || undefined,
          urutan: Number(document.getElementById('mb-urutan').value || 1),
          badge: document.getElementById('mb-badge').value.trim(),
          judul: document.getElementById('mb-judul').value.trim(),
          deskripsi: document.getElementById('mb-desc').value.trim(),
          imageUrl: document.getElementById('mb-url').value.trim(),
          ctaLabel: document.getElementById('mb-cta-label').value.trim(),
          ctaLink: document.getElementById('mb-cta-link').value.trim() || '#materi',
          aktif: document.getElementById('mb-aktif').checked
        });
        closeModal();
        showToast('Slide banner berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan banner: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Banner';
      }
    });
  }

  function openGaleriModal(existing = null) {
    const classNames = getClassNamesList();
    openModal(
      existing ? 'Edit Item Galeri Karya' : 'Tambah Karya Siswa ke Galeri',
      `<form id="modal-form-galeri" class="form-grid">
        <input type="hidden" id="mg-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="field">
          <label for="mg-judul">Judul Karya / Prestasi</label>
          <input id="mg-judul" class="input" required value="${existing ? escapeHtml(existing.judul) : ''}" />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mg-kelas">Kelas</label>
            <select id="mg-kelas" class="select">
              ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${existing && existing.kelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="mg-kat">Kategori</label>
            <select id="mg-kat" class="select">
              ${['Karya Kreatif', 'Analisis HOTS', 'Amaliyah KBC', 'Prestasi & Piagam'].map((k) => `<option ${existing && existing.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="mg-kreator">Nama Kreator / Kelompok</label>
          <input id="mg-kreator" class="input" required value="${existing ? escapeHtml(existing.kreator) : ''}" />
        </div>
        <div class="upload-box">
          <label for="mg-file" style="display:block;font-weight:700;font-size:13.5px;margin-bottom:6px;">📤 Upload Foto Karya / Piagam</label>
          <input id="mg-file" type="file" class="input" accept="image/*" />
          <input id="mg-url" aria-label="URL Gambar Karya" class="input" style="margin-top:8px;" placeholder="URL gambar (otomatis terisi saat upload)" value="${existing ? escapeHtml(existing.gambarUrl || '') : ''}" />
        </div>
        <div class="field">
          <label for="mg-ringkas">Deskripsi Karya</label>
          <textarea id="mg-ringkas" class="textarea" rows="2" required>${existing ? escapeHtml(existing.ringkasan) : ''}</textarea>
        </div>
        <div class="field">
          <label for="mg-tautan">Tautan Karya Eksternal (Opsional)</label>
          <input id="mg-tautan" class="input" value="${existing ? escapeHtml(existing.tautan || '') : ''}" />
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mg-cancel">Batal</button>
          <button type="submit" class="btn btn-gold">💾 Simpan ke Galeri</button>
        </div>
      </form>`,
      { size: 'lg' }
    );
    attachModalUpload('mg-file', 'mg-url', 'galeri');
    document.getElementById('mg-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-galeri').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveGaleri({
          id: document.getElementById('mg-id').value || undefined,
          judul: document.getElementById('mg-judul').value.trim(),
          kelas: document.getElementById('mg-kelas').value,
          kategori: document.getElementById('mg-kat').value,
          kreator: document.getElementById('mg-kreator').value.trim(),
          gambarUrl: document.getElementById('mg-url').value.trim(),
          ringkasan: document.getElementById('mg-ringkas').value.trim(),
          tautan: document.getElementById('mg-tautan').value.trim()
        });
        closeModal();
        showToast('Item galeri berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan galeri: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan ke Galeri';
      }
    });
  }

  function openMateriModal(existing = null) {
    const cfgElemen = (api.state.data.pengaturan && api.state.data.pengaturan.elemenList) || [];
    const elemenPool = [...new Set([
      ...DEFAULT_ELEMEN_OPTIONS,
      ...cfgElemen,
      ...(existing && existing.elemen ? [existing.elemen] : [])
    ].filter(Boolean))];
    const curElemen = existing && existing.elemen ? existing.elemen : elemenPool[0];
    const curSmt = existing
      ? String(existing.semester || (Number(existing.bab) <= 5 ? '1' : '2'))
      : '1';
    const draftGallery = existing && Array.isArray(existing.galeriGambar) ? existing.galeriGambar.slice() : [];

    const renderStrip = () => {
      const strip = document.getElementById('mm-extra-strip');
      if (!strip) return;
      strip.innerHTML = draftGallery
        .map(
          (g, idx) => `<div class="img-preview-chip">
            <img src="${escapeHtml(resolveImageUrl(g.url))}" alt="${escapeHtml(g.caption || 'Gambar')}" />
            <button type="button" data-mm-del-img="${idx}">Hapus #${idx + 1}</button>
          </div>`
        )
        .join('');
      strip.querySelectorAll('[data-mm-del-img]').forEach((b) => {
        b.addEventListener('click', () => {
          const idx = Number(b.getAttribute('data-mm-del-img'));
          openConfirmModal({
            title: 'Konfirmasi Hapus Gambar',
            message: 'Apakah Anda yakin akan menghapus gambar ini dari daftar materi?',
            itemLabel: `Gambar Materi #${idx + 1}`,
            confirmText: 'YA, Hapus',
            cancelText: 'TIDAK',
            onConfirm: () => {
              draftGallery.splice(idx, 1);
              renderStrip();
            },
            successMessage: 'Gambar dihapus dari daftar (klik Simpan untuk menerapkan).'
          });
        });
      });
    };

    openModal(
      existing ? `Edit Materi PAI: Bab ${existing.bab}` : 'Tambah Bab / Materi PAI Baru',
      `<form id="modal-form-materi" class="form-grid">
        <input type="hidden" id="mm-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="form-row-3">
          <div class="field">
            <label for="mm-jenjang">Jenjang Kelas</label>
            <select id="mm-jenjang" class="select">
              ${['X', 'XI', 'XII'].map((j) => `<option value="${j}" ${existing && existing.jenjang === j ? 'selected' : ''}>Kelas ${j}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="mm-semester">Semester</label>
            <select id="mm-semester" class="select" required>
              <option value="1" ${curSmt === '1' ? 'selected' : ''}>Semester 1 (Ganjil)</option>
              <option value="2" ${curSmt === '2' ? 'selected' : ''}>Semester 2 (Genap)</option>
            </select>
          </div>
          <div class="field">
            <label for="mm-bab">Nomor Bab</label>
            <input id="mm-bab" type="number" min="1" max="20" class="input" required value="${existing ? escapeHtml(existing.bab) : 1}" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mm-elemen">Elemen / Kategori PAI</label>
            <select id="mm-elemen" class="select" required>
              ${elemenPool.map((el) => `<option value="${escapeHtml(el)}" ${curElemen === el ? 'selected' : ''}>${escapeHtml(el)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="mm-judul">Judul Bab</label>
            <input id="mm-judul" class="input" required value="${existing ? escapeHtml(existing.judul) : ''}" />
          </div>
        </div>
        <div class="field">
          <label for="mm-ringkas">Ringkasan Tujuan Pembelajaran</label>
          <textarea id="mm-ringkas" class="textarea" rows="2" required>${existing ? escapeHtml(existing.ringkasan) : ''}</textarea>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mm-apersepsi">Teks Apersepsi Bermakna</label>
            <textarea id="mm-apersepsi" class="textarea" rows="2">${existing ? escapeHtml(existing.apersepsi || '') : ''}</textarea>
          </div>
          <div class="field">
            <label for="mm-pemantik">Pertanyaan Pemantik</label>
            <textarea id="mm-pemantik" class="textarea" rows="2">${existing ? escapeHtml(existing.pemantik || '') : ''}</textarea>
          </div>
        </div>

        <div class="upload-box">
          <strong style="display:block;font-size:13.5px;margin-bottom:8px;">🖼️ Upload Gambar Sampul, Infografis, &amp; Multi-Gambar Materi</strong>
          <div class="form-row-2">
            <div class="field">
              <label for="mm-cover-file">Upload Gambar Sampul Bab</label>
              <input id="mm-cover-file" type="file" class="input" accept="image/*" />
              <input id="mm-cover-url" aria-label="URL Gambar Sampul Bab" class="input" style="margin-top:6px;" placeholder="URL sampul..." value="${existing ? escapeHtml(existing.coverImage || '') : ''}" />
            </div>
            <div class="field">
              <label for="mm-info-file">Upload Infografis Utama</label>
              <input id="mm-info-file" type="file" class="input" accept="image/*" />
              <input id="mm-info-url" aria-label="URL Gambar Infografis Utama" class="input" style="margin-top:6px;" placeholder="URL infografis..." value="${existing ? escapeHtml(existing.infografisUrl || '') : ''}" />
            </div>
          </div>
          <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--emerald-600);">
            <div class="form-row-2">
              <div class="field">
                <label for="mm-extra-file">Tambah Gambar Materi Tambahan</label>
                <input id="mm-extra-file" type="file" class="input" accept="image/*" />
              </div>
              <div class="field">
                <label for="mm-extra-cap">Caption / Keterangan Gambar</label>
                <input id="mm-extra-cap" class="input" placeholder="Contoh: Bagan Tajwid / Foto Praktik..." />
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="mm-add-extra" style="margin-top:8px;">📎 Unggah &amp; Tambahkan ke Galeri Bab</button>
            <div class="img-preview-strip" id="mm-extra-strip"></div>
          </div>
        </div>

        <div class="form-row-2">
          <div class="field">
            <label for="mm-yt">ID Video YouTube (misal: 4IKWLB3pi9s)</label>
            <input id="mm-yt" class="input" value="${existing ? escapeHtml(existing.youtubeId || '') : ''}" />
          </div>
          <div class="field">
            <label for="mm-slide">Link Embed Slide PPTX</label>
            <input id="mm-slide" class="input" value="${existing ? escapeHtml(existing.slideUrl || '') : ''}" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mm-pdf">Link Preview PDF Modul</label>
            <input id="mm-pdf" class="input" value="${existing ? escapeHtml(existing.pdfUrl || '') : ''}" />
          </div>
          <div class="field">
            <label for="mm-lkpd">Link Preview E-LKPD</label>
            <input id="mm-lkpd" class="input" value="${existing ? escapeHtml(existing.lkpdUrl || '') : ''}" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mm-kasus">Studi Kasus Ruang Kritis (HOTS)</label>
            <textarea id="mm-kasus" class="textarea" rows="2">${existing ? escapeHtml(existing.studiKasus || '') : ''}</textarea>
          </div>
          <div class="field">
            <label for="mm-kbc">Keterkaitan Kurikulum Berbasis Cinta (KBC)</label>
            <textarea id="mm-kbc" class="textarea" rows="2">${existing ? escapeHtml(existing.nilaiKbc || '') : ''}</textarea>
          </div>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mm-cancel">Batal</button>
          <button type="submit" class="btn btn-primary">💾 Simpan Materi PAI</button>
        </div>
      </form>`,
      { size: 'xl' }
    );

    renderStrip();
    attachModalUpload('mm-cover-file', 'mm-cover-url', 'cover_materi', { maxWidth: 840, maxChars: 28000 });
    attachModalUpload('mm-info-file', 'mm-info-url', 'infografis_materi', { maxWidth: 840, maxChars: 28000 });

    document.getElementById('mm-add-extra').addEventListener('click', async () => {
      const fInp = document.getElementById('mm-extra-file');
      const capInp = document.getElementById('mm-extra-cap');
      const file = fInp && fInp.files && fInp.files[0];
      if (!file) {
        showToast('Pilih gambar tambahan terlebih dahulu.', 'warning');
        return;
      }
      const btn = document.getElementById('mm-add-extra');
      btn.disabled = true;
      btn.textContent = '⏳ Mengunggah...';
      try {
        const res = await api.uploadImageMedia(file, 'materi_galeri', { maxWidth: 640, maxChars: 11000 });
        const nextItem = {
          id: 'GM-' + Date.now(),
          url: res.url,
          caption: (capInp && capInp.value.trim()) || file.name
        };
        const projectedLen = JSON.stringify([...draftGallery, nextItem]).length;
        if (projectedLen > 45000) {
          showToast(
            `Kapasitas Galeri Bab sudah penuh (${projectedLen.toLocaleString('id-ID')}/45.000 char sel Google Sheets). Hapus salah satu gambar atau gunakan link Google Drive.`,
            'warning',
            6000
          );
          return;
        }
        draftGallery.push(nextItem);
        fInp.value = '';
        if (capInp) capInp.value = '';
        renderStrip();
        showToast('Gambar ditambahkan!');
      } catch (err) {
        showToast('Gagal upload gambar: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '📎 Unggah & Tambahkan ke Galeri Bab';
      }
    });

    document.getElementById('mm-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-materi').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveMateri({
          id: document.getElementById('mm-id').value || undefined,
          jenjang: document.getElementById('mm-jenjang').value,
          semester: document.getElementById('mm-semester').value,
          bab: Number(document.getElementById('mm-bab').value),
          elemen: document.getElementById('mm-elemen').value.trim(),
          judul: document.getElementById('mm-judul').value.trim(),
          ringkasan: document.getElementById('mm-ringkas').value.trim(),
          apersepsi: document.getElementById('mm-apersepsi').value.trim(),
          pemantik: document.getElementById('mm-pemantik').value.trim(),
          coverImage: document.getElementById('mm-cover-url').value.trim(),
          infografisUrl: document.getElementById('mm-info-url').value.trim(),
          galeriGambar: draftGallery,
          youtubeId: document.getElementById('mm-yt').value.trim(),
          youtubeIdTambahan: (existing && existing.youtubeIdTambahan) || '',
          slideUrl: document.getElementById('mm-slide').value.trim(),
          pdfUrl: document.getElementById('mm-pdf').value.trim(),
          bukuUrl: (existing && existing.bukuUrl) || 'https://smartpai.kemenag.go.id',
          lkpdUrl: document.getElementById('mm-lkpd').value.trim(),
          studiKasus: document.getElementById('mm-kasus').value.trim(),
          nilaiKbc: document.getElementById('mm-kbc').value.trim(),
          dnaPoin: (existing && existing.dnaPoin) || ['Niat Lillahi Taala', 'Berpikir Kritis', 'Akhlak Mulia', 'Aksi Nyata KBC'],
          aktif: true
        });
        closeModal();
        showToast('Materi PAI berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan materi: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Materi PAI';
      }
    });
  }

  function openTajwidModal(existing = null) {
    const materiList = api.state.data.materi || [];
    openModal(
      existing ? 'Edit Kartu Bedah Tajwid' : 'Tambah Kartu Bedah Tajwid Interaktif',
      `<form id="modal-form-tajwid" class="form-grid">
        <input type="hidden" id="mt-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <div class="field">
          <label for="mt-mat">Materi Bab Terkait</label>
          <select id="mt-mat" class="select">
            ${materiList.map((m) => `<option value="${escapeHtml(m.id)}" ${existing && existing.materiId === m.id ? 'selected' : ''}>Kls ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)} - ${escapeHtml(m.judul)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mt-arab">Lafal Arab</label>
            <input id="mt-arab" class="input" dir="rtl" required value="${existing ? escapeHtml(existing.lafalArab) : ''}" placeholder="مِنْ خَيْرٍ" />
          </div>
          <div class="field">
            <label for="mt-latin">Transliterasi</label>
            <input id="mt-latin" class="input" required value="${existing ? escapeHtml(existing.transliterasi) : ''}" placeholder="Min khairin" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mt-ayat">Sumber Ayat</label>
            <input id="mt-ayat" class="input" required value="${existing ? escapeHtml(existing.sumberAyat) : ''}" placeholder="QS. Al-Maidah: 48" />
          </div>
          <div class="field">
            <label for="mt-hukum">Hukum Bacaan</label>
            <input id="mt-hukum" class="input" required value="${existing ? escapeHtml(existing.hukum) : ''}" placeholder="Idzhar Halqi" />
          </div>
        </div>
        <div class="field">
          <label for="mt-alasan">Alasan Kaidah</label>
          <input id="mt-alasan" class="input" required value="${existing ? escapeHtml(existing.alasan) : ''}" />
        </div>
        <div class="field">
          <label for="mt-cara">Cara Membaca</label>
          <input id="mt-cara" class="input" required value="${existing ? escapeHtml(existing.caraBaca) : ''}" />
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mt-cancel">Batal</button>
          <button type="submit" class="btn btn-gold">💾 Simpan Kartu Tajwid</button>
        </div>
      </form>`,
      { size: 'lg' }
    );
    document.getElementById('mt-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-tajwid').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveTajwid({
          id: document.getElementById('mt-id').value || undefined,
          materiId: document.getElementById('mt-mat').value,
          lafalArab: document.getElementById('mt-arab').value.trim(),
          transliterasi: document.getElementById('mt-latin').value.trim(),
          sumberAyat: document.getElementById('mt-ayat').value.trim(),
          hukum: document.getElementById('mt-hukum').value.trim(),
          alasan: document.getElementById('mt-alasan').value.trim(),
          caraBaca: document.getElementById('mt-cara').value.trim()
        });
        closeModal();
        showToast('Kartu Bedah Tajwid tersimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan kartu tajwid: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Kartu Tajwid';
      }
    });
  }

  function openSoalModal(existing = null, targetJenjang = null) {
    const jenjangVal = String(
      targetJenjang ||
        state.selectedSoalJenjang ||
        (existing ? resolveSoalJenjang(existing) : 'X')
    )
      .trim()
      .toUpperCase();
    const rombelPool = getRombelListByJenjang(jenjangVal);
    const defaultFilterKelas =
      state.filters.soalKelas &&
      state.filters.soalKelas !== 'Semua' &&
      state.filters.soalKelas !== '__UMUM__'
        ? state.filters.soalKelas
        : '';
    const kelasNameVal = existing
      ? String(existing.kelas || '').trim()
      : defaultFilterKelas;

    let materiPool = getMateriByJenjang(jenjangVal);
    if (!materiPool.length) materiPool = (api.state.data.materi || []).slice();

    const babSet = Array.from(
      new Set([
        ...materiPool.map((m) => Number(m.bab)).filter((n) => n > 0),
        ...(existing && Number(existing.bab) > 0 ? [Number(existing.bab)] : [])
      ])
    ).sort((a, b) => a - b);

    const matchedMateri = existing
      ? materiPool.find(
          (m) =>
            (existing.materiId && m.id === existing.materiId) ||
            Number(m.bab) === Number(existing.bab)
        ) || null
      : materiPool[0] || null;
    const curBab = existing
      ? Number(existing.bab || (matchedMateri ? matchedMateri.bab : 1))
      : matchedMateri
        ? Number(matchedMateri.bab)
        : babSet[0] || 1;
    const curSmt = existing && existing.semester
      ? String(existing.semester)
      : matchedMateri && matchedMateri.semester
        ? String(matchedMateri.semester)
        : curBab <= 5
          ? '1'
          : '2';
    const curMateriId = matchedMateri ? matchedMateri.id : existing && existing.materiId ? existing.materiId : '';
    const curGambarUrl = existing && existing.gambarUrl ? String(existing.gambarUrl) : '';

    const opsi = (existing && existing.opsi) || ['', '', '', '', ''];
    const rombelOptions = Array.from(new Set([...rombelPool, ...(kelasNameVal ? [kelasNameVal] : [])]));

    openModal(
      existing ? `Edit Soal CBT — Kelas ${jenjangVal}` : `Tambah Soal CBT — Kelas ${jenjangVal}`,
      `<form id="modal-form-soal" class="form-grid">
        <input type="hidden" id="mq-id" value="${existing ? escapeHtml(existing.id) : ''}" />
        <input type="hidden" id="mq-jenjang" value="${escapeHtml(jenjangVal)}" />
        <div class="callout callout-emerald" style="padding:10px 14px;font-size:13px;">
          ℹ️ <strong>Jenjang Kelas ${escapeHtml(jenjangVal)} terisi otomatis</strong>. Pilih target kelas (<strong>Semua Rombel</strong> atau rombel khusus), atur <strong>Semester &amp; Bab/Materi</strong>, serta unggah gambar opsional.
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mq-kelas-view">Jenjang (Otomatis)</label>
            <input id="mq-kelas-view" class="input" readonly value="Kelas ${escapeHtml(jenjangVal)}" style="background:var(--slate-100);font-weight:700;color:var(--emerald-900);cursor:not-allowed;" />
          </div>
          <div class="field">
            <label for="mq-kelas">Target Rombel Kelas</label>
            <select id="mq-kelas" class="select">
              <option value="" ${!kelasNameVal ? 'selected' : ''}>Semua Rombel Kelas ${escapeHtml(jenjangVal)} (Umum)</option>
              ${rombelOptions
                .map((r) => `<option value="${escapeHtml(r)}" ${kelasNameVal === r ? 'selected' : ''}>Khusus ${escapeHtml(r)}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mq-semester">Semester</label>
            <select id="mq-semester" class="select" required>
              <option value="1" ${curSmt === '1' ? 'selected' : ''}>Semester 1 (Ganjil)</option>
              <option value="2" ${curSmt === '2' ? 'selected' : ''}>Semester 2 (Genap)</option>
            </select>
          </div>
          <div class="field">
            <label for="mq-bab">Bab Materi</label>
            ${babSet.length > 0
        ? `<select id="mq-bab" class="select" required>
                    ${babSet
          .map((bNum) => `<option value="${bNum}" ${Number(curBab) === Number(bNum) ? 'selected' : ''}>Bab ${bNum}</option>`)
          .join('')}
                  </select>`
        : `<input id="mq-bab" type="number" min="1" max="20" class="input" required value="${escapeHtml(curBab)}" />`
      }
          </div>
        </div>
        <div class="field">
          <label for="mq-materi">Materi Pembelajaran (Dari Materi Tersimpan)</label>
          ${materiPool.length > 0
        ? `<select id="mq-materi" class="select" required>
                  ${materiPool
          .map((m) => {
            const mSmt = String(m.semester || (Number(m.bab) <= 5 ? '1' : '2'));
            const smtTxt = mSmt === '2' ? 'Smt 2' : 'Smt 1';
            const label = `Bab ${m.bab} (${smtTxt}) — ${m.judul}`;
            const isSel = curMateriId ? m.id === curMateriId : Number(m.bab) === Number(curBab);
            return `<option value="${escapeHtml(m.id)}" data-bab="${escapeHtml(m.bab)}" data-semester="${escapeHtml(mSmt)}" data-judul="${escapeHtml(`Bab ${m.bab}: ${m.judul}`)}" ${isSel ? 'selected' : ''}>${escapeHtml(label)}</option>`;
          })
          .join('')}
                </select>`
        : `<input id="mq-materi-fallback" class="input" placeholder="Belum ada materi tersimpan; tulis judul materi atau tambahkan di menu Materi..." value="${escapeHtml(existing && existing.materiJudul ? existing.materiJudul : `Bab ${curBab}`)}" />`
      }
        </div>
        <div class="field">
          <label for="mq-tanya">Teks Pertanyaan</label>
          <textarea id="mq-tanya" class="textarea" rows="3" required>${existing ? escapeHtml(existing.pertanyaan) : ''}</textarea>
        </div>
        <div class="field">
          <label for="mq-img-file">Gambar Pendukung Soal <small style="color:var(--slate-500);font-weight:500;">(Opsional — Crop Manual Bebas Tarik, Base64 &lt; 46.000 char agar tidak pecah)</small></label>
          <input type="hidden" id="mq-img-url" value="${escapeHtml(curGambarUrl)}" />
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input id="mq-img-file" type="file" accept="image/*" class="input" style="flex:1;min-width:220px;" />
            <button type="button" class="btn btn-outline btn-sm" id="mq-img-recrop" ${curGambarUrl ? '' : 'hidden'}>✂️ Potong Ulang</button>
            <button type="button" class="btn btn-danger btn-sm" id="mq-img-del" ${curGambarUrl ? '' : 'hidden'}>🗑️ Hapus Gambar</button>
          </div>
          <div id="mq-img-info" style="font-size:12px;color:var(--emerald-800);font-weight:600;margin-top:4px;" ${curGambarUrl ? '' : 'hidden'}>${curGambarUrl ? `Gambar terpasang (${curGambarUrl.length.toLocaleString('id-ID')} karakter Base64)` : ''}</div>
          <div class="soal-img-preview-box" id="mq-img-preview-box">
            ${curGambarUrl
        ? `<img src="${escapeHtml(resolveImageUrl(curGambarUrl))}" alt="Pratinjau Gambar Soal" />`
        : '<small style="color:var(--slate-500);">Belum ada gambar (Opsional — pilih file gambar jika soal memuat potongan ayat, bagan, atau ilustrasi).</small>'
      }
          </div>
        </div>
        <div class="form-row-2">
          ${['A', 'B', 'C', 'D', 'E']
        .map(
          (L, i) => `<div class="field">
                <label for="mq-opsi-${i}">Pilihan ${L}${i === 4 ? ' <small style="color:var(--slate-500);font-weight:500;">(Opsional)</small>' : ''}</label>
                <input id="mq-opsi-${i}" class="input" ${i < 4 ? 'required' : ''} placeholder="${i === 4 ? 'Kosongkan jika hanya 4 pilihan (A–D)' : ''}" value="${escapeHtml(opsi[i] || '')}" />
              </div>`
        )
        .join('')}
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="mq-kunci">Kunci Jawaban</label>
            <select id="mq-kunci" class="select">
              ${['A', 'B', 'C', 'D', 'E'].map((L, i) => `<option value="${i}" ${existing && Number(existing.kunci) === i ? 'selected' : ''}>Pilihan ${L}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="mq-level">Level Kognitif</label>
            <input id="mq-level" class="input" value="${existing ? escapeHtml(existing.level || 'HOTS (C4)') : 'HOTS (C4)'}" />
          </div>
        </div>
        <div class="field">
          <label for="mq-bahas">Pembahasan Soal</label>
          <textarea id="mq-bahas" class="textarea" rows="2" required>${existing ? escapeHtml(existing.pembahasan || '') : ''}</textarea>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mq-cancel">Batal</button>
          <button type="submit" class="btn btn-primary">💾 Simpan Soal CBT</button>
        </div>
      </form>`,
      { size: 'xl' }
    );

    const smtEl = document.getElementById('mq-semester');
    const babEl = document.getElementById('mq-bab');
    const matEl = document.getElementById('mq-materi');
    if (matEl) {
      matEl.addEventListener('change', () => {
        const opt = matEl.options[matEl.selectedIndex];
        const bVal = opt ? opt.getAttribute('data-bab') : '';
        const sVal = opt ? opt.getAttribute('data-semester') : '';
        if (babEl && bVal && Array.from(babEl.options || []).some((o) => String(o.value) === String(bVal))) {
          babEl.value = bVal;
        }
        if (smtEl && sVal) smtEl.value = sVal;
      });
      if (babEl) {
        babEl.addEventListener('change', () => {
          const bVal = String(babEl.value);
          const matchOpt = Array.from(matEl.options).find((o) => String(o.getAttribute('data-bab')) === bVal);
          if (matchOpt) {
            matEl.value = matchOpt.value;
            const sVal = matchOpt.getAttribute('data-semester');
            if (smtEl && sVal) smtEl.value = sVal;
          }
        });
      }
      if (smtEl) {
        smtEl.addEventListener('change', () => {
          const sVal = String(smtEl.value);
          const matchOpt = Array.from(matEl.options).find((o) => String(o.getAttribute('data-semester')) === sVal);
          if (matchOpt) {
            matEl.value = matchOpt.value;
            const bVal = matchOpt.getAttribute('data-bab');
            if (babEl && bVal && Array.from(babEl.options || []).some((o) => String(o.value) === String(bVal))) {
              babEl.value = bVal;
            }
          }
        });
      }
    }

    const imgFileEl = document.getElementById('mq-img-file');
    const imgUrlEl = document.getElementById('mq-img-url');
    const imgPrevBox = document.getElementById('mq-img-preview-box');
    const imgInfoEl = document.getElementById('mq-img-info');
    const recropBtn = document.getElementById('mq-img-recrop');
    const delImgBtn = document.getElementById('mq-img-del');

    const updateSoalImageUi = (dataUrl, meta = null) => {
      if (imgUrlEl) imgUrlEl.value = dataUrl || '';
      if (recropBtn) recropBtn.hidden = !dataUrl;
      if (delImgBtn) delImgBtn.hidden = !dataUrl;
      if (imgInfoEl) {
        if (dataUrl) {
          const chars = (meta && meta.charCount) || dataUrl.length;
          const dimTxt = meta && meta.width && meta.height ? `${meta.width}×${meta.height} px • ` : '';
          imgInfoEl.textContent = `Gambar siap (${dimTxt}${chars.toLocaleString('id-ID')} karakter Base64 < 50.000)`;
          imgInfoEl.hidden = false;
        } else {
          imgInfoEl.textContent = '';
          imgInfoEl.hidden = true;
        }
      }
      if (imgPrevBox) {
        imgPrevBox.innerHTML = dataUrl
          ? `<img src="${escapeHtml(resolveImageUrl(dataUrl))}" alt="Pratinjau Gambar Soal" />`
          : '<small style="color:var(--slate-500);">Belum ada gambar (Opsional — pilih file gambar jika soal memuat potongan ayat, bagan, atau ilustrasi).</small>';
      }
    };

    const launchSoalImageCrop = ({ file = null, sourceDataUrl = '' }) => {
      openImageCropModal({
        file,
        sourceDataUrl,
        title: '✂️ Potong Gambar Soal (Crop Manual Bebas)',
        freeCrop: true,
        maxSide: 1024,
        maxChars: 46000,
        preferPng: true,
        preserveTransparency: false,
        onCropped(dataUrl, meta) {
          updateSoalImageUi(dataUrl, meta);
          const chars = (meta && meta.charCount) || dataUrl.length;
          showToast(`Gambar soal berhasil dipotong (${chars.toLocaleString('id-ID')} char Base64 < 50.000) dan siap disimpan.`);
        }
      });
    };

    if (imgFileEl) {
      imgFileEl.addEventListener('change', () => {
        const file = imgFileEl.files && imgFileEl.files[0];
        if (!file) return;
        imgFileEl.value = '';
        launchSoalImageCrop({ file });
      });
    }
    if (recropBtn) {
      recropBtn.addEventListener('click', () => {
        const cur = imgUrlEl ? imgUrlEl.value : '';
        if (cur) launchSoalImageCrop({ sourceDataUrl: cur });
      });
    }
    if (delImgBtn) {
      delImgBtn.addEventListener('click', () => {
        openConfirmModal({
          title: 'Konfirmasi Hapus Gambar Soal',
          message: 'Apakah Anda yakin akan menghapus gambar pendukung soal ini?',
          itemLabel: 'Gambar Pendukung Soal',
          confirmText: 'YA, Hapus',
          cancelText: 'TIDAK',
          onConfirm: () => updateSoalImageUi('', null),
          successMessage: 'Gambar soal dihapus (klik Simpan Soal CBT untuk menerapkan).'
        });
      });
    }

    document.getElementById('mq-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-form-soal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const opsiRaw = [0, 1, 2, 3, 4].map((i) => document.getElementById('mq-opsi-' + i).value.trim());
      const kunciVal = Number(document.getElementById('mq-kunci').value);
      if (kunciVal === 4 && !opsiRaw[4]) {
        showToast('Pilihan E masih kosong. Isi Pilihan E atau ubah Kunci Jawaban ke A–D.', 'warning');
        return;
      }
      const opsiClean = opsiRaw[4] ? opsiRaw : opsiRaw.slice(0, 4);

      const selMatOpt = matEl && matEl.options[matEl.selectedIndex];
      const materiId = matEl ? matEl.value : '';
      const materiJudul = selMatOpt
        ? selMatOpt.getAttribute('data-judul') || selMatOpt.textContent.trim()
        : (document.getElementById('mq-materi-fallback') && document.getElementById('mq-materi-fallback').value.trim()) ||
        `Bab ${Number(document.getElementById('mq-bab').value)}`;

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        await api.saveSoal({
          id: document.getElementById('mq-id').value || undefined,
          kelas: document.getElementById('mq-kelas').value,
          jenjang: document.getElementById('mq-jenjang').value,
          semester: document.getElementById('mq-semester').value,
          bab: Number(document.getElementById('mq-bab').value),
          materiId,
          materiJudul,
          pertanyaan: document.getElementById('mq-tanya').value.trim(),
          gambarUrl: imgUrlEl ? imgUrlEl.value.trim() : '',
          opsi: opsiClean,
          kunci: kunciVal,
          level: document.getElementById('mq-level').value.trim(),
          pembahasan: document.getElementById('mq-bahas').value.trim()
        });
        closeModal();
        showToast('Butir soal CBT berhasil disimpan.');
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan soal: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Soal CBT';
      }
    });
  }

  function openImportSoalModal(targetJenjang = null) {
    const jenjangVal = String(targetJenjang || state.selectedSoalJenjang || 'X').trim().toUpperCase();
    const rombelPool = getRombelListByJenjang(jenjangVal);
    const defaultKelas =
      state.filters.soalKelas &&
      state.filters.soalKelas !== 'Semua' &&
      state.filters.soalKelas !== '__UMUM__'
        ? state.filters.soalKelas
        : '';
    const jenjangLabel = `Kelas ${jenjangVal}`;
    const materiPool = getMateriByJenjang(jenjangVal);

    openModal(
      `📥 Import Bank Soal Excel — ${jenjangLabel}`,
      `<div class="form-grid">
        <div class="callout callout-emerald">
          <strong>Panduan Import Bank Soal (.xlsx / .csv) ke ${escapeHtml(jenjangLabel)}:</strong>
          <ol style="margin:8px 0 0;padding-left:18px;font-size:13.5px;">
            <li>Unduh template Excel resmi di bawah — di dalamnya sudah tersedia <strong>daftar Bab &amp; Materi</strong> yang tersimpan untuk Kelas ${escapeHtml(jenjangVal)}.</li>
            <li>Isi kolom <strong>Semester</strong>, <strong>Bab</strong>, <strong>Pertanyaan</strong>, <strong>Pilihan A–D</strong> (Pilihan E opsional), <strong>Kunci (A–E)</strong>, <strong>Level Kognitif</strong>, dan <strong>Pembahasan</strong>.</li>
            <li>Pilih target apakah soal berlaku untuk <strong>Semua Rombel ${escapeHtml(jenjangLabel)} (Umum)</strong> atau dikhususkan ke salah satu kelas.</li>
          </ol>
          <div style="margin-top:12px;">
            <button type="button" class="btn btn-gold btn-sm" id="ms-dl-tpl">📄 Unduh Template Bank Soal (.xlsx)</button>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label for="ms-target-kelas">Target Rombel Kelas</label>
            <select id="ms-target-kelas" class="select">
              <option value="" ${!defaultKelas ? 'selected' : ''}>Semua Rombel ${escapeHtml(jenjangLabel)} (Umum)</option>
              ${rombelPool
                .map((r) => `<option value="${escapeHtml(r)}" ${defaultKelas === r ? 'selected' : ''}>Khusus ${escapeHtml(r)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label for="ms-default-materi">Materi &amp; Bab Acuan</label>
            <select id="ms-default-materi" class="select">
              <option value="">Ikuti nomor Bab di masing-masing baris Excel</option>
              ${materiPool
        .map((m) => {
          const smtTxt = String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === '2' ? 'Smt 2' : 'Smt 1';
          return `<option value="${escapeHtml(m.id)}">Bab ${escapeHtml(m.bab)} (${smtTxt}) — ${escapeHtml(m.judul)}</option>`;
        })
        .join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="ms-file">Pilih File Excel / CSV Bank Soal</label>
          <input id="ms-file" type="file" class="input" accept=".xlsx,.xls,.csv" />
        </div>
        <div id="ms-report-host"></div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="ms-cancel">Tutup</button>
          <button type="button" class="btn btn-primary" id="ms-submit">⬆️ Import Bank Soal</button>
        </div>
      </div>`,
      { size: 'lg' }
    );

    const targetKelasEl = document.getElementById('ms-target-kelas');
    document.getElementById('ms-dl-tpl').addEventListener('click', () =>
      downloadSoalTemplate(jenjangVal, targetKelasEl ? targetKelasEl.value : '')
    );
    document.getElementById('ms-cancel').addEventListener('click', closeModal);
    document.getElementById('ms-submit').addEventListener('click', async () => {
      const fileInp = document.getElementById('ms-file');
      const reportHost = document.getElementById('ms-report-host');
      const defMatEl = document.getElementById('ms-default-materi');
      const pickedKelasName = targetKelasEl ? targetKelasEl.value : '';
      const file = fileInp && fileInp.files && fileInp.files[0];
      if (!file) {
        showToast('Pilih file Excel/CSV Bank Soal terlebih dahulu.', 'warning');
        return;
      }

      const defaultMateriObj =
        defMatEl && defMatEl.value
          ? materiPool.find((m) => m.id === defMatEl.value) || null
          : null;
      const targetScopeObj = { namaKelas: pickedKelasName, jenjang: jenjangVal };
      const scopeDesc = pickedKelasName || `${jenjangLabel} (Semua Rombel)`;

      const btn = document.getElementById('ms-submit');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Memvalidasi &amp; Mengimpor...';
      try {
        const parsed = await parseExcelOrCsvFile(file, normalizeImportedSoalRow);
        const res = await api.importSoalBatch(parsed, targetScopeObj, defaultMateriObj);

        if (res.rejectedCount === 0) {
          closeModal();
          showToast(`Berhasil mengimpor ${res.savedCount} butir soal CBT ke ${scopeDesc}!`);
          renderDashboard();
          return;
        }

        if (res.savedCount > 0) renderDashboard();
        if (reportHost) {
          reportHost.innerHTML = `
            <div class="callout callout-gold" style="margin-top:6px;">
              <strong>⚠️ Hasil Import Sebagian: Dari ${res.total} soal, ${res.savedCount} tersimpan dan ${res.rejectedCount} dilewati.</strong>
              <p style="margin:6px 0 10px;font-size:13px;color:var(--slate-700);">
                Periksa baris berikut pada file Excel lalu impor kembali bila perlu:
              </p>
              <div class="table-wrap" style="max-height:240px;">
                <table>
                  <thead><tr><th>Baris</th><th>Cuplikan Soal</th><th>Keterangan</th></tr></thead>
                  <tbody>
                    ${res.rejectedRows
              .map(
                (r) => `<tr>
                          <td>#${r.rowNo}</td>
                          <td>${escapeHtml(r.pertanyaan)}</td>
                          <td style="color:var(--rose-600);font-weight:600;font-size:12.5px;">${escapeHtml(r.reason)}</td>
                        </tr>`
              )
              .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
        showToast(
          `${res.savedCount} soal tersimpan, ${res.rejectedCount} baris dilewati. Periksa daftar di modal!`,
          'warning'
        );
        btn.disabled = false;
        btn.textContent = '⬆️ Import Ulang File';
      } catch (err) {
        showToast('Gagal mengimpor Bank Soal: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '⬆️ Import Bank Soal';
      }
    });
  }

  function openGuruRiwayatModal(existing = null) {
    const isEdit = Boolean(existing && existing.id);
    const currentList = typeof api.getGuruRiwayatList === 'function' ? api.getGuruRiwayatList() : [];
    const defaultUrutan = isEdit ? Number(existing.urutan || 1) : (currentList.length + 1);
    const katOptions = [
      { value: 'Mengajar', label: '🏫 Riwayat Mengajar' },
      { value: 'Pendidikan', label: '🎓 Riwayat Pendidikan' },
      { value: 'Penghargaan', label: '🏆 Riwayat Penghargaan & Prestasi' },
      { value: 'Diklat', label: '📜 Riwayat Diklat & Pelatihan' }
    ];
    openModal(
      isEdit ? '✏️ Edit Riwayat Portofolio Guru' : '➕ Tambah Riwayat Portofolio Guru',
      `<form id="modal-form-guru-riwayat" class="form-grid">
        <div class="form-row-3">
          <div class="field">
            <label for="mgr-kategori">Kategori Riwayat</label>
            <select id="mgr-kategori" class="select">
              ${katOptions.map((o) => `<option value="${o.value}" ${(existing ? existing.kategori : 'Mengajar') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="mgr-periode">Periode / Tahun</label>
            <input id="mgr-periode" class="input" required maxlength="60" placeholder="Contoh: 2021 – Sekarang / 2024" value="${escapeHtml(existing ? (existing.periode || '') : '')}" />
          </div>
          <div class="field">
            <label for="mgr-urutan">No. Urut Tampil</label>
            <input id="mgr-urutan" type="number" min="1" max="999" class="input" required value="${defaultUrutan}" />
          </div>
        </div>
        <div class="field">
          <label for="mgr-judul">Judul / Jabatan / Jenjang / Nama Penghargaan atau Diklat</label>
          <input id="mgr-judul" class="input" required maxlength="160" placeholder="Contoh: Guru PAI & Budi Pekerti / S1 Pendidikan Agama Islam" value="${escapeHtml(existing ? (existing.judul || '') : '')}" />
        </div>
        <div class="field">
          <label for="mgr-instansi">Instansi / Sekolah / Perguruan Tinggi / Penyelenggara</label>
          <input id="mgr-instansi" class="input" required maxlength="160" placeholder="Contoh: SMAN 20 Tebo / UIN / Balai Diklat Keagamaan" value="${escapeHtml(existing ? (existing.instansi || '') : '')}" />
        </div>
        <div class="field">
          <label for="mgr-ket">Keterangan / No. Sertifikat / Capaian (Opsional)</label>
          <textarea id="mgr-ket" class="textarea" rows="2" maxlength="400" placeholder="Keterangan singkat tambahan...">${escapeHtml(existing ? (existing.keterangan || '') : '')}</textarea>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mgr-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="mgr-save">💾 Simpan Riwayat</button>
        </div>
      </form>`,
      { size: 'md' }
    );

    const cancelEl = document.getElementById('mgr-cancel');
    if (cancelEl) cancelEl.addEventListener('click', closeModal);
    const formEl = document.getElementById('modal-form-guru-riwayat');
    if (formEl) {
      formEl.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const saveBtn = document.getElementById('mgr-save');
        await withButtonLoading(saveBtn, '<span class="spinner-inline"></span> Menyimpan Riwayat...', async () => {
          await api.saveGuruRiwayat({
            id: existing ? existing.id : '',
            kategori: document.getElementById('mgr-kategori').value,
            periode: document.getElementById('mgr-periode').value.trim(),
            urutan: Number(document.getElementById('mgr-urutan').value || defaultUrutan),
            judul: document.getElementById('mgr-judul').value.trim(),
            instansi: document.getElementById('mgr-instansi').value.trim(),
            keterangan: document.getElementById('mgr-ket').value.trim()
          });
          closeModal();
          showToast(isEdit ? 'Riwayat guru berhasil diperbarui.' : 'Riwayat guru baru berhasil ditambahkan.');
          renderDashboard();
        });
      });
    }
  }

  function openBelajarConfigModal(topic, opts = {}) {
    if (!topic) return;
    const isCategory = Boolean((opts && opts.isCategory) || String(topic.id || '').startsWith('cat-'));
    const curCover = String(topic.coverImage || '').trim();
    const curPreviewSrc = curCover ? resolveImageUrl(curCover) : '';
    const emptyPreviewHtml = `<span style="font-size:11px;font-weight:700;color:var(--slate-500);text-align:center;padding:8px;line-height:1.3;">Gradien Bawaan<br/>4:3 Landscape</span>`;
    const topicPrayers =
      !isCategory && window.BTD_SEED && window.BTD_SEED.belajarTopicPrayers && Array.isArray(window.BTD_SEED.belajarTopicPrayers[topic.id])
        ? window.BTD_SEED.belajarTopicPrayers[topic.id]
        : [];
    const curAudios = Object.assign({}, topic.prayerAudios || {});
    const toAudioPreviewSrc = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return '';
      if (/^audio\/[a-z0-9._-]+\.mp3$/i.test(s)) return s;
      if (/^data:audio\//i.test(s)) return s;
      const drv = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([a-zA-Z0-9_-]{10,})/i);
      if (drv) return `https://drive.google.com/uc?export=open&id=${drv[1]}`;
      return /^https:\/\//i.test(s) ? s : '';
    };
    const prayersAudioSectionHtml =
      isCategory || !topicPrayers.length
        ? ''
        : `<div class="field" id="mbc-prayer-audios-section">
            <label>🎙️ Audio Bacaan Otomatis &amp; Alternatif Rekaman Guru (Opsional)</label>
            <small class="hint" style="margin-bottom:6px;display:block;">
              Seluruh lafal niat, doa &amp; dalil sudah dipasangkan <strong>audio bacaan otomatis</strong> oleh sistem. Anda tetap dapat memakai tombol Rekam Mic atau Upload MP3 sebagai alternatif bila ingin menggantinya dengan suara Ustadz/Guru sendiri.
            </small>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${topicPrayers
                .map((p) => {
                  const k = String(p.key);
                  const curUrl = curAudios[k] || '';
                  const pSrc = toAudioPreviewSrc(curUrl || p.defaultAudioUrl || '');
                  const badgeHtml = curUrl
                    ? `<span class="tag tag-emerald" data-prayer-audio-status="${escapeHtml(k)}">✓ Audio Guru (Pengganti)</span>`
                    : p.builtin
                    ? `<span class="tag tag-sky" data-prayer-audio-status="${escapeHtml(k)}">🔊 ${escapeHtml(p.source || 'Audio Otomatis Aktif')} (Bawaan)</span>`
                    : `<span class="tag tag-gold" data-prayer-audio-status="${escapeHtml(k)}">⚠️ Belum Ada Audio</span>`;
                  return `
                    <div class="card" data-prayer-audio-row="${escapeHtml(k)}" style="padding:10px 12px;background:var(--slate-50);border:1px solid var(--slate-200);box-shadow:none;">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                        <strong style="font-size:13.2px;color:var(--slate-900);">${escapeHtml(p.label)}</strong>
                        ${badgeHtml}
                      </div>
                      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <button type="button" class="btn btn-outline btn-sm" data-prayer-mic="${escapeHtml(k)}">🎙️ Rekam Mic</button>
                        <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0;">
                          📁 Upload Audio
                          <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" data-prayer-audio-file="${escapeHtml(k)}" style="display:none;" />
                        </label>
                        <button type="button" class="btn btn-outline btn-sm" data-prayer-audio-clear="${escapeHtml(k)}" ${curUrl ? '' : 'hidden'}>🗑️ Hapus Audio</button>
                      </div>
                      <input type="text" class="input" data-prayer-audio-url="${escapeHtml(k)}" value="${escapeHtml(curUrl)}" placeholder="URL MP3 / Link Google Drive suara manusia (opsional)..." style="margin-top:8px;font-size:12.5px;" />
                      <div data-prayer-audio-preview-wrap="${escapeHtml(k)}" style="margin-top:6px;${pSrc ? '' : 'display:none;'}">
                        <audio controls preload="none" data-prayer-audio-preview="${escapeHtml(k)}" ${pSrc ? `src="${escapeHtml(pSrc)}"` : ''} style="width:100%;height:34px;"></audio>
                      </div>
                    </div>`;
                })
                .join('')}
            </div>
          </div>`;

    openModal(
      isCategory
        ? `🖼️ Edit Kartu Kategori Ayo Belajar — ${topic.defaultJudul || topic.judul}`
        : `✏️ Edit Praktikum Ayo Belajar — ${topic.defaultJudul || topic.judul}`,
      `<form id="modal-form-belajar-cfg" class="form-grid">
        <div class="callout callout-emerald" style="font-size:13.2px;">
          <strong>${isCategory ? 'Tipe:' : 'Kategori:'}</strong> ${escapeHtml(topic.kategoriTitle || '-')} • <strong>ID:</strong> <code>${escapeHtml(topic.id)}</code><br/>
          <small style="color:var(--slate-700);">${isCategory
            ? 'Unggah gambar latar miring/landscape rasio 4:3 (crop manual geser &amp; pilih area bebas → Base64) untuk kartu bidang utama di halaman depan Ayo Belajar.'
            : 'Judul, gambar latar kartu praktikum (crop manual 4:3 landscape Base64), audio suara manusia asli, link video YouTube Kemenag, dan status switch komentar dapat disesuaikan. Isi ilmu dasar praktikum tetap aman terjaga.'}</small>
        </div>
        <div class="field">
          <label for="mbc-judul">${isCategory ? 'Judul Kartu Kategori Tampil' : 'Judul Praktikum Tampil'}</label>
          <input id="mbc-judul" class="input" required maxlength="140" value="${escapeHtml(topic.judul || topic.defaultJudul)}" />
          <small class="hint">Judul bawaan: ${escapeHtml(topic.defaultJudul)} <button type="button" class="btn btn-outline btn-sm" id="mbc-reset-title" style="padding:2px 8px;min-height:24px;font-size:11px;margin-left:6px;">↺ Bawaan</button></small>
        </div>
        <div class="field">
          <label for="mbc-img-file">Gambar Latar Kartu Praktikum (Crop Manual 4:3 Landscape • Base64)</label>
          <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-top:4px;">
            <div id="mbc-img-preview" style="width:120px;height:90px;aspect-ratio:4 / 3;border-radius:10px;overflow:hidden;border:1px dashed var(--slate-300);background:var(--slate-100);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${curPreviewSrc
                ? `<img src="${escapeHtml(curPreviewSrc)}" alt="Pratinjau Latar Kartu" style="width:100%;height:100%;object-fit:cover;" />`
                : emptyPreviewHtml}
            </div>
            <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px;">
              <input id="mbc-img-file" type="file" class="input" accept="image/*" />
              <input id="mbc-img-url" aria-label="Data Base64 atau URL Gambar Latar" class="input" placeholder="Otomatis terisi Base64 hasil crop 4:3 landscape (atau tempel URL https://)..." value="${escapeHtml(curCover)}" />
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline btn-sm" id="mbc-img-clear">🗑️ Hapus Gambar</button>
                <small style="color:var(--slate-600);font-size:11.8px;">Bentuk <strong>4:3 Landscape (Miring/Mendatar)</strong> — bebas geser &amp; pilih bagian gambar saat crop (640×480 px, Base64 &lt; 46.000 karakter).</small>
              </div>
            </div>
          </div>
        </div>
        ${isCategory ? '' : `
          <div class="field">
            <label for="mbc-yt">URL atau ID Video YouTube Referensi Kemenag (Opsional)</label>
            <input id="mbc-yt" class="input" placeholder="Contoh: https://youtu.be/dYKstMQiKW0 atau dYKstMQiKW0" value="${escapeHtml(topic.youtubeId || '')}" />
            <small class="hint">Tempel link lengkap YouTube (<code>youtube.com/watch?v=...</code> / <code>youtu.be/...</code>) atau ID 11 karakternya. Kosongkan untuk menampilkan tombol cari YouTube Kemenag.</small>
          </div>
          ${prayersAudioSectionHtml}
          <label class="check-card">
            <input type="checkbox" id="mbc-komentar" ${topic.komentarAktif ? 'checked' : ''} />
            <span><strong>💬 Aktifkan Kolom Komentar Pengunjung pada Praktikum Ini (ON)</strong></span>
          </label>
        `}
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="mbc-cancel">Batal</button>
          <button type="submit" class="btn btn-primary" id="mbc-save">💾 Simpan Pengaturan ${isCategory ? 'Kategori' : 'Praktikum'}</button>
        </div>
      </form>`,
      { size: 'md' }
    );

    attachCropUpload({
      fileInputId: 'mbc-img-file',
      urlInputId: 'mbc-img-url',
      previewId: 'mbc-img-preview',
      title: '✂️ Potong Gambar Latar Kartu (4:3 Landscape • Manual)',
      ratioLabel: '4:3 Landscape',
      aspectRatio: 4 / 3,
      outWidth: 640,
      outHeight: 480,
      maxChars: 46000,
      freeCrop: true,
      lockRatio: true,
      onDoneNotice: 'Gambar latar kartu berhasil di-crop manual 4:3 Landscape (< 46.000 char Base64)! Klik Simpan untuk menerapkan.'
    });

    const urlInp = document.getElementById('mbc-img-url');
    const prevEl = document.getElementById('mbc-img-preview');
    if (urlInp && prevEl) {
      const refreshPrev = () => {
        const val = urlInp.value.trim();
        const src = val ? resolveImageUrl(val) : '';
        prevEl.innerHTML = src
          ? `<img src="${escapeHtml(src)}" alt="Pratinjau Latar Kartu" style="width:100%;height:100%;object-fit:cover;" />`
          : emptyPreviewHtml;
      };
      urlInp.addEventListener('change', refreshPrev);
      urlInp.addEventListener('blur', refreshPrev);
    }

    const clearImgBtn = document.getElementById('mbc-img-clear');
    if (clearImgBtn && urlInp && prevEl) {
      clearImgBtn.addEventListener('click', () => {
        urlInp.value = '';
        prevEl.innerHTML = emptyPreviewHtml;
        showToast('Gambar latar dikosongkan. Klik Simpan untuk mengembalikan warna gradien bawaan.', 'warning');
      });
    }

    const resetBtn = document.getElementById('mbc-reset-title');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const jInp = document.getElementById('mbc-judul');
        if (jInp) jInp.value = topic.defaultJudul || topic.judul;
      });
    }
    let activeRec = null;
    let activeRecStream = null;
    let activeRecKey = null;
    const stopActiveRecording = (silentCancel) => {
      try {
        if (activeRec && activeRec.state !== 'inactive') {
          if (silentCancel) activeRec.onstop = null;
          activeRec.stop();
        }
      } catch (_) {}
      try {
        if (activeRecStream) activeRecStream.getTracks().forEach((tr) => tr.stop());
      } catch (_) {}
      activeRec = null;
      activeRecStream = null;
      activeRecKey = null;
    };

    const formBelajarEl = document.getElementById('modal-form-belajar-cfg');
    if (formBelajarEl && typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        if (!document.body.contains(formBelajarEl)) {
          stopActiveRecording(true);
          mo.disconnect();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    const syncPrayerAudioRow = (key, rawVal) => {
      const val = String(rawVal || '').trim();
      const inp = document.querySelector(`[data-prayer-audio-url="${key}"]`);
      const badge = document.querySelector(`[data-prayer-audio-status="${key}"]`);
      const wrap = document.querySelector(`[data-prayer-audio-preview-wrap="${key}"]`);
      const audEl = document.querySelector(`[data-prayer-audio-preview="${key}"]`);
      const clrBtn = document.querySelector(`[data-prayer-audio-clear="${key}"]`);
      const pMeta = topicPrayers.find((x) => String(x.key) === String(key)) || {};
      if (inp && inp.value !== val) inp.value = val;
      const previewSrc = toAudioPreviewSrc(val || pMeta.defaultAudioUrl || '');
      if (wrap) wrap.style.display = previewSrc ? '' : 'none';
      if (audEl) {
        if (previewSrc) {
          audEl.setAttribute('src', previewSrc);
          if (typeof audEl.load === 'function') audEl.load();
        } else {
          audEl.removeAttribute('src');
        }
      }
      if (clrBtn) clrBtn.hidden = !val;
      if (badge) {
        badge.className = 'tag ' + (val ? 'tag-emerald' : pMeta.builtin ? 'tag-sky' : 'tag-gold');
        badge.textContent = val
          ? '✓ Audio Guru (Pengganti)'
          : pMeta.builtin
          ? `🔊 ${pMeta.source || 'Audio Otomatis Aktif'} (Bawaan)`
          : '⚠️ Belum Ada Audio';
      }
    };

    document.querySelectorAll('[data-prayer-audio-url]').forEach((inp) => {
      const k = inp.getAttribute('data-prayer-audio-url');
      inp.addEventListener('change', () => syncPrayerAudioRow(k, inp.value));
      inp.addEventListener('blur', () => syncPrayerAudioRow(k, inp.value));
    });

    document.querySelectorAll('[data-prayer-audio-clear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-prayer-audio-clear');
        syncPrayerAudioRow(k, '');
        showToast('Audio guru dikosongkan. Klik Simpan untuk menerapkan.', 'warning');
      });
    });

    document.querySelectorAll('[data-prayer-audio-file]').forEach((fileInp) => {
      fileInp.addEventListener('change', async () => {
        const k = fileInp.getAttribute('data-prayer-audio-file');
        const file = fileInp.files && fileInp.files[0];
        if (!file) return;
        if (typeof api.uploadAudioMedia !== 'function') {
          showToast('Fitur unggah audio belum tersedia di API.', 'error');
          return;
        }
        const pRow = document.querySelector(`[data-prayer-audio-row="${k}"]`);
        if (pRow) pRow.style.opacity = '0.65';
        try {
          showToast('Mengunggah audio bacaan ke Google Drive...', 'info');
          const res = await api.uploadAudioMedia(file, `audio-${topic.id}-p${k}-${file.name}`);
          const savedUrl = (res && (res.url || res.fileUrl)) || '';
          if (!savedUrl) throw new Error('Server tidak mengembalikan URL audio.');
          syncPrayerAudioRow(k, savedUrl);
          showToast('Audio manusia berhasil diunggah ke Drive! Klik Simpan Pengaturan.', 'success');
        } catch (err) {
          showToast('Gagal mengunggah audio: ' + err.message, 'error');
        } finally {
          if (pRow) pRow.style.opacity = '';
          fileInp.value = '';
        }
      });
    });

    document.querySelectorAll('[data-prayer-mic]').forEach((micBtn) => {
      micBtn.addEventListener('click', async () => {
        const k = micBtn.getAttribute('data-prayer-mic');
        if (activeRec && activeRecKey === k) {
          micBtn.disabled = true;
          micBtn.textContent = '⏳ Memproses...';
          stopActiveRecording(false);
          return;
        }
        if (activeRec) {
          showToast('Hentikan rekaman lain terlebih dahulu.', 'warning');
          return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
          showToast('Browser Anda belum mendukung rekam mikrofon langsung. Silakan gunakan tombol Upload Audio MP3.', 'warning');
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
          let chosenMime = '';
          if (typeof MediaRecorder.isTypeSupported === 'function') {
            chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
          }
          const rec = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
          const chunks = [];
          activeRec = rec;
          activeRecStream = stream;
          activeRecKey = k;
          micBtn.textContent = '⏹ Stop & Simpan Rekam';
          micBtn.style.background = '#fee2e2';
          micBtn.style.borderColor = '#ef4444';
          micBtn.style.color = '#991b1b';

          rec.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
          };
          rec.onstop = async () => {
            const finalMime = rec.mimeType || chosenMime || 'audio/webm';
            const ext = finalMime.includes('ogg') ? 'ogg' : finalMime.includes('mp4') ? 'm4a' : 'webm';
            micBtn.disabled = true;
            micBtn.textContent = '⏳ Mengunggah...';
            try {
              stream.getTracks().forEach((tr) => tr.stop());
            } catch (_) {}
            try {
              const blob = new Blob(chunks, { type: finalMime });
              if (!blob.size) throw new Error('Rekaman suara kosong.');
              const res = await api.uploadAudioMedia(blob, `rekam-${topic.id}-p${k}-${Date.now()}.${ext}`);
              const savedUrl = (res && (res.url || res.fileUrl)) || '';
              if (!savedUrl) throw new Error('Server tidak mengembalikan URL rekaman.');
              syncPrayerAudioRow(k, savedUrl);
              showToast('Rekaman suara manusia berhasil disimpan ke Drive! Klik Simpan Pengaturan.', 'success');
            } catch (err) {
              showToast('Gagal menyimpan rekaman suara: ' + err.message, 'error');
            } finally {
              micBtn.disabled = false;
              micBtn.textContent = '🎙️ Rekam Mic';
              micBtn.style.background = '';
              micBtn.style.borderColor = '';
              micBtn.style.color = '';
              activeRec = null;
              activeRecStream = null;
              activeRecKey = null;
            }
          };
          rec.start();
          showToast('Merekam suara... Silakan baca lafal niat/doa lalu klik Stop.', 'info');
        } catch (err) {
          showToast('Tidak dapat mengakses mikrofon: ' + (err.message || err), 'error');
        }
      });
    });

    document.getElementById('mbc-cancel').addEventListener('click', () => {
      stopActiveRecording(true);
      closeModal();
    });
    document.getElementById('modal-form-belajar-cfg').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (activeRec) {
        showToast('Hentikan rekaman mikrofon terlebih dahulu sebelum menyimpan.', 'warning');
        return;
      }
      const btn = document.getElementById('mbc-save');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Menyimpan...';
      try {
        const newJudul = document.getElementById('mbc-judul').value.trim();
        const newCover = document.getElementById('mbc-img-url').value.trim();
        const ytInp = document.getElementById('mbc-yt');
        const komInp = document.getElementById('mbc-komentar');
        const nextPrayerAudios = {};
        if (!isCategory) {
          document.querySelectorAll('[data-prayer-audio-url]').forEach((inp) => {
            const pk = inp.getAttribute('data-prayer-audio-url');
            const pv = inp.value.trim();
            if (pk && pv) nextPrayerAudios[pk] = pv;
          });
        }
        await api.saveBelajarConfig({
          id: topic.id,
          kategoriId: topic.kategoriId,
          judul: newJudul,
          coverImage: newCover,
          youtubeId: ytInp ? ytInp.value.trim() : '',
          komentarAktif: komInp ? Boolean(komInp.checked) : true,
          prayerAudios: isCategory ? undefined : nextPrayerAudios
        });
        closeModal();
        showToast(`Pengaturan "${newJudul || topic.defaultJudul}" berhasil disimpan!`);
        renderDashboard();
      } catch (err) {
        showToast('Gagal menyimpan pengaturan praktikum: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = `💾 Simpan Pengaturan ${isCategory ? 'Kategori' : 'Praktikum'}`;
      }
    });
  }

  /* -------------------- MAIN DASHBOARD RENDER -------------------- */
  function renderDashboard() {
    const ungradedStats = getUngradedStats();
    const sidebarGroups = [
      {
        label: 'Utama',
        items: [
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'siswaKelas', label: '🎓 Kelola Siswa & Kelas', badge: ungradedStats.totalCount },
          { id: 'materi', label: '📖 Materi, Gambar & Tajwid', badge: ungradedStats.totalCount },
          { id: 'jadwal', label: '📅 Jadwal Pembelajaran' }
        ]
      },
      {
        label: 'Konten & Asesmen',
        items: [
          { id: 'belajar', label: '🧭 Ayo Belajar' },
          { id: 'banner', label: '🖼️ Banner Depan & Galeri' },
          { id: 'soal', label: '📝 Bank Soal CBT' },
          { id: 'rekap', label: '🗂️ Rekap Nilai, HOTS & Tugas', badge: ungradedStats.totalCount }
        ]
      },
      {
        label: 'Sistem',
        items: [{ id: 'pengaturan', label: '⚙️ Pengaturan' }]
      }
    ];

    let bodyHtml = '';

    if (state.tab === 'dashboard') {
      const s = api.getAnalytics();
      bodyHtml = `
        <div class="grid grid-4" style="margin-bottom:20px;">
          <div class="card card-hover tone-emerald">
            <span class="tag tag-emerald">Kelas &amp; Siswa (NISN)</span>
            <div style="font-size:28px;font-weight:800;margin-top:8px;color:#065f46;">${s.totalKelas} / ${s.totalSiswa}</div>
            <small style="color:var(--slate-600);">${s.totalKelas} rombel • ${s.totalSiswa} siswa</small>
          </div>
          <div class="card card-hover tone-sky">
            <span class="tag tag-sky">Jadwal &amp; Kehadiran</span>
            <div style="font-size:28px;font-weight:800;margin-top:8px;color:#0369a1;">${s.totalTerlaksana}/${s.totalJadwal}</div>
            <small style="color:var(--slate-600);">Terlaksana • ${s.attendanceRate}% hadir</small>
          </div>
          <div class="card card-hover tone-gold">
            <span class="tag tag-gold">Rerata Nilai CBT</span>
            <div style="font-size:28px;font-weight:800;margin-top:8px;color:#b45309;">${s.avgScore}</div>
            <small style="color:var(--slate-600);">Ketuntasan ${s.masteryRate}% (${s.totalEvaluasi} tes)</small>
          </div>
          <div class="card card-hover tone-rose">
            <span class="tag tag-rose">Materi &amp; HOTS</span>
            <div style="font-size:28px;font-weight:800;margin-top:8px;color:#be123c;">${s.totalMateri} / ${s.totalHots + s.totalAmaliyah}</div>
            <small style="color:var(--slate-600);">Bab PAI • refleksi siswa</small>
          </div>
        </div>

        <div class="grid grid-2" style="margin-bottom:20px;">
          <div class="card">
            <h3 style="margin:0 0 12px;">📊 Rerata Skor Evaluasi per Kelas</h3>
            ${renderBarChart(s.classChart.map((c) => ({ label: c.label, value: c.avg })), ' poin')}
          </div>
          <div class="card">
            <h3 style="margin:0 0 12px;">🗓️ Rekap Status Daftar Hadir</h3>
            ${renderBarChart(s.statusCounts.map((st) => ({ label: st.label, value: st.count })), ' catatan')}
          </div>
        </div>

        <div class="card callout-emerald">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>Akses Cepat Pengelolaan</strong>
              <p style="margin:4px 0 0;font-size:13.5px;color:var(--slate-700);">Kelola jadwal mengajar, import siswa ber-NISN via Excel, dan catat daftar hadir langsung dari tabel.</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" id="btn-dash-go-jadwal">📅 Tabel Jadwal Mengajar</button>
              <button type="button" class="btn btn-outline btn-sm" data-jump-siswa-tab="siswa">👥 Tabel Data Siswa</button>
            </div>
          </div>
        </div>
      `;
    } else if (state.tab === 'siswaKelas') {
      const kelasList = api.state.data.kelas || [];
      const siswaList = api.state.data.siswa || [];
      const classNames = getClassNamesList();

      const subTabs = [
        { id: 'kelas', label: `🏫 Data Kelas (${kelasList.length})` },
        { id: 'siswa', label: `👥 Data Siswa Ber-NISN (${siswaList.length})` }
      ];

      let subBody = '';

      if (state.tabSiswa !== 'siswa') {
        state.tabSiswa = 'kelas';
        const q = state.filters.kelasSearch.trim().toLowerCase();
        const filtered = kelasList.filter(
          (k) => !q || String(k.namaKelas || '').toLowerCase().includes(q) || String(k.waliKelas || '').toLowerCase().includes(q)
        );
        const meta = paginate(filtered, 'kelas');
        const kelasTones = ['tone-emerald', 'tone-sky', 'tone-violet', 'tone-gold'];

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-kelas">➕ Tambah Kelas</button>
              </div>
              <div class="table-toolbar-right">
                <input id="flt-kelas-search" type="search" aria-label="Cari kelas" class="input" style="width:230px;" placeholder="Cari nama kelas / wali..." value="${escapeHtml(state.filters.kelasSearch)}" />
              </div>
            </div>

            ${meta.pageItems.length === 0
              ? `<div class="callout" style="text-align:center;color:var(--slate-500);">Belum ada data kelas yang sesuai.</div>`
              : `<div class="grid grid-3" style="margin-bottom:14px;">
                  ${meta.pageItems
                    .map((k, idx) => {
                      const count = siswaList.filter((s) => s.kelas === k.namaKelas).length;
                      const kStats = ungradedStats.byKelas(k.namaKelas);
                      const tone = kelasTones[idx % kelasTones.length];
                      return `<article class="card card-hover class-picker-card admin-kelas-card has-corner-badge ${tone}">
                        ${renderCardCornerBadge(
                          kStats.total,
                          `${kStats.total} kiriman kelas ${k.namaKelas} (${kStats.tugas} Tugas, ${kStats.rk} Ruang Kritis) belum dinilai`
                        )}
                        <div style="display:flex;gap:6px;flex-wrap:wrap;padding-right:34px;">
                          <span class="tag tag-emerald">Jenjang ${escapeHtml(k.jenjang)}</span>
                          <span class="tag tag-gold">${count} Siswa</span>
                        </div>
                        <h3 style="margin:2px 0 0;font-size:19px;color:var(--slate-900);">🏫 ${escapeHtml(k.namaKelas)}</h3>
                        <div style="font-size:13px;color:var(--slate-700);">
                          <strong>Wali:</strong> ${escapeHtml(k.waliKelas || '-')}
                          ${k.keterangan ? `<div style="font-size:12px;color:var(--slate-600);margin-top:2px;">${escapeHtml(k.keterangan)}</div>` : ''}
                        </div>
                        ${kStats.total > 0
                          ? `<div style="font-size:12px;font-weight:700;color:#be123c;background:rgba(255,228,230,0.85);border:1px solid #fda4af;border-radius:8px;padding:6px 10px;">
                              🔔 ${kStats.total} belum dinilai (${kStats.tugas} Tugas • ${kStats.rk} Ruang Kritis)
                            </div>`
                          : `<div style="font-size:12px;color:#047857;font-weight:600;">✓ Semua tugas kelas sudah dinilai</div>`
                        }
                        <div class="admin-card-actions">
                          ${kStats.total > 0
                            ? `<button type="button" class="btn btn-rose-soft btn-sm" data-jump-ungraded-kelas="${escapeHtml(k.namaKelas)}">📋 Nilai (${kStats.total})</button>`
                            : ''}
                          <button type="button" class="btn btn-primary btn-sm" data-view-siswa-kelas="${escapeHtml(k.namaKelas)}">👥 Siswa</button>
                          <button type="button" class="btn btn-outline btn-sm" data-edit-kelas="${escapeHtml(k.id)}">✏️ Edit</button>
                          <button type="button" class="btn btn-danger btn-sm" data-del-kelas="${escapeHtml(k.id)}">Hapus</button>
                        </div>
                      </article>`;
                    })
                    .join('')}
                </div>`
            }
            ${renderPaginationBar(meta, 'kelas')}
          </div>
        `;
      } else if (state.tabSiswa === 'siswa') {
        const q = state.filters.siswaSearch.trim().toLowerCase();
        const filtered = siswaList.filter((s) => {
          const matchKelas = state.filters.siswaKelas === 'Semua' || s.kelas === state.filters.siswaKelas;
          const nisn = String(s.nisn || s.nis || s.id || '').toLowerCase();
          const matchQ = !q || String(s.nama || '').toLowerCase().includes(q) || nisn.includes(q);
          return matchKelas && matchQ;
        });
        const meta = paginate(filtered, 'siswa');

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-siswa">➕ Tambah Siswa</button>
                <button type="button" class="btn btn-gold btn-sm" id="btn-open-import-siswa">📥 Import Excel</button>
                <button type="button" class="btn btn-outline btn-sm" id="btn-export-siswa">📊 Unduh Excel</button>
                <button type="button" class="btn btn-gold btn-sm" id="btn-export-siswa-pdf">📄 Unduh PDF (Kop Surat)</button>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-siswa-kelas" aria-label="Filter kelas siswa" class="select" style="width:auto;">
                  <option value="Semua">Semua Kelas</option>
                  ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${state.filters.siswaKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
                <input id="flt-siswa-search" type="search" aria-label="Cari NISN atau nama siswa" class="input" style="width:220px;" placeholder="Cari NISN / nama siswa..." value="${escapeHtml(state.filters.siswaSearch)}" />
              </div>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>No</th><th>NISN (ID)</th><th>Nama Lengkap</th><th>Kelas</th><th>L/P</th><th>Status</th><th>Password</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  ${meta.pageItems.length === 0
            ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Belum ada data siswa pada filter ini.</td></tr>`
            : meta.pageItems
              .map((s, idx) => {
                const nisn = String(s.nisn || s.nis || s.id || '');
                const hasCustomPass = Boolean(s.hasCustomPassword || (s.password && String(s.password).trim() !== nisn));
                return `<tr>
                              <td>${meta.startIdx + idx + 1}</td>
                              <td><code>${escapeHtml(nisn)}</code></td>
                              <td><strong>${escapeHtml(s.nama)}</strong></td>
                              <td><span class="tag tag-emerald">${escapeHtml(s.kelas)}</span></td>
                              <td>${escapeHtml(s.jenisKelamin || 'L')}</td>
                              <td><span class="tag ${s.status === 'Aktif' ? 'tag-emerald' : 'tag-gold'}">${escapeHtml(s.status || 'Aktif')}</span></td>
                              <td>${hasCustomPass ? '<span class="tag tag-violet">🔐 Kustom</span>' : '<span class="tag tag-slate">NISN</span>'}</td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-siswa="${escapeHtml(s.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-siswa="${escapeHtml(s.id)}">Hapus</button>
                              </td>
                            </tr>`;
              })
              .join('')
          }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'siswa')}
          </div>
        `;
      }

      bodyHtml = `
        <div class="tabs no-print">
          ${subTabs.map((st) => `<button type="button" class="tab-btn ${state.tabSiswa === st.id ? 'active' : ''}" data-siswa-subtab="${st.id}">${escapeHtml(st.label)}</button>`).join('')}
        </div>
        ${subBody}
      `;
    } else if (state.tab === 'jadwal') {
      const classNames = getClassNamesList();
      const q = state.filters.jadwalSearch.trim().toLowerCase();
      const filtered = getFilteredJadwalRows();
      const meta = paginate(filtered, 'jadwal');

      bodyHtml = `
        <div class="card">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <button type="button" class="btn btn-primary btn-sm" id="btn-add-jadwal">➕ Tambah Jadwal Mengajar</button>
              <button type="button" class="btn btn-outline btn-sm" id="btn-jadwal-excel">📊 Unduh Jadwal Excel</button>
              <button type="button" class="btn btn-gold btn-sm" id="btn-jadwal-pdf">📄 Unduh Jadwal PDF</button>
            </div>
            <div class="table-toolbar-right">
              <select id="flt-jdw-bulan" aria-label="Filter bulan jadwal" class="select" style="width:auto;">
                ${MONTHS.map((m) => `<option value="${m.val}" ${state.filters.jadwalBulan === m.val ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
              <select id="flt-jdw-semester" aria-label="Filter semester jadwal" class="select" style="width:auto;">
                <option value="Semua">Semua Semester</option>
                <option value="1" ${state.filters.jadwalSemester === '1' ? 'selected' : ''}>Smt 1 (Ganjil)</option>
                <option value="2" ${state.filters.jadwalSemester === '2' ? 'selected' : ''}>Smt 2 (Genap)</option>
              </select>
              <select id="flt-jdw-kelas" aria-label="Filter kelas jadwal" class="select" style="width:auto;">
                <option value="Semua">Semua Kelas</option>
                ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${state.filters.jadwalKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
              <select id="flt-jdw-jenis" aria-label="Filter jenis pembelajaran" class="select" style="width:auto;">
                <option value="Semua">Daring &amp; Luring</option>
                <option value="Daring" ${state.filters.jadwalJenis === 'Daring' ? 'selected' : ''}>Daring</option>
                <option value="Luring" ${state.filters.jadwalJenis === 'Luring' ? 'selected' : ''}>Luring</option>
              </select>
              <select id="flt-jdw-status" aria-label="Filter status jadwal" class="select" style="width:auto;">
                <option value="Semua">Semua Status</option>
                <option value="Sedang Berlangsung" ${state.filters.jadwalStatus === 'Sedang Berlangsung' ? 'selected' : ''}>Sedang Berlangsung</option>
                <option value="Terlaksana" ${state.filters.jadwalStatus === 'Terlaksana' ? 'selected' : ''}>Terlaksana</option>
              </select>
              <input id="flt-jdw-search" type="search" aria-label="Cari materi jadwal" class="input" style="width:200px;" placeholder="Cari materi..." value="${escapeHtml(state.filters.jadwalSearch)}" />
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>No</th><th>Tanggal &amp; Jam</th><th>Kelas &amp; Smt</th><th>Materi Pembelajaran</th><th>Jenis</th><th>Status</th><th>Rekap Hadir</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                ${meta.pageItems.length === 0
          ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Belum ada jadwal pembelajaran pada filter ini.</td></tr>`
          : meta.pageItems
            .map((j, idx) => {
              const sum = api.getScheduleAttendanceSummary(j);
              const isDone = j.status === 'Terlaksana';
              const statusLabel = isDone ? 'Terlaksana' : 'Sedang Berlangsung';
              const jSmt = String(j.semester || '1');
              return `<tr>
                            <td>${meta.startIdx + idx + 1}</td>
                            <td style="white-space:nowrap;"><strong>${formatDateId(j.tanggal)}</strong><br/><small style="color:var(--slate-500);">${escapeHtml(j.jamKe)}</small></td>
                            <td style="white-space:nowrap;">
                              <span class="tag tag-emerald">${escapeHtml(j.kelas)}</span>
                              <span class="tag tag-sky">${jSmt === '2' ? 'Smt 2' : 'Smt 1'}</span>
                            </td>
                            <td><strong>${escapeHtml(j.materiJudul)}</strong></td>
                            <td><span class="tag ${j.jenis === 'Daring' ? 'tag-sky' : 'tag-gold'}">${escapeHtml(j.jenis)}</span></td>
                            <td><span class="tag ${isDone ? 'tag-emerald' : 'tag-gold'}">${escapeHtml(statusLabel)}</span></td>
                            <td style="white-space:nowrap;">
                              <span class="tag tag-emerald">H:${sum.counts.Hadir}</span>
                              <small>I:${sum.counts.Izin} S:${sum.counts.Sakit} A:${sum.counts.Alpa}</small>
                              ${sum.counts['Belum Absen'] ? `<br/><small style="color:var(--slate-500);">Belum Absen: ${sum.counts['Belum Absen']}</small>` : ''}
                            </td>
                            <td style="white-space:nowrap;">
                              <button type="button" class="btn btn-primary btn-sm" data-modal-absen="${escapeHtml(j.id)}">🗓️ Presensi</button>
                              <button type="button" class="btn btn-outline btn-sm" data-edit-jadwal="${escapeHtml(j.id)}">✏️ Edit</button>
                              <button type="button" class="btn btn-danger btn-sm" data-del-jadwal="${escapeHtml(j.id)}">Hapus</button>
                            </td>
                          </tr>`;
            })
            .join('')
        }
              </tbody>
            </table>
          </div>
          ${renderPaginationBar(meta, 'jadwal')}
        </div>
      `;
    } else if (state.tab === 'banner') {
      const banners = (api.state.data.banners || []).slice().sort((a, b) => Number(a.urutan || 0) - Number(b.urutan || 0));
      const galeriList = api.state.data.galeri || [];
      const classNames = getClassNamesList();

      let subBody = '';
      if (state.tabBanner === 'banner') {
        const q = state.filters.bannerSearch.trim().toLowerCase();
        const filtered = banners.filter((b) => !q || String(b.judul || '').toLowerCase().includes(q) || String(b.badge || '').toLowerCase().includes(q));
        const meta = paginate(filtered, 'banner');

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-banner">➕ Tambah Slide Banner</button>
              </div>
              <div class="table-toolbar-right">
                <input id="flt-bnr-search" type="search" aria-label="Cari banner" class="input" style="width:220px;" placeholder="Cari judul banner..." value="${escapeHtml(state.filters.bannerSearch)}" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Urutan</th><th>Pratinjau</th><th>Judul &amp; Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${meta.pageItems.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:var(--slate-500);">Belum ada slide banner.</td></tr>`
            : meta.pageItems
              .map((b) => {
                const src = resolveImageUrl(b.imageUrl);
                return `<tr>
                              <td><span class="tag tag-gold">#${escapeHtml(b.urutan)}</span></td>
                              <td>${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(b.judul)}" style="width:96px;height:54px;object-fit:cover;border-radius:8px;" />` : '<small>Default</small>'}</td>
                              <td><strong>${escapeHtml(b.judul)}</strong><br/><small style="color:var(--slate-500);">${escapeHtml(b.badge || '')} • ${escapeHtml(b.deskripsi || '')}</small></td>
                              <td><span class="tag ${b.aktif !== false ? 'tag-emerald' : 'tag-rose'}">${b.aktif !== false ? 'Aktif' : 'Nonaktif'}</span></td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-banner="${escapeHtml(b.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-banner="${escapeHtml(b.id)}">Hapus</button>
                              </td>
                            </tr>`;
              })
              .join('')
          }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'banner')}
          </div>
        `;
      } else {
        const q = state.filters.galeriSearch.trim().toLowerCase();
        const filtered = galeriList.filter((g) => {
          if (state.filters.galeriKelas !== 'Semua' && g.kelas !== state.filters.galeriKelas) return false;
          return !q || String(g.judul || '').toLowerCase().includes(q) || String(g.kreator || '').toLowerCase().includes(q);
        });
        const meta = paginate(filtered, 'galeri');

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-gold btn-sm" id="btn-add-galeri">➕ Tambah Karya ke Galeri</button>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-gal-kelas" aria-label="Filter kelas galeri" class="select" style="width:auto;">
                  <option value="Semua">Semua Kelas</option>
                  ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${state.filters.galeriKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
                <input id="flt-gal-search" type="search" aria-label="Cari karya galeri" class="input" style="width:220px;" placeholder="Cari judul / kreator..." value="${escapeHtml(state.filters.galeriSearch)}" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>No</th><th>Foto</th><th>Judul &amp; Ringkasan</th><th>Kelas</th><th>Kategori</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${meta.pageItems.length === 0
            ? `<tr><td colspan="6" style="text-align:center;color:var(--slate-500);">Belum ada item galeri.</td></tr>`
            : meta.pageItems
              .map((g, idx) => {
                const src = resolveImageUrl(g.gambarUrl);
                return `<tr>
                              <td>${meta.startIdx + idx + 1}</td>
                              <td>${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(g.judul)}" style="width:78px;height:52px;object-fit:cover;border-radius:8px;" />` : '-'}</td>
                              <td><strong>${escapeHtml(g.judul)}</strong><br/><small style="color:var(--slate-500);">${escapeHtml(g.kreator)} • ${escapeHtml((g.ringkasan || '').slice(0, 75))}...</small></td>
                              <td><span class="tag tag-emerald">${escapeHtml(g.kelas)}</span></td>
                              <td><span class="tag tag-gold">${escapeHtml(g.kategori)}</span></td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-galeri="${escapeHtml(g.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-galeri="${escapeHtml(g.id)}">Hapus</button>
                              </td>
                            </tr>`;
              })
              .join('')
          }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'galeri')}
          </div>
        `;
      }

      bodyHtml = `
        <div class="tabs no-print">
          <button type="button" class="tab-btn ${state.tabBanner === 'banner' ? 'active' : ''}" data-bnr-tab="banner">🖼️ Banner Slider Depan (${banners.length})</button>
          <button type="button" class="tab-btn ${state.tabBanner === 'galeri' ? 'active' : ''}" data-bnr-tab="galeri">🌟 Galeri Karya Siswa (${galeriList.length})</button>
        </div>
        ${subBody}
      `;
    } else if (state.tab === 'materi') {
      const materiList = api.state.data.materi || [];
      const tajwidList = api.state.data.tajwid || [];

      let subBody = '';
      if (state.tabMateri === 'materi') {
        const q = state.filters.materiSearch.trim().toLowerCase();
        const getSmt = (m) => String(m.semester || (Number(m.bab) <= 5 ? '1' : '2'));
        const babPool = [...new Set(
          materiList
            .filter((m) => state.filters.materiJenjang === 'Semua' || m.jenjang === state.filters.materiJenjang)
            .filter((m) => state.filters.materiSemester === 'Semua' || getSmt(m) === state.filters.materiSemester)
            .map((m) => String(m.bab))
            .filter(Boolean)
        )].sort((a, b) => Number(a) - Number(b));
        if (state.filters.materiBab !== 'Semua' && !babPool.includes(state.filters.materiBab)) {
          state.filters.materiBab = 'Semua';
        }

        const filtered = materiList.filter((m) => {
          if (state.filters.materiJenjang !== 'Semua' && m.jenjang !== state.filters.materiJenjang) return false;
          if (state.filters.materiSemester !== 'Semua' && getSmt(m) !== state.filters.materiSemester) return false;
          if (state.filters.materiBab !== 'Semua' && String(m.bab) !== state.filters.materiBab) return false;
          return !q || String(m.judul || '').toLowerCase().includes(q) || String(m.elemen || '').toLowerCase().includes(q);
        });
        const meta = paginate(filtered, 'materi');

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-materi">➕ Tambah Materi PAI</button>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-mat-jenjang" aria-label="Filter kelas materi" class="select" style="width:auto;">
                  <option value="Semua">Semua Kelas</option>
                  ${['X', 'XI', 'XII'].map((j) => `<option value="${j}" ${state.filters.materiJenjang === j ? 'selected' : ''}>Kelas ${j}</option>`).join('')}
                </select>
                <select id="flt-mat-semester" aria-label="Filter semester materi" class="select" style="width:auto;">
                  <option value="Semua">Semua Semester</option>
                  <option value="1" ${state.filters.materiSemester === '1' ? 'selected' : ''}>Smt 1 (Ganjil)</option>
                  <option value="2" ${state.filters.materiSemester === '2' ? 'selected' : ''}>Smt 2 (Genap)</option>
                </select>
                <select id="flt-mat-bab" aria-label="Filter bab materi" class="select" style="width:auto;">
                  <option value="Semua">Semua Bab</option>
                  ${babPool.map((b) => `<option value="${escapeHtml(b)}" ${state.filters.materiBab === b ? 'selected' : ''}>Bab ${escapeHtml(b)}</option>`).join('')}
                </select>
                <input id="flt-mat-search" type="search" aria-label="Cari materi" class="input" style="width:200px;" placeholder="Cari judul / elemen..." value="${escapeHtml(state.filters.materiSearch)}" />
              </div>
            </div>
            ${meta.pageItems.length === 0
              ? `<div class="callout" style="text-align:center;color:var(--slate-500);">Belum ada materi yang sesuai filter ini.</div>`
              : `<div class="grid grid-3" style="margin-bottom:14px;">
                  ${meta.pageItems
                    .map((m, idx) => {
                      const tCount = tajwidList.filter((t) => t.materiId === m.id).length;
                      const imgCount = (m.galeriGambar || []).length + (m.infografisUrl ? 1 : 0) + (m.coverImage ? 1 : 0);
                      const smtVal = getSmt(m);
                      const smtTxt = smtVal === '2' ? 'Smt 2 (Genap)' : 'Smt 1 (Ganjil)';
                      const mStats = ungradedStats.byMateri(m);
                      const matTones = ['tone-emerald', 'tone-sky', 'tone-gold', 'tone-violet'];
                      const tone = matTones[idx % matTones.length];
                      return `<article class="card card-hover class-picker-card admin-kelas-card has-corner-badge ${tone}">
                        ${renderCardCornerBadge(
                          mStats.total,
                          `${mStats.total} kiriman untuk Bab ${m.bab} Kls ${m.jenjang} (${mStats.tugas} Tugas, ${mStats.rk} Ruang Kritis) belum dinilai`
                        )}
                        <div style="display:flex;gap:5px;flex-wrap:wrap;padding-right:34px;">
                          <span class="tag tag-emerald">Kls ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)}</span>
                          <span class="tag tag-sky">${smtTxt}</span>
                        </div>
                        <h3 style="margin:2px 0 0;font-size:16px;color:var(--slate-900);line-height:1.35;">${escapeHtml(m.judul)}</h3>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                          <span class="tag tag-gold">${escapeHtml(m.elemen)}</span>
                          <small style="color:var(--slate-600);">${imgCount} gambar • ${tCount} tajwid</small>
                        </div>
                        ${mStats.total > 0
                          ? `<div style="font-size:12px;font-weight:700;color:#be123c;background:rgba(255,228,230,0.85);border:1px solid #fda4af;border-radius:8px;padding:6px 10px;">
                              🔔 ${mStats.total} kiriman belum dinilai (${mStats.tugas} Tugas • ${mStats.rk} RK)
                            </div>`
                          : ''}
                        <div class="admin-card-actions">
                          ${mStats.total > 0
                            ? `<button type="button" class="btn btn-rose-soft btn-sm" data-jump-ungraded-materi="${escapeHtml(m.id)}">📝 Nilai (${mStats.total})</button>`
                            : ''}
                          <button type="button" class="btn btn-outline btn-sm" data-edit-materi="${escapeHtml(m.id)}">✏️ Edit</button>
                          <button type="button" class="btn btn-danger btn-sm" data-del-materi="${escapeHtml(m.id)}">Hapus</button>
                        </div>
                      </article>`;
                    })
                    .join('')}
                </div>`
            }
            ${renderPaginationBar(meta, 'materi')}
          </div>
        `;
      } else {
        const q = state.filters.tajwidSearch.trim().toLowerCase();
        const filtered = tajwidList.filter((t) => {
          if (state.filters.tajwidMateriId !== 'Semua' && t.materiId !== state.filters.tajwidMateriId) return false;
          return !q || String(t.transliterasi || '').toLowerCase().includes(q) || String(t.hukum || '').toLowerCase().includes(q);
        });
        const meta = paginate(filtered, 'tajwid');

        subBody = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-gold btn-sm" id="btn-add-tajwid">➕ Tambah Kartu Tajwid</button>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-tjw-mat" aria-label="Filter materi tajwid" class="select" style="width:auto;max-width:260px;">
                  <option value="Semua">Semua Bab Materi</option>
                  ${materiList.map((m) => `<option value="${escapeHtml(m.id)}" ${state.filters.tajwidMateriId === m.id ? 'selected' : ''}>Kls ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul.slice(0, 32))}</option>`).join('')}
                </select>
                <input id="flt-tjw-search" type="search" aria-label="Cari kartu tajwid" class="input" style="width:210px;" placeholder="Cari lafal / hukum..." value="${escapeHtml(state.filters.tajwidSearch)}" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>No</th><th>Lafal Arab</th><th>Transliterasi &amp; Ayat</th><th>Hukum Bacaan</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${meta.pageItems.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:var(--slate-500);">Belum ada kartu tajwid pada filter ini.</td></tr>`
            : meta.pageItems
              .map(
                (t, idx) => `<tr>
                              <td>${meta.startIdx + idx + 1}</td>
                              <td class="arabic-text" style="font-size:21px;line-height:1.5;">${escapeHtml(t.lafalArab)}</td>
                              <td><strong>${escapeHtml(t.transliterasi)}</strong><br/><small>${escapeHtml(t.sumberAyat)}</small></td>
                              <td><span class="tag tag-gold">${escapeHtml(t.hukum)}</span></td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-tajwid="${escapeHtml(t.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-tajwid="${escapeHtml(t.id)}">Hapus</button>
                              </td>
                            </tr>`
              )
              .join('')
          }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'tajwid')}
          </div>
        `;
      }

      bodyHtml = `
        <div class="tabs no-print">
          <button type="button" class="tab-btn ${state.tabMateri === 'materi' ? 'active' : ''}" data-mat-tab="materi">📖 Tabel Materi PAI (${materiList.length})</button>
          <button type="button" class="tab-btn ${state.tabMateri === 'tajwid' ? 'active' : ''}" data-mat-tab="tajwid">🔎 Tabel Bedah Tajwid (${tajwidList.length})</button>
        </div>
        ${subBody}
      `;
    } else if (state.tab === 'soal') {
      const jenjangList = getSoalJenjangList();
      const soalList = api.state.data.bankSoal || [];
      const selectedJenjang = state.selectedSoalJenjang;

      if (!selectedJenjang) {
        const tonePool = [
          { tone: 'tone-emerald', iconBg: 'is-emerald', icon: '📘', tag: 'tag-emerald' },
          { tone: 'tone-sky', iconBg: 'is-sky', icon: '📗', tag: 'tag-sky' },
          { tone: 'tone-violet', iconBg: 'is-violet', icon: '📕', tag: 'tag-violet' },
          { tone: 'tone-gold', iconBg: 'is-gold', icon: '📒', tag: 'tag-gold' }
        ];

        bodyHtml =
          jenjangList.length === 0
            ? `<div class="card">
                <h2 style="margin:0 0 8px;">📝 Bank Soal CBT PAI</h2>
                <div class="callout callout-gold">
                  <strong>Belum ada data jenjang atau kelas.</strong> Tambahkan kelas terlebih dahulu di menu <strong>Kelola Siswa &amp; Kelas</strong>.
                  <div style="margin-top:12px;">
                    <button type="button" class="btn btn-primary btn-sm" id="btn-soal-go-kelas">🎓 Buka Menu Kelola Kelas</button>
                  </div>
                </div>
              </div>`
            : `<div class="card" style="margin-bottom:18px;">
                <span class="tag tag-emerald">Bank Soal Per Jenjang Kelas</span>
                <h2 style="margin:8px 0 4px;">Pilih Kartu Jenjang Bank Soal CBT</h2>
                <p style="margin:0;color:var(--slate-600);font-size:13.8px;">
                  Soal disusun ringkas per jenjang (<strong>Kelas X, XI, XII</strong>) — seluruh rombel pada jenjang yang sama dikelompokkan dalam 1 kartu dan bisa dipilah lewat filter kelas di dalamnya.
                </p>
              </div>
              <div class="grid grid-3">
                ${jenjangList
                  .map((j, idx) => {
                    const styleMeta = tonePool[idx % tonePool.length];
                    const jenjangSoal = soalList.filter((s) => soalBelongsToJenjang(s, j));
                    const classMateri = getMateriByJenjang(j);
                    const rombels = getRombelListByJenjang(j);
                    const rombelDesc = rombels.length
                      ? `Mencakup rombel: ${rombels.join(', ')}`
                      : `Bank soal evaluasi PAIBP Smart Test Kelas ${j}`;
                    return `
                      <article class="card card-hover class-picker-card ${styleMeta.tone}" data-pick-soal-jenjang="${escapeHtml(j)}" role="button" tabindex="0">
                        <div class="quick-bento-top">
                          <span class="quick-bento-icon ${styleMeta.iconBg}">${styleMeta.icon}</span>
                          <span class="tag ${styleMeta.tag}">${jenjangSoal.length} Butir Soal</span>
                        </div>
                        <h3 style="margin:0 0 6px;font-size:21px;color:var(--slate-900);">Kelas ${escapeHtml(j)}</h3>
                        <p style="margin:0 0 12px;font-size:13.5px;color:var(--slate-700);flex:1;">
                          ${escapeHtml(rombelDesc)}
                        </p>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                          <span class="tag tag-emerald">${rombels.length || 1} Rombel</span>
                          <span class="tag tag-sky">${classMateri.length} Bab Materi</span>
                        </div>
                        <button type="button" class="btn btn-primary btn-block" data-pick-soal-jenjang="${escapeHtml(j)}">
                          📝 Kelola Soal Kelas ${escapeHtml(j)} →
                        </button>
                      </article>
                    `;
                  })
                  .join('')}
              </div>`;
      } else {
        const jenjangSoal = soalList.filter((s) => soalBelongsToJenjang(s, selectedJenjang));
        const rombelList = getRombelListByJenjang(selectedJenjang);
        const materiPool = getMateriByJenjang(selectedJenjang);
        const extraBabs = Array.from(
          new Set(jenjangSoal.map((s) => Number(s.bab)).filter((b) => b > 0 && !materiPool.some((m) => Number(m.bab) === b)))
        ).sort((a, b) => a - b);

        const getSoalSmt = (s) => {
          if (s.semester) return String(s.semester);
          const hit = materiPool.find((m) => (s.materiId && m.id === s.materiId) || Number(m.bab) === Number(s.bab));
          if (hit && hit.semester) return String(hit.semester);
          return Number(s.bab) <= 5 ? '1' : '2';
        };

        const q = state.filters.soalSearch.trim().toLowerCase();
        const filtered = jenjangSoal.filter((s) => {
          const sKelas = String(s.kelas || '').trim();
          if (state.filters.soalKelas === '__UMUM__') {
            if (sKelas !== '') return false;
          } else if (state.filters.soalKelas !== 'Semua') {
            if (sKelas.toLowerCase() !== String(state.filters.soalKelas).trim().toLowerCase()) return false;
          }
          if (state.filters.soalSemester !== 'Semua' && getSoalSmt(s) !== state.filters.soalSemester) return false;
          if (state.filters.soalBab !== 'Semua' && String(s.bab) !== String(state.filters.soalBab)) return false;
          const mTitle = resolveSoalMateriTitle(s).toLowerCase();
          return (
            !q ||
            String(s.pertanyaan || '').toLowerCase().includes(q) ||
            mTitle.includes(q) ||
            sKelas.toLowerCase().includes(q)
          );
        });
        const meta = paginate(filtered, 'soal');
        const letters = ['A', 'B', 'C', 'D', 'E'];

        bodyHtml = `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid var(--slate-200);">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline btn-sm" id="btn-soal-back-kelas">← Kembali ke Kartu Jenjang</button>
                <h2 style="margin:0;font-size:19px;">📝 Bank Soal: Kelas ${escapeHtml(selectedJenjang)}</h2>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${rombelList.length ? `<span class="tag tag-sky">${escapeHtml(rombelList.join(' • '))}</span>` : ''}
                <span class="tag tag-gold">${jenjangSoal.length} Butir Soal</span>
              </div>
            </div>

            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <button type="button" class="btn btn-primary btn-sm" id="btn-add-soal">➕ Tambah Soal CBT</button>
                <button type="button" class="btn btn-gold btn-sm" id="btn-open-import-soal">📥 Import Bank Soal (Excel)</button>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-soal-kelas" aria-label="Filter rombel kelas soal" class="select" style="width:auto;">
                  <option value="Semua" ${state.filters.soalKelas === 'Semua' ? 'selected' : ''}>Semua Rombel Kelas ${escapeHtml(selectedJenjang)}</option>
                  <option value="__UMUM__" ${state.filters.soalKelas === '__UMUM__' ? 'selected' : ''}>Umum Jenjang ${escapeHtml(selectedJenjang)}</option>
                  ${rombelList
                    .map(
                      (r) => `<option value="${escapeHtml(r)}" ${state.filters.soalKelas === r ? 'selected' : ''}>Khusus ${escapeHtml(r)}</option>`
                    )
                    .join('')}
                </select>
                <select id="flt-soal-semester" aria-label="Filter semester soal" class="select" style="width:auto;">
                  <option value="Semua">Semua Semester</option>
                  <option value="1" ${state.filters.soalSemester === '1' ? 'selected' : ''}>Smt 1 (Ganjil)</option>
                  <option value="2" ${state.filters.soalSemester === '2' ? 'selected' : ''}>Smt 2 (Genap)</option>
                </select>
                <select id="flt-soal-bab" aria-label="Filter bab dan materi soal" class="select" style="width:auto;max-width:250px;">
                  <option value="Semua">Semua Bab &amp; Materi</option>
                  ${materiPool
                    .map(
                      (m) => `<option value="${escapeHtml(m.bab)}" ${String(state.filters.soalBab) === String(m.bab) ? 'selected' : ''}>
                        Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}
                      </option>`
                    )
                    .join('')}
                  ${extraBabs
                    .map(
                      (b) => `<option value="${escapeHtml(b)}" ${String(state.filters.soalBab) === String(b) ? 'selected' : ''}>Bab ${escapeHtml(b)}</option>`
                    )
                    .join('')}
                </select>
                <input id="flt-soal-search" type="search" aria-label="Cari soal" class="input" style="width:190px;" placeholder="Cari teks pertanyaan..." value="${escapeHtml(state.filters.soalSearch)}" />
              </div>
            </div>

            <div class="table-wrap">
              <table>
                <thead><tr><th>No</th><th>Target Kelas, Smt &amp; Bab</th><th>Pertanyaan</th><th>Level</th><th>Kunci</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${
                    meta.pageItems.length === 0
                      ? `<tr><td colspan="6" style="text-align:center;color:var(--slate-500);">Belum ada butir soal untuk filter ini. Klik "Tambah Soal CBT" atau "Import Bank Soal".</td></tr>`
                      : meta.pageItems
                          .map((s, idx) => {
                            const smt = getSoalSmt(s);
                            const klsBadge = s.kelas ? s.kelas : `Semua ${selectedJenjang}`;
                            return `<tr>
                              <td>${meta.startIdx + idx + 1}</td>
                              <td style="max-width:240px;">
                                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:3px;">
                                  <span class="tag ${s.kelas ? 'tag-violet' : 'tag-gold'}">${escapeHtml(klsBadge)}</span>
                                  <span class="tag tag-sky">Smt ${escapeHtml(smt)}</span>
                                  <span class="tag tag-emerald">Bab ${escapeHtml(s.bab)}</span>
                                </div>
                                <small style="color:var(--slate-600);font-weight:600;">${escapeHtml(resolveSoalMateriTitle(s))}</small>
                              </td>
                              <td>
                                ${s.gambarUrl ? '<span class="tag tag-violet" style="margin-bottom:4px;display:inline-block;">🖼️ Ada Gambar</span><br/>' : ''}
                                ${escapeHtml(String(s.pertanyaan || '').slice(0, 110))}${String(s.pertanyaan || '').length > 110 ? '...' : ''}
                              </td>
                              <td><span class="tag tag-gold">${escapeHtml(s.level || 'HOTS')}</span></td>
                              <td><strong>${letters[Number(s.kunci)] || '-'}</strong></td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-soal="${escapeHtml(s.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-soal="${escapeHtml(s.id)}">Hapus</button>
                              </td>
                            </tr>`;
                          })
                          .join('')
                  }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'soal')}
          </div>
        `;
      }
    } else if (state.tab === 'rekap') {
      const classNames = getClassNamesList();
      const subTabs = [
        { id: 'evaluasi', label: `Nilai CBT (${(api.state.data.evaluasi || []).length})` },
        { id: 'ruangKritis', label: `Ruang Kritis (${(api.state.data.ruangKritis || []).length})`, badge: ungradedStats.rkCount },
        { id: 'amaliyah', label: `Amaliyah KBC (${(api.state.data.amaliyah || []).length})` },
        { id: 'tugas', label: `Tugas (${(api.state.data.tugas || []).length})`, badge: ungradedStats.tugasCount }
      ];

      const q = state.filters.rekapSearch.trim().toLowerCase();
      const filtered = getFilteredRekapRows(state.rekapSub);
      const meta = paginate(filtered, 'rekap');

      let tableHtml = '';
      if (state.rekapSub === 'evaluasi') {
        tableHtml = `<table><thead><tr><th>No</th><th>Waktu</th><th>NISN</th><th>Nama</th><th>Kelas</th><th>Paket</th><th>Skor</th><th>Benar</th><th>Aksi</th></tr></thead><tbody>
          ${meta.pageItems.length === 0
            ? `<tr><td colspan="9" style="text-align:center;color:var(--slate-500);">Belum ada data nilai.</td></tr>`
            : meta.pageItems
              .map(
                (e, i) => `<tr><td>${meta.startIdx + i + 1}</td><td>${formatDateId(e.timestamp)}</td><td><code>${escapeHtml(e.nisn || '-')}</code></td><td><strong>${escapeHtml(e.nama)}</strong></td><td>${escapeHtml(e.kelas)}</td><td>Kls ${escapeHtml(e.jenjang)} Bab ${escapeHtml(e.bab)}</td><td><strong>${escapeHtml(e.skor)}</strong>${e.catatanGuru ? `<div style="margin-top:3px;font-size:11.5px;color:var(--slate-600);">${escapeHtml(e.catatanGuru)}</div>` : ''}</td><td>${escapeHtml(e.benar)}/${escapeHtml(e.totalSoal)}</td><td style="white-space:nowrap;"><button type="button" class="btn btn-sm btn-outline" data-edit-evaluasi="${escapeHtml(e.id)}">✏️ Edit Nilai</button></td></tr>`
              )
              .join('')
          }
        </tbody></table>`;
      } else if (state.rekapSub === 'ruangKritis') {
        tableHtml = `<table><thead><tr><th>No</th><th>NISN</th><th>Nama</th><th>Kelas</th><th>Nilai KBC</th><th>Analisis HOTS</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>
          ${meta.pageItems.length === 0
            ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Belum ada respons ruang kritis.</td></tr>`
            : meta.pageItems
              .map(
                (r, i) => {
                  const hasNilai = r.nilai !== undefined && r.nilai !== null && String(r.nilai).trim() !== '';
                  return `<tr>
                      <td>${meta.startIdx + i + 1}</td>
                      <td><code>${escapeHtml(r.nisn || '-')}</code></td>
                      <td><strong>${escapeHtml(r.nama)}</strong></td>
                      <td>${escapeHtml(r.kelas)}</td>
                      <td>${escapeHtml(r.nilaiKbc)}</td>
                      <td>${escapeHtml(r.analisis)}</td>
                      <td>
                        ${hasNilai
                          ? `<span class="tag tag-emerald" style="font-weight:800;">${escapeHtml(String(r.nilai))}</span>`
                          : `<span class="tag tag-slate">Belum Dinilai</span>`
                        }
                        ${r.catatanGuru ? `<div style="margin-top:4px;font-size:12px;color:var(--slate-600);">${escapeHtml(r.catatanGuru)}</div>` : ''}
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="btn btn-sm ${hasNilai ? 'btn-outline' : 'btn-primary'}" data-grade-hots="${escapeHtml(r.id)}">${hasNilai ? '✏️ Edit Nilai' : '➕ Beri Nilai'}</button>
                          <button type="button" class="btn btn-sm ${r.dikurasi ? 'btn-outline' : 'btn-gold'}" data-curate-hots="${escapeHtml(r.id)}">${r.dikurasi ? '✓ Galeri' : '🌟 Terbitkan'}</button>
                        </div>
                      </td>
                    </tr>`;
                }
              )
              .join('')
          }
        </tbody></table>`;
      } else if (state.rekapSub === 'amaliyah') {
        tableHtml = `<table><thead><tr><th>No</th><th>NISN</th><th>Nama</th><th>Kelas</th><th>Checklist</th><th>Pencapaian</th><th>Aksi KBC</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>
          ${meta.pageItems.length === 0
            ? `<tr><td colspan="9" style="text-align:center;color:var(--slate-500);">Belum ada jurnal amaliyah.</td></tr>`
            : meta.pageItems
              .map(
                (a, i) => {
                  const hasNilai = !isEntryUngraded(a);
                  return `<tr>
                      <td>${meta.startIdx + i + 1}</td>
                      <td><code>${escapeHtml(a.nisn || '-')}</code></td>
                      <td><strong>${escapeHtml(a.nama)}</strong></td>
                      <td>${escapeHtml(a.kelas)}</td>
                      <td>${[a.lulusSensorGadget && 'Gadget', a.zeroProkrastinasi && 'Disiplin', a.petarungFokus && 'Fokus'].filter(Boolean).join(', ') || '-'}</td>
                      <td>${escapeHtml(a.pencapaianTerbaik)}</td>
                      <td>${escapeHtml(a.refleksiKbc)}</td>
                      <td>
                        ${hasNilai
                          ? `<span class="tag tag-emerald" style="font-weight:800;">${escapeHtml(String(a.nilai))}</span>`
                          : `<span class="tag tag-slate">Belum Dinilai</span>`
                        }
                        ${a.catatanGuru ? `<div style="margin-top:4px;font-size:12px;color:var(--slate-600);">${escapeHtml(a.catatanGuru)}</div>` : ''}
                      </td>
                      <td style="white-space:nowrap;">
                        <button type="button" class="btn btn-sm ${hasNilai ? 'btn-outline' : 'btn-primary'}" data-grade-amaliyah="${escapeHtml(a.id)}">${hasNilai ? '✏️ Edit Nilai' : '➕ Beri Nilai'}</button>
                      </td>
                    </tr>`;
                }
              )
              .join('')
          }
        </tbody></table>`;
      } else {
        tableHtml = `<table><thead><tr><th>No</th><th>Waktu</th><th>NISN</th><th>Nama</th><th>Kelas</th><th>Bab &amp; Jenis</th><th>Tautan/File</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>
          ${meta.pageItems.length === 0
            ? `<tr><td colspan="9" style="text-align:center;color:var(--slate-500);">Belum ada tugas terkumpul.</td></tr>`
            : meta.pageItems
              .map(
                (t, i) => {
                  const hasNilai = !isEntryUngraded(t);
                  const navSafe = (window.BTD_UI && window.BTD_UI.safeNavUrl) || safeUrl;
                  const url = typeof navSafe === 'function' ? navSafe(t.fileUrl) : '';
                  return `<tr>
                      <td>${meta.startIdx + i + 1}</td>
                      <td>${formatDateId(t.timestamp)}</td>
                      <td><code>${escapeHtml(t.nisn || '-')}</code></td>
                      <td><strong>${escapeHtml(t.nama)}</strong></td>
                      <td>${escapeHtml(t.kelas)}</td>
                      <td>
                        <strong>${escapeHtml(t.bab || '-')}</strong><br/>
                        <span class="tag tag-sky">${escapeHtml(t.jenisTugas || '-')}</span>
                      </td>
                      <td>
                        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Buka Tugas ↗</a>` : escapeHtml(t.fileUrl || '-')}
                        ${t.catatan ? `<div style="margin-top:4px;font-size:12px;color:var(--slate-600);">${escapeHtml(t.catatan)}</div>` : ''}
                      </td>
                      <td>
                        ${hasNilai
                          ? `<span class="tag tag-emerald" style="font-weight:800;">${escapeHtml(String(t.nilai))}</span>`
                          : `<span class="tag tag-slate">Belum Dinilai</span>`
                        }
                        ${t.catatanGuru ? `<div style="margin-top:4px;font-size:12px;color:var(--slate-600);">${escapeHtml(t.catatanGuru)}</div>` : ''}
                      </td>
                      <td style="white-space:nowrap;">
                        <button type="button" class="btn btn-sm ${hasNilai ? 'btn-outline' : 'btn-primary'}" data-grade-tugas="${escapeHtml(t.id)}">${hasNilai ? '✏️ Edit Nilai' : '➕ Beri Nilai'}</button>
                      </td>
                    </tr>`;
                }
              )
              .join('')
          }
        </tbody></table>`;
      }

      bodyHtml = `
        <div class="card">
          <div class="tabs no-print" style="margin-bottom:14px;">
            ${subTabs.map((st) => `<button type="button" class="tab-btn ${state.rekapSub === st.id ? 'active' : ''}" data-rekap-sub="${st.id}">${escapeHtml(st.label)}${renderRedBadge(st.badge, `${st.badge} belum dinilai`)}</button>`).join('')}
          </div>
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <button type="button" class="btn btn-outline btn-sm" id="btn-export-rekap-excel">📊 Unduh Excel</button>
              <button type="button" class="btn btn-gold btn-sm" id="btn-export-rekap-pdf">📄 Unduh PDF (Kop Surat)</button>
            </div>
            <div class="table-toolbar-right">
              <select id="flt-rek-kelas" aria-label="Filter kelas rekap" class="select" style="width:auto;">
                <option value="Semua">Semua Kelas</option>
                ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${state.filters.rekapKelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
              <input id="flt-rek-search" type="search" aria-label="Cari data rekap" class="input" style="width:220px;" placeholder="Cari nama / NISN / isi..." value="${escapeHtml(state.filters.rekapSearch)}" />
            </div>
          </div>
          <div class="table-wrap">${tableHtml}</div>
          ${renderPaginationBar(meta, 'rekap')}
        </div>
      `;
    } else if (state.tab === 'belajar') {
      const catBgList = typeof api.getBelajarCategoriesList === 'function' ? api.getBelajarCategoriesList() : [];
      const topicsList = typeof api.getBelajarTopicsList === 'function' ? api.getBelajarTopicsList() : [];
      const commentsList = Array.isArray(api.state.data.belajarKomentar) ? api.state.data.belajarKomentar : [];
      const catOptions = [...new Set(topicsList.map((t) => t.kategoriTitle).filter(Boolean))];
      const belajarTabs = [
        { id: 'praktikum', label: `📋 Daftar Nama Praktikum (${topicsList.length})` },
        { id: 'komentar', label: `💬 Komentar Pengunjung (${commentsList.length})` }
      ];

      let belajarSubHtml = '';
      if (state.tabBelajar !== 'komentar') {
        state.tabBelajar = 'praktikum';
        const q = state.filters.belajarSearch.trim().toLowerCase();
        const filtered = topicsList.filter((t) => {
          if (state.filters.belajarKategori !== 'Semua' && t.kategoriTitle !== state.filters.belajarKategori) return false;
          return !q || String(t.judul).toLowerCase().includes(q) || String(t.kategoriTitle).toLowerCase().includes(q);
        });
        const meta = paginate(filtered, 'belajar');
        belajarSubHtml = `
          ${catBgList.length ? `
            <div class="card" style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <div>
                  <span class="tag tag-gold">🖼️ Gambar Latar 6 Kartu Kategori Utama (4:3 Landscape • Base64)</span>
                  <h3 style="margin:6px 0 2px;font-size:16.5px;">Latar Belakang Kartu Halaman Depan Ayo Belajar</h3>
                </div>
                <span class="tag tag-sky">${catBgList.filter((c) => Boolean(c.coverImage)).length}/${catBgList.length} Memakai Gambar</span>
              </div>
              <div class="prak-cat-bg-strip">
                ${catBgList.map((c) => {
                  const thumbSrc = c.coverImage ? resolveImageUrl(c.coverImage) : '';
                  return `<div class="prak-cat-bg-item">
                    <div class="prak-cat-bg-box">
                      ${thumbSrc ? `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(c.judul)}" />` : '4:3'}
                    </div>
                    <div style="flex:1;min-width:0;">
                      <strong style="display:block;font-size:13px;line-height:1.3;margin-bottom:4px;">${escapeHtml(c.judul)}</strong>
                      <button type="button" class="btn btn-outline btn-sm" data-edit-belajar-cat="${escapeHtml(c.id)}" style="padding:3px 9px;min-height:26px;font-size:11.5px;">🖼️ Atur Gambar</button>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
          <div class="card">
            <div class="callout callout-emerald" style="margin-bottom:14px;font-size:13.3px;">
              <strong>Pengaturan Konten Menu Ayo Belajar:</strong> Ubah <strong>Judul</strong>, unggah <strong>Gambar Latar Kartu (Crop Manual 4:3 Landscape Base64)</strong>, pasang/ganti <strong>Video YouTube Kemenag</strong>, dan aktifkan/nonaktifkan <strong>Switch Komentar (ON/OFF)</strong> pada setiap sub-praktikum. Materi ilmu dasar tetap terjaga aman.
            </div>
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <span class="tag tag-sky">${topicsList.filter((t) => t.komentarAktif).length} Aktif Komentar • ${topicsList.filter((t) => Boolean(t.coverImage)).length} Memakai Gambar Latar</span>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-belajar-kat" aria-label="Filter kategori ayo belajar" class="select" style="width:auto;">
                  <option value="Semua">Semua Bidang Praktikum</option>
                  ${catOptions.map((c) => `<option value="${escapeHtml(c)}" ${state.filters.belajarKategori === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
                <input id="flt-belajar-search" type="search" aria-label="Cari judul praktikum" class="input" style="width:220px;" placeholder="Cari judul praktikum..." value="${escapeHtml(state.filters.belajarSearch)}" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>No</th><th>Bidang Kategori</th><th>Judul Praktikum</th><th>Gambar Latar (4:3)</th><th>Video YouTube</th><th>Komentar</th><th>Switch Komentar</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${meta.pageItems.length === 0
                    ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Tidak ada praktikum yang sesuai filter.</td></tr>`
                    : meta.pageItems
                        .map((t, i) => {
                          const cmCount = commentsList.filter((c) => String(c.topicId) === String(t.id)).length;
                          const isCustomTitle = t.judul !== t.defaultJudul;
                          const coverSrc = t.coverImage ? resolveImageUrl(t.coverImage) : '';
                          return `<tr>
                            <td>${meta.startIdx + i + 1}</td>
                            <td><span class="tag tag-sky">${escapeHtml(t.kategoriTitle)}</span></td>
                            <td>
                              <strong>${escapeHtml(t.judul)}</strong>
                              ${isCustomTitle ? `<div style="font-size:11.5px;color:var(--slate-500);">Bawaan: ${escapeHtml(t.defaultJudul)}</div>` : ''}
                            </td>
                            <td>
                              ${coverSrc
                                ? `<img class="prak-admin-thumb" src="${escapeHtml(coverSrc)}" alt="Cover ${escapeHtml(t.judul)}" />`
                                : `<span class="tag tag-slate">Gradien Bawaan</span>`}
                            </td>
                            <td>
                              ${t.youtubeId
                                ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(t.youtubeId)}" target="_blank" rel="noopener noreferrer" class="tag tag-emerald" style="text-decoration:none;">▶️ ${escapeHtml(t.youtubeId)} ↗</a>`
                                : `<span class="tag tag-slate">Pencarian Kemenag</span>`
                              }
                              ${t.prayerAudios && Object.keys(t.prayerAudios).length
                                ? `<div style="margin-top:4px;"><span class="tag tag-sky">🎙️ ${Object.keys(t.prayerAudios).length} Audio Guru</span></div>`
                                : ''
                              }
                            </td>
                            <td>
                              <button type="button" class="btn btn-outline btn-sm" data-jump-belajar-komentar="${escapeHtml(t.id)}">💬 ${cmCount}</button>
                            </td>
                            <td>
                              <button type="button" class="switch-pill ${t.komentarAktif ? 'is-on' : ''}" data-toggle-belajar-komentar="${escapeHtml(t.id)}" aria-pressed="${t.komentarAktif ? 'true' : 'false'}" title="Klik untuk ON/OFF komentar pada ${escapeHtml(t.judul)}">
                                <span class="switch-knob" aria-hidden="true"></span>
                                <span>${t.komentarAktif ? 'ON' : 'OFF'}</span>
                              </button>
                            </td>
                            <td style="white-space:nowrap;">
                              <button type="button" class="btn btn-outline btn-sm" data-edit-belajar="${escapeHtml(t.id)}">✏️ Edit Judul, Foto &amp; Video</button>
                            </td>
                          </tr>`;
                        })
                        .join('')
                  }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'belajar')}
          </div>
        `;
      } else {
        const q = state.filters.komentarSearch.trim().toLowerCase();
        const filtered = commentsList.filter((c) => {
          if (state.filters.komentarTopik !== 'Semua' && String(c.topicId) !== String(state.filters.komentarTopik)) return false;
          return !q || JSON.stringify(c).toLowerCase().includes(q);
        });
        const meta = paginate(filtered, 'komentar');
        belajarSubHtml = `
          <div class="card">
            <div class="table-toolbar">
              <div class="table-toolbar-left">
                <span class="tag tag-emerald">${commentsList.length} Total Komentar Masuk</span>
              </div>
              <div class="table-toolbar-right">
                <select id="flt-kom-topik" aria-label="Filter topik komentar" class="select" style="width:auto;max-width:250px;">
                  <option value="Semua">Semua Konten Praktikum</option>
                  ${topicsList.map((t) => `<option value="${escapeHtml(t.id)}" ${state.filters.komentarTopik === t.id ? 'selected' : ''}>${escapeHtml(t.judul)}</option>`).join('')}
                </select>
                <input id="flt-kom-search" type="search" aria-label="Cari komentar" class="input" style="width:220px;" placeholder="Cari nama / instansi / isi..." value="${escapeHtml(state.filters.komentarSearch)}" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>No</th><th>Waktu</th><th>Konten Dikomentari</th><th>Nama &amp; Pekerjaan</th><th>Instansi / Sekolah</th><th>Email &amp; No. HP</th><th>Isi Komentar</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${meta.pageItems.length === 0
                    ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Belum ada komentar pengunjung pada filter ini.</td></tr>`
                    : meta.pageItems
                        .map((c, i) => {
                          const tMeta = topicsList.find((t) => String(t.id) === String(c.topicId));
                          const topikLabel = (tMeta && tMeta.judul) || c.topicTitle || c.topicId;
                          return `<tr>
                            <td>${meta.startIdx + i + 1}</td>
                            <td style="white-space:nowrap;">${formatDateId(c.timestamp)}</td>
                            <td>
                              <strong>${escapeHtml(topikLabel)}</strong>
                              ${c.kategoriTitle ? `<br/><span class="tag tag-sky">${escapeHtml(c.kategoriTitle)}</span>` : ''}
                            </td>
                            <td>
                              <strong>${escapeHtml(c.nama || '-')}</strong><br/>
                              <span class="tag tag-gold">${escapeHtml(c.pekerjaan || '-')}</span>
                            </td>
                            <td>${escapeHtml(c.instansi || '-')}</td>
                            <td style="font-size:12px;color:var(--slate-700);">
                              <div>📧 ${escapeHtml(c.email || '-')}</div>
                              <div>📱 <code>${escapeHtml(c.noHp || '-')}</code></div>
                            </td>
                            <td style="max-width:280px;white-space:pre-line;">${escapeHtml(c.komentar || '')}</td>
                            <td style="white-space:nowrap;">
                              <button type="button" class="btn btn-danger btn-sm" data-del-komentar="${escapeHtml(c.id)}">🗑️ Hapus</button>
                            </td>
                          </tr>`;
                        })
                        .join('')
                  }
                </tbody>
              </table>
            </div>
            ${renderPaginationBar(meta, 'komentar')}
          </div>
        `;
      }

      bodyHtml = `
        <div class="tabs no-print">
          ${belajarTabs.map((bt) => `<button type="button" class="tab-btn ${state.tabBelajar === bt.id ? 'active' : ''}" data-belajar-tab="${bt.id}">${escapeHtml(bt.label)}</button>`).join('')}
        </div>
        ${belajarSubHtml}
      `;
    } else if (state.tab === 'pengaturan') {
      const cfg = api.state.data.pengaturan || {};
      const currentUrl = api.getConfiguredApiUrl();
      const cfgTabs = [
        { id: 'guru', label: '👩‍🏫 Identitas Guru' },
        { id: 'sekolah', label: '🏫 Identitas Sekolah' },
        { id: 'tema', label: '🎨 Logo & Tema' },
        { id: 'akun', label: '🔐 Akun & Koneksi' }
      ];

      let cfgBody = '';
      if (state.tabPengaturan === 'guru') {
        cfgBody = `
          <div class="card">
            <h3 style="margin:0 0 12px;">👩‍🏫 Identitas Guru Pengampu &amp; Portal</h3>
            <form id="form-cfg-guru" class="form-grid">
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-site">Nama Portal</label>
                  <input id="cfg-site" class="input" required value="${escapeHtml(cfg.siteName || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-subtitle">Subjudul Portal</label>
                  <input id="cfg-subtitle" class="input" required value="${escapeHtml(cfg.siteSubtitle || '')}" />
                </div>
              </div>
              <div class="form-row-3">
                <div class="field">
                  <label for="cfg-teacher">Nama Guru Pengampu</label>
                  <input id="cfg-teacher" class="input" required value="${escapeHtml(cfg.teacherName || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-teacher-title">Jabatan / Mapel</label>
                  <input id="cfg-teacher-title" class="input" value="${escapeHtml(cfg.teacherTitle || 'Guru PAI & Budi Pekerti')}" />
                </div>
                <div class="field">
                  <label for="cfg-teacher-nip">NIP / NUPTK</label>
                  <input id="cfg-teacher-nip" class="input" placeholder="Opsional..." value="${escapeHtml(cfg.teacherNip || '')}" />
                </div>
              </div>
              <div class="upload-box">
                <label for="cfg-teacher-file" style="display:block;font-weight:700;font-size:13px;margin-bottom:8px;">✂️ Upload &amp; Crop Foto Profil Guru (Rasio Potret 3:4)</label>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                  <div id="cfg-teacher-preview" style="width:66px;height:88px;border-radius:10px;border:1.5px solid var(--slate-300);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                    ${resolveImageUrl(cfg.teacherPhotoUrl) ? `<img src="${escapeHtml(resolveImageUrl(cfg.teacherPhotoUrl))}" alt="Foto Guru" style="width:100%;height:100%;object-fit:cover;" />` : '<small style="color:var(--slate-500);">3:4</small>'}
                  </div>
                  <div style="flex:1;min-width:220px;">
                    <input id="cfg-teacher-file" type="file" class="input" accept="image/*" />
                    <small style="display:block;margin-top:4px;color:var(--slate-600);">Pilih foto untuk dipotong manual rasio <strong>3:4</strong> dan dikompres tajam Base64 (&lt; 46.000 char).</small>
                  </div>
                </div>
                <input id="cfg-teacher-photo" aria-label="URL Foto Profil Guru" class="input" style="margin-top:8px;" placeholder="Data / URL foto guru..." value="${escapeHtml(cfg.teacherPhotoUrl || '')}" />
              </div>
              <div class="field">
                <label for="cfg-teacher-bio">Biografi / Moto Pembelajaran Guru</label>
                <textarea id="cfg-teacher-bio" class="textarea" rows="2">${escapeHtml(cfg.teacherBio || '')}</textarea>
              </div>
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-year">Tahun Ajaran Aktif</label>
                  <input id="cfg-year" class="input" required value="${escapeHtml(cfg.academicYear || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-elemen">Daftar Elemen / Kategori PAI (pisahkan koma)</label>
                  <input id="cfg-elemen" class="input" required value="${escapeHtml((cfg.elemenList || DEFAULT_ELEMEN_OPTIONS).join(', '))}" />
                </div>
              </div>
              <div>
                <button type="submit" id="btn-save-cfg-guru" class="btn btn-primary">💾 Simpan Identitas Guru</button>
              </div>
            </form>
          </div>

          ${(() => {
            const allRwt = typeof api.getGuruRiwayatList === 'function' ? api.getGuruRiwayatList() : [];
            const katFilter = state.filters.guruRiwayatKat || 'Semua';
            const shownRwt = katFilter === 'Semua'
              ? allRwt
              : allRwt.filter((r) => String(r.kategori || '') === katFilter);
            const katTagMap = {
              Mengajar: 'tag-emerald',
              Pendidikan: 'tag-sky',
              Penghargaan: 'tag-gold',
              Diklat: 'tag-violet'
            };
            return `
              <div class="card" style="margin-top:18px;" id="card-admin-guru-riwayat">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                  <div>
                    <h3 style="margin:0 0 4px;">📋 Tabel Riwayat Portofolio Guru</h3>
                    <small style="color:var(--slate-600);">Kelola <strong>Riwayat Mengajar, Pendidikan, Penghargaan, &amp; Diklat</strong> yang tampil di halaman publik <strong>Tentang Kami → Portofolio Guru</strong>.</small>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <select id="flt-guru-riwayat-kat" class="select" aria-label="Filter kategori riwayat guru" style="width:auto;">
                      <option value="Semua" ${katFilter === 'Semua' ? 'selected' : ''}>Semua Kategori (${allRwt.length})</option>
                      <option value="Mengajar" ${katFilter === 'Mengajar' ? 'selected' : ''}>🏫 Mengajar</option>
                      <option value="Pendidikan" ${katFilter === 'Pendidikan' ? 'selected' : ''}>🎓 Pendidikan</option>
                      <option value="Penghargaan" ${katFilter === 'Penghargaan' ? 'selected' : ''}>🏆 Penghargaan</option>
                      <option value="Diklat" ${katFilter === 'Diklat' ? 'selected' : ''}>📜 Diklat</option>
                    </select>
                    <button type="button" class="btn btn-primary btn-sm" id="btn-add-guru-riwayat">➕ Tambah Riwayat</button>
                  </div>
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="width:48px;">No</th>
                        <th style="width:58px;">Urut</th>
                        <th>Kategori</th>
                        <th>Periode / Tahun</th>
                        <th>Judul / Jabatan / Program</th>
                        <th>Instansi / Penyelenggara</th>
                        <th>Keterangan</th>
                        <th style="width:155px;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${shownRwt.length === 0
                        ? `<tr><td colspan="8" style="text-align:center;color:var(--slate-500);">Belum ada data riwayat pada kategori ini. Klik "➕ Tambah Riwayat" untuk mengisi.</td></tr>`
                        : shownRwt.map((r, rIdx) => `
                            <tr>
                              <td>${rIdx + 1}</td>
                              <td>${Number(r.urutan || rIdx + 1)}</td>
                              <td><span class="tag ${katTagMap[r.kategori] || 'tag-slate'}">${escapeHtml(r.kategori || 'Mengajar')}</span></td>
                              <td><strong>${escapeHtml(r.periode || '-')}</strong></td>
                              <td><strong>${escapeHtml(r.judul || '-')}</strong></td>
                              <td>${escapeHtml(r.instansi || '-')}</td>
                              <td style="font-size:12.8px;color:var(--slate-700);">${escapeHtml(r.keterangan || '-')}</td>
                              <td style="white-space:nowrap;">
                                <button type="button" class="btn btn-outline btn-sm" data-edit-riwayat="${escapeHtml(r.id)}">✏️ Edit</button>
                                <button type="button" class="btn btn-danger btn-sm" data-del-riwayat="${escapeHtml(r.id)}">🗑️ Hapus</button>
                              </td>
                            </tr>
                          `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          })()}
        `;
      } else if (state.tabPengaturan === 'sekolah') {
        cfgBody = `
          <div class="card">
            <h3 style="margin:0 0 6px;">🏫 Identitas Instansi, Sekolah, &amp; Kontak Layanan</h3>
            <p style="margin:0 0 14px;font-size:13.5px;color:var(--slate-600);">
              Data ini otomatis ditampilkan di <strong>Halaman Depan (Beranda)</strong> di bawah lencana Kurikulum Merdeka serta pada halaman publik <strong>Tentang Kami → Kontak Kami</strong>. Logo Instansi &amp; Logo Sekolah diunggah pada tab <strong>🎨 Logo &amp; Tema</strong>.
            </p>
            <form id="form-cfg-sekolah" class="form-grid">
              <div class="field">
                <label for="cfg-instansi-name">Nama Instansi / Naungan (Tampil di Beranda)</label>
                <input id="cfg-instansi-name" class="input" placeholder="Contoh: Pemerintah Provinsi Jambi / Kemenag Kab. Tebo" value="${escapeHtml(cfg.namaInstansi || '')}" />
                <span class="hint">Tampil tepat di atas Nama Sekolah di sebelah Logo Instansi &amp; Logo Sekolah pada halaman Beranda.</span>
              </div>
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-school">Nama Sekolah / Madrasah</label>
                  <input id="cfg-school" class="input" required value="${escapeHtml(cfg.schoolName || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-npsn">NPSN</label>
                  <input id="cfg-npsn" class="input" placeholder="Nomor Pokok Sekolah Nasional..." value="${escapeHtml(cfg.schoolNpsn || '')}" />
                </div>
              </div>
              <div class="field">
                <label for="cfg-address">Alamat Lengkap Sekolah</label>
                <textarea id="cfg-address" class="textarea" rows="2" placeholder="Jalan, Desa/Kelurahan, Kecamatan...">${escapeHtml(cfg.schoolAddress || '')}</textarea>
              </div>
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-city">Kabupaten / Kota &amp; Provinsi</label>
                  <input id="cfg-city" class="input" value="${escapeHtml(cfg.schoolCity || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-hours">Jam Layanan Konsultasi</label>
                  <input id="cfg-hours" class="input" value="${escapeHtml(cfg.schoolHours || 'Senin–Sabtu, 07.15–14.30 WIB')}" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-email">Email Resmi Sekolah / Guru PAI</label>
                  <input id="cfg-email" type="email" class="input" placeholder="nama@sekolah.sch.id" value="${escapeHtml(cfg.schoolEmail || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-phone">No. Telepon / WhatsApp</label>
                  <input id="cfg-phone" class="input" placeholder="0812xxxxxxxx" value="${escapeHtml(cfg.schoolPhone || '')}" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="field">
                  <label for="cfg-website">Website Resmi Sekolah</label>
                  <input id="cfg-website" class="input" placeholder="https://..." value="${escapeHtml(cfg.schoolWebsite || '')}" />
                </div>
                <div class="field">
                  <label for="cfg-maps">Tautan Google Maps Lokasi</label>
                  <input id="cfg-maps" class="input" placeholder="https://maps.google.com/..." value="${escapeHtml(cfg.schoolMapsUrl || '')}" />
                </div>
              </div>
              <div class="field">
                <label for="cfg-school-coords">Titik Koordinat Maps Sekolah (Latitude, Longitude)</label>
                <div class="coord-input-row">
                  <input id="cfg-school-coords" class="input" placeholder="Contoh: -1.396500, 102.371200" value="${escapeHtml(cfg.schoolCoords || '')}" />
                  <button type="button" class="btn btn-gold" id="btn-pick-coords">📍 Pilih Titik Koordinat</button>
                </div>
                <span class="hint">Disimpan ke Google Spreadsheet dan otomatis menampilkan Peta Lokasi Sekolah di atas footer portal.</span>
              </div>
              <div>
                <button type="submit" id="btn-save-cfg-sekolah" class="btn btn-primary">💾 Simpan Identitas Instansi &amp; Sekolah</button>
              </div>
            </form>
          </div>
        `;
      } else if (state.tabPengaturan === 'tema') {
        const c1 = /^#[0-9a-fA-F]{6}$/.test(String(cfg.themeColor1 || '')) ? cfg.themeColor1 : '#042f24';
        const c2 = /^#[0-9a-fA-F]{6}$/.test(String(cfg.themeColor2 || '')) ? cfg.themeColor2 : '#064e3b';
        const c3 = /^#[0-9a-fA-F]{6}$/.test(String(cfg.themeColor3 || '')) ? cfg.themeColor3 : '#0f766e';
        const btnPreset = String(cfg.btnGradPreset || 'zamrud-toska');
        const bc1 = /^#[0-9a-fA-F]{6}$/.test(String(cfg.btnColor1 || '')) ? cfg.btnColor1 : (btnPreset === 'zamrud-emas' ? '#065f46' : '#064e3b');
        const bc2 = /^#[0-9a-fA-F]{6}$/.test(String(cfg.btnColor2 || '')) ? cfg.btnColor2 : (btnPreset === 'zamrud-emas' ? '#d97706' : '#0d9488');
        const logoPreview = resolveImageUrl(cfg.siteLogoUrl);
        const instansiLogoPreview = resolveImageUrl(cfg.instansiLogoUrl);
        const schoolLogoPreview = resolveImageUrl(cfg.schoolLogoUrl);
        const bgPreview = resolveImageUrl(cfg.themeBgUrl);

        cfgBody = `
          <div class="card">
            <h3 style="margin:0 0 6px;">🎨 Pengaturan Logo (Crop 1:1 Transparan), Background, &amp; Warna Gradien 3 Warna</h3>
            <p style="margin:0 0 14px;font-size:13px;color:var(--slate-600);">
              Unggah logo berformat <strong>PNG transparan</strong> — cropper <strong>1:1</strong> menjaga transparansi latar belakang (250×250 px, Base64 &lt; 46.000 karakter aman untuk Google Sheets).
            </p>
            <form id="form-cfg-tema" class="form-grid">
              <div class="grid grid-2">
                <div class="upload-box">
                  <strong style="display:block;font-size:13.5px;margin-bottom:8px;">🖼️ Logo Utama Portal (Header 1:1 &amp; Favicon Tab)</strong>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div id="cfg-logo-preview" class="logo-preview-thumb" style="width:68px;height:68px;border-radius:14px;border:1.5px solid var(--slate-300);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;padding:4px;">
                      ${logoPreview ? `<img src="${escapeHtml(logoPreview)}" alt="Logo Portal" style="width:100%;height:100%;object-fit:contain;" />` : '<span style="font-size:24px;">🕌</span>'}
                    </div>
                    <div style="flex:1;">
                      <input id="cfg-logo-file" type="file" class="input" accept="image/*" />
                      <small style="color:var(--slate-600);display:block;margin-top:4px;">Crop <strong>1:1</strong> (250×250 px) — otomatis mengubah ikon pojok kiri atas header &amp; favicon tab browser.</small>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input id="cfg-logo-url" aria-label="URL Logo Portal" class="input" placeholder="URL / Data Logo Portal 1:1..." value="${escapeHtml(cfg.siteLogoUrl || '')}" />
                    <button type="button" class="btn btn-outline btn-sm" id="btn-reset-logo">Reset</button>
                  </div>
                </div>

                <div class="upload-box">
                  <strong style="display:block;font-size:13.5px;margin-bottom:8px;">🌄 Gambar Latar (Background Hero &amp; Banner)</strong>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div id="cfg-bg-preview" style="width:96px;height:68px;border-radius:10px;border:1.5px solid var(--slate-300);background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                      ${bgPreview ? `<img src="${escapeHtml(bgPreview)}" alt="Background" style="width:100%;height:100%;object-fit:cover;" />` : '<small style="color:var(--slate-500);">Polos</small>'}
                    </div>
                    <div style="flex:1;">
                      <input id="cfg-bg-file" type="file" class="input" accept="image/*" />
                      <small style="color:var(--slate-600);display:block;margin-top:4px;">Tampil transparan lembut di balik gradien tema.</small>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input id="cfg-bg-url" aria-label="URL Background" class="input" placeholder="URL Gambar Background..." value="${escapeHtml(cfg.themeBgUrl || '')}" />
                    <button type="button" class="btn btn-outline btn-sm" id="btn-reset-bg">Hapus</button>
                  </div>
                </div>

                <div class="upload-box">
                  <strong style="display:block;font-size:13.5px;margin-bottom:8px;">🏛️ Logo Instansi / Pemprov (Crop 1:1 Transparan)</strong>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div id="cfg-instansi-logo-preview" class="logo-preview-thumb" style="width:68px;height:68px;border-radius:14px;border:1.5px solid var(--slate-300);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;padding:4px;">
                      ${instansiLogoPreview ? `<img src="${escapeHtml(instansiLogoPreview)}" alt="Logo Instansi" style="width:100%;height:100%;object-fit:contain;" />` : '<span style="font-size:24px;">🏛️</span>'}
                    </div>
                    <div style="flex:1;">
                      <input id="cfg-instansi-logo-file" type="file" class="input" accept="image/*" />
                      <small style="color:var(--slate-600);display:block;margin-top:4px;">Tampil bergandengan di kiri Nama Instansi pada Beranda (250×250 px, transparan terjaga).</small>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input id="cfg-instansi-logo-url" aria-label="URL Logo Instansi" class="input" placeholder="Data Base64 / URL Logo Instansi 1:1..." value="${escapeHtml(cfg.instansiLogoUrl || '')}" />
                    <button type="button" class="btn btn-outline btn-sm" id="btn-reset-instansi-logo">Hapus</button>
                  </div>
                </div>

                <div class="upload-box">
                  <strong style="display:block;font-size:13.5px;margin-bottom:8px;">🏫 Logo Sekolah / Madrasah (Crop 1:1 Transparan)</strong>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div id="cfg-school-logo-preview" class="logo-preview-thumb" style="width:68px;height:68px;border-radius:14px;border:1.5px solid var(--slate-300);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;padding:4px;">
                      ${schoolLogoPreview ? `<img src="${escapeHtml(schoolLogoPreview)}" alt="Logo Sekolah" style="width:100%;height:100%;object-fit:contain;" />` : '<span style="font-size:24px;">🏫</span>'}
                    </div>
                    <div style="flex:1;">
                      <input id="cfg-school-logo-file" type="file" class="input" accept="image/*" />
                      <small style="color:var(--slate-600);display:block;margin-top:4px;">Tampil di samping Logo Instansi pada Beranda &amp; Kontak Kami (250×250 px, transparan terjaga).</small>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input id="cfg-school-logo-url" aria-label="URL Logo Sekolah" class="input" placeholder="Data Base64 / URL Logo Sekolah 1:1..." value="${escapeHtml(cfg.schoolLogoUrl || '')}" />
                    <button type="button" class="btn btn-outline btn-sm" id="btn-reset-school-logo">Hapus</button>
                  </div>
                </div>
              </div>

              <div class="callout">
                <strong style="display:block;margin-bottom:8px;">🌈 Pilihan 1 — Gradien Tema Portal (Banner, Header &amp; Footer)</strong>
                <div class="theme-swatch-row" style="margin-bottom:12px;">
                  <button type="button" class="theme-preset-btn" data-theme-preset="#042f24,#064e3b,#0f766e">
                    <span class="theme-preset-dot" style="background:linear-gradient(90deg,#042f24,#064e3b,#0f766e);"></span>Zamrud Kemenag
                  </button>
                  <button type="button" class="theme-preset-btn" data-theme-preset="#0c4a6e,#0369a1,#0d9488">
                    <span class="theme-preset-dot" style="background:linear-gradient(90deg,#0c4a6e,#0369a1,#0d9488);"></span>Biru Nusantara
                  </button>
                  <button type="button" class="theme-preset-btn" data-theme-preset="#1e1b4b,#4338ca,#0f766e">
                    <span class="theme-preset-dot" style="background:linear-gradient(90deg,#1e1b4b,#4338ca,#0f766e);"></span>Indigo Cendekia
                  </button>
                  <button type="button" class="theme-preset-btn" data-theme-preset="#451a03,#78350f,#065f46">
                    <span class="theme-preset-dot" style="background:linear-gradient(90deg,#451a03,#78350f,#065f46);"></span>Emas Hangat
                  </button>
                </div>

                <div class="form-row-3" style="margin-bottom:12px;">
                  <div class="field">
                    <label for="cfg-color-1">Warna 1 (Gelap / Utama)</label>
                    <input id="cfg-color-1" type="color" class="input" style="height:44px;padding:4px;" value="${escapeHtml(c1)}" />
                  </div>
                  <div class="field">
                    <label for="cfg-color-2">Warna 2 (Tengah)</label>
                    <input id="cfg-color-2" type="color" class="input" style="height:44px;padding:4px;" value="${escapeHtml(c2)}" />
                  </div>
                  <div class="field">
                    <label for="cfg-color-3">Warna 3 (Cerahan / Sorotan)</label>
                    <input id="cfg-color-3" type="color" class="input" style="height:44px;padding:4px;" value="${escapeHtml(c3)}" />
                  </div>
                </div>

                <div id="cfg-grad-preview" class="gradient-preview-bar" style="background:linear-gradient(135deg, ${escapeHtml(c1)} 0%, ${escapeHtml(c2)} 52%, ${escapeHtml(c3)} 100%);">
                  Pratinjau Gradien Banner &amp; Footer Portal
                </div>
              </div>

              <div class="callout callout-emerald">
                <strong style="display:block;margin-bottom:8px;">✨ Pilihan 2 — Gradien Tombol Aksi Utama (2 Pilihan Gaya)</strong>
                <input type="hidden" id="cfg-btn-preset" value="${escapeHtml(btnPreset)}" />
                <div class="grad-choice-grid">
                  <button type="button" class="grad-choice-card ${btnPreset !== 'zamrud-emas' ? 'active' : ''}" data-btn-grad-choice="zamrud-toska" data-bc1="#064e3b" data-bc2="#0d9488">
                    <span class="grad-choice-preview" style="background:linear-gradient(135deg,#064e3b,#0d9488);"></span>
                    <div>
                      <strong style="display:block;font-size:13.5px;">Pilihan 1: Zamrud → Toska</strong>
                      <small style="color:var(--slate-600);">Gradien hijau zamrud ke toska cerah (Klasik)</small>
                    </div>
                  </button>
                  <button type="button" class="grad-choice-card ${btnPreset === 'zamrud-emas' ? 'active' : ''}" data-btn-grad-choice="zamrud-emas" data-bc1="#065f46" data-bc2="#d97706">
                    <span class="grad-choice-preview" style="background:linear-gradient(135deg,#065f46,#d97706);"></span>
                    <div>
                      <strong style="display:block;font-size:13.5px;">Pilihan 2: Zamrud → Emas</strong>
                      <small style="color:var(--slate-600);">Gradien hijau zamrud berpadu aksen emas hangat</small>
                    </div>
                  </button>
                </div>

                <div class="form-row-2" style="margin-bottom:12px;">
                  <div class="field">
                    <label for="cfg-btn-color-1">Warna Awal Tombol</label>
                    <input id="cfg-btn-color-1" type="color" class="input" style="height:42px;padding:4px;" value="${escapeHtml(bc1)}" />
                  </div>
                  <div class="field">
                    <label for="cfg-btn-color-2">Warna Akhir Gradien Tombol</label>
                    <input id="cfg-btn-color-2" type="color" class="input" style="height:42px;padding:4px;" value="${escapeHtml(bc2)}" />
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                  <span id="cfg-btn-grad-preview" class="btn" style="background:linear-gradient(135deg, ${escapeHtml(bc1)} 0%, ${escapeHtml(bc2)} 100%);color:#fff;pointer-events:none;">
                    Contoh Tampilan Tombol Gradien
                  </span>
                  <small style="color:var(--slate-600);">Berlaku untuk seluruh tombol utama &amp; menu aktif portal.</small>
                </div>
              </div>

              <div>
                <button type="submit" id="btn-save-cfg-tema" class="btn btn-gold">💾 Simpan Logo &amp; Tema Portal</button>
              </div>
            </form>
          </div>
        `;
      } else {
        cfgBody = `
          <div class="grid grid-2">
            <div class="card">
              <h3 style="margin:0 0 10px;">🔗 Koneksi &amp; Setup Database Otomatis</h3>
              <p style="margin:0 0 14px;font-size:13.5px;color:var(--slate-600);">
                Tempel URL Web App Google Apps Script (<code>.../exec</code>). Script <code>Code.gs</code> otomatis membuat seluruh 15 sheet, folder Drive di folder induk Spreadsheet, dan data awal.
              </p>
              <form id="form-gas-url" class="form-grid">
                <div class="field">
                  <label for="gas-url-inp">URL Web App Google Apps Script</label>
                  <input id="gas-url-inp" type="url" class="input" placeholder="https://script.google.com/macros/s/.../exec" value="${escapeHtml(currentUrl)}" />
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="submit" id="btn-save-cfg-gas" class="btn btn-primary">🔄 Simpan &amp; Sinkronisasi</button>
                  <button type="button" class="btn btn-outline" id="btn-test-gas">🔍 Tes Koneksi Live</button>
                  <button type="button" class="btn btn-gold" id="btn-remote-setup">🛠️ Setup / Cek Struktur Sheets</button>
                  <button type="button" class="btn btn-outline" id="btn-clear-gas">Putuskan (Mode Demo)</button>
                  <button type="button" class="btn btn-danger" id="btn-reset-demo">Reset Data Demo</button>
                </div>
              </form>
            </div>

            <div class="card">
              <h3 style="margin:0 0 10px;">🔐 Akun Login Panel Guru &amp; Tautan Kemenag</h3>
              <form id="form-cfg-akun" class="form-grid">
                <div class="form-row-2">
                  <div class="field">
                    <label for="cfg-admin-user">Username Admin Baru</label>
                    <input id="cfg-admin-user" class="input" required value="${escapeHtml(cfg.adminUsername || api.state.adminCreds.username || 'admin')}" />
                  </div>
                  <div class="field">
                    <label for="cfg-admin-pass">Password Admin Baru</label>
                    ${renderPasswordInput({
          id: 'cfg-admin-pass',
          required: true,
          value: cfg.adminPassword || api.state.adminCreds.password || ''
        })}
                  </div>
                </div>
                <div class="form-row-2">
                  <div class="field">
                    <label for="cfg-smartpai">Link Smart PAI Kemenag</label>
                    <input id="cfg-smartpai" class="input" value="${escapeHtml(cfg.smartPaiUrl || 'https://smartpai.kemenag.go.id')}" />
                  </div>
                  <div class="field">
                    <label for="cfg-kemenag">Link Ditjen Pendis Kemenag</label>
                    <input id="cfg-kemenag" class="input" value="${escapeHtml(cfg.kemenagUrl || 'https://pendis.kemenag.go.id')}" />
                  </div>
                </div>
                <button type="submit" id="btn-save-cfg-akun" class="btn btn-gold">💾 Simpan Akun &amp; Tautan</button>
              </form>
            </div>
          </div>
        `;
      }

      bodyHtml = `
        <div class="tabs no-print">
          ${cfgTabs.map((ct) => `<button type="button" class="tab-btn ${state.tabPengaturan === ct.id ? 'active' : ''}" data-cfg-tab="${ct.id}">${escapeHtml(ct.label)}</button>`).join('')}
        </div>
        ${cfgBody}
      `;
    }

    const admSessionRem = typeof api.getSessionRemainingText === 'function' ? api.getSessionRemainingText('admin') : '';
    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Dashboard Pengelolaan Guru PAI</span>
            <h1>Panel Guru &amp; Manajemen Kelas</h1>
            <p>Masuk sebagai: <strong>${escapeHtml(api.state.adminCreds.username || 'admin')}</strong> • Status: <strong>${api.state.isLive ? 'Terhubung Live Google Sheets' : 'Mode Demo Lokal (Browser)'}</strong>${admSessionRem ? ` • Sesi aktif ${escapeHtml(admSessionRem)}` : ''}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" class="no-print">
            <button type="button" class="btn btn-ghost-light btn-sm" id="btn-admin-refresh">🔄 Segarkan Data</button>
            <button type="button" class="btn btn-gold btn-sm" id="btn-admin-logout">Keluar Panel</button>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="admin-layout">
          <aside class="admin-sidebar no-print" aria-label="Menu Sidebar Panel Guru">
            ${sidebarGroups
        .map(
          (grp) => `
                  <div class="admin-sidebar-label">${escapeHtml(grp.label)}</div>
                  ${grp.items
              .map(
                (it) => `<button type="button" class="admin-side-btn ${state.tab === it.id ? 'active' : ''}" data-admin-tab="${it.id}">
                        <span>${escapeHtml(it.label)}</span>
                        ${renderRedBadge(it.badge, `${it.badge} tugas/jawaban belum dinilai`)}
                      </button>`
              )
              .join('')}
                `
        )
        .join('')}
          </aside>

          <div class="admin-main">
            ${bodyHtml}
          </div>
        </div>
      </div>
    `;

    bindDashboardEvents();
  }

  function bindDashboardEvents() {
    bindPaginationEvents();

    container.querySelectorAll('[data-admin-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        const nextTab = b.getAttribute('data-admin-tab');
        if (nextTab === 'soal') state.selectedSoalJenjang = null;
        state.tab = nextTab;
        renderDashboard();
      });
    });

    const dashGoJadwal = document.getElementById('btn-dash-go-jadwal');
    if (dashGoJadwal) {
      dashGoJadwal.addEventListener('click', () => {
        state.tab = 'jadwal';
        renderDashboard();
      });
    }

    container.querySelectorAll('[data-jump-siswa-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tab = 'siswaKelas';
        state.tabSiswa = b.getAttribute('data-jump-siswa-tab');
        renderDashboard();
      });
    });

    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const cfg = api.state.data.pengaturan || {};
        const performLogout = () => {
          if (typeof api.logoutAdmin === 'function') api.logoutAdmin();
          else {
            api.state.adminUnlocked = false;
            api.state.adminCreds = { username: '', password: '' };
          }
          if (window.BTD_UI && typeof window.BTD_UI.syncChromeMetadata === 'function') {
            window.BTD_UI.syncChromeMetadata();
          }
          showToast('Anda telah keluar dari Panel Guru.', 'warning');
          renderLogin();
        };
        if (typeof confirmLogoutAction === 'function') {
          confirmLogoutAction({
            roleLabel: 'Akun Guru / Admin',
            accountName: `${cfg.teacherName || 'Guru PAI-BP'} (${api.state.adminCreds.username || 'admin'})`,
            onConfirmLogout: performLogout
          });
        } else {
          performLogout();
        }
      });
    }

    const refreshBtn = document.getElementById('btn-admin-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="spinner-inline"></span> Menyegarkan...';
        try {
          await api.refreshAdminDashboard();
          showToast('Data terbaru disinkronkan.');
          renderDashboard();
        } catch (err) {
          showToast('Gagal menyegarkan data: ' + err.message, 'error');
          refreshBtn.disabled = false;
          refreshBtn.textContent = '🔄 Segarkan Data';
        }
      });
    }

    /* ---- Kelola Siswa & Kelas ---- */
    container.querySelectorAll('[data-siswa-subtab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tabSiswa = b.getAttribute('data-siswa-subtab');
        renderDashboard();
      });
    });

    bindSearchInput('flt-kelas-search', 'kelasSearch', 'kelas');
    const addKelasBtn = document.getElementById('btn-add-kelas');
    if (addKelasBtn) addKelasBtn.addEventListener('click', () => openKelasModal(null));

    container.querySelectorAll('[data-view-siswa-kelas]').forEach((b) => {
      b.addEventListener('click', () => {
        state.filters.siswaKelas = b.getAttribute('data-view-siswa-kelas');
        state.tables.siswa.page = 1;
        state.tabSiswa = 'siswa';
        renderDashboard();
      });
    });

    container.querySelectorAll('[data-jump-ungraded-kelas]').forEach((b) => {
      b.addEventListener('click', () => {
        const klsName = b.getAttribute('data-jump-ungraded-kelas');
        if (klsName) jumpToUngradedRekap({ sub: 'auto', kelasFilter: klsName });
      });
    });

    container.querySelectorAll('[data-jump-ungraded-materi]').forEach((b) => {
      b.addEventListener('click', () => {
        const matId = b.getAttribute('data-jump-ungraded-materi');
        const matObj = (api.state.data.materi || []).find((m) => String(m.id) === String(matId));
        if (matObj) jumpToUngradedRekap({ sub: 'auto', kelasFilter: 'Semua', materiObj: matObj });
      });
    });

    container.querySelectorAll('[data-edit-kelas]').forEach((b) => {
      b.addEventListener('click', () => {
        const k = (api.state.data.kelas || []).find((x) => x.id === b.getAttribute('data-edit-kelas'));
        if (k) openKelasModal(k);
      });
    });

    const bindConfirmDelete = (attrName, buildCfg) => {
      container.querySelectorAll(`[${attrName}]`).forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.getAttribute(attrName);
          const cfg = buildCfg(id) || {};
          openConfirmModal({
            title: cfg.title || 'Konfirmasi Hapus Data',
            message: cfg.message || 'Apakah Anda yakin akan menghapus data ini?',
            itemLabel: cfg.itemLabel || '',
            confirmText: 'YA, Hapus',
            cancelText: 'TIDAK',
            loadingText: cfg.loadingText || 'Sedang menghapus data, mohon tunggu...',
            onConfirm: async () => {
              await cfg.run(id);
              renderDashboard();
            },
            successMessage: cfg.successMessage || 'Data berhasil dihapus.'
          });
        });
      });
    };

    bindConfirmDelete('data-del-kelas', (id) => {
      const k = (api.state.data.kelas || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus kelas ini?',
        itemLabel: k ? `Kelas: ${k.namaKelas || k.id} (${k.jenjang || '-'})` : id,
        loadingText: 'Sedang menghapus data kelas...',
        successMessage: 'Data kelas berhasil dihapus.',
        run: (delId) => api.deleteKelas(delId)
      };
    });

    bindSelectFilter('flt-siswa-kelas', 'siswaKelas', 'siswa');
    bindSearchInput('flt-siswa-search', 'siswaSearch', 'siswa');

    const addSiswaBtn = document.getElementById('btn-add-siswa');
    if (addSiswaBtn) addSiswaBtn.addEventListener('click', () => openSiswaModal(null));

    const openImportBtn = document.getElementById('btn-open-import-siswa');
    if (openImportBtn) openImportBtn.addEventListener('click', openImportSiswaModal);

    function getSiswaExportSpec() {
      const q = state.filters.siswaSearch.trim().toLowerCase();
      const list = (api.state.data.siswa || []).filter((s) => {
        if (state.filters.siswaKelas !== 'Semua' && s.kelas !== state.filters.siswaKelas) return false;
        if (q) {
          return String(s.nama || '').toLowerCase().includes(q) || String(s.nisn || s.nis || s.id || '').toLowerCase().includes(q);
        }
        return true;
      });
      const klsLabel = state.filters.siswaKelas === 'Semua' ? 'Semua Kelas' : state.filters.siswaKelas;
      const cfg = api.state.data.pengaturan || {};
      return {
        list,
        klsLabel,
        cfg,
        fileName: `Data_Siswa_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Data Siswa',
        title: 'DAFTAR PESERTA DIDIK',
        subtitle: `Kelas: ${klsLabel}  |  Tahun Ajaran ${cfg.academicYear || '2026/2027'}  |  Dicetak: ${formatDateId(todayIso)}`,
        headers: ['No', 'NISN', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Status'],
        rows: list.map((s, idx) => [idx + 1, String(s.nisn || s.nis || s.id || '-'), s.nama || '', s.kelas || '-', s.jenisKelamin || '-', s.status || 'Aktif']),
        centerCols: [0, 1, 3, 4, 5],
        textCols: [1],
        summaryText: `Total Peserta Didik: ${list.length} Siswa`,
        orientation: 'portrait'
      };
    }

    const expSiswaBtn = document.getElementById('btn-export-siswa');
    if (expSiswaBtn) {
      expSiswaBtn.addEventListener('click', async () => {
        const spec = getSiswaExportSpec();
        if (!spec.list.length) {
          showToast('Tidak ada data siswa untuk diekspor.', 'warning');
          return;
        }
        try {
          expSiswaBtn.disabled = true;
          await api.exportTableExcel(spec);
          showToast('File Excel data siswa (.xlsx) berhasil diunduh.');
        } catch (err) {
          showToast('Gagal mengekspor Excel siswa: ' + err.message, 'error');
        } finally {
          expSiswaBtn.disabled = false;
        }
      });
    }

    const expSiswaPdfBtn = document.getElementById('btn-export-siswa-pdf');
    if (expSiswaPdfBtn) {
      expSiswaPdfBtn.addEventListener('click', () => {
        const spec = getSiswaExportSpec();
        if (!spec.list.length) {
          showToast('Tidak ada data siswa untuk dipratinjau.', 'warning');
          return;
        }
        const docHtml = buildKopSuratPdfHtml({
          fileNameTitle: spec.fileName.replace(/\.xlsx$/i, ''),
          docTitle: spec.title,
          docSubtitle: spec.subtitle,
          metaPairs: [
            { label: 'Filter Kelas', value: spec.klsLabel },
            { label: 'Tahun Ajaran', value: spec.cfg.academicYear || '2026/2027' },
            { label: 'Total Siswa', value: `${spec.list.length} Peserta Didik` },
            { label: 'Dicetak Pada', value: formatDateId(todayIso) }
          ],
          tableHeaders: spec.headers,
          tableRows: spec.rows,
          centerCols: spec.centerCols,
          summaryText: spec.summaryText,
          signaturePlaceDate: `${spec.cfg.schoolCity || 'Tebo'}, ${formatDateId(todayIso)}`,
          orientation: 'portrait',
          cfg: spec.cfg
        });
        openPdfPreviewModal({
          modalTitle: `Pratinjau Dokumen PDF — Data Siswa (${spec.klsLabel})`,
          docHtml
        });
      });
    }

    container.querySelectorAll('[data-edit-siswa]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-edit-siswa');
        const s = (api.state.data.siswa || []).find((x) => x.id === id || x.nisn === id);
        if (s) openSiswaModal(s);
      });
    });

    bindConfirmDelete('data-del-siswa', (id) => {
      const s = (api.state.data.siswa || []).find((x) => x.id === id || x.nisn === id);
      return {
        message: 'Apakah Anda yakin akan menghapus data siswa ini?',
        itemLabel: s ? `${s.nama} — NISN: ${s.nisn || s.nis || s.id} (${s.kelas})` : id,
        loadingText: 'Sedang menghapus data siswa...',
        successMessage: 'Data siswa berhasil dihapus.',
        run: (delId) => api.deleteSiswa(delId)
      };
    });

    /* ---- Jadwal Pembelajaran ---- */
    bindSelectFilter('flt-jdw-bulan', 'jadwalBulan', 'jadwal');
    bindSelectFilter('flt-jdw-semester', 'jadwalSemester', 'jadwal');
    bindSelectFilter('flt-jdw-kelas', 'jadwalKelas', 'jadwal');
    bindSelectFilter('flt-jdw-jenis', 'jadwalJenis', 'jadwal');
    bindSelectFilter('flt-jdw-status', 'jadwalStatus', 'jadwal');
    bindSearchInput('flt-jdw-search', 'jadwalSearch', 'jadwal');

    const addJdwBtn = document.getElementById('btn-add-jadwal');
    if (addJdwBtn) addJdwBtn.addEventListener('click', () => openJadwalModal(null));

    function buildJadwalAbsenExportSpec() {
      const filtered = getFilteredJadwalRows();
      const cfg = api.state.data.pengaturan || {};
      const klsLabel = state.filters.jadwalKelas === 'Semua' ? 'Semua Kelas' : state.filters.jadwalKelas;
      const smtLabel =
        state.filters.jadwalSemester === 'Semua'
          ? 'Semua Semester'
          : state.filters.jadwalSemester === '2'
            ? 'Semester 2 (Genap)'
            : 'Semester 1 (Ganjil)';
      const blnLabel = state.filters.jadwalBulan === 'Semua' ? 'Semua Bulan' : `Bulan ${state.filters.jadwalBulan}`;

      let sumH = 0;
      let sumI = 0;
      let sumS = 0;
      let sumA = 0;
      let sumBA = 0;
      const rows = filtered.map((j, idx) => {
        const sum = api.getScheduleAttendanceSummary(j);
        sumH += sum.counts.Hadir;
        sumI += sum.counts.Izin;
        sumS += sum.counts.Sakit;
        sumA += sum.counts.Alpa;
        sumBA += sum.counts['Belum Absen'] || 0;
        const jSmt = String(j.semester || (Number(String(j.tanggal || '').slice(5, 7)) >= 1 && Number(String(j.tanggal || '').slice(5, 7)) <= 6 ? '2' : '1'));
        return [
          idx + 1,
          formatDateId(j.tanggal),
          j.jamKe || '-',
          j.kelas || '-',
          `Smt ${jSmt}`,
          j.materiJudul || '-',
          j.jenis || '-',
          j.status === 'Terlaksana' ? 'Terlaksana' : 'Berlangsung',
          sum.counts.Hadir,
          sum.counts.Izin,
          sum.counts.Sakit,
          sum.counts.Alpa,
          sum.counts['Belum Absen'] || 0
        ];
      });

      return {
        fileName: `Rekap_Jadwal_Presensi_${klsLabel.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Jadwal & Presensi',
        title: 'REKAP JADWAL MENGAJAR & PRESENSI PESERTA DIDIK',
        subtitle: `Filter: ${klsLabel}  |  ${smtLabel}  |  ${blnLabel}  |  TA ${cfg.academicYear || '2026/2027'}`,
        headers: ['No', 'Tanggal', 'Jam', 'Kelas', 'Smt', 'Materi Pembelajaran', 'Mode', 'Status', 'H', 'I', 'S', 'A', 'Belum Absen'],
        rows,
        centerCols: [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12],
        textCols: [],
        summaryText: `Total Pertemuan: ${rows.length}   |   Total Hadir: ${sumH}   |   Izin: ${sumI}   |   Sakit: ${sumS}   |   Alpa: ${sumA}   |   Belum Absen: ${sumBA}`,
        orientation: 'landscape',
        metaPairs: [
          { label: 'Filter Kelas', value: klsLabel },
          { label: 'Semester / Bulan', value: `${smtLabel} (${blnLabel})` },
          { label: 'Mode / Status', value: `${state.filters.jadwalJenis} / ${state.filters.jadwalStatus}` },
          { label: 'Dicetak Pada', value: formatDateId(todayIso) }
        ]
      };
    }

    const jdwExcelBtn = document.getElementById('btn-jadwal-excel');
    if (jdwExcelBtn) {
      jdwExcelBtn.addEventListener('click', async () => {
        const spec = buildJadwalAbsenExportSpec();
        if (!spec.rows.length) {
          showToast('Belum ada data jadwal/presensi pada filter ini untuk diekspor.', 'warning');
          return;
        }
        try {
          jdwExcelBtn.disabled = true;
          await api.exportTableExcel(spec);
          showToast('File Excel rekap presensi (.xlsx) berhasil diunduh.');
        } catch (err) {
          showToast('Gagal mengekspor Excel presensi: ' + err.message, 'error');
        } finally {
          jdwExcelBtn.disabled = false;
        }
      });
    }

    const jdwPdfBtn = document.getElementById('btn-jadwal-pdf');
    if (jdwPdfBtn) {
      jdwPdfBtn.addEventListener('click', () => {
        const spec = buildJadwalAbsenExportSpec();
        if (!spec.rows.length) {
          showToast('Belum ada data jadwal/presensi pada filter ini untuk dipratinjau.', 'warning');
          return;
        }
        const cfg = api.state.data.pengaturan || {};
        const docHtml = buildKopSuratPdfHtml({
          fileNameTitle: spec.fileName.replace(/\.xlsx$/i, ''),
          docTitle: spec.title,
          docSubtitle: spec.subtitle,
          metaPairs: spec.metaPairs,
          tableHeaders: spec.headers,
          tableRows: spec.rows,
          centerCols: spec.centerCols,
          summaryText: spec.summaryText,
          signaturePlaceDate: `${cfg.schoolCity || 'Tebo'}, ${formatDateId(todayIso)}`,
          orientation: 'landscape',
          cfg
        });
        openPdfPreviewModal({
          modalTitle: 'Pratinjau Dokumen PDF — Rekap Jadwal & Presensi',
          docHtml
        });
      });
    }

    container.querySelectorAll('[data-modal-absen]').forEach((b) => {
      b.addEventListener('click', () => {
        const j = (api.state.data.jadwal || []).find((x) => x.id === b.getAttribute('data-modal-absen'));
        if (j) openAbsensiModal(j);
      });
    });

    container.querySelectorAll('[data-edit-jadwal]').forEach((b) => {
      b.addEventListener('click', () => {
        const j = (api.state.data.jadwal || []).find((x) => x.id === b.getAttribute('data-edit-jadwal'));
        if (j) openJadwalModal(j);
      });
    });

    bindConfirmDelete('data-del-jadwal', (id) => {
      const j = (api.state.data.jadwal || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus jadwal pembelajaran ini?',
        itemLabel: j ? `${j.kelas || '-'} • ${j.materiJudul || j.tanggal || id}` : id,
        loadingText: 'Sedang menghapus jadwal pembelajaran...',
        successMessage: 'Jadwal pembelajaran berhasil dihapus.',
        run: (delId) => api.deleteJadwal(delId)
      };
    });

    /* ---- Banner & Galeri ---- */
    container.querySelectorAll('[data-bnr-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tabBanner = b.getAttribute('data-bnr-tab');
        renderDashboard();
      });
    });
    bindSearchInput('flt-bnr-search', 'bannerSearch', 'banner');
    const addBnrBtn = document.getElementById('btn-add-banner');
    if (addBnrBtn) addBnrBtn.addEventListener('click', () => openBannerModal(null));

    container.querySelectorAll('[data-edit-banner]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = (api.state.data.banners || []).find((x) => x.id === b.getAttribute('data-edit-banner'));
        if (item) openBannerModal(item);
      });
    });
    bindConfirmDelete('data-del-banner', (id) => {
      const bItem = (api.state.data.banners || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus slide banner ini?',
        itemLabel: bItem ? `Slide Banner: ${bItem.judul || bItem.id}` : id,
        loadingText: 'Sedang menghapus slide banner...',
        successMessage: 'Slide banner berhasil dihapus.',
        run: (delId) => api.deleteBanner(delId)
      };
    });

    bindSelectFilter('flt-gal-kelas', 'galeriKelas', 'galeri');
    bindSearchInput('flt-gal-search', 'galeriSearch', 'galeri');
    const addGalBtn = document.getElementById('btn-add-galeri');
    if (addGalBtn) addGalBtn.addEventListener('click', () => openGaleriModal(null));

    container.querySelectorAll('[data-edit-galeri]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = (api.state.data.galeri || []).find((x) => x.id === b.getAttribute('data-edit-galeri'));
        if (item) openGaleriModal(item);
      });
    });
    bindConfirmDelete('data-del-galeri', (id) => {
      const gItem = (api.state.data.galeri || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus item galeri ini?',
        itemLabel: gItem ? `Galeri: ${gItem.judul || gItem.id}` : id,
        loadingText: 'Sedang menghapus item galeri...',
        successMessage: 'Item galeri berhasil dihapus.',
        run: (delId) => api.deleteGaleri(delId)
      };
    });

    /* ---- Materi & Tajwid ---- */
    container.querySelectorAll('[data-mat-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tabMateri = b.getAttribute('data-mat-tab');
        renderDashboard();
      });
    });
    const matJenjangEl = document.getElementById('flt-mat-jenjang');
    if (matJenjangEl) {
      matJenjangEl.addEventListener('change', () => {
        state.filters.materiJenjang = matJenjangEl.value;
        state.filters.materiBab = 'Semua';
        state.tables.materi.page = 1;
        renderDashboard();
      });
    }
    const matSmtEl = document.getElementById('flt-mat-semester');
    if (matSmtEl) {
      matSmtEl.addEventListener('change', () => {
        state.filters.materiSemester = matSmtEl.value;
        state.filters.materiBab = 'Semua';
        state.tables.materi.page = 1;
        renderDashboard();
      });
    }
    bindSelectFilter('flt-mat-bab', 'materiBab', 'materi');
    bindSearchInput('flt-mat-search', 'materiSearch', 'materi');
    const addMatBtn = document.getElementById('btn-add-materi');
    if (addMatBtn) addMatBtn.addEventListener('click', () => openMateriModal(null));

    container.querySelectorAll('[data-edit-materi]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = (api.state.data.materi || []).find((x) => x.id === b.getAttribute('data-edit-materi'));
        if (item) openMateriModal(item);
      });
    });
    bindConfirmDelete('data-del-materi', (id) => {
      const mItem = (api.state.data.materi || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus bab/materi PAI ini?',
        itemLabel: mItem ? `Kelas ${mItem.jenjang || '-'} Bab ${mItem.bab || '-'}: ${mItem.judul || mItem.id}` : id,
        loadingText: 'Sedang menghapus materi PAI...',
        successMessage: 'Materi PAI berhasil dihapus.',
        run: (delId) => api.deleteMateri(delId)
      };
    });

    bindSelectFilter('flt-tjw-mat', 'tajwidMateriId', 'tajwid');
    bindSearchInput('flt-tjw-search', 'tajwidSearch', 'tajwid');
    const addTjwBtn = document.getElementById('btn-add-tajwid');
    if (addTjwBtn) addTjwBtn.addEventListener('click', () => openTajwidModal(null));

    container.querySelectorAll('[data-edit-tajwid]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = (api.state.data.tajwid || []).find((x) => x.id === b.getAttribute('data-edit-tajwid'));
        if (item) openTajwidModal(item);
      });
    });
    bindConfirmDelete('data-del-tajwid', (id) => {
      const tItem = (api.state.data.tajwid || []).find((x) => x.id === id);
      return {
        message: 'Apakah Anda yakin akan menghapus kartu bedah tajwid ini?',
        itemLabel: tItem ? `Hukum Bacaan: ${tItem.hukumBacaan || tItem.transliterasi || tItem.id}` : id,
        loadingText: 'Sedang menghapus kartu tajwid...',
        successMessage: 'Kartu tajwid berhasil dihapus.',
        run: (delId) => api.deleteTajwid(delId)
      };
    });

    /* ---- Bank Soal ---- */
    const soalGoKelasBtn = document.getElementById('btn-soal-go-kelas');
    if (soalGoKelasBtn) {
      soalGoKelasBtn.addEventListener('click', () => {
        state.tab = 'siswaKelas';
        state.tabSiswa = 'kelas';
        renderDashboard();
      });
    }

    container.querySelectorAll('[data-pick-soal-jenjang]').forEach((el) => {
      const pick = () => {
        state.selectedSoalJenjang = el.getAttribute('data-pick-soal-jenjang');
        state.filters.soalKelas = 'Semua';
        state.filters.soalSemester = 'Semua';
        state.filters.soalBab = 'Semua';
        state.filters.soalSearch = '';
        state.tables.soal.page = 1;
        renderDashboard();
      };
      el.addEventListener('click', (e) => {
        if (el.tagName !== 'BUTTON' && e.target && typeof e.target.closest === 'function' && e.target.closest('button[data-pick-soal-jenjang]')) {
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

    const soalBackBtn = document.getElementById('btn-soal-back-kelas');
    if (soalBackBtn) {
      soalBackBtn.addEventListener('click', () => {
        state.selectedSoalJenjang = null;
        state.filters.soalKelas = 'Semua';
        state.filters.soalSemester = 'Semua';
        state.filters.soalBab = 'Semua';
        state.filters.soalSearch = '';
        state.tables.soal.page = 1;
        renderDashboard();
      });
    }

    bindSelectFilter('flt-soal-kelas', 'soalKelas', 'soal');
    bindSelectFilter('flt-soal-semester', 'soalSemester', 'soal');
    bindSelectFilter('flt-soal-bab', 'soalBab', 'soal');
    bindSearchInput('flt-soal-search', 'soalSearch', 'soal');
    const addSoalBtn = document.getElementById('btn-add-soal');
    if (addSoalBtn) addSoalBtn.addEventListener('click', () => openSoalModal(null, state.selectedSoalJenjang));

    const openImportSoalBtn = document.getElementById('btn-open-import-soal');
    if (openImportSoalBtn) openImportSoalBtn.addEventListener('click', () => openImportSoalModal(state.selectedSoalJenjang));

    container.querySelectorAll('[data-edit-soal]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = (api.state.data.bankSoal || []).find((x) => x.id === b.getAttribute('data-edit-soal'));
        if (item) openSoalModal(item, state.selectedSoalJenjang || resolveSoalJenjang(item));
      });
    });
    bindConfirmDelete('data-del-soal', (id) => {
      const qItem = (api.state.data.bankSoal || []).find((x) => x.id === id);
      const qPreview = qItem && qItem.pertanyaan ? String(qItem.pertanyaan).slice(0, 70) : id;
      return {
        message: 'Apakah Anda yakin akan menghapus soal evaluasi ini?',
        itemLabel: qItem ? `${qItem.kelas || 'Kelas ' + (qItem.jenjang || '-')} • Bab ${qItem.bab || '-'} • ${qPreview}` : id,
        loadingText: 'Sedang menghapus soal evaluasi...',
        successMessage: 'Soal evaluasi berhasil dihapus.',
        run: (delId) => api.deleteSoal(delId)
      };
    });

    /* ---- Rekap ---- */
    container.querySelectorAll('[data-rekap-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        state.rekapSub = b.getAttribute('data-rekap-sub');
        state.tables.rekap.page = 1;
        renderDashboard();
      });
    });
    bindSelectFilter('flt-rek-kelas', 'rekapKelas', 'rekap');
    bindSearchInput('flt-rek-search', 'rekapSearch', 'rekap');

    container.querySelectorAll('[data-edit-evaluasi]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-edit-evaluasi');
        const row = (api.state.data.evaluasi || []).find((e) => String(e.id) === String(id));
        if (row) openEvaluasiEditModal(row);
      });
    });

    container.querySelectorAll('[data-grade-amaliyah]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-grade-amaliyah');
        const row = (api.state.data.amaliyah || []).find((a) => String(a.id) === String(id));
        if (!row) return;
        openSubmissionGradingModal({
          modalTitle: `✏️ Penilaian Amaliyah KBC — ${row.nama || 'Siswa'}`,
          infoHtml: `<strong>${escapeHtml(row.nama || '')}</strong> (${escapeHtml(row.kelas || '-')}) • NISN: <code>${escapeHtml(row.nisn || '-')}</code>
            <div style="margin-top:6px;"><strong>Pencapaian:</strong> ${escapeHtml(row.pencapaianTerbaik || '-')}</div>
            <p style="margin:4px 0 0;color:var(--slate-800);"><strong>Refleksi KBC:</strong> ${escapeHtml(row.refleksiKbc || '-')}</p>`,
          nilaiLabel: 'Nilai Jurnal Amaliyah (Bebas ketik Angka 0–100 atau Huruf A/B/C/D/E)',
          currentNilai: row.nilai,
          currentCatatan: row.catatanGuru,
          showCurateCheckbox: false,
          saveButtonLabel: '💾 Simpan Nilai Amaliyah',
          savingLabel: 'Menyimpan Nilai...',
          onSave: async ({ nilai, catatanGuru }) => {
            await api.gradeAmaliyah({ id: row.id, nilai, catatanGuru });
            showToast(
              nilai
                ? `Nilai Amaliyah "${nilai}" untuk ${row.nama || 'siswa'} berhasil disimpan!`
                : 'Penilaian Amaliyah KBC diperbarui!'
            );
          }
        });
      });
    });

    container.querySelectorAll('[data-grade-hots]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-grade-hots');
        const row = (api.state.data.ruangKritis || []).find((r) => r.id === id);
        if (!row) return;
        openSubmissionGradingModal({
          modalTitle: `✏️ Penilaian Ruang Kritis — ${row.nama || 'Siswa'}`,
          infoHtml: `<strong>${escapeHtml(row.nama || '')}</strong> (${escapeHtml(row.kelas || '-')}) • NISN: <code>${escapeHtml(row.nisn || '-')}</code>
            <div style="margin-top:6px;"><strong>Nilai KBC:</strong> ${escapeHtml(row.nilaiKbc || '-')}</div>
            <p style="margin:6px 0 0;color:var(--slate-800);white-space:pre-line;">"${escapeHtml(row.analisis || '')}"</p>`,
          nilaiLabel: 'Nilai Ruang Kritis (Bebas ketik Angka 0–100 atau Huruf A/B/C/D/E)',
          currentNilai: row.nilai,
          currentCatatan: row.catatanGuru,
          showCurateCheckbox: true,
          currentDikurasi: Boolean(row.dikurasi),
          saveButtonLabel: '💾 Simpan Nilai Ruang Kritis',
          savingLabel: 'Menyimpan Nilai...',
          onSave: async ({ nilai, catatanGuru, dikurasi }) => {
            await api.gradeRuangKritis({ id: row.id, nilai, catatanGuru, dikurasi });
            showToast(
              nilai
                ? `Nilai "${nilai}" untuk ${row.nama || 'siswa'} berhasil disimpan!`
                : 'Penilaian Ruang Kritis berhasil diperbarui!'
            );
          }
        });
      });
    });

    container.querySelectorAll('[data-grade-tugas]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-grade-tugas');
        const row = (api.state.data.tugas || []).find((t) => t.id === id);
        if (!row) return;
        const navSafe = (window.BTD_UI && window.BTD_UI.safeNavUrl) || safeUrl;
        const url = typeof navSafe === 'function' ? navSafe(row.fileUrl) : '';
        openSubmissionGradingModal({
          modalTitle: `✏️ Penilaian Tugas — ${row.nama || 'Siswa'}`,
          infoHtml: `<strong>${escapeHtml(row.nama || '')}</strong> (${escapeHtml(row.kelas || '-')}) • NISN: <code>${escapeHtml(row.nisn || '-')}</code>
            <div style="margin-top:6px;"><strong>Bab / Materi:</strong> ${escapeHtml(row.bab || '-')} • <strong>Jenis:</strong> ${escapeHtml(row.jenisTugas || '-')}</div>
            <div style="margin-top:4px;"><strong>Berkas:</strong> ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Buka Berkas Tugas ↗</a>` : escapeHtml(row.fileUrl || '-')}</div>
            ${row.catatan ? `<p style="margin:6px 0 0;color:var(--slate-700);"><strong>Catatan Siswa:</strong> ${escapeHtml(row.catatan)}</p>` : ''}`,
          nilaiLabel: 'Nilai Tugas / E-LKPD (Bebas ketik Angka 0–100 atau Huruf A/B/C/D/E)',
          currentNilai: row.nilai,
          currentCatatan: row.catatanGuru,
          showCurateCheckbox: false,
          saveButtonLabel: '💾 Simpan Nilai Tugas',
          savingLabel: 'Menyimpan Nilai...',
          onSave: async ({ nilai, catatanGuru }) => {
            await api.gradeTugas({ id: row.id, nilai, catatanGuru });
            showToast(
              nilai
                ? `Nilai tugas "${nilai}" untuk ${row.nama || 'siswa'} berhasil disimpan!`
                : 'Penilaian tugas berhasil diperbarui!'
            );
          }
        });
      });
    });

    container.querySelectorAll('[data-curate-hots]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-curate-hots');
        const row = (api.state.data.ruangKritis || []).find((r) => r.id === id);
        if (!row || b.disabled) return;
        const origHtml = b.innerHTML;
        b.disabled = true;
        b.innerHTML = '<span class="spinner-inline dark"></span> Menerbitkan...';
        try {
          if (typeof api.gradeRuangKritis === 'function') {
            await api.gradeRuangKritis({
              id: row.id,
              nilai: row.nilai !== undefined ? row.nilai : '',
              catatanGuru: row.catatanGuru || '',
              dikurasi: true
            });
          } else {
            row.dikurasi = true;
          }
          await api.saveGaleri({
            judul: `Analisis HOTS Pilihan: ${row.nilaiKbc || 'Refleksi PAI'}`,
            kelas: row.kelas,
            kategori: 'Analisis HOTS',
            kreator: `Siswa ${row.kelas} (Terkurasi Guru)`,
            ringkasan: row.analisis,
            gambarUrl: '',
            tautan: ''
          });
          showToast('Analisis siswa diterbitkan ke Galeri Karya!');
          renderDashboard();
        } catch (err) {
          row.dikurasi = false;
          showToast('Gagal menerbitkan analisis: ' + err.message, 'error');
        } finally {
          b.disabled = false;
          b.innerHTML = origHtml;
        }
      });
    });

    const expRekapExcelBtn = document.getElementById('btn-export-rekap-excel');
    if (expRekapExcelBtn) {
      expRekapExcelBtn.addEventListener('click', async () => {
        const spec = getRekapExportSpec(state.rekapSub);
        if (!spec.rows.length) {
          showToast('Belum ada data pada filter ini untuk diekspor.', 'warning');
          return;
        }
        try {
          expRekapExcelBtn.disabled = true;
          await api.exportTableExcel(spec);
          showToast('File Excel (.xlsx) rapi berhasil diunduh.');
        } catch (err) {
          showToast('Gagal membuat file Excel: ' + err.message, 'error');
        } finally {
          expRekapExcelBtn.disabled = false;
        }
      });
    }

    const expRekapPdfBtn = document.getElementById('btn-export-rekap-pdf');
    if (expRekapPdfBtn) {
      expRekapPdfBtn.addEventListener('click', () => {
        const spec = getRekapExportSpec(state.rekapSub);
        if (!spec.rows.length) {
          showToast('Belum ada data pada filter ini untuk dipratinjau.', 'warning');
          return;
        }
        const cfg = api.state.data.pengaturan || {};
        const klsLabel = state.filters.rekapKelas === 'Semua' ? 'Semua Kelas' : state.filters.rekapKelas;
        const docHtml = buildKopSuratPdfHtml({
          fileNameTitle: spec.fileName.replace(/\.xlsx$/i, ''),
          docTitle: spec.title,
          docSubtitle: spec.subtitle,
          metaPairs: [
            { label: 'Kategori Rekap', value: spec.sheetName },
            { label: 'Filter Kelas', value: klsLabel },
            { label: 'Tahun Ajaran', value: cfg.academicYear || '2026/2027' },
            { label: 'Jumlah Data', value: `${spec.rows.length} baris` }
          ],
          tableHeaders: spec.headers,
          tableRows: spec.rows,
          centerCols: spec.centerCols,
          summaryText: spec.summaryText,
          signaturePlaceDate: `${cfg.schoolCity || 'Tebo'}, ${formatDateId(todayIso)}`,
          orientation: spec.orientation || 'landscape',
          cfg
        });
        openPdfPreviewModal({
          modalTitle: `Pratinjau Dokumen PDF — ${spec.sheetName}`,
          docHtml
        });
      });
    }

    /* ---- Ayo Belajar (Daftar Praktikum, Switch ON/OFF & Komentar Pengunjung) ---- */
    container.querySelectorAll('[data-belajar-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tabBelajar = b.getAttribute('data-belajar-tab') || 'praktikum';
        renderDashboard();
      });
    });
    bindSelectFilter('flt-belajar-kat', 'belajarKategori', 'belajar');
    bindSearchInput('flt-belajar-search', 'belajarSearch', 'belajar');
    bindSelectFilter('flt-kom-topik', 'komentarTopik', 'komentar');
    bindSearchInput('flt-kom-search', 'komentarSearch', 'komentar');

    container.querySelectorAll('[data-jump-belajar-komentar]').forEach((b) => {
      b.addEventListener('click', () => {
        state.filters.komentarTopik = b.getAttribute('data-jump-belajar-komentar') || 'Semua';
        state.tabBelajar = 'komentar';
        state.tables.komentar.page = 1;
        renderDashboard();
      });
    });

    container.querySelectorAll('[data-edit-belajar-cat]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-edit-belajar-cat');
        const list = typeof api.getBelajarCategoriesList === 'function' ? api.getBelajarCategoriesList() : [];
        const catItem = list.find((c) => String(c.id) === String(id));
        if (catItem) openBelajarConfigModal(catItem, { isCategory: true });
      });
    });

    container.querySelectorAll('[data-edit-belajar]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-edit-belajar');
        const list = typeof api.getBelajarTopicsList === 'function' ? api.getBelajarTopicsList() : [];
        const topic = list.find((t) => String(t.id) === String(id));
        if (topic) openBelajarConfigModal(topic);
      });
    });

    container.querySelectorAll('[data-toggle-belajar-komentar]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-toggle-belajar-komentar');
        const list = typeof api.getBelajarTopicsList === 'function' ? api.getBelajarTopicsList() : [];
        const topic = list.find((t) => String(t.id) === String(id));
        if (!topic || b.disabled) return;
        const nextOn = !topic.komentarAktif;
        b.disabled = true;
        try {
          await api.saveBelajarConfig({
            id: topic.id,
            kategoriId: topic.kategoriId,
            judul: topic.judul,
            youtubeId: topic.youtubeId,
            coverImage: topic.coverImage,
            komentarAktif: nextOn,
            prayerAudios: topic.prayerAudios
          });
          showToast(`Kolom komentar "${topic.judul}" ${nextOn ? 'DIAKTIFKAN (ON)' : 'DINONAKTIFKAN (OFF)'}.`, nextOn ? 'success' : 'warning');
          renderDashboard();
        } catch (err) {
          showToast('Gagal mengubah switch komentar: ' + err.message, 'error');
          b.disabled = false;
        }
      });
    });

    bindConfirmDelete('data-del-komentar', (id) => {
      const k = (api.state.data.belajarKomentar || []).find((x) => String(x.id) === String(id));
      return {
        message: 'Apakah Anda yakin akan menghapus komentar pengunjung ini?',
        itemLabel: k ? `${k.nama || 'Pengunjung'} (${k.topicTitle || k.topicId}): "${String(k.komentar || '').slice(0, 60)}"` : id,
        loadingText: 'Sedang menghapus komentar...',
        successMessage: 'Komentar pengunjung berhasil dihapus.',
        run: (delId) => api.deleteBelajarKomentar(delId)
      };
    });

    /* ---- Pengaturan (4 Sub-Tab) ---- */
    container.querySelectorAll('[data-cfg-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        state.tabPengaturan = b.getAttribute('data-cfg-tab');
        renderDashboard();
      });
    });

    bindSelectFilter('flt-guru-riwayat-kat', 'guruRiwayatKat');
    const addRiwayatBtn = document.getElementById('btn-add-guru-riwayat');
    if (addRiwayatBtn) {
      addRiwayatBtn.addEventListener('click', () => openGuruRiwayatModal(null));
    }
    container.querySelectorAll('[data-edit-riwayat]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-edit-riwayat');
        const list = typeof api.getGuruRiwayatList === 'function' ? api.getGuruRiwayatList() : [];
        const row = list.find((r) => String(r.id) === String(id));
        if (row) openGuruRiwayatModal(row);
      });
    });
    bindConfirmDelete('data-del-riwayat', (id) => {
      const list = typeof api.getGuruRiwayatList === 'function' ? api.getGuruRiwayatList() : [];
      const row = list.find((r) => String(r.id) === String(id));
      return {
        message: 'Apakah Anda yakin akan menghapus baris riwayat guru ini?',
        itemLabel: row ? `${row.kategori}: ${row.judul} (${row.periode || '-'})` : id,
        loadingText: 'Sedang menghapus riwayat guru...',
        successMessage: 'Riwayat guru berhasil dihapus.',
        run: (delId) => api.deleteGuruRiwayat(delId)
      };
    });

    bindPasswordToggles(container);
    attachCropUpload({
      fileInputId: 'cfg-teacher-file',
      urlInputId: 'cfg-teacher-photo',
      previewId: 'cfg-teacher-preview',
      title: '✂️ Potong Foto Profil Guru (Rasio 3:4)',
      ratioLabel: '3:4',
      aspectRatio: 3 / 4,
      outWidth: 480,
      outHeight: 640,
      maxChars: 46000
    });
    attachModalUpload('cfg-bg-file', 'cfg-bg-url', 'bg_tema', { maxWidth: 960, maxChars: 46000, previewId: 'cfg-bg-preview' });
    attachCropUpload({
      fileInputId: 'cfg-logo-file',
      urlInputId: 'cfg-logo-url',
      previewId: 'cfg-logo-preview',
      title: '✂️ Potong Logo Utama Portal (Rasio 1:1 Transparan)',
      ratioLabel: '1:1',
      aspectRatio: 1,
      outWidth: 250,
      outHeight: 250,
      maxChars: 46000,
      preferPng: true,
      preserveTransparency: true,
      fitMode: 'contain',
      onDoneNotice: 'Logo portal berhasil di-crop 1:1 (250×250, < 46.000 char)! Klik "Simpan Logo & Tema Portal".'
    });
    attachCropUpload({
      fileInputId: 'cfg-instansi-logo-file',
      urlInputId: 'cfg-instansi-logo-url',
      previewId: 'cfg-instansi-logo-preview',
      title: '✂️ Potong Logo Instansi / Pemprov (Rasio 1:1 Transparan)',
      ratioLabel: '1:1',
      aspectRatio: 1,
      outWidth: 250,
      outHeight: 250,
      maxChars: 46000,
      preferPng: true,
      preserveTransparency: true,
      fitMode: 'contain',
      onDoneNotice: 'Logo instansi berhasil di-crop 1:1 transparan (250×250, < 46.000 char)! Klik "Simpan Logo & Tema Portal".'
    });
    attachCropUpload({
      fileInputId: 'cfg-school-logo-file',
      urlInputId: 'cfg-school-logo-url',
      previewId: 'cfg-school-logo-preview',
      title: '✂️ Potong Logo Sekolah / Madrasah (Rasio 1:1 Transparan)',
      ratioLabel: '1:1',
      aspectRatio: 1,
      outWidth: 250,
      outHeight: 250,
      maxChars: 46000,
      preferPng: true,
      preserveTransparency: true,
      fitMode: 'contain',
      onDoneNotice: 'Logo sekolah berhasil di-crop 1:1 transparan (250×250, < 46.000 char)! Klik "Simpan Logo & Tema Portal".'
    });

    const bindConfirmClearAsset = (btnId, inpId, previewId, fallbackHtml, itemLabel, successMessage) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        openConfirmModal({
          title: 'Konfirmasi Hapus Gambar',
          message: 'Apakah Anda yakin akan menghapus gambar ini?',
          itemLabel,
          confirmText: 'YA, Hapus',
          cancelText: 'TIDAK',
          onConfirm: () => {
            const inp = document.getElementById(inpId);
            const prev = document.getElementById(previewId);
            if (inp) inp.value = '';
            if (prev) prev.innerHTML = fallbackHtml;
          },
          successMessage
        });
      });
    };

    bindConfirmClearAsset(
      'btn-reset-logo',
      'cfg-logo-url',
      'cfg-logo-preview',
      '<span style="font-size:24px;">🕌</span>',
      'Logo Utama Portal',
      'Logo portal dikembalikan ke bawaan (klik Simpan untuk menerapkan).'
    );
    bindConfirmClearAsset(
      'btn-reset-instansi-logo',
      'cfg-instansi-logo-url',
      'cfg-instansi-logo-preview',
      '<span style="font-size:24px;">🏛️</span>',
      'Logo Instansi / Pemerintah',
      'Logo instansi dihapus (klik Simpan untuk menerapkan).'
    );
    bindConfirmClearAsset(
      'btn-reset-school-logo',
      'cfg-school-logo-url',
      'cfg-school-logo-preview',
      '<span style="font-size:24px;">🏫</span>',
      'Logo Sekolah',
      'Logo sekolah dihapus (klik Simpan untuk menerapkan).'
    );
    bindConfirmClearAsset(
      'btn-reset-bg',
      'cfg-bg-url',
      'cfg-bg-preview',
      '<small style="color:var(--slate-500);">Polos</small>',
      'Gambar Latar Beranda',
      'Gambar latar dihapus (klik Simpan untuk menerapkan).'
    );

    const c1El = document.getElementById('cfg-color-1');
    const c2El = document.getElementById('cfg-color-2');
    const c3El = document.getElementById('cfg-color-3');
    const gradPrev = document.getElementById('cfg-grad-preview');
    const updateGradPreview = () => {
      if (gradPrev && c1El && c2El && c3El) {
        gradPrev.style.background = `linear-gradient(135deg, ${c1El.value} 0%, ${c2El.value} 52%, ${c3El.value} 100%)`;
      }
    };
    [c1El, c2El, c3El].forEach((el) => {
      if (el) el.addEventListener('input', updateGradPreview);
    });
    container.querySelectorAll('[data-theme-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        const parts = b.getAttribute('data-theme-preset').split(',');
        if (parts.length === 3 && c1El && c2El && c3El) {
          c1El.value = parts[0];
          c2El.value = parts[1];
          c3El.value = parts[2];
          updateGradPreview();
        }
      });
    });

    const bc1El = document.getElementById('cfg-btn-color-1');
    const bc2El = document.getElementById('cfg-btn-color-2');
    const btnPresetEl = document.getElementById('cfg-btn-preset');
    const btnGradPrev = document.getElementById('cfg-btn-grad-preview');
    const updateBtnGradPreview = () => {
      if (btnGradPrev && bc1El && bc2El) {
        btnGradPrev.style.background = `linear-gradient(135deg, ${bc1El.value} 0%, ${bc2El.value} 100%)`;
      }
    };
    [bc1El, bc2El].forEach((el) => {
      if (el) el.addEventListener('input', updateBtnGradPreview);
    });
    container.querySelectorAll('[data-btn-grad-choice]').forEach((cardBtn) => {
      cardBtn.addEventListener('click', () => {
        const presetId = cardBtn.getAttribute('data-btn-grad-choice') || 'zamrud-toska';
        const cStart = cardBtn.getAttribute('data-bc1') || '#064e3b';
        const cEnd = cardBtn.getAttribute('data-bc2') || '#0d9488';
        if (btnPresetEl) btnPresetEl.value = presetId;
        if (bc1El) bc1El.value = cStart;
        if (bc2El) bc2El.value = cEnd;
        container.querySelectorAll('[data-btn-grad-choice]').forEach((el) => el.classList.remove('active'));
        cardBtn.classList.add('active');
        updateBtnGradPreview();
      });
    });

    const withButtonLoading = async (btn, loadingHtml, task) => {
      if (!btn) return task();
      if (btn.disabled) return;
      const origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = loadingHtml;
      try {
        return await task();
      } catch (err) {
        showToast('Gagal menyimpan perubahan: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    };

    const formGas = document.getElementById('form-gas-url');
    if (formGas) {
      formGas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-cfg-gas') || (e.target && e.target.querySelector('button[type="submit"]'));
        await withButtonLoading(btn, '<span class="spinner-inline"></span> Menghubungkan...', async () => {
          const url = document.getElementById('gas-url-inp').value.trim();
          api.setAppsScriptUrl(url);
          await api.bootstrap();
          window.BTD_UI.syncChromeMetadata();
          if (api.state.isLive) showToast('Terhubung ke Google Apps Script & Google Sheets!');
          else showToast('URL disimpan, namun koneksi gagal/kosong (masih Mode Demo).', 'warning');
          renderDashboard();
        });
      });
    }

    const testGasBtn = document.getElementById('btn-test-gas');
    if (testGasBtn) {
      testGasBtn.addEventListener('click', async () => {
        await withButtonLoading(testGasBtn, '<span class="spinner-inline dark"></span> Menguji...', async () => {
          const urlEl = document.getElementById('gas-url-inp');
          if (urlEl && urlEl.value.trim()) api.setAppsScriptUrl(urlEl.value.trim());
          const info = await api.testConnection();
          showToast('Koneksi OK! ' + info.status);
        });
      });
    }

    const remoteSetupBtn = document.getElementById('btn-remote-setup');
    if (remoteSetupBtn) {
      remoteSetupBtn.addEventListener('click', async () => {
        await withButtonLoading(remoteSetupBtn, '<span class="spinner-inline dark"></span> Menyiapkan Sheets...', async () => {
          const res = await api.setupDatabaseRemote();
          if (res && res.driveReady === false) {
            showToast(res.message || 'Sheets siap, tetapi folder Drive belum terotorisasi.', 'warning');
          } else {
            showToast((res && res.message) || 'Struktur database Google Sheets siap!');
          }
        });
      });
    }

    const clearGas = document.getElementById('btn-clear-gas');
    if (clearGas) {
      clearGas.addEventListener('click', () => {
        openConfirmModal({
          title: 'Konfirmasi Putuskan Koneksi',
          message: 'Apakah Anda yakin akan memutus koneksi Google Apps Script dan kembali ke Mode Demo?',
          itemLabel: 'Koneksi Database Google Sheets',
          confirmText: 'YA, Putuskan',
          cancelText: 'TIDAK',
          danger: false,
          loadingText: 'Sedang memutus koneksi dan memuat ulang...',
          confirmLoadingLabel: 'Memutus...',
          onConfirm: async () => {
            api.setAppsScriptUrl('');
            await api.bootstrap();
            window.BTD_UI.syncChromeMetadata();
            renderDashboard();
          },
          successMessage: 'Koneksi Apps Script dilepas. Berjalan di Mode Demo.'
        });
      });
    }

    const resetDemo = document.getElementById('btn-reset-demo');
    if (resetDemo) {
      resetDemo.addEventListener('click', () => {
        openConfirmModal({
          title: 'Konfirmasi Reset Data Demo',
          message: 'Apakah Anda yakin akan menghapus perubahan lokal dan mengembalikan data demo awal?',
          itemLabel: 'Semua Data Demo Lokal',
          confirmText: 'YA, Reset',
          cancelText: 'TIDAK',
          loadingText: 'Sedang mereset data demo...',
          confirmLoadingLabel: 'Mereset...',
          onConfirm: () => {
            api.resetDemoData();
            window.BTD_UI.syncChromeMetadata();
            renderDashboard();
          },
          successMessage: 'Data demo lokal berhasil dikembalikan ke kondisi awal.'
        });
      });
    }

    const formGuru = document.getElementById('form-cfg-guru');
    if (formGuru) {
      formGuru.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-cfg-guru') || (e.target && e.target.querySelector('button[type="submit"]'));
        await withButtonLoading(btn, '<span class="spinner-inline"></span> Menyimpan Identitas Guru...', async () => {
          const parseList = (str) => str.split(',').map((x) => x.trim()).filter(Boolean);
          await api.updatePengaturan({
            siteName: document.getElementById('cfg-site').value.trim(),
            siteSubtitle: document.getElementById('cfg-subtitle').value.trim(),
            teacherName: document.getElementById('cfg-teacher').value.trim(),
            teacherTitle: document.getElementById('cfg-teacher-title').value.trim(),
            teacherNip: document.getElementById('cfg-teacher-nip').value.trim(),
            teacherPhotoUrl: document.getElementById('cfg-teacher-photo').value.trim(),
            teacherBio: document.getElementById('cfg-teacher-bio').value.trim(),
            academicYear: document.getElementById('cfg-year').value.trim(),
            elemenList: parseList(document.getElementById('cfg-elemen').value)
          });
          window.BTD_UI.syncChromeMetadata();
          showToast('Identitas guru & portal berhasil diperbarui.');
          renderDashboard();
        });
      });
    }

    const pickCoordsBtn = document.getElementById('btn-pick-coords');
    if (pickCoordsBtn && window.BTD_UI && typeof window.BTD_UI.openCoordinatePickerModal === 'function') {
      pickCoordsBtn.addEventListener('click', () => {
        const coordsInp = document.getElementById('cfg-school-coords');
        const mapsInp = document.getElementById('cfg-maps');
        const schoolInp = document.getElementById('cfg-school');
        const cityInp = document.getElementById('cfg-city');
        const hintParts = [schoolInp && schoolInp.value.trim(), cityInp && cityInp.value.trim()].filter(Boolean);
        window.BTD_UI.openCoordinatePickerModal({
          initialCoords: coordsInp ? coordsInp.value.trim() : '',
          addressHint: hintParts.join(', '),
          onSelect(coordsStr, gmapsUrl) {
            if (coordsInp) coordsInp.value = coordsStr;
            if (mapsInp && !mapsInp.value.trim()) mapsInp.value = gmapsUrl;
            showToast(`Titik koordinat dipilih: ${coordsStr} (klik Simpan Identitas Sekolah).`);
          }
        });
      });
    }

    const formSekolah = document.getElementById('form-cfg-sekolah');
    if (formSekolah) {
      formSekolah.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-cfg-sekolah') || (e.target && e.target.querySelector('button[type="submit"]'));
        await withButtonLoading(btn, '<span class="spinner-inline"></span> Menyimpan Identitas Sekolah...', async () => {
          const instInp = document.getElementById('cfg-instansi-name');
          const coordsInp = document.getElementById('cfg-school-coords');
          await api.updatePengaturan({
            namaInstansi: instInp ? instInp.value.trim() : '',
            schoolName: document.getElementById('cfg-school').value.trim(),
            schoolNpsn: document.getElementById('cfg-npsn').value.trim(),
            schoolAddress: document.getElementById('cfg-address').value.trim(),
            schoolCity: document.getElementById('cfg-city').value.trim(),
            schoolHours: document.getElementById('cfg-hours').value.trim(),
            schoolEmail: document.getElementById('cfg-email').value.trim(),
            schoolPhone: document.getElementById('cfg-phone').value.trim(),
            schoolWebsite: document.getElementById('cfg-website').value.trim(),
            schoolMapsUrl: document.getElementById('cfg-maps').value.trim(),
            schoolCoords: coordsInp ? coordsInp.value.trim() : ''
          });
          window.BTD_UI.syncChromeMetadata();
          showToast('Identitas instansi, sekolah, koordinat maps, & kontak berhasil diperbarui.');
          renderDashboard();
        });
      });
    }

    const formTema = document.getElementById('form-cfg-tema');
    if (formTema) {
      formTema.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-cfg-tema') || (e.target && e.target.querySelector('button[type="submit"]'));
        await withButtonLoading(btn, '<span class="spinner-inline dark"></span> Menyimpan Logo & Tema...', async () => {
          await api.updatePengaturan({
            siteLogoUrl: document.getElementById('cfg-logo-url').value.trim(),
            instansiLogoUrl: document.getElementById('cfg-instansi-logo-url').value.trim(),
            schoolLogoUrl: document.getElementById('cfg-school-logo-url').value.trim(),
            themeBgUrl: document.getElementById('cfg-bg-url').value.trim(),
            themeColor1: document.getElementById('cfg-color-1').value,
            themeColor2: document.getElementById('cfg-color-2').value,
            themeColor3: document.getElementById('cfg-color-3').value,
            btnGradPreset: document.getElementById('cfg-btn-preset') ? document.getElementById('cfg-btn-preset').value : 'zamrud-toska',
            btnColor1: document.getElementById('cfg-btn-color-1') ? document.getElementById('cfg-btn-color-1').value : '#064e3b',
            btnColor2: document.getElementById('cfg-btn-color-2') ? document.getElementById('cfg-btn-color-2').value : '#0d9488'
          });
          window.BTD_UI.syncChromeMetadata();
          showToast('Logo 1:1, background, dan tema warna berhasil diterapkan!');
          renderDashboard();
        });
      });
    }

    const formAkun = document.getElementById('form-cfg-akun');
    if (formAkun) {
      formAkun.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-cfg-akun') || (e.target && e.target.querySelector('button[type="submit"]'));
        await withButtonLoading(btn, '<span class="spinner-inline dark"></span> Menyimpan Akun...', async () => {
          await api.updatePengaturan({
            adminUsername: document.getElementById('cfg-admin-user').value.trim(),
            adminPassword: document.getElementById('cfg-admin-pass').value.trim(),
            smartPaiUrl: document.getElementById('cfg-smartpai').value.trim(),
            kemenagUrl: document.getElementById('cfg-kemenag').value.trim()
          });
          window.BTD_UI.syncChromeMetadata();
          showToast('Akun admin & tautan berhasil diperbarui.');
          renderDashboard();
        });
      });
    }
  }

  if (typeof api.isAdminSessionValid === 'function' ? api.isAdminSessionValid() : api.state.adminUnlocked) renderDashboard();
  else renderLogin();
};
