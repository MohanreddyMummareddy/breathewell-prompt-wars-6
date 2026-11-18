import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestHandler } from '../lib/server.mjs';
import { SECURITY_HEADERS } from '../lib/security-headers.mjs';
import { readFile } from 'node:fs/promises';

function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    writeHead(status, headers) {
      this.status = status;
      Object.assign(this.headers, headers);
    },
    end(body) {
      this.body = body;
    },
  };
}
test('local static delivery handles homepage, missing files and HEAD requests', async () => {
  const handler = createRequestHandler();
  for (const [url, method, status] of [
    ['/', 'GET', 200],
    ['/missing', 'GET', 404],
    ['/', 'HEAD', 200],
    ['/', 'POST', 405],
    ['/%2e%2e%5c.env', 'GET', 403],
    ['/.env', 'GET', 404],
  ]) {
    const res = response();
    await handler({ url, method }, res);
    assert.equal(res.status, status, `${method} ${url}`);
    assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
    if (method === 'HEAD') assert.equal(res.body, undefined);
  }
});
test('Vercel and local server security policies remain consistent', async () => {
  const deployment = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const headers = Object.fromEntries(
    deployment.headers[0].headers.map(({ key, value }) => [key, value]),
  );
  assert.deepEqual(headers, SECURITY_HEADERS);
});
