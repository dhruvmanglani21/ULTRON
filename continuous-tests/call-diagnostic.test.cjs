'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const api=()=>import('../dist/voice-api.mjs');
test('failed calls expose metadata.error reason and numeric code even without termination reason',async()=>{
 const {callDiagnostic}=await api();const text=callDiagnostic({status:'failed',conversation_id:'conv_fixture',metadata:{error:{code:1008,reason:'Voice is unavailable'}}},'fixture-key',{agent_message_count:0});
 assert.match(text,/Agent replies: 0/);assert.match(text,/Voice is unavailable/);assert.match(text,/Error code: 1008/);assert.match(text,/Call ID: conv_fixture/);
});
test('provider error and termination reason are both retained without duplicate reasons',async()=>{
 const {callDiagnostic}=await api();assert.match(callDiagnostic({status:'failed',metadata:{error:{reason:'TTS failed'},termination_reason:'Disconnected'}},'fixture-key'),/TTS failed; Disconnected/);
 assert.equal((callDiagnostic({status:'failed',metadata:{error:{reason:'Same reason'},termination_reason:'Same reason'}},'fixture-key').match(/Same reason/g)||[]).length,1);
});
test('diagnostics redact credentials and personal data and never return transcripts',async()=>{
 const {callDiagnostic}=await api();const key='private-test-credential';const text=callDiagnostic({status:'failed',metadata:{error:{code:key,reason:`${key} sk_abcdef123456 https://secret.example/a person@example.com`}},transcript:[{role:'user',message:'private transcript'},{role:'agent',message:'hello'}]},key);
 for(const secret of [key,'sk_abcdef123456','secret.example','person@example.com','private transcript','hello'])assert.ok(!text.includes(secret));assert.match(text,/Agent replies: 1/);
});
test('missing reasons and processing calls have an explicit useful fallback',async()=>{
 const {callDiagnostic}=await api();assert.match(callDiagnostic({status:'failed'},'fixture-key'),/no failure reason/);assert.match(callDiagnostic({status:'processing'},'fixture-key'),/Check again shortly/);assert.doesNotMatch(callDiagnostic({status:'done'},'fixture-key'),/no failure reason/);
});
test('diagnose endpoint reads details and preserves the listing reply count',async()=>{
 const {handleUltron,seal}=await api();const secret='fixture-secret'.repeat(5),key='fixture-call-api-key',agentId='agent_fixture';const sessionToken=await seal({key,agentId,uid:'desktop-owner',voice:'fixture',exp:Date.now()+10000},secret);
 const original=globalThis.fetch;let requests=0;globalThis.fetch=async()=>Response.json(++requests===1?{conversations:[{conversation_id:'conv_fixture',agent_message_count:0}]}:{agent_id:agentId,conversation_id:'conv_fixture',status:'failed',metadata:{error:{reason:'Upstream synthesis failed',code:1011}}});
 try{const response=await handleUltron(new Request('https://ultron.local/api/ultron/diagnose',{method:'POST',headers:{Origin:'https://ultron.local','Content-Type':'application/json','oai-authenticated-user-id':'desktop-owner'},body:JSON.stringify({sessionToken})}),{ULTRON_SESSION_SECRET:secret});assert.equal(response.status,200);const {diagnostic}=await response.json();assert.match(diagnostic,/Upstream synthesis failed/);assert.match(diagnostic,/1011/);assert.match(diagnostic,/Agent replies: 0/);assert.equal(requests,2);}finally{globalThis.fetch=original;}
});
