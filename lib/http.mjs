export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

export async function readJson(req, maxBytes = 12000) {
  const contentType = req.headers['content-type']?.split(';')[0].trim();
  if (contentType !== 'application/json')
    throw new HttpError(415, 'CONTENT_TYPE', 'Send JSON using application/json.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBytes)
      throw new HttpError(413, 'BODY_TOO_LARGE', 'Request exceeds the 12 KB limit.');
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return; // Native/non-browser clients remain supported.
  try {
    if (new URL(origin).host === req.headers.host) return;
  } catch {
    /* Reject malformed origins. */
  }
  throw new HttpError(403, 'ORIGIN_DENIED', 'Cross-site assistant requests are not allowed.');
}
