import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createChatHandler } from '../lib/chat.mjs';
import { createChatService } from '../lib/application/chat-service.mjs';
import { createRateLimiter } from '../lib/rate-limit.mjs';
import { GeminiError } from '../lib/gemini.mjs';
import { cleanPreferences } from '../public/domain/profile.js';

const input = {
  profile: { ...cleanPreferences(), aqi: 250 },
  question: 'How can I improve indoor air?',
};
const silent = { error() {} };
function request(body = input, headers = {}) {
  const req = Readable.from([Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  req.method = 'POST';
  req.headers = { 'content-type': 'application/json', host: 'example.test', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.body = JSON.parse(body);
    },
  };
}
const service = () => createChatService({ readConfig: () => ({ apiKey: '' }), logger: silent });

test('HTTP adapter validates and returns a safe local response without configuration', async () => {
  const res = response();
  await createChatHandler({ service: service() })(request(), res);
  assert.equal(res.status, 200);
  assert.equal(res.body.diagnostic.code, 'NOT_CONFIGURED');
  assert.match(res.headers['Content-Type'], /application\/json/);
});
test('blank questions and wrong preference types return 400 without provider calls', async () => {
  let calls = 0;
  const app = createChatService({
    generate: async () => {
      calls++;
    },
    readConfig: () => ({ apiKey: 'test' }),
    logger: silent,
  });
  for (const invalid of [
    { ...input, question: ' ' },
    { ...input, profile: { ...input.profile, budget: [] } },
    { ...input, profile: { ...input.profile, sensitive: 'false' } },
    { ...input, profile: { ...input.profile, aqi: 501 } },
  ]) {
    const res = response();
    await createChatHandler({ service: app })(request(invalid), res);
    assert.equal(res.status, 400);
  }
  assert.equal(calls, 0);
});
test('non-JSON, malformed JSON, and oversized UTF-8 bodies are rejected', async () => {
  const handle = createChatHandler({ service: service() });
  for (const [req, status] of [
    [request(input, { 'content-type': 'text/plain' }), 415],
    [request('{bad-json'), 400],
    [request('界'.repeat(5000)), 413],
  ]) {
    const res = response();
    await handle(req, res);
    assert.equal(res.status, status);
  }
});
test('method and cross-origin guards protect the public endpoint', async () => {
  const handle = createChatHandler({ service: service() });
  const get = request();
  get.method = 'GET';
  const a = response();
  await handle(get, a);
  assert.equal(a.status, 405);
  assert.equal(a.headers.Allow, 'POST');
  const b = response();
  await handle(request(input, { origin: 'https://attacker.test' }), b);
  assert.equal(b.status, 403);
});
test('bounded limiter returns 429 and Retry-After then recovers after expiry', async () => {
  let time = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => time });
  const handle = createChatHandler({ service: service(), limiter });
  const a = response();
  await handle(request(), a);
  assert.equal(a.status, 200);
  const b = response();
  await handle(request(), b);
  assert.equal(b.status, 429);
  assert.equal(b.headers['Retry-After'], '1');
  time = 1001;
  const c = response();
  await handle(request(), c);
  assert.equal(c.status, 200);
});
test('provider receives an allowlisted profile and success is labeled as generated', async () => {
  const app = createChatService({
    readConfig: () => ({ apiKey: 'secret' }),
    logger: silent,
    generate: async ({ profile }) => {
      assert.ok(!('place' in profile));
      assert.ok(!('extra' in profile));
      return 'A tailored answer.';
    },
  });
  const result = await app({ ...input, profile: { ...input.profile, extra: 'private' } });
  assert.equal(result.mode, 'Gemini-generated guidance');
});
test('urgent symptoms bypass GenAI and do not expose provider credentials', async () => {
  const app = createChatService({
    generate: () => {
      throw Error('must not run');
    },
    readConfig: () => ({ apiKey: 'secret' }),
    logger: silent,
  });
  const result = await app({ ...input, question: 'I have chest pain' });
  assert.equal(result.mode, 'Urgent safety guidance');
  assert.match(result.answer, /urgent local medical/);
});
test('provider errors preserve diagnostics but arbitrary exceptions are sanitized', async () => {
  for (const error of [
    new GeminiError('PROVIDER_ERROR', 'Provider overloaded.', 503, 'gemini-test'),
    Error('secret-credential'),
  ]) {
    const app = createChatService({
      generate: async () => {
        throw error;
      },
      readConfig: () => ({ apiKey: 'secret' }),
      logger: silent,
    });
    const result = await app(input);
    assert.match(result.mode, /Local guidance/);
    assert.ok(!JSON.stringify(result).includes('secret-credential'));
    if (error instanceof GeminiError) assert.equal(result.diagnostic.httpStatus, 503);
  }
});
test('unexpected internal handler errors become sanitized 500 responses', async () => {
  const res = response();
  await createChatHandler({
    service: () => {
      throw Error('internal secret');
    },
  })(request(), res);
  assert.equal(res.status, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('internal secret'));
});
