import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import chat from './lib/chat.mjs';
import locationsHandler from './lib/locations.mjs';
try { process.loadEnvFile(); } catch (error) {
 if (error.code !== 'ENOENT') {
  console.error('Could not load .env. Check its format and file permissions.');
  process.exit(1);
 }
}
const root = resolve('public');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
const server = http.createServer(async (req,res) => {
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self' https://geocoding-api.open-meteo.com https://air-quality-api.open-meteo.com; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
 try {
 if(new URL(req.url,'http://localhost').pathname === '/api/locations') return locationsHandler(req,res);
 if(req.url === '/api/chat' && req.method === 'POST') {
  return chat(req,res);
 }
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+'\\') && !file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);
 }catch {res.writeHead(req.url==='/api/chat'?400:404);res.end('Request could not be completed');}
});
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
 console.error('PORT must be an integer between 1 and 65535.');
 process.exit(1);
}
server.on('error', error => {
 console.error(error.code === 'EADDRINUSE'
  ? `Port ${port} is already in use. Stop the existing server with Ctrl+C in its terminal, or set a different PORT in .env and run npm start again.`
  : `Server could not start (${error.code || 'unknown error'}).`);
 process.exitCode = 1;
});
server.listen(port,'127.0.0.1',()=>console.log(`Breathewell ready at http://localhost:${port}`));
