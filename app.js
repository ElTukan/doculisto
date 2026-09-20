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
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED = new Set(['application/pdf','image/jpeg','image/png']);

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function setFile(file) {
    if (!file) return;
    if (!ALLOWED.has(file.type)) { window.alert('Formato no compatible. Sube un PDF, JPG o PNG.'); return; }
    if (file.size > MAX_BYTES) { window.alert('El archivo supera el límite de 10 MB.'); return; }
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function listHtml(items, renderItem) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return '<ul class="analysis-list">' + items.map(renderItem).join('') + '</ul>';
  }

  function renderAnalysis(analysis) {
    const a = analysis || {};
    const actions = listHtml(a.acciones, item => '<li>' + escapeHtml(item) + '</li>');
    const docs = listHtml(a.documentos, item => '<li>' + escapeHtml(item) + '</li>');
    const important = listHtml(a.importante, item => '<li>' + escapeHtml(item) + '</li>');
    const deadlines = Array.isArray(a.plazos) && a.plazos.length
      ? '<div class="deadline-list">' + a.plazos.map(p =>
          '<div class="deadline-item"><strong>' + escapeHtml(p.fecha) + '</strong><span>' + escapeHtml(p.contexto) + '</span></div>'
        ).join('') + '</div>'
      : '<p class="analysis-muted">No se identifica un plazo en el documento.</p>';

    return `
      <div class="analysis-header">
        <div class="result-badge">Análisis completado</div>
        <h3>${escapeHtml(a.tipo || 'Documento analizado')}</h3>
        <p>${escapeHtml(a.resumen || 'No se ha podido obtener un resumen claro.')}</p>
      </div>
      <div class="analysis-section">
        <span class="analysis-label">QUÉ TIENES QUE HACER</span>
        ${actions || '<p class="analysis-muted">No se identifica ninguna acción concreta en el documento.</p>'}
      </div>
      <div class="analysis-section">
        <span class="analysis-label">PLAZOS</span>
        ${deadlines}
      </div>
      <div class="analysis-section">
        <span class="analysis-label">QUÉ NECESITAS</span>
        ${docs || '<p class="analysis-muted">No se indica documentación adicional.</p>'}
      </div>
      <div class="analysis-section">
        <span class="analysis-label">DÓNDE</span>
        <p>${escapeHtml(a.donde || 'El documento no indica un lugar o canal concreto.')}</p>
      </div>
      <div class="analysis-section">
        <span class="analysis-label">IMPORTANTE</span>
        ${important || '<p class="analysis-muted">No se ha identificado ninguna advertencia específica.</p>'}
      </div>
      <div class="analysis-source">
        <span>Fuente y límites</span>
        <p>${escapeHtml(a.fuente || '')}</p>
      </div>`;
  }

  analyzeButton.addEventListener('click', async () => {
    if (analyzeButton.disabled) return;
    const file = fileInput.files?.[0];
    if (!file) return;

    analyzeButton.disabled = true;
    analyzeButton.innerHTML = 'Analizando <span aria-hidden="true">…</span>';
    demoResult.hidden = true;

    try {
      const formData = new FormData();
      formData.append('document', file, file.name);

      const response = await fetch('https://api.doculisto.es/api/analyze', {
        method: 'POST',
        body: formData
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No se ha podido analizar el documento.');

      demoResult.hidden = false;
      demoResult.innerHTML = renderAnalysis(result.analysis);
      demoResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      demoResult.hidden = false;
      demoResult.innerHTML = '<div class="result-badge">No se ha podido analizar</div><p></p>';
      demoResult.querySelector('p').textContent = error?.message || 'Ha ocurrido un error. Inténtalo de nuevo.';
      demoResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
