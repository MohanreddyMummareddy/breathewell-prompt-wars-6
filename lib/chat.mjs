import { createChatService } from './application/chat-service.mjs';
import { HttpError, readJson, requireSameOrigin, sendJson } from './http.mjs';
import { createRateLimiter } from './rate-limit.mjs';

export function createChatHandler({
  service = createChatService(),
  limiter = createRateLimiter(),
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for assistant questions.');
      }
      requireSameOrigin(req);
      const key = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local')
        .split(',')[0]
        .trim();
      const limit = limiter(key);
      if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfter));
        throw new HttpError(
          429,
          'RATE_LIMITED',
          'Too many requests. Please wait a minute and retry.',
        );
      }
      const result = await service(await readJson(req));
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, error instanceof HttpError ? error.status : 500, {
        error: {
          code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR',
          message:
            error instanceof HttpError
              ? error.message
              : 'Assistant request could not be completed. Please retry.',
        },
      });
    }
  };
}

export default createChatHandler();
