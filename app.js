const IOS_URL = "https://apps.apple.com/app/id1234567890";
const ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.example.yosia";

const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "en", "de", "es", "fr", "pt", "ru"];
const FALLBACK_LOCALE = "en";
const STORAGE_KEY = "leegeo-lang";

const localeCache = new Map();

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

function getStoredLanguage() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const normalizedStored = normalizeLocale(stored);
  if (normalizedStored) {
    return normalizedStored;
  }

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

async function loadLocaleDict(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  if (localeCache.has(normalized)) {
    return localeCache.get(normalized);
  }

  try {
    const response = await fetch(`./locales/${normalized}.json`, {
      cache: "no-cache",
    });
    if (!response.ok) {
      throw new Error(`load locale failed: ${normalized}`);
    }
    const dict = await response.json();
    localeCache.set(normalized, dict);
    return dict;
  } catch (error) {
    if (normalized !== FALLBACK_LOCALE) {
      return loadLocaleDict(FALLBACK_LOCALE);
    }
    throw error;
  }
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

async function setLanguage(locale) {
  const normalized = normalizeLocale(locale) || FALLBACK_LOCALE;
  const dict = await loadLocaleDict(normalized);

  document.documentElement.lang = normalized;
  window.localStorage.setItem(STORAGE_KEY, normalized);

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

  const select = document.getElementById("language-select");
  if (select && select.value !== normalized) {
    select.value = normalized;
  }

  updateHomeDownload(dict);
}

async function init() {
  const locale = getStoredLanguage();
  await setLanguage(locale);

  const select = document.getElementById("language-select");
  if (!select) {
    return;
  }

  select.value = locale;
  select.addEventListener("change", () => {
    const nextLocale = normalizeLocale(select.value) || FALLBACK_LOCALE;
    setLanguage(nextLocale).catch(() => {
      setLanguage(FALLBACK_LOCALE);
    });
  });
}

init().catch(() => {
  setLanguage(FALLBACK_LOCALE);
});
