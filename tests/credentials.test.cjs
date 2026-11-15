'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {readConfiguredKey,connectionBody}=require('../local-credentials.cjs');
test('configured key stays local and is used only when the key field is empty',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultron-key-test-'));const configured='sk_'+'x'.repeat(40);const typed='sk_'+'y'.repeat(40);
 try{assert.equal(readConfiguredKey(dir),'');fs.writeFileSync(path.join(dir,'private-credentials.json'),JSON.stringify({elevenLabsApiKey:configured}));assert.equal(readConfiguredKey(dir),configured);assert.equal(connectionBody({apiKey:'',agentId:'a'},configured).apiKey,configured);assert.equal(connectionBody({apiKey:typed},configured).apiKey,typed);assert.equal(connectionBody({apiKey:''},'').apiKey,'');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('personal credential is absent from shipped browser assets',()=>{
 const root=path.join(__dirname,'..');const key=readConfiguredKey(root);if(!key)return;
 for(const name of ['dist/renderer.js','dist/voice-api.mjs','manager.js','manager.html'])assert.equal(fs.readFileSync(path.join(root,name),'utf8').includes(key),false,'Secret found in '+name);
});
