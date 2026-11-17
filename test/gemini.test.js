import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGuidance} from '../lib/gemini.mjs';
const input={profile:{city:'Delhi',aqi:186},question:'Indoor air tips',apiKey:'test-key'};
test('Gemini authenticates via header and includes household context',async()=>{
 const answer=await generateGuidance({...input,fetchImpl:async(url,options)=>{
  assert.match(url,/generativelanguage\.googleapis\.com/);assert.ok(!url.includes(input.apiKey));
  assert.equal(options.headers['x-goog-api-key'],'test-key');
  const body=JSON.parse(options.body);assert.match(body.systemInstruction.parts[0].text,/Never invent live data/);
  assert.equal(JSON.parse(body.contents[0].parts[0].text).profile.city,'Delhi');
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:'Use a suitable particle filter.'}]}}]})};
 }});assert.equal(answer,'Use a suitable particle filter.');
});
test('Gemini provider errors permit fallback',async()=>{await assert.rejects(generateGuidance({...input,fetchImpl:async()=>({ok:false})}),/unavailable/);});
test('Gemini blocked, truncated and empty responses are rejected',async()=>{
 for(const data of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[]},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}])
  await assert.rejects(generateGuidance({...input,fetchImpl:async()=>({ok:true,json:async()=>data})}));
});
test('Gemini model cannot redirect requests',async()=>{await assert.rejects(generateGuidance({...input,model:'../../other?key=value'}),/configuration/);});
