/**
 * Komponen UI Reusable, Sanitasi XSS, Pengolah Gambar, Modal Media, & Asisten Belajar PAI
 */
(function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeNavUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (
      raw.startsWith('#') ||
      /^https:\/\//i.test(raw) ||
      /^http:\/\//i.test(raw)
    ) {
      return raw;
    }
    return '';
  }

  function safeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (
      raw.startsWith('#') ||
      /^https:\/\//i.test(raw) ||
      /^http:\/\//i.test(raw) ||
      /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(raw)
    ) {
      return raw;
    }
    return '';
  }

  /**
   * Mengonversi tautan Google Drive (/file/d/ID/view) menjadi URL gambar langsung agar bisa tampil di <img>
   */
  function resolveImageUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    // Izinkan data:image/svg+xml hanya untuk tag <img> dekoratif (bukan link/iframe) tanpa tag script/event handler
    if (/^data:image\/svg\+xml;/i.test(raw) && !/<script|on\w+\s*=/i.test(decodeURIComponent(raw))) {
      return raw;
    }
    const clean = safeUrl(raw);
    if (!clean || clean.startsWith('#')) return '';
    const driveMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
    }
    const openMatch = clean.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch && openMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1600`;
    }
    return clean;
  }

  /**
   * Mengompres canvas ke Base64 Data URL di bawah batas karakter sel Google Sheets (< 46.000 char)
   * Menjaga latar belakang transparan PNG / WebP untuk logo (250x250px) agar tetap bersih & tajam.
   */
  function compressCanvasToBudget(sourceCanvas, options = {}) {
    const maxChars = Number(options.maxChars || 46000);
    const preferPng = Boolean(options.preferPng);
    const preserveTransparency = Boolean(options.preserveTransparency || preferPng);
    const sharpMode = Boolean(options.sharpMode);

    if (preferPng || preserveTransparency) {
      try {
        const pngUrl = sourceCanvas.toDataURL('image/png');
        if (pngUrl && pngUrl.length <= maxChars) {
          return { dataUrl: pngUrl, mimeType: 'image/png', charCount: pngUrl.length };
        }
      } catch (e) { /* fallback ke WebP transparan */ }
    }

    let supportsWebP = false;
    try {
      supportsWebP = sourceCanvas.toDataURL('image/webp', 0.85).startsWith('data:image/webp');
    } catch (e) {
      supportsWebP = false;
    }

    const scales = sharpMode ? [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.28] : [1, 0.85, 0.72, 0.58, 0.45, 0.32, 0.22];
    const qualities = sharpMode
      ? [0.92, 0.86, 0.8, 0.74, 0.68, 0.6]
      : preserveTransparency
        ? [0.9, 0.82, 0.74, 0.64, 0.54]
        : [0.86, 0.78, 0.7, 0.62, 0.52];
    let bestUrl = '';
    let bestMime = supportsWebP ? 'image/webp' : preserveTransparency ? 'image/png' : 'image/jpeg';

    const tryEncodeCanvas = (outMime) => {
      for (let sIdx = 0; sIdx < scales.length; sIdx++) {
        const scale = scales[sIdx];
        let workCanvas = sourceCanvas;
        if (scale < 1) {
          workCanvas = document.createElement('canvas');
          workCanvas.width = Math.max(32, Math.round(sourceCanvas.width * scale));
          workCanvas.height = Math.max(32, Math.round(sourceCanvas.height * scale));
          const wCtx = workCanvas.getContext('2d');
          wCtx.imageSmoothingEnabled = true;
          wCtx.imageSmoothingQuality = 'high';
          wCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);
          wCtx.drawImage(sourceCanvas, 0, 0, workCanvas.width, workCanvas.height);
        }
        if (outMime === 'image/png') {
          const dataUrl = workCanvas.toDataURL('image/png');
          bestUrl = dataUrl;
          bestMime = 'image/png';
          if (dataUrl.length <= maxChars) return { dataUrl, mimeType: 'image/png', charCount: dataUrl.length };
        } else {
          for (let qIdx = 0; qIdx < qualities.length; qIdx++) {
            const dataUrl = workCanvas.toDataURL(outMime, qualities[qIdx]);
            bestUrl = dataUrl;
            bestMime = outMime;
            if (dataUrl.length <= maxChars) return { dataUrl, mimeType: outMime, charCount: dataUrl.length };
          }
        }
      }
      return null;
    };

    if (supportsWebP) {
      const webpHit = tryEncodeCanvas('image/webp');
      if (webpHit) return webpHit;
    }

    if (preserveTransparency) {
      const pngHit = tryEncodeCanvas('image/png');
      if (pngHit) return pngHit;
    }

    const jpgHit = tryEncodeCanvas('image/jpeg');
    if (jpgHit) return jpgHit;

    return { dataUrl: bestUrl, mimeType: bestMime, charCount: bestUrl.length };
  }

  /**
   * Mengompres foto yang diunggah admin/guru ke Base64 (< 46.000 karakter)
   * agar siap tersimpan langsung di sel Google Sheets tanpa DriveApp dan tetap tajam.
   */
  function compressImageFile(file, maxWidth = 960, quality = 0.82, maxChars = 46000) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('File harus berupa gambar (JPG/PNG/WebP).'));
        return;
      }
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (dataUrl.length <= maxChars) {
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
            resolve({ dataUrl, base64, mimeType: 'image/svg+xml', fileName: file.name, charCount: dataUrl.length });
            return;
          }
          // Jika SVG terlalu besar (> maxChars), rasterisasi agar aman untuk sel Google Sheets
          const svgImg = new Image();
          svgImg.onload = () => {
            let w = svgImg.width || maxWidth;
            let h = svgImg.height || Math.round(w * 0.75);
            if (w > maxWidth) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            }
            const c = document.createElement('canvas');
            c.width = Math.max(64, w);
            c.height = Math.max(64, h);
            const cx = c.getContext('2d');
            cx.drawImage(svgImg, 0, 0, c.width, c.height);
            const compressed = compressCanvasToBudget(c, { maxChars, preferPng: true });
            const base64 = compressed.dataUrl.includes(',') ? compressed.dataUrl.split(',')[1] : '';
            resolve({
              dataUrl: compressed.dataUrl,
              base64,
              mimeType: compressed.mimeType,
              charCount: compressed.charCount,
              fileName: file.name.replace(/\.[^.]+$/, '') + '.png'
            });
          };
          svgImg.onerror = () => reject(new Error('File SVG terlalu besar (> ' + maxChars + ' karakter) dan gagal dikonversi.'));
          svgImg.src = dataUrl;
        };
        reader.onerror = () => reject(new Error('Gagal membaca file SVG.'));
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const preferPng = file.type === 'image/png' && width <= 512 && height <= 512;
          const compressed = compressCanvasToBudget(canvas, { maxChars, preferPng });
          const base64 = compressed.dataUrl.includes(',') ? compressed.dataUrl.split(',')[1] : '';
          const ext = compressed.mimeType === 'image/webp' ? '.webp' : compressed.mimeType === 'image/png' ? '.png' : '.jpg';
          resolve({
            dataUrl: compressed.dataUrl,
            base64,
            mimeType: compressed.mimeType,
            charCount: compressed.charCount,
            fileName: file.name.replace(/\.[^.]+$/, '') + ext
          });
        };
        img.onerror = () => reject(new Error('Gambar tidak valid atau rusak.'));
        img.src = String(ev.target.result || '');
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(file);
    });
  }

  function formatDateId(isoOrDate) {
    if (!isoOrDate) return '-';
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return escapeHtml(isoOrDate);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  let activeToastTimer = null;
  let activeToastRemoveTimer = null;

  function dismissCenterToast(toast, container) {
    if (!toast || toast.__dismissed) return;
    toast.__dismissed = true;
    clearTimeout(activeToastTimer);
    clearTimeout(activeToastRemoveTimer);
    toast.style.opacity = '0';
    toast.style.transform = 'scale(0.95)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    activeToastRemoveTimer = setTimeout(() => {
      if (toast.parentNode) toast.remove();
      if (container && !container.querySelector('.toast')) {
        container.classList.remove('has-toast');
      }
    }, 210);
  }

  function showToast(message, type = 'success', durationMs) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    clearTimeout(activeToastTimer);
    clearTimeout(activeToastRemoveTimer);
    container.innerHTML = '';
    container.classList.add('has-toast');

    const isError = type === 'error';
    const isWarning = type === 'warning';
    const iconChar = isError ? '❌' : isWarning ? '⚠️' : '✅';
    const titleText = isError ? 'Gagal' : isWarning ? 'Perhatian' : 'Berhasil!';

    const toast = document.createElement('div');
    toast.className = 'toast' + (isWarning ? ' toast-warning' : isError ? ' toast-error' : '');
    toast.setAttribute('role', 'alert');

    const iconEl = document.createElement('div');
    iconEl.className = 'toast-icon';
    iconEl.textContent = iconChar;

    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = titleText;

    const msgEl = document.createElement('div');
    msgEl.className = 'toast-msg';
    msgEl.textContent = String(message || '');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.textContent = 'OK';
    closeBtn.addEventListener('click', () => dismissCenterToast(toast, container));

    toast.appendChild(iconEl);
    toast.appendChild(titleEl);
    toast.appendChild(msgEl);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    container.onclick = (e) => {
      if (e.target === container) dismissCenterToast(toast, container);
    };

    const waitMs =
      typeof durationMs === 'number'
        ? durationMs
        : isError || String(message || '').length > 90
          ? 4800
          : 3200;

    const scheduleAutoClose = () => {
      clearTimeout(activeToastTimer);
      activeToastTimer = setTimeout(() => dismissCenterToast(toast, container), waitMs);
    };
    toast.addEventListener('mouseenter', () => clearTimeout(activeToastTimer));
    toast.addEventListener('mouseleave', scheduleAutoClose);
    scheduleAutoClose();
  }

  let confirmResolver = null;
  let confirmProcessing = false;

  function closeConfirmModal(force = false) {
    const modal = document.getElementById('confirm-modal');
    if (!modal || modal.hidden) return;
    if (confirmProcessing && !force) return;
    confirmProcessing = false;
    modal.hidden = true;
    refreshBodyScrollLock();
    if (confirmResolver) {
      const res = confirmResolver;
      confirmResolver = null;
      res(false);
    }
  }

  function openConfirmModal(options = {}) {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    const iconWrap = document.getElementById('confirm-icon-wrap');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const itemEl = document.getElementById('confirm-modal-item');
    const loadingEl = document.getElementById('confirm-modal-loading');
    const loadingTextEl = document.getElementById('confirm-loading-text');
    const cancelBtn = document.getElementById('confirm-btn-cancel');
    const yesBtn = document.getElementById('confirm-btn-yes');

    if (!modal || !titleEl || !msgEl || !cancelBtn || !yesBtn) {
      return Promise.resolve(false);
    }

    if (confirmResolver) {
      const prev = confirmResolver;
      confirmResolver = null;
      prev(false);
    }

    const isDanger = options.danger !== false;
    confirmProcessing = false;

    if (iconWrap) {
      iconWrap.textContent = options.icon || (isDanger ? '🗑️' : '⚠️');
      iconWrap.classList.toggle('is-warning', !isDanger);
    }
    titleEl.textContent = options.title || 'Konfirmasi Hapus Data';
    msgEl.textContent = options.message || 'Apakah Anda yakin akan menghapus data ini?';

    if (itemEl) {
      const preview = String(options.itemLabel || '').trim();
      itemEl.textContent = preview;
      itemEl.hidden = !preview;
    }

    if (loadingEl) loadingEl.hidden = true;
    if (loadingTextEl) {
      loadingTextEl.textContent = options.loadingText || 'Sedang menghapus data, mohon tunggu...';
    }

    cancelBtn.disabled = false;
    cancelBtn.textContent = options.cancelText || 'TIDAK';

    yesBtn.disabled = false;
    yesBtn.className = 'btn ' + (isDanger ? 'btn-danger' : 'btn-primary');
    yesBtn.textContent = options.confirmText || 'YA, Hapus';

    modal.hidden = false;
    refreshBodyScrollLock();

    return new Promise((resolve) => {
      confirmResolver = resolve;

      const handleCancel = () => closeConfirmModal(false);
      cancelBtn.onclick = handleCancel;
      if (backdrop) backdrop.onclick = handleCancel;

      yesBtn.onclick = async () => {
        if (confirmProcessing) return;
        confirmProcessing = true;
        cancelBtn.disabled = true;
        yesBtn.disabled = true;
        yesBtn.innerHTML = `<span class="spinner-inline"></span> ${escapeHtml(options.confirmLoadingLabel || 'Menghapus...')}`;
        if (loadingEl) loadingEl.hidden = false;

        try {
          if (typeof options.onConfirm === 'function') {
            await options.onConfirm();
          }
          confirmResolver = null;
          closeConfirmModal(true);
          if (options.successMessage) {
            showToast(options.successMessage);
          }
          resolve(true);
        } catch (err) {
          confirmResolver = null;
          closeConfirmModal(true);
          showToast((options.errorPrefix || 'Gagal memproses penghapusan: ') + (err && err.message ? err.message : 'Terjadi kesalahan.'), 'error');
          resolve(false);
        }
      };
    });
  }

  let activeModalOnClose = null;

  function syncStickyModalBody(bodyEl) {
    if (!bodyEl || !bodyEl.classList) return;
    const hasSticky = typeof bodyEl.querySelector === 'function' && Boolean(bodyEl.querySelector('.modal-sticky-actions'));
    bodyEl.classList.toggle('has-sticky-actions', hasSticky);
  }

  function refreshBodyScrollLock() {
    if (typeof document === 'undefined' || !document.body) return;
    const anyOpen = ['app-modal', 'crop-modal', 'pdf-preview-modal', 'lightbox-modal', 'confirm-modal'].some((id) => {
      const el = document.getElementById(id);
      return el && !el.hidden;
    });
    if (document.body.style) document.body.style.overflow = anyOpen ? 'hidden' : '';
  }

  function openModal(title, htmlContent, options = {}) {
    if (typeof activeModalOnClose === 'function') {
      const prevCleanup = activeModalOnClose;
      activeModalOnClose = null;
      try { prevCleanup(); } catch (e) { /* ignore */ }
    }
    const modal = document.getElementById('app-modal');
    const dialog = modal ? modal.querySelector('.modal-dialog') : null;
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    if (!modal || !titleEl || !bodyEl) return;
    if (dialog) {
      dialog.classList.remove('modal-lg', 'modal-xl');
      if (options.size === 'lg' || options.size === 'xl') {
        dialog.classList.add('modal-' + options.size);
      }
    }
    titleEl.textContent = title;
    bodyEl.innerHTML = htmlContent;
    bodyEl.scrollTop = 0;
    syncStickyModalBody(bodyEl);
    activeModalOnClose = typeof options.onClose === 'function' ? options.onClose : null;
    modal.hidden = false;
    refreshBodyScrollLock();
  }

  function closeModal() {
    if (typeof activeModalOnClose === 'function') {
      const cleanup = activeModalOnClose;
      activeModalOnClose = null;
      try { cleanup(); } catch (e) { /* ignore */ }
    }
    const modal = document.getElementById('app-modal');
    const dialog = modal ? modal.querySelector('.modal-dialog') : null;
    const bodyEl = document.getElementById('modal-body');
    if (!modal) return;
    modal.hidden = true;
    if (dialog) dialog.classList.remove('modal-lg', 'modal-xl');
    if (bodyEl) {
      if (bodyEl.classList) bodyEl.classList.remove('has-sticky-actions');
      bodyEl.innerHTML = '';
    }
    refreshBodyScrollLock();
  }

  function closeImageCropModal() {
    const modal = document.getElementById('crop-modal');
    const bodyEl = document.getElementById('crop-modal-body');
    if (!modal) return;
    modal.hidden = true;
    if (bodyEl) {
      if (bodyEl.classList) bodyEl.classList.remove('has-sticky-actions');
      bodyEl.innerHTML = '';
    }
    refreshBodyScrollLock();
  }

  /**
   * Modal Cropper Manual dengan rasio terkunci (1:1 Logo, 3:4 Foto Guru, 16:9 Slide Banner)
   * dan kompresi adaptif Base64 (< 46.000 karakter) siap simpan di Google Sheets tanpa DriveApp.
   */
  function openImageCropModal({
    file = null,
    sourceDataUrl = '',
    title = '✂️ Potong Gambar Manual',
    ratioLabel = '1:1',
    aspectRatio = 1,
    outWidth = 480,
    outHeight = 480,
    maxChars = 46000,
    maxSide = 1024,
    freeCrop = false,
    lockRatio = false,
    preferPng = false,
    preserveTransparency = false,
    fitMode = 'cover',
    onCropped
  }) {
    const keepAlpha = Boolean(preserveTransparency || preferPng);
    const minZoom = fitMode === 'contain' ? 0.6 : 1;

    function launchFreeCropWithSource(srcUrl) {
      const modal = document.getElementById('crop-modal');
      const titleEl = document.getElementById('crop-modal-title');
      const bodyEl = document.getElementById('crop-modal-body');
      if (!modal || !titleEl || !bodyEl) return;

      const lockedAspect = lockRatio && Number(aspectRatio) > 0 ? Number(aspectRatio) : 0;

      titleEl.textContent = title;
      bodyEl.innerHTML = `
        <div class="form-grid">
          <div class="callout callout-emerald" style="font-size:13px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span>${lockedAspect
          ? `Geser kotak pilihan ke bagian foto yang diinginkan, atau tarik sudut/tepi kuning untuk memperbesar/memperkecil area crop secara manual (rasio terkunci <strong>${escapeHtml(ratioLabel)}</strong>).`
          : 'Tarik titik sudut/tepi kuning secara <strong>bebas</strong> untuk memotong bagian gambar, atau geser kotak terpilih. Hasil otomatis menyesuaikan piksel agar tetap tajam (&lt; 46.000 char Base64).'}</span>
            <span class="tag tag-emerald" id="ic-free-badge">Memuat gambar...</span>
          </div>
          <div class="free-crop-outer">
            <div class="free-crop-stage" id="ic-free-stage" style="width:320px;height:220px;">
              <img id="ic-free-img" alt="Pratinjau crop manual" draggable="false" />
              <div class="free-crop-rect" id="ic-free-rect">
                <div class="free-crop-grid"></div>
                <span class="free-crop-handle" data-handle="nw"></span>
                <span class="free-crop-handle" data-handle="n"></span>
                <span class="free-crop-handle" data-handle="ne"></span>
                <span class="free-crop-handle" data-handle="e"></span>
                <span class="free-crop-handle" data-handle="se"></span>
                <span class="free-crop-handle" data-handle="s"></span>
                <span class="free-crop-handle" data-handle="sw"></span>
                <span class="free-crop-handle" data-handle="w"></span>
              </div>
            </div>
          </div>
          <div class="modal-sticky-actions">
            <button type="button" class="btn btn-outline btn-sm" id="ic-free-reset">${lockedAspect ? `↺ Area Maksimal ${escapeHtml(ratioLabel)}` : '↺ Pilih Seluruh Gambar'}</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-outline" id="ic-cancel">Batal</button>
              <button type="button" class="btn btn-primary" id="ic-apply">✓ Terapkan &amp; Gunakan Gambar</button>
            </div>
          </div>
        </div>
      `;
      syncStickyModalBody(bodyEl);
      modal.hidden = false;
      refreshBodyScrollLock();

      const stage = document.getElementById('ic-free-stage');
      const imgEl = document.getElementById('ic-free-img');
      const rectEl = document.getElementById('ic-free-rect');
      const badgeEl = document.getElementById('ic-free-badge');
      const resetBtn = document.getElementById('ic-free-reset');
      const cancelBtn = document.getElementById('ic-cancel');
      const applyBtn = document.getElementById('ic-apply');

      let dispW = 320;
      let dispH = 220;
      let natW = 320;
      let natH = 220;
      let rect = { x: 0, y: 0, w: 320, h: 220 };
      const MIN_BOX = 24;

      const getDefaultRect = () => {
        if (!lockedAspect) return { x: 0, y: 0, w: dispW, h: dispH };
        let w = dispW;
        let h = w / lockedAspect;
        if (h > dispH) {
          h = dispH;
          w = h * lockedAspect;
        }
        w = Math.max(MIN_BOX, Math.round(w));
        h = Math.max(MIN_BOX, Math.round(h));
        return {
          x: Math.max(0, Math.round((dispW - w) / 2)),
          y: Math.max(0, Math.round((dispH - h) / 2)),
          w,
          h
        };
      };

      const syncRectUi = () => {
        if (!rectEl) return;
        rectEl.style.left = rect.x + 'px';
        rectEl.style.top = rect.y + 'px';
        rectEl.style.width = rect.w + 'px';
        rectEl.style.height = rect.h + 'px';
        const sw = Math.max(1, Math.round((rect.w / dispW) * natW));
        const sh = Math.max(1, Math.round((rect.h / dispH) * natH));
        const sf = Math.min(1, maxSide / Math.max(sw, sh));
        const resW = lockedAspect && outWidth > 0 ? outWidth : Math.max(1, Math.round(sw * sf));
        const resH = lockedAspect && outHeight > 0 ? outHeight : Math.max(1, Math.round(sh * sf));
        if (badgeEl) {
          badgeEl.textContent = lockedAspect
            ? `Manual ${ratioLabel} • ${resW}×${resH} px • Base64 < 50.000`
            : `Area Bebas • ${resW}×${resH} px • Base64 < 50.000`;
        }
      };

      const img = new Image();
      img.onload = () => {
        natW = img.naturalWidth || img.width || 640;
        natH = img.naturalHeight || img.height || 480;
        const maxW = Math.min(560, Math.max(210, window.innerWidth - 88));
        const maxH = 340;
        const ratio = Math.min(maxW / natW, maxH / natH, 1.5);
        dispW = Math.max(160, Math.round(natW * ratio));
        dispH = Math.max(120, Math.round(natH * ratio));
        if (stage) {
          stage.style.width = dispW + 'px';
          stage.style.height = dispH + 'px';
        }
        if (imgEl) imgEl.src = srcUrl;
        rect = getDefaultRect();
        syncRectUi();
      };
      img.src = srcUrl;

      let dragMode = null;
      let startX = 0;
      let startY = 0;
      let startRect = null;

      if (rectEl) {
        rectEl.addEventListener('pointerdown', (e) => {
          const handleEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-handle]') : null;
          dragMode = handleEl ? handleEl.getAttribute('data-handle') : 'move';
          startX = e.clientX;
          startY = e.clientY;
          startRect = Object.assign({}, rect);
          if (typeof rectEl.setPointerCapture === 'function') {
            try { rectEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          }
          e.preventDefault();
        });

        rectEl.addEventListener('pointermove', (e) => {
          if (!dragMode || !startRect) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          let { x, y, w, h } = startRect;

          if (dragMode === 'move') {
            x = Math.max(0, Math.min(dispW - w, x + dx));
            y = Math.max(0, Math.min(dispH - h, y + dy));
          } else if (lockedAspect > 0) {
            const minW = Math.max(36, Math.round(28 * lockedAspect));
            const hasW = dragMode.includes('w');
            const hasN = dragMode.includes('n');
            const availW = hasW ? startRect.x + startRect.w : dispW - startRect.x;
            const availH = hasN ? startRect.y + startRect.h : dispH - startRect.y;
            const maxW = Math.min(availW, availH * lockedAspect);
            let pw;
            if (dragMode === 'n') pw = (startRect.h - dy) * lockedAspect;
            else if (dragMode === 's') pw = (startRect.h + dy) * lockedAspect;
            else if (hasW) {
              const px = startRect.w - dx;
              const py = (hasN ? startRect.h - dy : startRect.h + dy) * lockedAspect;
              pw = dragMode === 'w' ? px : Math.abs(dx) >= Math.abs(dy) ? px : py;
            } else {
              const px = startRect.w + dx;
              const py = (hasN ? startRect.h - dy : startRect.h + dy) * lockedAspect;
              pw = dragMode === 'e' ? px : Math.abs(dx) >= Math.abs(dy) ? px : py;
            }
            const newW = Math.max(minW, Math.min(maxW, pw));
            const newH = newW / lockedAspect;
            w = newW;
            h = newH;
            x = hasW ? startRect.x + startRect.w - newW : startRect.x;
            y = hasN ? startRect.y + startRect.h - newH : startRect.y;
          } else {
            if (dragMode.includes('e')) {
              w = Math.max(MIN_BOX, Math.min(dispW - x, startRect.w + dx));
            }
            if (dragMode.includes('s')) {
              h = Math.max(MIN_BOX, Math.min(dispH - y, startRect.h + dy));
            }
            if (dragMode.includes('w')) {
              const newX = Math.max(0, Math.min(startRect.x + startRect.w - MIN_BOX, startRect.x + dx));
              w = startRect.x + startRect.w - newX;
              x = newX;
            }
            if (dragMode.includes('n')) {
              const newY = Math.max(0, Math.min(startRect.y + startRect.h - MIN_BOX, startRect.y + dy));
              h = startRect.y + startRect.h - newY;
              y = newY;
            }
          }

          rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
          syncRectUi();
        });

        const stopDrag = () => {
          dragMode = null;
          startRect = null;
        };
        rectEl.addEventListener('pointerup', stopDrag);
        rectEl.addEventListener('pointercancel', stopDrag);
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          rect = getDefaultRect();
          syncRectUi();
        });
      }

      if (cancelBtn) cancelBtn.addEventListener('click', closeImageCropModal);
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          applyBtn.disabled = true;
          applyBtn.innerHTML = '<span class="spinner-inline"></span> Mengompres Base64...';
          try {
            const sx = Math.max(0, (rect.x / dispW) * natW);
            const sy = Math.max(0, (rect.y / dispH) * natH);
            const sw = Math.max(16, Math.min(natW - sx, (rect.w / dispW) * natW));
            const sh = Math.max(16, Math.min(natH - sy, (rect.h / dispH) * natH));
            const scaleFactor = Math.min(1, maxSide / Math.max(sw, sh));
            const targetW = lockedAspect && outWidth > 0 ? outWidth : Math.max(32, Math.round(sw * scaleFactor));
            const targetH = lockedAspect && outHeight > 0 ? outHeight : Math.max(32, Math.round(sh * scaleFactor));

            const outCanvas = document.createElement('canvas');
            outCanvas.width = targetW;
            outCanvas.height = targetH;
            const outCtx = outCanvas.getContext('2d');
            outCtx.imageSmoothingEnabled = true;
            outCtx.imageSmoothingQuality = 'high';
            outCtx.clearRect(0, 0, targetW, targetH);
            outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

            const result = compressCanvasToBudget(outCanvas, {
              maxChars,
              sharpMode: true,
              preferPng: lockedAspect ? Boolean(preferPng) : true,
              preserveTransparency: keepAlpha
            });
            closeImageCropModal();
            if (typeof onCropped === 'function') {
              onCropped(result.dataUrl, Object.assign({ width: targetW, height: targetH }, result));
            }
          } catch (err) {
            showToast('Gagal memotong gambar: ' + err.message, 'error');
            applyBtn.disabled = false;
            applyBtn.textContent = '✓ Terapkan & Gunakan Gambar';
          }
        });
      }
    }

    function launchWithSource(srcUrl) {
      if (freeCrop) {
        launchFreeCropWithSource(srcUrl);
        return;
      }
      const modal = document.getElementById('crop-modal');
      const titleEl = document.getElementById('crop-modal-title');
      const bodyEl = document.getElementById('crop-modal-body');
      if (!modal || !titleEl || !bodyEl) return;

      const prevW = aspectRatio >= 1.4 ? 448 : aspectRatio < 1 ? 240 : 280;
      const prevH = Math.round(prevW / aspectRatio);

      titleEl.textContent = title;
      bodyEl.innerHTML = `
        <div class="form-grid">
          <div class="callout callout-emerald" style="font-size:13px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span>Geser gambar langsung atau atur slider Zoom &amp; Posisi hingga pas di bingkai.${keepAlpha ? ' Latar transparan PNG tetap dipertahankan.' : ''} Hasil dikompres Base64 (&lt; 46.000 karakter) agar aman di Google Sheets.</span>
            <span class="tag tag-emerald">Rasio ${escapeHtml(ratioLabel)} • ${outWidth}×${outHeight} px${keepAlpha ? ' • Transparan' : ''}</span>
          </div>
          <div class="crop-stage">
            <canvas id="ic-canvas" width="${prevW}" height="${prevH}" class="crop-canvas" style="width:${prevW}px;height:${prevH}px;max-width:100%;aspect-ratio:${prevW}/${prevH};"></canvas>
            <div style="width:100%;max-width:440px;display:grid;gap:8px;">
              <label style="font-size:12.5px;font-weight:700;display:flex;justify-content:space-between;">
                <span>Zoom Gambar</span><span id="ic-zoom-lbl">1.0x</span>
              </label>
              <input id="ic-zoom" type="range" min="${minZoom}" max="3.5" step="0.05" value="1" />
              <div class="form-row-2">
                <div class="field">
                  <label for="ic-pan-x" style="font-size:12px;">Geser Horizontal (X)</label>
                  <input id="ic-pan-x" type="range" min="-220" max="220" step="1" value="0" />
                </div>
                <div class="field">
                  <label for="ic-pan-y" style="font-size:12px;">Geser Vertikal (Y)</label>
                  <input id="ic-pan-y" type="range" min="-220" max="220" step="1" value="0" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-sticky-actions">
            <button type="button" class="btn btn-outline btn-sm" id="ic-reset">↺ Reset Posisi</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-outline" id="ic-cancel">Batal</button>
              <button type="button" class="btn btn-primary" id="ic-apply">✓ Terapkan &amp; Gunakan Gambar</button>
            </div>
          </div>
        </div>
      `;
      syncStickyModalBody(bodyEl);
      modal.hidden = false;
      refreshBodyScrollLock();

      const canvas = document.getElementById('ic-canvas');
      const zoomInp = document.getElementById('ic-zoom');
      const zoomLbl = document.getElementById('ic-zoom-lbl');
      const panXInp = document.getElementById('ic-pan-x');
      const panYInp = document.getElementById('ic-pan-y');
      const resetBtn = document.getElementById('ic-reset');
      const cancelBtn = document.getElementById('ic-cancel');
      const applyBtn = document.getElementById('ic-apply');

      const img = new Image();
      let zoom = 1;
      let panX = 0;
      let panY = 0;

      function drawTarget(targetCanvas, showGuide) {
        if (!targetCanvas || !targetCanvas.getContext || !img.width) return;
        const w = targetCanvas.width;
        const h = targetCanvas.height;
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        const baseScale = fitMode === 'contain' ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
        const drawW = img.width * baseScale * zoom;
        const drawH = img.height * baseScale * zoom;
        const factorX = w / prevW;
        const factorY = h / prevH;
        const dx = (w - drawW) / 2 + panX * factorX;
        const dy = (h - drawH) / 2 + panY * factorY;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        if (showGuide) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(3, 3, w - 6, h - 6);
          ctx.beginPath();
          ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
          ctx.moveTo((2 * w) / 3, 0); ctx.lineTo((2 * w) / 3, h);
          ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
          ctx.moveTo(0, (2 * h) / 3); ctx.lineTo(w, (2 * h) / 3);
          ctx.stroke();
          ctx.restore();
        }
      }

      img.onload = () => drawTarget(canvas, true);
      img.src = srcUrl;

      const syncFromInputs = () => {
        zoom = Number(zoomInp.value || 1);
        panX = Number(panXInp.value || 0);
        panY = Number(panYInp.value || 0);
        if (zoomLbl) zoomLbl.textContent = zoom.toFixed(1) + 'x';
        drawTarget(canvas, true);
      };
      if (zoomInp) zoomInp.addEventListener('input', syncFromInputs);
      if (panXInp) panXInp.addEventListener('input', syncFromInputs);
      if (panYInp) panYInp.addEventListener('input', syncFromInputs);

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          zoom = 1; panX = 0; panY = 0;
          if (zoomInp) zoomInp.value = '1';
          if (panXInp) panXInp.value = '0';
          if (panYInp) panYInp.value = '0';
          if (zoomLbl) zoomLbl.textContent = '1.0x';
          drawTarget(canvas, true);
        });
      }

      if (canvas) {
        let dragging = false;
        let sx = 0;
        let sy = 0;
        let ipx = 0;
        let ipy = 0;
        canvas.addEventListener('pointerdown', (e) => {
          dragging = true;
          sx = e.clientX;
          sy = e.clientY;
          ipx = panX;
          ipy = panY;
        });
        canvas.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          panX = Math.max(-220, Math.min(220, ipx + (e.clientX - sx)));
          panY = Math.max(-220, Math.min(220, ipy + (e.clientY - sy)));
          if (panXInp) panXInp.value = String(Math.round(panX));
          if (panYInp) panYInp.value = String(Math.round(panY));
          drawTarget(canvas, true);
        });
        const stopDrag = () => { dragging = false; };
        canvas.addEventListener('pointerup', stopDrag);
        canvas.addEventListener('pointerleave', stopDrag);
      }

      if (cancelBtn) cancelBtn.addEventListener('click', closeImageCropModal);
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          applyBtn.disabled = true;
          applyBtn.innerHTML = '<span class="spinner-inline"></span> Memproses Base64...';
          try {
            const outCanvas = document.createElement('canvas');
            outCanvas.width = outWidth;
            outCanvas.height = outHeight;
            drawTarget(outCanvas, false);
            const result = compressCanvasToBudget(outCanvas, {
              maxChars,
              preferPng,
              preserveTransparency: keepAlpha
            });
            closeImageCropModal();
            if (typeof onCropped === 'function') onCropped(result.dataUrl, result);
          } catch (err) {
            showToast('Gagal memotong gambar: ' + err.message, 'error');
            applyBtn.disabled = false;
            applyBtn.textContent = '✓ Terapkan & Gunakan Gambar';
          }
        });
      }
    }

    if (sourceDataUrl) {
      launchWithSource(sourceDataUrl);
      return;
    }

    if (!file || !file.type || !file.type.startsWith('image/')) {
      showToast('Pilih file gambar yang valid (JPG/PNG/WebP).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => launchWithSource(String(reader.result || ''));
    reader.onerror = () => showToast('Gagal membaca file gambar.', 'error');
    reader.readAsDataURL(file);
  }

  function openDocModal(title, url) {
    const clean = safeNavUrl(url);
    if (!clean || clean.startsWith('#')) {
      showToast('Tautan dokumen tidak valid atau belum tersedia.', 'warning');
      return;
    }
    openModal(
      title,
      `<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="tag tag-emerald">Pratinjau Dokumen Pembelajaran</span>
        <a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">Buka di Tab Baru ↗</a>
      </div>
      <iframe class="embed-doc" src="${escapeHtml(clean)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    );
  }

  function closePdfPreviewModal() {
    const modal = document.getElementById('pdf-preview-modal');
    const bodyEl = document.getElementById('pdf-preview-body');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (bodyEl) bodyEl.innerHTML = '';
    refreshBodyScrollLock();
  }

  /**
   * Menyusun dokumen HTML A4 resmi berkop surat lengkap:
   * - Logo Instansi di kiri, Logo Sekolah di kanan
   * - Nama Instansi -> Nama Sekolah -> Alamat -> Kontak Telp/Email/Website
   */
  function buildKopSuratPdfHtml({
    fileNameTitle = 'Dokumen_Bilik_Tarbiyah',
    docTitle = 'LAPORAN RESMI',
    docSubtitle = '',
    metaPairs = [],
    tableHeaders = [],
    tableRows = [],
    centerCols = [],
    summaryText = '',
    signaturePlaceDate = '',
    signatureRole = 'Guru Mata Pelajaran PAI & Budi Pekerti,',
    orientation = 'portrait',
    cfg = {}
  }) {
    const instansiLogo = resolveImageUrl(cfg.instansiLogoUrl || '');
    const schoolLogo = resolveImageUrl(cfg.schoolLogoUrl || cfg.siteLogoUrl || '');
    const instansiName = cfg.namaInstansi || 'PEMERINTAH PROVINSI JAMBI';
    const schoolName = cfg.schoolName || 'SMAN 20 TEBO';
    const addressLine = [cfg.schoolAddress, cfg.schoolCity].filter((x) => x && x !== '-').join(', ');
    const contactParts = [];
    if (cfg.schoolPhone && cfg.schoolPhone !== '-') contactParts.push(`Telp: ${cfg.schoolPhone}`);
    if (cfg.schoolEmail && cfg.schoolEmail !== '-') contactParts.push(`Email: ${cfg.schoolEmail}`);
    if (cfg.schoolWebsite && cfg.schoolWebsite !== '-') contactParts.push(`Web: ${cfg.schoolWebsite}`);

    const metaGridHtml = metaPairs.length
      ? `<div class="meta-grid">
          ${metaPairs
        .map(
          (m) => `<div class="meta-item"><span class="meta-lbl">${escapeHtml(m.label)}:</span> <strong>${escapeHtml(m.value || '-')}</strong></div>`
        )
        .join('')}
        </div>`
      : '';

    const thHtml = tableHeaders
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join('');
    const tbHtml = tableRows.length
      ? tableRows
        .map(
          (row, rIdx) => `<tr class="${rIdx % 2 === 1 ? 'alt' : ''}">
              ${row
              .map((cellVal, cIdx) => {
                const isC = centerCols.includes(cIdx);
                return `<td style="text-align:${isC ? 'center' : 'left'};">${escapeHtml(cellVal === null || cellVal === undefined ? '' : cellVal)}</td>`;
              })
              .join('')}
            </tr>`
        )
        .join('')
      : `<tr><td colspan="${Math.max(1, tableHeaders.length)}" style="text-align:center;color:#64748b;">Tidak ada data.</td></tr>`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(fileNameTitle)}</title>
  <style>
    @page { size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 13mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18px 22px;
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.4;
    }
    .kop-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 3px solid #0f172a;
    }
    .kop-double-rule {
      border-top: 1px solid #0f172a;
      margin-top: 2px;
      margin-bottom: 14px;
    }
    .kop-logo {
      width: 76px;
      height: 76px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kop-logo img {
      max-width: 74px;
      max-height: 74px;
      object-fit: contain;
      display: block;
    }
    .kop-center {
      flex: 1;
      text-align: center;
      padding: 0 4px;
    }
    .kop-instansi {
      font-size: 12.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0;
    }
    .kop-school {
      font-size: 15.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 2px 0 3px;
    }
    .kop-addr {
      font-size: 9.5pt;
      margin: 0;
      color: #1e293b;
    }
    .kop-contact {
      font-size: 9pt;
      margin: 1px 0 0;
      color: #334155;
    }
    .doc-heading {
      text-align: center;
      margin: 0 0 12px;
    }
    .doc-heading h1 {
      margin: 0;
      font-size: 13.5pt;
      font-weight: 700;
      text-transform: uppercase;
      text-decoration: underline;
      letter-spacing: 0.4px;
    }
    .doc-heading p {
      margin: 4px 0 0;
      font-size: 10pt;
      color: #334155;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 16px;
      padding: 8px 12px;
      margin-bottom: 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 10pt;
    }
    .meta-item {
      word-break: break-word;
    }
    .meta-lbl {
      color: #475569;
    }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.8pt;
      margin-bottom: 10px;
    }
    table.doc-table th,
    table.doc-table td {
      border: 1px solid #1e293b;
      padding: 5px 7px;
      vertical-align: middle;
      word-break: break-word;
    }
    table.doc-table th {
      background: #064e3b;
      color: #ffffff;
      text-align: center;
      font-weight: 700;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.2pt;
    }
    table.doc-table tr.alt td {
      background: #f8fafc;
    }
    .summary-box {
      padding: 7px 10px;
      border: 1px solid #064e3b;
      background: #ecfdf5;
      color: #064e3b;
      font-weight: 700;
      font-size: 10pt;
      text-align: center;
      margin-bottom: 16px;
    }
    .sig-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .sig-box {
      min-width: 240px;
      text-align: left;
      font-size: 10.5pt;
    }
    .sig-space {
      height: 56px;
    }
    .sig-name {
      font-weight: 700;
      text-decoration: underline;
    }
    @media print {
      body { padding: 0; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="kop-wrap">
      <div class="kop-logo">${instansiLogo ? `<img src="${escapeHtml(instansiLogo)}" alt="Logo Instansi" />` : ''}</div>
      <div class="kop-center">
        <p class="kop-instansi">${escapeHtml(instansiName)}</p>
        <p class="kop-school">${escapeHtml(schoolName)}</p>
        ${addressLine ? `<p class="kop-addr">${escapeHtml(addressLine)}</p>` : ''}
        ${contactParts.length ? `<p class="kop-contact">${escapeHtml(contactParts.join('  •  '))}</p>` : ''}
      </div>
      <div class="kop-logo">${schoolLogo ? `<img src="${escapeHtml(schoolLogo)}" alt="Logo Sekolah" />` : ''}</div>
    </div>
    <div class="kop-double-rule"></div>
  </header>

  <section class="doc-heading">
    <h1>${escapeHtml(docTitle)}</h1>
    ${docSubtitle ? `<p>${escapeHtml(docSubtitle)}</p>` : ''}
  </section>

  ${metaGridHtml}

  <table class="doc-table">
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${tbHtml}</tbody>
  </table>

  ${summaryText ? `<div class="summary-box">${escapeHtml(summaryText)}</div>` : ''}

  <div class="sig-wrap">
    <div class="sig-box">
      <div>${escapeHtml(signaturePlaceDate || `${cfg.schoolCity || 'Tebo'}, ${formatDateId(new Date().toISOString().slice(0, 10))}`)}</div>
      <div>${escapeHtml(signatureRole)}</div>
      <div class="sig-space"></div>
      <div class="sig-name">${escapeHtml(cfg.teacherName || 'Guru PAI-BP')}</div>
      ${cfg.teacherNip ? `<div>NIP. ${escapeHtml(cfg.teacherNip)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  function openPdfPreviewModal({ modalTitle = '📄 Pratinjau Dokumen PDF', docHtml = '' }) {
    const modal = document.getElementById('pdf-preview-modal');
    const titleEl = document.getElementById('pdf-preview-title');
    const bodyEl = document.getElementById('pdf-preview-body');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = modalTitle;
    bodyEl.innerHTML = `
      <div class="pdf-preview-toolbar">
        <div style="font-size:13px;color:var(--emerald-950);">
          <strong>Siap Unduh PDF:</strong> Klik tombol <strong>Simpan / Cetak PDF</strong> lalu pilih tujuan <em>"Save as PDF / Simpan sebagai PDF"</em>.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-primary btn-sm" id="pdf-btn-print">⬇️ Simpan / Cetak PDF</button>
          <button type="button" class="btn btn-outline btn-sm" id="pdf-btn-close">Tutup</button>
        </div>
      </div>
      <iframe id="pdf-preview-iframe" class="pdf-preview-iframe" title="${escapeHtml(modalTitle)}"></iframe>
    `;
    modal.hidden = false;
    refreshBodyScrollLock();

    const iframeEl = document.getElementById('pdf-preview-iframe');
    if (iframeEl) {
      iframeEl.srcdoc = docHtml;
    }

    const closeBtn = document.getElementById('pdf-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', closePdfPreviewModal);

    const printBtn = document.getElementById('pdf-btn-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        if (!iframeEl || !iframeEl.contentWindow) {
          showToast('Pratinjau dokumen belum siap dicetak.', 'warning');
          return;
        }
        try {
          iframeEl.contentWindow.focus();
          iframeEl.contentWindow.print();
        } catch (err) {
          showToast('Gagal membuka dialog cetak PDF: ' + err.message, 'error');
        }
      });
    }
  }

  function closeLightboxModal() {
    const modal = document.getElementById('lightbox-modal');
    const bodyEl = document.getElementById('lightbox-body');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (bodyEl) {
      if (bodyEl.classList) bodyEl.classList.remove('has-sticky-actions');
      bodyEl.innerHTML = '';
    }
    refreshBodyScrollLock();
  }

  function openImageLightbox(title, url, caption = '') {
    const src = resolveImageUrl(url);
    if (!src) {
      showToast('Gambar tidak tersedia.', 'warning');
      return;
    }
    const lbModal = document.getElementById('lightbox-modal');
    const lbTitle = document.getElementById('lightbox-title');
    const lbBody = document.getElementById('lightbox-body');
    const html = `<figure style="margin:0;">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(title || 'Gambar Pembelajaran')}" style="width:100%;max-height:66vh;object-fit:contain;border-radius:12px;background:#0f172a;" />
      ${caption ? `<figcaption style="margin-top:12px;font-size:14px;color:var(--slate-700);">${escapeHtml(caption)}</figcaption>` : ''}
    </figure>
    <div class="modal-sticky-actions modal-sticky-actions-end">
      <button type="button" class="btn btn-primary" id="lb-close-bottom">Tutup Pratinjau</button>
    </div>`;

    if (lbModal && lbTitle && lbBody) {
      lbTitle.textContent = title || 'Pratinjau Foto';
      lbBody.innerHTML = html;
      syncStickyModalBody(lbBody);
      lbModal.hidden = false;
      refreshBodyScrollLock();
      const closeBtn = document.getElementById('lb-close-bottom');
      if (closeBtn) closeBtn.addEventListener('click', closeLightboxModal);
      return;
    }
    openModal(title || 'Pratinjau Gambar', html);
    const closeBtn = document.getElementById('lb-close-bottom');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  function openAiAssistantModal() {
    const materiList = (window.BTD_API.state.data.materi || []).filter((m) => m.aktif !== false);
    const smartPaiUrl = safeUrl((window.BTD_API.state.data.pengaturan || {}).smartPaiUrl) || 'https://smartpai.kemenag.go.id';

    const optionsHtml = materiList
      .map((m) => `<option value="${escapeHtml(m.id)}">Kelas ${escapeHtml(m.jenjang)} • Bab ${escapeHtml(m.bab)}: ${escapeHtml(m.judul)}</option>`)
      .join('');

    openModal(
      '✨ Asisten Belajar PAI & Rujukan Smart PAI Kemenag',
      `<div class="form-grid">
        <div class="callout callout-emerald">
          <strong>Pemanfaatan AI Secara Bijak &amp; Terarah:</strong>
          Pilih materi PAI lalu susun prompt belajar terstruktur agar AI membantu pemahaman mendalam (<em>Deep Learning</em>), bukan sekadar menyalin jawaban instan.
        </div>

        <div class="form-row-2">
          <div class="field">
            <label for="ai-materi-select">Pilih Bab Materi PAI</label>
            <select id="ai-materi-select" class="select">${optionsHtml}</select>
          </div>
          <div class="field">
            <label for="ai-mode-select">Fokus Bantuan Belajar</label>
            <select id="ai-mode-select" class="select">
              <option value="ayat">Bedah Ayat, Terjemah Per Kata, &amp; Tajwid</option>
              <option value="kbc">Refleksi Nilai Kurikulum Berbasis Cinta (KBC)</option>
              <option value="hots">Latihan Analisis Studi Kasus HOTS</option>
              <option value="ringkas">Peta Konsep &amp; Persiapan Ulangan Harian</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="ai-prompt-output">Prompt Terpandu (Siap Salin)</label>
          <textarea id="ai-prompt-output" class="textarea" rows="5" readonly></textarea>
        </div>

        <div class="modal-sticky-actions">
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" class="btn btn-primary" id="btn-copy-ai-prompt">📋 Salin Prompt Belajar</button>
            <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Buka Gemini ↗</a>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="${escapeHtml(smartPaiUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold">📚 Smart PAI ↗</a>
            <button type="button" class="btn btn-outline" id="btn-ai-close">Tutup</button>
          </div>
        </div>
      </div>`
    );

    const aiCloseBtn = document.getElementById('btn-ai-close');
    if (aiCloseBtn) aiCloseBtn.addEventListener('click', closeModal);

    const selMateri = document.getElementById('ai-materi-select');
    const selMode = document.getElementById('ai-mode-select');
    const out = document.getElementById('ai-prompt-output');

    function rebuildPrompt() {
      const m = materiList.find((x) => x.id === selMateri.value) || materiList[0];
      if (!m) return;
      const mode = selMode.value;
      const prompts = {
        ayat: `Bertindaklah sebagai guru PAI SMA yang ramah dan membimbing secara mendalam. Bantu saya memahami materi Kelas ${m.jenjang} Bab ${m.bab} "${m.judul}" (Elemen: ${m.elemen}). Jelaskan ayat Al-Qur'an atau hadis utamanya, 3 contoh hukum tajwid beserta alasannya, lalu ajukan 2 pertanyaan refleksi agar saya berpikir kritis.`,
        kbc: `Bantu saya merefleksikan nilai Kurikulum Berbasis Cinta (kasih sayang kepada Allah, sesama, dan lingkungan) pada materi PAI Kelas ${m.jenjang} Bab ${m.bab}: "${m.judul}". Berikan 3 contoh aksi nyata sederhana di sekolah dan rumah selama 7 hari.`,
        hots: `Berikan 1 studi kasus kehidupan pelajar SMA saat ini yang berkaitan dengan PAI Bab "${m.judul}", lalu pandu saya langkah demi langkah menganalisisnya dengan dalil yang relevan tanpa langsung memberi jawaban akhir.`,
        ringkas: `Susun ringkasan peta konsep materi PAI Kelas ${m.jenjang} Bab ${m.bab}: "${m.judul}" dan buatkan 3 soal latihan pemahaman konseptual beserta petunjuk cara menjawabnya.`
      };
      out.value = prompts[mode] || prompts.ayat;
    }

    if (selMateri && selMode && out) {
      selMateri.addEventListener('change', rebuildPrompt);
      selMode.addEventListener('change', rebuildPrompt);
      rebuildPrompt();
    }

    const copyBtn = document.getElementById('btn-copy-ai-prompt');
    if (copyBtn && out) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(out.value);
          showToast('Prompt belajar PAI berhasil disalin!');
        } catch (err) {
          out.select();
          document.execCommand('copy');
          showToast('Prompt belajar PAI disalin.');
        }
      });
    }
  }

  const DEFAULT_BRAND_SVG = `<svg viewBox="0 0 40 40" width="38" height="38" fill="none"><rect width="40" height="40" rx="11" fill="url(#brandGrad)"/><path d="M20 7L24 15L32 16.2L26.2 21.8L27.6 30L20 26L12.4 30L13.8 21.8L8 16.2L16 15L20 7Z" stroke="#FCD34D" stroke-width="1.8" fill="rgba(252,211,77,0.18)"/><path d="M14 27.5C16.2 25.8 18.2 25.5 20 26.8C21.8 25.5 23.8 25.8 26 27.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/><defs><linearGradient id="brandGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stop-color="#064E3B"/><stop offset="1" stop-color="#0F766E"/></linearGradient></defs></svg>`;
  const DEFAULT_FAVICON_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%230d5c46'/%3E%3Cpath d='M32 10l6.2 12.6L52 24.6l-10 9.8 2.4 13.8L32 41.7l-12.4 6.5L22 34.4l-10-9.8 13.8-2z' fill='%23f59e0b'/%3E%3Ccircle cx='32' cy='31' r='7' fill='%230d5c46'/%3E%3C/svg%3E";

  function inferIconMimeType(src) {
    const clean = String(src || '').trim();
    const dataMatch = clean.match(/^data:(image\/[a-zA-Z0-9+.-]+);/);
    if (dataMatch && dataMatch[1]) return dataMatch[1];
    if (/\.svg(\?|$)/i.test(clean)) return 'image/svg+xml';
    if (/\.webp(\?|$)/i.test(clean)) return 'image/webp';
    if (/\.ico(\?|$)/i.test(clean)) return 'image/x-icon';
    return 'image/png';
  }

  function resolveActivePortalRole(currentRoute, syncPref = false) {
    const api = window.BTD_API;
    const stu = api && (!api.isStudentSessionValid || api.isStudentSessionValid()) ? api.state.studentSession : null;
    const admOk = api && typeof api.isAdminSessionValid === 'function'
      ? api.isAdminSessionValid()
      : Boolean(api && api.state && api.state.adminUnlocked);

    let tabRolePref = '';
    try {
      tabRolePref = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('btd_tab_active_role') || '') : '';
      if (syncPref && typeof sessionStorage !== 'undefined') {
        if (currentRoute === 'admin') {
          tabRolePref = 'admin';
          sessionStorage.setItem('btd_tab_active_role', 'admin');
        } else if (currentRoute === 'siswa') {
          tabRolePref = 'student';
          sessionStorage.setItem('btd_tab_active_role', 'student');
        }
      }
    } catch (e) { /* abaikan */ }

    let role = null;
    if (currentRoute === 'admin') {
      role = admOk ? 'admin' : null;
    } else if (currentRoute === 'siswa') {
      role = stu ? 'student' : null;
    } else if (tabRolePref === 'admin' && admOk) {
      role = 'admin';
    } else if (tabRolePref === 'student' && stu) {
      role = 'student';
    } else if (stu) {
      role = 'student';
    } else if (admOk) {
      role = 'admin';
    }
    return { role, stu, admOk };
  }

  function syncChromeMetadata() {
    const api = window.BTD_API;
    const cfg = (api && api.state && api.state.data && api.state.data.pengaturan) || window.BTD_SEED.pengaturan;
    const isLive = api && api.state && api.state.isLive;
    const isSyncing = api && api.state && api.state.isSyncing;

    const badge = document.getElementById('sync-status-badge');
    const text = document.getElementById('sync-status-text');
    if (badge && text) {
      if (badge.classList) badge.classList.toggle('is-live', Boolean(isLive));
      text.textContent = isLive ? 'Mode Online' : isSyncing ? 'Menyinkronkan...' : 'Mode Offline';
    }

    const meta = document.getElementById('header-school-meta');
    if (meta) meta.textContent = `${cfg.schoolName} • ${cfg.academicYear}`;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };
    setText('brand-site-name', cfg.siteName);
    setText('brand-subtitle', cfg.siteSubtitle);
    setText('footer-site-name', cfg.siteName);
    setText('footer-copyright-name', cfg.siteName);

    const ft = document.getElementById('footer-teacher-info');
    if (ft) {
      ft.innerHTML = `Created by <strong>${escapeHtml(cfg.teacherName)}</strong> • Guru PAI-BP ${escapeHtml(cfg.schoolName)}`;
    }

    // Logo 1:1 Header, Footer Kiri & Favicon Tab Browser (mengikuti Logo Utama Portal)
    const logoSrc = resolveImageUrl(cfg.siteLogoUrl);
    const logoMarkup = logoSrc
      ? `<img src="${escapeHtml(logoSrc)}" alt="Logo ${escapeHtml(cfg.siteName)}" class="brand-logo-img" />`
      : DEFAULT_BRAND_SVG;
    const emblem = document.getElementById('brand-emblem');
    if (emblem) emblem.innerHTML = logoMarkup;
    const footerLogo = document.getElementById('footer-logo-wrap');
    if (footerLogo) {
      footerLogo.innerHTML = logoSrc
        ? `<img src="${escapeHtml(logoSrc)}" alt="Logo ${escapeHtml(cfg.siteName)}" />`
        : DEFAULT_BRAND_SVG;
    }

    const faviconEl = document.getElementById('app-favicon')
      || (typeof document.querySelector === 'function' ? document.querySelector('link[rel*="icon"]') : null);
    if (faviconEl) {
      const nextHref = logoSrc || DEFAULT_FAVICON_URL;
      const nextMime = logoSrc ? inferIconMimeType(logoSrc) : 'image/svg+xml';
      if (typeof faviconEl.setAttribute === 'function') {
        faviconEl.setAttribute('type', nextMime);
        faviconEl.setAttribute('href', nextHref);
      }
      faviconEl.type = nextMime;
      faviconEl.href = nextHref;
    }

    // Tema Gradien Portal (Banner & Footer) + Gradien Tombol Aksi & Background Situs
    const rootStyle = document.documentElement && document.documentElement.style;
    if (rootStyle && typeof rootStyle.setProperty === 'function') {
      const hexOk = (v, fb) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '').trim()) ? String(v).trim() : fb);
      const tc1 = hexOk(cfg.themeColor1, '#042f24');
      const tc2 = hexOk(cfg.themeColor2, '#064e3b');
      const tc3 = hexOk(cfg.themeColor3, '#0f766e');
      rootStyle.setProperty('--theme-c1', tc1);
      rootStyle.setProperty('--theme-c2', tc2);
      rootStyle.setProperty('--theme-c3', tc3);

      const preset = String(cfg.btnGradPreset || 'zamrud-toska');
      const defaultBc1 = preset === 'zamrud-emas' ? '#065f46' : preset === 'ikuti-tema' ? tc1 : '#064e3b';
      const defaultBc2 = preset === 'zamrud-emas' ? '#d97706' : preset === 'ikuti-tema' ? tc3 : '#0d9488';
      rootStyle.setProperty('--btn-c1', hexOk(cfg.btnColor1, defaultBc1));
      rootStyle.setProperty('--btn-c2', hexOk(cfg.btnColor2, defaultBc2));

      const bgUrl = resolveImageUrl(cfg.themeBgUrl);
      if (bgUrl) {
        rootStyle.setProperty('--theme-bg-image', `url("${bgUrl.replace(/"/g, '%22')}")`);
        if (document.documentElement.classList) document.documentElement.classList.add('has-theme-bg');
      } else {
        rootStyle.setProperty('--theme-bg-image', 'none');
        if (document.documentElement.classList) document.documentElement.classList.remove('has-theme-bg');
      }
    }

    const rawHash = typeof window !== 'undefined' && window.location
      ? (window.location.hash || '#beranda').replace(/^#/, '')
      : 'beranda';
    const [hashPath, hashQuery] = rawHash.split('?');
    const currentRoute = hashPath || 'beranda';
    const routeParamsObj = {};
    if (hashQuery) {
      if (typeof URLSearchParams === 'function') {
        new URLSearchParams(hashQuery).forEach((v, k) => {
          routeParamsObj[k] = v;
        });
      } else {
        hashQuery.split('&').forEach((part) => {
          const [k, v] = part.split('=');
          if (k) routeParamsObj[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      }
    }
    renderSchoolMapBand(currentRoute);

    const navLoginBtn = document.getElementById('btn-nav-login');
    const headerLoginBtn = document.getElementById('btn-header-login');
    const mobileLoginBtn = document.getElementById('btn-mobile-login');
    const bottomLoginBtn = document.getElementById('btn-bottom-login');
    const bottomLoginLabel = document.getElementById('bottom-login-label');
    const footerLoginBtn = document.getElementById('btn-footer-login');
    const stuBottomNav = document.getElementById('student-bottom-nav');
    const headerStuLogoutBtn = document.getElementById('btn-header-stu-logout');
    const { role: activeHeaderRole, stu } = resolveActivePortalRole(currentRoute, true);

    const isStudentPortalView = Boolean(
      stu && (currentRoute === 'siswa' || (currentRoute === 'materi' && routeParamsObj.from === 'siswa'))
    );
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.toggle('is-student-portal-active', isStudentPortalView);
    }
    if (stuBottomNav) stuBottomNav.hidden = !isStudentPortalView;
    if (headerStuLogoutBtn) headerStuLogoutBtn.hidden = !isStudentPortalView;

    if (stuBottomNav && isStudentPortalView) {
      const stuTab = currentRoute === 'materi' && routeParamsObj.from === 'siswa'
        ? 'materi'
        : String(
          (typeof window !== 'undefined' && window.__btdStudentActiveTab) ||
          routeParamsObj.tab ||
          'dashboard'
        );
      stuBottomNav.querySelectorAll('[data-stu-bottom-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-stu-bottom-tab') === stuTab);
      });
      const matLbl = document.getElementById('stu-bn-materi-label');
      if (matLbl) matLbl.textContent = 'Materi';
    }
    if (activeHeaderRole === 'admin') {
      const rawTeacher = String(cfg.teacherName || '').split(',')[0].trim();
      const shortTeacher = rawTeacher ? rawTeacher.split(/\s+/).slice(0, 2).join(' ') : 'Akun Guru';
      if (navLoginBtn) {
        navLoginBtn.textContent = `👩‍🏫 ${shortTeacher} (Guru)`;
        navLoginBtn.title = `Login sebagai Guru: ${cfg.teacherName || 'Guru PAI-BP'} — Klik untuk info/logout`;
      }
      if (headerLoginBtn) {
        if (headerLoginBtn.classList) headerLoginBtn.classList.add('has-session');
        headerLoginBtn.title = `Login sebagai Guru: ${cfg.teacherName || 'Guru PAI-BP'} — Klik untuk info/logout`;
        if (typeof headerLoginBtn.setAttribute === 'function') {
          headerLoginBtn.setAttribute('aria-label', `Akun Guru: ${shortTeacher} (Info atau Logout)`);
        }
      }
      if (mobileLoginBtn) {
        mobileLoginBtn.textContent = `👩‍🏫 ${shortTeacher} • Akun Guru`;
      }
      if (bottomLoginBtn) {
        bottomLoginBtn.classList.add('has-student');
        bottomLoginBtn.title = `Login sebagai Guru: ${cfg.teacherName || 'Guru PAI-BP'}`;
      }
      if (bottomLoginLabel) {
        bottomLoginLabel.textContent = 'Akun Guru';
      }
      if (footerLoginBtn) {
        footerLoginBtn.textContent = `👩‍🏫 Akun Guru (${shortTeacher})`;
      }
    } else if (activeHeaderRole === 'student' && stu) {
      const firstName = String(stu.nama || 'Siswa').trim().split(/\s+/)[0];
      if (navLoginBtn) {
        navLoginBtn.textContent = `🎓 ${firstName} (${stu.kelas || ''})`;
        navLoginBtn.title = `Login sebagai ${stu.nama} • NISN ${stu.nisn || stu.id} — Klik untuk info/logout`;
      }
      if (headerLoginBtn) {
        if (headerLoginBtn.classList) headerLoginBtn.classList.add('has-session');
        headerLoginBtn.title = `Login sebagai ${stu.nama} (${stu.kelas || ''}) — Klik untuk info/logout`;
        if (typeof headerLoginBtn.setAttribute === 'function') {
          headerLoginBtn.setAttribute('aria-label', `Akun Siswa: ${firstName} (Info atau Logout)`);
        }
      }
      if (mobileLoginBtn) {
        mobileLoginBtn.textContent = `🎓 ${firstName} (${stu.kelas || ''}) • Akun Siswa`;
      }
      if (bottomLoginBtn) {
        bottomLoginBtn.classList.add('has-student');
        bottomLoginBtn.title = `Login sebagai ${stu.nama} (${stu.kelas || ''})`;
      }
      if (bottomLoginLabel) {
        bottomLoginLabel.textContent = firstName.slice(0, 10) || 'Siswa';
      }
      if (footerLoginBtn) {
        footerLoginBtn.textContent = `🎓 Akun Siswa (${firstName})`;
      }
    } else {
      if (navLoginBtn) {
        navLoginBtn.textContent = '🔐 Login';
        navLoginBtn.title = 'Login Guru atau Siswa';
      }
      if (headerLoginBtn) {
        if (headerLoginBtn.classList) headerLoginBtn.classList.remove('has-session');
        headerLoginBtn.title = 'Login Guru atau Siswa';
        if (typeof headerLoginBtn.setAttribute === 'function') {
          headerLoginBtn.setAttribute('aria-label', 'Login Guru atau Siswa');
        }
      }
      if (mobileLoginBtn) {
        mobileLoginBtn.textContent = '🔐 Login (Guru / Siswa)';
      }
      if (bottomLoginBtn) {
        bottomLoginBtn.classList.remove('has-student');
        bottomLoginBtn.title = 'Login Guru atau Siswa';
      }
      if (bottomLoginLabel) {
        bottomLoginLabel.textContent = 'Login';
      }
      if (footerLoginBtn) {
        footerLoginBtn.textContent = '🔐 Login Guru / Siswa';
      }
    }
  }

  function parseCoordinates(rawCoords, fallbackUrl = '') {
    const tryText = (txt) => {
      const m = String(txt || '').match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
      if (!m) return null;
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
      }
      return { lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    };
    const direct = tryText(rawCoords);
    if (direct) return direct;
    const urlStr = String(fallbackUrl || '');
    const atMatch = urlStr.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (atMatch) return tryText(`${atMatch[1]}, ${atMatch[2]}`);
    const qMatch = urlStr.match(/[?&](?:q|ll|query)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (qMatch) return tryText(`${qMatch[1]}, ${qMatch[2]}`);
    return null;
  }

  function renderSchoolMapBand(routeName) {
    const band = document.getElementById('school-map-band');
    if (!band) return;
    const route = String(routeName || '').toLowerCase();
    if (route === 'admin' || route === 'siswa') {
      band.hidden = true;
      return;
    }
    const api = window.BTD_API;
    const cfg = (api && api.state && api.state.data && api.state.data.pengaturan) || window.BTD_SEED.pengaturan || {};
    const parsed = parseCoordinates(cfg.schoolCoords, cfg.schoolMapsUrl);
    const schoolTitle = cfg.schoolName || 'Satuan Pendidikan';
    const instansiTitle = cfg.namaInstansi ? `${cfg.namaInstansi} • ` : '';
    const queryLoc = parsed
      ? `${parsed.lat},${parsed.lng}`
      : [cfg.schoolName, cfg.schoolCity, cfg.schoolAddress].filter(Boolean).join(', ') || 'Indonesia';
    const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(queryLoc)}&z=15&output=embed`;
    const externalUrl = parsed
      ? `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`
      : safeUrl(cfg.schoolMapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryLoc)}`;

    const renderKey = `${queryLoc}|${schoolTitle}|${instansiTitle}|${cfg.schoolAddress || ''}`;
    band.hidden = false;
    if (band.getAttribute('data-map-key') === renderKey) return;
    band.setAttribute('data-map-key', renderKey);

    band.innerHTML = `
      <div class="school-map-bar">
        <div class="container school-map-bar-inner">
          <div>
            <span class="school-map-eyebrow">📍 Peta Lokasi Resmi Satuan Pendidikan</span>
            <h3>${escapeHtml(instansiTitle + schoolTitle)}</h3>
            <p>${escapeHtml(cfg.schoolAddress || cfg.schoolCity || '')}${parsed ? ` • Koordinat: <code>${escapeHtml(parsed.formatted)}</code>` : ''}</p>
          </div>
          <a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-sm">
            🗺️ Buka di Google Maps ↗
          </a>
        </div>
      </div>
      <div class="school-map-frame-wrap">
        <iframe
          class="school-map-iframe"
          src="${escapeHtml(embedSrc)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Peta Lokasi ${escapeHtml(schoolTitle)}"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  let leafletLoadPromise = null;
  function ensureLeafletLoaded() {
    if (typeof window !== 'undefined' && window.L && typeof window.L.map === 'function') {
      return Promise.resolve(window.L);
    }
    if (typeof document === 'undefined' || !document.head) {
      return Promise.reject(new Error('Leaflet memerlukan lingkungan browser'));
    }
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
      if (!document.getElementById('leaflet-cdn-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-cdn-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (window.L && typeof window.L.map === 'function') resolve(window.L);
        else reject(new Error('Leaflet tidak termuat'));
      };
      script.onerror = () => reject(new Error('Gagal memuat peta interaktif (offline / CDN diblokir)'));
      document.head.appendChild(script);
    });
    return leafletLoadPromise;
  }

  function openCoordinatePickerModal({ initialCoords = '', addressHint = '', onSelect } = {}) {
    const startParsed = parseCoordinates(initialCoords) || { lat: -1.3965, lng: 102.3712, formatted: '-1.396500, 102.371200' };
    let curLat = startParsed.lat;
    let curLng = startParsed.lng;

    openModal(
      '📍 Pilih Titik Koordinat Lokasi Sekolah',
      `<div class="form-grid">
        <div class="callout callout-emerald" style="font-size:13.2px;padding:10px 14px;">
          Klik langsung di peta, seret penanda (pin), cari nama sekolah/daerah, gunakan GPS perangkat, atau tempel tautan Google Maps untuk mengunci koordinat akurat sekolah Anda.
        </div>

        <div class="coord-search-bar">
          <input id="cp-search-input" class="input" placeholder="Cari nama sekolah / kecamatan / kota..." value="${escapeHtml(addressHint || '')}" />
          <button type="button" class="btn btn-primary btn-sm" id="cp-search-btn">🔍 Cari</button>
          <button type="button" class="btn btn-gold btn-sm" id="cp-btn-gps">📡 Lokasi Saya</button>
        </div>

        <div id="cp-map-box" class="cp-map-box">
          <div class="cp-map-loading">Menyiapkan peta interaktif...</div>
        </div>

        <div class="form-row-2">
          <div class="field">
            <label for="cp-lat">Latitude (Lintang)</label>
            <input id="cp-lat" type="number" step="0.000001" min="-90" max="90" class="input" value="${curLat.toFixed(6)}" />
          </div>
          <div class="field">
            <label for="cp-lng">Longitude (Bujur)</label>
            <input id="cp-lng" type="number" step="0.000001" min="-180" max="180" class="input" value="${curLng.toFixed(6)}" />
          </div>
        </div>

        <div class="field">
          <label for="cp-paste-url">Atau Tempel Tautan Google Maps (Ekstrak Koordinat Otomatis)</label>
          <input id="cp-paste-url" class="input" placeholder="https://www.google.com/maps/@-1.3965,102.3712,17z ..." />
        </div>

        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="cp-cancel">Batal</button>
          <button type="button" class="btn btn-primary" id="cp-apply">✓ Gunakan Titik Koordinat Ini</button>
        </div>
      </div>`,
      { size: 'lg' }
    );

    const latInp = document.getElementById('cp-lat');
    const lngInp = document.getElementById('cp-lng');
    const pasteInp = document.getElementById('cp-paste-url');
    const searchInp = document.getElementById('cp-search-input');
    const searchBtn = document.getElementById('cp-search-btn');
    const gpsBtn = document.getElementById('cp-btn-gps');
    const mapBox = document.getElementById('cp-map-box');
    let leafletMap = null;
    let leafletMarker = null;

    function syncInputsAndMap(nextLat, nextLng, panMap = true) {
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
      curLat = Number(nextLat);
      curLng = Number(nextLng);
      if (latInp) latInp.value = curLat.toFixed(6);
      if (lngInp) lngInp.value = curLng.toFixed(6);
      if (leafletMap && leafletMarker) {
        leafletMarker.setLatLng([curLat, curLng]);
        if (panMap) leafletMap.setView([curLat, curLng], Math.max(leafletMap.getZoom() || 15, 15));
      } else if (mapBox && mapBox.querySelector('iframe')) {
        mapBox.querySelector('iframe').src = `https://maps.google.com/maps?q=${curLat.toFixed(6)},${curLng.toFixed(6)}&z=15&output=embed`;
      }
    }

    ensureLeafletLoaded()
      .then((L) => {
        if (!document.getElementById('cp-map-box')) return;
        mapBox.innerHTML = '';
        leafletMap = L.map(mapBox).setView([curLat, curLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(leafletMap);
        leafletMarker = L.marker([curLat, curLng], { draggable: true }).addTo(leafletMap);
        leafletMarker.on('dragend', () => {
          const pos = leafletMarker.getLatLng();
          syncInputsAndMap(pos.lat, pos.lng, false);
        });
        leafletMap.on('click', (ev) => {
          syncInputsAndMap(ev.latlng.lat, ev.latlng.lng, false);
        });
        setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 180);
      })
      .catch(() => {
        if (!mapBox) return;
        mapBox.innerHTML = `
          <iframe
            class="school-map-iframe"
            style="height:100%;width:100%;border:0;"
            src="https://maps.google.com/maps?q=${curLat.toFixed(6)},${curLng.toFixed(6)}&z=15&output=embed"
            title="Pratinjau Koordinat Peta Sekolah"
            loading="lazy"
          ></iframe>
        `;
      });

    if (latInp) {
      latInp.addEventListener('change', () => syncInputsAndMap(Number(latInp.value), Number(lngInp ? lngInp.value : curLng), true));
    }
    if (lngInp) {
      lngInp.addEventListener('change', () => syncInputsAndMap(Number(latInp ? latInp.value : curLat), Number(lngInp.value), true));
    }
    if (pasteInp) {
      pasteInp.addEventListener('input', () => {
        const hit = parseCoordinates('', pasteInp.value);
        if (hit) {
          syncInputsAndMap(hit.lat, hit.lng, true);
          showToast(`Koordinat diekstrak dari tautan Maps: ${hit.formatted}`);
        }
      });
    }
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          showToast('GPS browser tidak tersedia di perangkat ini.', 'warning');
          return;
        }
        gpsBtn.disabled = true;
        gpsBtn.textContent = '📡 Mencari GPS...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            syncInputsAndMap(pos.coords.latitude, pos.coords.longitude, true);
            gpsBtn.disabled = false;
            gpsBtn.textContent = '📡 Lokasi Saya';
            showToast('Titik koordinat GPS perangkat berhasil diambil!');
          },
          () => {
            gpsBtn.disabled = false;
            gpsBtn.textContent = '📡 Lokasi Saya';
            showToast('Izin GPS ditolak atau sinyal lokasi belum aktif.', 'warning');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }
    if (searchBtn && searchInp) {
      searchBtn.addEventListener('click', async () => {
        const q = searchInp.value.trim();
        if (!q) {
          showToast('Ketik nama sekolah atau kota terlebih dahulu.', 'warning');
          return;
        }
        searchBtn.disabled = true;
        searchBtn.textContent = 'Mencari...';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            syncInputsAndMap(Number(list[0].lat), Number(list[0].lon), true);
            showToast('Lokasi ditemukan: ' + (list[0].display_name || q).slice(0, 60));
          } else {
            showToast('Lokasi tidak ditemukan. Geser pin peta atau tempel link Google Maps.', 'warning');
          }
        } catch (err) {
          showToast('Gagal mencari lokasi online. Silakan isi koordinat atau tempel link Maps.', 'warning');
        } finally {
          searchBtn.disabled = false;
          searchBtn.textContent = '🔍 Cari';
        }
      });
    }

    const cancelBtn = document.getElementById('cp-cancel');
    const applyBtn = document.getElementById('cp-apply');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const latVal = Number(latInp ? latInp.value : curLat);
        const lngVal = Number(lngInp ? lngInp.value : curLng);
        if (!Number.isFinite(latVal) || !Number.isFinite(lngVal) || latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) {
          showToast('Titik koordinat Latitude (-90..90) dan Longitude (-180..180) tidak valid.', 'error');
          return;
        }
        const formatted = `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}`;
        const gmapsUrl = `https://www.google.com/maps?q=${latVal.toFixed(6)},${lngVal.toFixed(6)}`;
        closeModal();
        if (typeof onSelect === 'function') onSelect(formatted, gmapsUrl);
      });
    }
  }

  function openStudentLoginModal(opts = {}) {
    const api = window.BTD_API;
    if (!api) return;
    const title = opts.title || '🎓 Login Siswa — Bilik Tarbiyah Digital';
    const subtitle =
      opts.subtitle ||
      'Masukkan NISN Anda sebagai Username dan Password untuk mengisi Ruang Renungan, Ruang Kritis, Evaluasi, & Amaliyah.';
    const demoHint = !api.state.isLive
      ? `<p style="margin:6px 0 0;font-size:12.5px;color:var(--emerald-800);">Contoh Demo Lokal: Username &amp; Password <code>0091000101</code> (Ahmad Fauzan — X M1).</p>`
      : '';

    openModal(
      title,
      `<div class="form-grid">
        <div class="callout callout-emerald" style="padding:12px 14px;font-size:13.5px;">
          ${escapeHtml(subtitle)}
          ${demoHint}
        </div>
        <form id="modal-student-login" class="form-grid">
          <div class="field">
            <label for="msl-nisn">Username (NISN Siswa)</label>
            <input id="msl-nisn" type="text" class="input" required placeholder="Masukkan 10 digit NISN Anda..." autocomplete="username" />
          </div>
          <div class="field">
            <label for="msl-pass">Password (Standar NISN / Password Baru)</label>
            ${renderPasswordInput({
        id: 'msl-pass',
        required: true,
        placeholder: 'Masukkan NISN atau password baru Anda...',
        autocomplete: 'current-password'
      })}
          </div>
          <div class="login-loading-banner" id="msl-loading" hidden>
            <span class="spinner-inline dark"></span>
            <span>Memverifikasi NISN Anda...</span>
          </div>
          <div id="msl-error" class="callout" style="background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:13.5px;font-weight:600;" hidden></div>
          <div class="modal-sticky-actions modal-sticky-actions-end">
            <button type="button" class="btn btn-outline" id="msl-cancel">Batal</button>
            <button type="submit" class="btn btn-primary" id="msl-submit">🔐 Masuk &amp; Lanjutkan</button>
          </div>
        </form>
      </div>`,
      { size: 'md' }
    );

    const dialog = document.getElementById('modal-body');
    if (dialog) bindPasswordToggles(dialog);

    const form = document.getElementById('modal-student-login');
    const nisnInp = document.getElementById('msl-nisn');
    const passInp = document.getElementById('msl-pass');
    const cancelBtn = document.getElementById('msl-cancel');
    const submitBtn = document.getElementById('msl-submit');
    const loadingEl = document.getElementById('msl-loading');
    const errEl = document.getElementById('msl-error');

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (nisnInp) setTimeout(() => nisnInp.focus(), 60);

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errEl) errEl.hidden = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-inline"></span> Memverifikasi NISN...';
        }
        if (nisnInp) nisnInp.readOnly = true;
        if (passInp) passInp.readOnly = true;
        if (loadingEl) loadingEl.hidden = false;

        try {
          const student = await api.verifyStudent(nisnInp.value, passInp.value);
          if (student) {
            closeModal();
            syncChromeMetadata();
            showToast(`Selamat datang, ${student.nama} (${student.kelas})!`);
            if (typeof opts.onSuccess === 'function') opts.onSuccess(student);
          } else {
            if (loadingEl) loadingEl.hidden = true;
            if (errEl) {
              errEl.textContent = 'NISN atau password tidak cocok dengan data siswa aktif yang terdaftar oleh guru.';
              errEl.hidden = false;
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = '🔐 Masuk & Lanjutkan';
            }
            if (nisnInp) nisnInp.readOnly = false;
            if (passInp) passInp.readOnly = false;
          }
        } catch (err) {
          if (loadingEl) loadingEl.hidden = true;
          if (errEl) {
            errEl.textContent = 'Gagal terhubung ke server: ' + err.message;
            errEl.hidden = false;
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔐 Masuk & Lanjutkan';
          }
          if (nisnInp) nisnInp.readOnly = false;
          if (passInp) passInp.readOnly = false;
        }
      });
    }
  }

  function confirmLogoutAction({ roleLabel = 'Akun', accountName = '', onConfirmLogout } = {}) {
    const labelSuffix = accountName ? `${roleLabel}: ${accountName}` : roleLabel;
    return openConfirmModal({
      icon: '🚪',
      title: 'Konfirmasi Keluar Akun',
      message: `Apakah Anda yakin ingin keluar dari ${roleLabel}?`,
      itemLabel: labelSuffix,
      confirmText: 'YA, Keluar',
      cancelText: 'TIDAK',
      confirmLoadingLabel: 'Mengeluarkan...',
      loadingText: 'Sedang mengeluarkan sesi akun...',
      errorPrefix: 'Gagal keluar akun: ',
      danger: true,
      onConfirm: () => {
        if (typeof onConfirmLogout === 'function') return onConfirmLogout();
      }
    });
  }

  function openLoginChoiceModal() {
    const api = window.BTD_API;
    const cfg = (api && api.state && api.state.data && api.state.data.pengaturan) || window.BTD_SEED.pengaturan || {};
    const rawHash = typeof window !== 'undefined' && window.location
      ? (window.location.hash || '#beranda').replace(/^#/, '').split('?')[0]
      : 'beranda';
    const { role: activeRole, stu, admOk: admActive } = resolveActivePortalRole(rawHash, false);
    const stuRem = stu && api && typeof api.getSessionRemainingText === 'function' ? api.getSessionRemainingText('student') : '';
    const admRem = admActive && api && typeof api.getSessionRemainingText === 'function' ? api.getSessionRemainingText('admin') : '';

    if (activeRole === 'student' && stu) {
      openModal(
        '🎓 Status Akun Aktif — Siswa',
        `<div class="form-grid">
          <div class="callout callout-emerald">
            <strong style="display:block;font-size:15.5px;margin-bottom:4px;">Anda sedang login sebagai Siswa: ${escapeHtml(stu.nama)}</strong>
            <div style="font-size:13.5px;color:var(--slate-700);">
              NISN: <code>${escapeHtml(stu.nisn || stu.id)}</code> • Kelas: <strong>${escapeHtml(stu.kelas || '-')}</strong>${stuRem ? ` • Sisa sesi aktif: <strong>${escapeHtml(stuRem)}</strong>` : ''}
            </div>
          </div>
          <p style="margin:0;color:var(--slate-700);font-size:14px;">
            Apakah Anda ingin keluar (<strong>Logout</strong>) dari akun siswa <strong>${escapeHtml(stu.nama)}</strong> sekarang?
          </p>
          <div class="modal-sticky-actions modal-sticky-actions-end">
            <button type="button" class="btn btn-outline" id="btn-acc-stay">Tetap Login</button>
            <button type="button" class="btn btn-primary" id="btn-acc-portal">🎓 Buka Portal Siswa</button>
            <button type="button" class="btn btn-danger" id="btn-acc-logout">🚪 Ya, Logout</button>
          </div>
        </div>`
      );
      const stayBtn = document.getElementById('btn-acc-stay');
      const portalBtn = document.getElementById('btn-acc-portal');
      const logoutBtn = document.getElementById('btn-acc-logout');
      if (stayBtn) stayBtn.addEventListener('click', closeModal);
      if (portalBtn) {
        portalBtn.addEventListener('click', () => {
          closeModal();
          window.location.hash = '#siswa';
        });
      }
      if (logoutBtn && api) {
        logoutBtn.addEventListener('click', () => {
          api.logoutStudent();
          window.__btdSiswaDirty = false;
          window.__btdStudentActiveTab = 'dashboard';
          closeModal();
          syncChromeMetadata();
          showToast('Anda berhasil logout dari Akun Siswa.', 'warning');
          if (window.location.hash === '#materi' || window.location.hash.startsWith('#materi?') || window.location.hash.startsWith('#siswa')) {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        });
      }
      return;
    }

    if (activeRole === 'admin' && admActive) {
      const guruName = cfg.teacherName || 'Guru PAI-BP';
      const guruUser = (api && api.state && api.state.adminCreds && api.state.adminCreds.username) || 'admin';
      openModal(
        '👩‍🏫 Status Akun Aktif — Guru / Admin',
        `<div class="form-grid">
          <div class="callout callout-emerald">
            <strong style="display:block;font-size:15.5px;margin-bottom:4px;">Anda sedang login sebagai Guru: ${escapeHtml(guruName)}</strong>
            <div style="font-size:13.5px;color:var(--slate-700);">
              Username: <code>${escapeHtml(guruUser)}</code>${admRem ? ` • Sisa sesi aktif: <strong>${escapeHtml(admRem)}</strong>` : ''}
            </div>
          </div>
          <p style="margin:0;color:var(--slate-700);font-size:14px;">
            Apakah Anda ingin keluar (<strong>Logout</strong>) dari akun Guru ini sekarang?
          </p>
          <div class="modal-sticky-actions modal-sticky-actions-end">
            <button type="button" class="btn btn-outline" id="btn-acc-stay">Tetap Login</button>
            <button type="button" class="btn btn-gold" id="btn-acc-portal">👩‍🏫 Buka Panel Guru</button>
            <button type="button" class="btn btn-danger" id="btn-acc-logout">🚪 Ya, Logout</button>
          </div>
        </div>`
      );
      const stayBtn = document.getElementById('btn-acc-stay');
      const portalBtn = document.getElementById('btn-acc-portal');
      const logoutBtn = document.getElementById('btn-acc-logout');
      if (stayBtn) stayBtn.addEventListener('click', closeModal);
      if (portalBtn) {
        portalBtn.addEventListener('click', () => {
          closeModal();
          window.location.hash = '#admin';
        });
      }
      if (logoutBtn && api) {
        logoutBtn.addEventListener('click', () => {
          if (typeof api.logoutAdmin === 'function') api.logoutAdmin();
          closeModal();
          syncChromeMetadata();
          showToast('Anda berhasil logout dari Akun Guru.', 'warning');
          if (window.location.hash.startsWith('#admin')) {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }
        });
      }
      return;
    }

    openModal(
      '🔐 Pilih Akses Login — Bilik Tarbiyah Digital',
      `<div class="form-grid">
        <p style="margin:0;color:var(--slate-600);font-size:14px;">
          Silakan pilih peran masuk Anda (sesi login bertahan aktif otomatis selama <strong>6 jam</strong>):
        </p>
        <div class="login-choice-grid">
          <button type="button" class="login-choice-card is-guru" id="btn-choice-guru">
            <span class="login-choice-icon">👩‍🏫</span>
            <strong>Login Sebagai Guru</strong>
            <small>Kelola kelas, data siswa ber-NISN, jadwal, presensi Excel &amp; PDF Kop Surat, materi, bank soal, &amp; pengaturan portal.</small>
            <span class="tag tag-gold" style="margin-top:6px;">Masuk Panel Guru →</span>
          </button>
          <button type="button" class="login-choice-card is-siswa" id="btn-choice-siswa">
            <span class="login-choice-icon">🎓</span>
            <strong>Login Sebagai Siswa</strong>
            <small>Masuk menggunakan NISN untuk melihat profil belajar, mengisi presensi Daring selfie, materi kelas, &amp; rekap nilai.</small>
            <span class="tag tag-sky" style="margin-top:6px;">Masuk Portal Siswa →</span>
          </button>
        </div>
        <div class="modal-sticky-actions modal-sticky-actions-end">
          <button type="button" class="btn btn-outline" id="btn-choice-close">Tutup</button>
        </div>
      </div>`
    );

    const choiceCloseBtn = document.getElementById('btn-choice-close');
    if (choiceCloseBtn) choiceCloseBtn.addEventListener('click', closeModal);

    const goGuru = document.getElementById('btn-choice-guru');
    const goSiswa = document.getElementById('btn-choice-siswa');
    if (goGuru) {
      goGuru.addEventListener('click', () => {
        closeModal();
        window.location.hash = '#admin';
      });
    }
    if (goSiswa) {
      goSiswa.addEventListener('click', () => {
        closeModal();
        window.location.hash = '#siswa';
      });
    }
  }

  function renderBarChart(items, unitSuffix = '') {
    if (!items || !items.length) {
      return '<p style="color:var(--slate-500);font-size:13.5px;">Belum ada data grafik untuk ditampilkan.</p>';
    }
    const maxVal = Math.max(100, ...items.map((i) => Number(i.value || 0)));
    return items
      .map((item) => {
        const val = Number(item.value || 0);
        const pct = Math.max(0, Math.min(100, Math.round((val / maxVal) * 100)));
        return `<div class="bar-row">
          <span style="font-weight:700;font-size:13px;color:var(--slate-700);">${escapeHtml(item.label)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <strong style="font-size:13px;text-align:right;color:var(--emerald-900);">${escapeHtml(val)}${escapeHtml(unitSuffix)}</strong>
        </div>`;
      })
      .join('');
  }

  /**
   * Autocomplete pencarian siswa berbasis Master Data Siswa (menampilkan maksimal 3 rekomendasi).
   * Ketik sebagian Nama atau NISN lalu klik salah satu rekomendasi untuk mengisi Nama, NISN, & Kelas.
   */
  function setupStudentAutocomplete({ inputId, listId, badgeId, kelasSelectId, nisnHiddenId, onSelect }) {
    const inp = document.getElementById(inputId);
    const listEl = document.getElementById(listId);
    if (!inp || !listEl) return;

    const badgeEl = badgeId ? document.getElementById(badgeId) : null;
    const kelasSel = kelasSelectId ? document.getElementById(kelasSelectId) : null;
    const nisnInp = nisnHiddenId ? document.getElementById(nisnHiddenId) : null;

    function getLookupPool() {
      const data = (window.BTD_API && window.BTD_API.state && window.BTD_API.state.data) || {};
      const pool = (data.siswaLookup && data.siswaLookup.length) ? data.siswaLookup : (data.siswa || []);
      return pool.filter((s) => !s.status || String(s.status).toLowerCase() === 'aktif');
    }

    function clearSelection() {
      if (nisnInp) nisnInp.value = '';
      if (badgeEl) badgeEl.hidden = true;
    }

    function renderMatches() {
      const q = inp.value.trim().toLowerCase();
      if (q.length < 1) {
        listEl.hidden = true;
        listEl.innerHTML = '';
        return;
      }

      const selectedKelas = kelasSel ? kelasSel.value : '';
      const matches = getLookupPool()
        .filter((s) => {
          const nama = String(s.nama || '').toLowerCase();
          const nisn = String(s.nisn || s.nis || s.id || '').toLowerCase();
          return nama.includes(q) || nisn.includes(q);
        })
        .sort((a, b) => {
          // Prioritaskan siswa pada kelas yang sedang dipilih lalu awalan nama/NISN
          const aSameClass = selectedKelas && a.kelas === selectedKelas ? 0 : 1;
          const bSameClass = selectedKelas && b.kelas === selectedKelas ? 0 : 1;
          if (aSameClass !== bSameClass) return aSameClass - bSameClass;
          const aStarts = String(a.nama || '').toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = String(b.nama || '').toLowerCase().startsWith(q) ? 0 : 1;
          return aStarts - bStarts;
        })
        .slice(0, 3);

      if (!matches.length) {
        listEl.hidden = true;
        listEl.innerHTML = '';
        return;
      }

      listEl.innerHTML = matches
        .map((s) => {
          const nisn = String(s.nisn || s.nis || s.id || '');
          return `<button type="button" class="autocomplete-item" data-pick-nisn="${escapeHtml(nisn)}" data-pick-nama="${escapeHtml(s.nama)}" data-pick-kelas="${escapeHtml(s.kelas)}">
            <div>
              <strong style="display:block;font-size:13.5px;color:var(--slate-900);">${escapeHtml(s.nama)}</strong>
              <small style="color:var(--slate-500);">NISN: ${escapeHtml(nisn)}</small>
            </div>
            <span class="tag tag-emerald">${escapeHtml(s.kelas)}</span>
          </button>`;
        })
        .join('');
      listEl.hidden = false;

      listEl.querySelectorAll('.autocomplete-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const picked = {
            nisn: btn.getAttribute('data-pick-nisn'),
            nama: btn.getAttribute('data-pick-nama'),
            kelas: btn.getAttribute('data-pick-kelas')
          };
          inp.value = picked.nama;
          if (nisnInp) nisnInp.value = picked.nisn;
          if (kelasSel && picked.kelas) {
            const optExists = Array.from(kelasSel.options).some((o) => o.value === picked.kelas);
            if (optExists) kelasSel.value = picked.kelas;
          }
          if (badgeEl) {
            badgeEl.textContent = `✓ Terdaftar (NISN: ${picked.nisn} • ${picked.kelas})`;
            badgeEl.hidden = false;
          }
          listEl.hidden = true;
          if (typeof onSelect === 'function') onSelect(picked);
        });
      });
    }

    inp.addEventListener('input', () => {
      clearSelection();
      renderMatches();
    });
    inp.addEventListener('focus', renderMatches);
    document.addEventListener('click', (e) => {
      if (!inp.contains(e.target) && !listEl.contains(e.target)) {
        listEl.hidden = true;
      }
    });
  }

  const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  function renderPasswordInput(opts = {}) {
    const id = escapeHtml(opts.id || 'password-input');
    const placeholder = opts.placeholder ? ` placeholder="${escapeHtml(opts.placeholder)}"` : '';
    const value = opts.value !== undefined && opts.value !== null ? ` value="${escapeHtml(opts.value)}"` : '';
    const autocomplete = opts.autocomplete ? ` autocomplete="${escapeHtml(opts.autocomplete)}"` : '';
    const required = opts.required ? ' required' : '';
    return `
      <div class="password-wrap">
        <input id="${id}" type="password" class="input"${required}${placeholder}${value}${autocomplete} />
        <button type="button" class="password-toggle-btn" data-toggle-password="${id}" aria-label="Tampilkan password" aria-pressed="false" title="Tampilkan password">
          ${EYE_OPEN_SVG}
        </button>
      </div>
    `;
  }

  function bindPasswordToggles(rootEl) {
    const scope = rootEl || document;
    scope.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      if (btn.getAttribute('data-pw-bound') === '1') return;
      btn.setAttribute('data-pw-bound', '1');
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(targetId);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show ? EYE_OFF_SVG : EYE_OPEN_SVG;
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
        const label = show ? 'Sembunyikan password' : 'Tampilkan password';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      });
    });
  }

  function initCardBounceFX() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    if (document.__btdCardBounceBound) return;
    document.__btdCardBounceBound = true;

    const triggerGenjot = (e) => {
      const target = e && e.target;
      const card = target && typeof target.closest === 'function'
        ? target.closest('.card-hover, .mini-stat-card, .pilar-modern-card, .login-choice-card, .schedule-card, .card-wiggle-click')
        : null;
      if (!card || !card.classList) return;
      const isWiggle = card.classList.contains('card-wiggle-click');
      const cls = isWiggle ? 'is-wiggle' : 'is-genjot';
      card.classList.remove('is-genjot', 'is-wiggle');
      void card.offsetWidth;
      card.classList.add(cls);
      clearTimeout(card.__genjotTimer);
      card.__genjotTimer = setTimeout(() => {
        if (card && card.classList) card.classList.remove('is-genjot', 'is-wiggle');
      }, 680);
    };

    document.addEventListener('pointerdown', triggerGenjot, { passive: true });
    document.addEventListener('click', triggerGenjot, { passive: true });
  }

  function base64ByteLength(b64) {
    if (!b64) return 0;
    let pad = 0;
    if (b64.endsWith('==')) pad = 2;
    else if (b64.endsWith('=')) pad = 1;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
  }

  /**
   * Mengompres foto selfie menjadi JPEG berukuran ideal 50–100 KB (<= 100 KB)
   * agar ringan diunggah dan tersimpan rapi ke folder 'absensi' Google Drive.
   */
  function compressSelfieToTargetKb(sourceEl, minBytes = 50 * 1024, maxBytes = 100 * 1024) {
    const srcW = Number(sourceEl.videoWidth || sourceEl.naturalWidth || sourceEl.width || 640);
    const srcH = Number(sourceEl.videoHeight || sourceEl.naturalHeight || sourceEl.height || 480);

    const encodeAt = (maxSide, quality) => {
      const ratio = Math.min(1, maxSide / Math.max(srcW, srcH));
      const w = Math.max(240, Math.round(srcW * ratio));
      const h = Math.max(240, Math.round(srcH * ratio));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceEl, 0, 0, w, h);
      const dataUrl = c.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      const bytes = base64ByteLength(base64);
      return {
        dataUrl,
        base64,
        mimeType: 'image/jpeg',
        bytes,
        kb: Math.max(1, Math.round(bytes / 1024)),
        width: w,
        height: h
      };
    };

    const maxSides = [760, 640, 520, 420, 340];
    let bestUnderMax = null;

    // 1. Jika di 760px kualitas 0.80 masih di bawah 50 KB, naikkan resolusi/kualitas agar mendekati 50-100 KB
    let probe = encodeAt(760, 0.8);
    if (probe.bytes < minBytes) {
      let bestSmall = probe;
      const upSizes = [760, 960];
      for (let s = 0; s < upSizes.length; s++) {
        let lo = 0.8;
        let hi = 0.96;
        for (let iter = 0; iter < 5; iter++) {
          const mid = (lo + hi) / 2;
          const cand = encodeAt(upSizes[s], mid);
          if (cand.bytes <= maxBytes) {
            bestSmall = cand;
            if (cand.bytes >= minBytes) return cand;
            lo = mid;
          } else {
            hi = mid;
          }
        }
      }
      if (bestSmall.bytes <= maxBytes) return bestSmall;
    }

    // 2. Binary search kualitas agar <= 100 KB dan sedekat mungkin di rentang 50-100 KB
    for (let sIdx = 0; sIdx < maxSides.length; sIdx++) {
      const side = maxSides[sIdx];
      let lo = 0.36;
      let hi = 0.9;
      let localBest = null;
      for (let step = 0; step < 6; step++) {
        const mid = (lo + hi) / 2;
        const cand = encodeAt(side, mid);
        if (cand.bytes <= maxBytes) {
          localBest = cand;
          bestUnderMax = cand;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      if (localBest && localBest.bytes >= minBytes) {
        return localBest;
      }
      if (localBest && sIdx === 0 && localBest.bytes >= 30 * 1024) {
        return localBest;
      }
    }

    return bestUnderMax || encodeAt(340, 0.36);
  }

  function openSelfieCameraModal({ studentName = '', studentClass = '', materiTitle = '', onCaptured } = {}) {
    let activeStream = null;
    let capturedResult = null;

    const stopCameraStream = () => {
      if (activeStream && typeof activeStream.getTracks === 'function') {
        activeStream.getTracks().forEach((tr) => {
          try { tr.stop(); } catch (e) { /* ignore */ }
        });
      }
      activeStream = null;
    };

    openModal(
      '📸 Foto Selfie Presensi Daring',
      `<div class="form-grid">
        <div class="callout callout-emerald" style="padding:10px 14px;font-size:13px;">
          <strong>${escapeHtml(studentName || 'Siswa')}</strong> (${escapeHtml(studentClass || '-')})${materiTitle ? ` • ${escapeHtml(materiTitle)}` : ''}<br/>
          Foto selfie kamera otomatis diperkecil ke ukuran <strong>50–100 KB</strong> dan disimpan ke folder <code>absensi</code> Google Drive.
        </div>

        <div class="selfie-camera-stage" id="sc-stage">
          <div id="sc-cam-loading" class="selfie-cam-status">
            <span class="spinner-inline"></span> Membuka kamera depan perangkat...
          </div>
          <video id="sc-video" class="selfie-video" autoplay playsinline muted></video>
          <img id="sc-preview-img" class="selfie-preview-img" alt="Pratinjau foto selfie" hidden />
          <div id="sc-size-pill" class="selfie-size-pill" hidden></div>
        </div>

        <div id="sc-cam-error" class="callout callout-gold" hidden>
          <strong style="color:var(--rose-600);">⚠️ Kamera Langsung Tidak Dapat Dibuka</strong>
          <p id="sc-cam-error-msg" style="margin:4px 0 10px;font-size:13px;color:var(--slate-700);"></p>
          <input id="sc-fallback-file" type="file" accept="image/*" capture="user" hidden />
          <button type="button" class="btn btn-gold btn-sm" id="sc-open-native-cam">📷 Ambil Foto via Aplikasi Kamera</button>
        </div>

        <div class="modal-sticky-actions">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" id="sc-snap" disabled>📸 Ambil Foto</button>
            <button type="button" class="btn btn-outline" id="sc-retake" hidden>🔄 Foto Ulang</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline" id="sc-cancel">Batal</button>
            <button type="button" class="btn btn-gold" id="sc-confirm" disabled>✅ Gunakan Foto Selfie</button>
          </div>
        </div>
      </div>`,
      { size: 'md', onClose: stopCameraStream }
    );

    const videoEl = document.getElementById('sc-video');
    const previewImg = document.getElementById('sc-preview-img');
    const loadingEl = document.getElementById('sc-cam-loading');
    const sizePill = document.getElementById('sc-size-pill');
    const errBox = document.getElementById('sc-cam-error');
    const errMsg = document.getElementById('sc-cam-error-msg');
    const fallbackInp = document.getElementById('sc-fallback-file');
    const fallbackBtn = document.getElementById('sc-open-native-cam');
    const snapBtn = document.getElementById('sc-snap');
    const retakeBtn = document.getElementById('sc-retake');
    const cancelBtn = document.getElementById('sc-cancel');
    const confirmBtn = document.getElementById('sc-confirm');

    const startLiveCamera = async () => {
      stopCameraStream();
      capturedResult = null;
      if (previewImg) previewImg.hidden = true;
      if (sizePill) sizePill.hidden = true;
      if (errBox) errBox.hidden = true;
      if (loadingEl) loadingEl.hidden = false;
      if (videoEl) videoEl.hidden = false;
      if (snapBtn) {
        snapBtn.hidden = false;
        snapBtn.disabled = true;
      }
      if (retakeBtn) retakeBtn.hidden = true;
      if (confirmBtn) confirmBtn.disabled = true;

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        if (loadingEl) loadingEl.hidden = true;
        if (videoEl) videoEl.hidden = true;
        if (errMsg) errMsg.textContent = 'Browser atau koneksi saat ini membatasi akses kamera langsung (getUserMedia). Gunakan tombol kamera perangkat di bawah.';
        if (errBox) errBox.hidden = false;
        return;
      }

      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false
        });
        if (!document.getElementById('sc-video')) {
          stopCameraStream();
          return;
        }
        videoEl.srcObject = activeStream;
        await videoEl.play().catch(() => { });
        if (loadingEl) loadingEl.hidden = true;
        if (snapBtn) snapBtn.disabled = false;
      } catch (err) {
        if (loadingEl) loadingEl.hidden = true;
        if (videoEl) videoEl.hidden = true;
        if (errMsg) {
          errMsg.textContent = `Izin kamera ditolak atau kamera tidak tersedia (${err.message || 'Camera unavailable'}). Izinkan kamera pada browser atau gunakan kamera perangkat.`;
        }
        if (errBox) errBox.hidden = false;
      }
    };

    const showCapturedPreview = (res) => {
      capturedResult = res;
      stopCameraStream();
      if (videoEl) videoEl.hidden = true;
      if (loadingEl) loadingEl.hidden = true;
      if (errBox) errBox.hidden = true;
      if (previewImg) {
        previewImg.src = res.dataUrl;
        previewImg.hidden = false;
      }
      if (sizePill) {
        sizePill.textContent = `✓ Ukuran Foto: ${res.kb} KB (${res.width}×${res.height} px)`;
        sizePill.hidden = false;
      }
      if (snapBtn) snapBtn.hidden = true;
      if (retakeBtn) retakeBtn.hidden = false;
      if (confirmBtn) confirmBtn.disabled = false;
    };

    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        if (!videoEl || !videoEl.videoWidth) {
          showToast('Kamera belum siap. Tunggu sebentar lalu coba lagi.', 'warning');
          return;
        }
        const compressed = compressSelfieToTargetKb(videoEl, 50 * 1024, 100 * 1024);
        showCapturedPreview(compressed);
      });
    }

    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        startLiveCamera();
      });
    }

    if (fallbackBtn && fallbackInp) {
      fallbackBtn.addEventListener('click', () => fallbackInp.click());
      fallbackInp.addEventListener('change', () => {
        const file = fallbackInp.files && fallbackInp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const tmpImg = new Image();
          tmpImg.onload = () => {
            const compressed = compressSelfieToTargetKb(tmpImg, 50 * 1024, 100 * 1024);
            showCapturedPreview(compressed);
          };
          tmpImg.src = String(reader.result || '');
        };
        reader.readAsDataURL(file);
        fallbackInp.value = '';
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!capturedResult) return;
        const chosen = capturedResult;
        closeModal();
        if (typeof onCaptured === 'function') onCaptured(chosen);
      });
    }

    startLiveCamera();
  }

  const PROFANITY_REGEX = /\b(anjing|anjg|anjir|asu|babi|bangsat|bgst|bajingan|bego|goblok|tolol|idiot|kontol|memek|ngentot|ngewe|jancok|jancuk|cok|pantek|kimak|pukimak|pepek|jembut|lonte|pelacur|sundal|bencong|banci|tai|taik|kampret|keparat|brengsek|setan|iblis|bangke|bacot|bct|bokep|porno|porn|judol|slot|gacor|togel|fuck|shit|bitch|asshole|bastard|dick|pussy|whore|slut)\b/gi;

  function extractYoutubeId(raw) {
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
    const m = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return m ? m[1] : '';
  }

  function containsProfanityOrSpam(raw) {
    const txt = String(raw || '');
    if (!txt) return false;
    if (/<script|javascript:|on\w+=/i.test(txt)) return true;
    if (/https?:\/\/\S+|www\.\S+/i.test(txt)) return true;
    PROFANITY_REGEX.lastIndex = 0;
    return PROFANITY_REGEX.test(txt);
  }

  function censorProfanity(raw) {
    const txt = String(raw || '');
    if (!txt) return '';
    return txt.replace(PROFANITY_REGEX, (m) => m[0] + '*'.repeat(Math.max(2, m.length - 1)));
  }

  initCardBounceFX();

  window.BTD_UI = {
    escapeHtml,
    safeUrl,
    safeNavUrl,
    resolveImageUrl,
    extractYoutubeId,
    containsProfanityOrSpam,
    censorProfanity,
    compressCanvasToBudget,
    compressImageFile,
    compressSelfieToTargetKb,
    formatDateId,
    showToast,
    openModal,
    closeModal,
    openConfirmModal,
    closeConfirmModal,
    openImageCropModal,
    closeImageCropModal,
    openDocModal,
    openPdfPreviewModal,
    closePdfPreviewModal,
    buildKopSuratPdfHtml,
    openImageLightbox,
    closeLightboxModal,
    openSelfieCameraModal,
    openAiAssistantModal,
    syncChromeMetadata,
    parseCoordinates,
    renderSchoolMapBand,
    openCoordinatePickerModal,
    renderBarChart,
    setupStudentAutocomplete,
    renderPasswordInput,
    bindPasswordToggles,
    openStudentLoginModal,
    openLoginChoiceModal,
    confirmLogoutAction
  };
})();
