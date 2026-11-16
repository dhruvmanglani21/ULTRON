'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const http=require('node:http');const crypto=require('node:crypto');
const {asset,checksum,digest,download}=require('../bootstrap.cjs');
test('runtime selects Windows architecture and requires exact checksum filename',()=>{
 assert.match(asset('x64'),/win32-x64.zip$/);assert.match(asset('arm64'),/win32-arm64.zip$/);assert.throws(()=>asset('ia32'));
 const h='a'.repeat(64);assert.equal(checksum(`${'b'.repeat(64)} *other.zip\r\n${h} *${asset('x64')}\r\n`,asset('x64')),h);
 assert.throws(()=>checksum(`${h} other.zip`,asset('x64')));
});
test('runtime download retries failed responses and hashes complete bytes',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultron-download-test-'));let count=0;
 const bytes=Buffer.from('runtime fixture');const server=http.createServer((req,res)=>{count++;if(count===1){res.writeHead(503);res.end('unavailable');}else res.end(bytes);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const file=path.join(dir,'fixture.zip');await download(`http://127.0.0.1:${server.address().port}/file`,file);assert.equal(count,2);assert.equal(await digest(file),crypto.createHash('sha256').update(bytes).digest('hex'));}
 finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
test('launcher uses prebuilt app without npm and records startup errors',()=>{
 const cmd=fs.readFileSync(path.join(__dirname,'../Start_ULTRON.cmd'),'utf8');assert.match(cmd,/node bootstrap.cjs >ULTRON-startup.log 2>&1/);assert.doesNotMatch(cmd,/call npm/);
 assert.ok(fs.existsSync(path.join(__dirname,'../dist/renderer.js')));assert.ok(fs.existsSync(path.join(__dirname,'../dist/voice-api.mjs')));
});

test('Windows helper commands use PowerShell environment-variable syntax',()=>{
 for(const name of ['bootstrap.cjs','windows-helper.ps1','pc-diagnostics.ps1']){
  const source=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  assert.doesNotMatch(source,/\$env\./,name+' contains invalid PowerShell environment syntax');
 }
});
