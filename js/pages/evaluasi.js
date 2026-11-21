/**
 * Halaman Zona Evaluasi (PAIBP Smart Test CBT Native, Pusat E-LKPD, & Upload Tugas Daring)
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.evaluasi = function renderEvaluasi(container) {
  const { escapeHtml, safeUrl, resolveImageUrl, showToast, openDocModal, openImageLightbox } = window.BTD_UI;
  const api = window.BTD_API;
  const classes = api.state.data.pengaturan.classes || ['X M1', 'X M2'];

  const state = {
    activeTab: 'cbt',
    quizPhase: 'setup', // 'setup' | 'running' | 'result'
    jenjang: 'X',
    bab: '1',
    nama: '',
    kelas: classes[0] || 'X M1',
    questions: [],
    answers: {},
    currentIndex: 0,
    secondsLeft: 0,
    startedAt: 0,
    timerId: null,
    lastResult: null
  };

  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function getAvailablePackages() {
    const soal = api.state.data.bankSoal || [];
    const map = {};
    soal.forEach((s) => {
      const key = `${s.jenjang}-${s.bab}`;
      if (!map[key]) {
        const mat = (api.state.data.materi || []).find(
          (m) => m.jenjang === s.jenjang && Number(m.bab) === Number(s.bab)
        );
        map[key] = {
          jenjang: s.jenjang,
          bab: Number(s.bab),
          judul: mat ? mat.judul : `Materi Bab ${s.bab}`,
          count: 0
        };
      }
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.jenjang.localeCompare(b.jenjang) || a.bab - b.bab);
  }

  function render() {
    const tabs = [
      { id: 'cbt', label: '📝 PAIBP Smart Test (CBT)' },
      { id: 'lkpd', label: '📄 Pusat E-LKPD' },
      { id: 'upload', label: '📤 Upload Tugas Daring' }
    ];

    let bodyHtml = '';

    if (state.activeTab === 'cbt') {
      if (state.quizPhase === 'setup') {
        const packages = getAvailablePackages();
        bodyHtml = `
          <div class="grid grid-2">
            <div class="card">
              <span class="tag tag-emerald">Asesmen Interaktif Native</span>
              <h2 style="margin:10px 0 8px;">Mulai PAIBP Smart Test</h2>
              <p style="margin:0 0 16px;color:var(--slate-600);font-size:13.8px;">
                Kerjakan evaluasi langsung di halaman ini tanpa berpindah Google Form. Skor, predikat, serta pembahasan setiap soal tampil otomatis dan tercatat ke Google Sheets.
              </p>

              <form id="form-cbt-setup" class="form-grid">
                <div class="field autocomplete-wrap">
                  <label for="cbt-nama">Nama Lengkap / NISN Siswa</label>
                  <input id="cbt-nama" class="input" required placeholder="Ketik beberapa huruf nama atau NISN..." value="${escapeHtml(state.nama)}" autocomplete="off" />
                  <input type="hidden" id="cbt-nisn" value="${escapeHtml(state.nisn || '')}" />
                  <div id="cbt-ac-list" class="autocomplete-list" hidden></div>
                  <span id="cbt-ac-badge" class="student-verified-pill" hidden></span>
                </div>
                <div class="form-row-2">
                  <div class="field">
                    <label for="cbt-kelas">Kelas</label>
                    <select id="cbt-kelas" class="select">
                      ${classes.map((c) => `<option value="${escapeHtml(c)}" ${state.kelas === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="field">
                    <label for="cbt-paket">Paket Soal (Jenjang &amp; Bab)</label>
                    <select id="cbt-paket" class="select">
                      ${packages
                        .map(
                          (p) => `<option value="${escapeHtml(p.jenjang)}|${escapeHtml(p.bab)}">
                            Kelas ${escapeHtml(p.jenjang)} • Bab ${escapeHtml(p.bab)} (${p.count} soal)
                          </option>`
                        )
                        .join('')}
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" ${packages.length ? '' : 'disabled'}>
                  🚀 Mulai Kerjakan Sekarang
                </button>
              </form>
            </div>

            <div class="card">
              <h3 style="margin:0 0 12px;">📚 Paket Soal Tersedia</h3>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${packages
                  .map(
                    (p) => `<div class="callout" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                      <div>
                        <span class="tag tag-gold">Kelas ${escapeHtml(p.jenjang)} • Bab ${escapeHtml(p.bab)}</span>
                        <div style="font-weight:700;font-size:14px;margin-top:4px;">${escapeHtml(p.judul)}</div>
                      </div>
                      <span class="tag tag-emerald">${p.count} Soal</span>
                    </div>`
                  )
                  .join('')}
              </div>
              <div class="callout callout-emerald" style="margin-top:14px;font-size:13px;">
                <strong>Tips Kejujuran:</strong> Waktu pengerjaan adalah 2 menit per butir soal. Jawablah dengan jujur karena Allah Maha Melihat (<em>Muraqabah</em>).
              </div>
            </div>
          </div>
        `;
      } else if (state.quizPhase === 'running') {
        const q = state.questions[state.currentIndex];
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const answeredCount = Object.keys(state.answers).length;

        bodyHtml = `
          <div class="quiz-header-bar">
            <div>
              <strong>${escapeHtml(state.nama)}</strong> (${escapeHtml(state.kelas)}) • Kelas ${escapeHtml(state.jenjang)} Bab ${escapeHtml(state.bab)}
              <div style="font-size:12.5px;color:#a7f3d0;">Terjawab ${answeredCount} dari ${state.questions.length} soal</div>
            </div>
            <div class="quiz-timer" id="cbt-timer-display">⏱️ ${formatTimer(state.secondsLeft)}</div>
          </div>

          <div class="grid quiz-split-grid">
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span class="tag tag-emerald">Soal ${state.currentIndex + 1} / ${state.questions.length}</span>
                <span class="tag tag-gold">${escapeHtml(q.level || 'HOTS')}</span>
              </div>
              ${
                safeUrl(q.gambarUrl)
                  ? `<div class="quiz-question-img-wrap">
                      <img src="${escapeHtml(resolveImageUrl(q.gambarUrl))}" alt="Gambar Soal #${state.currentIndex + 1}" data-soal-zoom="${escapeHtml(q.gambarUrl)}" data-zoom-title="Gambar Soal #${state.currentIndex + 1}" title="Klik untuk memperbesar gambar" />
                      <div style="margin-top:4px;"><small style="color:var(--slate-500);">🔍 Klik gambar untuk memperbesar</small></div>
                    </div>`
                  : ''
              }
              <h3 style="margin:0 0 18px;font-size:17px;line-height:1.5;color:var(--slate-900);">${escapeHtml(q.pertanyaan)}</h3>

              <div style="display:flex;flex-direction:column;gap:10px;">
                ${(q.opsi || [])
                  .map((opt, idx) => {
                    const isSelected = state.answers[q.id] === idx;
                    return `<button type="button" class="quiz-option ${isSelected ? 'selected' : ''}" data-pick-opt="${idx}">
                      <span class="quiz-option-letter">${letters[idx] || idx + 1}</span>
                      <span style="text-align:left;">${escapeHtml(opt)}</span>
                    </button>`;
                  })
                  .join('')}
              </div>

              <div style="display:flex;justify-content:space-between;gap:10px;margin-top:20px;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline" id="btn-cbt-prev" ${state.currentIndex === 0 ? 'disabled' : ''}>← Sebelumnya</button>
                ${
                  state.currentIndex < state.questions.length - 1
                    ? `<button type="button" class="btn btn-primary" id="btn-cbt-next">Selanjutnya →</button>`
                    : `<button type="button" class="btn btn-gold" id="btn-cbt-finish">✅ Selesai &amp; Kumpulkan</button>`
                }
              </div>
            </div>

            <div class="card">
              <h4 style="margin:0 0 10px;">Navigasi Nomor</h4>
              <div class="quiz-nav-dots" style="margin-bottom:16px;">
                ${state.questions
                  .map((item, idx) => {
                    const cls =
                      idx === state.currentIndex
                        ? 'current'
                        : state.answers[item.id] !== undefined
                          ? 'answered'
                          : '';
                    return `<button type="button" class="quiz-dot ${cls}" data-jump-q="${idx}">${idx + 1}</button>`;
                  })
                  .join('')}
              </div>
              <button type="button" class="btn btn-gold btn-block" id="btn-cbt-finish-side">Kumpulkan Jawaban</button>
            </div>
          </div>
        `;
      } else if (state.quizPhase === 'result' && state.lastResult) {
        const res = state.lastResult;
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const predikat =
          res.skor >= 90 ? 'Mumtaz (Sangat Baik)' : res.skor >= 75 ? 'Jayyid (Tuntas)' : 'Perlu Penguatan';

        bodyHtml = `
          <div class="card" style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
              <div>
                <span class="tag tag-emerald">Hasil PAIBP Smart Test</span>
                <h2 style="margin:8px 0 4px;">${escapeHtml(res.nama)} — ${escapeHtml(res.kelas)}</h2>
                <p style="margin:0;color:var(--slate-600);">
                  Kelas ${escapeHtml(res.jenjang)} Bab ${escapeHtml(res.bab)} • Waktu: ${res.waktuDetik} detik • Status: <strong>${predikat}</strong>
                </p>
              </div>
              <div style="text-align:center;padding:14px 24px;border-radius:16px;background:var(--emerald-900);color:#fff;">
                <div style="font-size:12px;color:#a7f3d0;">SKOR AKHIR</div>
                <div style="font-size:34px;font-weight:800;line-height:1.1;">${res.skor}</div>
                <div style="font-size:12.5px;color:#fde68a;">Benar ${res.benar} / ${res.totalSoal}</div>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" id="btn-cbt-retry">🔄 Kerjakan Paket Lain</button>
              <a href="#amaliyah" class="btn btn-gold">🌟 Lanjut ke Jurnal Amaliyah</a>
            </div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 14px;">📖 Pembahasan Soal &amp; Umpan Balik</h3>
            <div style="display:flex;flex-direction:column;gap:14px;">
              ${state.questions
                .map((q, idx) => {
                  const picked = state.answers[q.id];
                  const correct = Number(q.kunci);
                  const isRight = picked === correct;
                  return `<div class="callout ${isRight ? 'callout-emerald' : ''}" style="${isRight ? '' : 'background:var(--rose-50);border-color:#fecdd3;'}">
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
                      <strong>Soal #${idx + 1}</strong>
                      <span class="tag ${isRight ? 'tag-emerald' : 'tag-rose'}">${isRight ? '✓ Benar' : '✕ Perlu Review'}</span>
                    </div>
                    ${
                      safeUrl(q.gambarUrl)
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
      }
    } else if (state.activeTab === 'lkpd') {
      const lkpdMateri = (api.state.data.materi || []).filter((m) => safeUrl(m.lkpdUrl));
      bodyHtml = `
        <div class="grid grid-2">
          ${lkpdMateri
            .map(
              (m) => `<div class="card">
                <span class="tag tag-emerald">Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)}</span>
                <h3 style="margin:10px 0 8px;">E-LKPD: ${escapeHtml(m.judul)}</h3>
                <p style="margin:0 0 14px;font-size:13.5px;color:var(--slate-600);">${escapeHtml(m.ringkasan)}</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-primary btn-sm" data-preview-lkpd="${escapeHtml(m.lkpdUrl)}" data-title="E-LKPD Kelas ${escapeHtml(m.jenjang)} Bab ${escapeHtml(m.bab)}">📄 Pratinjau LKPD</button>
                  <a href="${escapeHtml(m.lkpdUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Buka di Drive ↗</a>
                </div>
              </div>`
            )
            .join('')}
          <div class="card callout-gold">
            <span class="tag tag-gold">Petunjuk Pengerjaan</span>
            <h3 style="margin:10px 0 8px;">Cara Mengumpulkan Hasil LKPD</h3>
            <ol style="margin:0;padding-left:18px;font-size:13.8px;color:var(--slate-700);display:flex;flex-direction:column;gap:6px;">
              <li>Buka E-LKPD sesuai jenjang kelas Anda dan pahami instruksi kerja.</li>
              <li>Kerjakan di buku tulis/file digital lalu foto atau simpan dengan jelas (maks. 2 MB bila upload langsung).</li>
              <li>Kumpulkan melalui tab <strong>Upload Tugas Daring</strong> di halaman ini agar terekam di Google Drive &amp; Sheets guru.</li>
            </ol>
          </div>
        </div>
      `;
    } else if (state.activeTab === 'upload') {
      bodyHtml = `
        <div class="grid grid-2">
          <div class="card">
            <span class="tag tag-emerald">Formulir Tugas PAI-BP Native</span>
            <h2 style="margin:10px 0 8px;">Upload Tugas Pembelajaran Daring</h2>
            <p style="margin:0 0 16px;color:var(--slate-600);font-size:13.5px;">
              Anda dapat mengunggah file gambar/PDF secara langsung (otomatis disimpan ke Google Drive guru saat Apps Script aktif) atau menempelkan tautan Google Drive / Canva.
            </p>
            <form id="form-upload-tugas" class="form-grid">
              <div class="form-row-2">
                <div class="field autocomplete-wrap">
                  <label for="tgs-nama">Nama / NISN Siswa</label>
                  <input id="tgs-nama" class="input" required placeholder="Ketik nama atau NISN..." autocomplete="off" />
                  <input type="hidden" id="tgs-nisn" />
                  <div id="tgs-ac-list" class="autocomplete-list" hidden></div>
                  <span id="tgs-ac-badge" class="student-verified-pill" hidden></span>
                </div>
                <div class="field">
                  <label for="tgs-kelas">Kelas</label>
                  <select id="tgs-kelas" class="select" required>
                    ${classes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-row-2">
                <div class="field">
                  <label for="tgs-bab">Bab / Materi PAI</label>
                  <input id="tgs-bab" class="input" required placeholder="Misal: Bab 1 Kelas X - Etos Kerja" />
                </div>
                <div class="field">
                  <label for="tgs-jenis">Jenis Tugas</label>
                  <select id="tgs-jenis" class="select">
                    <option>LKPD / Latihan Tertulis</option>
                    <option>Infografis / Poster Islami</option>
                    <option>Video Praktik Ibadah / Hafalan</option>
                    <option>Rangkuman / Peta Konsep</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label for="tgs-file">Pilih File Gambar/PDF (Opsional, Maks. 2 MB)</label>
                <input id="tgs-file" type="file" class="input" accept="image/*,.pdf" />
                <span class="hint">Format nama otomatis: TugasPAIBP_Kelas_Nama</span>
              </div>

              <div class="field">
                <label for="tgs-link">Atau Tempel Tautan Tugas (Google Drive / Canva / YouTube)</label>
                <input id="tgs-link" type="url" class="input" placeholder="https://drive.google.com/..." />
              </div>

              <div class="field">
                <label for="tgs-catatan">Catatan Tambahan</label>
                <input id="tgs-catatan" class="input" placeholder="Keterangan singkat tugas..." />
              </div>

              <button type="submit" class="btn btn-primary">📤 Kirim Tugas Sekarang</button>
            </form>
          </div>

          <div class="card">
            <h3 style="margin:0 0 12px;">📋 Panduan Pengumpulan &amp; Karakter Hebat</h3>
            <ol style="margin:0 0 16px;padding-left:18px;font-size:13.8px;color:var(--slate-700);display:flex;flex-direction:column;gap:6px;">
              <li>Pastikan gambar/dokumen terbaca jelas dan tidak buram.</li>
              <li>Jika memakai tautan Google Drive, ubah akses menjadi <em>Anyone with the link can view</em>.</li>
              <li>Kirimkan hasil karya orisinal milik sendiri sebagai bukti amanah dan kejujuran.</li>
            </ol>
            <div class="callout callout-emerald">
              <strong>Tips Karakter Hebat:</strong> "Berlombalah dalam kebaikan (<em>fastabiqul khairat</em>) — kumpulkan tugas sebelum tenggat waktu tanpa menunda!"
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Asesmen Formatif, Sumatif, &amp; Portofolio</span>
            <h1>Zona Evaluasi PAI-BP</h1>
            <p>Uji pemahaman melalui PAIBP Smart Test, kerjakan E-LKPD, dan kumpulkan tugas secara terpadu.</p>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="tabs">
          ${tabs
            .map(
              (t) => `<button type="button" class="tab-btn ${state.activeTab === t.id ? 'active' : ''}" data-eval-tab="${t.id}">
                ${escapeHtml(t.label)}
              </button>`
            )
            .join('')}
        </div>
        ${bodyHtml}
      </div>
    `;

    container.querySelectorAll('[data-eval-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        clearTimer();
        state.activeTab = btn.getAttribute('data-eval-tab');
        state.quizPhase = 'setup';
        render();
      });
    });

    bindEvents();
  }

  function finishQuiz(autoSubmitted = false) {
    clearTimer();
    const total = state.questions.length;
    let benar = 0;
    state.questions.forEach((q) => {
      if (state.answers[q.id] === Number(q.kunci)) benar += 1;
    });
    const skor = total ? Math.round((benar / total) * 100) : 0;
    const waktuDetik = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));

    const payload = {
      nisn: state.nisn || '',
      nama: state.nama,
      kelas: state.kelas,
      jenjang: state.jenjang,
      bab: Number(state.bab),
      skor,
      benar,
      totalSoal: total,
      waktuDetik
    };

    state.lastResult = payload;
    state.quizPhase = 'result';
    render();

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

  function bindEvents() {
    if (window.BTD_UI.setupStudentAutocomplete) {
      window.BTD_UI.setupStudentAutocomplete({
        inputId: 'cbt-nama',
        listId: 'cbt-ac-list',
        badgeId: 'cbt-ac-badge',
        kelasSelectId: 'cbt-kelas',
        nisnHiddenId: 'cbt-nisn'
      });
      window.BTD_UI.setupStudentAutocomplete({
        inputId: 'tgs-nama',
        listId: 'tgs-ac-list',
        badgeId: 'tgs-ac-badge',
        kelasSelectId: 'tgs-kelas',
        nisnHiddenId: 'tgs-nisn'
      });
    }

    const setupForm = document.getElementById('form-cbt-setup');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.nama = document.getElementById('cbt-nama').value.trim();
        state.nisn = (document.getElementById('cbt-nisn') && document.getElementById('cbt-nisn').value) || '';
        state.kelas = document.getElementById('cbt-kelas').value;
        const [jenjang, bab] = document.getElementById('cbt-paket').value.split('|');
        state.jenjang = jenjang;
        state.bab = bab;
        state.questions = (api.state.data.bankSoal || []).filter(
          (s) => s.jenjang === jenjang && Number(s.bab) === Number(bab)
        );
        if (!state.questions.length) {
          showToast('Belum ada soal untuk paket ini.', 'warning');
          return;
        }
        state.answers = {};
        state.currentIndex = 0;
        state.secondsLeft = state.questions.length * 120;
        state.startedAt = Date.now();
        state.quizPhase = 'running';

        clearTimer();
        state.timerId = setInterval(() => {
          const timerEl = document.getElementById('cbt-timer-display');
          if (!timerEl) {
            clearTimer();
            return;
          }
          state.secondsLeft -= 1;
          timerEl.textContent = '⏱️ ' + formatTimer(Math.max(0, state.secondsLeft));
          if (state.secondsLeft <= 0) {
            finishQuiz(true);
          }
        }, 1000);

        render();
      });
    }

    container.querySelectorAll('[data-pick-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = state.questions[state.currentIndex];
        state.answers[q.id] = Number(btn.getAttribute('data-pick-opt'));
        render();
      });
    });

    container.querySelectorAll('[data-jump-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentIndex = Number(btn.getAttribute('data-jump-q'));
        render();
      });
    });

    const prevBtn = document.getElementById('btn-cbt-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.currentIndex > 0) {
          state.currentIndex -= 1;
          render();
        }
      });
    }

    const nextBtn = document.getElementById('btn-cbt-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) {
          state.currentIndex += 1;
          render();
        }
      });
    }

    const finBtn = document.getElementById('btn-cbt-finish');
    const finSideBtn = document.getElementById('btn-cbt-finish-side');
    [finBtn, finSideBtn].forEach((b) => {
      if (b) b.addEventListener('click', () => finishQuiz(false));
    });

    const retryBtn = document.getElementById('btn-cbt-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        state.quizPhase = 'setup';
        render();
      });
    }

    container.querySelectorAll('[data-soal-zoom]').forEach((imgEl) => {
      imgEl.addEventListener('click', () => {
        openImageLightbox(
          imgEl.getAttribute('data-zoom-title') || 'Gambar Soal',
          imgEl.getAttribute('data-soal-zoom') || ''
        );
      });
    });

    container.querySelectorAll('[data-preview-lkpd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openDocModal(btn.getAttribute('data-title'), btn.getAttribute('data-preview-lkpd'));
      });
    });

    const uploadForm = document.getElementById('form-upload-tugas');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('tgs-file');
        const linkInput = document.getElementById('tgs-link').value.trim();
        const nama = document.getElementById('tgs-nama').value.trim();
        const kelas = document.getElementById('tgs-kelas').value;
        const bab = document.getElementById('tgs-bab').value.trim();
        const jenisTugas = document.getElementById('tgs-jenis').value;
        const catatan = document.getElementById('tgs-catatan').value.trim();
        const file = fileInput.files && fileInput.files[0];

        if (!file && !linkInput) {
          showToast('Pilih file untuk diunggah atau tempelkan tautan tugas.', 'warning');
          return;
        }
        if (file && file.size > 2 * 1024 * 1024) {
          showToast('Ukuran file melebihi 2 MB. Kompres atau gunakan tautan Google Drive.', 'warning');
          return;
        }

        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          let fileBase64 = '';
          let fileMime = '';
          let fileName = '';
          if (file) {
            fileMime = file.type || 'application/octet-stream';
            const ext = (file.name.split('.').pop() || 'dat').toLowerCase();
            fileName = `TugasPAIBP_${kelas.replace(/\s+/g, '')}_${nama.replace(/\s+/g, '_')}.${ext}`;
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

          const nisn = (document.getElementById('tgs-nisn') && document.getElementById('tgs-nisn').value) || '';
          const res = await api.submitTugas({
            nisn,
            nama,
            kelas,
            bab,
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
          uploadForm.reset();
        } catch (err) {
          showToast('Gagal mengunggah tugas: ' + err.message, 'error');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  }

  render();
};
