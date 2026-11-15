'use strict';
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');
const EXPECTED=23;
let active=false;
function runSystemCheck(root,onResult=()=>{},executable=process.execPath){
 if(active)return Promise.reject(new Error('A system check is already running.'));
 active=true;
 return new Promise((resolve,reject)=>{
  let files;try{files=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.test.cjs')).sort().map(name=>path.join(root,'tests',name));if(!files.length)throw new Error('The bundled system checks are missing. Extract the complete ULTRON ZIP.');}catch(error){active=false;reject(error);return;}
  const env={...process.env,ELECTRON_RUN_AS_NODE:'1'};
  const child=spawn(executable,['--test','--test-reporter=tap',...files],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const results=[];let buffer='',settled=false;
  const finish=(error,code)=>{if(settled)return;settled=true;clearTimeout(timer);active=false;if(error){reject(error);return;}resolve({passed:results.filter(r=>r.passed).length,total:results.length,expected:EXPECTED,allClear:code===0&&results.length===EXPECTED&&results.every(r=>r.passed),results});};
  const timer=setTimeout(()=>{child.kill();finish(new Error('The system check timed out. All clear cannot be confirmed.'));},45000);
  function line(value){const match=value.match(/^(not ok|ok) \d+ - (.+?)(?: #.*)?$/);if(!match)return;const result={index:results.length+1,name:match[2].slice(0,250),passed:match[1]==='ok'};results.push(result);onResult(result);}
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){line(buffer.slice(0,end).replace(/\r$/,''));buffer=buffer.slice(end+1);}if(buffer.length>100000){child.kill();finish(new Error('Invalid test runner output.'));}});
  // TAP carries test results; never forward raw diagnostic output or credentials.
  child.stderr.resume();child.once('error',error=>finish(error));child.once('close',code=>{if(buffer)line(buffer);finish(null,code);});
 });
}
module.exports={runSystemCheck,EXPECTED};
