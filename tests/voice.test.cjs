'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
async function voice(){return import('../dist/voice-session.mjs');}
test('disconnect diagnostics include context and close code without connection secrets',async()=>{
 const {voiceDisconnectMessage}=await voice();const message=voiceDisconnectMessage({reason:'error',closeReason:'Closed wss://api.elevenlabs.io/secret',closeCode:1008,context:{type:'policy_violation'}});
 assert.match(message,/1008/);assert.match(message,/policy_violation/);assert.ok(!message.includes('/secret'));
});
test('a recoverable SDK error after startup does not end the active handle',async()=>{
 const {openVoiceSession}=await voice();let callbacks,ended=0,errors=0;
 const handle=await openVoiceSession(async options=>{callbacks=options;return {endSession:async()=>{ended++;}};},{onError:()=>errors++});
 callbacks.onError('Client tool failed');assert.equal(errors,1);assert.equal(ended,0);await handle.endSession();assert.equal(ended,1);
});
test('last-call diagnostics load detailed termination reason and redact the account key',async()=>{
 const {handleUltron,seal}=await import('../dist/voice-api.mjs');const original=globalThis.fetch;const key='test-key-private';const secret='a'.repeat(64);
 const sessionToken=await seal({key,agentId:'agent_desktop',voice:'Adam',uid:'desktop-owner',exp:Date.now()+60000},secret);const requests=[];
 globalThis.fetch=async url=>{requests.push(url);if(url.includes('?agent_id='))return Response.json({conversations:[{conversation_id:'conv_test',status:'failed'}]});return Response.json({agent_id:'agent_desktop',status:'failed',metadata:{termination_reason:'Quota exhausted '+key}});};
 try{const response=await handleUltron(new Request('https://ultron.local/api/ultron/diagnose',{method:'POST',headers:{Origin:'https://ultron.local','Content-Type':'application/json','oai-authenticated-user-id':'desktop-owner'},body:JSON.stringify({sessionToken})}),{ULTRON_SESSION_SECRET:secret});assert.equal(response.status,200);const data=await response.json();assert.match(data.diagnostic,/Quota exhausted/);assert.ok(!data.diagnostic.includes(key));assert.ok(requests.some(url=>url.endsWith('/conv_test')));}finally{globalThis.fetch=original;}
});
