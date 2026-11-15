'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const key='test-only-key-not-a-real-secret';const secret='a'.repeat(64);
async function connect(fetcher){const {handleUltron}=await import('../dist/voice-api.mjs');const original=globalThis.fetch;globalThis.fetch=fetcher;try{return await handleUltron(new Request('https://ultron.local/api/ultron/connect',{method:'POST',headers:{Origin:'https://ultron.local','Content-Type':'application/json','oai-authenticated-user-id':'desktop-owner'},body:JSON.stringify({apiKey:key,agentId:'agent_deleted'})}),{ULTRON_SESSION_SECRET:secret});}finally{globalThis.fetch=original;}}
const missing=()=>Response.json({detail:{code:'agent_not_found'}},{status:404});
test('deleted saved and listed IDs are skipped in favor of an accessible desktop agent',async()=>{
 const requested=[];const response=await connect(async url=>{requested.push(url);if(url.endsWith('/agent_deleted')||url.endsWith('/agent_stale'))return missing();if(url.includes('/agents?page'))return Response.json({agents:[{name:'ULTRON Desktop',tags:['ultron-desktop'],agent_id:'agent_stale'},{name:'ULTRON Desktop',tags:['ultron-desktop'],agent_id:'agent_existing'}]});if(url.endsWith('/agent_existing'))return Response.json({name:'ULTRON Desktop',platform_settings:{auth:{enable_auth:true}}});throw new Error('Unexpected provider request');});
 assert.equal(response.status,200);assert.equal((await response.json()).agentId,'agent_existing');assert.ok(!requested.some(url=>url.endsWith('/create')));
});
test('missing saved agent creates a replacement when no accessible desktop agent remains',async()=>{
 let creates=0;const response=await connect(async(url,options)=>{if(url.endsWith('/agent_deleted'))return missing();if(url.includes('/agents?page'))return Response.json({agents:[]});if(url.endsWith('/voices'))return Response.json({voices:[{name:'Adam',category:'premade',voice_id:'stock'}]});if(url.includes('/tools?'))return Response.json({tools:[]});if(url.endsWith('/tools'))return Response.json({id:'tool-desktop'});if(url.endsWith('/agents/create')){creates++;assert.equal(JSON.parse(options.body).name,'ULTRON Desktop');return Response.json({agent_id:'agent_replacement'});}throw new Error('Unexpected provider request');});
 assert.equal(response.status,200);assert.equal((await response.json()).agentId,'agent_replacement');assert.equal(creates,1);
});
test('permissions errors are reported without creating a replacement agent',async()=>{
 let calls=0;const response=await connect(async()=>{calls++;return Response.json({detail:{code:'missing_permissions'}},{status:403});});assert.equal(response.status,403);assert.equal(calls,1);
});
