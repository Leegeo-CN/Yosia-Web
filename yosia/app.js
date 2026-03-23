const IOS_URL = "https://apps.apple.com/app/id1234567890";
const ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.example.yosia";

const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "en", "de", "es", "fr", "pt", "ru"];
const FALLBACK_LOCALE = "en";
const STORAGE_KEY = "leegeo-lang";
const QUERY_KEY = "lang";
const LOCALE_LABELS = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  pt: "Português",
  ru: "Русский",
};

const localeCache = new Map();

function toExternalLocale(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  if (normalized === "zh-CN") {
    return "zh";
  }
  if (normalized === "zh-TW") {
    return "zh_Hant";
  }
  return normalized;
}

function normalizeLocale(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (SUPPORTED_LOCALES.includes(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith("zh")) {
    if (lower.includes("hant") || lower.includes("tw") || lower.includes("hk")) {
      return "zh-TW";
    }
    return "zh-CN";
  }

  const code = lower.split("-")[0];
  if (SUPPORTED_LOCALES.includes(code)) {
    return code;
  }

  return null;
}

function getQueryLanguage() {
  const params = new URLSearchParams(window.location.search);
  return normalizeLocale(params.get(QUERY_KEY));
}

function getStoredLanguage() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return normalizeLocale(stored);
}

function getSystemLanguage() {
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || ""];

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return FALLBACK_LOCALE;
}

function getPreferredLanguage() {
  const queryLocale = getQueryLanguage();
  if (queryLocale) {
    return queryLocale;
  }

  const storedLocale = getStoredLanguage();
  if (storedLocale) {
    return storedLocale;
  }

  return getSystemLanguage();
}

async function loadLocaleDict(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  if (localeCache.has(normalized)) {
    return localeCache.get(normalized);
  }

  const embeddedLocales = window.__LOCALE_DATA__;
  if (!embeddedLocales || typeof embeddedLocales !== "object") {
    throw new Error("locale bundle missing");
  }

  const embeddedDict = embeddedLocales[normalized];
  if (embeddedDict && typeof embeddedDict === "object") {
    localeCache.set(normalized, embeddedDict);
    return embeddedDict;
  }

  if (normalized !== FALLBACK_LOCALE) {
    return loadLocaleDict(FALLBACK_LOCALE);
  }

  throw new Error(`load locale failed: ${normalized}`);
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  return "other";
}

function applyTranslations(dict) {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const value = dict[key];
    if (typeof value === "string") {
      node.textContent = value;
    }
  });
}

function updateHomeDownload(dict) {
  if (document.body.dataset.page !== "home") {
    return;
  }

  const platform = detectPlatform();
  const button = document.getElementById("home-download-button");
  const hint = document.getElementById("home-download-hint");

  if (!button || !hint) {
    return;
  }

  if (platform === "ios") {
    hint.hidden = false;
    hint.textContent = dict["home.download.ios"] || "";
    button.onclick = () => {
      window.location.href = IOS_URL;
    };
    return;
  }

  if (platform === "android") {
    hint.hidden = false;
    hint.textContent = dict["home.download.android"] || "";
    button.onclick = () => {
      window.location.href = ANDROID_URL;
    };
    return;
  }

  hint.hidden = true;
  hint.textContent = dict["home.download.other"] || "";
  button.onclick = () => {
    window.location.href = IOS_URL;
  };
}

function updateLocalizedLinks(locale) {
  const externalLocale = toExternalLocale(locale);
  const homeLink = document.querySelector(".masthead__brand");
  const privacyLink = document.querySelector(".privacy-architecture__actions a");

  if (homeLink) {
    homeLink.href = `./index.html?${QUERY_KEY}=${encodeURIComponent(externalLocale)}`;
  }

  if (privacyLink) {
    privacyLink.href = `./privacy.html?${QUERY_KEY}=${encodeURIComponent(externalLocale)}`;
  }
}

function syncLanguageQuery(locale) {
  const url = new URL(window.location.href);
  url.searchParams.set(QUERY_KEY, toExternalLocale(locale));
  window.history.replaceState({}, "", url);
}

function closeLanguageMenu() {
  const trigger = document.getElementById("language-trigger");
  const menu = document.getElementById("language-menu");
  if (!trigger || !menu) {
    return;
  }

  menu.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
}

function updateLanguageSwitch(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  const current = document.getElementById("language-current");
  const options = document.querySelectorAll(".lang-switch__option");

  if (current) {
    current.textContent = LOCALE_LABELS[normalized] || normalized;
  }

  options.forEach((node) => {
    const isSelected = node.dataset.locale === normalized;
    node.classList.toggle("is-selected", isSelected);
    node.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
}

function initLanguageSwitch() {
  const trigger = document.getElementById("language-trigger");
  const menu = document.getElementById("language-menu");
  if (!trigger || !menu) {
    return;
  }

  const options = menu.querySelectorAll(".lang-switch__option");

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpening = menu.hidden;
    menu.hidden = !isOpening;
    trigger.setAttribute("aria-expanded", isOpening ? "true" : "false");
  });

  options.forEach((node) => {
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextLocale = normalizeLocale(node.dataset.locale) || FALLBACK_LOCALE;
      closeLanguageMenu();
      setLanguage(nextLocale).catch(() => {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
        updateLanguageSwitch(nextLocale);
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !event.target.closest(".lang-switch")) {
      closeLanguageMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
    }
  });
}

async function setLanguage(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  const dict = await loadLocaleDict(normalized);

  document.documentElement.lang = normalized;
  window.localStorage.setItem(STORAGE_KEY, normalized);
  syncLanguageQuery(normalized);

  if (document.body.dataset.page === "home") {
    document.title =
      normalized === "zh-CN" || normalized === "zh-TW"
        ? "氧息 | 本地优先的戒烟支持 App"
        : "Yosia | Local-first recovery support app";
  } else if (document.body.dataset.page === "privacy") {
    document.title =
      normalized === "zh-CN" || normalized === "zh-TW"
        ? "氧息隐私协议"
        : "Yosia Privacy Policy";
  }

  applyTranslations(dict);
  updateLanguageSwitch(normalized);
  updateLocalizedLinks(normalized);

  updateHomeDownload(dict);
}

async function init() {
  const locale = getPreferredLanguage();
  initLanguageSwitch();
  updateLanguageSwitch(locale);
  await setLanguage(locale).catch(() => {
    updateLanguageSwitch(locale);
    updateLocalizedLinks(locale);
  });
}

init().catch(() => {
  initLanguageSwitch();
  updateLanguageSwitch(FALLBACK_LOCALE);
  updateLocalizedLinks(FALLBACK_LOCALE);
});
