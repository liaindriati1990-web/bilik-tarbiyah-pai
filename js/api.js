/**
 * Lapisan Data & API (Google Apps Script + Fallback Mode Demo LokalStorage)
 * Mendukung auth Guru (Username/Password), auth Siswa (NISN/NISN),
 * Jadwal Pembelajaran (Daring/Luring & Terlaksana/Sedang Berlangsung), Master Siswa NISN,
 * Autocomplete Lookup, Presensi Siswa Daring Sesuai Jadwal, & Sinkronisasi Sheets.
 */
(function () {
  const PREFIX = (window.BTD_CONFIG && window.BTD_CONFIG.STORAGE_KEY_PREFIX) || 'btd_pai_v2_';
  const LS_KEY_STATE = PREFIX + 'state';
  const LS_KEY_API_URL = PREFIX + 'apps_script_url';
  const LS_KEY_ADMIN_SESSION = PREFIX + 'admin_session';
  const LS_KEY_STUDENT_SESSION = PREFIX + 'student_session';
  const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  const state = {
    isLive: false,
    isSyncing: false,
    apiUrl: '',
    lastSyncedAt: null,
    adminUnlocked: false,
    adminCreds: { username: '', password: '' },
    adminToken: '',
    adminSessionExpiresAt: 0,
    studentSession: null, // { nisn, nama, kelas, jenisKelamin, status, hasCustomPassword }
    studentAuthPass: '',
    studentToken: '',
    studentSessionExpiresAt: 0,
    data: deepClone(window.BTD_SEED)
  };

  function readValidSession(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeSession(key, payload) {
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const record = Object.assign({}, payload, {
      loginAt: Date.now(),
      expiresAt
    });
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch (err) {
      console.warn('Gagal menyimpan sesi login:', err);
    }
    return expiresAt;
  }

  function clearSession(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  function restoreSessions() {
    const adm = readValidSession(LS_KEY_ADMIN_SESSION);
    if (adm && (adm.token || adm.username)) {
      state.adminUnlocked = true;
      state.adminCreds = { username: String(adm.username || ''), password: '' };
      state.adminToken = String(adm.token || '');
      state.adminSessionExpiresAt = Number(adm.expiresAt || 0);
    } else {
      state.adminUnlocked = false;
      state.adminCreds = { username: '', password: '' };
      state.adminToken = '';
      state.adminSessionExpiresAt = 0;
    }

    const stu = readValidSession(LS_KEY_STUDENT_SESSION);
    if (stu && stu.student) {
      state.studentSession = stu.student;
      state.studentAuthPass = '';
      state.studentToken = String(stu.token || '');
      state.studentSessionExpiresAt = Number(stu.expiresAt || 0);
    } else {
      state.studentSession = null;
      state.studentAuthPass = '';
      state.studentToken = '';
      state.studentSessionExpiresAt = 0;
    }
  }

  function isAdminSessionValid() {
    try {
      const raw = localStorage.getItem(LS_KEY_ADMIN_SESSION);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
          logoutAdmin();
          return false;
        }
        state.adminSessionExpiresAt = Number(parsed.expiresAt);
        if (parsed.token && !state.adminToken) {
          state.adminToken = String(parsed.token);
        }
        if (!state.adminUnlocked && (parsed.token || parsed.username)) {
          state.adminUnlocked = true;
          state.adminCreds = { username: String(parsed.username || ''), password: state.adminCreds.password || '' };
        }
        return state.adminUnlocked;
      }
    } catch (err) {
      /* fallback ke memori */
    }
    if (!state.adminUnlocked) return false;
    if (state.adminSessionExpiresAt && Date.now() > state.adminSessionExpiresAt) {
      logoutAdmin();
      return false;
    }
    return true;
  }

  function isStudentSessionValid() {
    try {
      const raw = localStorage.getItem(LS_KEY_STUDENT_SESSION);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
          logoutStudent();
          return false;
        }
        state.studentSessionExpiresAt = Number(parsed.expiresAt);
        if (!state.studentSession && parsed.student) {
          state.studentSession = parsed.student;
        }
        if (parsed.token && !state.studentToken) {
          state.studentToken = String(parsed.token);
        }
        return Boolean(state.studentSession);
      }
    } catch (err) {
      /* fallback ke memori */
    }
    if (!state.studentSession) return false;
    if (state.studentSessionExpiresAt && Date.now() > state.studentSessionExpiresAt) {
      logoutStudent();
      return false;
    }
    return true;
  }

  function getSessionRemainingText(role) {
    const valid = role === 'admin' ? isAdminSessionValid() : isStudentSessionValid();
    if (!valid) return '';
    const exp = role === 'admin' ? state.adminSessionExpiresAt : state.studentSessionExpiresAt;
    const ms = Math.max(0, Number(exp || 0) - Date.now());
    const totalMins = Math.max(1, Math.ceil(ms / 60000));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hrs > 0 ? `${hrs} jam ${mins} menit` : `${mins} menit`;
  }

  function getConfiguredApiUrl() {
    const override = localStorage.getItem(LS_KEY_API_URL);
    if (override && override.trim()) return override.trim();
    const fromConfig = (window.BTD_CONFIG && window.BTD_CONFIG.APPS_SCRIPT_URL) || '';
    return fromConfig.trim();
  }

  function saveLocalState() {
    try {
      localStorage.setItem(LS_KEY_STATE, JSON.stringify(state.data));
    } catch (err) {
      console.warn('Gagal menyimpan state ke localStorage:', err);
    }
  }

  function ensureLookupSynced() {
    if (window.BTD_SEED && window.BTD_SEED.pengaturan) {
      state.data.pengaturan = Object.assign(
        {},
        window.BTD_SEED.pengaturan,
        state.data.pengaturan || {}
      );
    }
    if (Array.isArray(state.data.siswa)) {
      state.data.siswa = state.data.siswa.map((s) => {
        if (!s) return s;
        const clean = String(s.nisn || s.nis || s.id || '').replace(/^'+/, '').trim();
        return Object.assign({}, s, { id: clean, nisn: clean });
      });
    }
    if ((!state.data.siswaLookup || !state.data.siswaLookup.length) && Array.isArray(state.data.siswa)) {
      state.data.siswaLookup = state.data.siswa.map((s) => ({
        nisn: String(s.nisn || s.nis || s.id || '').replace(/^'+/, '').trim(),
        nama: s.nama,
        kelas: s.kelas,
        status: s.status || 'Aktif'
      }));
    }
    if (Array.isArray(state.data.jadwal)) {
      state.data.jadwal = state.data.jadwal.map((j) => {
        if (!j) return j;
        const needsStatus = j.status === 'Akan Datang';
        const needsSmt = !j.semester;
        if (!needsStatus && !needsSmt) return j;
        const mNum = Number(String(j.tanggal || '').slice(5, 7));
        const inferredSmt = mNum >= 1 && mNum <= 6 ? '2' : '1';
        return Object.assign({}, j, {
          status: needsStatus ? 'Sedang Berlangsung' : j.status,
          semester: j.semester || inferredSmt
        });
      });
    }
    if (Array.isArray(state.data.materi)) {
      state.data.materi = state.data.materi.map((m) =>
        m && !m.semester ? Object.assign({}, m, { semester: Number(m.bab) <= 5 ? '1' : '2' }) : m
      );
    }
    if (!Array.isArray(state.data.belajarConfig)) {
      state.data.belajarConfig = [];
    }
    if (!Array.isArray(state.data.belajarKomentar)) {
      state.data.belajarKomentar = [];
    }
    if (!Array.isArray(state.data.guruRiwayat)) {
      state.data.guruRiwayat = (window.BTD_SEED && Array.isArray(window.BTD_SEED.guruRiwayat))
        ? deepClone(window.BTD_SEED.guruRiwayat)
        : [];
    }
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(LS_KEY_STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.data = Object.assign(deepClone(window.BTD_SEED), parsed);
      } else {
        state.data = deepClone(window.BTD_SEED);
        saveLocalState();
      }
      ensureLookupSynced();
    } catch (err) {
      state.data = deepClone(window.BTD_SEED);
      ensureLookupSynced();
    }
  }

  async function callGasGet(action, params = {}) {
    const base = assertValidGasUrl(getConfiguredApiUrl());
    const url = new URL(base);
    url.searchParams.set('action', action);
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.set(k, String(params[k]));
      }
    });
    const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Respons Apps Script gagal.');
    return json.data;
  }

  function assertValidGasUrl(base) {
    if (!base) throw new Error('APPS_SCRIPT_URL belum diatur.');
    if (/\/dev(\?|$)/i.test(base)) {
      throw new Error('URL Apps Script masih memakai mode uji (/dev). Gunakan URL Web App Deployment resmi yang berakhiran /exec.');
    }
    return base;
  }

  function validateGasCellLengths(item, jsonFields = [], maxChars = 48500) {
    if (!item || typeof item !== 'object') return;
    const keys = Object.keys(item);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const val = item[k];
      if (val === undefined || val === null) continue;
      const strVal = jsonFields.includes(k) && typeof val !== 'string' ? JSON.stringify(val) : String(val);
      if (strVal.length > maxChars) {
        const kb = Math.round(strVal.length / 1024);
        throw new Error(
          `Data kolom "${k}" terlalu besar untuk 1 sel Google Sheets (${strVal.length.toLocaleString('id-ID')} karakter / ~${kb} KB, batas aman 48.500 karakter). Kurangi jumlah/ukuran gambar atau pakai tautan Google Drive.`
        );
      }
    }
  }

  async function callGasPost(action, payload = {}) {
    const base = assertValidGasUrl(getConfiguredApiUrl());
    const bodyStr = JSON.stringify({
      action,
      payload,
      token: state.adminToken || undefined,
      studentToken: state.studentToken || undefined,
      username: state.adminCreds.username || undefined,
      password: state.adminCreds.password || undefined
    });

    const sendOnce = () =>
      fetch(base, {
        method: 'POST',
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr
      });

    let res;
    try {
      res = await sendOnce();
    } catch (firstErr) {
      try {
        await new Promise((r) => setTimeout(r, 550));
        res = await sendOnce();
      } catch (err) {
        const msg = String((err && err.message) || firstErr || '');
        if (err && (err.name === 'TypeError' || /failed to fetch|load failed|networkerror/i.test(msg))) {
          const kb = Math.max(1, Math.round(bodyStr.length / 1024));
          throw new Error(
            `Koneksi ke Google Apps Script gagal (${msg} • ukuran kirim ~${kb} KB). Pastikan: (1) Deployment Apps Script berakses "Anyone / Siapa saja" dan sudah Deploy New Version setelah update Code.gs, (2) jika mengirim Materi bergambar, kurangi jumlah gambar di Galeri Bab (maks. 2–3 gambar) atau pakai link Google Drive, dan (3) internet stabil.`
          );
        }
        throw err;
      }
    }

    if (!res.ok) throw new Error('HTTP ' + res.status);
    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      throw new Error('Respons Apps Script bukan JSON valid (pastikan akses Web App diatur "Anyone / Siapa saja" dan sudah ter-otorisasi).');
    }
    if (!json.ok) throw new Error(json.error || 'Gagal menyimpan ke Google Sheets.');
    return json.data;
  }

  function initFromCache() {
    loadLocalState();
    restoreSessions();
    state.apiUrl = getConfiguredApiUrl();
    return state;
  }

  async function syncFromRemote() {
    state.apiUrl = getConfiguredApiUrl();
    if (!state.apiUrl) {
      state.isLive = false;
      state.isSyncing = false;
      return { state, updated: false };
    }

    state.isSyncing = true;
    try {
      const beforeDigest = `${(state.data.materi || []).length}:${(state.data.jadwal || []).length}:${(state.data.bankSoal || []).length}:${(state.data.diskusi || []).length}:${(state.data.galeri || []).length}:${(state.data.banners || []).length}:${(state.data.pengaturan && state.data.pengaturan.schoolName) || ''}`;
      const remote = await callGasGet('getBootstrapData');
      if (remote && typeof remote === 'object') {
        const hadAdmin = isAdminSessionValid();
        const prevSiswa = hadAdmin ? state.data.siswa : null;
        const prevTugas = hadAdmin ? state.data.tugas : null;
        const activeStuNisn =
          isStudentSessionValid() && state.studentSession
            ? String(state.studentSession.nisn || state.studentSession.id || '').trim()
            : '';
        const studentKeys = ['ruangKritis', 'evaluasi', 'amaliyah', 'tugas', 'diskusi'];
        const prevStudentData = {};
        if (activeStuNisn) {
          studentKeys.forEach((k) => {
            const arr = Array.isArray(state.data[k]) ? state.data[k] : [];
            prevStudentData[k] = arr.filter(
              (r) => String(r && (r.nisn || '')).replace(/^'+/, '').trim() === activeStuNisn
            );
          });
        }
        state.data = Object.assign({}, state.data, remote);
        if (hadAdmin && Array.isArray(prevSiswa) && prevSiswa.length && !remote.siswa) {
          state.data.siswa = prevSiswa;
        }
        if (hadAdmin && Array.isArray(prevTugas) && prevTugas.length && !remote.tugas) {
          state.data.tugas = prevTugas;
        }
        if (activeStuNisn) {
          studentKeys.forEach((k) => {
            if (prevStudentData[k] && prevStudentData[k].length) {
              mergeCollectionRows(k, prevStudentData[k]);
            }
          });
        }
        ensureLookupSynced();
        state.isLive = true;
        state.lastSyncedAt = new Date().toISOString();
        saveLocalState();
        const afterDigest = `${(state.data.materi || []).length}:${(state.data.jadwal || []).length}:${(state.data.bankSoal || []).length}:${(state.data.diskusi || []).length}:${(state.data.galeri || []).length}:${(state.data.banners || []).length}:${(state.data.pengaturan && state.data.pengaturan.schoolName) || ''}`;
        return { state, updated: true, changed: beforeDigest !== afterDigest };
      }
    } catch (err) {
      console.warn('Gagal menghubungi Apps Script, memakai data cache/demo lokal:', err);
      state.isLive = false;
    } finally {
      state.isSyncing = false;
    }
    return { state, updated: false };
  }

  async function bootstrap() {
    initFromCache();
    await syncFromRemote();
    return state;
  }

  function makeId(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  }

  async function submitRecord(collection, actionName, item, idPrefix) {
    const record = Object.assign(
      {
        id: item.id || makeId(idPrefix),
        timestamp: item.timestamp || new Date().toISOString()
      },
      item
    );

    if (getConfiguredApiUrl()) {
      const stuValid = isStudentSessionValid() && state.studentSession;
      const admValid = isAdminSessionValid();
      if (!stuValid && !admValid) {
        throw new Error('Silakan login dengan akun Siswa (NISN) terlebih dahulu sebelum mengirim data.');
      }
      const postPayload = Object.assign({}, record);
      if (stuValid && !admValid) {
        postPayload.nisn = String(state.studentSession.nisn || state.studentSession.id || postPayload.nisn || '').trim();
        postPayload.studentToken = state.studentToken || undefined;
        if (state.studentAuthPass) postPayload.password = state.studentAuthPass;
      } else if (stuValid) {
        postPayload.studentToken = state.studentToken || undefined;
      }
      const saved = await callGasPost(actionName, postPayload);
      state.isLive = true;
      const finalRecord = Object.assign({}, record, saved || {});
      state.data[collection].unshift(finalRecord);
      saveLocalState();
      return { record: finalRecord, mode: 'live' };
    }

    state.data[collection].unshift(record);
    saveLocalState();
    return { record, mode: 'demo' };
  }

  /* ---- Autentikasi Admin Guru (Sesi 6 Jam) ---- */
  function setSessionTabRole(role) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (role) sessionStorage.setItem('btd_tab_active_role', role);
        else sessionStorage.removeItem('btd_tab_active_role');
      }
    } catch (e) { /* abaikan */ }
  }

  function logoutAdmin() {
    const oldToken = state.adminToken;
    state.adminUnlocked = false;
    state.adminCreds = { username: '', password: '' };
    state.adminToken = '';
    state.adminSessionExpiresAt = 0;
    clearSession(LS_KEY_ADMIN_SESSION);
    if (oldToken && state.isLive && getConfiguredApiUrl()) {
      callGasPost('logoutSession', { token: oldToken }).catch(() => {});
    }
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('btd_tab_active_role') === 'admin') {
        sessionStorage.removeItem('btd_tab_active_role');
      }
    } catch (e) { /* abaikan */ }
  }

  async function verifyAdmin(username, password) {
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '').trim();

    if (state.isLive && getConfiguredApiUrl()) {
      const res = await callGasPost('verifyAdmin', { username: cleanUser, password: cleanPass });
      if (res && res.valid) {
        state.adminUnlocked = true;
        state.adminCreds = { username: cleanUser, password: cleanPass };
        state.adminToken = String(res.sessionToken || '');
        state.adminSessionExpiresAt = writeSession(LS_KEY_ADMIN_SESSION, {
          username: cleanUser,
          token: state.adminToken
        });
        setSessionTabRole('admin');
        if (res.dashboard) {
          state.data = Object.assign({}, state.data, res.dashboard);
          syncClassesSettingFromList();
          ensureLookupSynced();
          saveLocalState();
        }
        return true;
      }
      return false;
    }

    const cfg = state.data.pengaturan || {};
    const expectedUser = cfg.adminUsername || window.BTD_CONFIG.DEFAULT_ADMIN_USERNAME || 'admin';
    const expectedPass = cfg.adminPassword || window.BTD_CONFIG.DEFAULT_ADMIN_PASSWORD || 'admin123';

    if (cleanUser === String(expectedUser) && cleanPass === String(expectedPass)) {
      state.adminUnlocked = true;
      state.adminCreds = { username: cleanUser, password: cleanPass };
      state.adminToken = 'demo-adm-' + makeId('TOK');
      state.adminSessionExpiresAt = writeSession(LS_KEY_ADMIN_SESSION, {
        username: cleanUser,
        token: state.adminToken
      });
      setSessionTabRole('admin');
      return true;
    }
    return false;
  }

  function mergeAbsensiRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    const list = Array.isArray(state.data.absensi) ? state.data.absensi.slice() : [];
    rows.forEach((row) => {
      if (!row) return;
      const rNisn = String(row.nisn || row.nis || '').trim();
      const idx = list.findIndex(
        (a) =>
          (row.id && a.id === row.id) ||
          (row.jadwalId && rNisn && a.jadwalId === row.jadwalId && String(a.nisn || a.nis || '').trim() === rNisn)
      );
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
    });
    state.data.absensi = list;
  }

  function mergeCollectionRows(collectionKey, rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    const list = Array.isArray(state.data[collectionKey]) ? state.data[collectionKey].slice() : [];
    rows.forEach((row) => {
      if (!row) return;
      const idx = row.id ? list.findIndex((r) => r.id === row.id) : -1;
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
    });
    state.data[collectionKey] = list;
  }

  function mergeRuangKritisRows(rows) {
    mergeCollectionRows('ruangKritis', rows);
  }

  function applyStudentPortalBundle(res) {
    if (!res) return;
    if (Array.isArray(res.jadwal)) state.data.jadwal = res.jadwal;
    if (Array.isArray(res.myAbsensi)) mergeAbsensiRows(res.myAbsensi);
    if (Array.isArray(res.myRuangKritis)) mergeCollectionRows('ruangKritis', res.myRuangKritis);
    if (Array.isArray(res.myEvaluasi)) mergeCollectionRows('evaluasi', res.myEvaluasi);
    if (Array.isArray(res.myAmaliyah)) mergeCollectionRows('amaliyah', res.myAmaliyah);
    if (Array.isArray(res.myTugas)) mergeCollectionRows('tugas', res.myTugas);
    if (Array.isArray(res.myDiskusi)) mergeCollectionRows('diskusi', res.myDiskusi);
  }

  function buildAbsensiSelfieFileName(tanggal, kelas, nisn, recordId) {
    let datePrefix = '';
    const tgl = String(tanggal || '').trim();
    const m4 = tgl.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const m2 = tgl.match(/^(\d{2})-(\d{2})-(\d{2})/);
    if (m4) {
      datePrefix = `${m4[1].slice(2)}-${m4[2]}-${m4[3]}`;
    } else if (m2) {
      datePrefix = `${m2[1]}-${m2[2]}-${m2[3]}`;
    } else {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      datePrefix = `${yy}-${mm}-${dd}`;
    }
    const cleanKelas = String(kelas || 'Kelas').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Kelas';
    const cleanNisn = String(nisn || 'NISN').trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'NISN';
    const cleanId = String(recordId || makeId('ABS')).trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
    return `${datePrefix}_Absensi_${cleanKelas}_${cleanNisn}_${cleanId}.jpg`;
  }

  /* ---- Autentikasi Siswa (Username = NISN, Password = Kustom / Standar NISN, Sesi 6 Jam) ---- */
  function toSafeStudentView(stu) {
    if (!stu) return null;
    const cleanNisn = String(stu.nisn || stu.nis || stu.id || '').trim();
    const rawPass = String(stu.password || '').trim();
    const copy = Object.assign({}, stu);
    delete copy.password;
    if (copy.hasCustomPassword === undefined) {
      copy.hasCustomPassword = Boolean(rawPass && rawPass !== cleanNisn);
    }
    return copy;
  }

  async function verifyStudent(nisn, password) {
    const cleanNisn = String(nisn || '').trim();
    const cleanPass = String(password || '').trim();
    if (!cleanNisn || !cleanPass) return null;

    if (getConfiguredApiUrl()) {
      const res = await callGasPost('verifyStudent', { nisn: cleanNisn, password: cleanPass });
      state.isLive = true;
      if (res && res.valid && res.student) {
        const safeStu = toSafeStudentView(res.student);
        state.studentSession = safeStu;
        state.studentAuthPass = cleanPass;
        state.studentToken = String(res.sessionToken || '');
        state.studentSessionExpiresAt = writeSession(LS_KEY_STUDENT_SESSION, {
          student: safeStu,
          token: state.studentToken
        });
        setSessionTabRole('student');
        applyStudentPortalBundle(res);
        ensureLookupSynced();
        saveLocalState();
        return safeStu;
      }
      return null;
    }

    const match = (state.data.siswa || []).find(
      (s) => String(s.nisn || s.nis || s.id).trim() === cleanNisn && String(s.status || 'Aktif').toLowerCase() === 'aktif'
    );
    if (match) {
      const expectedPass = String(match.password || '').trim() || cleanNisn;
      if (expectedPass !== cleanPass) return null;
      const safeStu = toSafeStudentView(match);
      state.studentSession = safeStu;
      state.studentAuthPass = cleanPass;
      state.studentToken = 'demo-stu-' + makeId('TOK');
      state.studentSessionExpiresAt = writeSession(LS_KEY_STUDENT_SESSION, {
        student: safeStu,
        token: state.studentToken
      });
      setSessionTabRole('student');
      return safeStu;
    }
    return null;
  }

  function logoutStudent() {
    const oldToken = state.studentToken;
    state.studentSession = null;
    state.studentAuthPass = '';
    state.studentToken = '';
    state.studentSessionExpiresAt = 0;
    clearSession(LS_KEY_STUDENT_SESSION);
    if (oldToken && state.isLive && getConfiguredApiUrl()) {
      callGasPost('logoutSession', { studentToken: oldToken }).catch(() => {});
    }
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('btd_tab_active_role') === 'student') {
        sessionStorage.removeItem('btd_tab_active_role');
      }
    } catch (e) { /* abaikan */ }
  }

  /**
   * Sinkronisasi ringan khusus Portal Siswa (mengambil Jadwal + Presensi siswa aktif saja
   * tanpa menarik seluruh sheet Materi/BankSoal agar jadwal Daring baru muncul seketika).
   */
  async function syncStudentPortalData() {
    state.apiUrl = getConfiguredApiUrl();
    if (!state.apiUrl) {
      return { updated: false, changed: false };
    }
    const buildDigest = () => {
      const jPart = (state.data.jadwal || [])
        .map((j) => `${j.id}:${j.status}:${j.jenis}:${j.tanggal}:${j.kelas}`)
        .join('|');
      const aPart = (state.data.absensi || [])
        .map((a) => `${a.id}:${a.jadwalId}:${a.status}:${a.fotoUrl || ''}`)
        .join('|');
      const kPart = (state.data.ruangKritis || [])
        .map((r) => `${r.id}:${r.nilai || ''}:${r.catatanGuru || ''}:${r.dikurasi || false}`)
        .join('|');
      const tPart = (state.data.tugas || [])
        .map((t) => `${t.id}:${t.nilai || ''}:${t.catatanGuru || ''}`)
        .join('|');
      return `${jPart}__${aPart}__${kPart}__${tPart}`;
    };
    const beforeDigest = buildDigest();

    try {
      if (isStudentSessionValid() && state.studentSession && (state.studentSession.nisn || state.studentSession.id)) {
        const cleanNisn = String(state.studentSession.nisn || state.studentSession.id).trim();
        const activePass = String(state.studentAuthPass || '').trim();
        try {
          const res = await callGasPost('getStudentPortalData', {
            nisn: cleanNisn,
            studentToken: state.studentToken || undefined,
            password: activePass || undefined
          });
          if (res && Array.isArray(res.jadwal)) {
            if (res.student) {
              const safeStu = toSafeStudentView(res.student);
              state.studentSession = safeStu;
              state.studentSessionExpiresAt = writeSession(LS_KEY_STUDENT_SESSION, {
                student: safeStu,
                token: state.studentToken
              });
            }
            applyStudentPortalBundle(res);
            ensureLookupSynced();
            state.isLive = true;
            state.lastSyncedAt = new Date().toISOString();
            saveLocalState();
            return { updated: true, changed: beforeDigest !== buildDigest(), mode: 'portal' };
          }
        } catch (portalErr) {
          console.warn('getStudentPortalData fallback ke getLatestJadwal:', portalErr);
        }
      }

      try {
        const latestRes = await callGasGet('getLatestJadwal', { t: Date.now() });
        const latestJadwal = Array.isArray(latestRes)
          ? latestRes
          : latestRes && Array.isArray(latestRes.jadwal)
            ? latestRes.jadwal
            : null;
        if (Array.isArray(latestJadwal)) {
          state.data.jadwal = latestJadwal;
          ensureLookupSynced();
          state.isLive = true;
          state.lastSyncedAt = new Date().toISOString();
          saveLocalState();
          return { updated: true, changed: beforeDigest !== buildDigest(), mode: 'jadwal' };
        }
      } catch (jadwalErr) {
        console.warn('getLatestJadwal fallback ke syncFromRemote:', jadwalErr);
      }

      const fullRes = await syncFromRemote();
      return {
        updated: Boolean(fullRes && fullRes.updated),
        changed: Boolean(fullRes && (fullRes.changed || beforeDigest !== buildDigest())),
        mode: 'full'
      };
    } catch (err) {
      console.warn('Gagal menyegarkan jadwal siswa:', err);
      return { updated: false, changed: false, error: err };
    }
  }

  /**
   * Siswa mengisi presensi mandiri dari Portal Siswa.
   * Wajib jadwal berstatus 'Sedang Berlangsung', jenis 'Daring', kelas cocok, & foto selfie kamera.
   */
  async function submitStudentAbsensi({ jadwalId, status, catatan, fotoBase64, fotoMime, fotoName, fotoDataUrl, recordId }) {
    if (!isStudentSessionValid()) {
      throw new Error('Sesi login siswa telah berakhir. Silakan login kembali.');
    }
    const stu = state.studentSession;
    if (!stu) throw new Error('Silakan login sebagai siswa terlebih dahulu.');

    const jdw = (state.data.jadwal || []).find((j) => j.id === jadwalId);
    if (!jdw) throw new Error('Jadwal pembelajaran tidak ditemukan.');
    if (jdw.kelas !== stu.kelas) throw new Error('Jadwal ini bukan untuk kelas Anda.');
    if (jdw.jenis !== 'Daring') throw new Error('Presensi mandiri hanya tersedia untuk pembelajaran Daring.');
    if (jdw.status !== 'Sedang Berlangsung') {
      throw new Error('Presensi ditutup karena pembelajaran sudah Terlaksana atau tidak sedang berlangsung.');
    }
    if (!fotoBase64 && !fotoDataUrl) {
      throw new Error('Foto selfie kamera wajib diambil terlebih dahulu untuk presensi pembelajaran Daring.');
    }

    const cleanNisn = String(stu.nisn || stu.id);
    const activePass = String(state.studentAuthPass || '').trim();
    const finalRecordId = String(recordId || makeId('ABS')).trim();
    const payload = {
      recordId: finalRecordId,
      nisn: cleanNisn,
      studentToken: state.studentToken || undefined,
      password: activePass || undefined,
      jadwalId: jdw.id,
      status: status || 'Hadir',
      catatan: catatan || 'Presensi daring selfie oleh siswa',
      fotoBase64: fotoBase64 || '',
      fotoMime: fotoMime || 'image/jpeg',
      fotoName: fotoName || buildAbsensiSelfieFileName(jdw.tanggal, stu.kelas, cleanNisn, finalRecordId)
    };

    if (getConfiguredApiUrl()) {
      const res = await callGasPost('submitStudentAbsensi', payload);
      state.isLive = true;
      const savedRow = res.record || res;
      state.data.absensi = [
        savedRow,
        ...(state.data.absensi || []).filter(
          (a) => !(a.jadwalId === jdw.id && String(a.nisn || a.nis) === payload.nisn)
        )
      ];
      saveLocalState();
      return { record: savedRow, mode: 'live' };
    }

    const rec = {
      id: finalRecordId,
      timestamp: new Date().toISOString(),
      jadwalId: jdw.id,
      tanggal: jdw.tanggal,
      jadwal: jdw.jamKe,
      materi: jdw.materiJudul,
      kelas: stu.kelas,
      nisn: payload.nisn,
      nama: stu.nama,
      status: payload.status,
      catatan: payload.catatan,
      fotoUrl: fotoDataUrl || ''
    };
    state.data.absensi = [
      rec,
      ...(state.data.absensi || []).filter(
        (a) => !(a.jadwalId === jdw.id && String(a.nisn || a.nis) === payload.nisn)
      )
    ];
    saveLocalState();
    return { record: rec, mode: 'demo' };
  }

  async function refreshAdminDashboard() {
    if (!state.isLive || !getConfiguredApiUrl()) return state.data;
    try {
      const remote = await callGasPost('getAdminDashboard', {});
      if (remote) {
        state.data = Object.assign({}, state.data, remote);
        syncClassesSettingFromList();
        ensureLookupSynced();
        saveLocalState();
      }
    } catch (err) {
      if (String(err && err.message || '').toLowerCase().includes('akses ditolak')) {
        logoutAdmin();
      }
      throw err;
    }
    return state.data;
  }

  async function testConnection() {
    const base = assertValidGasUrl(getConfiguredApiUrl());
    const data = await callGasGet('ping');
    return { url: base, status: (data && data.status) || 'Apps Script aktif & merespons normal.' };
  }

  async function setupDatabaseRemote() {
    if (!state.isLive || !getConfiguredApiUrl()) {
      return { message: 'Mode Demo Lokal aktif (belum terhubung ke URL Apps Script).' };
    }
    return callGasPost('setupDatabase', {});
  }

  /**
   * Mengolah unggahan gambar menjadi Data URL Base64 tajam di bawah 46.000 karakter
   * agar langsung tersimpan aman di sel Google Sheets tanpa ketergantungan akses DriveApp.
   */
  async function uploadImageMedia(file, prefixName = 'media', opts = {}) {
    const maxWidth = opts.maxWidth || 960;
    const maxChars = opts.maxChars || 46000;
    const compressed = await window.BTD_UI.compressImageFile(file, maxWidth, 0.82, maxChars);
    return {
      url: compressed.dataUrl,
      charCount: compressed.charCount || compressed.dataUrl.length,
      mimeType: compressed.mimeType,
      mode: state.isLive ? 'sheets-base64' : 'demo'
    };
  }

  /**
   * Mengunggah file/rekaman suara manusia asli (.mp3/.wav/.m4a/.ogg/.webm) ke Google Drive
   * saat mode Live, atau sebagai Base64 pendek saat Mode Demo Lokal.
   */
  async function uploadAudioMedia(fileOrBlob, fileName = 'rekaman_doa.webm') {
    if (!fileOrBlob) throw new Error('Berkas audio tidak ditemukan.');
    const sizeBytes = Number(fileOrBlob.size || 0);
    if (sizeBytes > 10 * 1024 * 1024) {
      throw new Error('Ukuran file audio terlalu besar (maksimal 10 MB).');
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca berkas audio.'));
      reader.readAsDataURL(fileOrBlob);
    });
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!m) throw new Error('Format audio Base64 tidak valid.');
    const mimeType = m[1] || fileOrBlob.type || 'audio/webm';
    const base64Body = m[2];
    const cleanName = String(fileName || 'rekaman_doa.webm').replace(/[^a-zA-Z0-9._-]+/g, '_');

    if (state.isLive && getConfiguredApiUrl()) {
      const res = await callGasPost('uploadMedia', {
        fileBase64: base64Body,
        fileMime: mimeType,
        fileName: cleanName
      });
      if (!res || !res.url) throw new Error('Gagal mengunggah audio ke Google Drive.');
      return { url: res.url, mode: 'drive', mimeType };
    }

    if (dataUrl.length > 46000) {
      throw new Error(
        'Di Mode Demo Lokal tanpa Google Apps Script, file audio dibatasi singkat (~4 detik) agar muat di penyimpanan lokal. Hubungkan Apps Script untuk menyimpan MP3/rekaman panjang langsung di Google Drive.'
      );
    }
    return { url: dataUrl, mode: 'demo', mimeType };
  }

  function syncClassesSettingFromList() {
    const list = (state.data.kelas || []).map((k) => k.namaKelas).filter(Boolean);
    if (list.length) {
      state.data.pengaturan = state.data.pengaturan || {};
      state.data.pengaturan.classes = list;
    }
  }

  /* ---- CRUD Kelas ---- */
  async function saveKelas(kelasItem) {
    const item = Object.assign({}, kelasItem, { id: kelasItem.id || makeId('KLS') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveKelas', item);
    }
    const list = state.data.kelas || [];
    const idx = list.findIndex((k) => k.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    state.data.kelas = list;
    syncClassesSettingFromList();
    saveLocalState();
    return item;
  }

  async function deleteKelas(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteKelas', { id });
    }
    state.data.kelas = (state.data.kelas || []).filter((k) => k.id !== id);
    syncClassesSettingFromList();
    saveLocalState();
  }

  /* ---- Validasi & CRUD Siswa (Wajib NISN 10 Digit Angka + Anti-Ganda) ---- */
  function normalizeNisn(raw) {
    return String(raw === null || raw === undefined ? '' : raw).replace(/^'+/, '').trim();
  }

  function validateNisn10(raw) {
    const clean = normalizeNisn(raw);
    if (!clean) {
      return { valid: false, nisn: clean, message: 'NISN wajib diisi (tepat 10 digit angka).' };
    }
    if (/[^\d]/.test(clean)) {
      return { valid: false, nisn: clean, message: 'NISN hanya boleh berisi angka 0–9 tanpa huruf atau spasi.' };
    }
    if (clean.length < 10) {
      return {
        valid: false,
        nisn: clean,
        message: `NISN kurang! Baru ${clean.length} angka (kurang ${10 - clean.length} angka). NISN wajib tepat 10 angka.`
      };
    }
    if (clean.length > 10) {
      return {
        valid: false,
        nisn: clean,
        message: `NISN berlebih! Terisi ${clean.length} angka (lebih ${clean.length - 10} angka). NISN wajib tepat 10 angka.`
      };
    }
    return { valid: true, nisn: clean, message: '' };
  }

  function findDuplicateNisnStudent(nisn, excludeId = '') {
    const clean = normalizeNisn(nisn);
    const cleanExclude = normalizeNisn(excludeId);
    if (!clean) return null;
    return (state.data.siswa || []).find((s) => {
      const sNisn = normalizeNisn(s.nisn || s.nis || s.id);
      const sId = normalizeNisn(s.id);
      if (cleanExclude && (sId === cleanExclude || sNisn === cleanExclude)) return false;
      return sNisn === clean;
    }) || null;
  }

  async function saveSiswa(siswaItem) {
    const check = validateNisn10(siswaItem.nisn || siswaItem.nis || siswaItem.id);
    if (!check.valid) throw new Error(check.message);

    const dup = findDuplicateNisnStudent(check.nisn, siswaItem.prevId || '');
    if (dup) {
      throw new Error(`NISN ${check.nisn} sudah digunakan oleh siswa ${dup.nama} (Kelas ${dup.kelas})!`);
    }

    const list = state.data.siswa || [];
    const idx = list.findIndex((s) => normalizeNisn(s.nisn || s.id) === check.nisn || (siswaItem.prevId && normalizeNisn(s.id) === normalizeNisn(siswaItem.prevId)));
    const prev = idx >= 0 ? list[idx] : null;
    const item = Object.assign({}, prev || {}, siswaItem, {
      id: check.nisn,
      nisn: check.nisn
    });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveSiswa', Object.assign({}, siswaItem, {
        id: check.nisn,
        nisn: check.nisn
      }));
    }
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    state.data.siswa = list;
    state.data.siswaLookup = [];
    ensureLookupSynced();
    saveLocalState();
    return item;
  }

  async function changeStudentPassword(newPassword, confirmPassword) {
    if (!isStudentSessionValid() || !state.studentSession) {
      throw new Error('Sesi login siswa sudah berakhir. Silakan login kembali.');
    }
    const stu = state.studentSession;
    const cleanNisn = String(stu.nisn || stu.id || '').trim();
    const cleanNew = String(newPassword || '').trim();
    const cleanConfirm = String(confirmPassword || '').trim();
    if (!cleanNew || cleanNew.length < 4) {
      throw new Error('Password baru minimal terdiri dari 4 karakter.');
    }
    if (cleanNew !== cleanConfirm) {
      throw new Error('Password baru dan ulangi password baru tidak cocok.');
    }

    const activePass = String(state.studentAuthPass || '').trim();
    if (getConfiguredApiUrl()) {
      await callGasPost('changeStudentPassword', {
        nisn: cleanNisn,
        studentToken: state.studentToken || undefined,
        currentPassword: activePass || undefined,
        newPassword: cleanNew,
        confirmPassword: cleanConfirm
      });
      state.isLive = true;
    }

    const hasCustom = cleanNew !== cleanNisn;
    const list = state.data.siswa || [];
    const idx = list.findIndex((s) => normalizeNisn(s.nisn || s.id) === cleanNisn);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], {
        password: hasCustom ? cleanNew : '',
        hasCustomPassword: hasCustom
      });
    }
    const updatedSession = Object.assign({}, stu, { hasCustomPassword: hasCustom });
    state.studentSession = updatedSession;
    state.studentAuthPass = cleanNew;
    state.studentSessionExpiresAt = writeSession(LS_KEY_STUDENT_SESSION, {
      student: updatedSession,
      token: state.studentToken
    });
    saveLocalState();
    return { nisn: cleanNisn, hasCustomPassword: hasCustom };
  }

  async function resetStudentPassword(idOrNisn) {
    const cleanKey = normalizeNisn(idOrNisn) || String(idOrNisn || '').trim();
    if (!cleanKey) throw new Error('NISN siswa tidak valid.');
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('resetStudentPassword', { id: cleanKey, nisn: cleanKey });
    }
    const list = state.data.siswa || [];
    const idx = list.findIndex((s) => normalizeNisn(s.nisn || s.id) === cleanKey || String(s.id) === String(idOrNisn));
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], {
        password: '',
        hasCustomPassword: false
      });
    }
    if (state.studentSession && normalizeNisn(state.studentSession.nisn || state.studentSession.id) === cleanKey) {
      const updatedSession = Object.assign({}, state.studentSession, { hasCustomPassword: false });
      state.studentSession = updatedSession;
      state.studentAuthPass = cleanKey;
      state.studentSessionExpiresAt = writeSession(LS_KEY_STUDENT_SESSION, {
        student: updatedSession,
        authPass: cleanKey
      });
    }
    saveLocalState();
    return { nisn: cleanKey, hasCustomPassword: false };
  }

  async function deleteSiswa(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteSiswa', { id });
    }
    state.data.siswa = (state.data.siswa || []).filter((s) => String(s.id) !== String(id) && String(s.nisn) !== String(id));
    state.data.siswaLookup = [];
    ensureLookupSynced();
    saveLocalState();
  }

  async function importSiswaBatch(rows) {
    const rawList = Array.isArray(rows) ? rows : [];
    const validRows = [];
    const rejectedRows = [];
    const seenInFile = new Map();

    rawList.forEach((r, idx) => {
      const rowNo = idx + 2;
      const nisn = normalizeNisn(r.nisn || r.nis || '');
      const nama = String(r.nama || '').trim();
      const kelas = String(r.kelas || '').trim();
      const jkRaw = String(r.jenisKelamin || 'L').trim().toUpperCase();
      const jenisKelamin = jkRaw.startsWith('P') ? 'P' : 'L';
      const status = String(r.status || 'Aktif').trim() || 'Aktif';

      if (!nisn && !nama) return;

      if (!nama || !kelas) {
        rejectedRows.push({
          rowNo,
          nisn: nisn || '-',
          nama: nama || '(Tanpa Nama)',
          kelas: kelas || '-',
          reason: !nama ? 'Nama siswa wajib diisi.' : 'Kelas siswa wajib diisi.'
        });
        return;
      }

      const check = validateNisn10(nisn);
      if (!check.valid) {
        rejectedRows.push({ rowNo, nisn: nisn || '-', nama, kelas, reason: check.message });
        return;
      }

      if (seenInFile.has(check.nisn)) {
        rejectedRows.push({
          rowNo,
          nisn: check.nisn,
          nama,
          kelas,
          reason: `NISN ganda dalam file Excel (sama dengan siswa ${seenInFile.get(check.nisn)}).`
        });
        return;
      }

      const existing = findDuplicateNisnStudent(check.nisn);
      if (existing && String(existing.nama || '').trim().toLowerCase() !== nama.toLowerCase()) {
        rejectedRows.push({
          rowNo,
          nisn: check.nisn,
          nama,
          kelas,
          reason: `NISN sudah digunakan oleh siswa ${existing.nama} (Kelas ${existing.kelas}).`
        });
        return;
      }

      seenInFile.set(check.nisn, nama);
      validRows.push({
        id: check.nisn,
        nisn: check.nisn,
        nama,
        kelas,
        jenisKelamin,
        status
      });
    });

    if (validRows.length === 0 && rejectedRows.length === 0) {
      throw new Error('Tidak ada baris data siswa ditemukan di dalam file.');
    }

    if (validRows.length > 0) {
      if (state.isLive && getConfiguredApiUrl()) {
        await callGasPost('importSiswaBatch', { rows: validRows });
      }

      const list = state.data.siswa || [];
      validRows.forEach((item) => {
        const idx = list.findIndex((s) => normalizeNisn(s.nisn || s.id) === item.nisn);
        if (idx >= 0) list[idx] = Object.assign({}, list[idx], item, { id: item.nisn, nisn: item.nisn });
        else list.push(item);
      });
      state.data.siswa = list;
      state.data.siswaLookup = [];
      ensureLookupSynced();

      const existingClassNames = new Set((state.data.kelas || []).map((k) => k.namaKelas));
      for (const item of validRows) {
        if (!existingClassNames.has(item.kelas)) {
          existingClassNames.add(item.kelas);
          const jenjangGuess = item.kelas.toUpperCase().startsWith('XII')
            ? 'XII'
            : item.kelas.toUpperCase().startsWith('XI')
              ? 'XI'
              : 'X';
          await saveKelas({ namaKelas: item.kelas, jenjang: jenjangGuess, waliKelas: '-', keterangan: 'Ditambahkan saat import siswa' });
        }
      }
      saveLocalState();
    }

    return {
      total: validRows.length + rejectedRows.length,
      savedCount: validRows.length,
      rejectedCount: rejectedRows.length,
      savedRows: validRows,
      rejectedRows
    };
  }

  /* ---- CRUD Jadwal Pembelajaran ---- */
  async function saveJadwal(jadwalItem) {
    const item = Object.assign({}, jadwalItem, { id: jadwalItem.id || makeId('JDW') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveJadwal', item);
    }
    const list = state.data.jadwal || [];
    const idx = list.findIndex((j) => j.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    state.data.jadwal = list;
    saveLocalState();
    return item;
  }

  async function deleteJadwal(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteJadwal', { id });
    }
    state.data.jadwal = (state.data.jadwal || []).filter((j) => j.id !== id);
    saveLocalState();
  }

  /* ---- Presensi Mengajar Batch (Admin) ---- */
  async function saveAbsensiBatch({ jadwalId, tanggal, jadwal, materi, kelas, records }) {
    const ts = new Date().toISOString();
    const prepared = records.map((r, idx) => ({
      id: makeId('ABS' + idx),
      timestamp: ts,
      jadwalId: jadwalId || '',
      tanggal,
      jadwal,
      materi,
      kelas,
      nisn: String(r.nisn || r.nis || ''),
      nama: r.nama,
      status: r.status || 'Belum Absen',
      catatan: r.catatan || '',
      fotoUrl: r.fotoUrl || ''
    }));

    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveAbsensiBatch', { jadwalId: jadwalId || '', tanggal, jadwal, materi, kelas, records: prepared });
    }

    const filtered = (state.data.absensi || []).filter((a) => {
      if (jadwalId && a.jadwalId) return a.jadwalId !== jadwalId;
      return !(a.tanggal === tanggal && a.jadwal === jadwal && a.kelas === kelas);
    });
    state.data.absensi = [...prepared, ...filtered];
    saveLocalState();
    return prepared.length;
  }

  function getScheduleAttendanceSummary(jadwalItem) {
    const rows = (state.data.absensi || []).filter((a) => {
      if (a.jadwalId && jadwalItem.id) return a.jadwalId === jadwalItem.id;
      return a.tanggal === jadwalItem.tanggal && a.kelas === jadwalItem.kelas && a.jadwal === jadwalItem.jamKe;
    });
    const counts = { 'Belum Absen': 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    const statusKeys = ['Belum Absen', 'Hadir', 'Izin', 'Sakit', 'Alpa'];
    rows.forEach((r) => {
      const key = statusKeys.find((k) => k.toLowerCase() === String(r.status || '').trim().toLowerCase());
      if (key) counts[key] += 1;
      else counts['Belum Absen'] += 1;
    });

    const studentPool = (state.data.siswa && state.data.siswa.length ? state.data.siswa : state.data.siswaLookup) || [];
    const activeStudents = studentPool.filter(
      (s) => s && s.kelas === jadwalItem.kelas && (!s.status || String(s.status).toLowerCase() === 'aktif')
    );
    activeStudents.forEach((s) => {
      const sNisn = String(s.nisn || s.nis || s.id || '').trim();
      const hasRow = rows.some((r) => (sNisn && String(r.nisn || r.nis || '').trim() === sNisn) || r.nama === s.nama);
      if (!hasRow) counts['Belum Absen'] += 1;
    });

    return {
      total: rows.length,
      totalStudents: Math.max(rows.length, activeStudents.length),
      counts,
      rows
    };
  }

  /* ---- Banner, Materi, Tajwid, Soal, Galeri ---- */
  async function saveBanner(bannerItem) {
    const item = Object.assign({}, bannerItem, { id: bannerItem.id || makeId('BNR') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveBanner', item);
    }
    const list = state.data.banners || [];
    const idx = list.findIndex((b) => b.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    state.data.banners = list;
    saveLocalState();
    return item;
  }

  async function deleteBanner(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteBanner', { id });
    }
    state.data.banners = (state.data.banners || []).filter((b) => b.id !== id);
    saveLocalState();
  }

  async function saveMateri(materiItem) {
    const item = Object.assign({}, materiItem, { id: materiItem.id || makeId('MAT') });
    validateGasCellLengths(item, ['dnaPoin', 'galeriGambar']);
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveMateri', item);
    }
    const idx = state.data.materi.findIndex((m) => m.id === item.id);
    if (idx >= 0) state.data.materi[idx] = item;
    else state.data.materi.push(item);
    saveLocalState();
    return item;
  }

  async function deleteMateri(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteMateri', { id });
    }
    state.data.materi = state.data.materi.filter((m) => m.id !== id);
    state.data.tajwid = state.data.tajwid.filter((t) => t.materiId !== id);
    saveLocalState();
  }

  async function saveTajwid(tajwidItem) {
    const item = Object.assign({}, tajwidItem, { id: tajwidItem.id || makeId('TJW') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveTajwid', item);
    }
    const idx = state.data.tajwid.findIndex((t) => t.id === item.id);
    if (idx >= 0) state.data.tajwid[idx] = item;
    else state.data.tajwid.push(item);
    saveLocalState();
    return item;
  }

  async function deleteTajwid(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteTajwid', { id });
    }
    state.data.tajwid = state.data.tajwid.filter((t) => t.id !== id);
    saveLocalState();
  }

  async function saveSoal(soalItem) {
    const item = Object.assign({}, soalItem, { id: soalItem.id || makeId('SOAL') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveSoal', item);
    }
    const idx = state.data.bankSoal.findIndex((s) => s.id === item.id);
    if (idx >= 0) state.data.bankSoal[idx] = item;
    else state.data.bankSoal.push(item);
    saveLocalState();
    return item;
  }

  async function deleteSoal(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteSoal', { id });
    }
    state.data.bankSoal = state.data.bankSoal.filter((s) => s.id !== id);
    saveLocalState();
  }

  function parseSoalKunciIndex(rawKunci, optionCount) {
    const raw = String(rawKunci === null || rawKunci === undefined ? '' : rawKunci)
      .trim()
      .toUpperCase()
      .replace(/^PILIHAN\s+/, '')
      .replace(/[.)\s]/g, '');
    const letterMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    let idx = -1;
    if (Object.prototype.hasOwnProperty.call(letterMap, raw)) {
      idx = letterMap[raw];
    } else if (/^[1-5]$/.test(raw)) {
      idx = Number(raw) - 1;
    } else if (raw === '0') {
      idx = 0;
    }
    if (idx < 0 || idx >= optionCount) return -1;
    return idx;
  }

  async function importSoalBatch(rows, targetKelasObj, defaultMateriObj) {
    const rawList = Array.isArray(rows) ? rows : [];
    const targetKelas = targetKelasObj ? String(targetKelasObj.namaKelas || '').trim() : '';
    const targetJenjang = targetKelasObj
      ? String(targetKelasObj.jenjang || 'X').trim()
      : (defaultMateriObj && defaultMateriObj.jenjang) || 'X';
    const materiPool = (state.data.materi || []).filter(
      (m) => String(m.jenjang || '').trim().toUpperCase() === targetJenjang.toUpperCase()
    );

    const validRows = [];
    const rejectedRows = [];

    rawList.forEach((r, idx) => {
      const rowNo = idx + 2;
      const pertanyaan = String(r.pertanyaan || '').trim();
      const opsiA = String(r.opsiA || '').trim();
      const opsiB = String(r.opsiB || '').trim();
      const opsiC = String(r.opsiC || '').trim();
      const opsiD = String(r.opsiD || '').trim();
      const opsiE = String(r.opsiE || '').trim();
      const hasAnyContent = Boolean(pertanyaan || opsiA || opsiB || opsiC || opsiD || opsiE);
      if (!hasAnyContent) return;

      const babRaw = r.bab !== undefined && r.bab !== '' ? String(r.bab).replace(/[^\d]/g, '') : '';
      const babNum = babRaw ? Number(babRaw) : (defaultMateriObj ? Number(defaultMateriObj.bab) : 0);
      if (!babNum || babNum < 1 || babNum > 20) {
        rejectedRows.push({
          rowNo,
          pertanyaan: pertanyaan || '(Kosong)',
          reason: 'Kolom Bab wajib diisi angka 1–20 (atau pilih materi acuan di modal).'
        });
        return;
      }

      if (!pertanyaan) {
        rejectedRows.push({ rowNo, pertanyaan: '(Kosong)', reason: 'Teks pertanyaan wajib diisi.' });
        return;
      }

      if (!opsiA || !opsiB || !opsiC || !opsiD) {
        rejectedRows.push({
          rowNo,
          pertanyaan: pertanyaan.slice(0, 60),
          reason: 'Pilihan A, B, C, dan D wajib diisi lengkap.'
        });
        return;
      }

      const opsi = [opsiA, opsiB, opsiC, opsiD];
      if (opsiE) opsi.push(opsiE);

      const kunciIdx = parseSoalKunciIndex(r.kunci, opsi.length);
      if (kunciIdx === -1) {
        rejectedRows.push({
          rowNo,
          pertanyaan: pertanyaan.slice(0, 60),
          reason: `Kunci jawaban "${r.kunci || '-'}" tidak valid. Gunakan huruf A–${opsi.length === 5 ? 'E' : 'D'}.`
        });
        return;
      }

      const matchedMateri =
        (defaultMateriObj && Number(defaultMateriObj.bab) === babNum ? defaultMateriObj : null) ||
        materiPool.find((m) => Number(m.bab) === babNum) ||
        null;

      const smtRaw = String(r.semester || '').trim().toLowerCase();
      const semester =
        smtRaw === '2' || smtRaw.includes('genap')
          ? '2'
          : smtRaw === '1' || smtRaw.includes('ganjil')
            ? '1'
            : matchedMateri && matchedMateri.semester
              ? String(matchedMateri.semester)
              : babNum <= 5
                ? '1'
                : '2';

      validRows.push({
        id: makeId('SOAL') + '-' + idx,
        kelas: targetKelas,
        jenjang: targetJenjang,
        semester,
        bab: babNum,
        materiId: matchedMateri ? matchedMateri.id : '',
        materiJudul: matchedMateri
          ? `Bab ${matchedMateri.bab}: ${matchedMateri.judul}`
          : `Bab ${babNum}`,
        pertanyaan,
        gambarUrl: String(r.gambarUrl || '').trim(),
        opsi,
        kunci: kunciIdx,
        level: String(r.level || '').trim() || 'HOTS (C4)',
        pembahasan: String(r.pembahasan || '').trim() || '-'
      });
    });

    if (validRows.length === 0 && rejectedRows.length === 0) {
      throw new Error('Tidak ada baris data soal ditemukan di dalam file.');
    }

    if (validRows.length > 0) {
      if (state.isLive && getConfiguredApiUrl()) {
        try {
          await callGasPost('importSoalBatch', { rows: validRows });
        } catch (err) {
          if (String(err && err.message || '').includes('tidak dikenali')) {
            for (let i = 0; i < validRows.length; i++) {
              await callGasPost('saveSoal', validRows[i]);
            }
          } else {
            throw err;
          }
        }
      }
      state.data.bankSoal = [...(state.data.bankSoal || []), ...validRows];
      saveLocalState();
    }

    return {
      total: validRows.length + rejectedRows.length,
      savedCount: validRows.length,
      rejectedCount: rejectedRows.length,
      rejectedRows
    };
  }

  async function gradeSubmissionRecord(collectionKey, actionName, { id, nilai, catatanGuru, dikurasi }, allowCurate = false) {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('ID data penilaian tidak valid.');
    const list = Array.isArray(state.data[collectionKey]) ? state.data[collectionKey] : [];
    const idx = list.findIndex((r) => String(r.id) === cleanId);
    const prev = idx >= 0 ? list[idx] : { id: cleanId };
    const patch = {
      nilai: nilai !== undefined ? String(nilai).trim() : (prev.nilai || ''),
      catatanGuru: catatanGuru !== undefined ? String(catatanGuru).trim() : (prev.catatanGuru || '')
    };
    if (allowCurate) {
      patch.dikurasi = dikurasi !== undefined ? Boolean(dikurasi) : Boolean(prev.dikurasi);
    }
    const updated = Object.assign({}, prev, patch);
    if (state.isLive && getConfiguredApiUrl()) {
      const payload = { id: cleanId, nilai: updated.nilai, catatanGuru: updated.catatanGuru };
      if (allowCurate) payload.dikurasi = updated.dikurasi;
      await callGasPost(actionName, payload);
    }
    if (idx >= 0) list[idx] = updated;
    else list.unshift(updated);
    state.data[collectionKey] = list;
    saveLocalState();
    return updated;
  }

  function gradeRuangKritis(opts) {
    return gradeSubmissionRecord('ruangKritis', 'saveRuangKritisNilai', opts, true);
  }

  function gradeTugas(opts) {
    return gradeSubmissionRecord('tugas', 'saveTugasNilai', opts, false);
  }

  function gradeAmaliyah(opts) {
    return gradeSubmissionRecord('amaliyah', 'saveAmaliyahNilai', opts, false);
  }

  async function gradeEvaluasi({ id, skor, benar, catatanGuru }) {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('ID data evaluasi CBT tidak valid.');
    const list = Array.isArray(state.data.evaluasi) ? state.data.evaluasi : [];
    const idx = list.findIndex((r) => String(r.id) === cleanId);
    const prev = idx >= 0 ? list[idx] : { id: cleanId };
    const nextSkor = skor !== undefined && String(skor).trim() !== ''
      ? Math.min(100, Math.max(0, Number(skor)))
      : Number(prev.skor || 0);
    if (!Number.isFinite(nextSkor)) throw new Error('Skor Evaluasi harus berupa angka 0–100.');
    const maxSoal = Math.max(0, Number(prev.totalSoal || 0));
    let nextBenar = prev.benar !== undefined ? Number(prev.benar || 0) : 0;
    if (benar !== undefined && String(benar).trim() !== '') {
      const bVal = Math.max(0, Math.round(Number(benar)));
      if (!Number.isFinite(bVal)) throw new Error('Jumlah benar harus berupa angka.');
      nextBenar = maxSoal > 0 ? Math.min(maxSoal, bVal) : bVal;
    }
    const updated = Object.assign({}, prev, {
      skor: nextSkor,
      benar: nextBenar,
      catatanGuru: catatanGuru !== undefined ? String(catatanGuru).trim() : (prev.catatanGuru || '')
    });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveEvaluasiNilai', {
        id: cleanId,
        skor: updated.skor,
        benar: updated.benar,
        catatanGuru: updated.catatanGuru
      });
    }
    if (idx >= 0) list[idx] = updated;
    else list.unshift(updated);
    state.data.evaluasi = list;
    saveLocalState();
    return updated;
  }

  /* ---- Ayo Belajar (Praktikum PAI Config, Video YouTube, Switch & Komentar Pengunjung) ---- */
  function extractYoutubeVideoId(raw) {
    if (window.BTD_UI && typeof window.BTD_UI.extractYoutubeId === 'function') {
      return window.BTD_UI.extractYoutubeId(raw);
    }
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
    const m = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return m ? m[1] : '';
  }

  function hasBlockedContent(raw) {
    if (window.BTD_UI && typeof window.BTD_UI.containsProfanityOrSpam === 'function') {
      return window.BTD_UI.containsProfanityOrSpam(raw);
    }
    return /<script|javascript:|https?:\/\//i.test(String(raw || ''));
  }

  function getBelajarCategoriesList() {
    const metaList = (window.BTD_SEED && Array.isArray(window.BTD_SEED.belajarCategoriesMeta))
      ? window.BTD_SEED.belajarCategoriesMeta
      : [];
    const cfgList = Array.isArray(state.data.belajarConfig) ? state.data.belajarConfig : [];
    const byId = {};
    cfgList.forEach((c) => {
      if (c && c.id) byId[String(c.id)] = c;
    });
    return metaList.map((m) => {
      const ov = byId[String(m.id)] || null;
      return {
        id: m.id,
        kategoriId: m.kategoriId,
        kategoriTitle: m.kategoriTitle || 'Kartu Kategori Utama',
        defaultJudul: m.defaultJudul,
        judul: ov && ov.judul ? String(ov.judul).trim() : m.defaultJudul,
        coverImage: ov && ov.coverImage ? String(ov.coverImage).trim() : '',
        updatedAt: ov ? (ov.updatedAt || '') : ''
      };
    });
  }

  function getBelajarCategoryRuntimeConfig(kategoriId) {
    const targetId = String(kategoriId || '').startsWith('cat-')
      ? String(kategoriId || '')
      : `cat-${String(kategoriId || '').trim()}`;
    const found = getBelajarCategoriesList().find((c) => String(c.id) === targetId);
    if (found) return found;
    return {
      id: targetId,
      kategoriId: String(kategoriId || '').replace(/^cat-/, ''),
      kategoriTitle: 'Kartu Kategori Utama',
      defaultJudul: String(kategoriId || ''),
      judul: String(kategoriId || ''),
      coverImage: ''
    };
  }

  function normalizePrayerAudiosMap(raw) {
    let parsed = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed || '{}');
      } catch (e) {
        parsed = {};
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    Object.keys(parsed).forEach((k) => {
      const val = String(parsed[k] || '').trim();
      if (!val) return;
      if (/^https?:\/\/\S+$/i.test(val) || /^data:audio\/(?:mpeg|mp3|wav|ogg|webm|mp4|aac);base64,/i.test(val)) {
        out[String(k).slice(0, 32)] = val;
      }
    });
    return out;
  }

  function getBelajarTopicsList() {
    const metaList = (window.BTD_SEED && Array.isArray(window.BTD_SEED.belajarTopicsMeta))
      ? window.BTD_SEED.belajarTopicsMeta
      : [];
    const cfgList = Array.isArray(state.data.belajarConfig) ? state.data.belajarConfig : [];
    const byId = {};
    cfgList.forEach((c) => {
      if (c && c.id) byId[String(c.id)] = c;
    });
    return metaList.map((m) => {
      const ov = byId[String(m.id)] || null;
      const judul = ov && ov.judul ? String(ov.judul).trim() : m.defaultJudul;
      const youtubeId = ov && ov.youtubeId !== undefined && String(ov.youtubeId).trim() !== ''
        ? extractYoutubeVideoId(ov.youtubeId)
        : (m.defaultYoutubeId || '');
      const coverImage = ov && ov.coverImage ? String(ov.coverImage).trim() : (m.defaultCoverImage || '');
      const prayerAudios = ov && ov.prayerAudios ? normalizePrayerAudiosMap(ov.prayerAudios) : {};
      const komentarAktif = ov
        ? (ov.komentarAktif !== false && String(ov.komentarAktif).toLowerCase() !== 'false')
        : true;
      return {
        id: m.id,
        kategoriId: m.kategoriId,
        kategoriTitle: m.kategoriTitle,
        defaultJudul: m.defaultJudul,
        judul,
        defaultYoutubeId: m.defaultYoutubeId || '',
        youtubeId,
        coverImage,
        prayerAudios,
        youtubeQuery: m.youtubeQuery || `${m.defaultJudul} Kemenag`,
        komentarAktif,
        updatedAt: ov ? (ov.updatedAt || '') : ''
      };
    });
  }

  function getBelajarTopicRuntimeConfig(topicId) {
    const found = getBelajarTopicsList().find((t) => String(t.id) === String(topicId));
    if (found) return found;
    return {
      id: String(topicId || ''),
      kategoriId: '',
      kategoriTitle: '',
      defaultJudul: String(topicId || ''),
      judul: String(topicId || ''),
      defaultYoutubeId: '',
      youtubeId: '',
      coverImage: '',
      prayerAudios: {},
      youtubeQuery: `${topicId || ''} Kemenag`,
      komentarAktif: true
    };
  }

  async function saveBelajarConfig({ id, kategoriId, judul, youtubeId, coverImage, prayerAudios, komentarAktif }) {
    const topicId = String(id || '').trim();
    if (!topicId) throw new Error('ID topik praktikum tidak valid.');
    const topicMeta = (window.BTD_SEED && Array.isArray(window.BTD_SEED.belajarTopicsMeta))
      ? window.BTD_SEED.belajarTopicsMeta.find((m) => m.id === topicId)
      : null;
    const catMeta = (window.BTD_SEED && Array.isArray(window.BTD_SEED.belajarCategoriesMeta))
      ? window.BTD_SEED.belajarCategoriesMeta.find((m) => m.id === topicId)
      : null;
    const meta = topicMeta || catMeta;
    const existingList = Array.isArray(state.data.belajarConfig) ? state.data.belajarConfig : [];
    const prevCfg = existingList.find((c) => String(c.id) === topicId) || null;
    const nextCover = coverImage !== undefined
      ? String(coverImage || '').trim()
      : (prevCfg && prevCfg.coverImage ? String(prevCfg.coverImage).trim() : '');
    const nextPrayerAudios = prayerAudios !== undefined
      ? normalizePrayerAudiosMap(prayerAudios)
      : normalizePrayerAudiosMap(prevCfg ? prevCfg.prayerAudios : {});
    const item = {
      id: topicId,
      kategoriId: String(kategoriId || (meta && meta.kategoriId) || (prevCfg && prevCfg.kategoriId) || '').trim(),
      judul: String(judul !== undefined ? judul : (meta && meta.defaultJudul) || '').trim() || (meta ? meta.defaultJudul : topicId),
      youtubeId: extractYoutubeVideoId(youtubeId !== undefined ? youtubeId : (prevCfg ? prevCfg.youtubeId : '')),
      coverImage: nextCover,
      prayerAudios: nextPrayerAudios,
      komentarAktif: komentarAktif !== false && String(komentarAktif).toLowerCase() !== 'false',
      updatedAt: new Date().toISOString()
    };
    const itemForLength = Object.assign({}, item, {
      prayerAudios: Object.keys(nextPrayerAudios).length ? JSON.stringify(nextPrayerAudios) : ''
    });
    validateGasCellLengths(itemForLength, [], 48500);
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveBelajarConfig', itemForLength);
    }
    const list = existingList.slice();
    const idx = list.findIndex((c) => String(c.id) === topicId);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    state.data.belajarConfig = list;
    saveLocalState();
    return item;
  }

  async function submitBelajarKomentar({ topicId, topicTitle, kategoriTitle, nama, instansi, pekerjaan, email, noHp, komentar }) {
    const cleanTopicId = String(topicId || '').trim();
    const cfg = getBelajarTopicRuntimeConfig(cleanTopicId);
    if (!cfg.komentarAktif) {
      throw new Error('Kolom komentar untuk praktikum ini sedang dinonaktifkan oleh Guru.');
    }
    const cleanNama = String(nama || '').replace(/[<>]/g, '').trim().slice(0, 80);
    const cleanInstansi = String(instansi || '').replace(/[<>]/g, '').trim().slice(0, 100);
    const cleanPekerjaan = String(pekerjaan || '').replace(/[<>]/g, '').trim().slice(0, 60);
    const cleanEmail = String(email || '').trim().slice(0, 100);
    const cleanNoHp = String(noHp || '').replace(/[^\d+]/g, '').slice(0, 20);
    const cleanKomentar = String(komentar || '').replace(/[<>]/g, '').trim().slice(0, 650);

    if (!cleanTopicId || cleanNama.length < 2 || cleanInstansi.length < 2 || cleanPekerjaan.length < 2 || cleanKomentar.length < 4) {
      throw new Error('Lengkapi Nama, Instansi/Sekolah, Pekerjaan, Email, No. HP, serta isi komentar minimal 4 huruf.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      throw new Error('Format alamat Email tidak valid.');
    }
    if (cleanNoHp.replace(/\D/g, '').length < 8) {
      throw new Error('Nomor HP/WhatsApp minimal 8 digit angka.');
    }
    if (hasBlockedContent([cleanNama, cleanInstansi, cleanPekerjaan, cleanKomentar].join(' '))) {
      throw new Error('Komentar diblokir karena mengandung kata kasar/tidak pantas atau tautan terlarang. Gunakan bahasa yang santun.');
    }

    const payload = {
      topicId: cleanTopicId,
      topicTitle: String(topicTitle || cfg.judul || cleanTopicId).trim(),
      kategoriTitle: String(kategoriTitle || cfg.kategoriTitle || '').trim(),
      nama: cleanNama,
      instansi: cleanInstansi,
      pekerjaan: cleanPekerjaan,
      email: cleanEmail,
      noHp: cleanNoHp,
      komentar: cleanKomentar
    };

    if (getConfiguredApiUrl()) {
      const saved = await callGasPost('submitBelajarKomentar', payload);
      state.isLive = true;
      const publicRow = Object.assign({}, payload, saved || {}, {
        id: (saved && saved.id) || makeId('KMNT'),
        timestamp: (saved && saved.timestamp) || new Date().toISOString()
      });
      state.data.belajarKomentar = [publicRow, ...(state.data.belajarKomentar || [])];
      saveLocalState();
      return { record: publicRow, mode: 'live' };
    }

    const rec = Object.assign({}, payload, {
      id: makeId('KMNT'),
      timestamp: new Date().toISOString()
    });
    state.data.belajarKomentar = [rec, ...(state.data.belajarKomentar || [])];
    saveLocalState();
    return { record: rec, mode: 'demo' };
  }

  async function deleteBelajarKomentar(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId) return;
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteBelajarKomentar', { id: cleanId });
    }
    state.data.belajarKomentar = (state.data.belajarKomentar || []).filter((k) => String(k.id) !== cleanId);
    saveLocalState();
  }

  /* ---- Portofolio & Riwayat Profil Guru (Mengajar, Pendidikan, Penghargaan, Diklat) ---- */
  const GURU_RIWAYAT_KATEGORI = ['Mengajar', 'Pendidikan', 'Penghargaan', 'Diklat'];

  function getGuruRiwayatList() {
    const list = Array.isArray(state.data.guruRiwayat) ? state.data.guruRiwayat.slice() : [];
    return list.sort((a, b) => (Number(a && a.urutan) || 999) - (Number(b && b.urutan) || 999));
  }

  async function saveGuruRiwayat(row) {
    const kategoriRaw = String((row && row.kategori) || 'Mengajar').trim();
    const kategori = GURU_RIWAYAT_KATEGORI.includes(kategoriRaw) ? kategoriRaw : 'Mengajar';
    const judul = String((row && row.judul) || '').trim();
    if (!judul) throw new Error('Judul riwayat tidak boleh kosong.');
    const cleanId = String((row && row.id) || '').trim() || makeId('RWT');
    const currentList = Array.isArray(state.data.guruRiwayat) ? state.data.guruRiwayat.slice() : [];
    const nextUrutan = Math.max(1, Math.round(Number((row && row.urutan) || currentList.length + 1) || 1));
    const item = {
      id: cleanId,
      kategori,
      periode: String((row && row.periode) || '').trim().slice(0, 60),
      judul: judul.slice(0, 160),
      instansi: String((row && row.instansi) || '').trim().slice(0, 160),
      keterangan: String((row && row.keterangan) || '').trim().slice(0, 400),
      urutan: nextUrutan
    };
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveGuruRiwayat', item);
    }
    const idx = currentList.findIndex((r) => String(r.id) === cleanId);
    if (idx >= 0) currentList[idx] = item;
    else currentList.push(item);
    state.data.guruRiwayat = currentList;
    saveLocalState();
    return item;
  }

  async function deleteGuruRiwayat(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId) return;
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteGuruRiwayat', { id: cleanId });
    }
    state.data.guruRiwayat = (state.data.guruRiwayat || []).filter((r) => String(r.id) !== cleanId);
    saveLocalState();
  }

  async function saveGaleri(galeriItem) {
    const item = Object.assign({}, galeriItem, { id: galeriItem.id || makeId('GAL') });
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('saveGaleri', item);
    }
    const idx = state.data.galeri.findIndex((g) => g.id === item.id);
    if (idx >= 0) state.data.galeri[idx] = item;
    else state.data.galeri.unshift(item);
    saveLocalState();
    return item;
  }

  async function deleteGaleri(id) {
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('deleteGaleri', { id });
    }
    state.data.galeri = state.data.galeri.filter((g) => g.id !== id);
    saveLocalState();
  }

  async function updatePengaturan(newSettings) {
    const merged = Object.assign({}, state.data.pengaturan, newSettings);
    if (state.isLive && getConfiguredApiUrl()) {
      await callGasPost('updatePengaturan', merged);
    }
    state.data.pengaturan = merged;
    if (newSettings.adminUsername) state.adminCreds.username = newSettings.adminUsername;
    if (newSettings.adminPassword) state.adminCreds.password = newSettings.adminPassword;
    if (state.adminUnlocked && state.adminCreds.username) {
      state.adminSessionExpiresAt = writeSession(LS_KEY_ADMIN_SESSION, {
        username: state.adminCreds.username,
        password: state.adminCreds.password
      });
    }
    saveLocalState();
    return merged;
  }

  function setAppsScriptUrl(url) {
    const clean = String(url || '').trim();
    if (clean) localStorage.setItem(LS_KEY_API_URL, clean);
    else localStorage.removeItem(LS_KEY_API_URL);
    state.apiUrl = getConfiguredApiUrl();
  }

  function resetDemoData() {
    localStorage.removeItem(LS_KEY_STATE);
    state.data = deepClone(window.BTD_SEED);
    ensureLookupSynced();
    saveLocalState();
  }

  function getAnalytics() {
    const absensi = state.data.absensi || [];
    const evaluasi = state.data.evaluasi || [];
    const materi = state.data.materi || [];
    const ruangKritis = state.data.ruangKritis || [];
    const amaliyah = state.data.amaliyah || [];
    const tugas = state.data.tugas || [];
    const galeri = state.data.galeri || [];
    const banners = state.data.banners || [];
    const kelas = state.data.kelas || [];
    const siswa = (state.data.siswa && state.data.siswa.length) ? state.data.siswa : (state.data.siswaLookup || []);
    const jadwal = state.data.jadwal || [];

    const hadirCount = absensi.filter((a) => String(a.status).toLowerCase() === 'hadir').length;
    const recordedAbsensi = absensi.filter((a) => String(a.status || '').trim().toLowerCase() !== 'belum absen');
    const attendanceRate = recordedAbsensi.length ? Math.round((hadirCount / recordedAbsensi.length) * 100) : 0;

    const avgScore = evaluasi.length
      ? Math.round(evaluasi.reduce((acc, e) => acc + Number(e.skor || 0), 0) / evaluasi.length)
      : 0;

    const masteryCount = evaluasi.filter((e) => Number(e.skor || 0) >= 75).length;
    const masteryRate = evaluasi.length ? Math.round((masteryCount / evaluasi.length) * 100) : 0;

    const scoreByClass = {};
    evaluasi.forEach((e) => {
      const k = e.kelas || 'Lainnya';
      if (!scoreByClass[k]) scoreByClass[k] = { total: 0, count: 0 };
      scoreByClass[k].total += Number(e.skor || 0);
      scoreByClass[k].count += 1;
    });

    const classChart = Object.keys(scoreByClass).map((k) => ({
      label: k,
      avg: Math.round(scoreByClass[k].total / scoreByClass[k].count),
      count: scoreByClass[k].count
    }));

    const statusCounts = ['Hadir', 'Izin', 'Sakit', 'Alpa', 'Belum Absen'].map((st) => ({
      label: st,
      count: absensi.filter((a) => String(a.status || 'Belum Absen').trim().toLowerCase() === st.toLowerCase()).length
    }));

    return {
      totalBanners: banners.length,
      totalKelas: kelas.length,
      totalSiswa: siswa.length,
      totalJadwal: jadwal.length,
      totalTerlaksana: jadwal.filter((j) => j.status === 'Terlaksana').length,
      totalMateri: materi.length,
      totalSoal: (state.data.bankSoal || []).length,
      totalTajwid: (state.data.tajwid || []).length,
      totalAbsensi: absensi.length,
      attendanceRate,
      totalEvaluasi: evaluasi.length,
      avgScore,
      masteryRate,
      totalHots: ruangKritis.length,
      totalAmaliyah: amaliyah.length,
      totalTugas: tugas.length,
      totalGaleri: galeri.length,
      classChart,
      statusCounts
    };
  }

  function exportCsv(filename, headers, rows) {
    const escapeCell = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [headers.map(escapeCell).join(',')];
    rows.forEach((r) => lines.push(r.map(escapeCell).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function colIdxToLetter(colNum) {
    let n = Number(colNum);
    let out = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out || 'A';
  }

  function computeAutoColWidths(headers, rows, options = {}) {
    const extraPad = options.extraPad !== undefined ? options.extraPad : 4;
    const minWidth = options.minWidth !== undefined ? options.minWidth : 7;
    const maxWidth = options.maxWidth !== undefined ? options.maxWidth : 48;
    const colCount = headers.length;
    const widths = new Array(colCount).fill(minWidth);

    const measureStr = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      if (!s) return 0;
      const lines = s.split(/\r?\n/);
      return Math.max(...lines.map((l) => l.length));
    };

    for (let c = 0; c < colCount; c++) {
      let maxLen = measureStr(headers[c]);
      for (let r = 0; r < rows.length; r++) {
        const len = measureStr(rows[r][c]);
        if (len > maxLen) maxLen = len;
      }
      const w = Math.min(maxWidth, Math.max(minWidth, maxLen + extraPad));
      widths[c] = c === 0 && String(headers[0]).toLowerCase() === 'no' ? Math.max(6, Math.min(9, w)) : w;
    }
    return widths;
  }

  function estimateRowHeight(vals, colWidths, baseHeight = 21) {
    let maxLines = 1;
    vals.forEach((v, idx) => {
      const s = v === null || v === undefined ? '' : String(v);
      const w = Math.max(8, (colWidths[idx] || 18) - 3);
      const segments = s.split(/\r?\n/);
      let lines = 0;
      segments.forEach((seg) => {
        lines += Math.max(1, Math.ceil(seg.length / w));
      });
      if (lines > maxLines) maxLines = lines;
    });
    return Math.max(baseHeight, 10 + maxLines * 14);
  }

  async function downloadWorkbookBuffer(wb, fileName) {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
  }

  /**
   * Ekspor tabel apa pun menjadi file Excel (.xlsx) resmi dengan ExcelJS:
   * - Baris judul & kop sekolah ter-merge rapi di tengah
   * - Header tabel berborder penuh
   * - Lebar kolom & tinggi baris menyesuaikan isi tulisan secara otomatis
   */
  async function exportTableExcel({
    fileName = 'Laporan_Bilik_Tarbiyah.xlsx',
    sheetName = 'Laporan',
    title = 'LAPORAN DATA',
    subtitle = '',
    metaLine = '',
    headers = [],
    rows = [],
    centerCols = [],
    textCols = [],
    summaryText = '',
    orientation = 'landscape'
  }) {
    if (!window.ExcelJS) {
      throw new Error('Library ExcelJS belum siap. Pastikan koneksi internet aktif lalu muat ulang halaman.');
    }

    const colCount = Math.max(1, headers.length);
    const lastCol = colIdxToLetter(colCount);
    const cfg = state.data.pengaturan || {};
    const wb = new window.ExcelJS.Workbook();
    wb.creator = cfg.teacherName || 'Bilik Tarbiyah Digital';
    wb.created = new Date();

    const ws = wb.addWorksheet(String(sheetName || 'Data').slice(0, 31), {
      pageSetup: {
        paperSize: 9,
        orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 }
      }
    });

    const widths = computeAutoColWidths(headers, rows, { extraPad: 4, minWidth: 8, maxWidth: 50 });
    ws.columns = widths.map((w, idx) => ({ key: 'c' + idx, width: w }));

    const thinSide = { style: 'thin', color: { argb: 'FF1E293B' } };
    const cellBorder = { top: thinSide, left: thinSide, bottom: thinSide, right: thinSide };
    const softBorder = { style: 'thin', color: { argb: 'FFA7F3D0' } };

    // Kop Sekolah & Instansi (Merge A1..lastCol)
    ws.mergeCells(`A1:${lastCol}1`);
    const r1 = ws.getRow(1);
    r1.getCell(1).value = `${String(cfg.namaInstansi || 'PEMERINTAH PROVINSI JAMBI').toUpperCase()} — ${String(cfg.schoolName || 'SMAN 20 TEBO').toUpperCase()}`;
    r1.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r1.height = 20;

    ws.mergeCells(`A2:${lastCol}2`);
    const r2 = ws.getRow(2);
    r2.getCell(1).value = String(title || 'LAPORAN DATA').toUpperCase();
    r2.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF064E3B' } };
    r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r2.height = 25;

    let curRow = 3;
    if (subtitle) {
      ws.mergeCells(`A${curRow}:${lastCol}${curRow}`);
      const rSub = ws.getRow(curRow);
      rSub.getCell(1).value = subtitle;
      rSub.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
      rSub.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      rSub.height = 18;
      curRow++;
    }

    if (metaLine) {
      ws.mergeCells(`A${curRow}:${lastCol}${curRow}`);
      const rMeta = ws.getRow(curRow);
      rMeta.getCell(1).value = metaLine;
      rMeta.getCell(1).font = { name: 'Calibri', size: 10, bold: true, italic: true, color: { argb: 'FF065F46' } };
      rMeta.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      for (let c = 1; c <= colCount; c++) {
        rMeta.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        rMeta.getCell(c).border = { top: softBorder, left: softBorder, bottom: softBorder, right: softBorder };
      }
      rMeta.height = 22;
      curRow++;
    }

    ws.getRow(curRow).height = 8;
    curRow++;

    // Header Row
    const headerRow = ws.getRow(curRow);
    headerRow.height = 25;
    headers.forEach((h, cIdx) => {
      const cell = headerRow.getCell(cIdx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = cellBorder;
    });
    curRow++;

    // Data Rows
    rows.forEach((rowArr, rIdx) => {
      const vals = headers.map((_, i) => (rowArr[i] === null || rowArr[i] === undefined ? '' : rowArr[i]));
      const rowObj = ws.getRow(curRow);
      rowObj.height = estimateRowHeight(vals, widths, 21);
      const bgArgb = rIdx % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

      vals.forEach((v, cIdx) => {
        const cell = rowObj.getCell(cIdx + 1);
        const isTextCol = textCols.includes(cIdx);
        if (isTextCol) {
          cell.value = String(v);
          cell.numFmt = '@';
        } else {
          cell.value = v;
        }
        cell.border = cellBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
        cell.alignment = {
          horizontal: centerCols.includes(cIdx) ? 'center' : 'left',
          vertical: 'middle',
          wrapText: true
        };
      });
      curRow++;
    });

    if (summaryText) {
      ws.mergeCells(`A${curRow}:${lastCol}${curRow}`);
      const sumRow = ws.getRow(curRow);
      sumRow.height = 23;
      sumRow.getCell(1).value = summaryText;
      sumRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF064E3B' } };
      sumRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= colCount; c++) {
        sumRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        sumRow.getCell(c).border = cellBorder;
      }
      curRow++;
    }

    return downloadWorkbookBuffer(wb, fileName);
  }

  /**
   * Cetak / Ekspor Daftar Hadir ke Excel (.xlsx) menggunakan ExcelJS
   * Lengkap dengan Kop Instansi/Sekolah merge-center, lebar kolom otomatis, border presisi, rekap, & tanda tangan guru.
   */
  async function exportAttendanceExcel({
    kelas,
    tanggal,
    tanggalLabel,
    jam,
    materi,
    jenis,
    statusJadwal,
    records
  }) {
    if (!window.ExcelJS) {
      throw new Error('Library ExcelJS belum siap. Pastikan koneksi internet aktif lalu muat ulang halaman.');
    }

    const rows = Array.isArray(records) ? records : [];
    const cfg = state.data.pengaturan || {};
    const wb = new window.ExcelJS.Workbook();
    wb.creator = cfg.teacherName || 'Bilik Tarbiyah Digital';
    wb.created = new Date();

    const ws = wb.addWorksheet('Daftar Hadir', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 }
      }
    });

    const headerTitles = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Status Kehadiran', 'Catatan'];
    const rawTableRows = rows.map((rec, idx) => {
      const noteText = String(rec.catatan || '').trim();
      const fotoNote = rec.fotoUrl ? `[Foto Selfie: ${rec.fotoUrl}]` : '';
      const combinedNote = [noteText, fotoNote].filter(Boolean).join(' • ') || '-';
      return [
        idx + 1,
        String(rec.nisn || '-'),
        String(rec.nama || ''),
        String(kelas || '-'),
        String(rec.status || 'Belum Absen').trim() || 'Belum Absen',
        combinedNote
      ];
    });
    const colWidths = computeAutoColWidths(headerTitles, rawTableRows, { extraPad: 4, minWidth: 8, maxWidth: 42 });
    colWidths[1] = Math.max(colWidths[1], 15);
    colWidths[4] = Math.max(colWidths[4], 17);
    ws.columns = colWidths.map((w, i) => ({ key: 'c' + i, width: w }));

    const thinSide = { style: 'thin', color: { argb: 'FF1E293B' } };
    const cellBorder = { top: thinSide, left: thinSide, bottom: thinSide, right: thinSide };
    const softBorder = { style: 'thin', color: { argb: 'FFA7F3D0' } };

    // Kop Surat Instansi & Sekolah (Baris 1-6)
    ws.mergeCells('A1:F1');
    const r1 = ws.getRow(1);
    r1.getCell(1).value = String(cfg.namaInstansi || 'PEMERINTAH PROVINSI JAMBI').toUpperCase();
    r1.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r1.height = 19;

    ws.mergeCells('A2:F2');
    const r2 = ws.getRow(2);
    r2.getCell(1).value = String(cfg.schoolName || 'SMAN 20 TEBO').toUpperCase();
    r2.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF064E3B' } };
    r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r2.height = 24;

    const kopContactParts = [
      [cfg.schoolAddress, cfg.schoolCity].filter((x) => x && x !== '-').join(', '),
      cfg.schoolEmail && cfg.schoolEmail !== '-' ? `Email: ${cfg.schoolEmail}` : '',
      cfg.schoolWebsite && cfg.schoolWebsite !== '-' ? `Web: ${cfg.schoolWebsite}` : ''
    ].filter(Boolean);
    ws.mergeCells('A3:F3');
    const r3 = ws.getRow(3);
    r3.getCell(1).value = kopContactParts.join('  •  ') || String(cfg.siteName || 'Bilik Tarbiyah Digital');
    r3.getCell(1).font = { name: 'Calibri', size: 9.5, color: { argb: 'FF475569' } };
    r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 6; c++) {
      r3.getCell(c).border = { bottom: { style: 'medium', color: { argb: 'FF0F172A' } } };
    }
    r3.height = 19;

    ws.mergeCells('A4:F4');
    const r4 = ws.getRow(4);
    r4.getCell(1).value = 'DAFTAR HADIR PESERTA DIDIK';
    r4.getCell(1).font = { name: 'Calibri', size: 13, bold: true, underline: true, color: { argb: 'FF064E3B' } };
    r4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r4.height = 24;

    ws.mergeCells('A5:F5');
    const r5 = ws.getRow(5);
    const metaParts = [
      `Kelas: ${kelas || '-'}`,
      `Tanggal: ${tanggalLabel || tanggal || '-'}`,
      `Jam: ${jam || '-'}`,
      jenis ? `Jenis: ${jenis}` : '',
      statusJadwal ? `Status: ${statusJadwal}` : ''
    ].filter(Boolean);
    r5.getCell(1).value = metaParts.join('   |   ');
    r5.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
    r5.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    r5.height = 20;

    ws.mergeCells('A6:F6');
    const r6 = ws.getRow(6);
    r6.getCell(1).value = `Materi: ${materi || '-'}`;
    r6.getCell(1).font = { name: 'Calibri', size: 10, bold: true, italic: true, color: { argb: 'FF065F46' } };
    r6.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for (let c = 1; c <= 6; c++) {
      r6.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      r6.getCell(c).border = { top: softBorder, left: softBorder, bottom: softBorder, right: softBorder };
    }
    r6.height = 24;

    ws.getRow(7).height = 8;

    // Header Tabel Presensi (Baris 8)
    const headerRow = ws.getRow(8);
    headerRow.height = 25;
    headerTitles.forEach((title, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = title;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = cellBorder;
    });

    const statusColors = {
      hadir: 'FF065F46',
      izin: 'FFB45309',
      sakit: 'FF0369A1',
      alpa: 'FFBE123C',
      'belum absen': 'FF64748B'
    };

    const counts = { 'Belum Absen': 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    rawTableRows.forEach((vals, idx) => {
      const stRaw = vals[4];
      const stLower = stRaw.toLowerCase();
      if (stLower === 'hadir') counts.Hadir++;
      else if (stLower === 'izin') counts.Izin++;
      else if (stLower === 'sakit') counts.Sakit++;
      else if (stLower === 'alpa') counts.Alpa++;
      else counts['Belum Absen']++;

      const rowObj = ws.getRow(9 + idx);
      rowObj.height = estimateRowHeight(vals, colWidths, 21);
      const bgArgb = idx % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

      vals.forEach((val, colIdx) => {
        const cell = rowObj.getCell(colIdx + 1);
        if (colIdx === 1) {
          cell.value = String(val);
          cell.numFmt = '@';
        } else {
          cell.value = val;
        }
        cell.border = cellBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        const isCenter = colIdx === 0 || colIdx === 1 || colIdx === 3 || colIdx === 4;
        cell.alignment = {
          horizontal: isCenter ? 'center' : 'left',
          vertical: 'middle',
          wrapText: true
        };
        if (colIdx === 4) {
          cell.font = {
            name: 'Calibri',
            size: 10.5,
            bold: true,
            color: { argb: statusColors[stLower] || 'FF0F172A' }
          };
        } else {
          cell.font = { name: 'Calibri', size: 10.5, bold: colIdx === 2, color: { argb: 'FF0F172A' } };
        }
      });
    });

    const sumRowIdx = 9 + rawTableRows.length;
    ws.mergeCells(`A${sumRowIdx}:F${sumRowIdx}`);
    const sumRow = ws.getRow(sumRowIdx);
    sumRow.height = 24;
    sumRow.getCell(1).value = `REKAPITULASI KEHADIRAN — Total: ${rawTableRows.length} Siswa   |   Hadir: ${counts.Hadir}   |   Izin: ${counts.Izin}   |   Sakit: ${counts.Sakit}   |   Alpa: ${counts.Alpa}   |   Belum Absen: ${counts['Belum Absen']}`;
    sumRow.getCell(1).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF064E3B' } };
    sumRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 6; c++) {
      sumRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      sumRow.getCell(c).border = cellBorder;
    }

    const sigStart = sumRowIdx + 2;
    ws.mergeCells(`D${sigStart}:F${sigStart}`);
    ws.getRow(sigStart).getCell(4).value = `${cfg.schoolCity || 'Tebo'}, ${tanggalLabel || tanggal || ''}`;
    ws.getRow(sigStart).getCell(4).font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    ws.getRow(sigStart).getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`D${sigStart + 1}:F${sigStart + 1}`);
    ws.getRow(sigStart + 1).getCell(4).value = 'Guru Mata Pelajaran PAI & Budi Pekerti,';
    ws.getRow(sigStart + 1).getCell(4).font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    ws.getRow(sigStart + 1).getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getRow(sigStart + 2).height = 18;
    ws.getRow(sigStart + 3).height = 18;
    ws.getRow(sigStart + 4).height = 14;

    ws.mergeCells(`D${sigStart + 5}:F${sigStart + 5}`);
    const nameCell = ws.getRow(sigStart + 5).getCell(4);
    nameCell.value = cfg.teacherName || 'Guru PAI-BP';
    nameCell.font = { name: 'Calibri', size: 11, bold: true, underline: true, color: { argb: 'FF0F172A' } };
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (cfg.teacherNip) {
      ws.mergeCells(`D${sigStart + 6}:F${sigStart + 6}`);
      const nipCell = ws.getRow(sigStart + 6).getCell(4);
      nipCell.value = `NIP. ${cfg.teacherNip}`;
      nipCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
      nipCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const cleanKelas = String(kelas || 'Kelas').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const cleanTgl = String(tanggal || 'tanggal').replace(/[^0-9-]+/g, '_');
    return downloadWorkbookBuffer(wb, `Daftar_Hadir_${cleanKelas}_${cleanTgl}.xlsx`);
  }

  window.BTD_API = {
    state,
    initFromCache,
    syncFromRemote,
    bootstrap,
    getConfiguredApiUrl,
    setAppsScriptUrl,
    resetDemoData,
    submitEvaluasi: (item) => submitRecord('evaluasi', 'submitEvaluasi', item, 'EVL'),
    submitRuangKritis: (item) => submitRecord('ruangKritis', 'submitRuangKritis', item, 'KRIT'),
    submitAmaliyah: (item) => submitRecord('amaliyah', 'submitAmaliyah', item, 'AML'),
    submitTugas: (item) => submitRecord('tugas', 'submitTugas', item, 'TGS'),
    submitDiskusi: (item) => submitRecord('diskusi', 'submitDiskusi', item, 'DSK'),
    verifyAdmin,
    logoutAdmin,
    isAdminSessionValid,
    verifyStudent,
    logoutStudent,
    isStudentSessionValid,
    changeStudentPassword,
    resetStudentPassword,
    getSessionRemainingText,
    syncStudentPortalData,
    buildAbsensiSelfieFileName,
    submitStudentAbsensi,
    refreshAdminDashboard,
    testConnection,
    setupDatabaseRemote,
    uploadImageMedia,
    uploadAudioMedia,
    saveKelas,
    deleteKelas,
    normalizeNisn,
    validateNisn10,
    findDuplicateNisnStudent,
    saveSiswa,
    deleteSiswa,
    importSiswaBatch,
    saveJadwal,
    deleteJadwal,
    saveAbsensiBatch,
    getScheduleAttendanceSummary,
    saveBanner,
    deleteBanner,
    saveMateri,
    deleteMateri,
    saveTajwid,
    deleteTajwid,
    saveSoal,
    deleteSoal,
    importSoalBatch,
    saveGaleri,
    deleteGaleri,
    gradeRuangKritis,
    gradeTugas,
    gradeAmaliyah,
    gradeEvaluasi,
    getBelajarCategoriesList,
    getBelajarCategoryRuntimeConfig,
    getBelajarTopicsList,
    getBelajarTopicRuntimeConfig,
    saveBelajarConfig,
    submitBelajarKomentar,
    deleteBelajarKomentar,
    getGuruRiwayatList,
    saveGuruRiwayat,
    deleteGuruRiwayat,
    updatePengaturan,
    getAnalytics,
    exportCsv,
    exportTableExcel,
    exportAttendanceExcel
  };
})();
