import { SIGN_LIBRARY, SUPPORTED_LANGUAGES, CATEGORY_LABELS } from './sign-data.js';

/* --------------------------------------------------------------------------
 * Hatho Ki Vaani — browser application
 * --------------------------------------------------------------------------
 * DEMO MODE is intentionally enabled for first-run testing. Set this to false
 * after adding a compatible TensorFlow.js model.json and labels.json for both
 * sign-language modes. No camera frames are sent to a server by this code.
 */
export const USE_DEMO_MODE = true; // One-line switch: true = demo, false = trained models
export const VOICE_MALE_ID = 'YOUR_ELEVENLABS_MALE_VOICE_ID';
export const VOICE_FEMALE_ID = 'YOUR_ELEVENLABS_FEMALE_VOICE_ID';
export const HOW_TO_VIDEO_URL = ''; // Add a YouTube URL or a direct MP4 URL
export const DRIVE_ASSET_SOURCE_URL = 'https://drive.google.com/drive/folders/1U-Pr4r1-cupgNOOq9NH_uTsQnPSVEKco';
export const TRANSLATION_API_URL = ''; // Optional hook: set to your own translation endpoint
export const THUMBS_HOLD_MS = 500;
export const THUMBS_WINDOW_MS = 3000;
const WINDOW_LENGTH = 30;
const PREDICT_EVERY_N_FRAMES = 3;
const MIN_STABLE_PREDICTIONS = 5;
const LANGUAGE_NAMES = { en:'English', hi:'Hindi', es:'Spanish', fr:'French', pt:'Portuguese', ar:'Arabic', zh:'Chinese', bn:'Bengali' };
const LANG_TAGS = { en:'en-US', hi:'hi-IN', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ar:'ar-SA', zh:'zh-CN', bn:'bn-BD' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TUTORIAL_ICONS = ['📷','🤟','✋','💬','👍👍','🔊'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const safeGet = (key, fallback = null) => { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Private browsing / storage blocked: app still works. */ } };
const safeJSON = (key, fallback) => { try { const v = safeGet(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

let uiLanguage = safeGet('hkv-ui-language', '') || detectBrowserLanguage();
let meaningLanguage = safeGet('hkv-meaning-language', 'en');
let currentMode = safeGet('hkv-mode', 'isl');
let currentTab = 'alphabet';
let currentTheme = safeGet('hkv-theme', 'system');
let currentVoice = safeGet('hkv-voice', 'female');
let isMuted = safeGet('hkv-muted', 'false') === 'true';
let voiceVolume = Number(safeGet('hkv-volume', '80')) / 100;
let captionSize = Number(safeGet('hkv-caption-size', '1.4')) || 1.4;
let confidenceThreshold = Number(safeGet('hkv-confidence', '80')) / 100;
let speakGestureEnabled = safeGet('hkv-speak-gesture', 'true') !== 'false';
let autoSpeakWords = safeGet('hkv-auto-speak', 'false') === 'true';
let reduceMotion = safeGet('hkv-reduce-motion', 'false') === 'true';
let showAllLanguages = false;
let currentCaption = '';
let undoStack = [];
let captionHistory = safeJSON('hkv-history', []);
let libraryQuery = '';
let selectedLetter = '';
let selectedCategory = 'all';
let activeDetailEntry = null;
let detailCollection = [];
let practiceTarget = null;
let practicePassed = false;
let localeTable = {};
let cameraStream = null;
let videoTrackList = [];
let currentVideoDeviceId = '';
let handLandmarker = null;
let handTrackingReady = false;
let cameraFrameId = 0;
let lastVideoTime = -1;
let frameCounter = 0;
let frameWindow = [];
let modelCache = { isl: null, asl: null };
let labelsCache = { isl: null, asl: null };
let modelLoadPromises = { isl: null, asl: null };
let modelLoadErrors = { isl: null, asl: null };
let modelErrorNotified = { isl: false, asl: false };
let inferenceBusy = false;
let stableLabel = '';
let stableConfidenceCount = 0;
let lastAcceptedLabel = '';
let lastHandsSeenAt = 0;
let handsWereVisible = false;
let hadHandsInCurrentSession = false;
let spaceAddedForAbsence = false;
let previousFeatureVector = null;
let demoSessionStarted = 0;
let lastGesturePose = false;
let gestureHoldStartedAt = 0;
let gesturePoseLatched = false;
let gestureConfirmations = 0;
let gestureDeadline = 0;
let readyForSecondGesture = false;
let selectedHandMode = currentMode;
let toastCounter = 0;
let tutorialStepIndex = 0;
let activeHistoryIndex = -1;
let backgroundAudioContext = null;
const speechAudioCache = new Map();
let currentAudio = null;

function detectBrowserLanguage() {
  const candidate = (navigator.language || 'en').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(candidate) ? candidate : 'en';
}
function normalizeMode(mode) { return mode === 'asl' ? 'asl' : 'isl'; }
function getMeaning(entry, lang = meaningLanguage) { return entry?.labels?.[lang] || entry?.labels?.en || entry?.id || ''; }
function languageDisplayName(code) { return LANGUAGE_NAMES[code] || code; }
function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

async function setUILanguage(language, persist = true) {
  uiLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  if (persist) safeSet('hkv-ui-language', uiLanguage);
  document.documentElement.lang = uiLanguage;
  document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr';
  $('#uiLanguage').value = uiLanguage;
  $('#settingsUILanguage').value = uiLanguage;
  try {
    const response = await fetch(`./locales/${uiLanguage}.json`, { cache: 'no-cache' });
    if (response.ok) localeTable = await response.json();
  } catch { /* Static English copy remains usable if locale files are unavailable. */ }
  $$('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    const value = localeTable[key];
    if (typeof value === 'string') node.textContent = value;
  });
  $$('[data-i18n-placeholder]').forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    if (localeTable[key]) node.placeholder = localeTable[key];
  });
  $('#captionPlaceholder').textContent = localeTable.captionPlaceholder || 'Your words will appear here…';
  $('#subtitleLanguage').value = uiLanguage;
  $('#meaningLanguage').value = meaningLanguage;
  renderLibrary();
  renderTutorialStep();
  refreshHistoryDialog();
}
function t(key, fallback = '') { return localeTable[key] || fallback || key; }

function setTheme(theme, persist = true) {
  currentTheme = ['light','dark','system'].includes(theme) ? theme : 'system';
  document.documentElement.dataset.theme = currentTheme;
  $('#themeSelect').value = currentTheme;
  $('#settingsTheme').value = currentTheme;
  if (persist) safeSet('hkv-theme', currentTheme);
}
function setVoice(voice, persist = true) {
  currentVoice = voice === 'male' ? 'male' : 'female';
  $$('[data-voice]').forEach(button => {
    const active = button.dataset.voice === currentVoice;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (persist) safeSet('hkv-voice', currentVoice);
}
function setSignLanguage(mode, persist = true) {
  currentMode = normalizeMode(mode);
  selectedHandMode = currentMode;
  if (persist) safeSet('hkv-mode', currentMode);
  $$('[data-mode]').forEach(button => {
    const active = normalizeMode(button.dataset.mode) === currentMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#settingsMode').value = currentMode;
  frameWindow = [];
  stableLabel = '';
  stableConfidenceCount = 0;
  lastAcceptedLabel = '';
  if (!USE_DEMO_MODE && cameraStream) loadClassifierForMode(currentMode).catch(error => announceModelError(currentMode, error));
  renderLibrary();
}
function updateCaptionSize() {
  captionSize = Math.min(2.25, Math.max(1, captionSize));
  document.documentElement.style.setProperty('--caption-size', `${captionSize}rem`);
  safeSet('hkv-caption-size', String(captionSize));
}
function setStatus(text, state = 'idle') {
  $('#handStatus').textContent = text;
  const dot = $('#statusDot');
  dot.classList.toggle('is-live', state === 'live');
  dot.classList.toggle('is-warning', state === 'warning');
  $('#cameraStage').classList.toggle('has-hands', state === 'hands');
}
function showToast(message, kind = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`.trim();
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  const id = ++toastCounter;
  toast.dataset.toastId = String(id);
  $('#toastRegion').append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setCaption(nextText, recordUndo = true) {
  const cleaned = String(nextText ?? '');
  if (recordUndo && cleaned !== currentCaption) {
    undoStack.push(currentCaption);
    if (undoStack.length > 80) undoStack.shift();
  }
  currentCaption = cleaned;
  $('#captionText').textContent = currentCaption;
  $('#captionPlaceholder').hidden = Boolean(currentCaption);
  $('#copyCaption').disabled = !currentCaption.trim();
  $('#shareCaption').disabled = !currentCaption.trim();
  $('#downloadCaption').disabled = !currentCaption.trim();
  $('#showFullScreen').disabled = !currentCaption.trim();
  $('#speakButton').disabled = !currentCaption.trim();
  $('#fullCaptionText').textContent = currentCaption || t('captionPlaceholder', 'Your words will appear here…');
}
function saveCaptionHistory(text) {
  const clean = text.trim();
  if (!clean) return;
  const last = captionHistory[0];
  if (last && last.text === clean && Date.now() - last.timestamp < 1500) return;
  captionHistory.unshift({ text: clean, timestamp: Date.now() });
  captionHistory = captionHistory.slice(0, 40);
  safeSet('hkv-history', JSON.stringify(captionHistory));
  refreshHistoryDialog();
}
function updateCaption(label) {
  const cleanLabel = String(label || '').trim();
  if (!cleanLabel) return;
  let next = currentCaption;
  if (/^[A-Za-z]$/.test(cleanLabel)) {
    next += cleanLabel;
  } else {
    if (next && !/\s$/.test(next)) next += ' ';
    next += cleanLabel;
  }
  next = next.replace(/^\s+/, '');
  setCaption(next);
  saveCaptionHistory(next);
  if (practiceTarget && predictionMatchesPractice(cleanLabel, practiceTarget)) markPracticePassed();
  if (autoSpeakWords) speakText(cleanLabel);
}
function addSpace() {
  if (currentCaption && !/\s$/.test(currentCaption)) {
    setCaption(currentCaption + ' ');
    saveCaptionHistory(currentCaption);
  }
}
function undoLastCharacter() {
  if (!currentCaption) return;
  setCaption(currentCaption.slice(0, -1));
  saveCaptionHistory(currentCaption);
}
function clearCaption() {
  setCaption('');
  undoStack = [];
}
function undoCaption() {
  if (undoStack.length) {
    const previous = undoStack.pop();
    setCaption(previous, false);
    saveCaptionHistory(previous);
  } else undoLastCharacter();
}

async function copyCaption() {
  if (!currentCaption.trim()) return;
  try { await navigator.clipboard.writeText(currentCaption); showToast(t('copied','Caption copied'), 'success'); }
  catch { showToast(t('copyUnavailable','Copy is unavailable in this browser.'), 'warning'); }
}
async function shareCaption() {
  if (!currentCaption.trim()) return;
  try {
    if (navigator.share) await navigator.share({ title: 'Hatho Ki Vaani', text: currentCaption });
    else { await navigator.clipboard.writeText(currentCaption); showToast(t('copiedToShare','Caption copied so you can share it.'), 'success'); }
  } catch (error) { if (error?.name !== 'AbortError') showToast(t('shareUnavailable','Sharing is unavailable here.'), 'warning'); }
}
function downloadCaption() {
  if (!currentCaption.trim()) return;
  const blob = new Blob([`Hatho Ki Vaani\n${new Date().toLocaleString()}\n\n${currentCaption}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'hatho-ki-vaani-caption.txt';
  document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
function openFullScreenCaption() {
  $('#fullCaptionText').textContent = currentCaption;
  $('#fullscreenCaption').showModal();
}

function refreshHistoryDialog() {
  const wrap = $('#historyList');
  if (!wrap) return;
  wrap.replaceChildren();
  if (!captionHistory.length) {
    const p = document.createElement('p'); p.className = 'empty-results'; p.textContent = t('historyEmpty', 'No captions saved yet.'); wrap.append(p); return;
  }
  captionHistory.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'history-item';
    const p = document.createElement('p'); p.textContent = item.text;
    const small = document.createElement('small'); small.textContent = new Date(item.timestamp).toLocaleString(uiLanguage);
    p.append(small);
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = t('copy','Copy'); copy.setAttribute('aria-label', `${t('copy','Copy')}: ${item.text}`);
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(item.text); showToast(t('copied','Caption copied'), 'success'); } catch { setCaption(item.text); showToast(t('copyUnavailable','Copy unavailable.'), 'warning'); } });
    const use = document.createElement('button'); use.type = 'button'; use.textContent = t('use','Use'); use.addEventListener('click', () => { setCaption(item.text); $('#historyDialog').close(); });
    row.append(p, copy, use); wrap.append(row);
  });
}
function clearSavedHistory() {
  captionHistory = []; safeSet('hkv-history', JSON.stringify(captionHistory)); refreshHistoryDialog();
}

function chooseVoiceForSpeech(lang) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const tag = LANG_TAGS[lang] || 'en-US';
  const matchingLanguage = voices.filter(v => v.lang?.toLowerCase().startsWith(tag.split('-')[0].toLowerCase()));
  const pool = matchingLanguage.length ? matchingLanguage : voices;
  const hints = currentVoice === 'female' ? /female|woman|zira|samantha|victoria|karen|eva|susan|aria|jenny|neerja|heera|priya/i : /male|man|david|mark|daniel|alex|guy|george|ravi|hemant/i;
  return pool.find(v => hints.test(v.name)) || pool[0] || null;
}
function showVoiceFallbackNotice() {
  const notice = $('#voiceNotice');
  notice.hidden = false;
  notice.textContent = t('voiceFallbackNotice', 'Using your device’s built-in voice because the online voice service is not configured or unavailable.');
}
function hideVoiceNotice() { $('#voiceNotice').hidden = true; }
function stopCurrentAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function getVoiceId() { return currentVoice === 'male' ? VOICE_MALE_ID : VOICE_FEMALE_ID; }
function isConfiguredVoiceId(value) { return Boolean(value && !value.startsWith('YOUR_ELEVENLABS_') && value.length > 4); }
function speakWithBrowser(text) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    showToast(t('noVoiceSupport','Speech is not supported by this browser.'), 'warning'); return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_TAGS[$('#translateTo').value !== 'none' ? $('#translateTo').value : uiLanguage] || 'en-US';
  utterance.volume = isMuted ? 0 : voiceVolume;
  const voice = chooseVoiceForSpeech($('#translateTo').value !== 'none' ? $('#translateTo').value : uiLanguage);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.94;
  utterance.pitch = currentVoice === 'female' ? 1.08 : 0.88;
  utterance.onstart = () => { hideVoiceNotice(); $('#speakButton').classList.add('is-speaking'); };
  utterance.onend = () => $('#speakButton').classList.remove('is-speaking');
  utterance.onerror = () => $('#speakButton').classList.remove('is-speaking');
  window.speechSynthesis.speak(utterance);
  return true;
}
async function speakText(text = currentCaption) {
  const clean = String(text || '').trim();
  if (!clean) { showToast(t('nothingToSpeak','Add a word or sentence before speaking.'), 'warning'); return; }
  // Avoid reading an isolated letter as though it were a spoken word.
  if (/^[A-Za-z]$/.test(clean)) { showToast(t('singleLetterNotice','Add a word or sentence; single letters are not spoken.'), 'warning'); return; }
  if (isMuted || voiceVolume <= 0) { showToast(t('voiceMuted','Voice is muted.'), 'warning'); return; }
  stopCurrentAudio();
  const voiceId = getVoiceId();
  if (isConfiguredVoiceId(voiceId) && location.protocol !== 'file:') {
    try {
      let audioURL = speechAudioCache.get(`${currentVoice}:${clean}`);
      if (!audioURL) {
        const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean, voiceId }) });
        if (!response.ok) throw new Error(`Speech service returned ${response.status}`);
        const blob = await response.blob();
        if (!blob.type.includes('audio')) throw new Error('Speech service did not return audio.');
        audioURL = URL.createObjectURL(blob);
        speechAudioCache.set(`${currentVoice}:${clean}`, audioURL);
      }
      currentAudio = new Audio(audioURL);
      currentAudio.volume = voiceVolume;
      $('#speakButton').classList.add('is-speaking');
      currentAudio.onended = () => $('#speakButton').classList.remove('is-speaking');
      currentAudio.onerror = () => $('#speakButton').classList.remove('is-speaking');
      await currentAudio.play();
      hideVoiceNotice();
      return;
    } catch (error) {
      console.warn('Online voice unavailable; using browser speech synthesis.', error);
      showVoiceFallbackNotice();
      speakWithBrowser(clean);
      return;
    }
  }
  showVoiceFallbackNotice();
  speakWithBrowser(clean);
}
function toggleMute() {
  isMuted = !isMuted;
  safeSet('hkv-muted', String(isMuted));
  $('#muteButton').setAttribute('aria-pressed', String(isMuted));
  $('#muteButton').textContent = isMuted ? '🔇' : '🔊';
  if (isMuted) stopCurrentAudio();
  showToast(isMuted ? t('voiceMuted','Voice is muted.') : t('voiceUnmuted','Voice is on.'), '');
}

