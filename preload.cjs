'use strict';
const {contextBridge,ipcRenderer}=require('electron');
if(process.isMainFrame){
  contextBridge.exposeInMainWorld('ultronDesktop',Object.freeze({
    run:command=>ipcRenderer.invoke('ultron:desktop',command),
    systemCheck:()=>ipcRenderer.invoke('ultron:system-check'),
    onCheckResult:callback=>{const listener=(_event,result)=>callback(result);ipcRenderer.on('ultron:check-result',listener);return()=>ipcRenderer.removeListener('ultron:check-result',listener);},
    status:()=>ipcRenderer.invoke('ultron:status'),
    openManager:()=>ipcRenderer.invoke('ultron:manager'),
    voice:(path,body)=>ipcRenderer.invoke('ultron:voice',{path,body}),
    onState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('ultron:state',listener);return()=>ipcRenderer.removeListener('ultron:state',listener);}
  }));
}
