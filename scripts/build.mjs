import {readFile,writeFile,mkdir,cp,rm,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'site'),out=path.resolve(root,'dist');
// Only replace this repository's generated directory; never follow a symlink.
if(path.dirname(out)!==path.resolve(root)||path.basename(out)!=='dist')throw Error('Unsafe output path');
const existing=await lstat(out).catch(error=>{if(error.code!=='ENOENT')throw error;});
if(existing?.isSymbolicLink())throw Error('Build output must not be a symlink');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const stripPreview=text=>text.replace(/<!-- preview:start -->[\s\S]*?<!-- preview:end -->/g,'').replace(/\/\/ preview:start[\s\S]*?\/\/ preview:end/g,'');
for(const file of ['index.html','main.mjs']){
  const text=stripPreview(await readFile(path.join(source,file),'utf8'));
  if(/createTuner|tuner\.css|class="experience"/.test(text))throw Error(`Preview code remains in ${file}`);
  await writeFile(path.join(out,file),text);
}
for(const file of ['config.mjs','portrait-gl.mjs','text-effect.mjs','experience.mjs','timeline.mjs','adaptive-quality.mjs','tap-motion.mjs','idle-glitch.mjs','flick.mjs','style.css','manifest.webmanifest','404.html','CNAME','assets']){
  await cp(path.join(source,file),path.join(out,file),{recursive:true});
}
await writeFile(path.join(out,'.nojekyll'),'');
console.log('Production build: dist/ (published look; no tuning, hints, replay or reveal UI)');