async function translateCaption() {
  const target = $('#translateTo').value;
  if (target === 'none') { showToast(t('chooseTranslation','Choose a target language first.'), ''); return; }
  if (!currentCaption.trim()) { showToast(t('nothingToTranslate','Add a caption to translate.'), 'warning'); return; }
  if (!TRANSLATION_API_URL) {
    showToast(t('translationNotConfigured','Translation service is not configured. Set TRANSLATION_API_URL in app.js to your own endpoint.'), 'warning');
    return;
  }
  try {
    const response = await fetch(TRANSLATION_API_URL, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ text: currentCaption, targetLanguage: target }) });
    if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
    const payload = await response.json();
    if (!payload.translation || typeof payload.translation !== 'string') throw new Error('Translation response must contain a translation string.');
    setCaption(payload.translation); saveCaptionHistory(payload.translation);
    showToast(t('translated','Caption translated.'), 'success');
  } catch (error) { showToast(`${t('translationFailed','Translation failed')}: ${error.message}`, 'warning'); }
}

/* ------------------------------ Camera / CV ------------------------------- */
async function initCamera(deviceId = $('#cameraSelector').value || '') {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast(t('cameraUnsupported','This browser cannot access a camera. Try a current browser on HTTPS or localhost.'), 'warning');
    setStatus(t('cameraUnsupportedShort','Camera unavailable'), 'warning'); return;
  }
  stopCamera(false);
  try {
    const videoConstraints = deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 }, frameRate: { ideal: 24, max: 30 } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 }, frameRate: { ideal: 24, max: 30 } };
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    currentVideoDeviceId = cameraStream.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId || '';
    $('#cameraVideo').srcObject = cameraStream;
    await $('#cameraVideo').play();
    $('#cameraEmpty').hidden = true;
    $('#cameraVideo').hidden = false;
    $('#landmarkCanvas').hidden = false;
    $('#startCamera').disabled = true;
    $('#startCameraEmpty').disabled = true;
    $('#stopCamera').disabled = false;
    $('#flipCamera').disabled = false;
    $('#cameraStage').classList.add('camera-active');
    setStatus(t('cameraLive','Camera is on · Looking for hands'), 'live');
    frameWindow = []; previousFeatureVector = null; frameCounter = 0; lastVideoTime = -1;
    lastHandsSeenAt = Date.now(); handsWereVisible = false; spaceAddedForAbsence = false; demoSessionStarted = Date.now();
    await populateCameraOptions();
    $('#trackingLoading').hidden = Boolean(handLandmarker);
    try {
      await initHandTracking();
      if (handLandmarker) { handTrackingReady = true; startPredictionLoop(); }
      else { setStatus(t('trackingFailed','Hand tracking could not start'), 'warning'); showToast(t('trackingFailedDetail','Reload the page or check your network to load the hand-tracking library.'), 'warning'); }
    } catch (trackingError) {
      // Keep the camera preview usable even if the MediaPipe CDN cannot load.
      console.error('Camera started, but hand tracking failed:', trackingError);
      setStatus(t('trackingFailed','Hand tracking could not start'), 'warning');
      showToast(t('trackingFailedDetail','Camera is on, but hand tracking could not load. Check your network and retry.'), 'warning');
    } finally {
      $('#trackingLoading').hidden = true;
    }
  } catch (error) {
    console.error(error);
    const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
    $('#cameraEmpty').hidden = false;
    setStatus(denied ? t('cameraBlocked','Camera permission blocked') : t('cameraUnavailable','Camera not available'), 'warning');
    showToast(denied ? t('cameraBlockedDetail','Allow camera permission in your browser settings, then retry.') : `${t('cameraRetry','Could not start the camera')}: ${error.message || 'Unknown error'}`, 'warning');
    $('#startCamera').disabled = false; $('#startCameraEmpty').disabled = false;
  }
}
function stopCamera(showMessage = true) {
  if (cameraFrameId) cancelAnimationFrame(cameraFrameId);
  cameraFrameId = 0;
  handTrackingReady = false;
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  $('#cameraVideo').srcObject = null;
  $('#trackingLoading').hidden = true;
  $('#cameraVideo').hidden = true;
  $('#cameraEmpty').hidden = false;
  $('#landmarkCanvas').hidden = true;
  $('#cameraStage').classList.remove('camera-active','has-hands');
  $('#startCamera').disabled = false; $('#startCameraEmpty').disabled = false; $('#stopCamera').disabled = true; $('#flipCamera').disabled = true;
  const canvas = $('#landmarkCanvas'); const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  frameWindow = []; handsWereVisible = false; lastAcceptedLabel = ''; stableLabel = ''; stableConfidenceCount = 0;
  updateGestureUI(0, false);
  setStatus(t('cameraOff','Camera is off'), 'idle');
  if (showMessage) showToast(t('cameraStopped','Camera stopped.'), '');
}
async function populateCameraOptions() {
  const select = $('#cameraSelector');
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
    videoTrackList = devices;
    const previous = currentVideoDeviceId || select.value;
    select.replaceChildren();
    const defaultOption = document.createElement('option'); defaultOption.value = ''; defaultOption.textContent = t('defaultCamera','Default camera'); select.append(defaultOption);
    devices.forEach((device, index) => {
      const option = document.createElement('option'); option.value = device.deviceId; option.textContent = device.label || `${t('camera','Camera')} ${index+1}`; select.append(option);
    });
    if (devices.some(d => d.deviceId === previous)) select.value = previous;
  } catch { /* Camera selection is optional. */ }
}
async function switchCamera() {
  if (!videoTrackList.length) await populateCameraOptions();
  if (videoTrackList.length < 2) { showToast(t('onlyOneCamera','Only one camera is available.'), ''); return; }
  const index = videoTrackList.findIndex(d => d.deviceId === currentVideoDeviceId);
  const next = videoTrackList[(index + 1) % videoTrackList.length];
  $('#cameraSelector').value = next.deviceId;
  await initCamera(next.deviceId);
}

