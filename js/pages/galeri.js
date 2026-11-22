/**
 * Rute kompatibilitas #galeri -> dialihkan ke tab Galeri Karya pada halaman Tentang Kami (#tentang).
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.galeri = function renderGaleri(container, params = {}) {
  if (typeof window.BTD_PAGES.tentang === 'function') {
    window.BTD_PAGES.tentang(container, Object.assign({}, params, { tab: 'galeri' }));
  }
};
