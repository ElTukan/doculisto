(() => {
  const CONSENT_KEY = 'doculisto_analytics_consent';
  const CONSENT_COOKIE = 'doculisto_analytics_consent';
  const MEASUREMENT_ID = 'G-ZTCN2SMVB7';

  function readConsent() {
    try {
      const cookie = document.cookie.split('; ').find(item => item.startsWith(`${CONSENT_COOKIE}=`));
      if (cookie) return decodeURIComponent(cookie.split('=').slice(1).join('='));
      return localStorage.getItem(CONSENT_KEY);
    } catch (_) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  }

  let analyticsLoaded = false;
  let analyticsLoading = false;

  function initAnalyticsQueue() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    if (!window.__doculistoGtagInitialized) {
      window.gtag('js', new Date());
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      window.__doculistoGtagInitialized = true;
    }
  }

  function loadAnalytics() {
    initAnalyticsQueue();
    if (analyticsLoaded) return;
    if (analyticsLoading) return;
    analyticsLoading = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    script.onload = () => {
      analyticsLoading = false;
      analyticsLoaded = true;
      window.gtag('config', MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search
      });
    };
    script.onerror = () => { analyticsLoading = false; };
    document.head.appendChild(script);

    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function renderBanner() {
    let banner = document.getElementById('consentBanner');
    if (banner) { banner.hidden = false; return; }
    banner = document.createElement('aside');
    banner.id = 'consentBanner';
    banner.className = 'consent-banner';
    banner.setAttribute('aria-label', 'Preferencias de medición');
    banner.innerHTML = '<div class="consent-copy"><strong>Privacidad y medición</strong><p>Usamos Google Analytics para conocer el uso de DocuListo y mejorar la web. Puedes aceptar o rechazar la medición.</p></div><div class="consent-actions"><button type="button" class="consent-secondary" id="rejectAnalytics">Rechazar</button><button type="button" class="consent-primary" id="acceptAnalytics">Aceptar</button></div>';
    document.body.appendChild(banner);
    document.getElementById('acceptAnalytics').addEventListener('click', () => { saveChoice('granted'); loadAnalytics(); banner.hidden = true; });
    document.getElementById('rejectAnalytics').addEventListener('click', () => { saveChoice('denied'); banner.hidden = true; });
  }

  document.getElementById('openConsentPreferences')?.addEventListener('click', renderBanner);
  initAnalyticsQueue();
  const saved = readConsent();
  if (saved === 'granted') loadAnalytics();
  else if (saved !== 'denied') window.setTimeout(renderBanner, 700);
})();