async function initHandTracking() {
  if (handLandmarker) return handLandmarker;
  try {
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    const options = {
      runningMode: 'VIDEO',
      // Track up to two hands so the double-thumbs-up command works in either mode.
      // ASL classification below still uses a single 21-point hand tensor.
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    };
    try {
      handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        ...options, baseOptions: { modelAssetPath, delegate: 'GPU' }
      });
    } catch (gpuError) {
      // CPU fallback helps older devices and browsers where GPU delegation is unavailable.
      console.warn('MediaPipe GPU delegate unavailable; retrying with CPU.', gpuError);
      handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        ...options, baseOptions: { modelAssetPath, delegate: 'CPU' }
      });
    }
    return handLandmarker;
  } catch (error) {
    console.error('MediaPipe failed to initialise', error);
    handLandmarker = null;
    throw error;
  }
}
function startPredictionLoop() {
  if (!cameraStream || cameraFrameId) return;
  const tick = () => {
    if (!cameraStream) { cameraFrameId = 0; return; }
    const video = $('#cameraVideo');
    if (video.readyState < 2 || video.currentTime === lastVideoTime) { cameraFrameId = requestAnimationFrame(tick); return; }
    lastVideoTime = video.currentTime;
    const now = performance.now();
    let result = null;
    try { result = handLandmarker.detectForVideo(video, now); }
    catch (error) { console.warn('Hand detection frame failed', error); }
    const hands = result?.landmarks || [];
    drawLandmarks(hands);
    updateHandStatus(hands.length);
    const poseDetected = speakGestureEnabled && detectThumbsUp(result);
    updateSpeakGesture(poseDetected, now);
    if (hands.length) {
      lastHandsSeenAt = Date.now();
      handsWereVisible = true;
      spaceAddedForAbsence = false;
      if (!poseDetected) {
        const vector = normaliseLandmarks(hands, result?.handednesses || [], currentMode);
        frameWindow.push(vector);
        if (frameWindow.length > WINDOW_LENGTH) frameWindow.shift();
        frameCounter++;
        if (frameCounter % PREDICT_EVERY_N_FRAMES === 0 && frameWindow.length === WINDOW_LENGTH && !inferenceBusy) {
          inferenceBusy = true;
          predictSign(frameWindow, currentMode, hands).then(prediction => {
            if (prediction) processPrediction(prediction);
          }).catch(error => {
            console.warn('Prediction failed', error);
            if (!USE_DEMO_MODE) announceModelError(currentMode, error);
          }).finally(() => { inferenceBusy = false; });
        }
      } else {
        stableLabel = ''; stableConfidenceCount = 0;
      }
    } else {
      if (handsWereVisible) {
        frameWindow = []; previousFeatureVector = null;
        stableLabel = ''; stableConfidenceCount = 0; lastAcceptedLabel = '';
      }
      handsWereVisible = false;
      if (!spaceAddedForAbsence && Date.now() - lastHandsSeenAt >= 1500 && currentCaption && !/\s$/.test(currentCaption)) {
        addSpace(); spaceAddedForAbsence = true;
      }
    }
    // Let the second gesture expire silently; the user asked for no warning.
    if (gestureConfirmations === 1 && Date.now() > gestureDeadline) resetGestureSequence();
    cameraFrameId = requestAnimationFrame(tick);
  };
  cameraFrameId = requestAnimationFrame(tick);
}
function updateHandStatus(count) {
  if (!cameraStream) { setStatus(t('cameraOff','Camera is off'), 'idle'); return; }
  if (count > 0) setStatus(t('handsDetected','Hands detected'), 'hands');
  else setStatus(t('lookingForHands','Looking for hands…'), 'live');
}
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8], [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16], [13,17],[17,18],[18,19],[19,20],[0,17]
];
function drawLandmarks(hands) {
  const video = $('#cameraVideo'); const canvas = $('#landmarkCanvas'); const ctx = canvas.getContext('2d');
  if (!video.videoWidth || !video.videoHeight) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const hand of hands) {
    ctx.lineWidth = Math.max(2, canvas.width / 520); ctx.strokeStyle = '#D4C8FF'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const [a,b] of HAND_CONNECTIONS) {
      if (!hand[a] || !hand[b]) continue;
      ctx.moveTo((1 - hand[a].x) * canvas.width, hand[a].y * canvas.height);
      ctx.lineTo((1 - hand[b].x) * canvas.width, hand[b].y * canvas.height);
    }
    ctx.stroke();
    for (let i=0;i<hand.length;i++) {
      const point = hand[i]; const x = (1-point.x)*canvas.width; const y = point.y*canvas.height;
      ctx.beginPath(); ctx.arc(x,y, i===0 ? 5 : 3.4,0,Math.PI*2); ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#F4AFCB' : '#E8E0FF'; ctx.fill(); ctx.strokeStyle = '#52426F'; ctx.lineWidth = 1.3; ctx.stroke();
    }
  }
}
function sortHandsForInput(hands, handednesses, mode) {
  if (mode === 'asl') {
    // ASL network shape is 30 x 63: deliberately classify only one hand.
    const rightIndex = handednesses.findIndex(list => list?.[0]?.categoryName?.toLowerCase() === 'right');
    return [hands[rightIndex >= 0 ? rightIndex : 0]];
  }
  // For ISL, consistent screen-space ordering prevents the two hands swapping tensor slots.
  return [...hands].sort((a,b) => a.reduce((sum,p)=>sum+p.x,0)/a.length - b.reduce((sum,p)=>sum+p.x,0)/b.length).slice(0,2);
}
function normaliseOneHand(landmarks) {
  if (!landmarks || landmarks.length !== 21) return Array(63).fill(0);
  const wrist = landmarks[0];
  const centred = landmarks.map(point => ({ x: point.x - wrist.x, y: point.y - wrist.y, z: (point.z || 0) - (wrist.z || 0) }));
  let size = 0;
  for (const p of centred) size = Math.max(size, Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z));
  if (!size || !Number.isFinite(size)) return Array(63).fill(0);
  return centred.flatMap(p => [p.x/size, p.y/size, p.z/size]).map(n => Number.isFinite(n) ? n : 0);
}
function normaliseLandmarks(hands, handednesses = [], mode = currentMode) {
  const selected = sortHandsForInput(hands, handednesses, mode);
  const one = selected.map(normaliseOneHand);
  if (mode === 'asl') return one[0] || Array(63).fill(0);
  while (one.length < 2) one.push(Array(63).fill(0));
  return [...one[0], ...one[1]];
}
function announceModelError(mode, error) {
  const normalized = normalizeMode(mode);
  if (modelErrorNotified[normalized]) return;
  modelErrorNotified[normalized] = true;
  showToast(`${t('modelFailed','Model failed to load')}: ${error?.message || t('predictionError','Check your model and labels.')}`, 'warning');
}
async function loadClassifierForMode(mode) {
  if (USE_DEMO_MODE) return null;
  const normalized = normalizeMode(mode);
  if (modelCache[normalized]) return modelCache[normalized];
  if (modelLoadErrors[normalized]) throw modelLoadErrors[normalized];
  if (modelLoadPromises[normalized]) return modelLoadPromises[normalized];
  modelLoadPromises[normalized] = (async () => {
    if (!window.tf) throw new Error('TensorFlow.js did not load from its CDN.');
    const labelsPath = `./models/${normalized}/labels.json`;
    const labelsResponse = await fetch(labelsPath, { cache: 'no-cache' });
    if (!labelsResponse.ok) throw new Error(`${labelsPath} is missing.`);
    let labels;
    try { labels = await labelsResponse.json(); }
    catch (error) { throw new Error(`Could not parse ${labelsPath}: ${error.message}`); }
    if (!Array.isArray(labels) && (!labels || typeof labels !== 'object')) {
      throw new Error(`${labelsPath} must contain an array or object.`);
    }
    const model = await window.tf.loadLayersModel(`./models/${normalized}/model.json`);
    modelCache[normalized] = model;
    labelsCache[normalized] = labels;
    return model;
  })().catch(error => {
    modelLoadErrors[normalized] = error;
    throw error;
  }).finally(() => { modelLoadPromises[normalized] = null; });
  return modelLoadPromises[normalized];
}
function readLabel(labels, index) {
  if (Array.isArray(labels)) return labels[index] ?? String(index);
  if (labels && typeof labels === 'object') return labels[index] ?? labels[String(index)] ?? String(index);
  return String(index);
}
async function predictSign(windowFrames, mode, hands) {
  if (USE_DEMO_MODE) {
    // Sample classifier: only runs when a hand is visible. It is intentionally
    // labelled as demo output and must not be presented as real translation.
    const demoWords = ['HELLO','HELP','YES','THANK YOU','WATER','PLEASE','A','B','C','H'];
    const elapsed = Math.max(0, Date.now() - demoSessionStarted);
    const index = Math.floor(elapsed / 5000) % demoWords.length;
    const confidence = 0.84 + (Math.sin(elapsed / 410 + index) + 1) * 0.055;
    return { label: demoWords[index], confidence: Math.min(0.96, confidence), demo: true };
  }
  const model = await loadClassifierForMode(mode);
  const shapeLength = mode === 'asl' ? 63 : 126;
  const flat = windowFrames.flat();
  if (flat.length !== WINDOW_LENGTH * shapeLength) throw new Error(`Expected ${WINDOW_LENGTH * shapeLength} input values; received ${flat.length}.`);
  const input = window.tf.tensor3d(flat, [1, WINDOW_LENGTH, shapeLength]);
  let output = null;
  try {
    output = model.predict(input);
    const tensor = Array.isArray(output) ? output[0] : output;
    const values = await tensor.data();
    let bestIndex = 0;
    for (let i=1;i<values.length;i++) if (values[i] > values[bestIndex]) bestIndex = i;
    return { label: readLabel(labelsCache[mode], bestIndex), confidence: Number(values[bestIndex]) || 0, demo: false };
  } finally {
    input.dispose();
    if (Array.isArray(output)) output.forEach(tensor => tensor?.dispose?.());
    else output?.dispose?.();
  }
}
function processPrediction(prediction) {
  if (!prediction || !prediction.label) return;
  if (prediction.confidence < confidenceThreshold) {
    stableLabel = ''; stableConfidenceCount = 0;
    return;
  }
  const label = String(prediction.label).trim();
  if (label === stableLabel) stableConfidenceCount++;
  else { stableLabel = label; stableConfidenceCount = 1; }
  if (stableConfidenceCount >= MIN_STABLE_PREDICTIONS && label !== lastAcceptedLabel) {
    lastAcceptedLabel = label;
    updateCaption(label);
    stableConfidenceCount = 0;
    if (prediction.demo) $('#demoBadge').textContent = `${t('demoMode','DEMO MODE')} · ${Math.round(prediction.confidence*100)}%`;
    else $('#demoBadge').textContent = `${t('confidence','CONFIDENCE')}: ${Math.round(prediction.confidence*100)}%`;
  }
}

