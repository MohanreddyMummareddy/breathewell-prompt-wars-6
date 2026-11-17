import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { guidance } from './public/logic.js';
import { generateGuidance } from './lib/gemini.mjs';
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
 if(req.url === '/api/chat' && req.method === 'POST') {
  let body=''; for await (const chunk of req) { body+=chunk; if(body.length>12000){res.writeHead(413);res.end();return;} }
  const {profile,question}=JSON.parse(body);
  if(!profile || typeof question!=='string' || question.length>2000 || typeof profile.city!=='string' || profile.city.length>100 || !Number.isFinite(profile.aqi) || profile.aqi<0 || profile.aqi>500 || !Number.isFinite(profile.commute) || profile.commute<0 || profile.commute>200) {res.writeHead(400);res.end('Invalid input');return;}
  let answer=guidance(profile,question), mode='Local guidance';
  if((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !/breath|chest|emergency/i.test(question)) {
   try {
    answer=await generateGuidance({profile,question,apiKey:process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,model:process.env.GEMINI_MODEL || undefined});
    mode='Gemini-generated guidance';
   } catch {mode='Local guidance · AI unavailable';}
  }
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({answer,mode}));return;
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
