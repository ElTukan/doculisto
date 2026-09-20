# DocuListo API

Backend inicial para analizar documentos con Gemini.

## Endpoints

- GET /health
- POST /api/analyze
  - multipart/form-data
  - campo: document
  - PDF, JPG o PNG
  - máximo 10 MB

## Variable de entorno

`GEMINI_API_KEY`

Nunca la guardes en GitHub ni la pongas en el frontend.

## Desarrollo

```bash
npm install
GEMINI_API_KEY="..." npm start
```

El backend está preparado para ejecutarse detrás de un servicio como Railway.