/* --------------------------- Two-thumbs-up command ------------------------- */
function isThumbsUpHand(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  const thumbTip = landmarks[4], thumbIp = landmarks[3], wrist = landmarks[0];
  const thumbRaised = thumbTip.y < thumbIp.y - 0.025 && thumbTip.y < wrist.y - 0.04;
  const curled = [[8,6],[12,10],[16,14],[20,18]].every(([tip,joint]) => landmarks[tip].y > landmarks[joint].y - 0.015);
  // Require a clearly raised thumb and generally folded non-thumb fingers.
  return thumbRaised && curled;
}
function detectThumbsUp(result) {
  const hands = result?.landmarks || [];
  return hands.length >= 2 && isThumbsUpHand(hands[0]) && isThumbsUpHand(hands[1]);
}
function updateSpeakGesture(detected, now = performance.now()) {
  if (!speakGestureEnabled) { updateGestureUI(0, false); return; }
  if (gestureConfirmations === 1 && Date.now() > gestureDeadline) resetGestureSequence();
  if (detected) {
    if (!lastGesturePose) gestureHoldStartedAt = now;
    lastGesturePose = true;
    const elapsed = now - gestureHoldStartedAt;
    updateGestureUI(Math.min(1, elapsed / THUMBS_HOLD_MS), true);
    if (elapsed >= THUMBS_HOLD_MS && !gesturePoseLatched) {
      gesturePoseLatched = true;
      if (gestureConfirmations === 0) {
        gestureConfirmations = 1;
        gestureDeadline = Date.now() + THUMBS_WINDOW_MS;
        readyForSecondGesture = false;
        updateGestureDots();
      } else if (gestureConfirmations === 1 && readyForSecondGesture && Date.now() <= gestureDeadline) {
        gestureConfirmations = 2;
        updateGestureDots();
        runGestureSpeakAction();
      }
    }
  } else {
    lastGesturePose = false;
    gestureHoldStartedAt = 0;
    gesturePoseLatched = false;
    updateGestureUI(0, false);
    if (gestureConfirmations === 1 && Date.now() <= gestureDeadline) readyForSecondGesture = true;
  }
}
function updateGestureUI(progress, visible) {
  const wrap = $('#gestureRingWrap');
  wrap.classList.toggle('is-visible', Boolean(visible && speakGestureEnabled));
  const circumference = 138.2;
  $('#gestureRingProgress').style.strokeDashoffset = String(circumference * (1 - Math.min(1, Math.max(0, progress))));
}
function updateGestureDots() {
  $('#gestureDot1').classList.toggle('done', gestureConfirmations >= 1);
  $('#gestureDot2').classList.toggle('done', gestureConfirmations >= 2);
  $('#gestureHint').setAttribute('aria-label', `${t('gestureInstruction','Thumbs up with both hands, twice, to speak')} (${gestureConfirmations}/2)`);
}
function resetGestureSequence() {
  gestureConfirmations = 0; gestureDeadline = 0; readyForSecondGesture = false; gesturePoseLatched = false; lastGesturePose = false; gestureHoldStartedAt = 0;
  updateGestureDots(); updateGestureUI(0, false);
}
function runGestureSpeakAction() {
  const caption = currentCaption;
  resetGestureSequence();
  playSoftChime();
  if (caption.trim()) speakText(caption);
  else showToast(t('gestureNoCaption','There is no caption to speak yet.'), '');
}
function playSoftChime() {
  try {
    backgroundAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = backgroundAudioContext;
    const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.055 * voiceVolume, ctx.currentTime + 0.035); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.23);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.25);
  } catch { /* Audio context can be unavailable or blocked; speaking still proceeds. */ }
}
function simulateDemoDoubleThumbsUp() {
  if (!USE_DEMO_MODE) { showToast(t('demoKeyOnly','The T key gesture simulation is available only in demo mode.'), ''); return; }
  // Keyboard demo shortcut simulates the two confirmations; no physical pose needed.
  resetGestureSequence();
  gestureConfirmations = 2; updateGestureDots(); runGestureSpeakAction();
}

