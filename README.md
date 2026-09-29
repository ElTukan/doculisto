# DocuListo

DocuListo ayuda a personas de España a entender documentos y convertirlos en próximos pasos claros.

## Arquitectura actual

- Frontend: HTML/CSS/JavaScript en GitHub Pages.
- Backend: Node.js + Express en Render (`doculisto-api.onrender.com`).
- IA: Google Gemini mediante `@google/genai`.
- Documentos: se procesan en memoria y no se persisten en disco.

## Estructura

- `index.html` — portada y analizador.
- `app-v2.js` — lógica del analizador.
- `styles.css` + `fixes.css` — interfaz.
- `backend/` — API.
- `guias/` — contenido SEO.
- `scripts/` — generación de sitemap y preparación SEO.

## Desarrollo backend

Consulta `backend/README.md` y `backend/.env.example`.

```bash
cd backend
npm install
npm test
npm start
```

## Despliegue

Cada push a `main` ejecuta GitHub Actions para publicar GitHub Pages. Render despliega el backend desde `backend/`.
