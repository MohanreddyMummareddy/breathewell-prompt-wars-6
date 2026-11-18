import http from 'node:http';
import { createRequestHandler } from './lib/server.mjs';

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Could not load .env. Check its format and file permissions.');
    process.exit(1);
  }
}

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

const server = http.createServer(
  { requestTimeout: 30000, headersTimeout: 10000, keepAliveTimeout: 5000 },
  createRequestHandler(),
);
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Stop the existing server with Ctrl+C, or set a different PORT in .env.`
      : `Server could not start (${error.code || 'unknown error'}).`,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Breathewell ready at http://localhost:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
