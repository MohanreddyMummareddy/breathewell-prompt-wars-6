import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import chat from './chat.mjs';
import locations from './locations.mjs';
import { SECURITY_HEADERS } from './security-headers.mjs';
import { sendJson } from './http.mjs';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function createRequestHandler({
  publicRoot = resolve('public'),
  chatHandler = chat,
  locationsHandler = locations,
} = {}) {
  return async (req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/chat') return await chatHandler(req, res);
      if (url.pathname === '/api/locations') return await locationsHandler(req, res);
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        return sendJson(res, 405, {
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for static resources.' },
        });
      }
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(publicRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      const inside = relative(publicRoot, file);
      if (inside.startsWith('..') || isAbsolute(inside) || pathname.includes('\0'))
        return sendJson(res, 403, {
          error: { code: 'FORBIDDEN', message: 'Resource is not accessible.' },
        });
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(file)] || 'application/octet-stream',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const notFound = ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code);
      sendJson(res, notFound ? 404 : 400, {
        error: {
          code: notFound ? 'NOT_FOUND' : 'INVALID_REQUEST',
          message: notFound ? 'Resource not found.' : 'Request could not be completed.',
        },
      });
    }
  };
}
