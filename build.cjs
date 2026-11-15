const esbuild=require('esbuild');const fs=require('node:fs');const path=require('node:path');
fs.mkdirSync('dist',{recursive:true});
async function build(){
  await esbuild.build({entryPoints:['src/entry.tsx'],outfile:'dist/renderer.js',bundle:true,minify:true,platform:'browser',format:'iife',target:'chrome130',jsx:'automatic',alias:{'@':path.resolve('src')},define:{'process.env.NODE_ENV':'"production"'},conditions:['browser']});
  await esbuild.build({entryPoints:['src/voice-api.ts'],outfile:'dist/voice-api.mjs',bundle:true,platform:'node',format:'esm',target:'node20'});
  await esbuild.build({entryPoints:['src/lib/voice-session.ts'],outfile:'dist/voice-session.mjs',bundle:true,platform:'node',format:'esm',target:'node20'});
  fs.copyFileSync('src/style.css','dist/style.css');fs.copyFileSync('src/index.html','dist/index.html');
}
build().catch(e=>{console.error(e);process.exitCode=1;});
