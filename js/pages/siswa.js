/**
 * Halaman Portal Siswa (Login Username = NISN & Password = NISN)
 * Menampilkan profil siswa, rekap aktivitas belajarnya, dan presensi mandiri KHUSUS
 * untuk jadwal kelasnya yang berstatus "Sedang Berlangsung" dan berjenis "Daring".
 * Jadwal yang sudah "Terlaksana" atau "Luring" dikunci dari input siswa.
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.siswa = function renderSiswaPortal(container) {
  const {
    escapeHtml,
    showToast,
    formatDateId,
    renderPasswordInput,
    bindPasswordToggles,
    openSelfieCameraModal,
    openImageLightbox
  } = window.BTD_UI;
  const api = window.BTD_API;
  const pendingSelfies = {};

  function renderLogin() {
    const demoHint = !api.state.isLive
      ? `<p style="margin:8px 0 0;font-size:12.5px;color:var(--emerald-800);">Contoh Demo Lokal: Username &amp; Password <code>0091000101</code> (Ahmad Fauzan — X M1).</p>`
      : '';

    container.innerHTML = `
      <div class="page-banner">
        <div class="container">
          <span class="eyebrow">Akun Pribadi Peserta Didik PAI</span>
          <h1>Portal Siswa — Bilik Tarbiyah Digital</h1>
          <p>Masuk dengan NISN Anda untuk melihat profil pembelajaran dan mengisi presensi pada jadwal pembelajaran Daring yang sedang berlangsung.</p>
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
            <span>Memverifikasi NISN dan memuat jadwal kelas Anda...</span>
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

    const stuNisn = String(stu.nisn || stu.id);
    const stuRem = typeof api.getSessionRemainingText === 'function' ? api.getSessionRemainingText('student') : '';
    const classSchedules = (api.state.data.jadwal || [])
      .filter((j) => j.kelas === stu.kelas)
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    const myAbsensi = (api.state.data.absensi || []).filter(
      (a) => String(a.nisn || a.nis || '') === stuNisn || (a.nama === stu.nama && a.kelas === stu.kelas)
    );
    const myEvaluasi = (api.state.data.evaluasi || []).filter(
      (e) => String(e.nisn || '') === stuNisn || (e.nama === stu.nama && e.kelas === stu.kelas)
    );
    const myHadirCount = myAbsensi.filter((a) => String(a.status).toLowerCase() === 'hadir').length;

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Portal Siswa PAI • Kelas ${escapeHtml(stu.kelas)}</span>
            <h1>Assalamu'alaikum, ${escapeHtml(stu.nama)}</h1>
            <p>NISN: <strong>${escapeHtml(stuNisn)}</strong> • Status: <strong>${escapeHtml(stu.status || 'Aktif')}</strong>${stuRem ? ` • Sesi aktif ${escapeHtml(stuRem)}` : ''}</p>
          </div>
          <button type="button" class="btn btn-gold btn-sm" id="btn-stu-logout">Keluar Akun</button>
        </div>
      </div>

      <div class="container" style="display:flex;flex-direction:column;gap:22px;">
        <!-- Profil & Statistik Pribadi -->
        <div class="grid grid-2">
          <div class="card">
            <span class="tag tag-emerald">Profil Peserta Didik</span>
            <h2 style="margin:10px 0 12px;">${escapeHtml(stu.nama)}</h2>
            <div class="table-wrap">
              <table>
                <tbody>
                  <tr><th>NISN</th><td><strong>${escapeHtml(stuNisn)}</strong></td></tr>
                  <tr><th>Kelas</th><td><span class="tag tag-emerald">${escapeHtml(stu.kelas)}</span></td></tr>
                  <tr><th>Jenis Kelamin</th><td>${stu.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td></tr>
                  <tr><th>Status Keaktifan</th><td><span class="tag tag-gold">${escapeHtml(stu.status || 'Aktif')}</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <span class="tag tag-sky">Ringkasan Aktivitas Belajar Saya</span>
            <div class="grid grid-2" style="margin-top:12px;">
              <div class="callout callout-emerald">
                <div style="font-size:26px;font-weight:800;color:var(--emerald-900);">${myHadirCount}</div>
                <small>Kehadiran Tercatat</small>
              </div>
              <div class="callout callout-gold">
                <div style="font-size:26px;font-weight:800;color:var(--gold-600);">${myEvaluasi.length}</div>
                <small>Smart Test Dikerjakan</small>
              </div>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
              <a href="#materi" class="btn btn-primary btn-sm">📖 Buka Ruang Materi (Renungan, Evaluasi &amp; Amaliyah)</a>
            </div>
          </div>
        </div>

        <!-- Jadwal Kelas Saya & Presensi Daring -->
        <div class="card">
          <div style="margin-bottom:14px;">
            <h2 style="margin:0 0 4px;">📅 Jadwal Pembelajaran &amp; Presensi Daring Kelas ${escapeHtml(stu.kelas)}</h2>
            <p style="margin:0;font-size:13.5px;color:var(--slate-600);">
              Anda hanya dapat mengisi presensi mandiri untuk jadwal <strong>Daring</strong> yang berstatus <strong>Sedang Berlangsung</strong>.
              Jadwal yang sudah <strong>Terlaksana</strong> atau bersifat <strong>Luring</strong> otomatis terkunci bagi siswa.
            </p>
          </div>

          ${
            classSchedules.length === 0
              ? `<div class="callout">Belum ada jadwal pembelajaran yang ditetapkan guru untuk kelas ${escapeHtml(stu.kelas)}.</div>`
              : `<div style="display:flex;flex-direction:column;gap:14px;">
                  ${classSchedules
                    .map((j) => {
                      const existingRec = myAbsensi.find(
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
                                      ${
                                        snapped
                                          ? `<img src="${escapeHtml(snapped.dataUrl)}" alt="Foto Selfie Presensi" />`
                                          : `<span>📷</span>`
                                      }
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
                    })
                    .join('')}
                </div>`
          }
        </div>
      </div>
    `;

    document.getElementById('btn-stu-logout').addEventListener('click', () => {
      Object.keys(pendingSelfies).forEach((k) => delete pendingSelfies[k]);
      api.logoutStudent();
      if (typeof window.BTD_UI.syncChromeMetadata === 'function') window.BTD_UI.syncChromeMetadata();
      renderLogin();
    });

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
          const cleanKelas = String(stu.kelas || 'Kelas').replace(/[^a-zA-Z0-9_-]+/g, '_');
          const res = await api.submitStudentAbsensi({
            jadwalId,
            status,
            catatan,
            fotoBase64: selfie.base64,
            fotoMime: selfie.mimeType || 'image/jpeg',
            fotoDataUrl: selfie.dataUrl,
            fotoName: `Absensi_${cleanKelas}_${stuNisn}_${Date.now()}.jpg`
          });
          delete pendingSelfies[jadwalId];
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
