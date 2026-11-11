import { publishedLook as defaults, applyLook } from './config.mjs';
const groups = [
  ['Portrait', [
    ['density','Character density',60,240,1],
    ['contrast','Contrast',.4,2.5,.05],
    ['brightness','Brightness',.25,2,.05],
    ['exposure','Exposure',.5,2,.05],
    ['gamma','Shadow curve',.3,1.8,.05],
    ['glyphWeight','Character weight',.5,3,.1],
    ['noseContrast','Nose detail',0,3,.1],
  ]],
  ['Position & type', [
    ['zoom','Portrait size',.6,1.5,.02],
    ['centerX','Center · horizontal',-.3,.3,.01],
    ['centerY','Center · vertical',-.3,.3,.01],
    ['letterSpacing','Letter spacing',-.06,.06,.002],
  ]],
  ['Disintegration', [
    ['cycleDuration','Cycle length · seconds',8,60,1],
    ['erosionReach','Peak erosion',.2,1.6,.05],
    ['textBreakup','Text erosion',0,1,.05],
    ['fragmentation','Shard detail',1,3,1],
    ['driftSpread','Weightless spread',0,2,.05],
    ['breakup','Amount',0,1,.02],
    ['breakupCenter','Starting center',.3,.95,.005],
    ['feather','Boundary softness',.01,2,.01],
    ['sweepDuration','Sweep duration · seconds',3,60,1],
    ['particleSpeed','Speed',0,1.5,.02],
    ['particleTravel','Travel distance',0,.6,.01],
    ['randomness','Velocity variation',0,1.5,.05],
    ['windCurl','Orbital drift',0,2,.05],
    ['fragmentSpin','Fragment rotation',0,2,.05],
    ['fragmentDepth','Fragment depth',0,1.5,.05],
    ['flightDepth','Near / far depth',0,1.5,.05],
    ['streamReach','Far fragment reach',0,2,.05],
    ['erosionStructure','Connected erosion',0,1,.02],
    ['debrisDensity','Particle density',0,.6,.01],
  ]],
  ['Touch & reveal', [
    ['brushSize','Brush size · pixels',40,200,2],
    ['trailPersistence','Trail persistence · seconds',.2,2,.05],
  ]],
  ['Character animation', [
    ['afterglow','Motion afterglow · seconds',0,.25,.01],
    ['scrambleHz','Rewrite speed',0,16,.5],
    ['densityJitter','Density variation',0,3,.25],
    ['glitchBandSpeed','Scramble band speed',0,1,.05],
  ]],
  ['Red eye & takeover', [
    ['eyeX','Eye · horizontal',.3,.8,.001],
    ['eyeY','Eye · vertical',.2,.5,.002],
    ['eyeWidth','Eye width',.005,.05,.001],
    ['eyeHeight','Eye height',.003,.03,.001],
    ['eyeGlow','Eye glow',0,.25,.005],
    ['nameGlow','Name glow',0,3,.1],
    ['flickerSpeed','Ignition speed',.5,2,.1],
    ['hold','Takeover hold · seconds',.5,4,.1],
    ['interval','Time between · seconds',3,20,.5],
  ]],
];
const fields=groups.flatMap(g=>g[1]);
const storageKey='danny-portrait-tuning-v1';
function sanitize(input){
  const result={...defaults};
  for(const [key,,min,max,step] of fields){
    if(typeof input?.[key]==='number' && Number.isFinite(input[key]))
      result[key]=Number((Math.round(Math.max(min,Math.min(max,input[key]))/step)*step).toFixed(4));
  }
  if(/^#[\da-f]{6}$/i.test(input?.eyeColor))result.eyeColor=input.eyeColor;
  return result;
}
export function createTuner(config,onChange,onPreview,onReplay=()=>{}){
  let values={...defaults};
  try{values=sanitize(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
  try{const shared=new URLSearchParams(location.hash.slice(1)).get('look');if(shared)values=sanitize(JSON.parse(shared));}catch{}
  const panel=document.createElement('aside');panel.className='tuner';panel.hidden=true;panel.id='portrait-tuner';panel.setAttribute('aria-label','Appearance controls');
  const toggle=document.createElement('button');toggle.className='tuner-toggle';toggle.setAttribute('aria-label','Tune appearance');toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h3m5 0h8"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/></svg><span>Tune</span>';toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
  panel.innerHTML=`<header><div><h2>Dial in the look</h2><p>Changes save on this device.</p></div><button type="button" class="tuner-close" aria-label="Close controls">×</button></header>
    <div class="tuner-toolbar"><label>Starting point <select aria-label="Starting point"><option value="current">Current look</option><option value="clean">Clean portrait</option><option value="ghost">More fragmented</option><option value="coarse">Coarse characters</option></select></label><button type="button" data-action="preview">Test flicker</button></div>
    <div class="tuner-fields"></div><footer><button type="button" data-action="replay">Restart cycle</button><button type="button" data-action="reset">Reset</button><button type="button" data-action="copy">Copy settings</button><button type="button" data-action="link">Copy look link</button><button type="button" data-action="import">Import settings</button><p role="status" class="tuner-status"></p><textarea hidden aria-label="Settings JSON" spellcheck="false"></textarea><button hidden type="button" data-action="apply">Apply JSON</button></footer>`;
  const controls=new Map();
  for(const [title,entries] of groups){
    const details=document.createElement('details');details.open=title==='Portrait';
    const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
    for(const [key,label,min,max,step] of entries){
      const row=document.createElement('div');row.className='tuner-row';
      const id=`tune-${key}`;
      row.innerHTML=`<label for="${id}">${label}</label><input type="number" aria-label="${label} value" min="${min}" max="${max}" step="${step}"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}">`;
      const inputs=[...row.querySelectorAll('input')];controls.set(key,inputs);
      for(const input of inputs)input.addEventListener('input',()=>{if(input.value===''||!input.validity.valid)return;values=sanitize({...values,[key]:Number(input.value)});sync();apply();});
      details.append(row);
    }
    if(title==='Red eye & takeover'){
      const row=document.createElement('label');row.className='tuner-color';row.textContent='Eye color';
      const input=document.createElement('input');input.type='color';input.setAttribute('aria-label','Eye color');input.addEventListener('input',()=>{values.eyeColor=input.value;apply();});row.append(input);details.append(row);controls.set('eyeColor',[input]);
    }
    panel.querySelector('.tuner-fields').append(details);
  }
  (document.querySelector('.scene-actions')||document.body).append(toggle);document.body.append(panel);
  const status=panel.querySelector('.tuner-status');const textarea=panel.querySelector('textarea');const applyButton=panel.querySelector('[data-action="apply"]');
  function apply(){
    applyLook(config, values);
    document.documentElement.style.setProperty('--name-spacing',`${values.letterSpacing}em`);
    onChange();
    try{localStorage.setItem(storageKey,JSON.stringify(values));}catch{status.textContent='Device storage is unavailable. Copy settings to keep this look.';}
  }
  function sync(){for(const [key,inputs] of controls)for(const input of inputs)input.value=values[key];}
  function open(value){panel.hidden=!value;toggle.hidden=value;toggle.setAttribute('aria-expanded',String(value));document.body.classList.toggle('tuning-open',value);if(value)panel.querySelector('.tuner-close').focus();else toggle.focus();}
  toggle.addEventListener('click',()=>open(true));panel.querySelector('.tuner-close').addEventListener('click',()=>open(false));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();open(false);}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  panel.querySelector('[data-action="replay"]').addEventListener('click',()=>{onReplay();status.textContent=reduced.matches?'Reduced motion is enabled. The portrait stays still.':'Disintegration restarted.';});
  panel.querySelector('[data-action="preview"]').addEventListener('click',()=>{if(reduced.matches){status.textContent='Reduced motion is enabled. The preview stays still.';return;}onPreview();status.textContent='Playing the takeover.';});
  panel.querySelector('select').addEventListener('change',e=>{
    const presets={current:{},clean:{breakup:0,contrast:1.2,density:190,scrambleHz:3},ghost:{breakup:1,breakupCenter:.60,particleSpeed:.8,randomness:1.4,debrisDensity:.28},coarse:{density:100,glyphWeight:2,brightness:1.1}};
    values=sanitize({...defaults,...presets[e.target.value]});sync();apply();status.textContent='Starting point applied.';
  });
  panel.querySelector('[data-action="reset"]').addEventListener('click',()=>{values={...defaults};sync();apply();panel.querySelector('select').value='current';history.replaceState(null,'',location.pathname+location.search);status.textContent='Reset to the published look.';});
  async function copy(text,message){try{await navigator.clipboard.writeText(text);status.textContent=message;}catch{textarea.hidden=false;textarea.value=text;textarea.focus();textarea.select();status.textContent='Select and copy the text below.';}}
  panel.querySelector('[data-action="copy"]').addEventListener('click',()=>copy(JSON.stringify(values,null,2),'Settings copied. Paste them into the chat to keep this look.'));
  panel.querySelector('[data-action="link"]').addEventListener('click',()=>{const url=new URL(location.href);url.hash=new URLSearchParams({look:JSON.stringify(values)}).toString();copy(url.href,'Look link copied. It opens these settings on another device.');});
  panel.querySelector('[data-action="import"]').addEventListener('click',()=>{textarea.hidden=false;applyButton.hidden=false;textarea.value='';textarea.placeholder='Paste copied settings here';textarea.focus();});
  applyButton.addEventListener('click',()=>{try{const parsed=JSON.parse(textarea.value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.keys(parsed).some(k=>k in defaults))throw new Error();values=sanitize(parsed);sync();apply();textarea.hidden=true;applyButton.hidden=true;status.textContent='Settings applied.';}catch{status.textContent='Paste a settings JSON object copied from this panel.';}});
  sync();apply();
  if(new URLSearchParams(location.search).has('tune'))open(true);
}
