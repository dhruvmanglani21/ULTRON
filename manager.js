'use strict';
const $=id=>document.getElementById(id);
function message(e){const text=e?.message||String(e);$('message').textContent=text;$('quick-state').textContent=text;}
let controlsEnabled=false;let changing=false;
function render(contacts){$('contacts').replaceChildren();for(const c of contacts){const row=document.createElement('div');row.className='contact';const label=document.createElement('span');label.textContent=c.name;const number=document.createElement('small');number.textContent='+'+c.phone;label.append(number);const button=document.createElement('button');button.className='secondary';button.textContent='Remove';button.onclick=async()=>{try{render(await window.manager.deleteContact(c.id));}catch(e){message(e);}};row.append(label,button);$('contacts').append(row);}}
async function refresh(){try{const data=await window.manager.get();controlsEnabled=data.enabled;$('quick-enable').disabled=!data.available||changing;$('quick-enable').textContent=data.enabled?'Disable PC controls':'Enable PC controls';$('quick-enable').setAttribute('aria-pressed',String(data.enabled));$('quick-state').textContent=data.available?(data.enabled?'PC commands enabled.':'PC commands disabled.'):'PC controls require Windows 11.';$('enabled').checked=data.enabled;$('enabled').disabled=!data.available;$('state').textContent=data.available?(data.enabled?'PC commands enabled.':'PC commands disabled.'):'PC controls require Windows 11.';if(!data.protectedStorage)$('state').textContent+=' Protected storage is unavailable; contacts cannot be persisted.';render(data.contacts);}catch(e){message(e);}}
async function setControls(value){if(changing)return;changing=true;$('quick-enable').disabled=true;try{await window.manager.enable(value);}catch(e){message(e);}finally{changing=false;await refresh();}}
$('enabled').onchange=()=>setControls($('enabled').checked);
$('quick-enable').onclick=()=>setControls(!controlsEnabled);
window.addEventListener('keydown',event=>{if(event.ctrlKey&&event.altKey&&event.code==='KeyE'&&!event.repeat){event.preventDefault();void setControls(true);}});
$('contact-form').onsubmit=async e=>{e.preventDefault();try{render(await window.manager.saveContact({name:$('name').value,phone:$('phone').value}));$('name').value='';$('phone').value='';$('message').textContent='Contact saved on this PC.';}catch(e){message(e);}};
$('whatsapp').onclick=async()=>{try{await window.manager.openWhatsApp();}catch(e){message(e);}};
window.addEventListener('focus',refresh);void refresh();
