(() => {
  const CONSENT_KEY = 'doculisto_analytics_consent';
  const MEASUREMENT_ID = 'G-ZTCN2SMVB7';

  function configureAnalytics() {
    if (typeof window.gtag !== 'function') return;
    const cfg = {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    if (new URLSearchParams(window.location.search).has('gtm_debug')) cfg.debug_mode = true;

    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('config', MEASUREMENT_ID, cfg);

    // The initial gtag('config', ...) in <head> is sent with
    // send_page_view: false (consent is denied by default until the
    // banner is answered). Once consent is granted, calling
    // gtag('config', ...) again does NOT reliably re-trigger an
    // automatic page_view in gtag.js, because the tracker for this
    // measurement ID already exists. That is why GA4 was showing
    // users/events but 0 page views. Firing page_view explicitly here
    // guarantees a real, measurable view every time consent is
    // granted (on first accept, and on every later page load once
    // consent was already saved as granted).
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search
    });
  }

  function saveChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
  }

  function renderBanner(force = false) {
    let banner = document.getElementById('consentBanner');

    if (banner) {
      banner.hidden = false;
      return;
    }

    banner = document.createElement('aside');
    banner.id = 'consentBanner';
    banner.className = 'consent-banner';
    banner.setAttribute('aria-label', 'Preferencias de medición');
    banner.innerHTML = '<div class="consent-copy"><strong>Privacidad y medición</strong><p>Usamos Google Analytics para conocer el uso de DocuListo y mejorar la web. Puedes aceptar o rechazar la medición.</p></div><div class="consent-actions"><button type="button" class="consent-secondary" id="rejectAnalytics">Rechazar</button><button type="button" class="consent-primary" id="acceptAnalytics">Aceptar</button></div>';
    document.body.appendChild(banner);

    document.getElementById('acceptAnalytics').addEventListener('click', () => {
      saveChoice('granted');
      configureAnalytics();
      banner.hidden = true;
    });

    document.getElementById('rejectAnalytics').addEventListener('click', () => {
      saveChoice('denied');
      banner.hidden = true;
    });
  }

  const openButton = document.getElementById('openConsentPreferences');
  openButton?.addEventListener('click', () => renderBanner(true));

  let saved = null;
  try { saved = localStorage.getItem(CONSENT_KEY); } catch (_) {}

  if (saved === 'granted') {
    configureAnalytics();
  } else if (saved === 'denied') {
    // Keep Analytics disabled; the footer preferences button can reopen the panel.
  } else {
    window.setTimeout(() => renderBanner(false), 300);
  }
})();