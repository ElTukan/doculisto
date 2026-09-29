(() => {
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const fileState = document.getElementById('fileState');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const fileIcon = document.querySelector('.file-icon');
  const removeFile = document.getElementById('removeFile');
  const selectFileButton = document.getElementById('selectFileButton');
  const analyzeButton = document.getElementById('analyzeButton');
  const ageCheck = document.getElementById('ageCheck');
  const demoResult = document.getElementById('demoResult');
  const analysisLive = document.getElementById('analysisLive');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.nav');
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  const API_BASE = window.DOCULISTO_API_BASE || 'https://doculisto-api.onrender.com';
  const API_TIMEOUT_MS = 120000;
  let previewUrl = null;
  let selectedFile = null;
  let warmupPromise = null;
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const formatSize = (bytes) => bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  function trackEvent(name, params) { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); }
  function setProgress(percent, text) { const livePercent = $('livePercent'); const liveFill = $('liveProgressFill'); const liveStep = $('liveStep'); if (livePercent) livePercent.textContent = `${percent}%`; if (liveFill) liveFill.style.width = `${percent}%`; if (liveStep && text) liveStep.textContent = text; }
  function showLive(text = 'Preparando el documento…', percent = 5) { if (demoResult) demoResult.hidden = true; if (!analysisLive) return; analysisLive.hidden = false; analysisLive.classList.add('live-visible'); setProgress(percent, text); }
  function hideLive() { if (!analysisLive) return; analysisLive.classList.remove('live-visible'); window.setTimeout(() => { analysisLive.hidden = true; }, 260); }
  function syncAvailability() { analyzeButton.disabled = !selectedFile || !ageCheck?.checked; }
  function clearPreview() { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; if (fileIcon) { fileIcon.textContent = 'DOC'; fileIcon.style.backgroundImage = ''; fileIcon.classList.remove('has-preview'); } }
  function setFile(file) {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtension = new Set(['pdf', 'jpg', 'jpeg', 'png']);
    if (!ALLOWED.has(file.type) && !allowedExtension.has(extension)) { window.alert('Formato no compatible. Sube un PDF, JPG o PNG.'); return; }
    if (file.size > MAX_BYTES) { window.alert('El archivo supera el límite de 10 MB.'); return; }
    selectedFile = file; clearPreview();
    if (file.type.startsWith('image/') && fileIcon) { previewUrl = URL.createObjectURL(file); fileIcon.textContent = ''; fileIcon.style.backgroundImage = `url("${previewUrl}")`; fileIcon.classList.add('has-preview'); }
    fileName.textContent = file.name; fileSize.textContent = formatSize(file.size); fileState.hidden = false; dropzone.style.display = 'none'; syncAvailability(); demoResult.hidden = true; if (navigator.vibrate) navigator.vibrate(12); warmApi();
  }
  function clearFile() { selectedFile = null; fileInput.value = ''; clearPreview(); fileState.hidden = true; dropzone.style.display = 'flex'; syncAvailability(); demoResult.hidden = true; }
  function openPicker() { fileInput.value = ''; fileInput.click(); }
  async function warmApi() { try { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000); await fetch(`${API_BASE}/health`, { cache: 'no-store', signal: controller.signal }); clearTimeout(timer); } catch (_) {} }
  function requestAnalysis(file, onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open('POST', `${API_BASE}/api/analyze`); xhr.timeout = API_TIMEOUT_MS; xhr.responseType = 'json';
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) onUploadProgress(Math.min(78, Math.max(8, Math.round((event.loaded / event.total) * 78)))); };
      xhr.onload = () => { const data = xhr.response || {}; if (xhr.status >= 200 && xhr.status < 300) return resolve(data); reject(new Error(data.error || `El servidor ha respondido con el estado ${xhr.status}.`)); };
      xhr.onerror = () => reject(new Error('No se ha podido conectar con el servidor del analizador.'));
      xhr.ontimeout = () => reject(new Error('El analizador ha tardado demasiado en responder. El servidor gratuito puede estar iniciándose. Inténtalo de nuevo en unos segundos.'));
      const formData = new FormData(); formData.append('document', file, file.name); xhr.send(formData);
    });
  }
  function renderAnalysis(analysis) {
    const a = analysis || {}; const actions = Array.isArray(a.acciones) ? a.acciones : []; const docs = Array.isArray(a.documentos) ? a.documentos : []; const important = Array.isArray(a.importante) ? a.importante : []; const deadlines = Array.isArray(a.plazos) ? a.plazos : [];
    const list = (items) => items.length ? `<ul class="analysis-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p class="analysis-muted">No se identifica información específica.</p>';
    const deadlineHtml = deadlines.length ? `<div class="deadline-list">${deadlines.map(p => `<div class="deadline-item"><strong>${escapeHtml(p.fecha)}</strong><span>${escapeHtml(p.contexto)}</span></div>`).join('')}</div>` : '<p class="analysis-muted">No se identifica un plazo en el documento.</p>';
    const quickDeadline = deadlines[0] ? `${escapeHtml(deadlines[0].fecha)} · ${escapeHtml(deadlines[0].contexto)}` : 'No se identifica un plazo';
    return `<div class="analysis-header"><div class="result-badge">Análisis completado</div><h3>${escapeHtml(a.tipo || 'Documento analizado')}</h3><p>${escapeHtml(a.resumen || 'No se ha podido obtener un resumen claro.')}</p></div><div class="analysis-quick"><div class="quick-card"><span>PRIMER PASO</span><strong>${escapeHtml(actions[0] || 'No se identifica una acción concreta')}</strong></div><div class="quick-card"><span>PRÓXIMO PLAZO</span><strong>${quickDeadline}</strong></div></div><div class="analysis-section"><span class="analysis-label">QUÉ TIENES QUE HACER</span>${list(actions)}</div><div class="analysis-section"><span class="analysis-label">PLAZOS</span>${deadlineHtml}</div><div class="analysis-section"><span class="analysis-label">QUÉ NECESITAS</span>${list(docs)}</div><div class="analysis-section"><span class="analysis-label">DÓNDE</span><p>${escapeHtml(a.donde || 'El documento no indica un lugar o canal concreto.')}</p></div><div class="analysis-section"><span class="analysis-label">IMPORTANTE</span>${list(important)}</div><div class="analysis-source"><span>Fuente y límites</span><p>${escapeHtml(a.fuente || '')}</p></div>`;
  }
  function showResult(analysis) { hideLive(); demoResult.hidden = false; demoResult.className = 'demo-result analysis-success is-visible'; demoResult.innerHTML = `<div class="success-scene" aria-hidden="true"><span class="success-particle particle-one"></span><span class="success-particle particle-two"></span><span class="success-particle particle-three"></span><span class="success-particle particle-four"></span><span class="success-particle particle-five"></span><span class="success-particle particle-six"></span><span class="success-ring success-ring-one"></span><span class="success-ring success-ring-two"></span><span class="success-check">✓</span></div><div class="success-content">${renderAnalysis(analysis)}</div>`; demoResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); trackEvent('document_analysis_complete'); }
  function showError(message) { hideLive(); demoResult.hidden = false; demoResult.className = 'demo-result analysis-error'; demoResult.innerHTML = `<div class="result-badge">No se ha podido analizar</div><p></p><button type="button" class="retry-button" id="retryAnalysis">Reintentar</button>`; demoResult.querySelector('p').textContent = message || 'Ha ocurrido un error. Inténtalo de nuevo.'; demoResult.querySelector('#retryAnalysis').addEventListener('click', () => analyzeButton.click()); demoResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  async function analyze() {
    if (!selectedFile || !ageCheck?.checked || analyzeButton.disabled) return;
    const file = selectedFile; analyzeButton.disabled = true; analyzeButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Analizando'; showLive('Iniciando el analizador…', 5); trackEvent('document_analysis_start', { file_type: file.type || 'unknown' });
    try { if (warmupPromise) await warmupPromise; const result = await requestAnalysis(file, (percent) => setProgress(percent, percent < 78 ? 'Subiendo el documento…' : 'Documento recibido. Procesando con IA…')); setProgress(90, 'Procesando el documento con IA…'); if (!result?.analysis) throw new Error('El analizador no ha devuelto un resultado válido.'); setProgress(100, 'Análisis completado.'); await new Promise(resolve => setTimeout(resolve, 250)); showResult(result.analysis); }
    catch (error) { showError(error?.message || 'Ha ocurrido un error. Inténtalo de nuevo.'); }
    finally { analyzeButton.disabled = false; analyzeButton.innerHTML = 'Analizar documento <span aria-hidden="true">→</span>'; }
  }
  dropzone?.addEventListener('click', (event) => { if (!event.target.closest('#selectFileButton')) openPicker(); });
  selectFileButton?.addEventListener('click', (event) => { event.stopPropagation(); openPicker(); });
  dropzone?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPicker(); } });
  fileInput?.addEventListener('change', event => setFile(event.target.files?.[0])); fileInput?.addEventListener('input', event => setFile(event.target.files?.[0])); fileInput?.addEventListener('cancel', () => syncAvailability()); ageCheck?.addEventListener('change', syncAvailability); removeFile?.addEventListener('click', clearFile);
  ['dragenter', 'dragover'].forEach(name => dropzone?.addEventListener(name, event => { event.preventDefault(); dropzone.classList.add('dragging'); })); ['dragleave', 'drop'].forEach(name => dropzone?.addEventListener(name, event => { event.preventDefault(); dropzone.classList.remove('dragging'); })); dropzone?.addEventListener('drop', event => setFile(event.dataTransfer.files?.[0])); analyzeButton?.addEventListener('click', analyze);
  menuButton?.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') === 'true'; menuButton.setAttribute('aria-expanded', String(!open)); nav?.classList.toggle('mobile-open', !open); });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menuButton?.setAttribute('aria-expanded', 'false'); nav?.classList.remove('mobile-open'); }));
  syncAvailability();
})();
