/**
 * Konfigurasi Aplikasi Bilik Tarbiyah Digital
 * ==========================================
 * 1. Deploy Google Apps Script (apps-script/Code.gs) sebagai Web App.
 * 2. Tempel URL Web App ke `APPS_SCRIPT_URL` di bawah ini (atau atur lewat Panel Guru).
 * 3. Jika `APPS_SCRIPT_URL` kosong, aplikasi otomatis berjalan dalam Mode Demo Lokal
 *    menggunakan data awal PAI-BP dan penyimpanan browser (localStorage).
 */
window.BTD_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby1TG-C9llyR2wrnpPWtEzrXVq9Z2MoqiJWhjxkHkbL4oWbEJLfdJI5XW_o-WE3yRke/exec',
  STORAGE_KEY_PREFIX: 'btd_pai_v2_',
  DEFAULT_ADMIN_USERNAME: '',
  DEFAULT_ADMIN_PASSWORD: ''
};
