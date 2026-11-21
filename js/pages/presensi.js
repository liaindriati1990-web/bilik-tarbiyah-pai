/**
 * Halaman Zona Amaliyah & Kurikulum Berbasis Cinta (KBC)
 * (Absensi/presensi siswa kini dipusatkan di Panel Guru -> Kelola Siswa & Kelas -> Daftar Hadir Siswa)
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.presensi = function renderAmaliyah(container) {
  const { escapeHtml, showToast } = window.BTD_UI;
  const api = window.BTD_API;
  const classes = api.state.data.pengaturan.classes || ['X M1', 'X M2'];

  function render() {
    const amaliyahList = (api.state.data.amaliyah || []).slice(0, 8);

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Pembiasaan Karakter Islami &amp; Kurikulum Berbasis Cinta</span>
            <h1>Zona Amaliyah &amp; Tantangan Mingguan PAI</h1>
            <p>Laporkan aksi kebaikan nyata, pengendalian diri digital, dan praktik kasih sayang kepada Allah, sesama, serta lingkungan.</p>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="grid grid-2">
          <div class="card">
            <span class="tag tag-rose">Amaliyah &amp; Kurikulum Berbasis Cinta</span>
            <h2 style="margin:10px 0 8px;">Tantangan Mingguan (Weekly Challenge)</h2>
            <p style="margin:0 0 16px;color:var(--slate-600);font-size:13.5px;">
              Buktikan pemahaman agamamu lewat aksi nyata pengendalian diri dan kasih sayang kepada sesama!
            </p>
            <form id="form-amaliyah" class="form-grid">
              <div class="form-row-2">
                <div class="field autocomplete-wrap">
                  <label for="aml-nama">Nama / NISN Siswa</label>
                  <input id="aml-nama" class="input" required placeholder="Ketik beberapa huruf nama atau NISN..." autocomplete="off" />
                  <input type="hidden" id="aml-nisn" />
                  <div id="aml-ac-list" class="autocomplete-list" hidden></div>
                  <span id="aml-ac-badge" class="student-verified-pill" hidden></span>
                </div>
                <div class="field">
                  <label for="aml-kelas">Kelas</label>
                  <select id="aml-kelas" class="select" required>
                    ${classes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="field">
                <label for="aml-bab">Tema Tantangan</label>
                <input id="aml-bab" class="input" required value="Etos Kerja, Fastabiqul Khairat &amp; Kasih Sayang KBC" />
              </div>

              <div class="field">
                <label>Checklist Pembiasaan Mingguan</label>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <label class="check-card">
                    <input type="checkbox" id="aml-gadget" />
                    <span><strong>📱 Lulus Sensor Gadget:</strong> Membatasi hiburan gawai dan mendahulukan ibadah serta tugas belajar.</span>
                  </label>
                  <label class="check-card">
                    <input type="checkbox" id="aml-prokras" />
                    <span><strong>⏱️ Zero Prokrastinasi:</strong> Menyelesaikan pekerjaan/ibadah tepat waktu tanpa menunda.</span>
                  </label>
                  <label class="check-card">
                    <input type="checkbox" id="aml-fokus" />
                    <span><strong>⚔️ Petarung Fokus:</strong> Tetap tekun dan pantang menyerah saat belajar materi sulit.</span>
                  </label>
                </div>
              </div>

              <div class="field">
                <label for="aml-capaian">Pencapaian Terbaikmu Minggu Ini</label>
                <textarea id="aml-capaian" class="textarea" rows="3" required placeholder="Ceritakan 1 pencapaian nyata yang paling kamu syukuri..."></textarea>
              </div>

              <div class="field">
                <label for="aml-kbc">Aksi Nyata Cinta Kasih (Kurikulum Berbasis Cinta)</label>
                <textarea id="aml-kbc" class="textarea" rows="3" required placeholder="Contoh: Membantu teman yang kesulitan, berbakti kepada orang tua, atau menjaga kerukunan kelas..."></textarea>
              </div>

              <button type="submit" class="btn btn-gold">🌟 Simpan Jurnal Amaliyah</button>
            </form>
          </div>

          <div class="card">
            <h3 style="margin:0 0 12px;">✨ Jejak Kebaikan Siswa Terbaru</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${amaliyahList
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
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.BTD_UI.setupStudentAutocomplete) {
      window.BTD_UI.setupStudentAutocomplete({
        inputId: 'aml-nama',
        listId: 'aml-ac-list',
        badgeId: 'aml-ac-badge',
        kelasSelectId: 'aml-kelas',
        nisnHiddenId: 'aml-nisn'
      });
    }

    const formAml = document.getElementById('form-amaliyah');
    if (formAml) {
      formAml.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formAml.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Menyimpan Jurnal...';
        try {
          const res = await api.submitAmaliyah({
            nisn: (document.getElementById('aml-nisn') && document.getElementById('aml-nisn').value) || '',
            nama: document.getElementById('aml-nama').value.trim(),
            kelas: document.getElementById('aml-kelas').value,
            bab: document.getElementById('aml-bab').value.trim(),
            lulusSensorGadget: document.getElementById('aml-gadget').checked,
            zeroProkrastinasi: document.getElementById('aml-prokras').checked,
            petarungFokus: document.getElementById('aml-fokus').checked,
            pencapaianTerbaik: document.getElementById('aml-capaian').value.trim(),
            refleksiKbc: document.getElementById('aml-kbc').value.trim()
          });
          showToast(
            res.mode === 'live'
              ? 'Jurnal Amaliyah tersimpan ke Google Sheets!'
              : 'Jurnal Amaliyah dicatat (Mode Demo Lokal).'
          );
          render();
        } catch (err) {
          showToast('Gagal menyimpan jurnal amaliyah: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🌟 Simpan Jurnal Amaliyah';
        }
      });
    }
  }

  render();
};
