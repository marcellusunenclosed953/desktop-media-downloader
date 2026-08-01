const REPOSITORY = 'desktoputilities/desktop-media-downloader';
const RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;
const LANGUAGE_STORAGE_KEY = 'desktop-media-site-language';
const THEME_STORAGE_KEY = 'desktop-media-site-theme';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

const PLATFORM_DATA = [
  {
    key: 'windows',
    index: '01',
    system: 'Windows 10+',
    architecture: 'x64',
    match: (asset) => /windows.*setup\.exe$/i.test(asset.name) || /windows.*\.exe$/i.test(asset.name),
  },
  {
    key: 'macos',
    index: '02',
    system: 'macOS 12+',
    architecture: 'DMG',
    match: (asset) => /mac(?:os)?.*\.dmg$/i.test(asset.name),
  },
  {
    key: 'linux',
    index: '03',
    system: 'Linux',
    architecture: 'x64 · AppImage',
    match: (asset) => /linux.*\.appimage$/i.test(asset.name),
  },
];

const state = {
  language: 'en',
  strings: {},
  release: null,
  releaseLoading: true,
  releaseError: false,
};

const releaseStatus = document.getElementById('release-status');
const downloadCards = document.getElementById('download-cards');
const languageToggle = document.getElementById('language-toggle');
const languageLabel = document.getElementById('language-label');
const languageOptions = document.getElementById('language-options');
const themeToggle = document.getElementById('theme-toggle');
const screenshotDialog = document.getElementById('screenshot-lightbox');
const screenshotTriggers = [...document.querySelectorAll('.gallery-trigger')];
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxCounter = document.getElementById('lightbox-counter');
const lightboxOriginal = document.getElementById('lightbox-original');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrevious = document.getElementById('lightbox-previous');
const lightboxNext = document.getElementById('lightbox-next');
let activeScreenshotIndex = 0;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {
    // The page remains fully functional when storage is unavailable.
  }
}

function resolve(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function mergeObjects(base, override) {
  const output = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeObjects(base?.[key] || {}, value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

function text(key, fallback = '') {
  return resolve(state.strings, key) || fallback || key.split('.').at(-1);
}

function detectLanguage() {
  const stored = readStorage(LANGUAGE_STORAGE_KEY);
  if (LANGUAGES.some(({ code }) => code === stored)) return stored;
  const browserLanguage = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGUAGES.some(({ code }) => code === browserLanguage) ? browserLanguage : 'en';
}

async function fetchLocale(code) {
  const response = await fetch(`./locales/${code}.json`);
  if (!response.ok) throw new Error(`Locale ${code} returned ${response.status}`);
  return response.json();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = resolve(state.strings, element.dataset.i18n);
    if (value) element.textContent = value;
  });

  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const value = resolve(state.strings, element.dataset.i18nHtml);
    if (value) element.innerHTML = value;
  });

  languageLabel.textContent = state.language.toUpperCase();
  document.documentElement.lang = state.language;
  document.querySelectorAll('.language-option').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.language === state.language);
  });

  refreshScreenshotLabels();
  renderRelease();
}

function screenshotDetails(index) {
  const trigger = screenshotTriggers[index];
  const figure = trigger?.closest('figure');
  const image = trigger?.querySelector('img');
  const captionParts = figure ? [...figure.querySelectorAll('figcaption span')] : [];
  return {
    image,
    label: image?.alt || captionParts[0]?.textContent?.trim() || '',
    caption: captionParts[1]?.textContent?.trim() || image?.alt || '',
  };
}

function refreshScreenshotLabels() {
  const viewFullLabel = text('screenshots.viewFull', 'View full size');
  screenshotTriggers.forEach((trigger, index) => {
    const { image } = screenshotDetails(index);
    trigger.setAttribute('aria-label', `${viewFullLabel}: ${image?.alt || ''}`);
  });

  lightboxClose?.setAttribute('aria-label', text('screenshots.close', 'Close screenshot viewer'));
  lightboxPrevious?.setAttribute('aria-label', text('screenshots.previous', 'Previous screenshot'));
  lightboxNext?.setAttribute('aria-label', text('screenshots.next', 'Next screenshot'));
}

