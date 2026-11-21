/**
 * Halaman Jadwal & Riwayat Pembelajaran PAI (Halaman Umum / Read-Only)
 * Dapat dipantau oleh siswa, orang tua, pengawas, dan juri dengan filter Bulan, Kelas, Jenis, & Status.
 * Klik jadwal mana saja untuk melihat rekapan data mengajar (materi, jumlah hadir, & riwayat) tanpa tombol absen.
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.riwayat = function renderRiwayat(container) {
  const { escapeHtml, formatDateId, openModal, closeModal, openImageLightbox } = window.BTD_UI;
  const api = window.BTD_API;

  const MONTHS = [
    { val: 'Semua', label: 'Semua Bulan' },
    { val: '01', label: 'Januari' },
    { val: '02', label: 'Februari' },
    { val: '03', label: 'Maret' },
    { val: '04', label: 'April' },
    { val: '05', label: 'Mei' },
    { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' },
    { val: '08', label: 'Agustus' },
    { val: '09', label: 'September' },
    { val: '10', label: 'Oktober' },
    { val: '11', label: 'November' },
    { val: '12', label: 'Desember' }
  ];

  const state = {
    bulan: 'Semua',
    kelas: 'Semua',
    jenis: 'Semua',
    status: 'Sedang Berlangsung',
    donePage: 1,
    donePageSize: 10
  };

  function getClassNames() {
    const k = (api.state.data.kelas || []).map((x) => x.namaKelas).filter(Boolean);
    if (k.length) return k;
    return (api.state.data.pengaturan && api.state.data.pengaturan.classes) || [];
  }

  function openScheduleRecapModal(item) {
    const summary = api.getScheduleAttendanceSummary(item);
    const hasMateriLink = Boolean(item.materiId);
    const isDaring = item.jenis === 'Daring';

    const statusTagClass = (st) => {
      const s = String(st || '').trim().toLowerCase();
      if (s === 'hadir') return 'tag-emerald';
      if (s === 'alpa') return 'tag-rose';
      if (s === 'belum absen') return 'tag-slate';
      return 'tag-gold';
    };

    const rowsHtml = summary.rows.length
      ? `<div class="table-wrap" style="max-height:280px;margin-top:12px;">
          <table>
            <thead><tr><th>No</th><th>Nama Siswa</th><th>Status</th><th>Catatan${isDaring ? ' &amp; Foto' : ''}</th></tr></thead>
            <tbody>
              ${summary.rows
        .map(
          (r, i) => `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(r.nama)}</strong></td>
                    <td><span class="tag ${statusTagClass(r.status)}">${escapeHtml(r.status || 'Belum Absen')}</span></td>
                    <td>
                      <div class="absen-catatan-cell">
                        ${isDaring && r.fotoUrl
              ? `<button type="button" class="btn btn-gold btn-sm absen-view-foto-btn" data-recap-view-foto="${escapeHtml(r.fotoUrl)}" data-foto-nama="${escapeHtml(r.nama)}" data-foto-status="${escapeHtml(r.status || 'Hadir')}">📸 Lihat Foto</button>`
              : ''
            }
                        <small>${escapeHtml(r.catatan || '-')}</small>
                      </div>
                    </td>
                  </tr>`
        )
        .join('')}
            </tbody>
          </table>
        </div>`
      : `<div class="callout" style="margin-top:12px;">Belum ada catatan presensi siswa yang tercatat untuk pertemuan ini.</div>`;

    openModal(
      `Rekapan Mengajar • ${escapeHtml(item.kelas)} (${formatDateId(item.tanggal)})`,
      `<div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="tag tag-emerald">${escapeHtml(item.kelas)}</span>
          <span class="tag ${isDaring ? 'tag-sky' : 'tag-gold'}">${isDaring ? '💻 Daring' : '🏫 Luring'}</span>
          <span class="tag ${item.status === 'Terlaksana' ? 'tag-emerald' : 'tag-gold'}">${item.status === 'Terlaksana' ? '✓ Terlaksana' : '🟢 Sedang Berlangsung'}</span>
          <span class="tag">${escapeHtml(item.jamKe)}</span>
        </div>

        <div class="callout callout-emerald">
          <small style="font-weight:700;color:var(--emerald-800);text-transform:uppercase;">Materi Pembelajaran</small>
          <h3 style="margin:4px 0 6px;font-size:17px;">${escapeHtml(item.materiJudul)}</h3>
          ${item.catatan ? `<p style="margin:0;font-size:13.8px;color:var(--slate-700);">${escapeHtml(item.catatan)}</p>` : ''}
          ${hasMateriLink
        ? `<div style="margin-top:10px;"><a href="#materi?id=${encodeURIComponent(item.materiId)}" class="btn btn-primary btn-sm" id="modal-go-materi">📖 Buka Modul Materi Bab Ini →</a></div>`
        : ''
      }
        </div>

        <div>
          <strong>📊 Rekap Kehadiran Siswa (${summary.total} tercatat${summary.counts['Belum Absen'] ? ` • ${summary.counts['Belum Absen']} belum absen` : ''})</strong>
          <div class="grid recap-metric-5" style="margin-top:8px;">
            <div class="callout callout-emerald" style="padding:10px 12px;"><strong>${summary.counts.Hadir}</strong><br/><small>Hadir</small></div>
            <div class="callout callout-gold" style="padding:10px 12px;"><strong>${summary.counts.Izin}</strong><br/><small>Izin</small></div>
            <div class="callout" style="padding:10px 12px;"><strong>${summary.counts.Sakit}</strong><br/><small>Sakit</small></div>
            <div class="callout" style="padding:10px 12px;background:var(--rose-50);"><strong>${summary.counts.Alpa}</strong><br/><small>Alpa</small></div>
            <div class="callout" style="padding:10px 12px;background:var(--slate-100);"><strong>${summary.counts['Belum Absen'] || 0}</strong><br/><small>Belum Absen</small></div>
          </div>
          ${rowsHtml}
        </div>

        ${item.status === 'Sedang Berlangsung' && isDaring
        ? `<div class="callout callout-gold" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-size:13.5px;">Siswa kelas <strong>${escapeHtml(item.kelas)}</strong> mengisi presensi daring selfie melalui akun Portal Siswa masing-masing.</span>
                <a href="#siswa" class="btn btn-gold btn-sm" id="modal-go-siswa">🎓 Masuk Portal Siswa</a>
              </div>`
        : ''
      }
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-primary" id="modal-recap-close">Tutup</button>
        </div>
      </div>`
    );

    const goMat = document.getElementById('modal-go-materi');
    if (goMat) goMat.addEventListener('click', closeModal);
    const goStu = document.getElementById('modal-go-siswa');
    if (goStu) goStu.addEventListener('click', closeModal);
    const recapCloseBtn = document.getElementById('modal-recap-close');
    if (recapCloseBtn) recapCloseBtn.addEventListener('click', closeModal);
    document.querySelectorAll('[data-recap-view-foto]').forEach((b) => {
      b.addEventListener('click', () => {
        const url = b.getAttribute('data-recap-view-foto') || '';
        const nama = b.getAttribute('data-foto-nama') || 'Siswa';
        const st = b.getAttribute('data-foto-status') || 'Hadir';
        if (typeof openImageLightbox === 'function') {
          openImageLightbox(
            `📸 Foto Selfie Presensi — ${nama}`,
            url,
            `Kelas ${item.kelas} • ${formatDateId(item.tanggal)} • Status: ${st}`
          );
        }
      });
    });
  }

  function render() {
    const classNames = getClassNames();
    const allSchedules = (api.state.data.jadwal || []).slice().sort((a, b) =>
      String(b.tanggal || '').localeCompare(String(a.tanggal || ''))
    );

    const filtered = allSchedules.filter((j) => {
      const m = String(j.tanggal || '').slice(5, 7);
      const isDone = j.status === 'Terlaksana';
      if (state.bulan !== 'Semua' && m !== state.bulan) return false;
      if (state.kelas !== 'Semua' && j.kelas !== state.kelas) return false;
      if (state.jenis !== 'Semua' && j.jenis !== state.jenis) return false;
      if (state.status === 'Terlaksana' && !isDone) return false;
      if (state.status === 'Sedang Berlangsung' && isDone) return false;
      return true;
    });

    const totalDone = allSchedules.filter((j) => j.status === 'Terlaksana').length;
    const totalUpcoming = allSchedules.filter((j) => j.status !== 'Terlaksana').length;

    let listHtml = '';
    if (state.status === 'Terlaksana') {
      const totalItems = filtered.length;
      const pageSize = Number(state.donePageSize || 10);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      if (state.donePage > totalPages) state.donePage = totalPages;
      if (state.donePage < 1) state.donePage = 1;
      const startIdx = (state.donePage - 1) * pageSize;
      const pageItems = filtered.slice(startIdx, startIdx + pageSize);
      const startShow = totalItems === 0 ? 0 : startIdx + 1;
      const endShow = Math.min(totalItems, startIdx + pageSize);

      listHtml = `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <div>
              <span class="tag tag-emerald">✓ Jadwal Terlaksana</span>
              <h2 style="margin:6px 0 0;font-size:19px;">Daftar Riwayat Pembelajaran Terlaksana</h2>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="btn-go-berlangsung">🟢 Kembali ke Sedang Berlangsung (${totalUpcoming})</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal &amp; Jam</th>
                  <th>Kelas</th>
                  <th>Materi Pembelajaran</th>
                  <th>Jenis</th>
                  <th>Rekap Hadir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.length === 0
          ? `<tr><td colspan="7" style="text-align:center;color:var(--slate-500);padding:26px;">
                        Belum ada riwayat jadwal terlaksana pada filter bulan/kelas ini.
                        <div style="margin-top:10px;"><button type="button" class="btn btn-outline btn-sm" id="btn-riw-reset">Reset Filter Bulan &amp; Kelas</button></div>
                      </td></tr>`
          : pageItems
            .map((j, idx) => {
              const summary = api.getScheduleAttendanceSummary(j);
              return `<tr>
                            <td>${startIdx + idx + 1}</td>
                            <td style="white-space:nowrap;">
                              <strong>${formatDateId(j.tanggal)}</strong><br/>
                              <small style="color:var(--slate-500);">${escapeHtml(j.jamKe)}</small>
                            </td>
                            <td style="white-space:nowrap;"><span class="tag tag-emerald">${escapeHtml(j.kelas)}</span></td>
                            <td>
                              <strong>${escapeHtml(j.materiJudul)}</strong>
                              ${j.catatan ? `<br/><small style="color:var(--slate-600);">${escapeHtml(j.catatan)}</small>` : ''}
                            </td>
                            <td style="white-space:nowrap;"><span class="tag ${j.jenis === 'Daring' ? 'tag-sky' : 'tag-gold'}">${j.jenis === 'Daring' ? '💻 Daring' : '🏫 Luring'}</span></td>
                            <td style="white-space:nowrap;">
                              <span class="tag tag-emerald">H:${summary.counts.Hadir}</span>
                              <small style="color:var(--slate-600);">I:${summary.counts.Izin} S:${summary.counts.Sakit} A:${summary.counts.Alpa}</small>
                            </td>
                            <td style="white-space:nowrap;">
                              <button type="button" class="btn btn-primary btn-sm" data-open-recap="${escapeHtml(j.id)}">📊 Lihat Rekapan →</button>
                            </td>
                          </tr>`;
            })
            .join('')
        }
              </tbody>
            </table>
          </div>
          <div class="pagination-bar">
            <div>
              Menampilkan <strong>${startShow}–${endShow}</strong> dari <strong>${totalItems}</strong> jadwal terlaksana
            </div>
            <div class="pagination-controls">
              <label for="riw-done-ps" style="font-weight:600;">Baris:</label>
              <select id="riw-done-ps" class="select">
                ${[10, 20, 50].map((n) => `<option value="${n}" ${pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
              <button type="button" class="btn btn-outline btn-sm" id="riw-done-prev" ${state.donePage <= 1 ? 'disabled' : ''}>‹ Prev</button>
              <span>Hal <strong>${state.donePage}</strong> / ${totalPages}</span>
              <button type="button" class="btn btn-outline btn-sm" id="riw-done-next" ${state.donePage >= totalPages ? 'disabled' : ''}>Next ›</button>
            </div>
          </div>
        </div>
      `;
    } else {
      listHtml =
        filtered.length === 0
          ? `<div class="card" style="text-align:center;padding:38px;">
              <p style="margin:0 0 12px;color:var(--slate-600);">Belum ada jadwal pembelajaran yang sedang berlangsung pada filter bulan/kelas ini.</p>
              <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline" id="btn-riw-reset">Reset Filter Bulan &amp; Kelas</button>
                <button type="button" class="btn btn-primary" id="btn-go-terlaksana">📋 Lihat Jadwal Terlaksana (${totalDone}) →</button>
              </div>
            </div>`
          : `<div class="grid grid-2">
              ${filtered
            .map((j) => {
              const summary = api.getScheduleAttendanceSummary(j);
              return `<article class="card card-hover schedule-card" data-open-recap="${escapeHtml(j.id)}">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <span class="tag tag-emerald">${escapeHtml(j.kelas)}</span>
                          <span class="tag ${j.jenis === 'Daring' ? 'tag-sky' : 'tag-gold'}">${j.jenis === 'Daring' ? '💻 Daring' : '🏫 Luring'}</span>
                        </div>
                        <span class="tag tag-gold">🟢 Sedang Berlangsung</span>
                      </div>
                      <div style="font-size:13px;font-weight:700;color:var(--emerald-800);margin-bottom:4px;">
                        📅 ${formatDateId(j.tanggal)} • ${escapeHtml(j.jamKe)}
                      </div>
                      <h3 style="margin:0 0 8px;font-size:16.5px;color:var(--slate-900);">${escapeHtml(j.materiJudul)}</h3>
                      ${j.catatan ? `<p style="margin:0;font-size:13.3px;color:var(--slate-600);">${escapeHtml(j.catatan)}</p>` : ''}
                    </div>

                    <div style="padding-top:10px;border-top:1px solid var(--slate-100);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                      <div class="schedule-metrics">
                        <span class="tag tag-emerald">Hadir: ${summary.counts.Hadir}</span>
                        ${summary.counts.Izin ? `<span class="tag tag-gold">Izin: ${summary.counts.Izin}</span>` : ''}
                        ${summary.counts.Sakit ? `<span class="tag">Sakit: ${summary.counts.Sakit}</span>` : ''}
                        ${summary.counts.Alpa ? `<span class="tag tag-rose">Alpa: ${summary.counts.Alpa}</span>` : ''}
                      </div>
                      <span style="font-size:13px;font-weight:700;color:var(--emerald-800);">Lihat Rekapan →</span>
                    </div>
                  </article>`;
            })
            .join('')}
            </div>
            <div style="margin-top:22px;display:flex;justify-content:center;">
              <button type="button" class="btn btn-gold" id="btn-go-terlaksana">
                📋 Lihat Jadwal Terlaksana (${totalDone} Pertemuan) →
              </button>
            </div>`;
    }

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Transparansi &amp; Pemantauan Pembelajaran PAI</span>
            <h1>Jadwal &amp; Riwayat Pembelajaran</h1>
            <p>Pantau jadwal kelas PAI yang sedang berlangsung maupun riwayat pembelajaran yang telah terlaksana beserta rekapan kehadirannya.</p>
          </div>
          <a href="#siswa" class="btn btn-gold btn-sm">🎓 Portal Siswa (Presensi Daring) →</a>
        </div>
      </div>

      <div class="container">
        <div class="grid grid-3" style="margin-bottom:20px;">
          <div class="card card-hover" role="button" tabindex="0" data-riw-status="Sedang Berlangsung" style="cursor:pointer;">
            <span class="tag tag-gold">Sedang Berlangsung</span>
            <div style="font-size:28px;font-weight:800;margin-top:6px;">${totalUpcoming}</div>
            <small style="color:var(--slate-500);">Jadwal aktif terbuka (tampilan kartu)</small>
          </div>
          <div class="card card-hover" role="button" tabindex="0" data-riw-status="Terlaksana" style="cursor:pointer;">
            <span class="tag tag-emerald">Terlaksana</span>
            <div style="font-size:28px;font-weight:800;margin-top:6px;">${totalDone}</div>
            <small style="color:var(--slate-500);">Riwayat pertemuan selesai (tampilan tabel)</small>
          </div>
          <div class="card">
            <span class="tag tag-sky">Info Presensi</span>
            <p style="margin:8px 0 0;font-size:13px;color:var(--slate-700);">
              Halaman ini bersifat pantauan publik. Presensi Daring diisi mandiri di <strong>Portal Siswa</strong> (khusus jadwal <em>Sedang Berlangsung</em>) dan presensi Luring oleh Guru.
            </p>
          </div>
        </div>

        <div class="filter-bar">
          <div class="filter-group">
            <select id="riw-bulan" aria-label="Filter bulan pembelajaran" class="select" style="width:auto;">
              ${MONTHS.map((m) => `<option value="${m.val}" ${state.bulan === m.val ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
            <select id="riw-kelas" aria-label="Filter kelas pembelajaran" class="select" style="width:auto;">
              <option value="Semua">Semua Kelas</option>
              ${classNames.map((c) => `<option value="${escapeHtml(c)}" ${state.kelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <select id="riw-jenis" aria-label="Filter jenis pembelajaran" class="select" style="width:auto;">
              <option value="Semua" ${state.jenis === 'Semua' ? 'selected' : ''}>Daring &amp; Luring</option>
              <option value="Daring" ${state.jenis === 'Daring' ? 'selected' : ''}>Daring</option>
              <option value="Luring" ${state.jenis === 'Luring' ? 'selected' : ''}>Luring</option>
            </select>
          </div>
          <div class="filter-group">
            ${[
        { val: 'Sedang Berlangsung', label: `🟢 Sedang Berlangsung (${totalUpcoming})` },
        { val: 'Terlaksana', label: `✓ Terlaksana (${totalDone})` }
      ]
        .map(
          (st) => `<button type="button" class="tab-btn ${state.status === st.val ? 'active' : ''}" data-riw-status="${st.val}">
                  ${st.label}
                </button>`
        )
        .join('')}
          </div>
        </div>

        ${listHtml}
      </div>
    `;

    document.getElementById('riw-bulan').addEventListener('change', (e) => {
      state.bulan = e.target.value;
      state.donePage = 1;
      render();
    });
    document.getElementById('riw-kelas').addEventListener('change', (e) => {
      state.kelas = e.target.value;
      state.donePage = 1;
      render();
    });
    document.getElementById('riw-jenis').addEventListener('change', (e) => {
      state.jenis = e.target.value;
      state.donePage = 1;
      render();
    });
    container.querySelectorAll('[data-riw-status]').forEach((b) => {
      const pickStatus = () => {
        state.status = b.getAttribute('data-riw-status');
        state.donePage = 1;
        render();
      };
      b.addEventListener('click', pickStatus);
      if (b.tagName !== 'BUTTON') {
        b.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pickStatus();
          }
        });
      }
    });

    const goDoneBtn = document.getElementById('btn-go-terlaksana');
    if (goDoneBtn) {
      goDoneBtn.addEventListener('click', () => {
        state.status = 'Terlaksana';
        state.donePage = 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    const goOngoingBtn = document.getElementById('btn-go-berlangsung');
    if (goOngoingBtn) {
      goOngoingBtn.addEventListener('click', () => {
        state.status = 'Sedang Berlangsung';
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    const psSel = document.getElementById('riw-done-ps');
    if (psSel) {
      psSel.addEventListener('change', () => {
        state.donePageSize = Number(psSel.value || 10);
        state.donePage = 1;
        render();
      });
    }
    const prevBtn = document.getElementById('riw-done-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.donePage > 1) {
          state.donePage -= 1;
          render();
        }
      });
    }
    const nextBtn = document.getElementById('riw-done-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        state.donePage += 1;
        render();
      });
    }

    const resetBtn = document.getElementById('btn-riw-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.bulan = 'Semua';
        state.kelas = 'Semua';
        state.jenis = 'Semua';
        state.donePage = 1;
        render();
      });
    }

    container.querySelectorAll('[data-open-recap]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-open-recap');
        const item = allSchedules.find((x) => x.id === id);
        if (item) openScheduleRecapModal(item);
      });
    });
  }

  render();
};
