'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
test('visible PC button and keyboard enable the same session controls',async()=>{
 const nodes=new Map();const listeners={};let enabled=false;const calls=[];
 const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',checked:false,disabled:false,setAttribute(){},replaceChildren(){}});return nodes.get(id);};
 const manager={get:async()=>({available:true,enabled,protectedStorage:true,contacts:[]}),enable:async value=>{calls.push(value);enabled=value;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../manager.js'),'utf8'),{document:{getElementById:get},window:{manager,addEventListener:(name,fn)=>listeners[name]=fn}});
 await new Promise(setImmediate);
 assert.equal(get('quick-enable').textContent,'Enable PC controls');assert.equal(get('quick-enable').disabled,false);
 await get('quick-enable').onclick();assert.equal(enabled,true);assert.equal(get('quick-state').textContent,'PC commands enabled.');assert.equal(get('quick-enable').textContent,'Disable PC controls');
 await get('quick-enable').onclick();assert.equal(enabled,false);
 let prevented=false;listeners.keydown({ctrlKey:true,altKey:true,code:'KeyE',repeat:false,preventDefault(){prevented=true;}});
 await new Promise(setImmediate);assert.equal(prevented,true);assert.equal(enabled,true);assert.deepEqual(calls,[true,false,true]);
});