function updateScreenshotDialog(index) {
  if (!screenshotTriggers.length) return;
  activeScreenshotIndex = (index + screenshotTriggers.length) % screenshotTriggers.length;
  const { image, label, caption } = screenshotDetails(activeScreenshotIndex);
  if (!image) return;

  const source = image.currentSrc || image.src;
  lightboxImage.src = source;
  lightboxImage.alt = image.alt;
  lightboxTitle.textContent = label;
  lightboxCaption.textContent = caption;
  lightboxCounter.textContent = `${String(activeScreenshotIndex + 1).padStart(2, '0')} / ${String(screenshotTriggers.length).padStart(2, '0')}`;
  lightboxOriginal.href = source;
}

function openScreenshotDialog(index) {
  updateScreenshotDialog(index);
  document.body.classList.add('has-dialog');
  if (typeof screenshotDialog.showModal === 'function') {
    if (!screenshotDialog.open) screenshotDialog.showModal();
  } else {
    screenshotDialog.setAttribute('open', '');
  }
}

function closeScreenshotDialog() {
  if (typeof screenshotDialog.close === 'function' && screenshotDialog.open) {
    screenshotDialog.close();
  } else {
    screenshotDialog.removeAttribute('open');
    document.body.classList.remove('has-dialog');
  }
}

function initializeScreenshotGallery() {
  screenshotTriggers.forEach((trigger, index) => {
    trigger.addEventListener('click', () => openScreenshotDialog(index));
  });

  lightboxClose?.addEventListener('click', closeScreenshotDialog);
  lightboxPrevious?.addEventListener('click', () => updateScreenshotDialog(activeScreenshotIndex - 1));
  lightboxNext?.addEventListener('click', () => updateScreenshotDialog(activeScreenshotIndex + 1));

  screenshotDialog?.addEventListener('click', (event) => {
    if (event.target === screenshotDialog) closeScreenshotDialog();
  });
  screenshotDialog?.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');
  });
  screenshotDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeScreenshotDialog();
    if (event.key === 'ArrowLeft') updateScreenshotDialog(activeScreenshotIndex - 1);
    if (event.key === 'ArrowRight') updateScreenshotDialog(activeScreenshotIndex + 1);
  });
}

async function setLanguage(code) {
  try {
    const english = await fetchLocale('en');
    const selected = code === 'en' ? {} : await fetchLocale(code);
    state.language = code;
    state.strings = mergeObjects(english, selected);
    writeStorage(LANGUAGE_STORAGE_KEY, code);
    applyTranslations();
  } catch (error) {
    console.warn('[download-site] Could not load locale:', error);
    if (code !== 'en') await setLanguage('en');
  }
}

function buildLanguageMenu() {
  LANGUAGES.forEach(({ code, label }) => {
    const button = document.createElement('button');
    button.className = 'language-option';
    button.type = 'button';
    button.role = 'menuitem';
    button.dataset.language = code;
    button.textContent = label;
    button.addEventListener('click', async () => {
      closeLanguageMenu();
      await setLanguage(code);
    });
    languageOptions.appendChild(button);
  });
}

function closeLanguageMenu() {
  languageOptions.classList.remove('is-open');
  languageToggle.setAttribute('aria-expanded', 'false');
}

function toggleLanguageMenu() {
  const willOpen = !languageOptions.classList.contains('is-open');
  languageOptions.classList.toggle('is-open', willOpen);
  languageToggle.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    languageOptions.querySelector('.is-active')?.focus();
  }
}

function activeTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeLabel() {
  const nextTheme = activeTheme() === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} theme`;
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
}

function toggleTheme() {
  const nextTheme = activeTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  writeStorage(THEME_STORAGE_KEY, nextTheme);
  updateThemeLabel();
}

function detectPlatform() {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  if (/win/i.test(platform)) return 'windows';
  if (/mac/i.test(platform)) return 'macos';
  if (/linux|x11/i.test(platform)) return 'linux';
  return null;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unit);
  return `${value >= 100 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function createDownloadButton(platform, asset) {
  const link = document.createElement('a');
  link.className = `button ${asset ? 'button-primary' : 'button-secondary'}`;
  link.href = asset?.browser_download_url || RELEASES_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const label = document.createElement('span');
  label.textContent = asset
    ? `${text('downloads.downloadBtn', 'Download')} ${text(`downloads.${platform.key}`, platform.key)}`
    : text('downloads.releases', 'View releases');
  link.appendChild(label);

  link.insertAdjacentHTML('beforeend', asset
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>');

  return link;
}

function createDownloadCard(platform, asset, detectedPlatform) {
  const card = document.createElement('article');
  card.className = 'download-card';
  if (platform.key === detectedPlatform) card.classList.add('is-recommended');

  const top = document.createElement('div');
  top.className = 'download-card-top';

  const index = document.createElement('span');
  index.className = 'download-index';
  index.textContent = platform.index;
  top.appendChild(index);

  if (platform.key === detectedPlatform) {
    const recommended = document.createElement('span');
    recommended.className = 'recommended-label';
    recommended.textContent = text('downloads.yourOS', 'Detected system');
    top.appendChild(recommended);
  }

  const heading = document.createElement('h3');
  heading.textContent = text(`downloads.${platform.key}`, platform.key);

  const meta = document.createElement('div');
  meta.className = 'download-meta';
  [platform.system, platform.architecture].forEach((value) => {
    const item = document.createElement('span');
    item.textContent = value;
    meta.appendChild(item);
  });

  const assetInfo = document.createElement('p');
  assetInfo.className = 'download-asset';
  assetInfo.textContent = asset
    ? [asset.name, formatBytes(asset.size)].filter(Boolean).join(' · ')
    : text('downloads.notInRelease', 'Installer pending in the latest release.');

  card.append(top, heading, meta, assetInfo, createDownloadButton(platform, asset));
  return card;
}

function renderReleaseStatus() {
  if (state.releaseLoading) {
    releaseStatus.innerHTML = '<span class="status-dot is-loading" aria-hidden="true"></span>';
    releaseStatus.append(text('downloads.loading', 'Checking the latest release…'));
    return;
  }

  if (state.release) {
    const date = state.release.published_at
      ? new Intl.DateTimeFormat(state.language, { year: 'numeric', month: 'short', day: 'numeric' })
        .format(new Date(state.release.published_at))
      : '';
    releaseStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span>';
    releaseStatus.append([state.release.tag_name, date].filter(Boolean).join(' · '));
    return;
  }

  releaseStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span>';
  releaseStatus.append(text('downloads.couldNotLoad', 'Release pending — view GitHub for status'));
}

function renderRelease() {
  if (!releaseStatus || !downloadCards) return;
  renderReleaseStatus();
  downloadCards.replaceChildren();

  const assets = state.release?.assets || [];
  const detectedPlatform = detectPlatform();
  PLATFORM_DATA.forEach((platform) => {
    const asset = assets.find(platform.match);
    downloadCards.appendChild(createDownloadCard(platform, asset, detectedPlatform));
  });
}

async function loadRelease() {
  state.releaseLoading = true;
  renderRelease();

  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`GitHub release API returned ${response.status}`);
    state.release = await response.json();
    state.releaseError = false;
  } catch (error) {
    console.warn('[download-site] Could not load the latest release:', error);
    state.release = null;
    state.releaseError = true;
  } finally {
    state.releaseLoading = false;
    renderRelease();
  }
}

function initializeRevealAnimations() {
  const elements = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px' });

  elements.forEach((element) => observer.observe(element));
}

languageToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleLanguageMenu();
});

document.addEventListener('click', closeLanguageMenu);
languageOptions.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeLanguageMenu();
    languageToggle.focus();
  }
});

themeToggle.addEventListener('click', toggleTheme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', updateThemeLabel);

async function initialize() {
  buildLanguageMenu();
  initializeScreenshotGallery();
  updateThemeLabel();
  initializeRevealAnimations();
  await setLanguage(detectLanguage());
  await loadRelease();
}

initialize();
