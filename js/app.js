/**
 * Router SPA & Inisialisasi Aplikasi Bilik Tarbiyah Digital
 */
(function () {
  const ROUTES = ['beranda', 'materi', 'riwayat', 'evaluasi', 'amaliyah', 'presensi', 'galeri', 'tentang', 'siswa', 'admin'];

  function parseRoute() {
    const rawHash = (window.location.hash || '#beranda').replace(/^#/, '');
    const [path, queryStr] = rawHash.split('?');
    const route = ROUTES.includes(path) ? path : 'beranda';
    const params = {};
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => {
        params[k] = v;
      });
    }
    return { route, params };
  }

  function updateActiveNav(route) {
    const normalized =
      route === 'evaluasi' || route === 'amaliyah' || route === 'presensi'
        ? 'materi'
        : route === 'galeri'
          ? 'tentang'
          : route;
    document.querySelectorAll('[data-route]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-route') === normalized);
    });
    const isAuthRoute = route === 'siswa' || route === 'admin';
    const loginNav = document.getElementById('btn-nav-login');
    if (loginNav) loginNav.classList.toggle('active', isAuthRoute);
    const bottomLoginNav = document.getElementById('btn-bottom-login');
    if (bottomLoginNav) bottomLoginNav.classList.toggle('active', isAuthRoute);
  }

  function renderCurrentRoute() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const { route, params } = parseRoute();
    updateActiveNav(route);
    let pageKey = route;
    if (route === 'evaluasi' || route === 'amaliyah' || route === 'presensi') {
      pageKey = 'materi';
      if (!params.tab) params.tab = route === 'presensi' ? 'amaliyah' : route;
    }
    if (route === 'galeri') {
      pageKey = 'tentang';
      if (!params.tab) params.tab = 'galeri';
    }
    const renderer = (window.BTD_PAGES && window.BTD_PAGES[pageKey]) || window.BTD_PAGES.beranda;
    if (typeof renderer === 'function') {
      renderer(main, params);
    }
    if (window.BTD_UI && typeof window.BTD_UI.renderSchoolMapBand === 'function') {
      window.BTD_UI.renderSchoolMapBand(route);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindChrome() {
    const drawer = document.getElementById('mobile-drawer');
    const toggleBtn = document.getElementById('nav-toggle');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('mobile-drawer-backdrop');

    function setDrawer(open) {
      if (!drawer || !toggleBtn) return;
      drawer.hidden = !open;
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', () => setDrawer(true));
    if (closeBtn) closeBtn.addEventListener('click', () => setDrawer(false));
    if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));
    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => setDrawer(false));
    });

    const aiBtn = document.getElementById('btn-open-ai-assistant');
    const headerAiBtn = document.getElementById('btn-header-ai');
    const mobileAiBtn = document.getElementById('btn-mobile-ai');
    if (aiBtn) aiBtn.addEventListener('click', () => window.BTD_UI.openAiAssistantModal());
    if (headerAiBtn) headerAiBtn.addEventListener('click', () => window.BTD_UI.openAiAssistantModal());
    if (mobileAiBtn) {
      mobileAiBtn.addEventListener('click', () => {
        setDrawer(false);
        window.BTD_UI.openAiAssistantModal();
      });
    }

    const navLoginBtn = document.getElementById('btn-nav-login');
    const mobileLoginBtn = document.getElementById('btn-mobile-login');
    const bottomLoginBtn = document.getElementById('btn-bottom-login');
    const footerLoginBtn = document.getElementById('btn-footer-login');
    const openLoginChoice = () => {
      setDrawer(false);
      if (window.BTD_UI && typeof window.BTD_UI.openLoginChoiceModal === 'function') {
        window.BTD_UI.openLoginChoiceModal();
      }
    };
    if (navLoginBtn) navLoginBtn.addEventListener('click', openLoginChoice);
    if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', openLoginChoice);
    if (bottomLoginBtn) bottomLoginBtn.addEventListener('click', openLoginChoice);
    if (footerLoginBtn) footerLoginBtn.addEventListener('click', openLoginChoice);

    const modalClose = document.getElementById('modal-close');
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalClose) modalClose.addEventListener('click', () => window.BTD_UI.closeModal());
    if (modalBackdrop) modalBackdrop.addEventListener('click', () => window.BTD_UI.closeModal());

    const cropClose = document.getElementById('crop-modal-close');
    const cropBackdrop = document.getElementById('crop-modal-backdrop');
    if (cropClose) cropClose.addEventListener('click', () => window.BTD_UI.closeImageCropModal());
    if (cropBackdrop) cropBackdrop.addEventListener('click', () => window.BTD_UI.closeImageCropModal());

    const pdfClose = document.getElementById('pdf-preview-close');
    const pdfBackdrop = document.getElementById('pdf-preview-backdrop');
    if (pdfClose) pdfClose.addEventListener('click', () => window.BTD_UI.closePdfPreviewModal());
    if (pdfBackdrop) pdfBackdrop.addEventListener('click', () => window.BTD_UI.closePdfPreviewModal());

    const lbClose = document.getElementById('lightbox-close');
    const lbBackdrop = document.getElementById('lightbox-backdrop');
    if (lbClose) lbClose.addEventListener('click', () => window.BTD_UI.closeLightboxModal());
    if (lbBackdrop) lbBackdrop.addEventListener('click', () => window.BTD_UI.closeLightboxModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.hidden && typeof window.BTD_UI.closeConfirmModal === 'function') {
          window.BTD_UI.closeConfirmModal();
          return;
        }
        const lbModal = document.getElementById('lightbox-modal');
        if (lbModal && !lbModal.hidden && typeof window.BTD_UI.closeLightboxModal === 'function') {
          window.BTD_UI.closeLightboxModal();
          return;
        }
        const pdfModal = document.getElementById('pdf-preview-modal');
        if (pdfModal && !pdfModal.hidden && typeof window.BTD_UI.closePdfPreviewModal === 'function') {
          window.BTD_UI.closePdfPreviewModal();
          return;
        }
        const cropModal = document.getElementById('crop-modal');
        if (cropModal && !cropModal.hidden && typeof window.BTD_UI.closeImageCropModal === 'function') {
          window.BTD_UI.closeImageCropModal();
          return;
        }
        window.BTD_UI.closeModal();
        setDrawer(false);
      }
    });
  }

  function isUserBusyInUi() {
    const appModal = document.getElementById('app-modal');
    if (appModal && !appModal.hidden) return true;
    const lbModal = document.getElementById('lightbox-modal');
    if (lbModal && !lbModal.hidden) return true;
    const pdfModal = document.getElementById('pdf-preview-modal');
    if (pdfModal && !pdfModal.hidden) return true;
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && !confirmModal.hidden) return true;
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return true;
    const { route } = parseRoute();
    if (route === 'admin' || route === 'siswa') return true;
    if (document.getElementById('mat-cbt-timer') || document.getElementById('cbt-timer-display')) return true;
    return false;
  }

  async function init() {
    window.BTD_API.initFromCache();
    const hasRemote = Boolean(window.BTD_API.getConfiguredApiUrl());
    window.BTD_API.state.isSyncing = hasRemote;
    bindChrome();
    window.BTD_UI.syncChromeMetadata();
    window.addEventListener('hashchange', renderCurrentRoute);
    renderCurrentRoute();

    if (hasRemote) {
      const syncRes = await window.BTD_API.syncFromRemote();
      let adminRefreshed = false;
      if (window.BTD_API.state.isLive && window.BTD_API.isAdminSessionValid()) {
        try {
          await window.BTD_API.refreshAdminDashboard();
          adminRefreshed = true;
        } catch (err) {
          /* abaikan bila gagal sementara atau sesi kadaluarsa */
        }
      }
      window.BTD_UI.syncChromeMetadata();
      const { route } = parseRoute();
      if ((syncRes && syncRes.updated && !isUserBusyInUi()) || (adminRefreshed && route === 'admin' && !document.querySelector('#app-modal:not([hidden])'))) {
        renderCurrentRoute();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
