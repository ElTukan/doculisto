# DocuListo API

Backend Express desplegado actualmente en Render.

## Requisitos
- Node.js 22+
- `GEMINI_API_KEY`

## Desarrollo local

```bash
cd backend
npm install
npm test
npm start
```

API local: `http://localhost:3000`

## Endpoints
- `GET /health` — health check.
- `GET /api/diagnostic` — comprueba la configuración de Gemini.
- `POST /api/analyze` — recibe un campo multipart `document` (PDF/JPG/PNG, máximo 10 MB).

## Seguridad
- La clave Gemini solo existe en el backend.
- Los archivos se procesan en memoria y no se guardan en disco.
- Hay límites de tamaño, rate limiting y headers HTTP de seguridad.
- No subir documentos especialmente sensibles hasta disponer de la política de privacidad y tratamiento de datos definitiva.

## Despliegue
Render usa `render.yaml`, con `rootDir: backend` y `npm start`. El backend no utiliza Railway actualmente.
