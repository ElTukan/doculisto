import { GoogleGenAI } from "@google/genai";

const ALLOWED_ORIGIN = "https://doculisto.es";
const MAX_FILE_BYTES = 3 * 1024 * 1024;

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  return res.json(body);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido." });

  try {
    const body = req.body || {};
    const file = body.file;

    if (!file?.data || !file?.mimeType) {
      return send(res, 400, { error: "Debes enviar un documento." });
    }

    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowed.has(file.mimeType)) {
      return send(res, 400, { error: "Formato no compatible. Usa PDF, JPG o PNG." });
    }

    const approxBytes = Math.floor((file.data.length * 3) / 4);
    if (approxBytes > MAX_FILE_BYTES) {
      return send(res, 413, { error: "El archivo supera el límite de 3 MB en esta versión." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return send(res, 503, { error: "El analizador todavía no está configurado." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = [
      "Eres el analizador de documentos de DocuListo para usuarios de España.",
      "",
      "Analiza el documento y responde en español claro, preciso y fácil de entender.",
      "",
      "NO te limites a resumir. El objetivo es ayudar al usuario a entender el documento y saber qué debe revisar después.",
      "",
      "Devuelve exactamente estas secciones:",
      "",
      "QUE ES",
      "Explica brevemente qué tipo de documento es y qué comunica.",
      "",
      "QUE TENGO QUE HACER",
      "Enumera las acciones que el documento indica o que razonablemente pide revisar. No inventes acciones.",
      "",
      "PLAZOS",
      "Detecta fechas y plazos. Conserva literalmente las fechas que aparezcan. Si no hay un plazo identificable, dilo.",
      "",
      "DOCUMENTACION",
      "Enumera documentos, datos o justificantes que se soliciten explícitamente.",
      "",
      "DONDE",
      "Indica el organismo, portal, dirección o canal que aparezca en el documento. No inventes enlaces.",
      "",
      "IMPORTANTE",
      "Señala advertencias, consecuencias, cantidades, fechas o puntos que el usuario debería revisar.",
      "",
      "FUENTE",
      "Distingue lo que aparece directamente en el documento de lo que no puede determinarse con él.",
      "",
      "REGLAS:",
      "- No inventes datos.",
      "- No des asesoramiento jurídico o fiscal como si fueras un profesional.",
      "- Si algo no se puede determinar, dilo.",
      "- No repitas innecesariamente datos personales sensibles.",
      "- No inventes enlaces ni trámites.",
      "- Si es una notificación oficial, indícalo.",
      "- Prioriza exactitud sobre extensión."
    ].join("\n");

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        { type: "document", data: file.data, mime_type: file.mimeType },
        { type: "text", text: prompt }
      ]
    });

    return send(res, 200, {
      ok: true,
      analysis: interaction.output_text || "No se ha podido obtener un análisis."
    });
  } catch (error) {
    console.error("DocuListo analyze error:", error);
    return send(res, 500, {
      error: "No hemos podido analizar el documento. Inténtalo de nuevo."
    });
  }
}
