const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);

export function applySecurityHeaders(app) {
  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    });
    next();
  });
}

export function hasValidFileSignature(file) {
  if (!file?.buffer || !ALLOWED_MIME_TYPES.has(file.mimetype)) return false;

  const bytes = file.buffer;

  if (file.mimetype === "application/pdf") {
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (file.mimetype === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.mimetype === "image/png") {
    return bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  return false;
}
