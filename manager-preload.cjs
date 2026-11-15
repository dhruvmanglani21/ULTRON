'use strict';
const {contextBridge,ipcRenderer}=require('electron');
if(process.isMainFrame)contextBridge.exposeInMainWorld('manager',Object.freeze({
  get:()=>ipcRenderer.invoke('manager:get'),
  enable:value=>ipcRenderer.invoke('manager:enable',value),
  saveContact:contact=>ipcRenderer.invoke('manager:save-contact',contact),
  deleteContact:id=>ipcRenderer.invoke('manager:delete-contact',id),
  openWhatsApp:()=>ipcRenderer.invoke('manager:whatsapp')
}));
