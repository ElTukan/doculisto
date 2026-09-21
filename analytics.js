(() => {
  const CONSENT_KEY = 'doculisto_analytics_consent';
  const MEASUREMENT_ID = 'G-ZC7K8J3BSVS';

  function startAnalytics() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
      document.head.appendChild(script);
    }
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('config', MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });
  }

  function showBanner() {
    if (document.getElementById('consentBanner')) return;
    const banner = document.createElement('aside');
    banner.className = 'consent-banner';
    banner.id = 'consentBanner';
    banner.setAttribute('aria-label', 'Preferencias de medición');
    banner.innerHTML = '<div class="consent-copy"><strong>Privacidad y medición</strong><p>Usamos Google Analytics para conocer el uso de DocuListo y mejorar la web. Puedes aceptar o rechazar la medición.</p></div><div class="consent-actions"><button type="button" class="consent-secondary" id="rejectAnalytics">Rechazar</button><button type="button" class="consent-primary" id="acceptAnalytics">Aceptar</button></div>';
    document.body.appendChild(banner);
    document.getElementById('acceptAnalytics').addEventListener('click', () => {
      try { localStorage.setItem(CONSENT_KEY, 'granted'); } catch (_) {}
      startAnalytics();
      banner.remove();
    });
    document.getElementById('rejectAnalytics').addEventListener('click', () => {
      try { localStorage.setItem(CONSENT_KEY, 'denied'); } catch (_) {}
      banner.remove();
    });
  }

  let saved = null;
  try { saved = localStorage.getItem(CONSENT_KEY); } catch (_) {}

  if (saved === 'granted') {
    startAnalytics();
  } else if (saved !== 'denied') {
    window.setTimeout(showBanner, 250);
  }
})();