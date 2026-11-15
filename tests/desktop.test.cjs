'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');
const {validateCommand,normalizePhone,normalizeContact,resolveContact,whatsappUrl,isLocalRenderer}=require('../policy.cjs');
const {readDraftScript,sendDraftScript}=require('../whatsapp-dom.cjs');
test('only declared desktop actions and shortcuts are accepted',()=>{
  assert.equal(validateCommand({action:'open_app',text:'Notepad',shell:'malicious'}).shell,undefined);
  assert.throws(()=>validateCommand({action:'run_shell',text:'anything'}),/Unsupported/);
  assert.throws(()=>validateCommand({action:'press_shortcut',shortcut:'arbitrary'}),/Unsupported/);
  assert.throws(()=>validateCommand({action:'click_control',window_id:'42',control_id:'invented'}),/Invalid control/);
  assert.deepEqual(validateCommand({action:'click_control',window_id:'42',control_id:'r_1-2-3'}),{action:'click_control',window_id:'42',control_id:'r_1-2-3'});
});
test('message actions require exact text and an opaque contact ID',()=>{
  assert.throws(()=>validateCommand({action:'send_whatsapp',text:'hello'}),/contact ID/);
  assert.throws(()=>validateCommand({action:'send_whatsapp',text:'',contact_id:'x'}),/exact text/);
  assert.throws(()=>validateCommand({action:'type_text',text:'x'.repeat(5001)}),/Invalid text/);
});
test('international phone numbers are normalized without guessing country codes',()=>{
  assert.equal(normalizePhone('+971 (50) 123-4567'),'971501234567');
  assert.throws(()=>normalizePhone('0501234567'),/international/);
  assert.throws(()=>normalizePhone('not-a-number'),/international/);
  const c=normalizeContact({name:'  Mum  ',phone:'+971501234567'});assert.equal(c.name,'Mum');assert.ok(c.id);
});
test('contact resolution is exact and WhatsApp links encode message text safely',()=>{
  const c={id:'contact-1',name:'Mum',phone:'971501234567'};
  assert.equal(resolveContact([c],'contact-1'),c);assert.throws(()=>resolveContact([c],'Mum'),/exact/);
  assert.throws(()=>resolveContact([c,c],'contact-1'),/exact/);
  const url=new URL(whatsappUrl(c,'Hello & goodbye?\nQuoted "text"'));
  assert.equal(url.origin,'https://web.whatsapp.com');assert.equal(url.searchParams.get('phone'),c.phone);assert.equal(url.searchParams.get('text'),'Hello & goodbye?\nQuoted "text"');
});
test('privileged IPC origin checks reject web frames and other local pages',()=>{
  const trusted='file:///C:/Ultron/dist/index.html';
  assert.equal(isLocalRenderer(trusted,trusted),true);
  assert.equal(isLocalRenderer('https://web.whatsapp.com',trusted),false);
  assert.equal(isLocalRenderer('file:///C:/Ultron/manager.html',trusted),false);
  assert.equal(isLocalRenderer(trusted+'?other=1',trusted),false);
});
function dom(text,{label='Send',disabled=false}={}){
  const state={clicked:0};const editor={innerText:text};const button={disabled,getAttribute:name=>name==='aria-label'?label:null,click:()=>state.clicked++};
  return {state,context:{document:{querySelector:()=>editor,querySelectorAll:()=>[button]}}};
}
test('WhatsApp send script refuses changed drafts, wrong controls and disabled buttons',()=>{
  for(const [text,options]of [['changed',{}],['hello',{label:'Delete'}],['hello',{disabled:true}]]){
    const d=dom(text,options);assert.equal(vm.runInNewContext(sendDraftScript('hello'),d.context).clicked,false);assert.equal(d.state.clicked,0);
  }
});
test('WhatsApp send script clicks only an exact matching visible draft',()=>{
  const d=dom('hello');assert.equal(vm.runInNewContext(sendDraftScript('hello'),d.context).clicked,true);assert.equal(d.state.clicked,1);
  assert.equal(vm.runInNewContext(readDraftScript,d.context).text,'hello');
});
test('quoted and script-like message text stays data inside the WhatsApp verifier',()=>{
  const message='"; throw new Error("injected"); //';const d=dom(message);
  assert.equal(vm.runInNewContext(sendDraftScript(message),d.context).clicked,true);assert.equal(d.state.clicked,1);
  const multi=dom('line one\nline two');assert.equal(vm.runInNewContext(sendDraftScript('line one\r\nline two'),multi.context).clicked,true);
});
test('desktop ElevenLabs config advertises native actions and uses an English voice model',async()=>{
  const {toolConfig,agentConfig}=await import('../dist/voice-api.mjs');
  assert.equal(toolConfig.name,'ultron_desktop_command');
  for(const action of ['open_app','inspect_window','type_text','start_dictation','list_contacts','send_whatsapp'])assert.ok(toolConfig.parameters.properties.action.enum.includes(action));
  assert.ok(!toolConfig.parameters.properties.action.enum.includes('dictate_text'));
  const config=agentConfig('tool-id','voice-id');assert.equal(config.name,'ULTRON Desktop');assert.equal(config.conversation_config.tts.model_id,'eleven_flash_v2');assert.equal(config.platform_settings.auth.enable_auth,true);
  assert.match(config.conversation_config.agent.prompt.prompt,/local Send approval/);
});
test('local voice backend provisions its own private desktop agent without a hosted-site login',async()=>{
  const {handleUltron,unseal}=await import('../dist/voice-api.mjs');const original=globalThis.fetch;const key='test-only-elevenlabs-key-not-a-secret';const secret='a'.repeat(64);let created;
  globalThis.fetch=async(url,options)=>{
    if(url.includes('/agents?page'))return Response.json({agents:[]});if(url.endsWith('/voices'))return Response.json({voices:[{name:'Adam',voice_id:'stock',category:'premade'}]});if(url.includes('/tools?'))return Response.json({tools:[]});if(url.endsWith('/tools')){assert.equal(JSON.parse(options.body).tool_config.name,'ultron_desktop_command');return Response.json({id:'tool-desktop'});}if(url.endsWith('/agents/create')){created=JSON.parse(options.body);return Response.json({agent_id:'agent_desktop'});}throw new Error('Unexpected provider call');
  };
  try{
    const request=new Request('https://ultron.local/api/ultron/connect',{method:'POST',headers:{Origin:'https://ultron.local','Content-Type':'application/json','oai-authenticated-user-id':'desktop-owner'},body:JSON.stringify({apiKey:key})});
    const result=await handleUltron(request,{ULTRON_SESSION_SECRET:secret});assert.equal(result.status,200);const data=await result.json();assert.equal(created.name,'ULTRON Desktop');assert.ok(!JSON.stringify(data).includes(key));assert.equal((await unseal(data.sessionToken,secret)).key,key);
  }finally{globalThis.fetch=original;}
});
