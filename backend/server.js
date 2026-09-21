import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const PRIMARY_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "gemini-2.5-flash";

const app = express();
const port = process.env.PORT || 3000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = new Set([
  "https://doculisto.es",
  "https://www.doculisto.es"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false,
  optionsSuccessStatus: 204
}));

app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Cache-Control", "no-store");
  next();
});

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 12;
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const current = rateBuckets.get(ip);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > RATE_MAX;
}

function rateLimitAnalysis(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  if (isRateLimited(ip)) {
    res.set("Retry-After", "900");
    return res.status(429).json({
      error: "Has alcanzado el límite temporal de análisis. Espera unos minutos y vuelve a intentarlo."
    });
  }

  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter(_req, file, cb) {
    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png"
    ]);

    if (allowed.has(file.mimetype)) {
      return cb(null, true);
    }

    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "document"));
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "doculisto-api"
  });
});

app.get("/api/diagnostic", async (_req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      ok: false,
      service: "doculisto-api",
      geminiConfigured: false,
      modelAvailable: false
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const model = await ai.models.get({
      model: PRIMARY_MODEL
    });

    return res.json({
      ok: true,
      service: "doculisto-api",
      geminiConfigured: true,
      modelAvailable: Boolean(model?.name)
    });
  } catch (error) {
    console.error("DocuListo diagnostic error:", error);

    return res.status(503).json({
      ok: false,
      service: "doculisto-api",
      geminiConfigured: true,
      modelAvailable: false
    });
  }
});

const ANALYSIS_PROMPT = `
Eres DocuListo, un asistente que ayuda a personas de España a entender documentos.

Analiza el documento adjunto y conviértelo en una explicación práctica, clara y útil para la persona que lo ha recibido.

Solo utiliza información respaldada por el documento.

Reglas:
- No inventes datos, fechas, requisitos, organismos, enlaces ni consecuencias.
- Las acciones deben salir del documento.
- Si no se solicita una acción clara, devuelve un array vacío.
- Si no aparece un plazo, devuelve un array vacío.
- Si no se solicita documentación, devuelve un array vacío.
- Si no aparece un lugar o canal concreto, devuelve una cadena vacía.
- Conserva literalmente fechas, cantidades y nombres relevantes.
- No repitas números de identificación, direcciones completas u otros datos personales innecesarios.
- Si el documento es una prueba o ejemplo, indícalo en "importante".
- Si algo es ambiguo, dilo claramente en "fuente".
- No des asesoramiento jurídico o fiscal como si fueras un profesional.
- Prioriza precisión y claridad sobre cantidad de texto.
`.trim();

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    tipo: {
      type: "string"
    },
    resumen: {
      type: "string"
    },
    acciones: {
      type: "array",
      items: {
        type: "string"
      }
    },
    plazos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fecha: {
            type: "string"
          },
          contexto: {
            type: "string"
          }
        },
        required: ["fecha", "contexto"]
      }
    },
    documentos: {
      type: "array",
      items: {
        type: "string"
      }
    },
    donde: {
      type: "string"
    },
    importante: {
      type: "array",
      items: {
        type: "string"
      }
    },
    fuente: {
      type: "string"
    }
  },
  required: [
    "tipo",
    "resumen",
    "acciones",
    "plazos",
    "documentos",
    "donde",
    "importante",
    "fuente"
  ]
};

app.post(
  "/api/analyze",
  rateLimitAnalysis,
  upload.single("document"),
  async (req, res) => {
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

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });

      const contents = [
        {
          text: ANALYSIS_PROMPT
        },
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: req.file.buffer.toString("base64")
          }
        }
      ];

      const config = {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      };

      let response;
      let lastError;

      for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            config
          });
          lastError = null;
          console.log(`DocuListo analysis completed with ${model}`);
          break;
        } catch (error) {
          lastError = error;
          const status = Number(error?.status || error?.code || 0);
          const message = String(error?.message || "").toLowerCase();

          const retryable =
            status === 429 ||
            status === 503 ||
            /quota|resource exhausted|rate limit|too many requests|high demand|unavailable/.test(message);

          if (!retryable || model === FALLBACK_MODEL) {
            throw error;
          }

          console.warn(`Model ${model} unavailable; trying ${FALLBACK_MODEL}`);
        }
      }

      if (!response) {
        throw lastError || new Error("No se recibió respuesta del proveedor de IA.");
      }

      const raw = String(response.text || "").trim();

      if (!raw) {
        return res.status(502).json({
          error: "El proveedor de IA no ha devuelto ningún resultado."
        });
      }

      let analysis;

      try {
        analysis = JSON.parse(raw);
      } catch {
        return res.status(502).json({
          error: "El proveedor de IA ha devuelto una respuesta no válida. Inténtalo de nuevo."
        });
      }

      return res.json({
        ok: true,
        file: {
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        analysis
      });
    } catch (error) {
      console.error("DocuListo analyze error:", error);

      const message = String(error?.message || "").toLowerCase();
      const status = Number(error?.status || error?.code || 0);

      if (
        status === 429 ||
        /quota|resource exhausted|rate limit|too many requests/.test(message)
      ) {
        return res.status(503).json({
          error: "El servicio de IA ha alcanzado temporalmente su límite de uso. Vuelve a intentarlo en unos minutos."
        });
      }

      if (
        status === 401 ||
        status === 403 ||
        /api key|permission|unauthorized|forbidden/.test(message)
      ) {
        return res.status(503).json({
          error: "El servicio de IA no está autorizado correctamente."
        });
      }

      if (
        status === 400 ||
        /invalid argument|bad request|unsupported/.test(message)
      ) {
        return res.status(400).json({
          error: "El proveedor de IA ha rechazado este documento o su formato."
        });
      }

      return res.status(502).json({
        error: "El servicio de IA no ha podido procesar el documento en este momento."
      });
    }
  }
);

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "El archivo supera el límite de 10 MB."
    });
  }

  if (err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Formato no válido. Usa PDF, JPG o PNG."
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "No se ha podido recibir el archivo."
    });
  }

  console.error("DocuListo server error:", err);

  return res.status(500).json({
    error: "Error interno del servidor."
  });
});

app.listen(port, () => {
  console.log(`DocuListo API escuchando en el puerto ${port}`);
});
