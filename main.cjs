'use strict';
const {app,BrowserWindow,ipcMain,dialog,globalShortcut,Menu,safeStorage,session,shell}=require('electron');
const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');const {spawn}=require('node:child_process');const crypto=require('node:crypto');
const {validateCommand,normalizeContact,resolveContact,whatsappUrl,isLocalRenderer}=require('./policy.cjs');
const {readDraftScript,sendDraftScript}=require('./whatsapp-dom.cjs');
const {readConfiguredKey,connectionBody}=require('./local-credentials.cjs');
const configuredKey=readConfiguredKey(__dirname);
const {runSystemCheck}=require('./system-check.cjs');
const {buildPcReport}=require('./pc-diagnostics.cjs');
const ROOT=__dirname;const MAIN_URL=pathToFileURL(path.join(ROOT,'dist','index.html')).href;const MANAGER_URL=pathToFileURL(path.join(ROOT,'manager.html')).href;
let mainWindow,managerWindow,whatsappWindow,handleVoice,configPath;
let enabled=false,dictating=false,dictationTarget=null;
let config={secret:crypto.randomBytes(32).toString('hex'),contacts:[]};
let confirmationBusy=false,whatsappBusy=false;let desktopQueue=Promise.resolve();const nativeChildren=new Set();
function emergencyStop(){enabled=false;dictating=false;dictationTarget=null;for(const child of nativeChildren)child.kill();broadcast();}
function state(){return {available:process.platform==='win32',enabled,dictating,version:app.getVersion(),platform:process.platform};}
function broadcast(){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('ultron:state',state());}
function persist(){if(!safeStorage.isEncryptionAvailable())throw new Error('Windows protected storage is unavailable. Contacts cannot be saved.');const temp=configPath+'.tmp';fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(config)));fs.renameSync(temp,configPath);}
function verify(event,kind='main'){
  const win=kind==='main'?mainWindow:managerWindow;const url=kind==='main'?MAIN_URL:MANAGER_URL;
  if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!isLocalRenderer(event.senderFrame.url,url))throw new Error('Untrusted desktop request.');
}
function makeWindow(options){const win=new BrowserWindow(options);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));return win;}
function openManager(){if(managerWindow&&!managerWindow.isDestroyed()){managerWindow.show();managerWindow.focus();return;}
  managerWindow=makeWindow({width:720,height:820,minWidth:600,title:'ULTRON • Desktop controls',backgroundColor:'#100c11',webPreferences:{preload:path.join(ROOT,'manager-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  managerWindow.webContents.on('will-navigate',(event,url)=>{if(url!==MANAGER_URL)event.preventDefault();});managerWindow.loadFile(path.join(ROOT,'manager.html'));
}
async function confirm(title,message,detail){if(confirmationBusy)throw new Error('Finish the current approval dialog first.');confirmationBusy=true;try{const r=await dialog.showMessageBox(mainWindow,{type:'question',title,message,detail,buttons:['Cancel','Approve'],defaultId:0,cancelId:0,noLink:true});return r.response===1;}finally{confirmationBusy=false;}}
function native(command){
  if(process.platform!=='win32')return Promise.reject(new Error('PC controls require Windows 11.'));
  const diagnostic=command.action==='pc_diagnostics';
  const script=fs.readFileSync(path.join(ROOT,diagnostic?'pc-diagnostics.ps1':'windows-helper.ps1'),'utf8');
  return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,env:{...process.env,ULTRON_INPUT:Buffer.from(JSON.stringify({...command,blocked_pids:[process.pid]})).toString('base64')},stdio:['ignore','pipe','pipe']});nativeChildren.add(child);child.once('close',()=>nativeChildren.delete(child));let out='',err='';const timer=setTimeout(()=>{child.kill();reject(new Error(diagnostic?'The PC diagnostic scan timed out. No changes were made. Try again after closing busy apps.':'The app did not respond to Windows UI Automation. Try focusing it manually.'));},diagnostic?45000:20000);child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',d=>{out+=d;if(out.length>1000000){child.kill();reject(new Error('The app returned too much UI data.'));}});child.stderr.on('data',d=>{if(err.length<2000)err+=d;});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);try{const data=JSON.parse(out.replace(/^\uFEFF/,'').trim());if(!data.success)reject(new Error(data.error||'Windows action failed.'));else resolve(data);}catch(e){reject(new Error(code===0?'Could not read the Windows automation result.':diagnostic?'Windows could not complete the read-only diagnostic scan. Check Windows PowerShell availability and try again.':err.slice(0,300)||e.message));}});});
}
function openWhatsApp(){
  if(whatsappWindow&&!whatsappWindow.isDestroyed()){whatsappWindow.show();whatsappWindow.focus();return whatsappWindow;}
  whatsappWindow=makeWindow({width:1180,height:820,title:'ULTRON • WhatsApp',backgroundColor:'#111b21',webPreferences:{partition:'persist:ultron-whatsapp',contextIsolation:true,nodeIntegration:false,sandbox:true}});
  whatsappWindow.webContents.on('will-navigate',(event,url)=>{try{if(new URL(url).origin!=='https://web.whatsapp.com')event.preventDefault();}catch{event.preventDefault();}});
  whatsappWindow.loadURL('https://web.whatsapp.com/').catch(()=>{});return whatsappWindow;
}
const READ_DRAFT=readDraftScript;
async function waitDraft(win,expected){const deadline=Date.now()+60000;while(Date.now()<deadline){if(win.isDestroyed())throw new Error('WhatsApp was closed.');if(!enabled)throw new Error('Desktop controls were stopped.');try{const r=await win.webContents.executeJavaScript(READ_DRAFT);if(r.ready&&r.text===expected.replace(/\r\n/g,'\n').trim())return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error('WhatsApp draft was not ready. Sign in with the QR code, set WhatsApp Web to English, then try again. No message was sent.');}
async function whatsapp(command){
  if(whatsappBusy)throw new Error('Finish the current WhatsApp draft first.');whatsappBusy=true;
  try{const contact=resolveContact(config.contacts,command.contact_id);const win=openWhatsApp();await win.loadURL(whatsappUrl(contact,command.text));win.show();win.focus();await waitDraft(win,command.text);
    if(command.action==='draft_whatsapp')return {success:true,message:`Draft ready for ${contact.name} (+${contact.phone}). It has not been sent.`};
    const approval=await dialog.showMessageBox(win,{type:'question',title:'Send WhatsApp message?',message:`Send to ${contact.name} (+${contact.phone})?`,detail:`Review the visible WhatsApp chat and this exact message:\n\n${command.text}`,buttons:['Cancel','Send message'],defaultId:0,cancelId:0,noLink:true});
    if(approval.response!==1)return {success:false,message:'Sending cancelled. The draft remains in WhatsApp.'};
    if(!enabled)throw new Error('Desktop controls were stopped. No message was sent.');
    await waitDraft(win,command.text);
    const script=sendDraftScript(command.text);
    const r=await win.webContents.executeJavaScript(script);if(!r.clicked)throw new Error('WhatsApp Send control was unavailable or the draft changed. No automated send was performed.');
    await new Promise(r=>setTimeout(r,700));const after=await win.webContents.executeJavaScript(READ_DRAFT);
    if(!after.ready||after.text)throw new Error('Send was clicked, but WhatsApp has not confirmed submission. Check the chat before retrying to avoid a duplicate.');
    return {success:true,message:`WhatsApp submitted the message to ${contact.name} (+${contact.phone}). Delivery/read status depends on WhatsApp.`};
  }finally{whatsappBusy=false;}
}
async function run(command){const c=validateCommand(command);
  if(c.action==='desktop_status')return {success:true,...state()};
  if(c.action==='stop_dictation'){dictating=false;dictationTarget=null;broadcast();return {success:true,message:'Dictation stopped.'};}
  if(!enabled)throw new Error('Enable desktop commands in the Desktop controls window first.');
  if(c.action==='pc_diagnostics'){const result=await native(c);if(!enabled)throw new Error('Desktop commands were stopped.');return {success:true,report:buildPcReport(result.snapshot)};}
  if(c.action==='list_contacts'){const q=(c.text||'').toLowerCase();return {success:true,contacts:config.contacts.filter(x=>x.name.toLowerCase().includes(q)).map(x=>({id:x.id,name:x.name,phone:'+'+x.phone}))};}
  if(c.action==='start_dictation'){if(!await confirm('Start live dictation?','Dictate into your target app?','After approval, focus an editable field and speak. Dictation is locked to the first target window. Say Ultron stop dictation or press Ctrl+Alt+X to stop.'))return {success:false,message:'Dictation cancelled.'};if(!enabled)throw new Error('Desktop controls were stopped.');dictating=true;dictationTarget=null;broadcast();return {success:true,message:'Dictation armed. Focus an editable field in the target app, then speak. Say Ultron stop dictation or press Ctrl+Alt+X to stop.'};}
  if(c.action==='dictate_text'){
    if(!dictating)throw new Error('Dictation is not armed.');
    const target=await native({action:'foreground'});
    if(dictationTarget&&(dictationTarget.window_id!==target.window_id||dictationTarget.pid!==target.pid))throw new Error('The target window changed. Stop and restart dictation for the new window.');
    dictationTarget={window_id:target.window_id,pid:target.pid};if(!enabled||!dictating)throw new Error('Dictation was stopped.');
    return native({action:'type_text',text:c.text,window_id:dictationTarget.window_id,expected_pid:dictationTarget.pid});
  }
  if(['draft_whatsapp','send_whatsapp'].includes(c.action))return whatsapp(c);
  if(c.action==='click_control'){
    const view=await native({action:'inspect_window',window_id:c.window_id});const control=view.controls.find(x=>x.id===c.control_id);if(!control)throw new Error('The control changed. Inspect the app again.');c.expected_pid=view.pid;
    if(!await confirm('Approve app action',`Use “${control.name||control.type}” in ${view.title}?`,'Review the app and requested control before approving.'))return {success:false,message:'App action cancelled.'};
  }
  if(c.action==='press_shortcut'&&c.shortcut!=='escape'){
    const target=await native({action:'foreground'});c.window_id=target.window_id;c.expected_pid=target.pid;
    if(!await confirm('Approve keyboard action',`Run ${c.shortcut.replaceAll('_',' ')} in ${target.title}?`,'Keyboard shortcuts can change the active app.'))return {success:false,message:'Keyboard action cancelled.'};
  }
  if(c.action==='type_text'){
    const target=await native({action:'foreground'});c.window_id=target.window_id;c.expected_pid=target.pid;
    if(!await confirm('Approve text entry',`Enter text in ${target.title}?`,c.text))return {success:false,message:'Text entry cancelled.'};
  }
  if(!enabled)throw new Error('Desktop commands were stopped.');return native(c);
}
if(app.requestSingleInstanceLock()) app.whenReady().then(async()=>{
  configPath=path.join(app.getPath('userData'),'protected-settings.bin');
  if(fs.existsSync(configPath)&&safeStorage.isEncryptionAvailable()){try{const loaded=JSON.parse(safeStorage.decryptString(fs.readFileSync(configPath)));if(typeof loaded.secret==='string'&&Array.isArray(loaded.contacts))config=loaded;}catch{}}
  if(configuredKey){const fingerprint=crypto.createHash('sha256').update(configuredKey).digest('hex');if(config.keyFingerprint!==fingerprint){config.secret=crypto.randomBytes(32).toString('hex');config.keyFingerprint=fingerprint;}}
  try{persist();}catch{}
  ({handleUltron:handleVoice}=await import(pathToFileURL(path.join(ROOT,'dist','voice-api.mjs')).href));
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===mainWindow?.webContents&&isLocalRenderer(details.requestingUrl,MAIN_URL)&&permission==='media'&&(!details.mediaTypes||details.mediaTypes.every(x=>x==='audio'))));
  mainWindow=makeWindow({width:1440,height:1000,minWidth:850,minHeight:700,title:'ULTRON • Windows agent',backgroundColor:'#09090c',webPreferences:{preload:path.join(ROOT,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  mainWindow.on('closed',()=>app.quit());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{try{const u=new URL(url);if(u.protocol==='https:'&&['elevenlabs.io','www.elevenlabs.io'].includes(u.hostname))void shell.openExternal(url);}catch{}return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(url!==MAIN_URL)event.preventDefault();});
  ipcMain.handle('ultron:system-check',event=>{verify(event);return runSystemCheck(ROOT,result=>{if(!mainWindow.isDestroyed())mainWindow.webContents.send('ultron:check-result',result);});});
  ipcMain.handle('ultron:status',event=>{verify(event);return state();});
  ipcMain.handle('ultron:manager',event=>{verify(event);openManager();return {success:true};});
  ipcMain.handle('ultron:desktop',(event,command)=>{verify(event);if(command?.action==='stop_dictation')return run(command);const pending=desktopQueue.then(()=>run(command));desktopQueue=pending.catch(()=>{});return pending.catch(e=>({success:false,error:e.message}));});
  ipcMain.handle('ultron:voice',async(event,input)=>{verify(event);if(!['connect','status','disconnect','session','diagnose','credits','client-event'].includes(input?.path))throw new Error('Unsupported voice operation.');const raw=JSON.stringify(input.path==='connect'?connectionBody(input.body||{},configuredKey):input.body||{});if(raw.length>4096)throw new Error('Voice request too large.');const request=new Request('https://ultron.local/api/ultron/'+input.path,{method:'POST',headers:{'Origin':'https://ultron.local','Content-Type':'application/json','oai-authenticated-user-id':'desktop-owner'},body:raw});const r=await handleVoice(request,{ULTRON_SESSION_SECRET:config.secret});const data=await r.json();if(input.path==='status')data.configuredKeyAvailable=!!configuredKey;return {status:r.status,data};});
  ipcMain.handle('manager:get',event=>{verify(event,'manager');return {...state(),contacts:config.contacts,protectedStorage:safeStorage.isEncryptionAvailable()};});
  ipcMain.handle('manager:enable',(event,value)=>{verify(event,'manager');enabled=value===true&&process.platform==='win32';if(!enabled){dictating=false;dictationTarget=null;}broadcast();return state();});
  ipcMain.handle('manager:save-contact',(event,input)=>{verify(event,'manager');const c=normalizeContact(input);if(config.contacts.some(x=>x.id!==c.id&&x.name.toLowerCase()===c.name.toLowerCase()))throw new Error('That contact name already exists. Use a distinct name.');const old=config.contacts;config.contacts=[...old.filter(x=>x.id!==c.id),c];try{persist();}catch(e){config.contacts=old;throw e;}return config.contacts;});
  ipcMain.handle('manager:delete-contact',(event,id)=>{verify(event,'manager');const old=config.contacts;config.contacts=old.filter(x=>x.id!==id);try{persist();}catch(e){config.contacts=old;throw e;}return config.contacts;});
  ipcMain.handle('manager:whatsapp',event=>{verify(event,'manager');openWhatsApp();return {success:true};});
  globalShortcut.register('CommandOrControl+Alt+X',emergencyStop);
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'ULTRON',submenu:[{label:'Desktop controls',click:openManager},{label:'WhatsApp',click:openWhatsApp},{label:'Emergency stop',accelerator:'CmdOrCtrl+Alt+X',click:emergencyStop},{type:'separator'},{role:'quit'}]}]));
  await mainWindow.loadFile(path.join(ROOT,'dist','index.html'));openManager();
}); else app.quit();
app.on('second-instance',()=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();}});
app.on('will-quit',()=>globalShortcut.unregisterAll());app.on('window-all-closed',()=>app.quit());