/* ------------------------------- Sign library ------------------------------ */
function getAllEntries() {
  const library = SIGN_LIBRARY[currentMode];
  if (!library) return [];
  if (currentTab === 'alphabet') return [...library.alphabet, ...library.numbers];
  if (currentTab === 'words') return library.words;
  if (currentTab === 'sentences') return library.sentences;
  return [...library.alphabet, ...library.numbers, ...library.words, ...library.sentences];
}
function getFilteredEntries() {
  let entries = getAllEntries();
  if (selectedLetter && currentTab === 'alphabet') entries = entries.filter(entry => entry.id.toUpperCase() === selectedLetter || (entry.category === 'numbers' && selectedLetter === '#'));
  if (selectedCategory !== 'all' && ['dictionary','words','sentences'].includes(currentTab)) entries = entries.filter(entry => entry.category === selectedCategory);
  const query = libraryQuery.trim().toLocaleLowerCase();
  if (query) entries = entries.filter(entry => {
    const terms = [entry.id, entry.category, ...Object.values(entry.labels || {})];
    return terms.some(value => String(value).toLocaleLowerCase().includes(query));
  });
  return entries;
}
function categoryText(category) { return t(category, CATEGORY_LABELS[category] || category); }
function makeImageBox(entry, large = false) {
  const wrap = document.createElement('div'); wrap.className = `sign-image-wrap${large ? ' detail-art' : ''}`;
  const img = document.createElement('img');
  img.src = entry.image.startsWith('/') ? `.${entry.image}` : entry.image;
  const label = getMeaning(entry);
  const modeName = currentMode.toUpperCase();
  img.alt = (entry.category === 'alphabet' || entry.category === 'numbers') && currentMode === 'asl'
    ? `Illustrative hand icon for ${label}; not a verified ASL sign.`
    : `Sign image for ${label}; image may be a placeholder.`;
  img.loading = 'lazy';
  img.onerror = () => { img.hidden = true; fallback.hidden = false; };
  const fallback = document.createElement('div'); fallback.className = 'sign-fallback';
  const icon = document.createElement('span'); icon.className = 'hand-icon'; icon.textContent = '✋';
  const strong = document.createElement('strong'); strong.textContent = entry.category === 'alphabet' ? entry.id.toUpperCase() : (entry.symbol || label);
  const small = document.createElement('small'); small.textContent = t('imageComing','Image coming soon');
  fallback.append(icon,strong,small); fallback.hidden = true;
  wrap.append(img, fallback);
  if (currentMode === 'asl' && ['alphabet','numbers'].includes(entry.category) && !img.hidden) {
    const badge = document.createElement('span'); badge.className = 'illustration-disclaimer'; badge.textContent = t('illustrationOnly','Illustration only · not a verified sign'); wrap.append(badge);
  }
  return wrap;
}
function makeCard(entry) {
  const article = document.createElement('article'); article.className = 'sign-card';
  const open = document.createElement('button'); open.type = 'button'; open.className = 'card-open'; open.style.cssText = 'text-align:left;background:transparent;border:0;padding:0;color:inherit;display:flex;flex-direction:column;width:100%;flex:1;';
  open.setAttribute('aria-label', `${t('openDetails','Open sign details')}: ${getMeaning(entry)}`);
  const image = makeImageBox(entry); open.append(image);
  const title = document.createElement('h3');
  title.textContent = entry.category === 'alphabet' ? entry.id.toUpperCase() : (entry.symbol ? `${entry.symbol} · ${getMeaning(entry)}` : getMeaning(entry));
  const meaning = document.createElement('p'); meaning.className = 'meaning-line';
  const englishMeaning = entry.labels?.en || getMeaning(entry);
  meaning.textContent = `${t('means','Means')}: ${englishMeaning}`;
  const description = document.createElement('p'); description.className = 'how-line'; description.textContent = entry.description?.[meaningLanguage] || entry.description?.en || '';
  open.append(title, meaning, description);
  open.addEventListener('click', () => openSignDetail(entry));
  const bottom = document.createElement('div'); bottom.className = 'sign-card-bottom';
  const chip = document.createElement('span'); chip.className = 'category-chip'; chip.textContent = categoryText(entry.category);
  const speaker = document.createElement('button'); speaker.type = 'button'; speaker.className = 'card-speak'; speaker.textContent = '🔊'; speaker.setAttribute('aria-label', `${t('speak','Speak')} ${getMeaning(entry)}`);
  speaker.addEventListener('click', event => { event.stopPropagation(); speakText(getMeaning(entry)); });
  bottom.append(chip,speaker); article.append(open,bottom);
  if (showAllLanguages) {
    const all = document.createElement('div'); all.className = 'all-language-preview';
    SUPPORTED_LANGUAGES.forEach(lang => {
      const line = document.createElement('div'); line.className = 'all-language-line';
      const langName = document.createElement('strong'); langName.textContent = `${languageDisplayName(lang)}: `;
      const txt = document.createElement('span'); txt.textContent = getMeaning(entry,lang);
      const speaker2 = document.createElement('button'); speaker2.type='button';speaker2.className='inline-speak';speaker2.textContent='🔊';speaker2.setAttribute('aria-label',`${t('speak','Speak')} ${languageDisplayName(lang)} ${getMeaning(entry,lang)}`);
      speaker2.style.cssText='float:right;border:0;background:transparent;color:var(--primary);cursor:pointer;min-height:25px;min-width:28px;';
      speaker2.addEventListener('click', event => { event.stopPropagation(); setTempSpeechLanguage(lang, getMeaning(entry,lang)); });
      line.append(langName,txt,speaker2); all.append(line);
    });
    article.append(all);
  }
  return article;
}
async function setTempSpeechLanguage(lang, text) {
  const oldLang = uiLanguage;
  const oldMeaning = $('#translateTo').value;
  $('#translateTo').value = lang;
  await speakText(text);
  $('#translateTo').value = oldMeaning;
}
function renderLibrary() {
  const results = $('#libraryResults');
  if (!results) return;
  const filtered = getFilteredEntries();
  results.replaceChildren();
  results.setAttribute('aria-labelledby', `tab${currentTab[0].toUpperCase()}${currentTab.slice(1)}`);
  if (!filtered.length) {
    const empty = document.createElement('p'); empty.className='empty-results'; empty.textContent = t('noEntries','No matching signs found. Try another search or category.'); results.append(empty);
  } else {
    const fragment = document.createDocumentFragment();
    filtered.forEach(entry => fragment.append(makeCard(entry)));
    results.append(fragment);
  }
  $('#resultsCount').textContent = `${filtered.length} ${t('entries','entries')}`;
  $$('.library-tab').forEach(tab => {
    const active = tab.dataset.tab === currentTab;
    tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active));
  });
  $('#alphabetJump').hidden = currentTab !== 'alphabet';
  $('#categoryFilters').hidden = !['dictionary','words','sentences'].includes(currentTab);
  if (currentTab === 'alphabet') renderAlphabetJump();
}
function renderAlphabetJump() {
  const wrap = $('#alphabetJump'); wrap.replaceChildren();
  const allButton = document.createElement('button'); allButton.type='button'; allButton.textContent='A–Z'; allButton.classList.toggle('is-selected', !selectedLetter); allButton.addEventListener('click', () => { selectedLetter=''; renderLibrary(); }); wrap.append(allButton);
  LETTERS.forEach(letter => {
    const button = document.createElement('button'); button.type='button'; button.textContent=letter; button.classList.toggle('is-selected',selectedLetter===letter); button.setAttribute('aria-pressed',String(selectedLetter===letter)); button.addEventListener('click',()=>{selectedLetter=letter;renderLibrary();}); wrap.append(button);
  });
  const digits = document.createElement('button'); digits.type='button'; digits.textContent='0–9'; digits.classList.toggle('is-selected',selectedLetter==='#'); digits.setAttribute('aria-pressed',String(selectedLetter==='#')); digits.addEventListener('click',()=>{selectedLetter=selectedLetter==='#'?'':'#';renderLibrary();}); wrap.append(digits);
}
function openSignDetail(entry) {
  practicePassed = false;
  activeDetailEntry = entry;
  detailCollection = getFilteredEntries();
  const index = detailCollection.findIndex(item => item.id === entry.id && item.category === entry.category);
  activeHistoryIndex = index >= 0 ? index : 0;
  renderSignDetail(entry);
  $('#signDialog').showModal();
}
function renderSignDetail(entry) {
  const content = $('#signDetailContent'); content.replaceChildren();
  const grid = document.createElement('div'); grid.className = 'sign-detail-grid';
  grid.append(makeImageBox(entry,true));
  const copy = document.createElement('div'); copy.className='detail-copy';
  const h2 = document.createElement('h2'); h2.id='detailTitle'; h2.textContent = entry.category==='alphabet' ? entry.id.toUpperCase() : (entry.symbol ? `${entry.symbol} · ${getMeaning(entry)}` : getMeaning(entry));
  const meaning = document.createElement('p'); meaning.className='detail-meaning'; meaning.textContent = `${t('means','Means')}: ${getMeaning(entry)}`;
  const desc = document.createElement('p'); desc.textContent = entry.description?.[meaningLanguage] || entry.description?.en || '';
  const detailHeading = document.createElement('h3');
  const ol = document.createElement('ol');
  if (entry.category === 'sentences') {
    detailHeading.textContent = t('sentenceSequence','Sequence of signs (needs verification)');
    const phrase = String(getMeaning(entry, meaningLanguage) || entry.labels?.en || '').replace(/[?!。，،.…]+/g, '').trim();
    const tokens = phrase.split(/\s+/).filter(Boolean);
    tokens.forEach((token, index) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong'); strong.textContent = `${index + 1}. ${token}`;
      const note = document.createElement('small'); note.textContent = ` — ${t('sequenceStepNote','Add a verified sign image and hand-motion guide for this step.')}`;
      li.append(strong, note); ol.append(li);
    });
  } else {
    detailHeading.textContent = t('signSteps','Sign steps (needs verification)');
    const steps = [t('handshapeStep','Handshape: add a verified description for the fingers and thumb.'),t('positionStep','Position: add a verified description of where the hands are held.'),t('movementStep','Movement: add a verified description of direction and motion.')];
    steps.forEach(text => { const li=document.createElement('li');li.textContent=text;ol.append(li); });
  }
  const allTitle = document.createElement('h3'); allTitle.textContent=t('allMeaningLanguages','Meaning in all languages');
  const languages = document.createElement('div'); languages.className='detail-languages';
  SUPPORTED_LANGUAGES.forEach(lang => {
    const row=document.createElement('div');row.className='detail-language';
    const name=document.createElement('strong');name.textContent=`${languageDisplayName(lang)}: `;
    const val=document.createElement('span');val.textContent=getMeaning(entry,lang);
    const sp=document.createElement('button');sp.type='button';sp.textContent='🔊';sp.setAttribute('aria-label',`${t('speak','Speak')} ${languageDisplayName(lang)}`);sp.addEventListener('click',()=>setTempSpeechLanguage(lang,getMeaning(entry,lang)));
    row.append(name,val,sp);languages.append(row);
  });
  copy.append(h2,meaning,desc,detailHeading,ol,allTitle,languages);
  if (entry.video) {
    const video = document.createElement('video'); video.controls=true;video.preload='metadata';video.playsInline=true;video.src=entry.video;
    const videoLabel=document.createElement('h3');videoLabel.textContent=t('signVideo','Sign video');copy.append(videoLabel,video);
  } else {
    const videoNote=document.createElement('p');videoNote.className='detail-video-note';videoNote.textContent=t('signVideoMissing','No sign video is mapped to this entry yet. Add one under /images/{isl|asl}/words/{id}.mp4 or set the entry video property.');copy.append(videoNote);
  }
  const actions=document.createElement('div');actions.className='detail-actions';
  const practice=document.createElement('button');practice.type='button';practice.className='primary-button';practice.textContent=`✓ ${t('practiceSign','Practice this sign')}`;practice.addEventListener('click',()=>practiceSign(entry));
  const speak=document.createElement('button');speak.type='button';speak.className='secondary-button';speak.textContent=`🔊 ${t('speak','Speak')}`;speak.addEventListener('click',()=>speakText(getMeaning(entry)));
  const practiceStatus=document.createElement('p');practiceStatus.id='practiceStatus';practiceStatus.className='practice-status';practiceStatus.setAttribute('aria-live','polite');practiceStatus.textContent=practicePassed?t('practiceRecognised','✓ Sign recognised (demo/model output)'):t('practiceWaiting','Show this sign while the camera is on.');
  if (practicePassed) practiceStatus.classList.add('passed');
  actions.append(practice,speak);copy.append(actions,practiceStatus);grid.append(copy);content.append(grid);
  $('#detailPosition').textContent = `${Math.max(0,activeHistoryIndex)+1} / ${Math.max(1,detailCollection.length)}`;
  $('#prevSign').disabled = detailCollection.length < 2; $('#nextSign').disabled = detailCollection.length < 2;
}
function moveDetail(delta) {
  if (!detailCollection.length) return;
  activeHistoryIndex = (activeHistoryIndex + delta + detailCollection.length) % detailCollection.length;
  activeDetailEntry = detailCollection[activeHistoryIndex]; practicePassed = false; renderSignDetail(activeDetailEntry);
}
async function practiceSign(entry) {
  practiceTarget=entry;practicePassed=false;
  $('#practiceBanner').hidden=false;
  $('#practiceTitle').textContent = `${t('practiceSign','Practice this sign')}: ${getMeaning(entry)}`;
  $('#practiceStatusInline').textContent = t('practiceWaiting','Show this sign while the camera is on.');
  $('#practiceStatusInline').classList.remove('passed');
  $('#signDialog').close();
  document.querySelector('#main').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block:'start' });
  if (!cameraStream) await initCamera();
  showToast(t('practiceHint','Practice mode is ready. Keep your hand in frame; demo mode is not a reliable sign assessment.'), '');
}
function cancelPractice() {
  practiceTarget = null; practicePassed = false; $('#practiceBanner').hidden = true;
}
function predictionMatchesPractice(label, entry) {
  const normalize = value => String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g,'').trim();
  const targetTokens=[entry.id, entry.labels?.en, entry.labels?.[meaningLanguage]].map(normalize);
  const result=normalize(label);
  return targetTokens.includes(result) || result === normalize(entry.id);
}
function markPracticePassed() {
  practicePassed=true;
  const statusText = `✓ ${t('practiceRecognised','Sign recognised (demo/model output)')}`;
  const node=$('#practiceStatus');
  if(node){node.textContent=statusText;node.classList.add('passed');}
  const inline=$('#practiceStatusInline');
  if(inline){inline.textContent=statusText;inline.classList.add('passed');}
  showToast(t('practiceRecognised','Sign recognised (demo/model output)'), 'success');
}

