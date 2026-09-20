(() => {
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const fileState = document.getElementById('fileState');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFile = document.getElementById('removeFile');
  const analyzeButton = document.getElementById('analyzeButton');
  const demoResult = document.getElementById('demoResult');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.nav');
  const MAX_BYTES = 3 * 1024 * 1024;
  const ALLOWED = new Set(['application/pdf','image/jpeg','image/png']);

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function setFile(file) {
    if (!file) return;
    if (!ALLOWED.has(file.type)) { window.alert('Formato no compatible. Sube un PDF, JPG o PNG.'); return; }
    if (file.size > MAX_BYTES) { window.alert('El archivo supera el límite de 3 MB.'); return; }
    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    fileState.hidden = false;
    dropzone.style.display = 'none';
    analyzeButton.disabled = false;
    demoResult.hidden = true;
  }
  function clearFile() {
    fileInput.value = '';
    fileState.hidden = true;
    dropzone.style.display = 'flex';
    analyzeButton.disabled = true;
    demoResult.hidden = true;
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', (event) => setFile(event.target.files?.[0]));

  ['dragenter','dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault(); dropzone.classList.add('dragging');
  }));
  ['dragleave','drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault(); dropzone.classList.remove('dragging');
  }));
  dropzone.addEventListener('drop', (event) => setFile(event.dataTransfer.files?.[0]));
  removeFile.addEventListener('click', clearFile);

  analyzeButton.addEventListener('click', async () => {
    if (analyzeButton.disabled) return;
    const file = fileInput.files?.[0];
    if (!file) return;

    analyzeButton.disabled = true;
    analyzeButton.innerHTML = 'Analizando <span aria-hidden="true">…</span>';
    demoResult.hidden = true;

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
      });

      const base64 = String(dataUrl).split(",")[1];
      const response = await fetch("https://api.doculisto.es/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: {
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data: base64
          }
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se ha podido analizar el documento.");

      const output = result.analysis || "No se ha recibido ningún análisis.";
      demoResult.hidden = false;
      demoResult.innerHTML = '<div class="result-badge">Análisis completado</div><pre class="analysis-output"></pre>';
      demoResult.querySelector('.analysis-output').textContent = output;
      demoResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      demoResult.hidden = false;
      demoResult.innerHTML = '<div class="result-badge">No se ha podido analizar</div><p></p>';
      demoResult.querySelector("p").textContent = error?.message || "Ha ocurrido un error. Inténtalo de nuevo.";
      demoResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = 'Analizar documento <span aria-hidden="true">→</span>';
    }
  });

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    nav.style.display = isOpen ? '' : 'flex';
    if (!isOpen) {
      nav.style.position='absolute';nav.style.top='72px';nav.style.left='12px';nav.style.right='12px';nav.style.padding='14px';
      nav.style.flexDirection='column';nav.style.alignItems='stretch';nav.style.gap='10px';nav.style.background='#fff';
      nav.style.border='1px solid #e7e9ee';nav.style.borderRadius='16px';nav.style.boxShadow='0 20px 50px rgba(19,24,39,.10)';
    }
  });
})();

  const consentBanner = document.getElementById('consentBanner');
  const acceptAnalytics = document.getElementById('acceptAnalytics');
  const rejectAnalytics = document.getElementById('rejectAnalytics');
  const CONSENT_KEY = 'doculisto_analytics_consent';

  function setAnalyticsConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: value === 'granted' ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
    if (consentBanner) consentBanner.hidden = true;
  }

  if (consentBanner) {
    let saved = null;
    try { saved = localStorage.getItem(CONSENT_KEY); } catch (_) {}
    if (saved === 'granted' || saved === 'denied') {
      setAnalyticsConsent(saved);
    } else {
      setTimeout(() => { consentBanner.hidden = false; }, 350);
    }
  }

  acceptAnalytics?.addEventListener('click', () => setAnalyticsConsent('granted'));
  rejectAnalytics?.addEventListener('click', () => setAnalyticsConsent('denied'));
