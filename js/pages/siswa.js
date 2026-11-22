/**
 * Halaman Portal Siswa (Login Username = NISN & Password = NISN)
 * Dilengkapi Sidebar Menu Kiri khusus Siswa:
 * 1. Dashboard (Ringkasan Belajar, Profil & Pintasan Cepat)
 * 2. Jadwal & Riwayat (Presensi Daring Selfie Kamera & Riwayat Kehadiran)
 * 3. Materi Kelas (Fokus Kartu Materi Sesuai Jenjang Kelas Siswa)
 * 4. Rekap Nilai (Smart Test CBT, Ruang Kritis Dinilai Guru, Tugas, Amaliyah & Renungan)
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.siswa = function renderSiswaPortal(container, routeParams = {}) {
  const {
    escapeHtml,
    safeUrl,
    resolveImageUrl,
    showToast,
    formatDateId,
    renderPasswordInput,
    bindPasswordToggles,
    confirmLogoutAction,
    openSelfieCameraModal,
    openImageLightbox
  } = window.BTD_UI;
  const api = window.BTD_API;
  const pendingSelfies = {};
  const SYNC_COOLDOWN_MS = 2500;

  const portalState = {
    activeTab: ['dashboard', 'jadwal', 'materi', 'nilai', 'profil'].includes(routeParams.tab) ? routeParams.tab : 'dashboard',
    nilaiSub: ['evaluasi', 'ruangKritis', 'tugas', 'amaliyah'].includes(routeParams.sub) ? routeParams.sub : 'evaluasi',
    materiSmt: 'Semua',
    materiElemen: 'Semua',
    materiSearch: ''
  };

  function resolveStudentJenjang(stu) {
    const stuKelas = String((stu && stu.kelas) || '').trim();
    const matchKelas = (api.state.data.kelas || []).find(
      (k) => String(k.namaKelas || '').trim().toLowerCase() === stuKelas.toLowerCase()
    );
    if (matchKelas && matchKelas.jenjang) return String(matchKelas.jenjang).trim().toUpperCase();
    const m = stuKelas.match(/^(XII|XI|X)\b/i);
    if (m) return m[1].toUpperCase();
    return 'X';
  }

  function matchStudentRow(row, stu, stuNisn) {
    if (!row) return false;
    const rNisn = String(row.nisn || row.nis || '').replace(/^'+/, '').trim();
    if (rNisn && stuNisn) return rNisn === stuNisn;
    return String(row.nama || '').trim() === String(stu.nama || '').trim() &&
      String(row.kelas || '').trim() === String(stu.kelas || '').trim();
  }

  function getStudentPortalRecords(stu) {
    const stuNisn = String(stu.nisn || stu.id || '').replace(/^'+/, '').trim();
    const classSchedules = (api.state.data.jadwal || [])
      .filter((j) => String(j.kelas || '').trim() === String(stu.kelas || '').trim())
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    const myAbsensi = (api.state.data.absensi || []).filter((a) => matchStudentRow(a, stu, stuNisn));
    const myEvaluasi = (api.state.data.evaluasi || []).filter((e) => matchStudentRow(e, stu, stuNisn));
    const myRuangKritis = (api.state.data.ruangKritis || []).filter((r) => matchStudentRow(r, stu, stuNisn));
    const myTugas = (api.state.data.tugas || []).filter((t) => matchStudentRow(t, stu, stuNisn));
    const myAmaliyah = (api.state.data.amaliyah || []).filter((a) => matchStudentRow(a, stu, stuNisn));
    const myDiskusi = (api.state.data.diskusi || []).filter((d) => matchStudentRow(d, stu, stuNisn));

    const materiMap = {};
    (api.state.data.materi || []).forEach((m) => {
      if (m && m.id) materiMap[m.id] = m;
    });

    const myHadirCount = myAbsensi.filter((a) => String(a.status || '').toLowerCase() === 'hadir').length;
    const avgCbt = myEvaluasi.length
      ? Math.round(myEvaluasi.reduce((acc, e) => acc + Number(e.skor || 0), 0) / myEvaluasi.length)
      : 0;
    const kritisRatedCount = myRuangKritis.filter(
      (r) => r.nilai !== undefined && r.nilai !== null && String(r.nilai).trim() !== ''
    ).length;

    return {
      stuNisn,
      classSchedules,
      myAbsensi,
      myEvaluasi,
      myRuangKritis,
      myTugas,
      myAmaliyah,
      myDiskusi,
      materiMap,
      myHadirCount,
      avgCbt,
      kritisRatedCount
    };
  }

  function renderDashboardTab(stu, stuJenjang, recs) {
    const ongoingDaringPending = recs.classSchedules.filter((j) => {
      if (j.status !== 'Sedang Berlangsung' || j.jenis !== 'Daring') return false;
      const existing = recs.myAbsensi.find(
        (a) =>
          (a.jadwalId && a.jadwalId === j.id) ||
          (a.tanggal === j.tanggal && a.jadwal === j.jamKe && a.kelas === j.kelas)
      );
      return !(existing && String(existing.status || '').trim().toLowerCase() !== 'belum absen');
    });

    const classMateriCount = (api.state.data.materi || []).filter(
      (m) => m.aktif !== false && String(m.jenjang || '').trim().toUpperCase() === stuJenjang
    ).length;

    return `
      ${
        ongoingDaringPending.length > 0
          ? `<div class="callout callout-emerald" style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <strong>🟢 Ada ${ongoingDaringPending.length} Jadwal Daring Sedang Berlangsung</strong>
                <div style="font-size:13.5px;color:var(--slate-700);margin-top:2px;">
                  ${escapeHtml(ongoingDaringPending[0].materiJudul)} — segera ambil foto selfie presensi.
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-go-stu-tab="jadwal">📸 Isi Presensi Selfie Sekarang →</button>
            </div>`
          : ''
      }

      <div class="grid grid-4" style="margin-bottom:20px;">
        <div class="card card-hover tone-emerald">
          <span class="tag tag-emerald">Kehadiran</span>
          <div style="font-size:28px;font-weight:800;margin-top:8px;color:#065f46;">${recs.myHadirCount}</div>
          <small style="color:var(--slate-600);">Dari ${recs.classSchedules.length} jadwal kelas</small>
        </div>
        <div class="card card-hover tone-sky">
          <span class="tag tag-sky">Rata-Rata Smart Test</span>
          <div style="font-size:28px;font-weight:800;margin-top:8px;color:#0369a1;">${recs.avgCbt}</div>
          <small style="color:var(--slate-600);">${recs.myEvaluasi.length} paket tes selesai</small>
        </div>
        <div class="card card-hover tone-gold">
          <span class="tag tag-gold">Ruang Kritis</span>
          <div style="font-size:28px;font-weight:800;margin-top:8px;color:#b45309;">${recs.kritisRatedCount}/${recs.myRuangKritis.length}</div>
          <small style="color:var(--slate-600);">Sudah dinilai guru</small>
        </div>
        <div class="card card-hover tone-violet">
          <span class="tag tag-violet">Materi Kelas ${escapeHtml(stuJenjang)}</span>
          <div style="font-size:28px;font-weight:800;margin-top:8px;color:#6d28d9;">${classMateriCount}</div>
          <small style="color:var(--slate-600);">${recs.myTugas.length} tugas • ${recs.myAmaliyah.length} amaliyah</small>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <span class="tag tag-emerald">Profil Peserta Didik</span>
          <h2 style="margin:10px 0 12px;">${escapeHtml(stu.nama)}</h2>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><th>NISN</th><td><strong>${escapeHtml(recs.stuNisn)}</strong></td></tr>
                <tr><th>Kelas / Jenjang</th><td><span class="tag tag-emerald">${escapeHtml(stu.kelas)}</span> <span class="tag tag-sky">Kelas ${escapeHtml(stuJenjang)}</span></td></tr>
                <tr><th>Jenis Kelamin</th><td>${stu.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td></tr>
                <tr><th>Status Keaktifan</th><td><span class="tag tag-gold">${escapeHtml(stu.status || 'Aktif')}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <span class="tag tag-sky">Pintasan Belajar Fokus</span>
          <h3 style="margin:10px 0 8px;">Aktivitas Kelas ${escapeHtml(stuJenjang)} Anda</h3>
          <p style="margin:0 0 14px;font-size:13.8px;color:var(--slate-600);">
            Gunakan menu kiri Portal Siswa untuk mengakses jadwal &amp; presensi selfie, membaca modul khusus Kelas ${escapeHtml(stuJenjang)}, serta memantau semua nilai dan catatan guru.
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button type="button" class="btn btn-primary" data-go-stu-tab="materi">📚 Buka Materi Khusus Kelas ${escapeHtml(stuJenjang)} →</button>
            <button type="button" class="btn btn-gold" data-go-stu-tab="nilai">🏆 Pantau Rekap Nilai &amp; Jawaban Saya →</button>
            <button type="button" class="btn btn-outline" data-go-stu-tab="jadwal">📅 Jadwal &amp; Presensi Daring Kelas ${escapeHtml(stu.kelas)}</button>
            <button type="button" class="btn btn-outline" data-go-stu-tab="profil">👤 Lihat Profil Lengkap Saya →</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderScheduleCard(j, recs) {
    const existingRec = recs.myAbsensi.find(
      (a) =>
        (a.jadwalId && a.jadwalId === j.id) ||
        (a.tanggal === j.tanggal && a.jadwal === j.jamKe && a.kelas === j.kelas)
    );
    const isOngoing = j.status === 'Sedang Berlangsung';
    const isDaring = j.jenis === 'Daring';
    const hasSubmitted = Boolean(existingRec && String(existingRec.status || '').trim().toLowerCase() !== 'belum absen');
    const canSelfCheckIn = isOngoing && isDaring && !hasSubmitted;
    const snapped = pendingSelfies[j.id] || null;
    const savedFotoUrl = (existingRec && existingRec.fotoUrl) || '';

    return `<div class="callout ${canSelfCheckIn ? 'callout-emerald' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="tag ${isDaring ? 'tag-sky' : 'tag-gold'}">${isDaring ? '💻 Daring' : '🏫 Luring'}</span>
            <span class="tag ${isOngoing ? 'tag-gold' : 'tag-emerald'}">${isOngoing ? '🟢 Sedang Berlangsung' : '✓ Terlaksana'}</span>
            <span class="tag">📅 ${formatDateId(j.tanggal)} • ${escapeHtml(j.jamKe)}</span>
          </div>
          <h3 style="margin:0 0 4px;font-size:16.5px;">${escapeHtml(j.materiJudul)}</h3>
          ${j.catatan ? `<p style="margin:0;font-size:13.3px;color:var(--slate-600);">${escapeHtml(j.catatan)}</p>` : ''}
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${
            hasSubmitted
              ? `<span class="tag tag-emerald">✓ Presensi Anda: ${escapeHtml(existingRec.status)}</span>
                 ${isDaring && savedFotoUrl
                  ? `<button type="button" class="btn btn-gold btn-sm" data-stu-view-foto="${escapeHtml(savedFotoUrl)}" data-stu-foto-label="${escapeHtml(j.materiJudul)} (${formatDateId(j.tanggal)})">📸 Lihat Foto Selfie</button>`
                  : ''
                }`
              : !isOngoing
                ? `<span class="tag tag-rose">🔒 Terlaksana — Presensi Ditutup</span>`
                : !isDaring
                  ? `<span class="tag tag-gold">🏫 Tatap Muka — Dicatat Guru</span>`
                  : `<span class="tag tag-slate">⏳ Belum Absen</span>`
          }
        </div>
      </div>

      ${
        canSelfCheckIn
          ? `<form class="stu-absen-form" data-jadwal-id="${escapeHtml(j.id)}" style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--emerald-600);">
              <div class="form-row-2">
                <div class="field">
                  <label for="st-abs-status-${escapeHtml(j.id)}">Status Kehadiran</label>
                  <select id="st-abs-status-${escapeHtml(j.id)}" class="select stu-abs-status">
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </div>
                <div class="field">
                  <label for="st-abs-note-${escapeHtml(j.id)}">Keterangan (Opsional)</label>
                  <input id="st-abs-note-${escapeHtml(j.id)}" class="input stu-abs-note" placeholder="Contoh: Hadir mengikuti pembelajaran daring..." />
                </div>
              </div>

              <div class="selfie-box">
                <div class="selfie-box-meta">
                  <div id="st-selfie-preview-${escapeHtml(j.id)}" class="selfie-preview-thumb">
                    ${snapped ? `<img src="${escapeHtml(snapped.dataUrl)}" alt="Foto Selfie Presensi" />` : `<span>📷</span>`}
                  </div>
                  <div>
                    <strong>Wajib Foto Selfie Kamera (Daring)</strong>
                    <small id="st-selfie-info-${escapeHtml(j.id)}" style="display:block;color:var(--slate-600);margin-top:2px;">
                      ${
                        snapped
                          ? `✓ Foto siap (${snapped.kb} KB) — akan tersimpan ke folder absensi Drive.`
                          : 'Ambil selfie langsung via kamera (dikompres 50–100 KB ke folder absensi Drive).'
                      }
                    </small>
                  </div>
                </div>
                <button type="button" class="btn btn-gold btn-sm" data-open-selfie="${escapeHtml(j.id)}" data-selfie-materi="${escapeHtml(j.materiJudul)}">
                  ${snapped ? '🔄 Ambil Ulang Selfie' : '📸 Ambil Foto Selfie'}
                </button>
              </div>

              <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                <button type="submit" class="btn btn-primary">✅ Kirim Presensi Daring</button>
              </div>
            </form>`
          : ''
      }
    </div>`;
  }

  function renderJadwalTab(stu, recs) {
    const ongoingList = recs.classSchedules.filter((j) => j.status === 'Sedang Berlangsung');
    const historyList = recs.classSchedules.filter((j) => j.status !== 'Sedang Berlangsung');

    return `
      <div class="card" style="margin-bottom:20px;">
        <div style="margin-bottom:14px;">
          <h2 style="margin:0 0 4px;">📅 Jadwal Sedang Berlangsung &amp; Presensi Daring (${escapeHtml(stu.kelas)})</h2>
          <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
            Isi presensi mandiri dengan foto selfie kamera khusus untuk pembelajaran <strong>Daring</strong> yang berstatus <strong>Sedang Berlangsung</strong>.
          </p>
        </div>
        ${
          ongoingList.length === 0
            ? `<div class="callout">Saat ini belum ada jadwal berstatus <strong>Sedang Berlangsung</strong> untuk kelas ${escapeHtml(stu.kelas)}. Klik <strong>🔄 Cek Jadwal Terbaru</strong> di atas jika guru baru saja menambah jadwal.</div>`
            : `<div style="display:flex;flex-direction:column;gap:14px;">${ongoingList.map((j) => renderScheduleCard(j, recs)).join('')}</div>`
        }
      </div>

      <div class="card">
        <div style="margin-bottom:14px;">
          <h2 style="margin:0 0 4px;">📜 Riwayat Jadwal &amp; Kehadiran Saya (${historyList.length})</h2>
          <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
            Catatan seluruh pertemuan kelas ${escapeHtml(stu.kelas)} yang sudah terlaksana beserta status kehadiran Anda.
          </p>
        </div>
        ${
          historyList.length === 0
            ? `<p style="margin:0;color:var(--slate-500);">Belum ada riwayat pertemuan terlaksana.</p>`
            : `<div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Materi Pembelajaran</th>
                      <th>Mode</th>
                      <th>Status Hadir</th>
                      <th>Catatan / Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${historyList
                      .map((j) => {
                        const existingRec = recs.myAbsensi.find(
                          (a) =>
                            (a.jadwalId && a.jadwalId === j.id) ||
                            (a.tanggal === j.tanggal && a.jadwal === j.jamKe && a.kelas === j.kelas)
                        );
                        const st = (existingRec && existingRec.status) || 'Belum Absen';
                        const stLow = String(st).toLowerCase();
                        const stClass = stLow === 'hadir'
                          ? 'tag-emerald'
                          : stLow === 'izin'
                            ? 'tag-sky'
                            : stLow === 'sakit'
                              ? 'tag-gold'
                              : stLow === 'alpa'
                                ? 'tag-rose'
                                : 'tag-slate';
                        const savedFotoUrl = (existingRec && existingRec.fotoUrl) || '';
                        return `<tr>
                          <td><strong>${formatDateId(j.tanggal)}</strong><br/><small style="color:var(--slate-500);">${escapeHtml(j.jamKe)}</small></td>
                          <td>${escapeHtml(j.materiJudul)}</td>
                          <td><span class="tag ${j.jenis === 'Daring' ? 'tag-sky' : 'tag-gold'}">${escapeHtml(j.jenis || 'Luring')}</span></td>
                          <td><span class="tag ${stClass}">${escapeHtml(st)}</span></td>
                          <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                              <span>${escapeHtml((existingRec && existingRec.catatan) || '-')}</span>
                              ${savedFotoUrl
                                ? `<button type="button" class="btn btn-gold btn-sm" data-stu-view-foto="${escapeHtml(savedFotoUrl)}" data-stu-foto-label="${escapeHtml(j.materiJudul)} (${formatDateId(j.tanggal)})">📸 Foto</button>`
                                : ''
                              }
                            </div>
                          </td>
                        </tr>`;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;
  }

  function renderMateriKelasTab(stu, stuJenjang) {
    const elemenList = (api.state.data.pengaturan && api.state.data.pengaturan.elemenList) || [];
    const getSmtLabel = (smt) => (String(smt || '1') === '2' ? 'Semester 2 (Genap)' : 'Semester 1 (Ganjil)');

    const classItems = (api.state.data.materi || [])
      .filter((m) => m.aktif !== false && String(m.jenjang || '').trim().toUpperCase() === stuJenjang)
      .filter((m) => portalState.materiSmt === 'Semua' || String(m.semester || (Number(m.bab) <= 5 ? '1' : '2')) === portalState.materiSmt)
      .filter((m) => portalState.materiElemen === 'Semua' || m.elemen === portalState.materiElemen)
      .filter((m) => {
        if (!portalState.materiSearch) return true;
        const q = portalState.materiSearch.toLowerCase();
        return (
          String(m.judul || '').toLowerCase().includes(q) ||
          String(m.ringkasan || '').toLowerCase().includes(q) ||
          String(m.elemen || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(a.bab) - Number(b.bab));

    return `
      <div class="card" style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <div>
            <span class="tag tag-emerald">Fokus Jenjang Kelas ${escapeHtml(stuJenjang)}</span>
            <h2 style="margin:8px 0 4px;">📚 Materi PAI Khusus Kelas ${escapeHtml(stuJenjang)} (${escapeHtml(stu.kelas)})</h2>
            <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
              Halaman ini hanya menampilkan kartu bab pembelajaran untuk jenjang <strong>Kelas ${escapeHtml(stuJenjang)}</strong> agar Anda lebih fokus. Klik kartu mana saja untuk membuka modulnya.
            </p>
          </div>
          <a href="#materi" class="btn btn-outline btn-sm">Lihat Semua Kelas (Menu Umum) ↗</a>
        </div>

        <div class="filter-bar filter-row-3col" style="margin-bottom:0;">
          <select id="stu-flt-smt" aria-label="Filter semester materi siswa" class="select">
            <option value="Semua" ${portalState.materiSmt === 'Semua' ? 'selected' : ''}>Semua Semester (1 &amp; 2)</option>
            <option value="1" ${portalState.materiSmt === '1' ? 'selected' : ''}>Semester 1 (Ganjil)</option>
            <option value="2" ${portalState.materiSmt === '2' ? 'selected' : ''}>Semester 2 (Genap)</option>
          </select>
          <select id="stu-flt-el" aria-label="Filter elemen PAI siswa" class="select">
            <option value="Semua" ${portalState.materiElemen === 'Semua' ? 'selected' : ''}>Semua Elemen PAI</option>
            ${elemenList.map((el) => `<option value="${escapeHtml(el)}" ${portalState.materiElemen === el ? 'selected' : ''}>${escapeHtml(el)}</option>`).join('')}
          </select>
          <input type="search" id="stu-flt-search" aria-label="Cari materi kelas" class="input" placeholder="Cari bab atau topik Kelas ${escapeHtml(stuJenjang)}..." value="${escapeHtml(portalState.materiSearch)}" />
        </div>
      </div>

      ${
        classItems.length === 0
          ? `<div class="card" style="text-align:center;padding:34px;">
              <p style="margin:0 0 12px;color:var(--slate-600);">Belum ada bab materi Kelas ${escapeHtml(stuJenjang)} yang sesuai filter.</p>
              <button type="button" class="btn btn-outline btn-sm" id="btn-stu-reset-mat">Tampilkan Semua Bab Kelas ${escapeHtml(stuJenjang)}</button>
            </div>`
          : `<div class="grid grid-2">
              ${classItems
                .map((m) => {
                  const tajwidCount = (api.state.data.tajwid || []).filter((t) => t.materiId === m.id).length;
                  const coverSrc = resolveImageUrl(m.coverImage);
                  return `
                    <article class="card card-hover materi-catalog-card" data-stu-open-materi="${escapeHtml(m.id)}" role="button" tabindex="0" style="display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                      <div>
                        ${coverSrc ? `<img class="card-cover-img" src="${escapeHtml(coverSrc)}" alt="${escapeHtml(m.judul)}" />` : ''}
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                          <span class="tag tag-emerald">Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)}</span>
                          <span class="tag tag-sky">${escapeHtml(getSmtLabel(m.semester || (Number(m.bab) <= 5 ? '1' : '2')))}</span>
                          <span class="tag tag-gold">${escapeHtml(m.elemen)}</span>
                        </div>
                        <h3 style="margin:0 0 6px;font-size:16.5px;line-height:1.35;color:var(--slate-900);">${escapeHtml(m.judul)}</h3>
                        <p style="margin:0;font-size:13.3px;color:var(--slate-600);">${escapeHtml(m.ringkasan)}</p>
                      </div>
                      <div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                          ${tajwidCount ? `<span class="tag tag-sky">🔎 ${tajwidCount} Tajwid</span>` : ''}
                          ${m.youtubeId ? `<span class="tag">▶️ Video</span>` : ''}
                          ${m.lkpdUrl ? `<span class="tag">📄 E-LKPD</span>` : ''}
                        </div>
                        <span class="btn btn-primary btn-block">Buka Modul Pembelajaran →</span>
                      </div>
                    </article>
                  `;
                })
                .join('')}
            </div>`
      }
    `;
  }

  function renderNilaiTab(stu, recs) {
    const getPredikat = (skor) => {
      const n = Number(skor || 0);
      if (n >= 90) return { label: 'Mumtaz (A)', cls: 'tag-emerald' };
      if (n >= 80) return { label: 'Sangat Baik (B)', cls: 'tag-sky' };
      if (n >= 75) return { label: 'Baik / Tuntas', cls: 'tag-gold' };
      return { label: 'Perlu Penguatan', cls: 'tag-rose' };
    };

    const subTabs = [
      { id: 'evaluasi', label: `📝 Smart Test CBT (${recs.myEvaluasi.length})` },
      { id: 'ruangKritis', label: `🧠 Ruang Kritis (${recs.myRuangKritis.length})` },
      { id: 'tugas', label: `📤 Tugas / E-LKPD (${recs.myTugas.length})` },
      { id: 'amaliyah', label: `🌟 Amaliyah & Renungan (${recs.myAmaliyah.length + recs.myDiskusi.length})` }
    ];

    let innerHtml = '';
    if (portalState.nilaiSub === 'evaluasi') {
      const maxCbt = recs.myEvaluasi.length ? Math.max(...recs.myEvaluasi.map((e) => Number(e.skor || 0))) : 0;
      innerHtml = `
        <div class="grid grid-3" style="margin-bottom:16px;">
          <div class="callout callout-emerald"><strong>Total Tes Dikerjakan:</strong><div style="font-size:22px;font-weight:800;margin-top:4px;">${recs.myEvaluasi.length} Kali</div></div>
          <div class="callout callout-gold"><strong>Rata-Rata Nilai CBT:</strong><div style="font-size:22px;font-weight:800;margin-top:4px;">${recs.avgCbt}</div></div>
          <div class="callout"><strong>Nilai Tertinggi:</strong><div style="font-size:22px;font-weight:800;margin-top:4px;">${maxCbt}</div></div>
        </div>
        ${
          recs.myEvaluasi.length === 0
            ? `<div class="callout">Anda belum mengerjakan Evaluasi Smart Test CBT. Buka menu <strong>Materi Kelas</strong> lalu pilih tab <strong>5. Evaluasi</strong> pada bab materi.</div>`
            : `<div class="table-wrap">
                <table>
                  <thead><tr><th>No</th><th>Tanggal</th><th>Paket Materi</th><th>Skor</th><th>Benar</th><th>Predikat</th><th>Durasi</th></tr></thead>
                  <tbody>
                    ${recs.myEvaluasi
                      .map((e, idx) => {
                        const pred = getPredikat(e.skor);
                        return `<tr>
                          <td>${idx + 1}</td>
                          <td>${formatDateId(e.timestamp)}</td>
                          <td><strong>Kelas ${escapeHtml(e.jenjang || '-')} • Bab ${escapeHtml(e.bab || '-')}</strong></td>
                          <td>
                            <strong style="font-size:15px;">${escapeHtml(e.skor)}</strong>
                            ${e.catatanGuru ? `<div style="margin-top:2px;font-size:11.5px;color:var(--emerald-900);">💬 ${escapeHtml(e.catatanGuru)}</div>` : ''}
                          </td>
                          <td>${escapeHtml(e.benar || 0)} / ${escapeHtml(e.totalSoal || 0)}</td>
                          <td><span class="tag ${pred.cls}">${pred.label}</span></td>
                          <td>${escapeHtml(e.waktuDetik || 0)} dtk</td>
                        </tr>`;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      `;
    } else if (portalState.nilaiSub === 'ruangKritis') {
      innerHtml = recs.myRuangKritis.length === 0
        ? `<div class="callout">Anda belum mengirim jawaban Ruang Kritis HOTS. Buka bab materi di menu <strong>Materi Kelas</strong> lalu isi tab <strong>4. Ruang Kritis (HOTS)</strong>.</div>`
        : `<div style="display:flex;flex-direction:column;gap:12px;">
            ${recs.myRuangKritis
              .map((r) => {
                const mat = recs.materiMap[r.materiId];
                const matLabel = mat ? `Bab ${mat.bab}: ${mat.judul}` : (r.materiId || 'Materi PAI');
                const hasNilai = r.nilai !== undefined && r.nilai !== null && String(r.nilai).trim() !== '';
                const isCurated = r.dikurasi === true || String(r.dikurasi) === 'true';
                return `<div style="padding:14px;border-radius:14px;background:var(--slate-50);border:1px solid var(--slate-200);border-left:4px solid var(--emerald-700);">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                      <span class="tag tag-sky">${escapeHtml(matLabel)}</span>
                      <span class="tag tag-gold">${escapeHtml(r.nilaiKbc || 'Nilai KBC')}</span>
                      ${hasNilai
                        ? `<span class="tag tag-emerald" style="font-weight:800;">🏆 Nilai Guru: ${escapeHtml(String(r.nilai))}</span>`
                        : `<span class="tag tag-slate">⏳ Menunggu Penilaian Guru</span>`
                      }
                      ${isCurated ? '<span class="tag tag-sky">🌟 Terkurasi</span>' : ''}
                    </div>
                    <small style="color:var(--slate-500);">${formatDateId(r.timestamp)}</small>
                  </div>
                  <p style="margin:0;font-size:13.8px;color:var(--slate-800);white-space:pre-line;">${escapeHtml(r.analisis || '')}</p>
                  ${r.catatanGuru
                    ? `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:var(--emerald-50);border:1px solid #a7f3d0;font-size:13px;color:var(--emerald-900);"><strong>💬 Catatan Guru:</strong> ${escapeHtml(r.catatanGuru)}</div>`
                    : ''
                  }
                </div>`;
              })
              .join('')}
          </div>`;
    } else if (portalState.nilaiSub === 'tugas') {
      innerHtml = recs.myTugas.length === 0
        ? `<div class="callout">Belum ada tugas / E-LKPD yang Anda kirimkan.</div>`
        : `<div class="table-wrap">
            <table>
              <thead><tr><th>No</th><th>Tanggal</th><th>Bab / Materi</th><th>Jenis Tugas</th><th>Berkas / Tautan</th><th>Catatan Siswa</th><th>Nilai &amp; Catatan Guru</th></tr></thead>
              <tbody>
                ${recs.myTugas
                  .map((t, i) => {
                    const navSafe = (window.BTD_UI && window.BTD_UI.safeNavUrl) || safeUrl;
                    const url = navSafe(t.fileUrl);
                    const hasNilai = t.nilai !== undefined && t.nilai !== null && String(t.nilai).trim() !== '';
                    return `<tr>
                      <td>${i + 1}</td>
                      <td>${formatDateId(t.timestamp)}</td>
                      <td><strong>${escapeHtml(t.bab || '-')}</strong></td>
                      <td><span class="tag tag-sky">${escapeHtml(t.jenisTugas || '-')}</span></td>
                      <td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Buka Berkas ↗</a>` : escapeHtml(t.fileUrl || '-')}</td>
                      <td>${escapeHtml(t.catatan || '-')}</td>
                      <td>
                        ${hasNilai
                          ? `<span class="tag tag-emerald" style="font-weight:800;">🏆 ${escapeHtml(String(t.nilai))}</span>`
                          : `<span class="tag tag-slate">Menunggu Penilaian</span>`}
                        ${t.catatanGuru ? `<div style="margin-top:4px;font-size:12px;color:var(--emerald-900);">💬 ${escapeHtml(t.catatanGuru)}</div>` : ''}
                      </td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>`;
    } else {
      innerHtml = `
        <div class="grid grid-2">
          <div>
            <h3 style="margin:0 0 10px;">🌟 Jurnal Amaliyah KBC (${recs.myAmaliyah.length})</h3>
            ${
              recs.myAmaliyah.length === 0
                ? `<p style="color:var(--slate-500);font-size:13.8px;">Belum ada jurnal amaliyah tercatat.</p>`
                : `<div style="display:flex;flex-direction:column;gap:10px;">
                    ${recs.myAmaliyah
                      .map((a) => {
                        const hasNilai = a.nilai !== undefined && a.nilai !== null && String(a.nilai).trim() !== '';
                        return `<div class="callout callout-emerald">
                          <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-bottom:6px;align-items:center;">
                            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                              <strong>${escapeHtml(a.bab || 'Amaliyah KBC')}</strong>
                              ${hasNilai
                                ? `<span class="tag tag-emerald" style="font-weight:800;">🏆 Nilai Guru: ${escapeHtml(String(a.nilai))}</span>`
                                : ''}
                            </div>
                            <small>${formatDateId(a.timestamp)}</small>
                          </div>
                          <p style="margin:0 0 4px;font-size:13.3px;"><strong>Pencapaian:</strong> ${escapeHtml(a.pencapaianTerbaik || '-')}</p>
                          <p style="margin:0;font-size:13px;color:var(--emerald-900);"><strong>❤️ Aksi KBC:</strong> ${escapeHtml(a.refleksiKbc || '-')}</p>
                          ${a.catatanGuru
                            ? `<div style="margin-top:8px;padding:7px 10px;border-radius:8px;background:#ffffff;border:1px solid #a7f3d0;font-size:12.5px;color:var(--emerald-900);"><strong>💬 Catatan Guru:</strong> ${escapeHtml(a.catatanGuru)}</div>`
                            : ''}
                        </div>`;
                      })
                      .join('')}
                  </div>`
            }
          </div>
          <div>
            <h3 style="margin:0 0 10px;">💬 Ruang Renungan Saya (${recs.myDiskusi.length})</h3>
            ${
              recs.myDiskusi.length === 0
                ? `<p style="color:var(--slate-500);font-size:13.8px;">Belum ada renungan pembelajaran tercatat.</p>`
                : `<div style="display:flex;flex-direction:column;gap:10px;">
                    ${recs.myDiskusi
                      .map((d) => {
                        const mat = recs.materiMap[d.materiId];
                        return `<div style="padding:12px;border-radius:12px;background:var(--slate-50);border:1px solid var(--slate-200);">
                          <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                            <span class="tag tag-sky">${escapeHtml(mat ? `Bab ${mat.bab}: ${mat.judul}` : (d.materiId || 'Renungan'))}</span>
                            <small style="color:var(--slate-500);">${formatDateId(d.timestamp)}</small>
                          </div>
                          <p style="margin:0;font-size:13.5px;color:var(--slate-800);">${escapeHtml(d.pesan || '')}</p>
                        </div>`;
                      })
                      .join('')}
                  </div>`
            }
          </div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div style="margin-bottom:14px;">
          <h2 style="margin:0 0 4px;">🏆 Rekap Nilai &amp; Portofolio Jawaban Saya</h2>
          <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
            Pantau seluruh nilai Smart Test CBT, nilai jawaban Ruang Kritis dari Guru PAI, tugas terkumpul, dan jurnal amaliyah Anda.
          </p>
        </div>
        <div class="tabs no-print" style="margin-bottom:16px;">
          ${subTabs.map((st) => `<button type="button" class="tab-btn ${portalState.nilaiSub === st.id ? 'active' : ''}" data-stu-nilai-sub="${st.id}">${escapeHtml(st.label)}</button>`).join('')}
        </div>
        ${innerHtml}
      </div>
    `;
  }

  function renderProfilTab(stu, stuJenjang, recs, stuRem) {
    const isCustomPass = Boolean(stu && stu.hasCustomPassword);
    return `
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card">
          <span class="tag tag-emerald">Identitas Resmi Peserta Didik</span>
          <h2 style="margin:10px 0 12px;">👤 ${escapeHtml(stu.nama)}</h2>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><th>Nama Lengkap</th><td><strong>${escapeHtml(stu.nama)}</strong></td></tr>
                <tr><th>NISN</th><td><code>${escapeHtml(recs.stuNisn)}</code></td></tr>
                <tr><th>Kelas</th><td><span class="tag tag-emerald">${escapeHtml(stu.kelas)}</span></td></tr>
                <tr><th>Jenjang Materi</th><td><span class="tag tag-sky">Kelas ${escapeHtml(stuJenjang)}</span></td></tr>
                <tr><th>Jenis Kelamin</th><td>${stu.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td></tr>
                <tr><th>Status Akun</th><td><span class="tag tag-gold">${escapeHtml(stu.status || 'Aktif')}</span></td></tr>
                <tr><th>Status Password</th><td>${isCustomPass ? '<span class="tag tag-emerald">🔐 Password Kustom</span>' : `<span class="tag tag-slate">Standar NISN (${escapeHtml(recs.stuNisn)})</span>`}</td></tr>
                <tr><th>Sesi Login Aktif</th><td>${stuRem ? `⏳ Tersisa ${escapeHtml(stuRem)}` : 'Aktif (6 Jam)'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <span class="tag tag-sky">Ringkasan Data &amp; Aktivitas Akun</span>
          <h3 style="margin:10px 0 12px;">Catatan Belajar Tercatat</h3>
          <div class="grid grid-2" style="margin-bottom:14px;">
            <div class="callout callout-emerald"><strong>Hadir Tercatat</strong><div style="font-size:20px;font-weight:800;margin-top:4px;">${recs.myHadirCount}x</div></div>
            <div class="callout"><strong>Smart Test CBT</strong><div style="font-size:20px;font-weight:800;margin-top:4px;">${recs.myEvaluasi.length} Tes (Rata: ${recs.avgCbt})</div></div>
            <div class="callout callout-gold"><strong>Ruang Kritis</strong><div style="font-size:20px;font-weight:800;margin-top:4px;">${recs.myRuangKritis.length} Jawaban</div></div>
            <div class="callout"><strong>Tugas &amp; Amaliyah</strong><div style="font-size:20px;font-weight:800;margin-top:4px;">${recs.myTugas.length} Tugas • ${recs.myAmaliyah.length} Amaliyah</div></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-prof-sync">🔄 Sinkronkan Data</button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-prof-logout">🚪 Keluar Akun Siswa</button>
          </div>
        </div>
      </div>

      <div class="card">
        <span class="tag tag-violet">Keamanan Akun Siswa</span>
        <h3 style="margin:8px 0 6px;">🔐 Ubah Password Akun Saya</h3>
        <p style="margin:0 0 14px;font-size:13.5px;color:var(--slate-600);">
          Secara standar, password awal menggunakan NISN Anda. Anda dapat mengganti password kapan saja minimal 4 karakter; bila lupa, mintalah Guru PAI untuk me-reset ke NISN.
        </p>
        <form id="form-stu-change-pass" class="form-grid">
          <div class="form-row-2">
            <div class="field">
              <label for="stu-new-pass">Password Baru (Minimal 4 Karakter)</label>
              ${renderPasswordInput({
                id: 'stu-new-pass',
                placeholder: 'Masukkan password baru...',
                autocomplete: 'new-password'
              })}
            </div>
            <div class="field">
              <label for="stu-confirm-pass">Ulangi Password Baru</label>
              ${renderPasswordInput({
                id: 'stu-confirm-pass',
                placeholder: 'Ketik ulang password baru...',
                autocomplete: 'new-password'
              })}
            </div>
          </div>
          <div id="stu-pass-feedback" class="callout" role="alert" style="padding:10px 14px;background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:13.2px;font-weight:700;" hidden></div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary" id="btn-stu-save-pass">💾 Simpan Password Baru</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderLogin() {
    window.__btdSiswaDirty = false;
    window.__btdStudentActiveTab = 'dashboard';
    if (typeof window.BTD_UI.syncChromeMetadata === 'function') window.BTD_UI.syncChromeMetadata();
    const demoHint = !api.state.isLive
      ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--emerald-800);">Contoh Demo Lokal: Username &amp; Password <code>0091000101</code> (Ahmad Fauzan — X M1).</p>`
      : '';

    container.innerHTML = `
      <div class="page-banner">
        <div class="container">
          <span class="eyebrow">Akun Pribadi Peserta Didik PAI</span>
          <h1>Portal Siswa — Bilik Tarbiyah Digital</h1>
          <p>Masuk dengan NISN Anda untuk melihat profil pembelajaran, materi fokus kelas, rekap nilai, dan presensi Daring.</p>
        </div>
      </div>

      <div class="container" style="max-width:520px;">
        <div class="card">
          <h2 style="margin:0 0 8px;">🎓 Login Siswa</h2>
          <p style="margin:0 0 14px;color:var(--slate-600);font-size:13.8px;">
            Gunakan <strong>NISN</strong> Anda sebagai Username dan Password.
            ${demoHint}
          </p>
          <form id="form-student-login" class="form-grid">
            <div class="field">
              <label for="stu-nisn-input">Username (NISN)</label>
              <input id="stu-nisn-input" type="text" class="input" required placeholder="Masukkan NISN Anda" autocomplete="username" />
            </div>
            <div class="field">
              <label for="stu-pass-input">Password (NISN)</label>
              ${renderPasswordInput({
                id: 'stu-pass-input',
                required: true,
                placeholder: 'Masukkan NISN sebagai password',
                autocomplete: 'current-password'
              })}
            </div>
            <button type="submit" class="btn btn-primary" id="btn-stu-login">Masuk ke Portal Siswa</button>
          </form>
          <div class="login-loading-banner" id="stu-loading-banner" hidden>
            <span class="spinner-inline dark"></span>
            <span>Memverifikasi NISN dan memuat data pembelajaran Anda...</span>
          </div>
          <div id="stu-error-box" class="callout" style="margin-top:12px;background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:13.5px;font-weight:600;" hidden></div>
        </div>
      </div>
    `;

    bindPasswordToggles(container);

    const form = document.getElementById('form-student-login');
    const nisnInp = document.getElementById('stu-nisn-input');
    const passInp = document.getElementById('stu-pass-input');
    const btn = document.getElementById('btn-stu-login');
    const loading = document.getElementById('stu-loading-banner');
    const errBox = document.getElementById('stu-error-box');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.hidden = true;
      btn.disabled = true;
      nisnInp.readOnly = true;
      passInp.readOnly = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Memverifikasi NISN...';
      loading.hidden = false;

      try {
        const student = await api.verifyStudent(nisnInp.value, passInp.value);
        if (student) {
          window.__btdSiswaDirty = false;
          window.__btdLastStudentSyncAt = Date.now();
          if (typeof window.BTD_UI.syncChromeMetadata === 'function') window.BTD_UI.syncChromeMetadata();
          showToast(`Selamat datang, ${student.nama}!`);
          renderProfileAndAttendance();
        } else {
          loading.hidden = true;
          errBox.textContent = 'NISN atau password tidak cocok dengan data siswa aktif yang terdaftar oleh guru.';
          errBox.hidden = false;
          btn.disabled = false;
          nisnInp.readOnly = false;
          passInp.readOnly = false;
          btn.textContent = 'Masuk ke Portal Siswa';
        }
      } catch (err) {
        loading.hidden = true;
        errBox.textContent = 'Gagal terhubung ke server: ' + err.message;
        errBox.hidden = false;
        btn.disabled = false;
        nisnInp.readOnly = false;
        passInp.readOnly = false;
        btn.textContent = 'Masuk ke Portal Siswa';
      }
    });
  }

  function renderProfileAndAttendance() {
    const stuValid = typeof api.isStudentSessionValid === 'function' ? api.isStudentSessionValid() : Boolean(api.state.studentSession);
    const stu = stuValid ? api.state.studentSession : null;
    if (!stu) {
      renderLogin();
      return;
    }

    const stuJenjang = resolveStudentJenjang(stu);
    const recs = getStudentPortalRecords(stu);
    const stuRem = typeof api.getSessionRemainingText === 'function' ? api.getSessionRemainingText('student') : '';
    if (typeof window !== 'undefined') {
      window.__btdStudentActiveTab = portalState.activeTab;
    }

    const sidebarMenu = [
      { id: 'dashboard', label: '📊 Dashboard' },
      { id: 'jadwal', label: '📅 Jadwal & Riwayat' },
      { id: 'materi', label: `📚 Materi Kelas ${stuJenjang}` },
      { id: 'nilai', label: '🏆 Rekap Nilai' },
      { id: 'profil', label: '👤 Profil Saya' }
    ];

    let tabBody = '';
    if (portalState.activeTab === 'dashboard') {
      tabBody = renderDashboardTab(stu, stuJenjang, recs);
    } else if (portalState.activeTab === 'jadwal') {
      tabBody = renderJadwalTab(stu, recs);
    } else if (portalState.activeTab === 'materi') {
      tabBody = renderMateriKelasTab(stu, stuJenjang);
    } else if (portalState.activeTab === 'profil') {
      tabBody = renderProfilTab(stu, stuJenjang, recs, stuRem);
    } else {
      tabBody = renderNilaiTab(stu, recs);
    }

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Portal Siswa PAI • Kelas ${escapeHtml(stu.kelas)} (Jenjang ${escapeHtml(stuJenjang)})</span>
            <h1>Assalamu'alaikum, ${escapeHtml(stu.nama)}</h1>
            <p>NISN: <strong>${escapeHtml(recs.stuNisn)}</strong> • Status: <strong>${escapeHtml(stu.status || 'Aktif')}</strong>${stuRem ? ` • Sesi aktif ${escapeHtml(stuRem)}` : ''}</p>
            <small id="stu-sync-status" style="display:block;margin-top:4px;opacity:0.92;font-size:12px;" hidden>🔄 Menyinkronkan jadwal &amp; nilai terbaru...</small>
          </div>
          <div class="student-banner-actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-sm" id="btn-stu-refresh-jadwal" style="background:rgba(255,255,255,0.16);color:#fff;border:1px solid rgba(255,255,255,0.38);">🔄 Cek Data Terbaru</button>
            <button type="button" class="btn btn-gold btn-sm btn-stu-banner-logout" id="btn-stu-logout">Keluar Akun</button>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="admin-layout student-portal-layout">
          <aside class="admin-sidebar no-print" aria-label="Menu Sidebar Portal Siswa">
            <div class="admin-sidebar-label">Menu Khusus Siswa</div>
            ${sidebarMenu
              .map(
                (item) => `<button type="button" class="admin-side-btn ${portalState.activeTab === item.id ? 'active' : ''}" data-stu-tab="${item.id}">${escapeHtml(item.label)}</button>`
              )
              .join('')}
            <div class="admin-sidebar-label" style="margin-top:6px;">Menu Umum</div>
            <a href="#materi" class="admin-side-btn">🌐 Ruang Materi Umum ↗</a>
          </aside>
          <section class="admin-main">${tabBody}</section>
        </div>
      </div>
    `;

    if (typeof window.BTD_UI.syncChromeMetadata === 'function') {
      window.BTD_UI.syncChromeMetadata();
    }
    if (typeof bindPasswordToggles === 'function') {
      bindPasswordToggles(container);
    }

    const changePassForm = document.getElementById('form-stu-change-pass');
    if (changePassForm) {
      changePassForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const newEl = document.getElementById('stu-new-pass');
        const confirmEl = document.getElementById('stu-confirm-pass');
        const errBox = document.getElementById('stu-pass-feedback');
        const saveBtn = document.getElementById('btn-stu-save-pass');
        const newVal = newEl ? newEl.value.trim() : '';
        const confirmVal = confirmEl ? confirmEl.value.trim() : '';

        if (errBox) errBox.hidden = true;
        if (!newVal || newVal.length < 4) {
          if (errBox) {
            errBox.textContent = '⚠️ Password baru minimal harus 4 karakter.';
            errBox.hidden = false;
          }
          if (newEl) newEl.focus();
          return;
        }
        if (newVal !== confirmVal) {
          if (errBox) {
            errBox.textContent = '⚠️ Password baru dan ulangi password baru tidak cocok.';
            errBox.hidden = false;
          }
          if (confirmEl) confirmEl.focus();
          return;
        }

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<span class="spinner-inline"></span> Menyimpan Password...';
        }
        try {
          await api.changeStudentPassword(newVal, confirmVal);
          showToast('Password akun siswa berhasil diperbarui!');
          renderProfileAndAttendance();
        } catch (err) {
          if (errBox) {
            errBox.textContent = '⚠️ ' + (err && err.message ? err.message : 'Gagal mengubah password.');
            errBox.hidden = false;
          }
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Simpan Password Baru';
          }
        }
      });
    }

    container.querySelectorAll('[data-stu-tab], [data-go-stu-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTab = btn.getAttribute('data-stu-tab') || btn.getAttribute('data-go-stu-tab');
        if (!nextTab) return;
        portalState.activeTab = nextTab;
        if (typeof window !== 'undefined') window.__btdStudentActiveTab = nextTab;
        renderProfileAndAttendance();
      });
    });

    container.querySelectorAll('[data-stu-nilai-sub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        portalState.nilaiSub = btn.getAttribute('data-stu-nilai-sub') || 'evaluasi';
        renderProfileAndAttendance();
      });
    });

    const smtSel = document.getElementById('stu-flt-smt');
    if (smtSel) {
      smtSel.addEventListener('change', () => {
        portalState.materiSmt = smtSel.value;
        renderProfileAndAttendance();
      });
    }
    const elSel = document.getElementById('stu-flt-el');
    if (elSel) {
      elSel.addEventListener('change', () => {
        portalState.materiElemen = elSel.value;
        renderProfileAndAttendance();
      });
    }
    const searchInp = document.getElementById('stu-flt-search');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        portalState.materiSearch = searchInp.value;
        renderProfileAndAttendance();
        const fresh = document.getElementById('stu-flt-search');
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(fresh.value.length, fresh.value.length);
        }
      });
    }
    const resetMatBtn = document.getElementById('btn-stu-reset-mat');
    if (resetMatBtn) {
      resetMatBtn.addEventListener('click', () => {
        portalState.materiSmt = 'Semua';
        portalState.materiElemen = 'Semua';
        portalState.materiSearch = '';
        renderProfileAndAttendance();
      });
    }

    container.querySelectorAll('[data-stu-open-materi]').forEach((cardEl) => {
      const openMat = () => {
        const id = cardEl.getAttribute('data-stu-open-materi');
        if (id) window.location.hash = `#materi?id=${encodeURIComponent(id)}&from=siswa`;
      };
      cardEl.addEventListener('click', openMat);
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openMat();
        }
      });
    });

    const doStudentLogout = () => {
      const performLogout = () => {
        Object.keys(pendingSelfies).forEach((k) => delete pendingSelfies[k]);
        window.__btdSiswaDirty = false;
        window.__btdStudentActiveTab = 'dashboard';
        api.logoutStudent();
        showToast('Anda telah keluar dari Akun Siswa.', 'warning');
        renderLogin();
      };
      if (typeof confirmLogoutAction === 'function') {
        confirmLogoutAction({
          roleLabel: 'Akun Siswa',
          accountName: `${stu.nama} (${stu.kelas || '-'})`,
          onConfirmLogout: performLogout
        });
      } else {
        performLogout();
      }
    };
    document.getElementById('btn-stu-logout').addEventListener('click', doStudentLogout);
    const profLogoutBtn = document.getElementById('btn-prof-logout');
    if (profLogoutBtn) profLogoutBtn.addEventListener('click', doStudentLogout);

    const refreshJadwalBtn = document.getElementById('btn-stu-refresh-jadwal');
    const profSyncBtn = document.getElementById('btn-prof-sync');
    if (profSyncBtn && refreshJadwalBtn) {
      profSyncBtn.addEventListener('click', () => refreshJadwalBtn.click());
    }
    const syncStatusEl = document.getElementById('stu-sync-status');
    if (refreshJadwalBtn) {
      refreshJadwalBtn.addEventListener('click', async () => {
        if (!api.getConfiguredApiUrl || !api.getConfiguredApiUrl()) {
          renderProfileAndAttendance();
          showToast('Tampilan data lokal diperbarui.');
          return;
        }
        refreshJadwalBtn.disabled = true;
        refreshJadwalBtn.innerHTML = '<span class="spinner-inline"></span> Mengecek...';
        window.__btdLastStudentSyncAt = Date.now();
        try {
          const syncRes = await api.syncStudentPortalData();
          if (syncRes && syncRes.updated) {
            renderProfileAndAttendance();
            showToast(syncRes.changed ? 'Jadwal & nilai terbaru berhasil dimuat!' : 'Data portal siswa sudah paling baru.');
          } else {
            showToast('Belum ada pembaruan dari server Apps Script.', 'warning');
          }
        } catch (err) {
          showToast('Gagal menyinkronkan data: ' + (err && err.message ? err.message : err), 'error');
        } finally {
          if (document.body.contains(refreshJadwalBtn)) {
            refreshJadwalBtn.disabled = false;
            refreshJadwalBtn.textContent = '🔄 Cek Data Terbaru';
          }
        }
      });
    }

    container.querySelectorAll('.stu-abs-note, .stu-abs-status').forEach((el) => {
      el.addEventListener('input', () => {
        window.__btdSiswaDirty = true;
      });
      el.addEventListener('change', () => {
        window.__btdSiswaDirty = true;
      });
    });

    if (
      typeof api.syncStudentPortalData === 'function' &&
      api.getConfiguredApiUrl &&
      api.getConfiguredApiUrl() &&
      Date.now() - Number(window.__btdLastStudentSyncAt || 0) > SYNC_COOLDOWN_MS
    ) {
      window.__btdLastStudentSyncAt = Date.now();
      if (syncStatusEl) syncStatusEl.hidden = false;
      api.syncStudentPortalData().then((syncRes) => {
        if (!document.body.contains(container)) return;
        const hashNow = String(window.location.hash || '').replace(/^#/, '').split('?')[0];
        const modalOpen = document.querySelector('#app-modal:not([hidden])');
        if (syncStatusEl) syncStatusEl.hidden = true;
        if (syncRes && syncRes.changed && hashNow === 'siswa' && !window.__btdSiswaDirty && !modalOpen) {
          renderProfileAndAttendance();
        }
      });
    }

    container.querySelectorAll('[data-stu-view-foto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-stu-view-foto') || '';
        const lbl = btn.getAttribute('data-stu-foto-label') || '';
        if (typeof openImageLightbox === 'function') {
          openImageLightbox(`📸 Foto Selfie — ${stu.nama}`, url, lbl);
        }
      });
    });

    container.querySelectorAll('[data-open-selfie]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const jId = btn.getAttribute('data-open-selfie');
        const matTitle = btn.getAttribute('data-selfie-materi') || '';
        if (typeof openSelfieCameraModal !== 'function') {
          showToast('Fitur kamera belum tersedia di perangkat ini.', 'error');
          return;
        }
        openSelfieCameraModal({
          studentName: stu.nama,
          studentClass: stu.kelas,
          materiTitle: matTitle,
          onCaptured(res) {
            pendingSelfies[jId] = res;
            window.__btdSiswaDirty = true;
            const prevBox = document.getElementById('st-selfie-preview-' + jId);
            const infoEl = document.getElementById('st-selfie-info-' + jId);
            if (prevBox) prevBox.innerHTML = `<img src="${escapeHtml(res.dataUrl)}" alt="Foto Selfie Presensi" />`;
            if (infoEl) infoEl.textContent = `✓ Foto selfie siap (${res.kb} KB) — akan disimpan ke folder absensi Drive.`;
            btn.textContent = '🔄 Ambil Ulang Selfie';
            showToast(`Foto selfie siap (${res.kb} KB). Klik Kirim Presensi Daring untuk menyimpan.`);
          }
        });
      });
    });

    container.querySelectorAll('.stu-absen-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const jadwalId = form.getAttribute('data-jadwal-id');
        const selfie = pendingSelfies[jadwalId];
        if (!selfie || !selfie.base64) {
          showToast('Silakan ambil foto selfie kamera terlebih dahulu sebelum mengirim presensi Daring!', 'warning');
          return;
        }
        const status = form.querySelector('.stu-abs-status').value;
        const catatan = form.querySelector('.stu-abs-note').value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-inline"></span> Mengunggah Selfie &amp; Menyimpan...';

        try {
          const res = await api.submitStudentAbsensi({
            jadwalId,
            status,
            catatan,
            fotoBase64: selfie.base64,
            fotoMime: selfie.mimeType || 'image/jpeg',
            fotoDataUrl: selfie.dataUrl
          });
          delete pendingSelfies[jadwalId];
          window.__btdSiswaDirty = false;
          window.__btdLastStudentSyncAt = Date.now();
          showToast(
            res.mode === 'live'
              ? 'Presensi daring & foto selfie berhasil tersimpan ke folder absensi Drive!'
              : 'Presensi daring & foto selfie dicatat (Mode Demo Lokal).'
          );
          renderProfileAndAttendance();
        } catch (err) {
          showToast('Gagal menyimpan presensi: ' + err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '✅ Kirim Presensi Daring';
        }
      });
    });
  }

  if (typeof api.isStudentSessionValid === 'function' ? api.isStudentSessionValid() : Boolean(api.state.studentSession)) {
    renderProfileAndAttendance();
  } else {
    renderLogin();
  }
};