/* ----------------------------- Tutorial + video ---------------------------- */
function initHowToVideo() {
  const video=$('#howToVideo'), placeholder=$('#videoPlaceholder');
  if (!HOW_TO_VIDEO_URL.trim()) { video.hidden=true;placeholder.hidden=false;return; }
  if (/youtu\.be|youtube\.com/.test(HOW_TO_VIDEO_URL)) {
    // YouTube embeds require an iframe; direct <video> playback is for MP4 URLs.
    const id = HOW_TO_VIDEO_URL.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
    if (!id) { placeholder.hidden=false;return; }
    const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}`;frame.title='Hatho Ki Vaani tutorial';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';frame.allowFullscreen=true;frame.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:16px;background:#171421;';
    video.replaceWith(frame); placeholder.hidden=true;
  } else {
    video.src=HOW_TO_VIDEO_URL;video.hidden=false;placeholder.hidden=true;setSubtitleTrack(uiLanguage);
  }
}
function setSubtitleTrack(lang) {
  const track=$('#subtitleTrack');
  if (!track) return;
  track.src=`./subtitles/${lang}.vtt`;track.srclang=lang;track.label=languageDisplayName(lang);track.default=true;
  const video=$('#howToVideo'); if (video?.textTracks?.[0]) video.textTracks[0].mode='showing';
}
function tutorialEntries() {
  return [
    [$('#step1Title').textContent,$('#step1Body').textContent],[$('#step2Title').textContent,$('#step2Body').textContent],
    [$('#step3Title').textContent,$('#step3Body').textContent],[$('#step4Title').textContent,$('#step4Body').textContent],
    [$('#step5Title').textContent,$('#step5Body').textContent],[$('#step6Title').textContent,$('#step6Body').textContent]
  ];
}
function renderTutorialStep() {
  if (!$('#tutorialStepCopy')) return;
  const entries=tutorialEntries(); const [title,body]=entries[tutorialStepIndex] || entries[0];
  $('#tutorialIllustration').textContent=TUTORIAL_ICONS[tutorialStepIndex] || '✋';
  $('#tutorialStepCopy').textContent=`${title}. ${body}`;
  const progress=$('#tutorialProgress');progress.replaceChildren();
  entries.forEach((_,index)=>{const dot=document.createElement('span');dot.classList.toggle('done',index<=tutorialStepIndex);progress.append(dot);});
  $('#nextTutorial').textContent=tutorialStepIndex===entries.length-1?t('done','Done'):t('next','Next');
}
function showTutorial(force = false) {
  if (!force && safeGet('hkv-skip-tutorial','false')==='true') return;
  tutorialStepIndex=0;$('#dontShowTutorial').checked=false;renderTutorialStep();
  if (!$('#tutorialDialog').open) $('#tutorialDialog').showModal();
}
function advanceTutorial() {
  if ($('#dontShowTutorial').checked) safeSet('hkv-skip-tutorial','true');
  if (tutorialStepIndex < 5) { tutorialStepIndex++;renderTutorialStep(); }
  else { $('#tutorialDialog').close(); if ($('#dontShowTutorial').checked) safeSet('hkv-skip-tutorial','true'); }
}

/* -------------------------------- Settings --------------------------------- */
function openSettings() {
  $('#settingsDrawer').classList.add('is-open');$('#settingsDrawer').setAttribute('aria-hidden','false');$('#drawerBackdrop').hidden=false;
  $('#closeSettings').focus();
}
function closeSettings() {
  $('#settingsDrawer').classList.remove('is-open');$('#settingsDrawer').setAttribute('aria-hidden','true');$('#drawerBackdrop').hidden=true;
  $('#settingsButton').focus();
}
function applySettings() {
  confidenceThreshold=Number($('#confidenceSlider').value)/100;safeSet('hkv-confidence',String($('#confidenceSlider').value));$('#confidenceValue').textContent=`${$('#confidenceSlider').value}%`;
  speakGestureEnabled=$('#speakGestureToggle').checked;safeSet('hkv-speak-gesture',String(speakGestureEnabled));if(!speakGestureEnabled)resetGestureSequence();
  autoSpeakWords=$('#autoSpeakToggle').checked;safeSet('hkv-auto-speak',String(autoSpeakWords));
  reduceMotion=$('#reduceMotionToggle').checked;safeSet('hkv-reduce-motion',String(reduceMotion));document.documentElement.classList.toggle('reduce-motion',reduceMotion);
}

function initEvents() {
  $('#uiLanguage').addEventListener('change',e=>setUILanguage(e.target.value));
  $('#settingsUILanguage').addEventListener('change',e=>setUILanguage(e.target.value));
  $('#themeSelect').addEventListener('change',e=>setTheme(e.target.value));$('#settingsTheme').addEventListener('change',e=>setTheme(e.target.value));
  $('#themeButton').addEventListener('click',()=>{const next=currentTheme==='system'?'light':currentTheme==='light'?'dark':'system';setTheme(next);showToast(`${t('theme','Theme')}: ${t(next,next)}`,'');});
  $('#languageMenuButton').addEventListener('click',()=>$('#uiLanguage').focus());
  $$('[data-mode]').forEach(button=>button.addEventListener('click',()=>setSignLanguage(button.dataset.mode)));
  $('#settingsMode').addEventListener('change',e=>setSignLanguage(e.target.value));
  $('#startCamera').addEventListener('click',()=>initCamera());$('#startCameraEmpty').addEventListener('click',()=>initCamera());$('#stopCamera').addEventListener('click',()=>stopCamera());$('#flipCamera').addEventListener('click',switchCamera);
  $('#cameraSelector').addEventListener('change',e=>{if(cameraStream)initCamera(e.target.value);});
  $('#speakButton').addEventListener('click',()=>speakText());$('#muteButton').addEventListener('click',toggleMute);
  $$('[data-voice]').forEach(button=>button.addEventListener('click',()=>setVoice(button.dataset.voice)));
  $('#volumeSlider').addEventListener('input',e=>{voiceVolume=Number(e.target.value)/100;$('#volumeValue').textContent=`${e.target.value}%`;safeSet('hkv-volume',String(e.target.value));if(currentAudio)currentAudio.volume=voiceVolume;});
  $('#clearButton').addEventListener('click',clearCaption);$('#undoButton').addEventListener('click',undoCaption);$('#spaceButton').addEventListener('click',addSpace);
  $('#copyCaption').addEventListener('click',copyCaption);$('#shareCaption').addEventListener('click',shareCaption);$('#downloadCaption').addEventListener('click',downloadCaption);$('#showFullScreen').addEventListener('click',openFullScreenCaption);
  $('#textLarger').addEventListener('click',()=>{captionSize+=.15;updateCaptionSize();});$('#textSmaller').addEventListener('click',()=>{captionSize-=.15;updateCaptionSize();});
  $('#translateButton').addEventListener('click',translateCaption);$('#showHistory').addEventListener('click',()=>{$('#historyDialog').showModal();refreshHistoryDialog();});$('#closeHistory').addEventListener('click',()=>$('#historyDialog').close());$('#clearHistory').addEventListener('click',clearSavedHistory);
  $('#closeFullScreen').addEventListener('click',()=>$('#fullscreenCaption').close());
  $('#cancelPractice').addEventListener('click',cancelPractice);
  $('#openSettingsInline').addEventListener('click',openSettings);$('#settingsButton').addEventListener('click',openSettings);$('#closeSettings').addEventListener('click',closeSettings);$('#closeSettingsDone').addEventListener('click',()=>{applySettings();closeSettings();});$('#drawerBackdrop').addEventListener('click',()=>{applySettings();closeSettings();});
  $('#confidenceSlider').addEventListener('input',e=>{$('#confidenceValue').textContent=`${e.target.value}%`;confidenceThreshold=Number(e.target.value)/100;safeSet('hkv-confidence',e.target.value);});
  $('#speakGestureToggle').addEventListener('change',applySettings);$('#autoSpeakToggle').addEventListener('change',applySettings);$('#reduceMotionToggle').addEventListener('change',applySettings);
  $('#meaningLanguage').addEventListener('change',e=>{meaningLanguage=e.target.value;safeSet('hkv-meaning-language',meaningLanguage);renderLibrary();});
  $('#librarySearch').addEventListener('input',e=>{libraryQuery=e.target.value;renderLibrary();});$('#clearSearch').addEventListener('click',()=>{$('#librarySearch').value='';libraryQuery='';renderLibrary();$('#librarySearch').focus();});
  $$('.library-tab').forEach(tab=>tab.addEventListener('click',()=>{currentTab=tab.dataset.tab;selectedLetter='';renderLibrary();}));
  $('#categoryFilter').addEventListener('change',e=>{selectedCategory=e.target.value;renderLibrary();});
  $('#showAllLanguages').addEventListener('change',e=>{showAllLanguages=e.target.checked;renderLibrary();});
  $('#prevSign').addEventListener('click',()=>moveDetail(-1));$('#nextSign').addEventListener('click',()=>moveDetail(1));$('#closeSignDialog').addEventListener('click',()=>$('#signDialog').close());
  $('#reopenTutorial').addEventListener('click',()=>showTutorial(true));$('#closeTutorial').addEventListener('click',()=>{if($('#dontShowTutorial').checked)safeSet('hkv-skip-tutorial','true');$('#tutorialDialog').close();});$('#skipTutorial').addEventListener('click',()=>{if($('#dontShowTutorial').checked)safeSet('hkv-skip-tutorial','true');$('#tutorialDialog').close();});$('#nextTutorial').addEventListener('click',advanceTutorial);
  $('#subtitleLanguage').addEventListener('change',e=>setSubtitleTrack(e.target.value));
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape') { if($('#settingsDrawer').classList.contains('is-open'))closeSettings(); }
    if(event.key.toLowerCase()==='t' && !event.repeat && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !$('#signDialog').open && !$('#tutorialDialog').open && !$('#historyDialog').open) simulateDemoDoubleThumbsUp();
    if($('#signDialog').open && event.key==='ArrowRight')moveDetail(1);
    if($('#signDialog').open && event.key==='ArrowLeft')moveDetail(-1);
  });
  window.addEventListener('beforeunload',()=>{if(cameraStream)cameraStream.getTracks().forEach(track=>track.stop());for(const url of speechAudioCache.values())URL.revokeObjectURL(url);});
}

async function init() {
  // Restore accessible controls before adding any event listeners.
  setTheme(currentTheme,false);setVoice(currentVoice,false);setSignLanguage(currentMode,false);updateCaptionSize();
  $('#volumeSlider').value=String(Math.round(voiceVolume*100));$('#volumeValue').textContent=`${Math.round(voiceVolume*100)}%`;
  $('#confidenceSlider').value=String(Math.round(confidenceThreshold*100));$('#confidenceValue').textContent=`${Math.round(confidenceThreshold*100)}%`;
  $('#speakGestureToggle').checked=speakGestureEnabled;$('#autoSpeakToggle').checked=autoSpeakWords;$('#reduceMotionToggle').checked=reduceMotion;document.documentElement.classList.toggle('reduce-motion',reduceMotion);
  $('#muteButton').setAttribute('aria-pressed',String(isMuted));$('#muteButton').textContent=isMuted?'🔇':'🔊';
  $('#meaningLanguage').value=meaningLanguage;$('#translateTo').value='none';
  initEvents();await setUILanguage(uiLanguage,false);setSignLanguage(currentMode,false);initHowToVideo();renderLibrary();updateGestureDots();refreshHistoryDialog();
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged=()=>{};
  if (!safeGet('hkv-skip-tutorial','false') || safeGet('hkv-first-visit','')==='') {
    safeSet('hkv-first-visit','seen');
    window.setTimeout(()=>showTutorial(false),650);
  }
  if(!USE_DEMO_MODE) {
    try { await loadClassifierForMode(currentMode); }
    catch(error) { announceModelError(currentMode, error); }
  }
}

init().catch(error=>{console.error('Hatho Ki Vaani startup error',error);showToast(t('startupError','Some interface features could not load. Refresh the page to try again.'),'warning');});
