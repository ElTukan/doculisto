/* DocuListo - consentimiento de cookies.
   Sin dependencias. Guarda la decision en cookie y localStorage durante 1 ano.
   AdSense y Google Analytics solo se cargan tras aceptar. */
(function () {
  "use strict";

  var COOKIE_NAME = "doculisto_consent";
  var LEGACY_KEY = "doculisto_analytics_consent";
  var COOKIE_AGE = 31536000; // 1 ano
  var ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2993676855543434";
  var GTAG_SRC = "https://www.googletagmanager.com/gtag/js?id=G-ZTCN2SMVB7";
  var GA_ID = "G-ZTCN2SMVB7";

  function readCookie() {
    var parts = document.cookie ? document.cookie.split(";") : [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].replace(/^\s+/, "");
      if (part.indexOf(COOKIE_NAME + "=") === 0) {
        return decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
      }
    }
    return null;
  }

  function writeCookie(value) {
    document.cookie = COOKIE_NAME + "=" + encodeURIComponent(value) +
      "; Max-Age=" + COOKIE_AGE + "; Path=/; SameSite=Lax";
  }

  function clearCookie() {
    document.cookie = COOKIE_NAME + "=; Max-Age=0; Path=/; SameSite=Lax";
  }

  function readStorage() {
    try {
      var value = window.localStorage.getItem(COOKIE_NAME);
      return value === "accepted" || value === "rejected" ? value : null;
    } catch (e) {
      return null;
    }
  }

  // Migracion desde la version anterior (granted/denied).
  function readLegacy() {
    try {
      var value = window.localStorage.getItem(LEGACY_KEY);
      if (value === "granted") return "accepted";
      if (value === "denied") return "rejected";
    } catch (e) {}
    return null;
  }

  function readDecision() {
    var cookie = readCookie();
    if (cookie === "accepted" || cookie === "rejected") return cookie;
    var stored = readStorage();
    if (stored) {
      writeCookie(stored);
      return stored;
    }
    var legacy = readLegacy();
    if (legacy) {
      saveDecision(legacy);
      return legacy;
    }
    return null;
  }

  function saveDecision(value) {
    writeCookie(value);
    try { window.localStorage.setItem(COOKIE_NAME, value); } catch (e) {}
  }

  function clearDecision() {
    clearCookie();
    try { window.localStorage.removeItem(COOKIE_NAME); } catch (e) {}
    try { window.localStorage.removeItem(LEGACY_KEY); } catch (e) {}
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
  }

  function setConsent(state) {
    ensureGtag();
    window.gtag("consent", state, {
      ad_storage: state === "update" ? "granted" : "denied",
      ad_user_data: state === "update" ? "granted" : "denied",
      ad_personalization: state === "update" ? "granted" : "denied",
      analytics_storage: state === "update" ? "granted" : "denied",
      functionality_storage: "granted",
      security_storage: "granted"
    });
  }

  function loadScript(src, marker, crossOrigin) {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf(src.split("?")[0]) === 0) return;
    }
    var script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.setAttribute(marker, "1");
    if (crossOrigin) script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  function grant() {
    ensureGtag();
    window.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
      functionality_storage: "granted",
      security_storage: "granted"
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      allow_google_signals: true,
      allow_ad_personalization_signals: true
    });
    loadScript(GTAG_SRC, "data-doculisto-gtag");
    loadScript(ADSENSE_SRC, "data-doculisto-adsense", true);
  }

  function buildBanner() {
    var banner = document.getElementById("consentBanner");
    if (banner) { banner.hidden = false; return; }

    banner = document.createElement("aside");
    banner.id = "consentBanner";
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Consentimiento de cookies");
    banner.innerHTML = '<div class="consent-copy"><strong>Privacidad y cookies</strong>' +
      '<p>Usamos cookies necesarias para que la web funcione. Solo si lo aceptas, cargamos Google Analytics y Google AdSense para medir visitas y mostrar publicidad. Puedes cambiar tu decision en <a href="/cookies.html">Cookies</a>.</p></div>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-secondary" id="rejectConsent">Solo necesarias</button>' +
      '<button type="button" class="consent-primary" id="acceptConsent">Aceptar</button>' +
      '</div>';

    document.body.appendChild(banner);

    document.getElementById("acceptConsent").addEventListener("click", function () {
      saveDecision("accepted");
      grant();
      banner.hidden = true;
    });

    document.getElementById("rejectConsent").addEventListener("click", function () {
      saveDecision("rejected");
      banner.hidden = true;
    });
  }

  var decision = readDecision();

  // Consent Mode: por defecto denegado mientras no haya una decision guardada.
  if (decision !== "accepted") {
    setConsent("default");
  } else {
    grant();
  }

  window.doculistoConsent = {
    get: function () { return readDecision(); },
    reset: function () {
      clearDecision();
      window.location.reload();
    }
  };

  function bindPreferences() {
    var prefs = document.getElementById("openConsentPreferences");
    if (!prefs) return;
    prefs.addEventListener("click", function (event) {
      event.preventDefault();
      buildBanner();
    });
  }

  function init() {
    bindPreferences();
    if (!readDecision()) buildBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
