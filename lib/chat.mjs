import { guidance } from '../public/logic.js';
import { generateGuidance } from './gemini.mjs';
export default async function chat(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.writeHead(405);res.end('Method not allowed');return;}
 try {
  let body=''; for await (const chunk of req) { body+=chunk; if(body.length>12000){res.writeHead(413);res.end();return;} }
  const {profile,question}=JSON.parse(body);
  if(!profile || typeof question!=='string' || question.length>2000 || typeof profile.city!=='string' || profile.city.length>100 || !Number.isFinite(profile.aqi) || profile.aqi<0 || profile.aqi>500 || !Number.isFinite(profile.commute) || profile.commute<0 || profile.commute>200) {res.writeHead(400);res.end('Invalid input');return;}
  let answer=guidance(profile,question), mode='Local guidance', diagnostic;
  if((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !/severe breathlessness|difficulty breathing|cannot breathe|chest pain|emergency/i.test(question)) {
   try {
    answer=await generateGuidance({profile,question,apiKey:(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY).trim(),model:process.env.GEMINI_MODEL?.trim() || undefined});
    mode='Gemini-generated guidance';
   } catch(error) {
    mode='Local guidance · Gemini unavailable';
    diagnostic={code:error.code||'INVALID_RESPONSE',httpStatus:error.httpStatus,model:error.model||process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',message:error.code?error.message:'Gemini returned an invalid response. Please retry.'};
    console.error('Gemini request failed',JSON.stringify(diagnostic));
   }
  } else if(!/severe breathlessness|difficulty breathing|cannot breathe|chest pain|emergency/i.test(question)) {
   diagnostic={code:'NOT_CONFIGURED',message:'Gemini API key is not configured on the server.'};
  }
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({answer,mode,diagnostic}));return;
 } catch {res.writeHead(400);res.end('Invalid request');}
}
