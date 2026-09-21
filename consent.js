(() => {
  const CONSENT_KEY = 'doculisto_analytics_consent';
  const MEASUREMENT_ID = 'G-ZTCN2SMVB7';

  function configureAnalytics() {
    if (typeof window.gtag !== 'function') return;
    const cfg = {
      send_page_view: true,
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
  }

  function saveChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
  }

  function renderBanner() {
    if (document.getElementById('consentBanner')) return;
    const banner = document.createElement('aside');
    banner.id = 'consentBanner';
    banner.className = 'consent-banner';
    banner.setAttribute('aria-label', 'Preferencias de medición');
    banner.innerHTML = '<div class="consent-copy"><strong>Privacidad y medición</strong><p>Usamos Google Analytics para conocer el uso de DocuListo y mejorar la web. Puedes aceptar o rechazar la medición.</p></div><div class="consent-actions"><button type="button" class="consent-secondary" id="rejectAnalytics">Rechazar</button><button type="button" class="consent-primary" id="acceptAnalytics">Aceptar</button></div>';
    document.body.appendChild(banner);

    document.getElementById('acceptAnalytics').addEventListener('click', () => {
      saveChoice('granted');
      configureAnalytics();
      banner.remove();
    });
    document.getElementById('rejectAnalytics').addEventListener('click', () => {
      saveChoice('denied');
      banner.remove();
    });
  }

  let saved = null;
  try { saved = localStorage.getItem(CONSENT_KEY); } catch (_) {}
  if (saved === 'granted') {
    configureAnalytics();
  } else if (saved !== 'denied') {
    window.setTimeout(renderBanner, 150);
  }
})();