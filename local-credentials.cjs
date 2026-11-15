'use strict';
const fs=require('node:fs');
const path=require('node:path');
function readConfiguredKey(root){
 const file=path.join(root,'private-credentials.json');
 if(!fs.existsSync(file))return '';
 const value=JSON.parse(fs.readFileSync(file,'utf8')).elevenLabsApiKey;
 if(typeof value!=='string'||!/^sk_[a-zA-Z0-9_-]{20,253}$/.test(value))throw new Error('The configured ElevenLabs key is invalid. Update private-credentials.json.');
 return value;
}
function connectionBody(body,key){return {...body,...(!body?.apiKey&&key?{apiKey:key}:{})};}
module.exports={readConfiguredKey,connectionBody};
