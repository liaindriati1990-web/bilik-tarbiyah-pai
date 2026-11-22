/**
 * Halaman Ayo Belajar — Laboratorium Praktikum PAI & Fiqih Ibadah Interaktif
 * Standar Arus Utama Kementerian Agama RI (Kemenag RI) & BAZNAS RI.
 * Arsitektur Statis Murni di Frontend:
 * - Tidak menerima atau menulis input bebas ke database server (Read-Only Curriculum)
 * - Dilengkapi Simulator Wudhu, Shalat, Penyelenggaraan Jenazah (Laki/Perempuan),
 *   Simulasi Hitungan Zakat, Alur Manasik Haji/Umrah, serta Contoh Suara & Metronom Tajwid.
 */
window.BTD_PAGES = window.BTD_PAGES || {};

window.BTD_PAGES.belajar = function renderAyoBelajar(container, routeParams = {}) {
  const {
    escapeHtml,
    resolveImageUrl,
    showToast,
    formatDateId,
    containsProfanityOrSpam,
    censorProfanity
  } = window.BTD_UI;
  const api = window.BTD_API;
  const DONE_KEY = 'btd_belajar_done_v1';

  /* -------------------- ENGINE AUDIO QARI MUROTTAL ASLI & METRONOM TAJWID -------------------- */
  let activeAudioCtx = null;
  let activeAudioEl = null;
  let activeTimerIds = [];
  let activeCardId = '';
  let selectedQari = 'Husary_Muallim_128kbps';
  let selectedRate = 1.0;

  const QARI_RECITERS = [
    { id: 'Husary_Muallim_128kbps', label: "Syaikh Al-Husary (Mu'allim Tajwid)" },
    { id: 'Husary_128kbps', label: 'Syaikh Al-Husary (Murattal)' },
    { id: 'Alafasy_128kbps', label: 'Syaikh Mishary Rashid Alafasy' }
  ];

  // Pre-warm daftar suara browser agar suara Arab alami cepat terdeteksi pada klik pertama
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function') {
      window.speechSynthesis.getVoices();
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
          try { window.speechSynthesis.getVoices(); } catch (e) {}
        };
      }
    }
  } catch (e) {
    /* abaikan bila SpeechSynthesis tidak tersedia */
  }

  function resetPlayButtonLabels() {
    container.querySelectorAll('[data-play-tajwid]').forEach((btn) => {
      btn.classList.remove('is-stop');
      btn.innerHTML = (btn.getAttribute && btn.getAttribute('data-default-label')) || '🔊 Putar Suara Qari';
    });
    container.querySelectorAll('[data-play-prayer]').forEach((btn) => {
      btn.classList.remove('is-stop');
      btn.innerHTML = (btn.getAttribute && btn.getAttribute('data-default-label')) || '🔊 Putar Suara Asli';
    });
    const jnzBtn = document.getElementById('btn-jnz-play-audio');
    if (jnzBtn) {
      jnzBtn.classList.remove('is-stop');
      jnzBtn.innerHTML = (jnzBtn.getAttribute && jnzBtn.getAttribute('data-default-label')) || '🔊 Putar Suara Asli';
    }
  }

  function clearAudioTimers() {
    while (activeTimerIds.length) {
      clearTimeout(activeTimerIds.pop());
    }
    if (activeAudioEl) {
      try {
        activeAudioEl.onended = null;
        activeAudioEl.onerror = null;
        activeAudioEl.onplaying = null;
        activeAudioEl.onloadedmetadata = null;
        activeAudioEl.pause();
        activeAudioEl.src = '';
      } catch (e) {
        /* abaikan */
      }
      activeAudioEl = null;
    }
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      /* abaikan bila SpeechSynthesis tidak didukung */
    }
    if (activeCardId) {
      const prevCard = document.getElementById(activeCardId);
      if (prevCard && prevCard.classList) prevCard.classList.remove('is-playing');
      activeCardId = '';
    }
    container.querySelectorAll('.prak-beat-dot.is-lit').forEach((dot) => {
      if (dot.classList) dot.classList.remove('is-lit');
    });
    resetPlayButtonLabels();
  }
  if (typeof window !== 'undefined') {
    window.__btdBelajarStopAudio = clearAudioTimers;
  }

  function pad3(n) {
    return String(Number(n) || 0).padStart(3, '0');
  }

  function buildQariAudioUrls({ surah, ayah, wbwWord }) {
    if (!surah || !ayah) return [];
    const s = pad3(surah);
    const a = pad3(ayah);
    if (wbwWord) {
      const w = pad3(wbwWord);
      return [
        `https://audio.qurancdn.com/wbw/${s}_${a}_${w}.mp3`,
        `https://verses.quran.com/wbw/${s}_${a}_${w}.mp3`,
        `https://everyayah.com/data/${selectedQari}/${s}${a}.mp3`,
        `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`
      ];
    }
    const orderedReciters = [...new Set([
      selectedQari,
      'Husary_Muallim_128kbps',
      'Husary_128kbps',
      'Alafasy_128kbps'
    ])];
    return orderedReciters.map((rec) => `https://everyayah.com/data/${rec}/${s}${a}.mp3`);
  }

  function animateMetronomeDots(pattern = 'clear', cardElId = '', totalMsOverride = 0) {
    if (!cardElId) return;
    const defaultDurMap = {
      clear: [280],
      ghunnah2: [430, 430],
      qalqalah: [240, 210],
      mad2: [420, 420],
      mad5: [360, 360, 360, 360, 360],
      mad6: [350, 350, 350, 350, 350, 350]
    };
    const steps = defaultDurMap[pattern] || defaultDurMap.clear;
    const cardEl = document.getElementById(cardElId);
    const dots = cardEl ? Array.from(cardEl.querySelectorAll('.prak-beat-dot')) : [];
    if (!dots.length) return;

    const totalMs = totalMsOverride > 700 ? totalMsOverride : steps.reduce((a, b) => a + b + 50, 0);
    const stepSpan = Math.max(240, Math.floor((totalMs * 0.72) / dots.length));
    const startDelay = Math.min(280, Math.floor(totalMs * 0.14));

    dots.forEach((_, idx) => {
      const t = setTimeout(() => {
        dots.forEach((d, di) => d.classList.toggle('is-lit', di === idx));
      }, startDelay + idx * stepSpan);
      activeTimerIds.push(t);
    });
  }

  function playMetronomePattern(pattern = 'clear', cardElId = '', silentMode = false) {
    const patternMap = {
      clear: [260],
      ghunnah2: [420, 420],
      qalqalah: [210, 170],
      mad2: [400, 400],
      mad5: [360, 360, 360, 360, 360],
      mad6: [350, 350, 350, 350, 350, 350]
    };
    const steps = patternMap[pattern] || patternMap.clear;

    if (!silentMode) {
      try {
        const AudioCtx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (AudioCtx) {
          if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
            activeAudioCtx = new AudioCtx();
          }
          if (activeAudioCtx.state === 'suspended' && typeof activeAudioCtx.resume === 'function') {
            activeAudioCtx.resume();
          }
          let tOffset = 0.04;
          steps.forEach((durMs, idx) => {
            const osc = activeAudioCtx.createOscillator();
            const gain = activeAudioCtx.createGain();
            const isGhunnah = pattern === 'ghunnah2';
            const isBounce = pattern === 'qalqalah' && idx === 1;
            osc.type = isGhunnah ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(
              isBounce ? 520 : isGhunnah ? 290 : pattern.startsWith('mad') ? 330 : 440,
              activeAudioCtx.currentTime + tOffset
            );
            const durSec = durMs / 1000;
            gain.gain.setValueAtTime(0.001, activeAudioCtx.currentTime + tOffset);
            gain.gain.exponentialRampToValueAtTime(0.11, activeAudioCtx.currentTime + tOffset + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, activeAudioCtx.currentTime + tOffset + durSec - 0.03);
            osc.connect(gain);
            gain.connect(activeAudioCtx.destination);
            osc.start(activeAudioCtx.currentTime + tOffset);
            osc.stop(activeAudioCtx.currentTime + tOffset + durSec);
            tOffset += durSec + 0.05;
          });
        }
      } catch (e) {
        /* audio context opsional */
      }
    }

    if (cardElId) {
      animateMetronomeDots(pattern, cardElId, 0);
      const totalDuration = steps.reduce((a, b) => a + b + 50, 40) + 250;
      const tEnd = setTimeout(() => {
        const cardEl = document.getElementById(cardElId);
        container.querySelectorAll('.prak-beat-dot.is-lit').forEach((d) => d.classList.remove('is-lit'));
        if (cardEl && cardEl.classList) cardEl.classList.remove('is-playing');
        if (activeCardId === cardElId) activeCardId = '';
        resetPlayButtonLabels();
      }, totalDuration);
      activeTimerIds.push(tEnd);
    }
  }

  function normalizeArabicForTts(raw) {
    return String(raw || '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[•|—[\]]+/g, ' ، ')
      .replace(/اللّٰ/g, 'اللَّ')
      .replace(/لِلّٰ/g, 'لِلَّ')
      .replace(/الرَّحْمٰ/g, 'الرَّحْمَ')
      .replace(/الْعٰلَم/g, 'الْعَالَم')
      .replace(/ضُحٰ/g, 'ضُحَا')
      .replace(/هٰذ/g, 'هَذ')
      .replace(/إِلٰه/g, 'إِلَه')
      .replace(/\u0670/g, 'ا')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toAccurateIndonesianPhonetic(spoken) {
    let text = String(spoken || '').trim();
    if (!text) return '';
    return text
      .replace(/•|\|/g, ', ')
      .replace(/\bhallaa\b/gi, 'halloo')
      .replace(/subhaanallaahi/gi, 'subhaanolloohi')
      .replace(/illallaah/gi, 'illollooh')
      .replace(/huwallaahu/gi, 'huwolloohu')
      .replace(/nashrulloohi/gi, 'nashrulloohi')
      .replace(/allaahumma/gi, 'olloohumma')
      .replace(/allahumma/gi, 'olloohumma')
      .replace(/\ballaahu\b/gi, 'olloohu')
      .replace(/\ballahu\b/gi, 'olloohu')
      .replace(/lillaahi/gi, 'lillaahi')
      .replace(/\brahmaan/gi, 'rohmaan')
      .replace(/ar-rahmaan/gi, 'ar rohmaan')
      .replace(/ar-rahiim/gi, 'ar rohiim')
      .replace(/\brabbi/gi, 'robbi')
      .replace(/lirobbika/gi, 'lirobbika')
      .replace(/fardhan/gi, 'fardhon')
      .replace(/\bharaam/gi, 'haroom')
      .replace(/-/g, ' ')
      .replace(/'/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pickBestArabicVoice(voices) {
    const arList = (voices || []).filter((v) => String(v.lang || '').toLowerCase().startsWith('ar'));
    if (!arList.length) return null;
    const score = (v) => {
      const name = String(v.name || '').toLowerCase();
      const lang = String(v.lang || '').toLowerCase();
      let s = 0;
      if (/natural|neural|google|online/.test(name)) s += 50;
      if (/hamed|salma|majed|tariq|zariyah|laila/.test(name)) s += 20;
      if (lang === 'ar-sa') s += 15;
      else if (lang === 'ar-eg') s += 10;
      return s;
    };
    return arList.slice().sort((a, b) => score(b) - score(a))[0];
  }

  let adhkarCatalogPromise = null;

  function resolvePlayableAudioUrl(raw) {
    const clean = String(raw || '').trim();
    if (!clean) return '';
    if (/^audio\/[a-z0-9._-]+\.mp3$/i.test(clean)) return clean;
    if (/^data:audio\/(?:mpeg|mp3|wav|ogg|webm|mp4|aac);base64,/i.test(clean)) return clean;
    if (!/^https?:\/\//i.test(clean)) return '';
    const driveMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=open&id=${driveMatch[1]}`;
    }
    const openMatch = clean.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
    if (openMatch && openMatch[1]) {
      return `https://drive.google.com/uc?export=open&id=${openMatch[1]}`;
    }
    return clean;
  }

  function stripArabicDiacritics(raw) {
    return String(raw || '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\u0621-\u064A\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildAdhkarUrlCandidates(relPath) {
    const clean = String(relPath || '').trim();
    if (!clean) return [];
    const norm = clean.startsWith('/') ? clean : '/' + clean;
    return [
      `https://cdn.jsdelivr.net/gh/rn0x/Adhkar-json@main${norm}`,
      `https://raw.githubusercontent.com/rn0x/Adhkar-json/main${norm}`
    ];
  }

  function loadAdhkarCatalog() {
    if (adhkarCatalogPromise) return adhkarCatalogPromise;
    if (typeof fetch !== 'function') return Promise.resolve([]);
    const sources = [
      'https://cdn.jsdelivr.net/gh/rn0x/Adhkar-json@main/adhkar.json',
      'https://raw.githubusercontent.com/rn0x/Adhkar-json/main/adhkar.json'
    ];
    adhkarCatalogPromise = (async () => {
      for (let i = 0; i < sources.length; i++) {
        try {
          const res = await fetch(sources[i], { cache: 'force-cache' });
          if (res && res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) return json;
          }
        } catch (err) {
          /* coba mirror CDN berikutnya */
        }
      }
      return [];
    })();
    return adhkarCatalogPromise;
  }

  async function resolveHisnulMuslimUrls(hisnMatch) {
    if (!hisnMatch) return [];
    const urls = [];
    const addPath = (p) => {
      buildAdhkarUrlCandidates(p).forEach((u) => {
        if (!urls.includes(u)) urls.push(u);
      });
    };
    const catNeedles = (hisnMatch.catNeedles || []).map(stripArabicDiacritics).filter(Boolean);
    const textNeedles = (hisnMatch.textNeedles || []).map(stripArabicDiacritics).filter(Boolean);

    try {
      const catalog = await loadAdhkarCatalog();
      if (Array.isArray(catalog) && catalog.length) {
        const matchedCats = catalog.filter((entry) => {
          const catNorm = stripArabicDiacritics(entry && entry.category);
          return catNeedles.some((cn) => catNorm.includes(cn));
        });
        const searchPool = matchedCats.length ? matchedCats : catalog;
        for (let i = 0; i < searchPool.length; i++) {
          const catEntry = searchPool[i];
          const items = Array.isArray(catEntry && catEntry.array) ? catEntry.array : [];
          for (let j = 0; j < items.length; j++) {
            const txtNorm = stripArabicDiacritics(items[j] && items[j].text);
            if (items[j] && items[j].audio && textNeedles.some((tn) => txtNorm.includes(tn))) {
              addPath(items[j].audio);
            }
          }
          if (matchedCats.length && catEntry.audio) {
            addPath(catEntry.audio);
          }
        }
      }
    } catch (err) {
      /* fallback ke path bawaan jika katalog gagal */
    }

    (hisnMatch.fallbackPaths || []).forEach(addPath);
    return urls;
  }

  function playTtsFallback({ textArab, pattern = 'clear', cardElId = '' }) {
    let spokeArabic = false;
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      const Utter = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null;
      if (synth && Utter && typeof synth.speak === 'function') {
        const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : [];
        const arVoice = pickBestArabicVoice(voices);
        const cleanArab = normalizeArabicForTts(textArab);
        if (arVoice && cleanArab) {
          const u = new Utter(cleanArab);
          u.voice = arVoice;
          u.lang = arVoice.lang || 'ar-SA';
          u.rate = selectedRate === 0.85 ? 0.72 : 0.82;
          u.onend = () => {
            if (activeCardId === cardElId) clearAudioTimers();
          };
          u.onerror = () => {
            if (activeCardId === cardElId) clearAudioTimers();
          };
          synth.speak(u);
          spokeArabic = true;
        }
      }
    } catch (e) {
      /* abaikan bila SpeechSynthesis tidak tersedia */
    }

    if (spokeArabic) {
      playMetronomePattern(pattern, cardElId, true);
      if (showToast) {
        showToast('Memutar pelafalan suara Arab bawaan perangkat.');
      }
      return;
    }

    clearAudioTimers();
    if (showToast) {
      showToast(
        'Audio suara manusia untuk lafal Niat ini belum direkam Guru. Admin dapat merekam atau mengunggah MP3 asli di Panel Guru → Ayo Belajar.',
        'warning'
      );
    }
  }

  function streamAudioUrlsChain(urls, { textArab, pattern, cardElId, successLabel }) {
    if (!urls.length || typeof window === 'undefined' || typeof window.Audio !== 'function') {
      playTtsFallback({ textArab, pattern, cardElId });
      return;
    }
    let urlIdx = 0;
    const playNextUrl = () => {
      if (urlIdx >= urls.length) {
        activeAudioEl = null;
        if (showToast) {
          showToast('Gagal memuat audio MP3 online (periksa koneksi internet).', 'warning');
        }
        playTtsFallback({ textArab, pattern, cardElId });
        return;
      }
      const url = urls[urlIdx++];
      const audio = new window.Audio(url);
      audio.preload = 'auto';
      audio.preservesPitch = true;
      audio.playbackRate = selectedRate;
      activeAudioEl = audio;

      audio.onloadedmetadata = () => {
        if (activeAudioEl !== audio) return;
        audio.playbackRate = selectedRate;
        const durMs = Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.round((audio.duration / Math.max(0.5, selectedRate)) * 1000)
          : 2800;
        animateMetronomeDots(pattern, cardElId, durMs);
      };
      audio.onplaying = () => {
        if (activeAudioEl !== audio) return;
        audio.playbackRate = selectedRate;
      };
      audio.onended = () => {
        if (activeAudioEl !== audio) return;
        clearAudioTimers();
      };
      audio.onerror = () => {
        if (activeAudioEl !== audio) return;
        playNextUrl();
      };

      try {
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (activeAudioEl === audio && showToast && successLabel) {
              showToast(successLabel);
            }
          }).catch((err) => {
            if (activeAudioEl !== audio) return;
            if (err && err.name === 'AbortError') return;
            playNextUrl();
          });
        }
      } catch (err) {
        if (activeAudioEl === audio) playNextUrl();
      }
    };
    playNextUrl();
  }

  function playArabicOrTajwid({
    textArab,
    pattern = 'clear',
    cardElId = '',
    surah = 0,
    ayah = 0,
    wbwWord = 0,
    quranRef = '',
    customAudioUrl = '',
    hisnMatch = null,
    localAudioUrl = '',
    reciterLabel = '',
    triggerBtn = null
  }) {
    if (cardElId && activeCardId === cardElId) {
      clearAudioTimers();
      return;
    }
    clearAudioTimers();
    if (cardElId) {
      const card = document.getElementById(cardElId);
      if (card && card.classList) card.classList.add('is-playing');
      activeCardId = cardElId;
    }
    if (triggerBtn) {
      triggerBtn.classList.add('is-stop');
      triggerBtn.innerHTML = '⏹ Hentikan';
    }

    const customSrc = resolvePlayableAudioUrl(customAudioUrl);
    if (customSrc) {
      streamAudioUrlsChain([customSrc], {
        textArab,
        pattern,
        cardElId,
        successLabel: '🎙️ Memutar rekaman suara asli Guru / Ustadz.'
      });
      return;
    }

    const qariUrls = buildQariAudioUrls({ surah, ayah, wbwWord });
    if (qariUrls.length) {
      const recMeta = QARI_RECITERS.find((r) => r.id === selectedQari);
      const recName = recMeta ? recMeta.label : 'Qari Standar';
      streamAudioUrlsChain(qariUrls, {
        textArab,
        pattern,
        cardElId,
        successLabel: `🎙️ Memutar suara asli ${recName}${quranRef ? ` (${quranRef})` : ''} — kecepatan ${selectedRate}×.`
      });
      return;
    }

    if (hisnMatch) {
      const tokenCard = cardElId || 'hisn-active';
      if (triggerBtn) triggerBtn.innerHTML = '<span class="spinner-inline"></span> Memuat Audio...';
      resolveHisnulMuslimUrls(hisnMatch).then((hisnUrls) => {
        if (cardElId && activeCardId !== cardElId) return;
        if (triggerBtn) {
          triggerBtn.classList.add('is-stop');
          triggerBtn.innerHTML = '⏹ Hentikan';
        }
        streamAudioUrlsChain(hisnUrls, {
          textArab,
          pattern,
          cardElId: tokenCard === 'hisn-active' ? cardElId : tokenCard,
          successLabel: `🎙️ Memutar bacaan suara asli ${reciterLabel || 'Syaikh Hamad Al-Duraikhim (Hisnul Muslim)'}.`
        });
      });
      return;
    }

    const localSrc = resolvePlayableAudioUrl(localAudioUrl);
    if (localSrc) {
      streamAudioUrlsChain([localSrc], {
        textArab,
        pattern,
        cardElId,
        successLabel: '🔊 Memutar audio bacaan Arab otomatis (Suara Hamed).'
      });
      return;
    }

    playTtsFallback({ textArab, pattern, cardElId });
  }

  /* -------------------- KURIKULUM PRAKTIKUM STANDAR KEMENAG RI -------------------- */
  const CATEGORIES = Object.freeze([
    {
      id: 'thaharah',
      icon: '💧',
      tone: 'tone-sky',
      tagClass: 'tag-sky',
      title: 'Thaharah & Bersuci',
      subtitle: 'Kunci sahnya ibadah: praktik wudhu, tayamum darurat, dan mandi wajib sesuai standar Kemenag RI.',
      dalil: 'QS. Al-Ma\'idah: 6 — Perintah berwudhu, mandi wajib, serta keringanan bertayamum dengan tanah suci.',
      refKemenag: 'Buku Siswa PAI-BP Kemdikbud–Kemenag RI & Pedoman Fikih Ibadah Ditjen Bimas Islam Kemenag RI',
      topics: [
        {
          id: 'thaharah-wudhu',
          badge: 'Fardhu Sebelum Shalat',
          title: 'Praktikum Wudhu Lengkap',
          summary: 'Membersihkan anggota wudhu tertentu menggunakan air suci lagi menyucikan (air mutlak) dengan tertib dan niat ikhlas karena Allah Swt.',
          dalil: 'QS. Al-Ma\'idah: 6 & HR. Muslim: "Tidak diterima shalat tanpa bersuci (wudhu)."',
          refKemenag: 'Buku PAI-BP Kurikulum Merdeka Kemenag RI (Bab Thaharah)',
          stepperTitle: '🔬 Simulasi Langkah Praktik Wudhu Interaktif',
          quiz: {
            title: 'Uji Pemahaman Sah atau Batal Wudhu',
            question: 'Siti tertidur sebentar dalam posisi duduk tegak rapat menempel di lantai saat menunggu adzan Isya. Apakah wudhu Siti batal menurut standar fikih Kemenag?',
            options: [
              { text: 'Batal, karena semua tidur otomatis membatalkan wudhu.', correct: false },
              { text: 'Tidak batal, karena tidur dalam keadaan duduk tegak rapat menjaga lubang keluar angin.', correct: true },
              { text: 'Harus diulang membasuh wajah saja tanpa mengulang kaki.', correct: false }
            ],
            explain: 'Dalam tuntunan fikih standar Kemenag (mazhab Syafi\'i), tidur yang membatalkan wudhu adalah tidur nyenyak dengan posisi tidak duduk tegak (misal berbaring). Tidur sejenak duduk rapat tidak membatalkan.'
          },
          syaratRukun: {
            syaratTitle: 'Syarat Sah Wudhu',
            syarat: [
              'Beragama Islam, mumayyiz, dan menggunakan air suci lagi menyucikan (mutlak).',
              'Tidak ada benda penghalang sampainya air ke kulit (lem tebal, cat minyak, kuteks tahan air).',
              'Tidak berhadas besar dan memastikan air mengalir membasahi anggota wajib.'
            ],
            rukunTitle: '6 Fardhu (Rukun) Wudhu',
            rukun: [
              '1. Niat bersamaan saat membasuh wajah (Fardhu Qalbi).',
              '2. Membasuh seluruh wajah merata (ujung dahi hingga dagu, telinga kanan ke kiri).',
              '3. Membasuh kedua tangan hingga melewati kedua siku.',
              '4. Mengusap sebagian kepala (minimal sebagian rambut/kulit kepala).',
              '5. Membasuh kedua kaki hingga melewati kedua mata kaki.',
              '6. Tertib — dilaksanakan berurutan sesuai nomor 1–5 di atas.'
            ]
          },
          prayers: [
            {
              label: 'Niat Wudhu',
              arab: 'نَوَيْتُ الْوُضُوْءَ لِرَفْعِ الْحَدَثِ الْاَصْغَرِ فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitul wudhuu-a liraf\'il hadatsil ashghari fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat berwudhu untuk menghilangkan hadas kecil fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-wudhu.mp3',
              spoken: 'Nawaitul wudhuu-a liraf\'il hadatsil ashghari fardhan lillaahi ta\'aalaa'
            },
            {
              label: 'Doa Setelah Wudhu',
              arab: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ، اللّٰهُمَّ اجْعَلْنِيْ مِنَ التَّوَّابِيْنَ وَاجْعَلْنِيْ مِنَ الْمُتَطَهِّرِيْنَ',
              latin: 'Asyhadu allaa ilaaha illallaahu wahdahu laa syariika lahu wa asyhadu anna Muhammadan \'abduhu wa rasuuluh. Allaahummaj\'alnii minat-tawwaabiina waj\'alnii minal mutathahhiriin.',
              arti: 'Aku bersaksi tiada Tuhan selain Allah Yang Esa dan Muhammad hamba serta utusan-Nya. Ya Allah, jadikanlah aku termasuk orang yang bertaubat dan bersuci.',
              hisnMatch: { catNeedles: ['بعد الفراغ من الوضوء'], textNeedles: ['أشهد أن لا إله', 'التوابين'], fallbackPaths: ['/audio/ar_7esn_AlMoslem_by_Doors_010.mp3'] },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            }
          ],
          steps: [
            { title: 'Membaca Basmalah & Mencuci Telapak Tangan (Sunnah)', desc: 'Baca Bismillahirrahmanirrahim lalu basuh kedua telapak tangan sampai sela-sela jari 3 kali.' },
            { title: 'Berkumur & Membersihkan Lubang Hidung (Sunnah)', desc: 'Kumur-kumur (madhmadhah) 3 kali dan basuh lubang hidung (istinsyaq-istintsar) secara lembut 3 kali.' },
            { title: 'Niat & Membasuh Seluruh Wajah (Rukun)', desc: 'Hadirkan niat wudhu di hati sambil membasuh seluruh wajah dari tempat tumbuh rambut dahi hingga bawah dagu dan antara kedua telinga (3 kali).' },
            { title: 'Membasuh Kedua Tangan Sampai Siku (Rukun)', desc: 'Basuh tangan kanan dari ujung jari melewati siku 3 kali, lalu tangan kiri 3 kali.' },
            { title: 'Mengusap Kepala (Rukun) & Kedua Telinga (Sunnah)', desc: 'Usap kepala dengan tangan basah dari depan ke belakang lalu kembali, kemudian usap daun telinga luar dan dalam.' },
            { title: 'Membasuh Kaki Sampai Mata Kaki (Rukun)', desc: 'Basuh kaki kanan terlebih dahulu hingga di atas mata kaki termasuk sela jari kaki 3 kali, dilanjutkan kaki kiri 3 kali.' },
            { title: 'Tertib & Membaca Doa Menghadap Kiblat', desc: 'Pastikan seluruh rukun berurutan tanpa terlewat, lalu baca doa setelah wudhu.' }
          ],
          warnings: [
            'Keluar sesuatu dari qubul atau dubur (kentut, kencing, atau buang air besar).',
            'Hilang akal karena tidur nyenyak (berbaring/tidak tetap pantatnya), pingsan, atau mabuk.',
            'Menyentuh kemaluan langsung dengan telapak tangan bagian dalam tanpa penghalang.'
          ]
        },
        {
          id: 'thaharah-tayamum',
          badge: 'Rukhshah Darurat',
          title: 'Praktikum Tayamum',
          summary: 'Bersuci pengganti wudhu atau mandi wajib menggunakan debu/tanah suci yang kering ketika benar-benar ketiadaan air atau dilarang kena air karena sakit.',
          dalil: 'QS. An-Nisa\': 43 — Jika kamu tidak memperoleh air maka bertayamumlah dengan tanah yang baik (suci).',
          refKemenag: 'Tuntunan Fikih Thaharah Ditjen Pendis Kemenag RI',
          stepperTitle: '🔬 Simulasi Praktik Tayamum 5 Langkah',
          quiz: {
            title: 'Uji Praktik Tayamum',
            question: 'Berapa kali kita wajib menepukkan telapak tangan ke debu suci untuk satu kali bertayamum?',
            options: [
              { text: '3 kali tepukan: wajah, siku, dan kaki.', correct: false },
              { text: '2 kali tepukan suci (1 untuk mengusap wajah, 1 untuk kedua tangan; kaki tidak diusap).', correct: true },
              { text: '1 kali tepukan lalu langsung dipakai sepanjang minggu.', correct: false }
            ],
            explain: 'Anggota tayamum hanyalah WAJAH dan KEDUA TANGAN (sampai pergelangan atau siku). Kaki dan rambut kepala tidak diusap saat bertayamum.'
          },
          syaratRukun: {
            syaratTitle: 'Syarat Diperbolehkannya Tayamum',
            syarat: [
              'Sudah berupaya mencari air tetapi tidak ada, atau air tersedia hanya mencukupi kebutuhan minum.',
              'Terhalang sakit berbahaya jika terkena air berdasarkan keterangan tenaga medis.',
              'Sudah masuk waktu shalat fardhu yang akan dilaksanakan.'
            ],
            rukunTitle: '4 Rukun Tayamum',
            rukun: [
              '1. Niat bertayamum karena Allah Swt.',
              '2. Mengusap wajah dengan debu suci.',
              '3. Mengusap kedua tangan (hingga pergelangan/siku).',
              '4. Tertib mendahulukan wajah sebelum kedua tangan.'
            ]
          },
          prayers: [
            {
              label: 'Niat Tayamum',
              arab: 'نَوَيْتُ التَّيَمُّمَ لِاسْتِبَاحَةِ الصَّلَاةِ فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitut-tayammuma listibaahatish-shalaati fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat bertayamum agar diperbolehkan mengerjakan shalat fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-tayamum.mp3',
              spoken: 'Nawaitut tayammuma listibaahatish shalaati fardhan lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Cari Permukaan Berdebu Suci & Kering', desc: 'Pastikan debu/tanah suci bebas najis. Baca Basmalah sebelum memulai.' },
            { title: 'Tepuk Kedua Telapak Tangan Pertama & Tipiskan Debu', desc: 'Letakkan kedua telapak tangan pada debu lalu tepukkan/tiup lembut agar debu kasar tidak menebal di wajah.' },
            { title: 'Niat & Usap Seluruh Wajah Satu Kali Merata', desc: 'Usapkan ke seluruh area wajah cukup 1 kali usapan menyeluruh.' },
            { title: 'Tepuk Telapak Tangan Kedua di Titik Debu Berbeda', desc: 'Ambil debu suci di bagian bersih lain untuk kedua tangan.' },
            { title: 'Usapkan ke Punggung & Sisi Tangan Kanan lalu Kiri', desc: 'Usap punggung tangan kanan menggunakan tangan kiri hingga siku/pergelangan, dilanjutkan tangan kiri.' }
          ],
          warnings: [
            'Semua hal yang membatalkan wudhu otomatis membatalkan tayamum.',
            'Menemukan air dan sanggup memakainya sebelum shalat dimulai menggugurkan tayamum.'
          ]
        },
        {
          id: 'thaharah-mandi',
          badge: 'Hadas Besar',
          title: 'Praktikum Mandi Wajib (Janabah/Haid)',
          summary: 'Mengguyurkan air suci menyucikan ke seluruh permukaan tubuh mulai pangkal rambut hingga ujung kaki dengan niat mengangkat hadas besar.',
          dalil: 'QS. Al-Ma\'idah: 6 — Apabila kamu junub maka mandilah (bersucilah seluruh tubuh).',
          refKemenag: 'Buku Siswa PAI-BP Kemenag RI (Bab Mandi Wajib & Thaharah)',
          stepperTitle: '🔬 Simulasi Urutan Mandi Wajib',
          syaratRukun: {
            syaratTitle: 'Sebab-Sebab Mandi Wajib',
            syarat: [
              'Keluar air mani (mimpi basah / disengaja) bagi laki-laki maupun perempuan.',
              'Berhentinya darah haid atau nifas pada perempuan.',
              'Hubungan suami istri serta wafat (jenazah dimandikan).'
            ],
            rukunTitle: '2 Rukun Mandi Wajib',
            rukun: [
              '1. Niat menghilangkan hadas besar tepat saat air pertama mengenai tubuh.',
              '2. Meratakan air suci ke seluruh kulit, rambut, dan lipatan tubuh.'
            ]
          },
          prayers: [
            {
              label: 'Niat Mandi Wajib Janabah',
              arab: 'نَوَيْتُ الْغُسْلَ لِرَفْعِ الْحَدَثِ الْاَكْبَرِ فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitul ghusla liraf\'il hadatsil akbari fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat mandi wajib untuk menghilangkan hadas besar fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-mandi-janabah.mp3',
              spoken: 'Nawaitul ghusla liraf\'il hadatsil akbari fardhan lillaahi ta\'aalaa'
            },
            {
              label: 'Niat Mandi Wajib Setelah Haid',
              arab: 'نَوَيْتُ الْغُسْلَ لِرَفْعِ حَدَثِ الْحَيْضِ فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitul ghusla liraf\'i hadatsil haidhi fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat mandi wajib untuk menghilangkan hadas haid fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-mandi-haid.mp3',
              spoken: 'Nawaitul ghusla liraf\'i hadatsil haidhi fardhan lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Cuci Kedua Tangan & Bersihkan Area Kotoran', desc: 'Basuh kedua tangan 3 kali lalu bersihkan najis/kotoran yang menempel dengan tangan kiri.' },
            { title: 'Berwudhu Sempurna Sebelum Mengguyur Badan', desc: 'Wudhu sebagaimana wudhu shalat sebagai sunnah mu\'akkad.' },
            { title: 'Niat & Basahi Pangkal Rambut Kepala (3 Kali)', desc: 'Sela-selai rambut dengan jari hingga air menyentuh kulit kepala baru siram kepala 3 kali.' },
            { title: 'Guyur Seluruh Tubuh Mulai Bagian Kanan lalu Kiri', desc: 'Pastikan ketiak, pusar, belakang lutut, daun telinga, dan sela jari kaki ikut terbasuh merata.' }
          ],
          warnings: [
            'Rambut yang diikat ketat wajib dilepas agar air sampai ke pangkal kulit kepala.',
            'Pastikan tidak ada cat/penghalang air pada kulit atau kuku.'
          ]
        }
      ]
    },
    {
      id: 'shalat',
      icon: '🕌',
      tone: 'tone-emerald',
      tagClass: 'tag-emerald',
      title: 'Shalat Wajib & Sunnah',
      subtitle: 'Panduan lengkap shalat fardhu 5 waktu beserta berbagai shalat sunnah, doa Arab-latin, dan simulator gerakan shalat.',
      dalil: 'HR. Tirmidzi: Amalan yang pertama kali dihisab pada hari kiamat adalah shalat.',
      refKemenag: 'Tuntunan Shalat Lengkap Direktorat Urusan Agama Islam & Pembinaan Syariah Kemenag RI',
      topics: [
        {
          id: 'shalat-fardhu',
          badge: 'Wajib 5 Waktu',
          title: 'Shalat Fardhu 5 Waktu',
          summary: 'Tiang agama yang wajib dilaksanakan 5 waktu sehari semalam: Subuh (2 rakaat), Dzuhur (4), Ashar (4), Maghrib (3), dan Isya (4).',
          dalil: 'QS. Al-Baqarah: 43 — Dirikanlah shalat, tunaikanlah zakat, dan rukuklah beserta orang-orang yang rukuk.',
          refKemenag: 'Tuntunan Shalat Lengkap Kemenag RI & Buku PAI-BP Kurikulum Merdeka',
          stepperTitle: '🕌 Simulator Gerakan & Bacaan Shalat Interaktif (Klik Langkah Demi Langkah)',
          quiz: {
            title: 'Uji Pemahaman Rukun Shalat',
            question: 'Manakah yang merupakan RUKUN qauli/fi\'li yang jika tertinggal sengaja membuat shalat tidak sah menurut Kemenag RI?',
            options: [
              { text: 'Membaca doa iftitah dan qunut.', correct: false },
              { text: 'Membaca Al-Fatihah, Rukuk dengan thuma\'ninah, Sujud dengan thuma\'ninah, dan Salam pertama.', correct: true },
              { text: 'Membaca surat pendek setelah Al-Fatihah pada rakaat pertama.', correct: false }
            ],
            explain: 'Doa iftitah dan surat pendek sesudah Al-Fatihah berhukum SUNNAH, sedangkan Al-Fatihah, Rukuk + Thuma\'ninah, Sujud + Thuma\'ninah, dan Salam pertama termasuk 13 RUKUN SHALAT.'
          },
          syaratRukun: {
            syaratTitle: 'Syarat Wajib & Sah Shalat',
            syarat: [
              'Islam, baligh, berakal sehat, serta telah masuk waktu shalat.',
              'Suci dari hadas kecil/besar dan najis pada badan, pakaian, dan tempat shalat.',
              'Menutup aurat (laki-laki: pusar–lutut; perempuan: seluruh badan kecuali wajah & telapak tangan) dan menghadap kiblat.'
            ],
            rukunTitle: '13 Rukun Shalat Standar Kemenag RI',
            rukun: [
              '1. Niat • 2. Berdiri (bagi yang mampu) • 3. Takbiratul Ihram • 4. Membaca Al-Fatihah.',
              '5. Rukuk + Thuma\'ninah • 6. I\'tidal + Thuma\'ninah • 7. Sujud + Thuma\'ninah.',
              '8. Duduk antara dua sujud + Thuma\'ninah • 9. Duduk Tasyahud Akhir.',
              '10. Membaca Tasyahud Akhir • 11. Shalawat Nabi di Tasyahud Akhir • 12. Salam Pertama • 13. Tertib.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Dzuhur (Sesuaikan Nama Waktu & Rakaat)',
              arab: 'أُصَلِّيْ فَرْضَ الظُّهْرِ أَرْبَعَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ أَدَاءً لِلّٰهِ تَعَالَى',
              latin: 'Ushallii fardhadh-dzuhri arba\'a raka\'aatin mustaqbilal qiblati adaa-an (imaaman / ma\'muuman) lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat fardhu Dzuhur empat rakaat menghadap kiblat tunai karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-shalat-dzuhur.mp3',
              spoken: 'Ushallii fardhadh dzuhri arba\'a raka\'aatin mustaqbilal qiblati adaa-an lillaahi ta\'aalaa'
            },
            {
              label: 'Bacaan Rukuk, I\'tidal, Sujud & Duduk Antara Dua Sujud',
              arab: 'سُبْحَانَ رَبِّيَ الْعَظِيْمِ وَبِحَمْدِهِ (ركوع)  |  سُبْحَانَ رَبِّيَ الْأَعْلَى وَبِحَمْدِهِ (سجود)',
              latin: 'Rukuk: Subhaana rabbiyal \'azhiimi wa bihamdih (3x). I\'tidal: Sami\'allaahu liman hamidah, Rabbanaa lakal hamdu... Sujud: Subhaana rabbiyal a\'laa wa bihamdih (3x). Duduk: Rabbighfirlii warhamnii wajburnii warfa\'nii warzuqnii wahdinii wa \'aafinii wa\'fu \'annii.',
              arti: 'Maha Suci Tuhanku Yang Maha Agung/Tinggi beserta pujian-Nya; Ya Allah ampuni dan rahmatilah aku.',
              hisnMatch: { catNeedles: ['دعاء الركوع'], textNeedles: ['سبحان ربي العظيم'] },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            }
          ],
          steps: [
            { title: '1. Berdiri Tegak, Niat & Takbiratul Ihram', desc: 'Pandangan ke tempat sujud, angkat kedua tangan sejajar bahu/telinga mengucap "Allahu Akbar" sambil berniat di dalam hati, lalu bersedekap di antara dada dan pusar.' },
            { title: '2. Doa Iftitah & Membaca Surat Al-Fatihah (Rukun)', desc: 'Baca doa Iftitah (sunnah, mis. "Allaahu akbar kabiiraa..." atau "Allaahumma baa\'id..."), lalu wajib membaca QS. Al-Fatihah beserta Basmalah dengan tartil, dilanjut surat pendek (rakaat 1 & 2).' },
            { title: '3. Rukuk dengan Thuma\'ninah (Rukun)', desc: 'Bungkukkan punggung lurus 90°, kedua telapak tangan menggenggam lutut, diam sejenak sambil membaca "Subhaana rabbiyal \'azhiimi wa bihamdih" 3 kali.' },
            { title: '4. I\'tidal dengan Thuma\'ninah (Rukun)', desc: 'Bangkit berdiri tegak seraya mengangkat tangan ("Sami\'allaahu liman hamidah"), setelah tegak membaca "Rabbanaa lakal hamdu..." dengan tenang.' },
            { title: '5. Sujud Pertama dengan 7 Anggota Sujud (Rukun)', desc: 'Tempelkan dahi beserta hidung, 2 telapak tangan, 2 lutut, dan 2 ujung jari kaki ke lantai, baca "Subhaana rabbiyal a\'laa wa bihamdih" 3 kali.' },
            { title: '6. Duduk Antara Dua Sujud & Sujud Kedua (Rukun)', desc: 'Duduk iftirasy tenang membaca "Rabbighfirlii warhamnii wajburnii...", lalu sujud kedua seperti sujud pertama.' },
            { title: '7. Tasyahud Awal (Rakaat ke-2) & Tasyahud Akhir (Rukun)', desc: 'Pada rakaat terakhir duduk tawarruk, membaca Attahiyyaatul mubaarakaatush-shalawaatu..., lalu Shalawat Ibrahimiyyah "Allaahumma shalli \'alaa Muhammad...".' },
            { title: '8. Salam Menoleh ke Kanan & Kiri (Rukun)', desc: 'Akhiri shalat dengan menoleh ke kanan mengucap "Assalaamu \'alaikum wa rahmatullaah" (rukun), lalu ke kiri (sunnah).' }
          ],
          warnings: [
            'Membaca niat dalam hati hukumnya Rukun, melafalkan dengan lisan (ushalli) bertujuan membantu kekhusyukan hati.',
            'Tidak menjaga thuma\'ninah (tenang sejenak setiap perpindahan gerakan) membuat shalat tidak sah.'
          ]
        },
        {
          id: 'shalat-jumat',
          badge: 'Wajib Laki-laki',
          title: 'Shalat Jumat & Dua Khutbah',
          summary: 'Shalat wajib 2 rakaat berjamaah pada waktu Dzuhur hari Jumat didahului dua khutbah bagi muslim laki-laki yang menetap dan sehat.',
          dalil: 'QS. Al-Jumu\'ah: 9 — Apabila diseru untuk menunaikan shalat pada hari Jumat maka bersegeralah mengingat Allah dan tinggalkan jual beli.',
          refKemenag: 'Buku PAI-BP Kurikulum Merdeka Kemenag RI (Shalat Jumat)',
          syaratRukun: {
            syaratTitle: 'Syarat Wajib & Sah Jumat',
            syarat: [
              'Laki-laki muslim, merdeka, baligh, berakal, sehat, dan mukim (bukan musafir).',
              'Dilakukan pada waktu Dzuhur secara berjamaah di masjid/area permukiman.',
              'Didahului dua khutbah yang memenuhi 5 rukun khutbah.'
            ],
            rukunTitle: '5 Rukun Dua Khutbah Jumat',
            rukun: [
              '1. Memuji Allah (Alhamdulillah) di kedua khutbah.',
              '2. Membaca shalawat Nabi saw di kedua khutbah.',
              '3. Wasiat ketakwaan kepada Allah di kedua khutbah.',
              '4. Membaca minimal 1 ayat suci Al-Qur\'an di salah satu khutbah.',
              '5. Berdoa untuk kaum muslimin pada khutbah kedua.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Jumat (Makmum)',
              arab: 'أُصَلِّيْ فَرْضَ الْجُمُعَةِ رَكْعَتَيْنِ مُسْتَقْبِلَ الْقِبْلَةِ أَدَاءً مَأْمُوْمًا لِلّٰهِ تَعَالَى',
              latin: 'Ushallii fardhal jum\'ati rak\'ataini mustaqbilal qiblati adaa-an ma\'muuman lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat fardhu Jumat dua rakaat sebagai makmum karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-shalat-jumat.mp3',
              spoken: 'Ushallii fardhal jum\'ati rak\'ataini ma\'muuman lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Mandi Sunnah Jumat, Berpakaian Bersih & Datang Awal', desc: 'Sunnah memakai baju putih bersih, wewangian (laki-laki), dan memperbanyak membaca QS. Al-Kahfi.' },
            { title: 'Shalat Tahiyyatul Masjid 2 Rakaat Lalu Simak Khutbah', desc: 'Saat khatib naik mimbar dan berkhutbah, wajib tenang memperhatikan tanpa berbincang atau membuka HP.' },
            { title: 'Menunaikan Shalat Jumat 2 Rakaat Berjamaah', desc: 'Imam membaca Al-Fatihah dan surat dengan suara nyaring (jahr), ditutup salam dan dzikir.' }
          ],
          warnings: ['Menyela khutbah dengan mengobrol atau membiarkan diri sibuk dengan ponsel menghilangkan keutamaan pahala Jumat.']
        },
        {
          id: 'shalat-dhuha',
          badge: 'Sunnah Pagi',
          title: 'Shalat Dhuha',
          summary: 'Shalat sunnah di waktu pagi setelah matahari naik sepenggalah (± pukul 07.00 WIB) hingga sebelum tergelincir matahari (Dzuhur).',
          dalil: 'HR. Muslim: Setiap pagi setiap persendian tubuh wajib bersedekah, dan semuanya tercukupi dengan dua rakaat shalat Dhuha.',
          refKemenag: 'Kumpulan Shalat Sunnah & Doa Resmi Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Waktu & Rakaat',
            syarat: [
              'Waktu mulai ±15–20 menit sesudah matahari terbit sampai menjelang masuk waktu Dzuhur.',
              'Minimal 2 rakaat, dapat dikerjakan 4, 6, 8, hingga 12 rakaat (setiap 2 rakaat 1 salam).'
            ],
            rukunTitle: 'Anjuran Surat & Amalan',
            rukun: [
              'Rakaat 1 dianjurkan membaca QS. Asy-Syams atau Al-Kafirun; Rakaat 2 membaca QS. Ad-Dhuha atau Al-Ikhlas.',
              'Tutup dengan membaca doa Dhuha memohon berkah ilmu, rezeki halal, dan perlindungan.'
            ]
          },
          prayers: [
            {
              label: 'Niat & Doa Populer Shalat Dhuha',
              arab: 'أُصَلِّيْ سُنَّةَ الضُّحَى رَكْعَتَيْنِ لِلّٰهِ تَعَالَى  |  اللّٰهُمَّ إِنَّ الضُّحَاءَ ضُحَاؤُكَ وَالْبَهَاءَ بَهَاؤُكَ...',
              latin: 'Ushallii sunnatadh-dhuhaa rak\'ataini lillaahi ta\'aalaa. Doa: Allaahumma innadh-dhuhaa-a dhuhaa-uka wal bahaa-a bahaa-uka wal jamaala jamaaluka wal quwwata quwwatuka...',
              arti: 'Saya niat shalat sunnah Dhuha dua rakaat karena Allah Ta\'ala. Ya Allah sesungguhnya waktu Dhuha adalah Dhuha-Mu...',
              audioUrl: 'audio/niat-doa-dhuha.mp3',
              spoken: 'Ushallii sunnatadh dhuhaa rak\'ataini lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Berwudhu & Niat Dhuha 2 Rakaat', desc: 'Laksanakan minimal 2 rakaat di pagi hari sebelum aktivitas padat atau saat jam istirahat pagi sekolah.' },
            { title: 'Baca Surat Pendek & Jaga Thuma\'ninah', desc: 'Sempurnakan gerakan sebagaimana shalat wajib.' },
            { title: 'Akhiri Salam & Panjatkan Doa Dhuha', desc: 'Mohon kemudahan menuntut ilmu dan keluasan rezeki halal yang berkah.' }
          ],
          warnings: ['Jangan dikerjakan pada waktu terlarang tepat saat matahari terbit atau tepat di tengah langit sebelum Dzuhur.']
        },
        {
          id: 'shalat-tahajud',
          badge: 'Sunnah Malam',
          title: 'Shalat Tahajud & Witir',
          summary: 'Qiyamullail sunnah mu\'akkad yang dilaksanakan pada malam hari setelah bangun tidur (meskipun sebentar), lalu ditutup dengan shalat ganjil (Witir).',
          dalil: 'QS. Al-Isra\': 79 — Pada sebagian malam bertahajudlah sebagai ibadah tambahan bagimu, mudah-mudahan Tuhanmu mengangkatmu ke tempat yang terpuji.',
          refKemenag: 'Pedoman Shalat Sunnah Ditjen Bimas Islam Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Waktu Utama',
            syarat: [
              'Dikerjakan setelah shalat Isya dan sesudah tidur sebelumnya.',
              'Waktu paling utama adalah sepertiga malam terakhir (± pukul 01.30 s.d. menjelang Subuh).'
            ],
            rukunTitle: 'Rakaat & Penutup Witir',
            rukun: [
              'Dikerjakan 2 rakaat setiap salam (minimal 2 rakaat, umumnya 4×2 = 8 rakaat), lalu ditutup Witir 1 atau 3 rakaat.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Tahajud & Witir',
              arab: 'أُصَلِّيْ سُنَّةَ التَّهَجُّدِ رَكْعَتَيْنِ لِلّٰهِ تَعَالَى  |  أُصَلِّيْ سُنَّةَ الْوِتْرِ رَكْعَةً لِلّٰهِ تَعَالَى',
              latin: 'Ushallii sunnatat-tahajjudi rak\'ataini lillaahi ta\'aalaa / Ushallii sunnatal witri rak\'atan lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat sunnah Tahajud dua rakaat / Witir karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-tahajud-witir.mp3',
              spoken: 'Ushallii sunnatat tahajjudi rak\'ataini lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Bangun Malam, Bersiwak & Wudhu', desc: 'Segarkan wajah, gosok gigi, dan berwudhu sempurna.' },
            { title: 'Mulai dengan 2 Rakaat Ringan lalu Tahajud', desc: 'Lakukan 2 rakaat demi 2 rakaat dengan bacaan yang penuh penghayatan.' },
            { title: 'Tutup dengan Shalat Witir & Istighfar Sahur', desc: 'Tunaikan Witir ganjil lalu perbanyak doa mustajab di akhir malam.' }
          ],
          warnings: ['Bila sudah menutup shalat dengan Witir setelah Isya/Tarawih, ketika bangun Tahajud tidak perlu mengulang Witir kedua kalinya.']
        },
        {
          id: 'shalat-tarawih',
          badge: 'Khusus Ramadhan',
          title: 'Shalat Tarawih & Witir',
          summary: 'Shalat sunnah malam khusus di bulan suci Ramadhan untuk menghidupkan Qiyamu Ramadhan secara berjamaah maupun sendiri.',
          dalil: 'HR. Bukhari & Muslim: Barangsiapa shalat malam di bulan Ramadhan dengan iman dan mengharap pahala, diampuni dosanya yang telah lalu.',
          refKemenag: 'Tuntunan Ibadah Ramadhan Resmi Kementerian Agama RI',
          syaratRukun: {
            syaratTitle: 'Formasi Umum Diakui Kemenag RI',
            syarat: [
              'Formasi 11 Rakaat (8 Tarawih + 3 Witir) atau 23 Rakaat (20 Tarawih + 3 Witir) — keduanya sah sesuai tuntunan ulama dan dihormati Kementerian Agama RI.',
              'Waktu pelaksanaan: setelah shalat Isya hingga sebelum fajar Subuh.'
            ],
            rukunTitle: 'Adab Pelaksanaan',
            rukun: [
              'Sangat utama berjamaah di masjid bersama imam hingga selesai Witir.',
              'Dilarang tergesa-gesa menghilangkan thuma\'ninah pada rukuk dan sujud.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Tarawih (Makmum)',
              arab: 'أُصَلِّيْ سُنَّةَ التَّرَاوِيْحِ رَكْعَتَيْنِ مَأْمُوْمًا لِلّٰهِ تَعَالَى',
              latin: 'Ushallii sunnatat-taraawiihi rak\'ataini ma\'muuman lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat sunnah Tarawih dua rakaat sebagai makmum karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-tarawih.mp3',
              spoken: 'Ushallii sunnatat taraawiihi rak\'ataini ma\'muuman lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Selesaikan Shalat Isya & Sunnah Ba\'diyah Isya', desc: 'Tarawih baru dimulai sesudah Isya.' },
            { title: 'Ikuti Imam 2 Rakaat Salam (atau 4 Rakaat Salam)', desc: 'Sesuaikan tata cara dengan masjid setempat secara rukun dan tenang.' },
            { title: 'Lanjutkan Shalat Witir Penutup', desc: 'Akhiri dengan doa dan dzikir Subhanal Malikil Quddus.' }
          ],
          warnings: ['Jangan mempermasalahkan formasi 8+3 vs 20+3 karena keduanya diamalkan oleh ulama muktabar dan dipayungi Kemenag RI; utamakan kekhusyukan & ukhuwah.']
        },
        {
          id: 'shalat-hajat-istikharah',
          badge: 'Hajat & Pilihan Terbaik',
          title: 'Shalat Hajat & Istikharah',
          summary: 'Shalat sunnah 2 rakaat ketika memiliki permohonan khusus yang baik (Hajat) atau saat memohon kemantapan hati memilih keputusan terbaik (Istikharah).',
          dalil: 'HR. Bukhari: Rasulullah saw mengajarkan kami shalat Istikharah dalam segala urusan penting.',
          refKemenag: 'Tuntunan Shalat Sunnah Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Kapan Dilaksanakan',
            syarat: [
              'Shalat Hajat: saat mempunyai keinginan halal/cita-cita baik agar dimudahkan Allah.',
              'Shalat Istikharah: saat bimbang memilih dua opsi baik (sekolah, jurusan, pekerjaan, jodoh).'
            ],
            rukunTitle: 'Rakaat & Doa Khusus',
            rukun: [
              'Dikerjakan 2 rakaat di luar waktu terlarang (sangat baik pada malam hari), dilanjutkan doa khusus bakda salam.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Hajat & Istikharah',
              arab: 'أُصَلِّيْ سُنَّةَ الْحَاجَةِ رَكْعَتَيْنِ لِلّٰهِ تَعَالَى  |  أُصَلِّيْ سُنَّةَ الْاِسْتِخَارَةِ رَكْعَتَيْنِ لِلّٰهِ تَعَالَى',
              latin: 'Ushallii sunnatal haajati rak\'ataini lillaahi ta\'aalaa / Ushallii sunnatal istikhaarati rak\'ataini lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat sunnah Hajat / Istikharah dua rakaat karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-hajat-istikharah.mp3',
              spoken: 'Ushallii sunnatal haajati rak\'ataini lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Berwudhu & Tunaikan Shalat 2 Rakaat', desc: 'Baca Al-Kafirun pada rakaat 1 dan Al-Ikhlas pada rakaat 2 (anjuran ulama).' },
            { title: 'Puji Allah, Bershalawat, & Baca Doa Khusus', desc: 'Pada Istikharah baca "Allaahumma innii astakhiiruka bi \'ilmika..." lalu sebutkan urusan yang dimintakan petunjuk.' }
          ],
          warnings: ['Hasil Istikharah tidak harus berupa mimpi; sering kali Allah memantapkan hati dan memudahkan salah satu jalan yang nyata.']
        },
        {
          id: 'shalat-id-gerhana',
          badge: 'Hari Raya & Gerhana',
          title: 'Shalat Idul Fitri/Adha & Gerhana',
          summary: 'Shalat sunnah mu\'akkad dua Hari Raya (takbir zawa\'id 7 & 5 kali) serta shalat Gerhana Matahari/Bulan (2 rukuk tiap rakaat).',
          dalil: 'HR. Bukhari & Muslim: Apabila kalian melihat gerhana maka bersegeralah berdoa dan mendirikan shalat.',
          refKemenag: 'Pedoman Shalat Hari Raya & Khusuf/Kusuf Ditjen Bimas Islam Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Shalat Idain (Idul Fitri & Idul Adha)',
            syarat: [
              '2 rakaat tanpa adzan & iqamah (cukup seruan Ash-shalaatu jaami\'ah), diikuti 2 khutbah.',
              'Rakaat 1: 7 kali takbir tambahan setelah Iftitah. Rakaat 2: 5 kali takbir tambahan sebelum Al-Fatihah.'
            ],
            rukunTitle: 'Shalat Gerhana (Kusuf/Khusuf)',
            rukun: [
              '2 rakaat, setiap rakaat terdiri dari 2 kali berdiri baca Al-Fatihah/surat dan 2 kali RUKUK (total 4 rukuk & 4 sujud).'
            ]
          },
          prayers: [
            {
              label: 'Bacaan Tasbih Di Antara Takbir Shalat Id',
              arab: 'سُبْحَانَ اللّٰهِ وَالْحَمْدُ لِلّٰهِ وَلَا إِلٰهَ إِلَّا اللّٰهُ وَاللّٰهُ أَكْبَرُ',
              latin: 'Subhaanallaahi wal hamdu lillaahi wa laa ilaaha illallaahu wallaahu akbar.',
              arti: 'Maha Suci Allah, segala puji bagi Allah, tiada Tuhan selain Allah, dan Allah Maha Besar.',
              audioUrl: 'audio/tasbih-id.mp3',
              spoken: 'Subhaanallaahi wal hamdu lillaahi wa laa ilaaha illallaahu wallaahu akbar'
            }
          ],
          steps: [
            { title: 'Idain: Mandi Sunnah & Pakai Baju Terbaik', desc: 'Makan sebelum shalat pada Idul Fitri; tahan makan hingga usai shalat pada Idul Adha.' },
            { title: 'Idain: Kerjakan Takbir 7x (R1) & 5x (R2)', desc: 'Baca tasbih pujian Allah pada sela setiap takbir tambahan.' },
            { title: 'Gerhana: Rukuk Ke-1 -> Berdiri Baca Al-Fatihah Lagi -> Rukuk Ke-2', desc: 'Setelah rukuk pertama bangkit i\'tidal lalu langsung membaca Al-Fatihah & surat lagi sebelum rukuk kedua, kemudian sujud 2 kali.' }
          ],
          warnings: ['Simak khutbah Id atau gerhana dengan tenang sebelum membubarkan diri.']
        },
        {
          id: 'shalat-jama-qashar',
          badge: 'Rukhshah Musafir',
          title: 'Shalat Jama\' & Qashar',
          summary: 'Keringanan dari Allah bagi musafir menempuh perjalanan halal sejauh ±82–90 km ke atas untuk menggabungkan (Jama\') dan meringkas (Qashar) shalat 4 rakaat menjadi 2 rakaat.',
          dalil: 'QS. An-Nisa\': 101 — Tidaklah berdosa bagimu mengqashar shalat apabila bepergian di muka bumi.',
          refKemenag: 'Buku Siswa PAI-BP Kemenag RI (Bab Shalat Jama\' & Qashar)',
          quiz: {
            title: 'Uji Kasus Praktik Jama\' Qashar',
            question: 'Ahmad menempuh perjalanan dinas 120 km saat waktu Maghrib & Isya dengan cara Jama\' Taqdim Qashar di waktu Maghrib. Berapa jumlah rakaat yang dikerjakan?',
            options: [
              { text: 'Maghrib 2 rakaat dan Isya 2 rakaat.', correct: false },
              { text: 'Maghrib tetap 3 rakaat (tidak boleh di-qashar) dan Isya 2 rakaat (qashar).', correct: true },
              { text: 'Digabung langsung menjadi 5 rakaat dalam 1 salam.', correct: false }
            ],
            explain: 'Shalat yang dapat di-qashar menjadi 2 rakaat hanyalah shalat yang berjumlah 4 rakaat (Dzuhur, Ashar, Isya). Shalat Maghrib tetap 3 rakaat dan Subuh tetap 2 rakaat dengan masing-masing 1 salam.'
          },
          syaratRukun: {
            syaratTitle: 'Ketentuan Jama\' (Menggabung)',
            syarat: [
              'Hanya 2 pasangan: Dzuhur + Ashar, dan Maghrib + Isya (Subuh TIDAK bisa dijama\').',
              'Jama\' Taqdim: dilaksanakan di waktu shalat pertama (niat jama\' pada shalat ke-1, tertib, dan berkesinambungan).',
              'Jama\' Ta\'khir: dilaksanakan di waktu shalat kedua (niat ta\'khir sebelum waktu shalat ke-1 habis).'
            ],
            rukunTitle: 'Ketentuan Qashar (Meringkas)',
            rukun: [
              'Hanya meringkas shalat 4 rakaat (Dzuhur, Ashar, Isya) menjadi 2 rakaat.',
              'Syarat: safar bukan maksiat, jarak minimal ±82 km (2 marhalah), telah keluar batas kota, dan niat qashar saat takbiratul ihram.'
            ]
          },
          prayers: [
            {
              label: 'Niat Dzuhur Jama\' Taqdim Qashar (dengan Ashar)',
              arab: 'أُصَلِّيْ فَرْضَ الظُّهْرِ رَكْعَتَيْنِ قَصْرًا مَجْمُوْعًا إِلَيْهِ الْعَصْرُ أَدَاءً لِلّٰهِ تَعَالَى',
              latin: 'Ushallii fardhadh-dzuhri rak\'ataini qashran majmuu\'an ilaihil \'ashru adaa-an lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat Dzuhur 2 rakaat qashar dijama\' dengannya Ashar karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-jama-qashar.mp3',
              spoken: 'Ushallii fardhadh dzuhri rak\'ataini qashran majmuu\'an ilaihil ashru lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Pastikan Jarak Tempuh & Niat Jama\' / Qashar', desc: 'Untuk Jama\' Ta\'khir, hadirkan niat pengunduran saat waktu shalat pertama masih ada.' },
            { title: 'Tunaikan Shalat Pertama Hingga Salam', desc: 'Shalat pertama dikerjakan 2 rakaat (jika Qashar) lalu salam.' },
            { title: 'Langsung Berdiri Shalat Kedua Tanpa Jeda Lama', desc: 'Segera iqamah/niat dan kerjakan shalat kedua berkesinambungan (muwalat).' }
          ],
          warnings: ['Jika bermakmum kepada imam penduduk asli (mukim) yang shalat 4 rakaat, musafir wajib menyempurnakan 4 rakaat penuh.']
        }
      ]
    },
    {
      id: 'jenazah',
      icon: '⚰️',
      tone: 'tone-violet',
      tagClass: 'tag-violet',
      title: 'Penyelenggaraan Jenazah',
      subtitle: 'Kewajiban Fardhu Kifayah 4 tahap urut standar Kemenag RI: Memandikan, Mengkafani, Menyalatkan (Laki/Perempuan), & Menguburkan.',
      dalil: 'HR. Bukhari & Muslim: Hak sesama muslim termasuk mengurus dan mengiringi jenazahnya.',
      refKemenag: 'Buku Siswa PAI-BP Kelas XI Kemenag RI (Bab Penyelenggaraan Jenazah)',
      hasJenazahGenderSim: true,
      topics: [
        {
          id: 'jenazah-mandi',
          badge: 'Tahap 1 • Fardhu Kifayah',
          title: '1. Memandikan Jenazah',
          summary: 'Menyucikan tubuh jenazah muslim dengan air suci di tempat tertutup sebelum dikafani. Laki-laki dimandikan laki-laki, perempuan dimandikan perempuan.',
          dalil: 'HR. Bukhari: Mandikanlah jenazah dengan air dan daun bidara (atau sabun pembersih) secara ganjil (3, 5, atau 7 kali).',
          refKemenag: 'Buku Siswa PAI-BP Kurikulum Merdeka Kemenag RI (Tahap Memandikan Jenazah)',
          syaratRukun: {
            syaratTitle: 'Petugas & Perlengkapan',
            syarat: [
              'Petugas berjenis kelamin sama (atau mahram/pasangan suami-istri), serta wajib amanah merahasiakan aib jasad.',
              'Tempat tertutup rapat, dipan pemandian, air bersih suci, sabun/daun bidara, kapur barus, sarung tangan, dan kain penutup aurat.'
            ],
            rukunTitle: 'Jenazah yang Wajib Dimandikan',
            rukun: [
              'Jenazah beragama Islam.',
              'Masih ditemukan anggota tubuhnya walaupun sebagian.',
              'Bukan mati syahid di medan peperangan membela agama (syahid dunia-akhirat).'
            ]
          },
          prayers: [
            {
              label: 'Niat Memandikan Jenazah (Laki-laki / Perempuan)',
              arab: 'نَوَيْتُ الْغُسْلَ أَدَاءً عَنْ هٰذَا الْمَيِّتِ (هٰذِهِ الْمَيِّتَةِ) لِلّٰهِ تَعَالَى',
              latin: 'Nawaitul ghusla adaa-an \'an haadzal mayyiti (laki-laki) / haadzihil mayyitati (perempuan) lillaahi ta\'aalaa.',
              arti: 'Saya niat memandikan jenazah (laki-laki/perempuan) ini sebagai pemenuhan kewajiban karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-mandi-jenazah.mp3',
              spoken: 'Nawaitul ghusla adaa-an \'an haadzal mayyiti lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Tutup Aurat Utama dengan Kain Basahan', desc: 'Letakkan jenazah di tempat tertutup lalu bentangkan kain penutup di atas tubuh agar aurat tetap terjaga.' },
            { title: 'Bersihkan Kotoran & Tekan Perut dengan Sangat Lembut', desc: 'Tinggikan posisi kepala sedikit, tekan perut perlahan sembari mengucurkan air istinja menggunakan sarung tangan.' },
            { title: 'Bersihkan Rongga Mulut, Hidung, Telinga & Kuku', desc: 'Gunakan kain basah bersih atau kapas lembut.' },
            { title: 'Wudhukan Jenazah Seperti Wudhu Shalat', desc: 'Niat mewudhukan jenazah lalu usapkan wajah, kedua tangan, kepala, dan kaki secara lembut.' },
            { title: 'Siram Sabun/Daun Bidara Lalu Bilas Air Bersih (3×/5×)', desc: 'Mulai sisi kepala dan bagian kanan baru kiri. Siraman bilasan terakhir dicampur sedikit kapur barus.' },
            { title: 'Keringkan dengan Handuk Bersih', desc: 'Serap air memakai handuk halus agar tidak membasahi kain kafan.' }
          ],
          warnings: ['Dilarang keras membicarakan kondisi fisik buruk pada jenazah; petugas wajib menjaga kehormatan almarhum/almarhumah.']
        },
        {
          id: 'jenazah-kafan',
          badge: 'Tahap 2 • Fardhu Kifayah',
          title: '2. Mengkafani Jenazah',
          summary: 'Membungkus tubuh jenazah yang telah suci menggunakan kain kafan putih bersih sebelum dishalatkan.',
          dalil: 'HR. Abu Daud: Pakailah pakaian berwarna putih karena ia terbaik bagimu, dan kafanilah orang wafat di antara kalian dengannya.',
          refKemenag: 'Buku Siswa PAI-BP Kelas XI Kemenag RI (Ketentuan Kafan 3 & 5 Lapis)',
          hasJenazahGenderSim: true,
          syaratRukun: {
            syaratTitle: 'Standar Kain Kafan Kemenag RI',
            syarat: [
              'Jenazah Laki-laki (Sunnah): 3 helai kain kafan pembungkus sejajar penuh menutupi ujung kepala s.d. ujung kaki.',
              'Jenazah Perempuan (Sunnah): 5 helai kain — 1 kain basahan (sarung), 1 baju kurung, 1 kerudung/khimar, & 2 helai pembungkus luar.'
            ],
            rukunTitle: 'Pelengkap Pengikat',
            rukun: [
              '7 (atau 5) tali kain kafan diletakkan di bagian kepala, leher, dada, perut/lengan, lutut, betis, dan ujung kaki.',
              'Kapas secukupnya dan wewangian/kapur barus untuk persendian sujud dan penutup lubang tubuh.'
            ]
          },
          prayers: [
            {
              label: 'Doa Kebaikan Saat Mengkafani',
              arab: 'بِسْمِ اللّٰهِ وَعَلَى مِلَّةِ رَسُوْلِ اللّٰهِ',
              latin: 'Bismillaahi wa \'alaa millati rasuulillaah.',
              arti: 'Dengan nama Allah dan di atas agama Rasulullah saw.',
              audioUrl: 'audio/doa-mengkafani.mp3',
              spoken: 'Bismillaahi wa \'alaa millati rasuulillaah'
            }
          ],
          steps: [
            { title: 'Bentangkan Tali Pengikat Lalu Susun Kain Kafan', desc: 'Hamparkan 7 utas tali di tempat bersih, susun 3 helai kain (laki-laki) atau 2 helai luar + perlengkapan dalam (perempuan), beri taburan wangi kapur barus.' },
            { title: 'Baringkan Jenazah dengan Hati-hati & Tutup Persendian Kapas', desc: 'Letakkan jenazah terlentang, sedekapkan tangan kanan di atas kiri, tutup anggota sujud (dahi, hidung, tangan, lutut, kaki) serta lubang tubuh dengan kapas halus.' },
            { title: 'Selimuti dari Sisi Kiri Terlebih Dahulu Lalu Sisi Kanan', desc: 'Pastikan seluruh jasad terbungkus rapi.' },
            { title: 'Ikat Tali dengan Simpul Hidup di Sebelah Kiri', desc: 'Ikat menggunakan simpul mudah lepas pada sisi kiri badan agar gampang dibuka ketika di liang kubur.' }
          ],
          warnings: ['Jangan menggunakan kain kafan sutra bagi jenazah laki-laki atau bermewah-mewahan melebihi kemampuan keluarga.']
        },
        {
          id: 'jenazah-shalat',
          badge: 'Tahap 3 • Fardhu Kifayah',
          title: '3. Menyalatkan Jenazah',
          summary: 'Shalat 4 kali takbir berdiri memohonkan ampunan & rahmat untuk jenazah tanpa rukuk, i\'tidal, sujud, maupun duduk tasyahud.',
          dalil: 'HR. Muslim: Tidaklah seorang mukmin wafat lalu dishalatkan 40 jamaah yang tulus beribadah kecuali Allah terima syafaat doa mereka.',
          refKemenag: 'Pedoman Shalat Jenazah Standar Kemenag RI',
          hasJenazahGenderSim: true,
          stepperTitle: '🕌 Simulator 4 Takbir Shalat Jenazah Interaktif',
          syaratRukun: {
            syaratTitle: 'Posisi Berdiri Imam (Standar Kemenag RI)',
            syarat: [
              'Jenazah Laki-laki: Imam berdiri searah KEPALA jenazah (kepala mayit berada di sebelah kiri imam bila kiblat mengarah barat).',
              'Jenazah Perempuan: Imam berdiri searah PERUT / PINGGANG jenazah.',
              'Dianjurkan membuat minimal 3 shaf jamaah ke belakang.'
            ],
            rukunTitle: '7 Rukun Shalat Jenazah',
            rukun: [
              '1. Niat • 2. Berdiri (bila mampu) • 3. Empat kali takbir.',
              '4. Membaca QS. Al-Fatihah sesudah Takbir ke-1.',
              '5. Membaca Shalawat Nabi sesudah Takbir ke-2.',
              '6. Membaca Doa khusus jenazah sesudah Takbir ke-3.',
              '7. Salam ke kanan (dan sunnah ke kiri) sesudah Takbir ke-4 & doa penutup.'
            ]
          },
          prayers: [
            {
              label: 'Niat Shalat Jenazah (Laki-laki: Mayyiti | Perempuan: Mayyitati)',
              arab: 'أُصَلِّيْ عَلَى هٰذَا الْمَيِّتِ (هٰذِهِ الْمَيِّتَةِ) أَرْبَعَ تَكْبِيْرَاتٍ فَرْضَ كِفَايَةٍ مَأْمُوْمًا لِلّٰهِ تَعَالَى',
              latin: 'Ushallii \'alaa haadzal mayyiti (haadzihil mayyitati) arba\'a takbiiraatin fardha kifaayatin ma\'muuman (imaaman) lillaahi ta\'aalaa.',
              arti: 'Saya niat shalat atas jenazah ini empat takbir fardhu kifayah sebagai makmum karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-shalat-jenazah.mp3',
              spoken: 'Ushallii \'alaa haadzal mayyiti arba\'a takbiiraatin fardha kifaayatin ma\'muuman lillaahi ta\'aalaa'
            },
            {
              label: 'Doa Takbir ke-3 (-hu Laki-laki | -haa Perempuan)',
              arab: 'اللّٰهُمَّ اغْفِرْ لَهُ (لَهَا) وَارْحَمْهُ (وَارْحَمْهَا) وَعَافِهِ (وَعَافِهَا) وَاعْفُ عَنْهُ (عَنْهَا)',
              latin: 'Allaahummaghfir lahu (lahaa) warhamhu (warhamhaa) wa \'aafihi (\'aafihaa) wa\'fu \'anhu (\'anhaa)...',
              arti: 'Ya Allah ampunilah dia, rahmatilah dia, sejahterakanlah dan maafkanlah dia.',
              hisnMatch: { catNeedles: ['الدعاء للميت في الصلاة عليه'], textNeedles: ['اللهم اغفر له', 'ارحمه'] },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            },
            {
              label: 'Doa Takbir ke-4 & Salam',
              arab: 'اللّٰهُمَّ لَا تَحْرِمْنَا أَجْرَهُ (أَجْرَهَا) وَلَا تَفْتِنَّا بَعْدَهُ (بَعْدَهَا) وَاغْفِرْ لَنَا وَلَهُ (وَلَهَا)',
              latin: 'Allaahumma laa tahrimnaa ajrahu (ajrahaa) wa laa taftinnaa ba\'dahu (ba\'dahaa) waghfir lanaa wa lahu (wahaa).',
              arti: 'Ya Allah jangan halangi kami dari pahalanya, jangan beri fitnah setelahnya, ampuni kami dan dia.',
              audioUrl: 'audio/doa-takbir4-jenazah.mp3',
              spoken: 'Allaahumma laa tahrimnaa ajrahu wa laa taftinnaa ba\'dahu waghfir lanaa wa lahu'
            }
          ],
          steps: [
            { title: 'Takbir ke-1: Niat + Membaca QS. Al-Fatihah', desc: 'Takbiratul ihram seraya niat di hati, lalu bersedekap membaca Al-Fatihah dengan suara sirr (pelan).' },
            { title: 'Takbir ke-2: Membaca Shalawat Nabi saw', desc: 'Angkat tangan mengucap Allahu Akbar lalu membaca "Allaahumma shalli \'alaa Muhammad wa \'alaa aali Muhammad..."' },
            { title: 'Takbir ke-3: Membaca Doa Khusus Jenazah', desc: 'Angkat tangan takbir ke-3 lalu baca "Allaahummaghfir lahu (laki) / lahaa (perempuan) warhamhu / warhamhaa..."' },
            { title: 'Takbir ke-4: Doa Singkat & Salam ke Kanan–Kiri', desc: 'Takbir ke-4 baca "Allaahumma laa tahrimnaa ajrahu..." lalu langsung mengucap Salam tanpa rukuk dan sujud.' }
          ],
          warnings: [
            'Perhatikan kata ganti bahasa Arab: -hu untuk jenazah laki-laki, -haa untuk jenazah perempuan.',
            'Shalat jenazah tidak memiliki rukuk, sujud, iftitah, maupun tasyahud.'
          ]
        },
        {
          id: 'jenazah-kubur',
          badge: 'Tahap 4 • Fardhu Kifayah',
          title: '4. Menguburkan Jenazah',
          summary: 'Memakamkan jenazah ke dalam liang kubur menghadap arah kiblat secara tenang dan terhormat sebagai penutup pengurusan jenazah.',
          dalil: 'HR. Tirmidzi: Ketika meletakkan jenazah di kubur bacalah "Bismillahi wa \'ala millati Rasulillah".',
          refKemenag: 'Buku Siswa PAI-BP Kelas XI Kemenag RI (Pemakaman Jenazah)',
          syaratRukun: {
            syaratTitle: 'Ukuran & Bentuk Liang',
            syarat: [
              'Kedalaman setinggi orang berdiri + lambaian tangan (±1,8–2 meter) agar aman dari bau dan binatang.',
              'Liang Lahad (galian samping dinding kiblat bila tanah padat) atau Syaq (ceruk tengah bila tanah pasir/gembur).'
            ],
            rukunTitle: 'Adab Penguburan',
            rukun: [
              'Membuka tali pengikat kafan agar jenazah leluasa menghadap kiblat.',
              'Tidak meratap berlebihan; setelah tanah rata segera berdoa memohon ampunan dan keteguhan hati bagi mayit.'
            ]
          },
          prayers: [
            {
              label: 'Bacaan Meletakkan Jenazah & Doa Usai Menguburkan',
              arab: 'بِسْمِ اللّٰهِ وَعَلَى مِلَّةِ رَسُوْلِ اللّٰهِ  |  اللّٰهُمَّ اغْفِرْ لَهُ وَثَبِّتْهُ',
              latin: 'Saat menurunkan: Bismillaahi wa \'alaa millati rasuulillaah. Usai mengubur: Allaahummaghfir lahu (lahaa) wa tsabbithu (tsabbithaa).',
              arti: 'Dengan nama Allah dan di atas agama Rasulullah saw; Ya Allah ampuni dan teguhkanlah dia.',
              hisnMatch: { catNeedles: ['عند إدخال الميت القبر', 'بعد دفن الميت'], textNeedles: ['بسم الله وعلى'] },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            }
          ],
          steps: [
            { title: 'Turunkan Jenazah dari Arah Kaki Kubur', desc: 'Masukkan jenazah perlahan ke liang lahad dari sisi kaki kubur sambil membaca doa meletakkan mayit.' },
            { title: 'Miringkan Badan Menghadap Kiblat & Sandarkan ke Dinding Lahad', desc: 'Posisikan wajah & dada menghadap arah kiblat, beri ganjalan gumpalan tanah di belakang punggung agar tidak berbalik.' },
            { title: 'Lepaskan Tali Pengikat & Tempelkan Pipi Kanan ke Tanah', desc: 'Urungkan simpul ikatan tali kafan dari kepala sampai kaki.' },
            { title: 'Pasang Papan Penahan & Timbun Tanah Secara Rapi', desc: 'Tutup liang miring dengan papan/bambu lalu timbun tanah hingga gundukan setinggi ±1 jengkal, pasang nisan, siram air, lalu berdoa bersama.' }
          ],
          warnings: ['Jangan duduk di atas kuburan, menginjaknya, atau membangun tembok/atap permanen megah di atas makam.']
        }
      ]
    },
    {
      id: 'zakat',
      icon: '🌾',
      tone: 'tone-gold',
      tagClass: 'tag-gold',
      title: 'Zakat & Simulasi Hitungan',
      subtitle: 'Ketentuan Zakat Fitrah, Zakat Maal, Profesi, Pertanian, 8 Asnaf Mustahiq, dan Simulator Kalkulator Zakat standar BAZNAS RI.',
      dalil: 'QS. At-Taubah: 103 — Ambillah zakat dari harta mereka untuk membersihkan dan menyucikan jiwa mereka.',
      refKemenag: 'Buku PAI-BP Kemenag RI, UU No. 23/2011 tentang Pengelolaan Zakat & SK Ketua BAZNAS RI',
      topics: [
        {
          id: 'zakat-fitrah',
          badge: 'Wajib Ramadhan',
          title: '1. Praktikum Zakat Fitrah',
          summary: 'Zakat jiwa wajib ditunaikan setiap muslim sebesar 1 sha\' makanan pokok (± 2,5 kg atau 3,5 liter beras menurut standar Kemenag/BAZNAS RI) sebelum shalat Idul Fitri.',
          dalil: 'HR. Bukhari & Muslim: Rasulullah saw mewajibkan zakat fitrah sebanyak satu sha\' makanan pokok atas setiap muslim.',
          refKemenag: 'SK Ketua BAZNAS RI & Direktorat Pemberdayaan Zakat dan Wakaf Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Syarat & Takaran Standar',
            syarat: [
              'Beragama Islam, masih hidup saat matahari terbenam akhir Ramadhan dan awal 1 Syawal.',
              'Mempunyai kelebihan nafkah pokok untuk malam & hari raya Idul Fitri.',
              'Takaran resmi Kemenag/BAZNAS RI: 2,5 kg atau 3,5 liter beras kualitas konsumsi harian (atau nilai uang seharga beras tersebut).'
            ],
            rukunTitle: 'Pembagian Waktu Tunai',
            rukun: [
              'Waktu Mubah: awal s.d. akhir Ramadhan.',
              'Waktu Wajib: terbenam matahari penghabisan Ramadhan.',
              'Waktu Utama (Afdhal): bakda Subuh 1 Syawal sebelum shalat Idul Fitri (haram sengaja ditunda lewat shalat Id).'
            ]
          },
          prayers: [
            {
              label: 'Niat Zakat Fitrah untuk Diri & Keluarga',
              arab: 'نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ الْفِطْرِ عَنْ نَفْسِيْ وَعَنْ جَمِيْعِ مَا يَلْزَمُنِيْ نَفَقَاتُهُمْ شَرْعًا فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitu an ukhrija zakaatal fithri \'an nafsii wa \'an jamii\'i maa yalzamunii nafaqaatuhum syar\'an fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat mengeluarkan zakat fitrah untuk diriku dan seluruh keluarga tanggunganku fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-zakat-fitrah.mp3',
              spoken: 'Nawaitu an ukhrija zakaatal fithri \'an nafsii fardhan lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Data Jumlah Anggota Keluarga yang Ditanggung', desc: 'Hitung kepala keluarga, pasangan, anak, dan tanggungan lain yang hidup pada malam 1 Syawal.' },
            { title: 'Siapkan Beras 2,5 kg/jiwa (atau Uang Setara Beras)', desc: 'Pastikan kualitas beras layak sama seperti yang dimakan sehari-hari.' },
            { title: 'Salurkan Lewat Amil/UPZ Masjid Sebelum Shalat Id', desc: 'Amil mendoakan muzakki: "Ajarakallaahu fiimaa a\'thaita wa baaraka fiimaa abqaita..."' }
          ],
          warnings: ['Menyerahkan zakat fitrah setelah shalat Id selesai tanpa udzur statusnya berubah menjadi sedekah biasa, bukan zakat fitrah.']
        },
        {
          id: 'zakat-maal',
          badge: 'Harta & Pertanian',
          title: '2. Zakat Maal (Emas, Tabungan & Pertanian)',
          summary: 'Zakat harta kekayaan simpanan (emas/perak/tabungan/perniagaan dengan nisab 85 gram emas, haul 1 tahun, kadar 2,5%) dan zakat hasil panen pertanian.',
          dalil: 'HR. Abu Daud: Jika engkau memiliki 20 dinar (±85 gram emas) dan telah berlalu 1 tahun maka zakatnya 2,5%.',
          refKemenag: 'Buku Panduan Zakat Praktis Direktorat Pemberdayaan Zakat Kemenag RI',
          syaratRukun: {
            syaratTitle: 'Zakat Emas, Tabungan & Perniagaan',
            syarat: [
              'Milik penuh, harta halal berkembang, melewati Haul 1 tahun qamariyah (354 hari), & bersih dari hutang jatuh tempo.',
              'Nisab: setara harga 85 gram emas murni (perak: 595 gram). Kadar zakat = 2,5%.'
            ],
            rukunTitle: 'Zakat Pertanian (Tanpa Menunggu Haul)',
            rukun: [
              'Nisab panen makanan pokok ± 653 kg gabah / ± 520–524 kg beras bersih (5 wasaq).',
              'Pengairan alami/tadah hujan (tanpa biaya irigasi): kadar 10%. Irigasi berbiaya/pompa: kadar 5%.'
            ]
          },
          prayers: [
            {
              label: 'Niat Zakat Maal',
              arab: 'نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ مَالِيْ فَرْضًا لِلّٰهِ تَعَالَى',
              latin: 'Nawaitu an ukhrija zakaata maalii fardhan lillaahi ta\'aalaa.',
              arti: 'Saya niat mengeluarkan zakat harta milikku fardhu karena Allah Ta\'ala.',
              audioUrl: 'audio/niat-zakat-maal.mp3',
              spoken: 'Nawaitu an ukhrija zakaata maalii fardhan lillaahi ta\'aalaa'
            }
          ],
          steps: [
            { title: 'Hitung Total Nilai Emas, Tabungan & Modal Niaga', desc: 'Kurangi dengan hutang yang jatuh tempo saat perhitungan.' },
            { title: 'Bandingkan dengan Nisab 85 Gram Emas', desc: 'Jika nilai bersih ≥ (85 × harga emas/gr) dan genap 1 tahun, keluarkan 2,5% kepada 8 Asnaf.' }
          ],
          warnings: ['Jangan menyalurkan zakat kepada keluarga langsung yang wajib dinafkahi (orang tua/anak kandung/istri).']
        },
        {
          id: 'zakat-profesi',
          badge: 'Penghasilan & 8 Asnaf',
          title: '3. Zakat Profesi & 8 Golongan Asnaf',
          summary: 'Zakat dari gaji atau jasa profesi halal yang melampaui nisab 85 gram emas pertahun (dibagi 12 per bulan) dengan kadar 2,5% untuk 8 golongan mustahiq.',
          dalil: 'QS. Al-Baqarah: 267 & QS. At-Taubah: 60 tentang 8 golongan penerima zakat (Asnaf).',
          refKemenag: 'Peraturan Menteri Agama RI No. 52/2014 & SK BAZNAS tentang Nisab Zakat Penghasilan',
          syaratRukun: {
            syaratTitle: 'Kaidah Zakat Penghasilan Kemenag & BAZNAS',
            syarat: [
              'Nisab per tahun setara 85 gram emas (dibagi 12 jika dibayar bulanan).',
              'Kadar zakat tetap 2,5% dari penghasilan bersih (setelah kebutuhan pokok) maupun bruto.'
            ],
            rukunTitle: '8 Golongan Penerima Zakat (QS. At-Taubah: 60)',
            rukun: [
              '1. Fakir • 2. Miskin • 3. Amil (Pengelola Zakat) • 4. Muallaf.',
              '5. Riqab • 6. Gharimin (Berhutang kebutuhan pokok) • 7. Fisabilillah • 8. Ibnu Sabil (Musafir kehabisan bekal).'
            ]
          },
          prayers: [
            {
              label: 'Dalil 8 Asnaf (QS. At-Taubah: 60)',
              surah: 9,
              ayah: 60,
              quranRef: 'QS. At-Taubah [9]: 60',
              arab: 'إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ',
              latin: 'Innamash-shadaqaatu lil fuqaraa-i wal masaakiini wal \'aamiliina \'alaihaa wal mu-allafati quluubuhum...',
              arti: 'Sesungguhnya zakat itu hanyalah untuk orang-orang fakir, miskin, amil zakat, para muallaf yang dibujuk hatinya...'
            }
          ],
          steps: [
            { title: 'Hitung Penghasilan + Tunjangan per Bulan', desc: 'Kurangi kebutuhan pokok/hutang mendesak jika menggunakan pendekatan nett.' },
            { title: 'Cek Nisab Bulanan (85 gr Emas ÷ 12) Lalu Kali 2,5%', desc: 'Salurkan tiap bulan atau dirapel 1 tahun ke UPZ/BAZNAS resmi.' }
          ],
          warnings: ['Jika penghasilan masih di bawah nisab, tetap dianjurkan berinfaq/sedekah sesuai keikhlasan hati.']
        },
        {
          id: 'zakat-simulasi',
          badge: '🧮 Simulator Kalkulator',
          title: '4. Simulasi & Hitungan Zakat Interaktif',
          summary: 'Simulasi langsung perhitungan Zakat Fitrah keluarga, Zakat Penghasilan/Profesi, dan Zakat Maal (Emas & Tabungan) memakai acuan BAZNAS & Kemenag RI.',
          dalil: 'Standar BAZNAS/Kemenag RI: Zakat Fitrah = 2,5 kg beras/jiwa; Nisab Zakat Maal/Profesi = 85 gram emas (2,5%).',
          refKemenag: 'Rumus Resmi Kalkulator Zakat BAZNAS & Ditjen Bimas Islam Kemenag RI',
          isZakatSimulator: true,
          syaratRukun: {
            syaratTitle: 'Acuan Perhitungan',
            syarat: [
              'Fitrah = Jumlah Jiwa × 2,5 kg (atau × Harga Beras/kg).',
              'Profesi = (Gaji + Bonus - Pengeluaran Pokok) × 2,5% bila ≥ Nisab (85 gr emas ÷ 12).'
            ],
            rukunTitle: 'Maal / Emas / Niaga',
            rukun: [
              'Maal = (Tabungan + Emas - Hutang Jatuh Tempo) × 2,5% bila ≥ 85 gr emas & mencapai Haul 1 tahun.'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Pilih Tab Jenis Zakat atau Klik Preset Studi Kasus', desc: 'Coba uji skenario Zakat Fitrah, Profesi, atau Maal langsung di bawah.' },
            { title: 'Salin Ringkasan Hasil Hitungan untuk Tugas Praktik', desc: 'Gunakan tombol "Salin Ringkasan" bila diperlukan untuk laporan belajar.' }
          ],
          warnings: ['Pastikan angka harga emas per gram diperbarui sesuai harga acuan emas Antam/BAZNAS tahun berjalan.']
        }
      ]
    },
    {
      id: 'haji',
      icon: '🕋',
      tone: 'tone-rose',
      tagClass: 'tag-rose',
      title: 'Haji & Umrah (Manasik)',
      subtitle: 'Pedoman Manasik Resmi Kemenag RI: Rukun & Wajib Haji, Miqat & Talbiyah, Thawaf, Sa\'i, Wukuf Arafah, hingga simulator alur manasik.',
      dalil: 'QS. Ali \'Imran: 97 — Mengerjakan haji adalah kewajiban manusia kepada Allah bagi yang sanggup menempuh perjalanan ke Baitullah.',
      refKemenag: 'Buku Tuntunan Manasik Haji dan Umrah Ditjen Penyelenggaraan Haji & Umrah (PHU) Kemenag RI',
      hasManasikSim: true,
      topics: [
        {
          id: 'haji-syarat-rukun',
          badge: 'Dasar Manasik Kemenag',
          title: '1. Rukun, Wajib, & Jenis Pelaksanaan Haji',
          summary: 'Memahami 6 Rukun Haji, 6 Wajib Haji, serta 3 jenis haji (Tamattu\', Ifrad, Qiran) yang umum dipraktikkan jamaah Indonesia.',
          dalil: 'QS. Al-Baqarah: 196 — Sempurnakanlah ibadah haji dan umrah karena Allah.',
          refKemenag: 'Buku Tuntunan Manasik Haji Kemenag RI',
          syaratRukun: {
            syaratTitle: '6 Rukun Haji (Tidak Sah Bila Tertinggal)',
            syarat: [
              '1. Ihram (Niat haji) • 2. Wukuf di Arafah (9 Dzulhijjah).',
              '3. Thawaf Ifadhah • 4. Sa\'i (Shafa–Marwah 7x).',
              '5. Tahallul (Mencukur rambut) • 6. Tertib.'
            ],
            rukunTitle: '6 Wajib Haji (Dikenai Dam Bila Tertinggal)',
            rukun: [
              '1. Ihram dari Miqat • 2. Mabit di Muzdalifah • 3. Mabit di Mina.',
              '4. Melontar 3 Jumrah • 5. Thawaf Wada\' • 6. Menjauhi larangan Ihram.'
            ]
          },
          prayers: [
            {
              label: 'Dalil Kewajiban Istitha\'ah',
              surah: 3,
              ayah: 97,
              quranRef: 'QS. Ali \'Imran [3]: 97',
              arab: 'وَلِلّٰهِ عَلَى النَّاسِ حِجُّ الْبَيْتِ مَنِ اسْتَطَاعَ إِلَيْهِ سَبِيْلًا',
              latin: 'Wa lillaahi \'alan-naasi hijjul baiti manistathaa\'a ilaihi sabiilaa.',
              arti: 'Mengerjakan haji ke Baitullah adalah kewajiban manusia terhadap Allah bagi orang yang mampu mengadakan perjalanan ke sana.'
            }
          ],
          steps: [
            { title: 'Haji Tamattu\' (Umum Jamaah Indonesia)', desc: 'Mendahulukan Umrah di bulan Haji, Tahallul, baru berihram Haji pada 8 Dzulhijjah (wajib bayar Dam 1 kambing/puasa 10 hari).' },
            { title: 'Haji Ifrad & Haji Qiran', desc: 'Ifrad: Haji dahulu tanpa Dam; Qiran: Niat gabung Haji+Umrah sekaligus (dikenai Dam nusuk).' }
          ],
          warnings: ['Melewatkan Wukuf di Arafah pada 9 Dzulhijjah membuat ibadah Haji tidak sah (batal).']
        },
        {
          id: 'haji-ihram-miqat',
          badge: 'Persiapan & Miqat',
          title: '2. Praktikum Ihram, Miqat & Talbiyah',
          summary: 'Memulai ibadah suci di batas tempat (Miqat Makani: Bir Ali, Yalamlam, dll) disertai pakaian ihram dan bacaan Talbiyah.',
          dalil: 'HR. Bukhari tentang penetapan miqat-miqat bagi jamaah dari berbagai penjuru negeri.',
          refKemenag: 'Tuntunan Manasik Haji & Umrah Kemenag RI (Miqat & Larangan Ihram)',
          syaratRukun: {
            syaratTitle: 'Pakaian Ihram Resmi',
            syarat: [
              'Laki-laki: 2 helai kain putih tak berjahit (Izar & Rida\'), sandal terbuka, tidak menutup kepala menempel.',
              'Perempuan: busana muslimah menutup aurat selain wajah & kedua telapak tangan (tanpa cadar & tanpa sarung tangan).'
            ],
            rukunTitle: 'Larangan Selama Berihram',
            rukun: [
              'Memakai wangi-wangian, memotong rambut/kuku, mencabut bulu badan.',
              'Menikah/menikahkan, berburu hewan darat, memotong pohon tanah haram, bermesraan suami istri.'
            ]
          },
          prayers: [
            {
              label: 'Niat Ihram Umrah / Haji & Kalimat Talbiyah',
              arab: 'لَبَّيْكَ اللّٰهُمَّ عُمْرَةً (حَجًّا)  |  لَبَّيْكَ اللّٰهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيْكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيْكَ لَكَ',
              latin: 'Labbaikallaahumma \'umratan / hajjan. Labbaikallaahumma labbaik, labbaika laa syariika laka labbaik, innal hamda wan-ni\'mata laka wal mulka laa syariika lak.',
              arti: 'Aku penuhi panggilan-Mu ya Allah untuk Umrah/Haji. Aku penuhi panggilan-Mu tiada sekutu bagi-Mu...',
              hisnMatch: {
                catNeedles: ['كيف يلبي المحرم'],
                textNeedles: ['لبيك اللهم لبيك'],
                fallbackPaths: ['/audio/233.mp3', '/audio/ar_7esn_AlMoslem_by_Doors_116.mp3']
              },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            }
          ],
          steps: [
            { title: 'Mandi Sunnah Ihram & Pakai Pakaian Ihram', desc: 'Bersih diri potong kuku/rambut dan gunakan wewangian di kulit sebelum melafalkan niat.' },
            { title: 'Niat Tepat Saat Melewati Miqat & Baca Talbiyah', desc: 'Lafalkan niat Umrah/Haji lalu kumandangkan Talbiyah (lantang bagi laki-laki, pelan bagi perempuan).' }
          ],
          warnings: ['Jangan memotong rambut atau kuku sebelum resmi Tahallul agar tidak terkena Dam.']
        },
        {
          id: 'haji-thawaf-sai',
          badge: 'Masjidil Haram',
          title: '3. Praktikum Thawaf, Sa\'i & Tahallul',
          summary: 'Mengelilingi Ka\'bah 7 putaran berlawanan arah jarum jam dengan Ka\'bah di kiri tubuh, dilanjutkan berjalan Shafa–Marwah 7 kali dan mencukur rambut.',
          dalil: 'QS. Al-Hajj: 29 & QS. Al-Baqarah: 158 (Shafa & Marwah termasuk syi\'ar Allah).',
          refKemenag: 'Tuntunan Manasik Kemenag RI',
          hasManasikSim: true,
          syaratRukun: {
            syaratTitle: 'Syarat Sah Thawaf',
            syarat: [
              'Suci hadas & najis (berwudhu) serta menutup aurat.',
              '7 putaran sempurna dimulai & diakhiri sejajar Hajar Aswad tanpa memotong dalam Hijr Ismail.'
            ],
            rukunTitle: 'Ketentuan Sa\'i & Tahallul',
            rukun: [
              'Sa\'i 7 lintasan dimulai dari Shafa (hitungan ke-1 ke Marwah) berakhir ke-7 di Marwah.',
              'Tahallul memotong minimal 3 helai rambut (halq/cukur gundul utama bagi laki-laki).'
            ]
          },
          prayers: [
            {
              label: 'Doa Antara Rukun Yamani & Hajar Aswad',
              arab: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
              latin: 'Rabbanaa aatinaa fid-dunyaa hasanatan wa fil aakhirati hasanatan wa qinaa \'adzaaban-naar.',
              arti: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat serta peliharalah kami dari siksa neraka.',
              surah: 2,
              ayah: 201,
              quranRef: 'QS. Al-Baqarah [2]: 201',
              hisnMatch: {
                catNeedles: ['بين الركن اليماني'],
                textNeedles: ['ربنا آتنا في الدنيا']
              },
              reciterLabel: 'Qari Al-Husary / Syaikh Hamad'
            }
          ],
          steps: [
            { title: 'Putari Ka\'bah 7 Kali Sejajar Hajar Aswad', desc: 'Lambaikan tangan (Istilam) sambil baca Bismillahi Allahu Akbar tiap melewati garis Hajar Aswad.' },
            { title: 'Shalat Sunnah 2 Rakaat Belakang Maqam Ibrahim', desc: 'Lanjutkan minum air Zamzam sambil menghadap Ka\'bah dan berdoa.' },
            { title: 'Sa\'i 7 Kali Bukit Shafa – Marwah', desc: 'Berlari kecil (laki-laki) saat melintasi pilar lampu hijau.' },
            { title: 'Tahallul Memotong Rambut di Area Marwah', desc: 'Semua larangan ihram Umrah gugur sesudah Tahallul.' }
          ],
          warnings: ['Jangan menyingkat jalan masuk ke dalam area setengah lingkaran Hijr Ismail karena termasuk bagian dalam Ka\'bah.']
        },
        {
          id: 'haji-wukuf-jumrah',
          badge: 'Puncak 8–13 Dzulhijjah',
          title: '4. Wukuf Arafah, Mabit & Lempar Jumrah',
          summary: 'Rangkaian inti Haji di Arafah, Muzdalifah, dan Mina: Wukuf 9 Dzulhijjah, bermalam, hingga melontar 3 Jumrah (Ula, Wustha, Aqabah).',
          dalil: 'HR. Tirmidzi: Al-Hajju \'Arafah — Haji adalah Wukuf di Padang Arafah.',
          refKemenag: 'Buku Manasik Haji Kemenag RI (Puncak Armuzna: Arafah–Muzdalifah–Mina)',
          hasManasikSim: true,
          syaratRukun: {
            syaratTitle: 'Urutan Tanggal Dzulhijjah',
            syarat: [
              '8 Dzulhijjah (Tarwiyah): Berangkat dari Makkah menuju Mina.',
              '9 Dzulhijjah (Arafah): Wukuf sejak tergelincir matahari hingga Maghrib / sebelum fajar 10 Dzulhijjah.'
            ],
            rukunTitle: 'Muzdalifah & Lempar Jumrah',
            rukun: [
              'Malam 10 Dzulhijjah: Mabit di Muzdalifah & ambil kerikil.',
              '10 Dzulhijjah: Lempar Jumrah Aqabah 7 kerikil -> Dam -> Tahallul Awal.',
              '11–12/13 Dzulhijjah: Mabit Mina & lempar Ula (7), Wustha (7), Aqabah (7) setiap hari.'
            ]
          },
          prayers: [
            {
              label: 'Takbir Saat Melontar Setiap Batu Kerikil',
              arab: 'بِسْمِ اللّٰهِ وَاللّٰهُ أَكْبَرُ',
              latin: 'Bismillaahi wallaahu akbar (diucapkan tiap 1 lemparan batu kecil).',
              arti: 'Dengan nama Allah, Allah Maha Besar.',
              hisnMatch: {
                catNeedles: ['رمي الجمار'],
                textNeedles: ['الله أكبر']
              },
              reciterLabel: 'Syaikh Hamad Al-Duraikhim'
            }
          ],
          steps: [
            { title: 'Wukuf Khusyuk di Padang Arafah (9 Dzulhijjah)', desc: 'Shalat Dzuhur+Ashar Jama\' Taqdim Qashar dan perbanyak doa, istighfar & dzikir.' },
            { title: 'Mabit Muzdalifah & Lempar Jumrah Aqabah (10 Dzulhijjah)', desc: 'Kumpulkan kerikil kecil, lempar Jumrah Aqabah 7 kali lalu potong rambut (Tahallul Awal).' },
            { title: 'Thawaf Ifadhah & Sa\'i + Hari Tasyrik (11–13 Dzulhijjah)', desc: 'Tunaikan Rukun Thawaf Ifadhah, lempar 3 Jumrah di Mina (Nafar Awal tgl 12 / Tsani tgl 13), tutup pulang dengan Thawaf Wada\'.' }
          ],
          warnings: ['Lontar kerikil wajib 1 per 1 sejumlah 7 kali (bukan dilempar sekaligus 7 butir dalam satu genggaman).']
        }
      ]
    },
    {
      id: 'tajwid',
      icon: '📖',
      tone: 'tone-sky',
      tagClass: 'tag-sky',
      title: 'Ilmu Tajwid & Contoh Suara',
      subtitle: 'Kaidah tartil Al-Qur\'an standar LPMQ Kemenag RI lengkap dengan Studio Contoh Suara (Idzhar, Idgham, Iqlab, Ikhfa\', Qalqalah, Mad) & latihan.',
      dalil: 'QS. Al-Muzzammil: 4 — Dan bacalah Al-Qur\'an itu dengan tartil.',
      refKemenag: 'Pedoman Tajwid & Mushaf Al-Qur\'an Standar Indonesia LPMQ Kementerian Agama RI',
      topics: [
        {
          id: 'tajwid-makhraj',
          badge: 'Dasar Pelafalan & Suara',
          title: '1. Makharijul Huruf (5 Tempat Keluar Huruf)',
          summary: 'Mengenal 5 kawasan keluarnya huruf hijaiyah agar pelafalan tepat dan tidak merusak makna ayat Al-Qur\'an.',
          dalil: 'Kaidah Tajwid LPMQ Kemenag RI & Matn Al-Jazariyyah.',
          refKemenag: 'Pedoman Ilmu Tajwid LPMQ Kemenag RI',
          audioExamples: [
            { id: 'aud-makh-halq1', hukum: 'Al-Halq (Tenggorokan Bawah)', huruf: 'ء ، هـ', surah: 112, ayah: 1, quranRef: 'QS. Al-Ikhlas [112]: 1', arab: 'قُلْ هُوَ اللّٰهُ أَحَدٌ', latin: 'Qul huwalloohu ahad-(d) — (Allooh tebal & ء/هـ jelas)', pattern: 'clear', beatText: 'Makhraj tenggorokan bawah + Tafkhim Allooh', tip: 'Rasakan huruf هـ (هُوَ) dari pangkal tenggorokan, أ (أَحَدٌ) tegas, dan lafal اللّٰهُ tebal (Allooh).' },
            { id: 'aud-makh-halq2', hukum: 'Al-Halq (Tenggorokan Tengah)', huruf: 'ع ، ح', surah: 1, ayah: 2, quranRef: 'QS. Al-Fatihah [1]: 2', arab: 'اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ', latin: 'Al-hamdu lillaahi robbil-\'aalamiin', pattern: 'clear', beatText: 'ح pedas bersih • ع tengah tenggorokan • رَ (ro)', tip: 'Bedakan ح (اَلْحَمْدُ) yang pedas bersih, ع (الْعٰلَمِيْنَ) dari tengah tenggorokan, serta huruf رَ dibaca robbi (tebal).' },
            { id: 'aud-makh-syaf', hukum: 'Asy-Syafatan (Dua Bibir)', huruf: 'ف ، ب ، م ، و', surah: 111, ayah: 5, quranRef: 'QS. Al-Masad [111]: 5', arab: 'فِيْ جِيْدِهَا حَبْلٌ مِّنْ مَّسَدٍ', latin: 'Fii jiidihaa hablum-mim-masad-(d)', pattern: 'ghunnah2', beatText: 'Artikulasi bibir ف، ب، م + dengung 2 ketukan', tip: 'Huruf ف menggunakan bibir bawah menyentuh ujung gigi seri atas; ب & م merapatkan kedua bibir.' },
            { id: 'aud-makh-jauf', hukum: 'Al-Jauf (Rongga Mulut)', huruf: 'ا ، وْ ، يْ (Mad)', surah: 11, ayah: 49, wbwWord: 5, quranRef: 'QS. Hud [11]: 49 (Kata ke-5)', arab: 'نُوْحِيْهَا', latin: 'Nuu — hii — haa', pattern: 'mad2', beatText: '2 ketukan tiap vokal panjang', tip: 'Ketiga huruf Mad (وْ، يْ، ا) berbunyi bersih dari rongga mulut tanpa sumbatan hidung.' }
          ],
          syaratRukun: {
            syaratTitle: '3 Kawasan Pertama (Jauf, Halq, Lisan)',
            syarat: [
              '1. Al-Jauf (Rongga Mulut & Tenggorokan): huruf-huruf Mad (ا، وْ، يْ).',
              '2. Al-Halq (Tenggorokan): Bawah (ء هـ), Tengah (ع ح), Atas (غ خ).',
              '3. Al-Lisan (Lidah — 18 huruf): Pangkal (ق ك), Tengah (ج ش ي), Tepi (ض), Ujung (ل ن ر ط د ت ص ز س ظ ذ ث).'
            ],
            rukunTitle: '2 Kawasan Berikutnya (Syafatan & Khaisyum)',
            rukun: [
              '4. Asy-Syafatan (Dua Bibir): ف، ب، م، و.',
              '5. Al-Khaisyum (Pangkal Hidung): tempat keluar suara dengung (ghunnah) pada نّ، مّ، Idgham Bighunnah, Iqlab, dan Ikhfa\'.'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Putar Contoh Suara & Latih dengan Cara Menyukunkan Huruf', desc: 'Tambahkan huruf hamzah berharakat di depannya (أَبْ، أَعْ، أَحْ، أَقْ) lalu rasakan titik berhenti napas atau lidah.' },
            { title: 'Bedakan Huruf Tebal (Isti\'la) & Tipis', desc: 'Huruf خ ص ض غ ط ق ظ selalu dibaca tebal (lidah belakang terangkat).' }
          ],
          warnings: ['Mengubah huruf satu ke huruf lain (seperti عَلِيْمٌ menjadi أَلِيْمٌ) mengubah makna ayat secara fatal (lahn jaliy).']
        },
        {
          id: 'tajwid-nun',
          badge: '🎧 Studio Suara Nun Mati',
          title: '2. Hukum Nun Sukun (نْ) & Tanwin (ـً ـٍ ـٌ)',
          summary: 'Lima kaidah utama Nun Sukun/Tanwin beserta contoh suara nyata untuk membedakan bacaan JELAS (Idzhar), MELEBUR (Idgham), MEMBALIK (Iqlab), dan SAMAR MENDENGUNG (Ikhfa\').',
          dalil: 'Kaidah LPMQ Kemenag RI tentang Ahkamun Nunis Sakinah wat-Tanwin.',
          refKemenag: 'Pedoman Tajwid Al-Qur\'an Standar Indonesia LPMQ Kemenag RI',
          audioExamples: [
            { id: 'aud-nun-idzhar', hukum: 'Idzhar Halqi (Jelas Tanpa Dengung)', huruf: 'ء هـ ع ح غ خ', surah: 108, ayah: 2, quranRef: 'QS. Al-Kautsar [108]: 2', arab: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ', latin: 'Fasholli lirobbika wan-har (Fokus: وَانْحَرْ نْ + ح)', pattern: 'clear', beatText: 'Cepat 1 ketukan (JELAS N, tanpa dengung)', tip: 'Suara huruf N pada وَانْحَرْ terdengar terang dan langsung berpindah ke ح tanpa ditahan dengung.' },
            { id: 'aud-nun-idgham1', hukum: 'Idgham Bighunnah (Melebur + Dengung)', huruf: 'ي ن م و', surah: 99, ayah: 7, quranRef: 'QS. Az-Zalzalah [99]: 7', arab: 'فَمَنْ يَّعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَّرَهُ', latin: 'Famay-ya\'mal mitsqoola dzarrotin khoiroy-yaroh', pattern: 'ghunnah2', beatText: 'Tahan dengung hidung 2 ketukan', tip: 'Bunyi N hilang melebur masuk ke ي pada مَنْ يَّعْمَلْ dan خَيْرًا يَّرَهُ sambil mendengung lembut 2 harakat.' },
            { id: 'aud-nun-idgham2', hukum: 'Idgham Bilaghunnah (Melebur Tanpa Dengung)', huruf: 'ل ، ر', surah: 107, ayah: 4, quranRef: 'QS. Al-Ma\'un [107]: 4', arab: 'فَوَيْلٌ لِّلْمُصَلِّيْنَ', latin: 'Fawailul-lilmusholliin', pattern: 'clear', beatText: '1 ketukan lebur langsung (TANPA dengung)', tip: 'Tanwin pada فَوَيْلٌ langsung berubah total melebur menjadi L bertasydid tanpa suara dengung hidung.' },
            { id: 'aud-nun-iqlab', hukum: 'Iqlab (Berubah Mim + Dengung)', huruf: 'ب', surah: 104, ayah: 4, quranRef: 'QS. Al-Humazah [104]: 4', arab: 'كَلَّا ۖ لَيُنْبَذَنَّ فِي الْحُطَمَةِ', latin: 'Kallaa layumbadzanna fil-huthomah (Fokus: لَيُنْبَذَنَّ)', pattern: 'ghunnah2', beatText: 'Ubah ke M + dengung 2 ketukan', tip: 'Bunyi نْ berubah menjadi M ringan (bibir merapat lembut tanpa ditekan keras) 2 ketukan sebelum ب.' },
            { id: 'aud-nun-ikhfa', hukum: 'Ikhfa\' Haqiqi (Samar-Samar + Dengung)', huruf: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك', surah: 113, ayah: 2, quranRef: 'QS. Al-Falaq [113]: 2', arab: 'مِنْ شَرِّ مَا خَلَقَ', latin: 'Ming-syarri maa kholaq', pattern: 'ghunnah2', beatText: 'Samar + tahan dengung 2 ketukan', tip: 'Posisi lidah mengambang samar mendekati huruf ش sambil mendengung 2 ketukan, dan رِّ tipis (syarri).' }
          ],
          quiz: {
            title: 'Latihan Cepat Tebak Hukum Nun Sukun',
            question: 'Perhatikan bacaan: مَنْ خَوْفٍ (Man khaufin). Nun sukun bertemu huruf خ termasuk hukum bacaan apa?',
            options: [
              { text: 'Idzhar Halqi (dibaca jelas tanpa dengung).', correct: true },
              { text: 'Ikhfa\' Haqiqi (dibaca samar mendengung).', correct: false },
              { text: 'Iqlab (diubah menjadi suara mim).', correct: false }
            ],
            explain: 'Huruf خ termasuk 6 huruf tenggorokan (ء هـ ع ح غ خ), sehingga مَنْ خَوْفٍ wajib dibaca jelas Idzhar Halqi tanpa dengung.'
          },
          syaratRukun: {
            syaratTitle: 'Idzhar, Idgham Bighunnah & Bilaghunnah',
            syarat: [
              '1. IDZHAR HALQI (Jelas): ء هـ ع ح غ خ — tanpa dengung.',
              '2. IDGHAM BIGHUNNAH (Melebur Dengung 2 ketukan): ي ن م و (berbeda kata).',
              '3. IDGHAM BILAGHUNNAH (Melebur Tanpa Dengung): ل ر.'
            ],
            rukunTitle: 'Iqlab, Ikhfa\' & Idzhar Muthlaq',
            rukun: [
              '4. IQLAB (Berubah M + Dengung 2 ketukan): bertemu ب.',
              '5. IKHFA\' HAQIQI (Samar Dengung 2 ketukan): bertemu 15 huruf sisa.',
              'Catatan Idzhar Muthlaq: Jika نْ + و/ي berada dalam 1 kata (اَلدُّنْيَا، بُنْيَانٌ), dibaca JELAS tidak melebur!'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Klik Putar Contoh Suara di Studio Tajwid di Atas', desc: 'Bandingkan langsung perbedaan ketukan antara Idzhar (1 ketuk cepat), Iqlab, Ikhfa\', dan Idgham Bighunnah (2 ketukan dengung).' },
            { title: 'Amati Tanda Mushaf Kemenag', desc: 'Pada Mushaf Standar Kemenag: Nun Sukun bertanda sukun di atas ن menandakan Idzhar; tanpa sukun menandakan Idgham/Ikhfa\'; tanda م kecil di atas ن menandakan Iqlab.' }
          ],
          warnings: ['Jangan terbiasa mendengungkan Idzhar atau memanjangkan Iqlab melebihi batas 2–3 harakat wajar.']
        },
        {
          id: 'tajwid-mim',
          badge: '🎧 Studio Suara Mim Mati',
          title: '3. Hukum Mim Sukun (مْ) & Ghunnah',
          summary: 'Aturan bacaan apabila huruf Mim bertanda sukun bertemu huruf hijaiyah (Ikhfa Syafawi, Idgham Mimi, Idzhar Syafawi) beserta Mim/Nun bertasydid.',
          dalil: 'Tuhfatul Athfal & Kaidah Tajwid LPMQ Kemenag RI.',
          refKemenag: 'Pedoman Tajwid Al-Qur\'an Standar Indonesia LPMQ Kemenag RI',
          audioExamples: [
            { id: 'aud-mim-ikhfa', hukum: 'Ikhfa\' Syafawi', huruf: 'ب', surah: 105, ayah: 4, quranRef: 'QS. Al-Fil [105]: 4', arab: 'تَرْمِيْهِمْ بِحِجَارَةٍ مِّنْ سِجِّيْلٍ', latin: 'Tarmiihim-bihijaarotim-ming-sijjiil', pattern: 'ghunnah2', beatText: 'Tahan bibir dengung 2 ketukan', tip: 'Saat مْ bertemu ب (تَرْمِيْهِمْ بِـ), rapatkan bibir lembut dengan dengung hidung 2 ketukan.' },
            { id: 'aud-mim-idgham', hukum: 'Idgham Mimi (Mutamatsilain)', huruf: 'م', surah: 104, ayah: 8, quranRef: 'QS. Al-Humazah [104]: 8', arab: 'إِنَّهَا عَلَيْهِمْ مُّؤْصَدَةٌ', latin: 'Innahaa \'alaihim-mu\'shodah', pattern: 'ghunnah2', beatText: 'Lebur jadi M tasydid + dengung 2 ketukan', tip: 'Dua huruf Mim (عَلَيْهِمْ مُّؤْصَدَةٌ) melebur menjadi satu Mim bertasydid disertai dengung.' },
            { id: 'aud-mim-idzhar', hukum: 'Idzhar Syafawi (Jelas Bibir)', huruf: '26 huruf selain م & ب', surah: 109, ayah: 6, quranRef: 'QS. Al-Kafirun [109]: 6', arab: 'لَكُمْ دِيْنُكُمْ وَلِيَ دِيْنِ', latin: 'Lakum diinukum wa liya diin', pattern: 'clear', beatText: '1 ketukan tegas JELAS tanpa dengung', tip: 'Perhatikan دِيْنُكُمْ وَلِيَ — saat مْ bertemu و, pastikan bunyi M putus jelas di bibir tanpa dengung!' },
            { id: 'aud-mim-ghunnah', hukum: 'Ghunnah Musyaddadah', huruf: 'نّ ، مّ', surah: 78, ayah: 1, quranRef: 'QS. An-Naba [78]: 1', arab: 'عَمَّ يَتَسَاءَلُوْنَ', latin: '\'Amma yatasaa-aluun', pattern: 'ghunnah2', beatText: 'Tahan dengung 2 ketukan', tip: 'Setiap نّ dan مّ bertasydid (seperti عَمَّ) wajib berdengung sempurna 2 ketukan.' }
          ],
          syaratRukun: {
            syaratTitle: '3 Hukum Mim Sukun (مْ)',
            syarat: [
              '1. IKHFA\' SYAFAWI: bertemu ب (samar di bibir + dengung 2 ketukan).',
              '2. IDGHAM MIMI: bertemu م (melebur + dengung 2 ketukan).',
              '3. IDZHAR SYAFAWI: bertemu 26 huruf lain (JELAS tanpa dengung).'
            ],
            rukunTitle: 'Ghunnah Wajib',
            rukun: [
              'Huruf نّ dan مّ bertasydid disebut Ghunnah Musyaddadah dengan dengung sempurna 2 ketukan.'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Putar Audio & Bandingkan Ketiganya', desc: 'Hanya 2 huruf yang membuat مْ mendengung: Ba\' dan Mim.' },
            { title: 'Latih Surat Al-Fatihah Ayat 7 (عَلَيْهِمْ غَيْرِ / عَلَيْهِمْ وَلَا)', desc: 'Pastikan Idzhar Syafawi pada أَنْعَمْتَ عَلَيْهِمْ terucap jelas tanpa terseret dengung.' }
          ],
          warnings: ['Jangan sampai bunyi Idzhar Syafawi sebelum و atau ف terdengar samar atau mendengung!']
        },
        {
          id: 'tajwid-mad-qalqalah',
          badge: '🎧 Studio Suara Mad & Qalqalah',
          title: '4. Hukum Mad (Panjang) & Qalqalah',
          summary: 'Menjaga takaran panjang harakat (2, 4–5, hingga 6 ketukan) serta memantulkan 5 huruf Qalqalah dengan contoh suara & metronom.',
          dalil: 'Standar Bacaan Hafsh \'an \'Ashim pada Mushaf LPMQ Kemenag RI.',
          refKemenag: 'Pedoman Tajwid LPMQ Kementerian Agama RI',
          audioExamples: [
            { id: 'aud-mad-2', hukum: 'Mad Thabi\'i (Asli)', huruf: 'ـَ ا • ـِ يْ • ـُ وْ', surah: 11, ayah: 49, wbwWord: 5, quranRef: 'QS. Hud [11]: 49 (Kata ke-5)', arab: 'نُوْحِيْهَا', latin: 'Nuu — hii — haa (masing-masing 2 ketukan)', pattern: 'mad2', beatText: 'Tahan rata 2 ketukan (1 Alif)', tip: 'Jangan memendekkan vokal 2 harakat atau melebihi porsinya.' },
            { id: 'aud-mad-5', hukum: 'Mad Wajib Muttashil', huruf: 'Mad + Hamzah (ء)', surah: 110, ayah: 1, quranRef: 'QS. An-Nashr [110]: 1', arab: 'إِذَا جَاءَ نَصْرُ اللّٰهِ وَالْفَتْحُ', latin: 'Idzaa jaaaaa-a nashrulloohi wal-fath', pattern: 'mad5', beatText: 'Panjang 4–5 ketukan (جَاءَ)', tip: 'Huruf Mad bertemu Hamzah dalam satu kata (جَاءَ) ditahan ±4–5 ketukan; perhatikan pula lafal نَصْرُ اللّٰهِ (ro tebal + Allooh tebal).' },
            { id: 'aud-mad-6', hukum: 'Mad Lazim Mutsaqqal Kalimi', huruf: 'Mad + Tasydid', surah: 1, ayah: 7, quranRef: 'QS. Al-Fatihah [1]: 7', arab: 'صِرَاطَ الَّذِيْنَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوْبِ عَلَيْهِمْ وَلَا الضَّالِّيْنَ', latin: 'Shiroothol-ladziina an\'amta \'alaihim ... wa ladh-dhaaaaaalliiin', pattern: 'mad6', beatText: 'Panjang penuh 6 ketukan di وَلَا الضَّالِّيْنَ!', tip: 'Tahan penuh 6 ketukan pada الضَّآ sebelum menekan tasydid huruf لّ berikutnya.' },
            { id: 'aud-qal', hukum: 'Qalqalah Kubra & Lafal Allooh', huruf: 'ق ط ب ج د', surah: 112, ayah: 1, quranRef: 'QS. Al-Ikhlas [112]: 1', arab: 'قُلْ هُوَ اللّٰهُ أَحَدٌ', latin: 'Qul huwalloohu ahad-(d)', pattern: 'qalqalah', beatText: 'Pantulan mantap di akhir أَحَدْ!', tip: 'Dengarkan Qari membaca هُوَ اللّٰهُ (Allooh tebal tafkhim) dan memantulkan huruf د akhir secara tegas.' }
          ],
          syaratRukun: {
            syaratTitle: 'Takaran Panjang Mad',
            syarat: [
              'Mad Thabi\'i: 2 harakat • Mad Wajib Muttashil: 4–5 harakat • Mad Jaiz Munfashil: 4–5 harakat (atau 2 pada jalur Qashr).',
              'Mad \'Aridh Lissukun (berhenti): boleh memilih konsisten 2, 4, atau 6 harakat.',
              'Mad Lazim Kalimi/Harfi (وَلَا الضَّالِّيْنَ / الم): wajib 6 harakat penuh.'
            ],
            rukunTitle: '5 Huruf Qalqalah (ق ط ب ج د)',
            rukun: [
              'Qalqalah Sugra: sukun asli di tengah kata/kalimat.',
              'Qalqalah Kubra: mati karena waqaf (berhenti di akhir ayat).'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Samakan Ketukan dengan Metronom Visualizer', desc: 'Tekan tombol Putar Suara dan perhatikan titik kuning menyala 2 ketukan, 5 ketukan, vs 6 ketukan.' },
            { title: 'Latih QS. Al-Ikhlas untuk Qalqalah Kubra', desc: 'Setiap akhir ayat 1–4 berujung huruf د sehingga wajib dipantulkan tegas dan netral.' }
          ],
          warnings: ['Jangan memantulkan huruf selain ق ط ب ج د (misal memantulkan huruf لْ، نْ، مْ).']
        },
        {
          id: 'tajwid-lam-waqaf',
          badge: '🎧 Studio Suara Lam Ta\'rif & Waqaf',
          title: '5. Lam Ta\'rif (Al-) & Tanda-Tanda Waqaf',
          summary: 'Membedakan Al-Qamariyah vs Al-Syamsiyah serta mengenal tanda waqaf resmi pada Mushaf Al-Qur\'an Standar Indonesia.',
          dalil: 'Kaidah Penulisan & Tanda Baca Mushaf Al-Qur\'an Standar Indonesia Kemenag RI.',
          refKemenag: 'Lajnah Pentashihan Mushaf Al-Qur\'an (LPMQ) Kemenag RI',
          audioExamples: [
            { id: 'aud-lam-qam', hukum: 'Al-Qamariyah (Lam Dibaca Jelas)', huruf: 'ا ب غ ح ج ك و خ ف ع ق ي م هـ', surah: 1, ayah: 2, quranRef: 'QS. Al-Fatihah [1]: 2', arab: 'اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ', latin: 'AL-hamdu lillaahi robbil-\'aalamiin', pattern: 'clear', beatText: 'Bunyi "AL" jelas + tanda sukun', tip: 'Huruf ال pada اَلْحَمْدُ dan الْعٰلَمِيْنَ dibaca terang "AL", sedangkan لِلّٰهِ dibaca tipis & رَبِّ dibaca robbi.' },
            { id: 'aud-lam-syam', hukum: 'Al-Syamsiyah (Melebur Tasydid)', huruf: 'ت ث د ذ ر ز س ش ص ض ط ظ ل ن', surah: 91, ayah: 1, quranRef: 'QS. Asy-Syams [91]: 1', arab: 'وَالشَّمْسِ وَضُحٰهَا', latin: 'Wasy-syamsi wa dhuhaahaa', pattern: 'clear', beatText: 'Langsung masuk ke tasydid (L hilang)', tip: 'Huruf ل tidak dibaca pada وَالشَّمْسِ; suara langsung melompat menekan tasydid ش.' }
          ],
          syaratRukun: {
            syaratTitle: 'Al-Qamariyah vs Al-Syamsiyah',
            syarat: [
              'Alif Lam Qamariyah: huruf ال dibaca terang "AL" dan bertanda sukun di mushaf.',
              'Alif Lam Syamsiyah: huruf ال melebur ke tasydid huruf setelahnya.'
            ],
            rukunTitle: '6 Tanda Waqaf Mushaf Standar Kemenag',
            rukun: [
              'مـ (Waqaf Lazim): Wajib berhenti • قلى: Lebih baik berhenti • صلى: Lebih baik terus.',
              'ج (Jaiz): Boleh berhenti/terus • لا: Dilarang berhenti • ۛ ۛ (Mu\'anaqah): Berhenti salah satu titik tiga.'
            ]
          },
          prayers: [],
          steps: [
            { title: 'Cek Tanda Sukun vs Tasydid', desc: 'Di Mushaf Kemenag, Qamariyah selalu ditandai sukun pada ل, sementara Syamsiyah ditandai tasydid pada huruf ke-3.' },
            { title: 'Sukunkan Huruf Akhir Saat Waqaf', desc: 'Kecuali tanwin fathah (ـًا) dibaca 2 harakat Mad \'Iwadh, serta Ta\' Marbuthah (ة) berubah menjadi bunyi هـ sukun.' }
          ],
          warnings: ['Jika terpaksa berhenti karena kehabisan napas di tanda لا, ulangi bacaan dari 1–2 kata sebelumnya agar makna ayat sempurna.']
        }
      ]
    }
  ]);

  function loadDoneMap() {
    try {
      const raw = localStorage.getItem(DONE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveDoneMap(map) {
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(map || {}));
    } catch (e) {
      /* abaikan bila storage tidak tersedia */
    }
  }

  function formatRp(num) {
    const n = Math.round(Math.max(0, Number(num) || 0));
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  let searchQuery = '';
  let zakatSimTab = 'fitrah';
  let stepperState = {};
  let jenazahGender = 'L';
  let manasikMode = 'tamattu';
  let manasikIdx = 0;

  function navigateTo(catId = '', topicId = '') {
    clearAudioTimers();
    let targetHash = '#belajar';
    if (catId && topicId) {
      targetHash = `#belajar?cat=${encodeURIComponent(catId)}&topic=${encodeURIComponent(topicId)}`;
    } else if (catId) {
      targetHash = `#belajar?cat=${encodeURIComponent(catId)}`;
    }
    if (window.location.hash === targetHash) {
      render();
    } else {
      window.location.hash = targetHash;
    }
  }

  function countDoneInCategory(cat, doneMap) {
    return (cat.topics || []).filter((t) => Boolean(doneMap[t.id])).length;
  }

  /* -------------------- KOMPONEN SIMULASI INTERAKTIF -------------------- */
  function renderInteractiveStepper(topic) {
    if (!topic.stepperTitle || !topic.steps || !topic.steps.length) return '';
    const curIdx = Math.min(topic.steps.length - 1, Math.max(0, Number(stepperState[topic.id] || 0)));
    const pct = Math.round(((curIdx + 1) / topic.steps.length) * 100);
    const step = topic.steps[curIdx];
    return `
      <div class="prak-sim-card" id="prak-stepper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div>
            <span class="tag tag-emerald">Mode Simulasi Praktikum</span>
            <h3 style="margin:6px 0 0;">${escapeHtml(topic.stepperTitle)}</h3>
          </div>
          <span class="tag tag-gold">Langkah ${curIdx + 1} / ${topic.steps.length} (${pct}%)</span>
        </div>
        <div class="prak-sim-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="prak-sim-progress-fill" style="width:${pct}%;"></div>
        </div>
        <div class="prak-step-item" style="margin-bottom:12px;">
          <div class="prak-step-num">${curIdx + 1}</div>
          <div class="prak-step-body">
            <h4>${escapeHtml(step.title)}</h4>
            <p>${escapeHtml(step.desc)}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-sim-step-prev" ${curIdx === 0 ? 'disabled' : ''}>◀ Sebelumnya</button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-sim-step-reset">🔄 Ulangi</button>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-sim-step-next">
            ${curIdx < topic.steps.length - 1 ? 'Langkah Berikutnya ▶' : '✓ Simulasi Selesai (Ulang)'}
          </button>
        </div>
      </div>
    `;
  }

  function bindInteractiveStepper(topic) {
    if (!topic.stepperTitle || !topic.steps || !topic.steps.length) return;
    const prevBtn = document.getElementById('btn-sim-step-prev');
    const resetBtn = document.getElementById('btn-sim-step-reset');
    const nextBtn = document.getElementById('btn-sim-step-next');
    const curIdx = Number(stepperState[topic.id] || 0);

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stepperState[topic.id] = Math.max(0, curIdx - 1);
        render();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        stepperState[topic.id] = 0;
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (curIdx < topic.steps.length - 1) {
          stepperState[topic.id] = curIdx + 1;
        } else {
          stepperState[topic.id] = 0;
          if (showToast) showToast('Simulasi selesai! Silakan ulangi atau tandai topik ini sudah dipelajari.');
        }
        render();
      });
    }
  }

  function renderJenazahGenderSimulator() {
    const isMale = jenazahGender !== 'P';
    const kafanInfo = isMale
      ? '3 Helai Kain Kafan Pembungkus Putih Polos Sejajar'
      : '5 Helai Kain: Sarung (Basahan), Baju Kurung, Kerudung, + 2 Lembar Pembungkus Luar';
    const posisiImam = isMale
      ? 'Imam berdiri SEJAJAR KEPALA jenazah'
      : 'Imam berdiri SEJAJAR PINGGANG / PERUT jenazah';
    const arabNiat = isMale
      ? 'أُصَلِّيْ عَلَى هٰذَا الْمَيِّتِ أَرْبَعَ تَكْبِيْرَاتٍ فَرْضَ كِفَايَةٍ مَأْمُوْمًا لِلّٰهِ تَعَالَى'
      : 'أُصَلِّيْ عَلَى هٰذِهِ الْمَيِّتَةِ أَرْبَعَ تَكْبِيْرَاتٍ فَرْضَ كِفَايَةٍ مَأْمُوْمًا لِلّٰهِ تَعَالَى';
    const arabTakbir3 = isMale
      ? 'اللّٰهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ'
      : 'اللّٰهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَعَافِهَا وَاعْفُ عَنْهَا';
    const spokenSample = isMale
      ? 'Haadzal mayyiti, Allaahummaghfir lahu warhamhu wa aafihi wa\'fu anhu'
      : 'Haadzihil mayyitati, Allaahummaghfir lahaa warhamhaa wa aafihaa wa\'fu anhaa';

    return `
      <div class="prak-sim-card" id="jenazah-gender-sim">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <span class="tag tag-violet">⚰️ Simulator Interaktif Jenazah (Standar Kemenag RI)</span>
            <h3 style="margin:6px 0 0;">Uji Perbedaan Posisi Imam, Kafan &amp; Bacaan Doa</h3>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn-sm ${isMale ? 'btn-primary' : 'btn-outline'}" data-jnz-gender="L">👨 Jenazah Laki-laki</button>
            <button type="button" class="btn btn-sm ${!isMale ? 'btn-primary' : 'btn-outline'}" data-jnz-gender="P">👩 Jenazah Perempuan</button>
          </div>
        </div>

        <div class="prak-diagram-box" style="margin-bottom:12px;">
          <div class="prak-diagram-node is-kiblat">🕋 ARAH KIBLAT</div>
          <div class="prak-diagram-node" style="flex:1;min-width:170px;">
            ${isMale ? 'Jenazah Laki-laki: <strong>Kepala di Kiri (Utara/Selatan sesuai kiblat)</strong>' : 'Jenazah Perempuan: <strong>Pinggang lurus di depan Imam</strong>'}
          </div>
          <div class="prak-diagram-node is-imam">🕌 ${posisiImam}</div>
          <div class="prak-diagram-node">Shaf Makmum (≥3 baris)</div>
        </div>

        <div class="grid grid-2" style="margin-bottom:10px;">
          <div class="callout" style="margin:0;">
            <strong>🧵 Kain Kafan Sunnah:</strong>
            <div style="margin-top:4px;font-size:13.3px;">${kafanInfo}</div>
          </div>
          <div class="callout callout-emerald" style="margin:0;">
            <strong>📍 Kata Ganti Bacaan (Dhamir):</strong>
            <div style="margin-top:4px;font-size:13.3px;">
              ${isMale ? 'Pakai <strong>هٰذَا الْمَيِّتِ</strong> dan <strong>لَهُ / هُ (-hu)</strong> untuk laki-laki.' : 'Pakai <strong>هٰذِهِ الْمَيِّتَةِ</strong> dan <strong>لَهَا / هَا (-haa)</strong> untuk perempuan.'}
            </div>
          </div>
        </div>

        <div class="prak-arab-card" style="margin-bottom:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="tag tag-emerald">${isMale ? 'Bacaan Untuk Jenazah Laki-laki' : 'Bacaan Untuk Jenazah Perempuan'} • Syaikh Hamad</span>
            <button type="button" class="prak-audio-btn" id="btn-jnz-play-audio" data-default-label="🔊 Putar Suara Asli" data-arab="${escapeHtml(arabTakbir3)}" data-spoken="${escapeHtml(spokenSample)}">🔊 Putar Suara Asli</button>
          </div>
          <div class="prak-arab-text">${arabNiat}<br/>${arabTakbir3}</div>
          <small style="color:var(--slate-700);">Klik tombol gender di atas untuk langsung melihat perubahan otomatis bacaan &amp; diagram shalat jenazah.</small>
        </div>
      </div>
    `;
  }

  function renderManasikSimulator() {
    const isUmrah = manasikMode === 'umrah';
    const track = isUmrah
      ? [
          { title: '1. Miqat Makani', badge: 'Ihram Aktif', desc: 'Mandi sunnah, pakai kain ihram, lafalkan niat Umrah di Miqat (misal Bir Ali / Yalamlam), lalu perbanyak Talbiyah sepanjang jalan.' },
          { title: '2. Masjidil Haram (Thawaf 7×)', badge: 'Ka\'bah Di Kiri', desc: 'Suci berwudhu, mulai sejajar Hajar Aswad 7 putaran berlawanan jarum jam tanpa memotong dalam Hijr Ismail, lalu shalat 2 rakaat Maqam Ibrahim.' },
          { title: '3. Bukit Shafa–Marwah (Sa\'i 7×)', badge: 'Berakhir Di Marwah', desc: 'Mulai di Shafa (1) menuju Marwah (2) hingga lintasan ke-7 berakhir di Marwah; laki-laki lari kecil di area lampu hijau.' },
          { title: '4. Tahallul (Cukur Rambut)', badge: 'Larangan Ihram Gugur', desc: 'Memotong/mencukur rambut minimal 3 helai (halq lebih utama bagi laki-laki). Rangkaian Umrah selesai dan kembali halal.' }
        ]
      : [
          { title: '1. Miqat & Umrah Awal (Tamattu\')', badge: 'Masuk Makkah', desc: 'Berihram Umrah dari Miqat, Thawaf, Sa\'i, & Tahallul; lalu menanti tanggal 8 Dzulhijjah dalam keadaan tidak terikat larangan ihram.' },
          { title: '2. 8 Dzulhijjah (Tarwiyah di Mina)', badge: 'Ihram Haji Aktif', desc: 'Mengenakan kain ihram kembali dengan niat Haji dari Makkah menuju perkemahan Mina untuk bermalam (sunnah).' },
          { title: '3. 9 Dzulhijjah (Wukuf Arafah)', badge: 'Rukun Utama Haji', desc: 'Berada di Padang Arafah sejak Dzuhur hingga terbenam matahari. Shalat Dzuhur+Ashar Jama\' Taqdim Qashar dan berdoa khusyuk.' },
          { title: '4. Malam 10 Dzulhijjah (Mabit Muzdalifah)', badge: 'Ambil Kerikil', desc: 'Singgah malam di Muzdalifah sehabis Maghrib hingga melewati tengah malam sambil mengumpulkan kerikil kecil.' },
          { title: '5. 10 Dzulhijjah (Jumrah Aqabah & Tahallul Awal)', badge: 'Mina & Sembelih Dam', desc: 'Melontar Jumrah Aqabah 7 kerikil, membayar Dam Tamattu\'/Hadyu, & mencukur rambut; dilanjutkan ke Makkah untuk Thawaf Ifadhah & Sa\'i.' },
          { title: '6. 11–13 Dzulhijjah (Hari Tasyrik & Thawaf Wada\')', badge: 'Sempurna Manasik', desc: 'Mabit Mina & melontar 3 Jumrah (Ula, Wustha, Aqabah masing-masing 7 kerikil). Sebelum pulang tinggalkan Makkah, kerjakan Thawaf Wada\'.' }
        ];
    const safeIdx = Math.min(track.length - 1, Math.max(0, manasikIdx));
    const cur = track[safeIdx];

    return `
      <div class="prak-sim-card" id="manasik-sim-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <span class="tag tag-rose">🕋 Simulator Rute &amp; Urutan Manasik Kemenag RI</span>
            <h3 style="margin:6px 0 0;">Telusuri Tahapan Ibadah Umrah vs Haji Tamattu'</h3>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn-sm ${!isUmrah ? 'btn-primary' : 'btn-outline'}" data-manasik-mode="tamattu">Haji Tamattu'</button>
            <button type="button" class="btn btn-sm ${isUmrah ? 'btn-primary' : 'btn-outline'}" data-manasik-mode="umrah">Ibadah Umrah</button>
          </div>
        </div>
        <div class="manasik-pill-row">
          ${track.map((item, i) => `<button type="button" class="manasik-step-pill ${i === safeIdx ? 'active' : ''}" data-manasik-idx="${i}">${escapeHtml(item.title)}</button>`).join('')}
        </div>
        <div class="callout callout-emerald" style="margin:0;">
          <span class="tag tag-gold" style="margin-bottom:6px;display:inline-block;">${escapeHtml(cur.badge)}</span>
          <h4 style="margin:2px 0 6px;">${escapeHtml(cur.title)}</h4>
          <p style="margin:0;font-size:13.8px;color:var(--slate-800);">${escapeHtml(cur.desc)}</p>
        </div>
      </div>
    `;
  }

  function renderAudioStudio(examples) {
    if (!Array.isArray(examples) || !examples.length) return '';
    const dotCount = (pattern) => (pattern === 'mad6' ? 6 : pattern === 'mad5' ? 5 : pattern === 'mad2' || pattern === 'ghunnah2' || pattern === 'qalqalah' ? 2 : 1);
    return `
      <div class="prak-sim-card" style="border-color:#7dd3fc;background:linear-gradient(135deg,#ffffff 0%,#f0f9ff 100%);">
        <span class="tag tag-sky">🎙️ Studio Suara Qari Asli &amp; Ketukan Tajwid LPMQ Kemenag RI</span>
        <h3 style="margin:8px 0 4px;">Dengarkan Bacaan Qari Murottal Asli &amp; Durasi Harakat Secara Langsung</h3>
        <p style="margin:0 0 8px;font-size:13.3px;color:var(--slate-700);">
          Klik <strong>🔊 Putar Suara Qari</strong> untuk mendengar langsung suara manusia Qari murottal (tajwid, harakat panjang-pendek, Allooh tebal/tipis, &amp; huruf Ro fasih sesuai kaidah) beserta indikator ketukan sinkron.
        </p>
        <div class="prak-studio-toolbar no-print">
          <div class="prak-studio-controls">
            <label for="tajwid-qari-select" style="font-size:12.2px;font-weight:700;color:var(--slate-700);">🎙️ Qari:</label>
            <select id="tajwid-qari-select" class="select" style="width:auto;min-height:34px;padding:4px 10px;font-size:12.5px;">
              ${QARI_RECITERS.map((q) => `<option value="${escapeHtml(q.id)}" ${selectedQari === q.id ? 'selected' : ''}>${escapeHtml(q.label)}</option>`).join('')}
            </select>
          </div>
          <div class="prak-studio-controls">
            <button type="button" class="btn btn-sm ${selectedRate === 1.0 ? 'btn-primary' : 'btn-outline'}" data-tajwid-rate="1">▶️ 1.0× Normal</button>
            <button type="button" class="btn btn-sm ${selectedRate === 0.85 ? 'btn-primary' : 'btn-outline'}" data-tajwid-rate="0.85">🐢 0.85× Pelan</button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-tajwid-stop">⏹ Hentikan</button>
          </div>
        </div>
        <div class="prak-audio-grid">
          ${examples
            .map((ex) => {
              const dots = Array.from({ length: dotCount(ex.pattern) })
                .map(() => `<span class="prak-beat-dot"></span>`)
                .join('');
              return `<div class="prak-audio-card" id="${escapeHtml(ex.id)}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;flex-wrap:wrap;">
                  <span class="tag tag-emerald">${escapeHtml(ex.hukum)}</span>
                  <span class="tag tag-gold" style="font-size:11px;">Huruf: ${escapeHtml(ex.huruf)}</span>
                </div>
                ${ex.quranRef ? `<div style="margin-top:2px;"><span class="prak-audio-ref">📖 ${escapeHtml(ex.quranRef)}</span></div>` : ''}
                <div class="prak-arab-text" style="font-size:24px;margin:2px 0;">${escapeHtml(ex.arab)}</div>
                <div style="font-size:13.2px;font-weight:700;color:var(--emerald-900);font-style:italic;">${escapeHtml(ex.latin)}</div>
                <small style="color:var(--slate-600);line-height:1.45;">${escapeHtml(ex.tip)}</small>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px;">
                  <div>
                    <small style="display:block;font-weight:700;color:var(--slate-700);font-size:11.5px;">⏱️ ${escapeHtml(ex.beatText)}</small>
                    <div class="prak-beat-bar">${dots}</div>
                  </div>
                  <button type="button" class="prak-audio-btn" data-play-tajwid="${escapeHtml(ex.id)}">🔊 Putar Suara Qari</button>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  function renderScenarioQuiz(quiz) {
    if (!quiz) return '';
    return `
      <div class="card" style="margin-bottom:18px;border-color:#c4b5fd;background:linear-gradient(135deg,#ffffff 0%,#f5f3ff 100%);" id="prak-quiz-card">
        <span class="tag tag-violet">🎯 Mini Simulasi Uji Pemahaman</span>
        <h3 style="margin:8px 0 6px;">${escapeHtml(quiz.title)}</h3>
        <p style="margin:0;font-size:14px;font-weight:600;color:var(--slate-900);">${escapeHtml(quiz.question)}</p>
        <div class="prak-quiz-opts">
          ${(quiz.options || [])
            .map(
              (opt, idx) => `<button type="button" class="prak-quiz-opt" data-quiz-idx="${idx}">${String.fromCharCode(65 + idx)}. ${escapeHtml(opt.text)}</button>`
            )
            .join('')}
        </div>
        <div id="prak-quiz-feedback" class="callout" style="margin-top:12px;" hidden></div>
      </div>
    `;
  }

  function bindScenarioQuiz(quiz) {
    if (!quiz) return;
    const opts = container.querySelectorAll('[data-quiz-idx]');
    const fb = document.getElementById('prak-quiz-feedback');
    opts.forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = Number(btn.getAttribute('data-quiz-idx'));
        opts.forEach((o, i) => {
          o.classList.remove('is-right', 'is-wrong');
          if (quiz.options[i] && quiz.options[i].correct) o.classList.add('is-right');
          else if (i === picked) o.classList.add('is-wrong');
        });
        if (fb) {
          const isOk = Boolean(quiz.options[picked] && quiz.options[picked].correct);
          fb.className = `callout ${isOk ? 'callout-emerald' : 'callout-gold'}`;
          fb.innerHTML = `<strong>${isOk ? '✅ Tepat Sekali!' : '💡 Kurang Tepat — Mari Pahami Kaidahnya:'}</strong><div style="margin-top:4px;font-size:13.5px;">${escapeHtml(quiz.explain)}</div>`;
          fb.hidden = false;
        }
      });
    });
  }

  function renderZakatSimulatorSection() {
    return `
      <div class="card zakat-sim-panel" style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="tag tag-gold">🧮 Laboratorium Simulasi Zakat Interaktif (Standar BAZNAS / Kemenag RI)</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-zsim-preset-fitrah">Contoh Keluarga 5 Jiwa</button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-zsim-preset-profesi">Contoh Gaji 10 Jt</button>
          </div>
        </div>
        <h3 style="margin:8px 0 6px;">Hitung Zakat Fitrah, Profesi &amp; Zakat Maal Secara Otomatis</h3>
        <p style="margin:0 0 12px;font-size:13.5px;color:var(--slate-700);">
          Seluruh perhitungan hanya diproses secara lokal dan aman pada perangkat Anda mengikuti acuan 85 gram emas BAZNAS &amp; Kemenag RI.
        </p>

        <div class="tabs no-print" style="margin-bottom:14px;">
          <button type="button" class="tab-btn ${zakatSimTab === 'fitrah' ? 'active' : ''}" data-zsim-tab="fitrah">🌾 Zakat Fitrah</button>
          <button type="button" class="tab-btn ${zakatSimTab === 'profesi' ? 'active' : ''}" data-zsim-tab="profesi">💼 Zakat Profesi / Gaji</button>
          <button type="button" class="tab-btn ${zakatSimTab === 'maal' ? 'active' : ''}" data-zsim-tab="maal">🪙 Zakat Emas &amp; Tabungan</button>
        </div>

        <div id="zsim-body"></div>
      </div>
    `;
  }

  function bindZakatSimulator() {
    const bodyEl = document.getElementById('zsim-body');
    if (!bodyEl) return;

    const switchZTab = (nextTab) => {
      zakatSimTab = nextTab;
      container.querySelectorAll('[data-zsim-tab]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-zsim-tab') === zakatSimTab);
      });
      renderSimTabContent();
    };

    container.querySelectorAll('[data-zsim-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchZTab(btn.getAttribute('data-zsim-tab') || 'fitrah'));
    });

    const pFitrah = document.getElementById('btn-zsim-preset-fitrah');
    if (pFitrah) {
      pFitrah.addEventListener('click', () => {
        switchZTab('fitrah');
        const jEl = document.getElementById('zf-jiwa');
        const hEl = document.getElementById('zf-harga');
        if (jEl) jEl.value = '5';
        if (hEl) hEl.value = '16000';
        if (jEl) jEl.dispatchEvent(new Event('input'));
      });
    }
    const pProf = document.getElementById('btn-zsim-preset-profesi');
    if (pProf) {
      pProf.addEventListener('click', () => {
        switchZTab('profesi');
        const gEl = document.getElementById('zp-gaji');
        const bEl = document.getElementById('zp-bonus');
        const kEl = document.getElementById('zp-keluar');
        if (gEl) gEl.value = '10000000';
        if (bEl) bEl.value = '1500000';
        if (kEl) kEl.value = '1500000';
        if (gEl) gEl.dispatchEvent(new Event('input'));
      });
    }

    function renderSimTabContent() {
      if (zakatSimTab === 'fitrah') {
        bodyEl.innerHTML = `
          <div class="form-row-3">
            <div class="field">
              <label for="zf-jiwa">Jumlah Anggota Keluarga (Jiwa)</label>
              <input id="zf-jiwa" type="number" min="1" max="100" class="input" value="4" />
            </div>
            <div class="field">
              <label for="zf-kg">Takaran Beras / Jiwa</label>
              <select id="zf-kg" class="select">
                <option value="2.5" selected>2,5 kg (Standar BAZNAS / Kemenag RI)</option>
                <option value="2.7">2,7 kg (Cadangan Kehati-hatian)</option>
                <option value="3.0">3,0 kg (Alternatif 1 Sha')</option>
              </select>
            </div>
            <div class="field">
              <label for="zf-harga">Harga Beras / kg (Rp)</label>
              <input id="zf-harga" type="number" min="5000" max="100000" step="500" class="input" value="15000" />
            </div>
          </div>
          <div class="zakat-result-box" id="zf-result"></div>
        `;
        const updateFitrah = () => {
          const jiwa = Math.min(100, Math.max(1, Number(document.getElementById('zf-jiwa').value) || 1));
          const kgPerJiwa = Number(document.getElementById('zf-kg').value) || 2.5;
          const hargaKg = Math.max(0, Number(document.getElementById('zf-harga').value) || 0);
          const totalKg = Number((jiwa * kgPerJiwa).toFixed(2));
          const totalRp = Math.round(totalKg * hargaKg);
          const resEl = document.getElementById('zf-result');
          if (resEl) {
            resEl.innerHTML = `
              <span class="tag tag-emerald">✓ Wajib Ditunaikan Sebelum Shalat Idul Fitri (${jiwa} Jiwa)</span>
              <div class="zakat-result-kpi">${totalKg} kg Beras &nbsp;≈&nbsp; ${formatRp(totalRp)}</div>
              <small style="color:var(--slate-700);display:block;">
                Rincian: ${jiwa} jiwa × ${kgPerJiwa} kg = <strong>${totalKg} kg beras</strong> (atau setara uang ${formatRp(totalRp)} pada harga beras ${formatRp(hargaKg)}/kg).
              </small>
            `;
          }
        };
        ['zf-jiwa', 'zf-kg', 'zf-harga'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', updateFitrah);
            el.addEventListener('change', updateFitrah);
          }
        });
        updateFitrah();
      } else if (zakatSimTab === 'profesi') {
        bodyEl.innerHTML = `
          <div class="form-row-2">
            <div class="field">
              <label for="zp-gaji">Gaji / Penghasilan Pokok per Bulan (Rp)</label>
              <input id="zp-gaji" type="number" min="0" step="100000" class="input" value="8500000" />
            </div>
            <div class="field">
              <label for="zp-bonus">Penghasilan Tambahan / Bonus per Bulan (Rp)</label>
              <input id="zp-bonus" type="number" min="0" step="100000" class="input" value="1500000" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="field">
              <label for="zp-keluar">Kebutuhan Pokok / Cicilan Jatuh Tempo per Bulan (Rp)</label>
              <input id="zp-keluar" type="number" min="0" step="100000" class="input" value="2000000" />
            </div>
            <div class="field">
              <label for="zp-emas">Harga Emas Murni / gram Saat Ini (Rp)</label>
              <input id="zp-emas" type="number" min="100000" step="10000" class="input" value="1400000" />
            </div>
          </div>
          <div class="zakat-result-box" id="zp-result"></div>
        `;
        const updateProfesi = () => {
          const gaji = Math.max(0, Number(document.getElementById('zp-gaji').value) || 0);
          const bonus = Math.max(0, Number(document.getElementById('zp-bonus').value) || 0);
          const keluar = Math.max(0, Number(document.getElementById('zp-keluar').value) || 0);
          const emas = Math.max(100000, Number(document.getElementById('zp-emas').value) || 1400000);
          const bersihBulan = Math.max(0, gaji + bonus - keluar);
          const bersihTahun = bersihBulan * 12;
          const nisabTahun = 85 * emas;
          const nisabBulan = nisabTahun / 12;
          const wajib = bersihBulan >= nisabBulan;
          const zakatBulan = wajib ? Math.round(bersihBulan * 0.025) : 0;
          const resEl = document.getElementById('zp-result');
          if (resEl) {
            resEl.innerHTML = wajib
              ? `<span class="tag tag-emerald">✓ Mencapai Nisab (${formatRp(nisabBulan)}/bulan atau ${formatRp(nisabTahun)}/tahun)</span>
                 <div class="zakat-result-kpi">Zakat Profesi: ${formatRp(zakatBulan)} / bulan</div>
                 <small style="color:var(--slate-700);display:block;">
                   Penghasilan bersih: <strong>${formatRp(bersihBulan)}/bulan</strong> (${formatRp(bersihTahun)}/tahun) × 2,5% = <strong>${formatRp(zakatBulan)}/bulan</strong> atau <strong>${formatRp(zakatBulan * 12)}/tahun</strong>.
                 </small>`
              : `<span class="tag tag-gold">ℹ️ Belum Mencapai Nisab Wajib Zakat</span>
                 <div class="zakat-result-kpi" style="color:var(--slate-700);">Zakat Wajib: Rp 0 (Dianjurkan Infaq/Sedekah)</div>
                 <small style="color:var(--slate-700);display:block;">
                   Penghasilan bersih <strong>${formatRp(bersihBulan)}/bulan</strong> masih di bawah nisab bulanan <strong>${formatRp(nisabBulan)}</strong> (setara 85 gr emas ÷ 12 bulan).
                 </small>`;
          }
        };
        ['zp-gaji', 'zp-bonus', 'zp-keluar', 'zp-emas'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('input', updateProfesi);
        });
        updateProfesi();
      } else {
        bodyEl.innerHTML = `
          <div class="form-row-2">
            <div class="field">
              <label for="zm-tabung">Total Tabungan / Saham / Aset Dagang Bersih (Rp)</label>
              <input id="zm-tabung" type="number" min="0" step="500000" class="input" value="125000000" />
            </div>
            <div class="field">
              <label for="zm-emas-gr">Emas Simpanan Non-Pakai (gram)</label>
              <input id="zm-emas-gr" type="number" min="0" step="1" class="input" value="15" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="field">
              <label for="zm-hutang">Hutang Jatuh Tempo Saat Ini (Rp)</label>
              <input id="zm-hutang" type="number" min="0" step="500000" class="input" value="5000000" />
            </div>
            <div class="field">
              <label for="zm-harga-emas">Harga Emas Murni / gram (Rp)</label>
              <input id="zm-harga-emas" type="number" min="100000" step="10000" class="input" value="1400000" />
            </div>
          </div>
          <label class="check-card" style="margin-top:4px;">
            <input id="zm-haul" type="checkbox" checked />
            <span><strong>Harta sudah dimiliki/tersimpan penuh selama 1 Tahun Hijriah (Haul)</strong></span>
          </label>
          <div class="zakat-result-box" id="zm-result"></div>
        `;
        const updateMaal = () => {
          const tabung = Math.max(0, Number(document.getElementById('zm-tabung').value) || 0);
          const emasGr = Math.max(0, Number(document.getElementById('zm-emas-gr').value) || 0);
          const hutang = Math.max(0, Number(document.getElementById('zm-hutang').value) || 0);
          const hargaEmas = Math.max(100000, Number(document.getElementById('zm-harga-emas').value) || 1400000);
          const haulOk = Boolean(document.getElementById('zm-haul').checked);

          const totalHarta = Math.max(0, tabung + emasGr * hargaEmas - hutang);
          const nisabMaal = 85 * hargaEmas;
          const wajib = haulOk && totalHarta >= nisabMaal;
          const zakatNominal = wajib ? Math.round(totalHarta * 0.025) : 0;

          const resEl = document.getElementById('zm-result');
          if (resEl) {
            if (!haulOk) {
              resEl.innerHTML = `<span class="tag tag-gold">⏳ Belum Memenuhi Haul 1 Tahun</span>
                <div class="zakat-result-kpi" style="color:var(--slate-700);">Zakat Wajib: Rp 0</div>
                <small style="color:var(--slate-700);display:block;">Harta bersih senilai <strong>${formatRp(totalHarta)}</strong>, tunggu sampai genap tersimpan 1 tahun qamariyah (haul).</small>`;
            } else if (wajib) {
              resEl.innerHTML = `<span class="tag tag-emerald">✓ Memenuhi Nisab (${formatRp(nisabMaal)}) &amp; Haul 1 Tahun</span>
                <div class="zakat-result-kpi">Zakat Maal Wajib: ${formatRp(zakatNominal)}</div>
                <small style="color:var(--slate-700);display:block;">Harta bersih: <strong>${formatRp(totalHarta)}</strong> × 2,5% = <strong>${formatRp(zakatNominal)}</strong>.</small>`;
            } else {
              resEl.innerHTML = `<span class="tag tag-gold">ℹ️ Di Bawah Nisab 85 Gram Emas (${formatRp(nisabMaal)})</span>
                <div class="zakat-result-kpi" style="color:var(--slate-700);">Zakat Wajib: Rp 0</div>
                <small style="color:var(--slate-700);display:block;">Harta bersih Anda <strong>${formatRp(totalHarta)}</strong> masih di bawah nisab wajib zakat maal.</small>`;
            }
          }
        };
        ['zm-tabung', 'zm-emas-gr', 'zm-hutang', 'zm-harga-emas', 'zm-haul'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', updateMaal);
            el.addEventListener('change', updateMaal);
          }
        });
        updateMaal();
      }
    }

    renderSimTabContent();
  }

  function getRuntimeCfg(topic) {
    if (api && typeof api.getBelajarTopicRuntimeConfig === 'function') {
      return api.getBelajarTopicRuntimeConfig(topic.id);
    }
    return {
      id: topic.id,
      judul: topic.title,
      youtubeId: '',
      coverImage: '',
      youtubeQuery: `${topic.title} Kemenag`,
      komentarAktif: true
    };
  }

  function getCategoryRuntimeCfg(cat) {
    if (api && typeof api.getBelajarCategoryRuntimeConfig === 'function') {
      return api.getBelajarCategoryRuntimeConfig(cat.id);
    }
    return {
      id: `cat-${cat.id}`,
      kategoriId: cat.id,
      judul: cat.title,
      coverImage: ''
    };
  }

  function buildCardBgLayers(coverImage, altText) {
    const raw = String(coverImage || '').trim();
    const resolved = raw ? (typeof resolveImageUrl === 'function' ? resolveImageUrl(raw) : raw) : '';
    if (!resolved) {
      return { cls: '', open: '', close: '' };
    }
    return {
      cls: 'prak-card-has-bg',
      open: `<img class="prak-card-bg-img" src="${escapeHtml(resolved)}" alt="${escapeHtml(altText || '')}" loading="lazy" aria-hidden="true" /><div class="prak-card-scrim" aria-hidden="true"></div><div class="prak-card-fg">`,
      close: `</div>`
    };
  }

  /**
   * Tata letak khusus kartu berlatar foto:
   * - Atas: ikon sejajar horizontal dengan judul + subjudul ringkas di bawahnya.
   * - Tengah: dibiarkan kosong transparan agar tulisan/gambar tengah foto tidak tertutup.
   * - Bawah: frame tag (pill) dibuat kecil-kecil bersama baris aksi.
   */
  function renderBgSplitCard({ icon, titleTag = 'h3', title, subtitle, tagsHtml, footerHtml }) {
    const safeTag = titleTag === 'h2' ? 'h2' : 'h3';
    return `
      <div class="prak-card-top-zone">
        <div class="prak-card-top-row">
          <span class="quick-bento-icon">${icon}</span>
          <${safeTag} class="prak-card-top-title">${escapeHtml(title)}</${safeTag}>
        </div>
        <p class="prak-card-top-sub">${escapeHtml(subtitle)}</p>
      </div>
      <div class="prak-card-mid-spacer" aria-hidden="true"></div>
      <div class="prak-card-bottom-zone">
        ${tagsHtml ? `<div class="prak-card-mini-tags">${tagsHtml}</div>` : ''}
        <div class="prak-card-bottom-foot">${footerHtml}</div>
      </div>
    `;
  }

  function renderYoutubeReferenceCard(topic, cfg) {
    const ytId = cfg && cfg.youtubeId ? String(cfg.youtubeId).trim() : '';
    const embedSrc = ytId ? `https://www.youtube.com/embed/${encodeURIComponent(ytId)}` : '';
    const watchUrl = ytId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent((cfg && cfg.youtubeQuery) || `${cfg.judul} Kemenag RI`)}`;
    return `
      <div class="card" style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <span class="tag tag-rose">🎬 Referensi Video Pembelajaran YouTube (Sejalan Kemenag RI)</span>
            <h3 style="margin:6px 0 0;">Simak Peragaan Visual: ${escapeHtml(cfg.judul || topic.title)}</h3>
          </div>
          <a href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
            ${ytId ? '▶️ Buka di YouTube ↗' : '🔍 Cari Video Resmi Kemenag di YouTube ↗'}
          </a>
        </div>
        ${embedSrc
          ? `<div class="embed-frame" style="margin-bottom:8px;">
              <iframe src="${escapeHtml(embedSrc)}" title="Video Referensi ${escapeHtml(cfg.judul || topic.title)}" allowfullscreen loading="lazy"></iframe>
            </div>
            <small style="color:var(--slate-600);display:block;">Video rujukan di atas selaras dengan standar materi Kementerian Agama RI / Bimas Islam / Ditjen PHU / LPMQ dan dapat diperbarui Guru lewat Panel Admin.</small>`
          : `<div class="callout callout-gold" style="margin:0;">
              <strong>📺 Video Rekomendasi Tersedia via YouTube Resmi Kemenag:</strong>
              <p style="margin:6px 0 10px;font-size:13.5px;color:var(--slate-700);">
                Klik tombol <strong>Cari Video Resmi Kemenag di YouTube ↗</strong> di kanan atas untuk menonton peragaan praktik yang terkurasi, atau Guru dapat menempelkan URL YouTube langsung melalui menu <strong>Panel Guru → Ayo Belajar</strong>.
              </p>
            </div>`
        }
      </div>
    `;
  }

  function renderCommentsSection(topic, cfg) {
    if (!cfg || !cfg.komentarAktif) return '';
    const allComments = (api && api.state && api.state.data && Array.isArray(api.state.data.belajarKomentar))
      ? api.state.data.belajarKomentar
      : [];
    const topicComments = allComments.filter((c) => c && String(c.topicId) === String(topic.id));
    const maskProf = typeof censorProfanity === 'function' ? censorProfanity : (s) => s;
    const fmtDate = typeof formatDateId === 'function' ? formatDateId : (d) => String(d || '').slice(0, 10);

    return `
      <div class="card" style="margin-top:20px;" id="belajar-comments-section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          <div>
            <span class="tag tag-emerald">💬 Ruang Diskusi &amp; Komentar Terbuka</span>
            <h2 style="margin:6px 0 0;font-size:19.5px;">Komentar &amp; Tanya Jawab (${topicComments.length})</h2>
          </div>
          <span class="tag tag-sky">🛡️ Filter Anti-Kata Kasar &amp; Privasi Kontak Aktif</span>
        </div>

        <div class="grid grid-2">
          <form id="form-belajar-komentar" class="form-grid" style="background:var(--slate-100);padding:16px;border-radius:14px;border:1px solid var(--slate-200);">
            <h3 style="margin:0 0 4px;font-size:16.5px;">✍️ Tulis Komentar atau Pertanyaan</h3>
            <p style="margin:0 0 8px;font-size:12.6px;color:var(--slate-600);">
              Gunakan bahasa yang santun dan sesuai konteks pembelajaran PAI. <strong>Email &amp; No. HP</strong> hanya terlihat oleh Guru/Admin (tidak ditampilkan ke publik).
            </p>
            <div class="form-row-2">
              <div class="field">
                <label for="kom-nama">Nama Lengkap *</label>
                <input id="kom-nama" class="input" required maxlength="80" placeholder="Nama lengkap Anda..." />
              </div>
              <div class="field">
                <label for="kom-pekerjaan">Pekerjaan / Peran *</label>
                <select id="kom-pekerjaan" class="select" required>
                  <option value="">-- Pilih Pekerjaan --</option>
                  <option value="Siswa / Pelajar">Siswa / Pelajar</option>
                  <option value="Guru / Pendidik">Guru / Pendidik</option>
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Orang Tua / Wali">Orang Tua / Wali</option>
                  <option value="Masyarakat Umum">Masyarakat Umum</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label for="kom-instansi">Instansi / Sekolah / Lembaga *</label>
              <input id="kom-instansi" class="input" required maxlength="100" placeholder="Contoh: SMAN 20 Tebo / Kemenag / Umum..." />
            </div>
            <div class="form-row-2">
              <div class="field">
                <label for="kom-email">Email * (Privat Admin)</label>
                <input id="kom-email" type="email" class="input" required maxlength="100" placeholder="nama@email.com" />
              </div>
              <div class="field">
                <label for="kom-hp">No. HP / WhatsApp * (Privat Admin)</label>
                <input id="kom-hp" type="tel" inputmode="numeric" class="input" required maxlength="20" placeholder="0812xxxxxxxx" />
              </div>
            </div>
            <div class="field">
              <label for="kom-pesan">Komentar / Pertanyaan Anda *</label>
              <textarea id="kom-pesan" class="textarea" rows="3" required maxlength="650" placeholder="Tuliskan tanggapan atau pertanyaan seputar praktik ibadah ini..."></textarea>
            </div>
            <div id="kom-warn-box" class="callout" role="alert" style="padding:10px 12px;background:var(--rose-50);border-color:#fecdd3;color:var(--rose-600);font-size:12.8px;font-weight:700;" hidden></div>
            <button type="submit" class="btn btn-primary" id="btn-kom-submit">📨 Kirim Komentar</button>
          </form>

          <div style="display:flex;flex-direction:column;gap:10px;max-height:520px;overflow-y:auto;">
            ${topicComments.length === 0
              ? `<div class="callout" style="margin:0;">Belum ada komentar pada materi <strong>${escapeHtml(cfg.judul || topic.title)}</strong>. Jadilah yang pertama menulis pertanyaan atau refleksi positif!</div>`
              : topicComments
                  .map(
                    (c) => `<div style="padding:13px 15px;border-radius:12px;background:#ffffff;border:1px solid var(--slate-200);border-left:4px solid var(--theme-c2);">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                          <div>
                            <strong style="font-size:14px;color:var(--slate-900);">${escapeHtml(maskProf(c.nama || 'Pengunjung'))}</strong>
                            <div style="font-size:12px;color:var(--slate-600);">
                              ${escapeHtml(c.pekerjaan || '-')} • <strong>${escapeHtml(c.instansi || '-')}</strong>
                            </div>
                          </div>
                          <span class="tag tag-slate" style="font-size:11px;">${escapeHtml(fmtDate(c.timestamp))}</span>
                        </div>
                        <p style="margin:0;font-size:13.6px;color:var(--slate-800);line-height:1.55;white-space:pre-line;">${escapeHtml(maskProf(c.komentar || ''))}</p>
                      </div>`
                  )
                  .join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  /* -------------------- RENDER 3 LEVEL NAVIGASI -------------------- */
  function renderLevel1Home(doneMap) {
    const totalTopics = CATEGORIES.reduce((acc, c) => acc + c.topics.length, 0);
    const doneTotal = Object.keys(doneMap).filter((k) => doneMap[k]).length;

    const q = searchQuery.trim().toLowerCase();
    const searchHits = [];
    if (q) {
      CATEGORIES.forEach((cat) => {
        cat.topics.forEach((top) => {
          const rCfg = getRuntimeCfg(top);
          const blob = `${cat.title} ${rCfg.judul} ${top.title} ${top.summary} ${top.badge}`.toLowerCase();
          if (blob.includes(q)) {
            searchHits.push({ cat, top, rCfg });
          }
        });
      });
    }

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Laboratorium Praktikum PAI • Standar Resmi Kemenag RI</span>
            <h1>Ayo Belajar — Panduan &amp; Simulasi Praktikum PAI</h1>
            <p>Materi ilmu dasar ibadah yang konsisten mengacu pada pedoman resmi Kementerian Agama RI: Thaharah, Shalat, Jenazah, Zakat, Manasik Haji-Umrah, dan Ilmu Tajwid bersuara interaktif.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="tag tag-gold" style="font-size:13px;">🏆 Progres: ${doneTotal} / ${totalTopics} Topik</span>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="prak-ref-bar">
          <span><strong>🛡️ Referensi Baku &amp; Aman:</strong> Mengacu pada Kurikulum PAI Kemenag RI, LPMQ Standar Indonesia, &amp; BAZNAS RI (konten statis read-only tanpa akses ubah server).</span>
          <span class="tag tag-emerald">Ilmu Umum Terstandar</span>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <h2 style="margin:0 0 4px;font-size:19px;">📚 Pilih Bidang Praktikum PAI</h2>
              <p style="margin:0;color:var(--slate-600);font-size:13.8px;">Klik salah satu kartu di bawah untuk masuk ke pilihan sub-materi, simulasi praktik, dan contoh suara.</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex:1;max-width:340px;min-width:220px;">
              <input id="belajar-search" type="search" class="input" aria-label="Cari materi praktikum" placeholder="Cari wudhu, jenazah, zakat, ikhfa, iqlab..." value="${escapeHtml(searchQuery)}" />
            </div>
          </div>

          ${q
            ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--slate-200);">
                <strong style="display:block;margin-bottom:10px;color:var(--emerald-900);">Hasil Pencarian "${escapeHtml(searchQuery)}" (${searchHits.length} topik):</strong>
                ${searchHits.length === 0
                  ? `<div class="callout callout-gold">Tidak ada topik praktikum yang cocok dengan kata kunci tersebut.</div>`
                  : `<div class="grid grid-3">
                      ${searchHits
                        .map(({ cat, top, rCfg }) => {
                          const hitTitle = (rCfg && rCfg.judul) || top.title;
                          const bg = buildCardBgLayers(rCfg && rCfg.coverImage, hitTitle);
                          const hitInner = bg.cls
                            ? renderBgSplitCard({
                                icon: cat.icon,
                                titleTag: 'h3',
                                title: hitTitle,
                                subtitle: top.summary,
                                tagsHtml: `<span class="tag ${cat.tagClass}">${cat.icon} ${escapeHtml(cat.title)}</span>${doneMap[top.id] ? '<span class="tag tag-emerald">✓ Selesai</span>' : ''}`,
                                footerHtml: `<small>${escapeHtml(top.badge || '')}</small><button type="button" class="btn btn-primary btn-sm" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}">Buka Panduan →</button>`
                              })
                            : `
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                              <span class="tag ${cat.tagClass}">${cat.icon} ${escapeHtml(cat.title)}</span>
                              ${doneMap[top.id] ? '<span class="tag tag-emerald">✓ Selesai</span>' : ''}
                            </div>
                            <h3 style="margin:0 0 6px;font-size:16.5px;color:#ffffff;">${escapeHtml(hitTitle)}</h3>
                            <p style="margin:0 0 12px;font-size:13px;color:rgba(255,255,255,0.92);flex:1;">${escapeHtml(top.summary)}</p>
                            <button type="button" class="btn btn-primary btn-sm" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}">Buka Panduan &amp; Simulasi →</button>
                            `;
                          return `<article class="card card-hover class-picker-card ${cat.tone} ${bg.cls}" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}" role="button" tabindex="0">
                            ${bg.open}
                            ${hitInner}
                            ${bg.close}
                          </article>`;
                        })
                        .join('')}
                    </div>`
                }
              </div>`
            : ''
          }
        </div>

        <div class="grid grid-3" style="margin-bottom:22px;">
          ${CATEGORIES.map((cat) => {
            const doneCount = countDoneInCategory(cat, doneMap);
            const catCfg = getCategoryRuntimeCfg(cat);
            const catTitle = (catCfg && catCfg.judul) || cat.title;
            const bg = buildCardBgLayers(catCfg && catCfg.coverImage, catTitle);
            const topicPillsHtml = `${cat.topics
              .slice(0, 3)
              .map((t) => `<span class="tag tag-slate" style="font-size:11px;">${escapeHtml(getRuntimeCfg(t).judul.replace(/^\d+\.\s*/, ''))}</span>`)
              .join('')}${cat.topics.length > 3 ? `<span class="tag tag-slate" style="font-size:11px;">+${cat.topics.length - 3} lagi</span>` : ''}`;
            const catInner = bg.cls
              ? renderBgSplitCard({
                  icon: cat.icon,
                  titleTag: 'h3',
                  title: catTitle,
                  subtitle: cat.subtitle,
                  tagsHtml: `<span class="tag ${cat.tagClass}">${cat.topics.length} Modul Praktikum</span>${topicPillsHtml}`,
                  footerHtml: `<small>${doneCount}/${cat.topics.length} dipelajari</small><button type="button" class="btn btn-primary btn-sm" data-open-cat="${escapeHtml(cat.id)}">Pilih Topik →</button>`
                })
              : `
                <div class="quick-bento-top">
                  <span class="quick-bento-icon" style="background:rgba(255,255,255,0.85);">${cat.icon}</span>
                  <span class="tag ${cat.tagClass}">${cat.topics.length} Modul Praktikum</span>
                </div>
                <h3 style="margin:0 0 6px;font-size:20px;color:#ffffff;">${escapeHtml(catTitle)}</h3>
                <p style="margin:0 0 12px;font-size:13.5px;color:rgba(255,255,255,0.92);flex:1;line-height:1.55;">
                  ${escapeHtml(cat.subtitle)}
                </p>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                  ${topicPillsHtml}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;">
                  <small style="color:#ffffff;font-weight:700;">${doneCount}/${cat.topics.length} dipelajari</small>
                  <button type="button" class="btn btn-primary btn-sm" data-open-cat="${escapeHtml(cat.id)}">Pilih Topik →</button>
                </div>
              `;
            return `
              <article class="card card-hover class-picker-card ${cat.tone} ${bg.cls}" data-open-cat="${escapeHtml(cat.id)}" role="button" tabindex="0">
                ${bg.open}
                ${catInner}
                ${bg.close}
              </article>
            `;
          }).join('')}
        </div>

        <div class="card">
          <span class="tag tag-sky">Daftar Rujukan Utama Standar Kementerian Agama RI</span>
          <h3 style="margin:8px 0 8px;">📖 Referensi Resmi Pembelajaran Praktikum PAI</h3>
          <ul style="margin:0;padding-left:18px;font-size:13.4px;color:var(--slate-700);line-height:1.65;">
            <li><strong>Buku Siswa Pendidikan Agama Islam &amp; Budi Pekerti (Kurikulum Merdeka)</strong> — Kemdikbudristek &amp; Kementerian Agama RI.</li>
            <li><strong>Tuntunan Shalat Lengkap &amp; Panduan Zakat Praktis</strong> — Direktorat Jenderal Bimbingan Masyarakat Islam (Bimas Islam) Kemenag RI.</li>
            <li><strong>Buku Tuntunan Manasik Haji dan Umrah</strong> — Direktorat Jenderal Penyelenggaraan Haji dan Umrah (PHU) Kemenag RI.</li>
            <li><strong>Mushaf Al-Qur'an Standar Indonesia &amp; Pedoman Tajwid</strong> — Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kemenag RI.</li>
            <li><strong>Standar Takaran Zakat Fitrah (2,5 kg / 3,5 L) &amp; Nisab Maal (85 gr Emas)</strong> — Badan Amil Zakat Nasional (BAZNAS RI) &amp; PMA No. 52 Tahun 2014.</li>
          </ul>
        </div>
      </div>
    `;

    const searchEl = document.getElementById('belajar-search');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        searchQuery = searchEl.value;
        renderLevel1Home(doneMap);
        const fresh = document.getElementById('belajar-search');
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(fresh.value.length, fresh.value.length);
        }
      });
    }

    container.querySelectorAll('[data-open-cat]').forEach((el) => {
      const openCat = () => navigateTo(el.getAttribute('data-open-cat'), '');
      el.addEventListener('click', (e) => {
        if (el.tagName !== 'BUTTON' && e.target && typeof e.target.closest === 'function' && e.target.closest('button[data-open-cat]')) return;
        openCat();
      });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCat();
          }
        });
      }
    });

    bindTopicCardClicks();
  }

  function renderLevel2Category(cat, doneMap) {
    const subTones = ['tone-emerald', 'tone-sky', 'tone-gold', 'tone-violet', 'tone-rose'];

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">Ayo Belajar • Pedoman Standar Kemenag RI</span>
            <h1>${cat.icon} ${escapeHtml(cat.title)}</h1>
            <p>${escapeHtml(cat.subtitle)}</p>
          </div>
          <div>
            <button type="button" class="btn btn-gold btn-sm" id="btn-belajar-back-home">← Semua Kategori</button>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="prak-breadcrumb">
          <button type="button" class="prak-breadcrumb-btn" id="bc-belajar-home">🏠 Ayo Belajar</button>
          <span>›</span>
          <strong>${cat.icon} ${escapeHtml(cat.title)}</strong>
        </div>

        <div class="prak-ref-bar">
          <span><strong>📜 Dalil:</strong> ${escapeHtml(cat.dalil)}</span>
          <span class="tag tag-sky">📚 ${escapeHtml(cat.refKemenag)}</span>
        </div>

        ${cat.hasJenazahGenderSim ? renderJenazahGenderSimulator() : ''}
        ${cat.hasManasikSim ? renderManasikSimulator() : ''}

        <div class="grid grid-2">
          ${cat.topics
            .map((top, idx) => {
              const tone = subTones[idx % subTones.length];
              const isDone = Boolean(doneMap[top.id]);
              const rCfg = getRuntimeCfg(top);
              const displayTitle = (rCfg && rCfg.judul) || top.title;
              const bg = buildCardBgLayers(rCfg && rCfg.coverImage, displayTitle);
              const topicMetaSmall = `<small style="color:#ffffff;font-weight:700;">📋 ${(top.steps || []).length} Langkah${top.audioExamples ? ' • 🔊 Contoh Suara' : ''}${top.isZakatSimulator ? ' • 🧮 Kalkulator' : ''}${rCfg.youtubeId ? ' • 🎬 Video' : ''}${rCfg.coverImage ? ' • 🖼️ Foto Latar' : ''}</small>`;
              const topicStatusTag = isDone ? '<span class="tag tag-emerald">✓ Sudah Dipelajari</span>' : '<span class="tag tag-slate">Belum Ditandai</span>';
              const topicInner = bg.cls
                ? renderBgSplitCard({
                    icon: cat.icon,
                    titleTag: 'h2',
                    title: displayTitle,
                    subtitle: top.summary,
                    tagsHtml: `<span class="tag ${cat.tagClass}">${escapeHtml(top.badge)}</span>${topicStatusTag}`,
                    footerHtml: `${topicMetaSmall}<button type="button" class="btn btn-primary btn-sm" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}">Pelajari →</button>`
                  })
                : `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <span class="tag ${cat.tagClass}">${escapeHtml(top.badge)}</span>
                    ${topicStatusTag}
                  </div>
                  <h2 style="margin:0 0 8px;font-size:19.5px;color:#ffffff;">${escapeHtml(displayTitle)}</h2>
                  <p style="margin:0 0 14px;font-size:13.8px;color:rgba(255,255,255,0.92);flex:1;line-height:1.58;">
                    ${escapeHtml(top.summary)}
                  </p>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto;">
                    ${topicMetaSmall}
                    <button type="button" class="btn btn-primary btn-sm" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}">Pelajari Lengkap →</button>
                  </div>
                `;
              return `
                <article class="card card-hover class-picker-card ${tone} ${bg.cls}" data-open-topic="${escapeHtml(cat.id)}::${escapeHtml(top.id)}" role="button" tabindex="0">
                  ${bg.open}
                  ${topicInner}
                  ${bg.close}
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    [document.getElementById('btn-belajar-back-home'), document.getElementById('bc-belajar-home')].forEach((b) => {
      if (b) b.addEventListener('click', () => navigateTo('', ''));
    });
    bindTopicCardClicks();
    bindInteractiveWidgets(null);
  }

  function renderLevel3Topic(cat, topic, doneMap) {
    const idx = cat.topics.findIndex((t) => t.id === topic.id);
    const prevTopic = idx > 0 ? cat.topics[idx - 1] : null;
    const nextTopic = idx < cat.topics.length - 1 ? cat.topics[idx + 1] : null;
    const isDone = Boolean(doneMap[topic.id]);
    const rCfg = getRuntimeCfg(topic);
    const displayTitle = (rCfg && rCfg.judul) || topic.title;

    container.innerHTML = `
      <div class="page-banner">
        <div class="container page-banner-inner">
          <div>
            <span class="eyebrow">${cat.icon} ${escapeHtml(cat.title)} • ${escapeHtml(topic.badge)}</span>
            <h1>${escapeHtml(displayTitle)}</h1>
            <p>${escapeHtml(topic.summary)}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-gold btn-sm" id="btn-topic-back-cat">← Kembali ke ${escapeHtml(cat.title)}</button>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="prak-breadcrumb">
          <button type="button" class="prak-breadcrumb-btn" id="bc-topic-home">🏠 Ayo Belajar</button>
          <span>›</span>
          <button type="button" class="prak-breadcrumb-btn" id="bc-topic-cat">${cat.icon} ${escapeHtml(cat.title)}</button>
          <span>›</span>
          <strong>${escapeHtml(displayTitle)}</strong>
        </div>

        <div class="prak-ref-bar">
          <span><strong>📜 Dasar Dalil:</strong> ${escapeHtml(topic.dalil)}</span>
          <span class="tag tag-sky">📚 ${escapeHtml(topic.refKemenag || cat.refKemenag)}</span>
        </div>

        ${topic.isZakatSimulator ? renderZakatSimulatorSection() : ''}
        ${topic.audioExamples ? renderAudioStudio(topic.audioExamples) : ''}
        ${topic.hasJenazahGenderSim ? renderJenazahGenderSimulator() : ''}
        ${topic.hasManasikSim ? renderManasikSimulator() : ''}
        ${renderInteractiveStepper(topic)}
        ${renderYoutubeReferenceCard(topic, rCfg)}

        ${topic.prayers && topic.prayers.length
          ? `<div class="card" style="margin-bottom:18px;">
              <h2 style="margin:0 0 12px;font-size:19px;">🤲 Lafal Niat, Bacaan &amp; Doa</h2>
              ${topic.prayers
                .map((p, pIdx) => {
                  const customAud = (rCfg && rCfg.prayerAudios && rCfg.prayerAudios[String(pIdx)]) || '';
                  const sourceTag = customAud
                    ? `<span class="tag tag-sky">🎙️ Suara Asli Guru</span>`
                    : p.quranRef
                    ? `<span class="tag tag-sky">📖 ${escapeHtml(p.quranRef)}</span>`
                    : p.hisnMatch
                    ? `<span class="tag tag-sky">🎙️ ${escapeHtml(p.reciterLabel || 'Syaikh Hamad')}</span>`
                    : p.audioUrl
                    ? `<span class="tag tag-sky">🔊 Audio Arab Otomatis</span>`
                    : `<span class="tag tag-gold">🎙️ Audio Alternatif</span>`;
                  const btnLabel = customAud
                    ? '🔊 Putar Suara Guru'
                    : p.surah || p.hisnMatch
                    ? '🔊 Putar Suara Asli'
                    : p.audioUrl
                    ? '🔊 Putar Bacaan Arab'
                    : '🔊 Putar Suara';
                  return `<div class="prak-arab-card" id="prayer-card-${pIdx}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="tag tag-emerald">${escapeHtml(p.label)}</span>
                        ${sourceTag}
                      </div>
                      <button type="button" class="prak-audio-btn" data-play-prayer="${pIdx}" data-default-label="${escapeHtml(btnLabel)}">${escapeHtml(btnLabel)}</button>
                    </div>
                    <div class="prak-arab-text">${escapeHtml(p.arab)}</div>
                    <p style="margin:0 0 4px;font-size:13.8px;color:var(--emerald-900);font-weight:700;font-style:italic;">${escapeHtml(p.latin)}</p>
                    <p style="margin:0;font-size:13.2px;color:var(--slate-700);"><strong>Artinya:</strong> ${escapeHtml(p.arti)}</p>
                  </div>`;
                })
                .join('')}
            </div>`
          : ''
        }

        <div class="grid grid-2" style="margin-bottom:18px;">
          <div class="card">
            <span class="tag tag-sky">Ketentuan Pokok</span>
            <h3 style="margin:8px 0 10px;">${escapeHtml(topic.syaratRukun.syaratTitle)}</h3>
            <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:13.8px;color:var(--slate-800);line-height:1.55;">
              ${(topic.syaratRukun.syarat || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
          <div class="card">
            <span class="tag tag-emerald">Inti &amp; Rukun Praktikum</span>
            <h3 style="margin:8px 0 10px;">${escapeHtml(topic.syaratRukun.rukunTitle)}</h3>
            <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:13.8px;color:var(--slate-800);line-height:1.55;">
              ${(topic.syaratRukun.rukun || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="card" style="margin-bottom:18px;">
          <span class="tag tag-gold">Langkah Praktik Berurutan</span>
          <h2 style="margin:8px 0 14px;font-size:19.5px;">📋 Tata Cara Pelaksanaan</h2>
          <div class="prak-step-list">
            ${(topic.steps || [])
              .map(
                (st, i) => `<div class="prak-step-item">
                  <div class="prak-step-num">${i + 1}</div>
                  <div class="prak-step-body">
                    <h4>${escapeHtml(st.title)}</h4>
                    <p>${escapeHtml(st.desc)}</p>
                  </div>
                </div>`
              )
              .join('')}
          </div>
        </div>

        ${topic.quiz ? renderScenarioQuiz(topic.quiz) : ''}

        ${topic.warnings && topic.warnings.length
          ? `<div class="card" style="margin-bottom:18px;border-color:#fda4af;background:#fff1f2;">
              <h3 style="margin:0 0 8px;color:#be123c;">⚠️ Hal yang Membatalkan &amp; Perlu Diperhatikan</h3>
              <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.8px;color:#881337;line-height:1.55;">
                ${topic.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}
              </ul>
            </div>`
          : ''
        }

        <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <button type="button" class="btn ${isDone ? 'btn-gold' : 'btn-primary'}" id="btn-toggle-topic-done">
            ${isDone ? '✓ Sudah Dipelajari (Klik untuk Batal)' : '✅ Tandai Sudah Dipelajari'}
          </button>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${prevTopic ? `<button type="button" class="btn btn-outline btn-sm" id="btn-topic-prev">← ${escapeHtml(getRuntimeCfg(prevTopic).judul.replace(/^\d+\.\s*/, ''))}</button>` : ''}
            ${nextTopic ? `<button type="button" class="btn btn-gold btn-sm" id="btn-topic-next">${escapeHtml(getRuntimeCfg(nextTopic).judul.replace(/^\d+\.\s*/, ''))} →</button>` : ''}
          </div>
        </div>

        ${renderCommentsSection(topic, rCfg)}
      </div>
    `;

    const backHome = document.getElementById('bc-topic-home');
    if (backHome) backHome.addEventListener('click', () => navigateTo('', ''));
    [document.getElementById('btn-topic-back-cat'), document.getElementById('bc-topic-cat')].forEach((b) => {
      if (b) b.addEventListener('click', () => navigateTo(cat.id, ''));
    });

    const toggleDoneBtn = document.getElementById('btn-toggle-topic-done');
    if (toggleDoneBtn) {
      toggleDoneBtn.addEventListener('click', () => {
        const nextMap = loadDoneMap();
        if (nextMap[topic.id]) {
          delete nextMap[topic.id];
          showToast('Tanda selesai dihapus.');
        } else {
          nextMap[topic.id] = true;
          showToast(`Alhamdulillah! "${topic.title}" ditandai sudah dipelajari.`);
        }
        saveDoneMap(nextMap);
        render();
      });
    }

    const prevBtn = document.getElementById('btn-topic-prev');
    if (prevBtn && prevTopic) prevBtn.addEventListener('click', () => navigateTo(cat.id, prevTopic.id));
    const nextBtn = document.getElementById('btn-topic-next');
    if (nextBtn && nextTopic) nextBtn.addEventListener('click', () => navigateTo(cat.id, nextTopic.id));

    bindInteractiveStepper(topic);
    bindScenarioQuiz(topic.quiz);
    bindInteractiveWidgets(topic, rCfg);
    if (topic.isZakatSimulator) {
      bindZakatSimulator();
    }

    const commentForm = document.getElementById('form-belajar-komentar');
    if (commentForm) {
      const warnBox = document.getElementById('kom-warn-box');
      const pesanEl = document.getElementById('kom-pesan');
      const namaEl = document.getElementById('kom-nama');
      const instEl = document.getElementById('kom-instansi');
      const checkLiveProfanity = () => {
        if (!warnBox || typeof containsProfanityOrSpam !== 'function') return;
        const bad = containsProfanityOrSpam([namaEl && namaEl.value, instEl && instEl.value, pesanEl && pesanEl.value].join(' '));
        if (bad) {
          warnBox.textContent = '⚠️ Terdeteksi kata kasar/tidak pantas atau tautan terlarang. Harap gunakan bahasa yang santun.';
          warnBox.hidden = false;
        } else {
          warnBox.hidden = true;
        }
      };
      [namaEl, instEl, pesanEl].forEach((el) => {
        if (el) el.addEventListener('input', checkLiveProfanity);
      });

      commentForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (warnBox) warnBox.hidden = true;
        const submitBtn = document.getElementById('btn-kom-submit');
        const payload = {
          topicId: topic.id,
          topicTitle: displayTitle,
          kategoriTitle: cat.title,
          nama: namaEl ? namaEl.value.trim() : '',
          pekerjaan: document.getElementById('kom-pekerjaan') ? document.getElementById('kom-pekerjaan').value.trim() : '',
          instansi: instEl ? instEl.value.trim() : '',
          email: document.getElementById('kom-email') ? document.getElementById('kom-email').value.trim() : '',
          noHp: document.getElementById('kom-hp') ? document.getElementById('kom-hp').value.trim() : '',
          komentar: pesanEl ? pesanEl.value.trim() : ''
        };
        if (typeof containsProfanityOrSpam === 'function' && containsProfanityOrSpam([payload.nama, payload.instansi, payload.komentar].join(' '))) {
          if (warnBox) {
            warnBox.textContent = '⚠️ Komentar diblokir karena mengandung kata tidak pantas atau tautan terlarang.';
            warnBox.hidden = false;
          }
          if (showToast) showToast('Gunakan kata-kata yang santun dalam berkomentar.', 'error');
          return;
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-inline"></span> Mengirim Komentar...';
        }
        try {
          if (!api || typeof api.submitBelajarKomentar !== 'function') {
            throw new Error('Layanan komentar belum tersedia.');
          }
          const res = await api.submitBelajarKomentar(payload);
          if (showToast) {
            showToast(
              res.mode === 'live'
                ? 'Komentar Anda berhasil dikirim dan tersimpan di database!'
                : 'Komentar dicatat pada Mode Demo Lokal.'
            );
          }
          render();
        } catch (err) {
          if (warnBox) {
            warnBox.textContent = '⚠️ ' + (err && err.message ? err.message : 'Gagal mengirim komentar.');
            warnBox.hidden = false;
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📨 Kirim Komentar';
          }
        }
      });
    }
  }

  function bindInteractiveWidgets(topic, rCfg) {
    container.querySelectorAll('[data-jnz-gender]').forEach((btn) => {
      btn.addEventListener('click', () => {
        jenazahGender = btn.getAttribute('data-jnz-gender') === 'P' ? 'P' : 'L';
        render();
      });
    });

    const jnzAudioBtn = document.getElementById('btn-jnz-play-audio');
    if (jnzAudioBtn) {
      jnzAudioBtn.addEventListener('click', () => {
        const jnzCustomAud = (rCfg && rCfg.prayerAudios && rCfg.prayerAudios['1']) || '';
        playArabicOrTajwid({
          textArab: jnzAudioBtn.getAttribute('data-arab') || '',
          spokenLabel: jnzAudioBtn.getAttribute('data-spoken') || '',
          pattern: 'clear',
          cardElId: 'jnz-sim-box',
          customAudioUrl: jnzCustomAud,
          hisnMatch: {
            catNeedles: ['الدعاء للميت في الصلاة عليه'],
            textNeedles: ['اللهم اغفر له', 'ارحمه']
          },
          reciterLabel: 'Syaikh Hamad Al-Duraikhim',
          triggerBtn: jnzAudioBtn
        });
      });
    }

    const qariSel = document.getElementById('tajwid-qari-select');
    if (qariSel) {
      qariSel.addEventListener('change', () => {
        selectedQari = qariSel.value || 'Husary_Muallim_128kbps';
        clearAudioTimers();
        const recMeta = QARI_RECITERS.find((r) => r.id === selectedQari);
        if (showToast && recMeta) showToast(`Qari dipilih: ${recMeta.label}.`);
      });
    }

    container.querySelectorAll('[data-tajwid-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextRate = Number(btn.getAttribute('data-tajwid-rate')) === 0.85 ? 0.85 : 1.0;
        selectedRate = nextRate;
        container.querySelectorAll('[data-tajwid-rate]').forEach((b) => {
          const isMatch = Number(b.getAttribute('data-tajwid-rate')) === selectedRate;
          b.classList.toggle('btn-primary', isMatch);
          b.classList.toggle('btn-outline', !isMatch);
        });
        if (activeAudioEl) {
          try {
            activeAudioEl.playbackRate = selectedRate;
          } catch (e) {}
        }
        if (showToast) {
          showToast(selectedRate === 0.85 ? 'Kecepatan baca Qari: 0.85× (Lambat untuk latihan tajwid).' : 'Kecepatan baca Qari: 1.0× (Normal).');
        }
      });
    });

    const stopTajwidBtn = document.getElementById('btn-tajwid-stop');
    if (stopTajwidBtn) {
      stopTajwidBtn.addEventListener('click', clearAudioTimers);
    }

    container.querySelectorAll('[data-manasik-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        manasikMode = btn.getAttribute('data-manasik-mode') === 'umrah' ? 'umrah' : 'tamattu';
        manasikIdx = 0;
        render();
      });
    });

    container.querySelectorAll('[data-manasik-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        manasikIdx = Number(btn.getAttribute('data-manasik-idx')) || 0;
        render();
      });
    });

    if (topic && Array.isArray(topic.audioExamples)) {
      container.querySelectorAll('[data-play-tajwid]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const exId = btn.getAttribute('data-play-tajwid');
          const ex = topic.audioExamples.find((x) => x.id === exId);
          if (!ex) return;
          playArabicOrTajwid({
            textArab: ex.arab,
            spokenLabel: ex.latin,
            pattern: ex.pattern || 'clear',
            cardElId: ex.id,
            surah: ex.surah || 0,
            ayah: ex.ayah || 0,
            wbwWord: ex.wbwWord || 0,
            quranRef: ex.quranRef || '',
            triggerBtn: btn
          });
        });
      });
    }

    if (topic && Array.isArray(topic.prayers)) {
      container.querySelectorAll('[data-play-prayer]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-play-prayer'));
          const p = topic.prayers[idx];
          if (!p) return;
          const customAud = (rCfg && rCfg.prayerAudios && rCfg.prayerAudios[String(idx)]) || '';
          playArabicOrTajwid({
            textArab: p.arab,
            spokenLabel: p.spoken || p.latin,
            pattern: 'clear',
            cardElId: `prayer-card-${idx}`,
            customAudioUrl: customAud,
            surah: p.surah || 0,
            ayah: p.ayah || 0,
            quranRef: p.quranRef || '',
            hisnMatch: p.hisnMatch || null,
            localAudioUrl: p.audioUrl || '',
            reciterLabel: p.reciterLabel || '',
            triggerBtn: btn
          });
        });
      });
    }
  }

  function bindTopicCardClicks() {
    container.querySelectorAll('[data-open-topic]').forEach((el) => {
      const openTopic = () => {
        const [cId, tId] = String(el.getAttribute('data-open-topic') || '').split('::');
        if (cId && tId) navigateTo(cId, tId);
      };
      el.addEventListener('click', (e) => {
        if (el.tagName !== 'BUTTON' && e.target && typeof e.target.closest === 'function' && e.target.closest('button[data-open-topic]')) return;
        openTopic();
      });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTopic();
          }
        });
      }
    });
  }

  function render() {
    const doneMap = loadDoneMap();
    const catId = routeParams.cat ? String(routeParams.cat) : '';
    const topicId = routeParams.topic ? String(routeParams.topic) : '';
    const cat = CATEGORIES.find((c) => c.id === catId);

    if (cat && topicId) {
      const topic = cat.topics.find((t) => t.id === topicId);
      if (topic) {
        renderLevel3Topic(cat, topic, doneMap);
        return;
      }
    }
    if (cat) {
      renderLevel2Category(cat, doneMap);
      return;
    }
    renderLevel1Home(doneMap);
  }

  render();
};
