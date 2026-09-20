import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = new Set([
  "https://doculisto.es",
  "https://www.doculisto.es"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin no permitido"));
  }
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    cb(null, allowed.has(file.mimetype));
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "doculisto-api" });
});

app.post("/api/analyze", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Debes subir un PDF, JPG o PNG."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "El analizador todavía no está configurado."
      });
    }

    const ai = new GoogleGenAI({});

    const prompt = `
Eres el analizador de documentos de DocuListo para usuarios de España.

Analiza el documento adjunto y responde en español claro, preciso y fácil de entender.

OBJETIVO:
No te limites a resumir. Ayuda al usuario a saber qué significa el documento y qué acciones debería revisar.

Devuelve EXACTAMENTE estas secciones:

QUE_ES:
Una explicación breve de qué tipo de documento es y qué está comunicando.

QUE_TENGO_QUE_HACER:
Lista de acciones que el documento indica o que razonablemente se deben revisar. No inventes acciones.

PLAZOS:
Detecta todas las fechas y plazos que aparezcan. Si no aparece ninguno, indica "No se identifica ningún plazo en el documento".

DOCUMENTACION:
Enumera documentos, datos o justificantes que se soliciten explícitamente.

DONDE:
Indica el organismo, portal, dirección o canal que aparezca en el documento. No inventes enlaces.

IMPORTANTE:
Señala advertencias, consecuencias o puntos que el usuario debería revisar.

FUENTE:
Indica qué información proviene directamente del documento y qué puntos no pueden determinarse con él.

REGLAS:
- No inventes datos.
- No des asesoramiento jurídico o fiscal como si fueras un profesional.
- Si algo no se puede determinar, dilo claramente.
- Conserva fechas, cantidades y nombres exactamente como aparezcan.
- Si el documento parece ser una notificación oficial, indícalo.
- No solicites ni repitas datos personales innecesarios.
- Si detectas información especialmente sensible, evita reproducirla completa; describe su tipo.

`.trim();

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      store: false,
      input: [
        { type: "text", text: prompt },
        {
          type: "document",
          data: req.file.buffer.toString("base64"),
          mime_type: req.file.mimetype
        }
      ]
    });

    return res.json({
      ok: true,
      file: {
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      },
      analysis: interaction.output_text
    });
  } catch (error) {
    console.error("DocuListo analyze error:", error);
    return res.status(500).json({
      error: "No hemos podido analizar el documento. Inténtalo de nuevo."
    });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.message === "Origin no permitido") {
    return res.status(403).json({ error: "Origen no permitido." });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "El archivo supera el límite de 10 MB." });
  }
  if (err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Campo de archivo no válido." });
  }
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({
      error: "Formato no válido. Usa PDF, JPG o PNG."
    });
  }
  return res.status(500).json({ error: "Error interno." });
});

app.listen(port, () => {
  console.log(`DocuListo API escuchando en el puerto ${port}`);
});
