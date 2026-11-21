/**
 * Konfigurasi Aplikasi Bilik Tarbiyah Digital
 * ==========================================
 * 1. Deploy Google Apps Script (apps-script/Code.gs) sebagai Web App.
 * 2. Tempel URL Web App ke `APPS_SCRIPT_URL` di bawah ini (atau atur lewat Panel Guru).
 * 3. Jika `APPS_SCRIPT_URL` kosong, aplikasi otomatis berjalan dalam Mode Demo Lokal
 *    menggunakan data awal PAI-BP dan penyimpanan browser (localStorage).
 */
window.BTD_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyyI6fOB9rBrUerSlFREdD6mTXgQz2QP8cxkIoue69XQtEbdh1GCHRpPOFiGIzOaKqK/exec',
  STORAGE_KEY_PREFIX: 'btd_pai_v2_',
  DEFAULT_ADMIN_USERNAME: '',
  DEFAULT_ADMIN_PASSWORD: ''
};
