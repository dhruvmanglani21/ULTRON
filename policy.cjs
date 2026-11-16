'use strict';
const SHORTCUTS = new Set(['copy','paste','cut','undo','redo','select_all','find','save','new_tab','close_tab','next_tab','previous_tab','escape','enter']);
const ACTIONS = new Set(['desktop_status','pc_diagnostics','list_apps','open_app','list_windows','focus_window','inspect_window','click_control','type_text','press_shortcut','start_dictation','stop_dictation','dictate_text','list_contacts','draft_whatsapp','send_whatsapp']);
function text(value, max=5000) { if(typeof value!=='string'||value.length>max)throw new Error('Invalid text value.');return value; }
function validateCommand(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||!ACTIONS.has(value.action))throw new Error('Unsupported desktop action.');
  const c={action:value.action};
  if(value.text!==undefined)c.text=text(value.text);
  if(value.window_id!==undefined){c.window_id=text(value.window_id,30);if(!/^\d+$/.test(c.window_id))throw new Error('Invalid window ID.');}
  if(value.control_id!==undefined){c.control_id=text(value.control_id,180);if(!/^r_[\d-]+$/.test(c.control_id))throw new Error('Invalid control ID.');}
  if(value.contact_id!==undefined){c.contact_id=text(value.contact_id,80);if(!/^[\w-]+$/.test(c.contact_id))throw new Error('Invalid contact ID.');}
  if(value.shortcut!==undefined){c.shortcut=text(value.shortcut,30);if(!SHORTCUTS.has(c.shortcut))throw new Error('Unsupported keyboard shortcut.');}
  if(['type_text','dictate_text','draft_whatsapp','send_whatsapp'].includes(c.action)&&(!c.text||!c.text.trim()))throw new Error('Supply the exact text first.');
  if(['click_control'].includes(c.action)&&(!c.window_id||!c.control_id))throw new Error('Inspect the window and supply its window ID and control ID first.');
  if(c.action==='focus_window'&&!c.window_id)throw new Error('Select a window from list_windows first.');
  if(c.action==='press_shortcut'&&!c.shortcut)throw new Error('Choose a supported shortcut.');
  if(['draft_whatsapp','send_whatsapp'].includes(c.action)&&!c.contact_id)throw new Error('Use list_contacts to choose a contact ID first.');
  return c;
}
function normalizePhone(value) { const p=text(value,40).replace(/[\s()+.-]/g,'');if(!/^[1-9]\d{6,14}$/.test(p))throw new Error('Use a full international phone number, for example +971501234567.');return p; }
function normalizeContact(input) {
  const name=text(input?.name,80).trim();if(!name)throw new Error('Contact name is required.');
  return {id:input.id&&/^[\w-]{1,80}$/.test(input.id)?input.id:require('node:crypto').randomUUID(),name,phone:normalizePhone(input.phone)};
}
function resolveContact(contacts,id){const found=contacts.filter(c=>c.id===id);if(found.length!==1)throw new Error('Select one exact saved contact.');return found[0];}
function whatsappUrl(contact,message){const u=new URL('https://web.whatsapp.com/send');u.searchParams.set('phone',normalizePhone(contact.phone));u.searchParams.set('text',text(message,5000));return u.href;}
function isLocalRenderer(url,expected){try {const u=new URL(url);return u.protocol==='file:'&&u.href===expected;}catch{return false;}}
module.exports={SHORTCUTS,ACTIONS,validateCommand,normalizePhone,normalizeContact,resolveContact,whatsappUrl,isLocalRenderer};
