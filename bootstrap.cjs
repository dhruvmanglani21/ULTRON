'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const VERSION='45.3.1';
function asset(arch){if(!['x64','arm64'].includes(arch))throw new Error('ULTRON requires 64-bit Windows (x64 or ARM64).');return `electron-v${VERSION}-win32-${arch}.zip`;}
function checksum(manifest,name){
 const entry=manifest.split(/\r?\n/).map(line=>line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/)).find(m=>m&&m[2]===name);
 if(!entry)throw new Error('The official release has no checksum for '+name);
 return entry[1].toLowerCase();
}
async function digest(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function download(url,file){
 let last;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   console.log(`Downloading ${path.basename(file)} (attempt ${attempt}/3)...`);
   const response=await fetch(url,{signal:AbortSignal.timeout(600000),headers:{'User-Agent':'ULTRON-Desktop-Setup'}});
   if(!response.ok)throw new Error(`Download returned HTTP ${response.status} from GitHub.`);
   if(!response.body)throw new Error('The download was empty.');
   await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file));return;
  }catch(error){last=error;fs.rmSync(file,{force:true});console.log(error.message);}
 }
 throw new Error('Could not download the official Electron runtime. Check access to github.com and release-assets.githubusercontent.com. '+last.message);
}
function run(exe,args,options={}){return new Promise((resolve,reject)=>{const child=spawn(exe,args,{stdio:'inherit',...options});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`${path.basename(exe)} exited with code ${code}.`)));});}
async function main(){
 if(process.platform!=='win32')throw new Error('This launcher is for Windows 11.');
 const name=asset(process.arch);
 const base=path.join(process.env.LOCALAPPDATA||os.tmpdir(),'ULTRON','runtime');
 const target=path.join(base,`${VERSION}-${process.arch}`);
 const exe=path.join(target,'electron.exe');
 fs.mkdirSync(base,{recursive:true});
 // A private staging directory prevents interrupted downloads from being used.
 if(!fs.existsSync(path.join(target,'ultron-runtime-ready'))||!fs.existsSync(exe)){
  const stage=fs.mkdtempSync(path.join(base,'setup-'));
  try{
   const release=`https://github.com/electron/electron/releases/download/v${VERSION}/`;
   const manifest=path.join(stage,'SHASUMS256.txt');const archive=path.join(stage,name);
   await download(release+'SHASUMS256.txt',manifest);
   const expected=checksum(fs.readFileSync(manifest,'utf8'),name);
   await download(release+name,archive);
   console.log('Checking runtime SHA-256...');
   if(await digest(archive)!==expected)throw new Error('Runtime checksum mismatch. No downloaded code was started. Run the launcher again to retry.');
   const unpack=path.join(stage,'unpacked');
   console.log('Extracting the verified runtime...');
   await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:ULTRON_ARCHIVE -DestinationPath $env:ULTRON_UNPACK -Force"],{env:{...process.env,ULTRON_ARCHIVE:archive,ULTRON_UNPACK:unpack},windowsHide:true});
   if(!fs.existsSync(path.join(unpack,'electron.exe')))throw new Error('Runtime extraction did not produce electron.exe.');
   fs.writeFileSync(path.join(unpack,'ultron-runtime-ready'),JSON.stringify({version:VERSION,sha256:expected}));
   fs.rmSync(target,{recursive:true,force:true});fs.renameSync(unpack,target);
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
 }
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 console.log('Starting ULTRON...');
 await run(exe,[__dirname],{cwd:__dirname,env});
}
if(require.main===module)main().catch(error=>{console.error('\nULTRON startup failed: '+error.message);process.exitCode=1;});
module.exports={asset,checksum,digest,download};
