import { publishedLook, applyLook } from './config.mjs';
const groups = [
  ['Portrait', [
    ['density','Character density',60,240,1],
    ['contrast','Contrast',.4,2.5,.05],
    ['brightness','Brightness',.25,2,.05],
    ['exposure','Exposure',.5,2,.05],
    ['gamma','Shadow curve',.3,1.8,.05],
    ['glyphWeight','Character weight',.5,3,.1],
    ['glyphFillX','Horizontal fill',.5,2,.05],
    ['glyphFillY','Vertical fill',.5,2,.05],
    ['gapFill','Gap fill',0,100,1],
    ['noseContrast','Nose detail',0,3,.1],
  ]],
  ['Position & type', [
    ['zoom','Portrait size',.6,1.5,.02],
    ['centerX','Center · horizontal',-.3,.3,.01],
    ['centerY','Center · vertical',-.3,.3,.01],
    ['letterSpacing','Letter spacing',-.06,.06,.002],
  ]],
  ['Idle floating', [
    ['idleAmount','Face drifting characters · %',0,100,1],
    ['idleTravel','Face float distance',0,4,.05],
    ['idleRetention','Face characters kept intact · %',0,100,1],
    ['textIdleAmount','Name drifting characters · %',0,100,1],
    ['textIdleTravel','Name float distance',0,4,.05],
    ['cycleDuration','Idle drift period · seconds',8,60,1],
    ['redAmount','Red drifting characters · %',0,100,1],
    ['redIntensity','Red intensity',0,1,.05],
  ]],
  ['Fragments & motion', [
    ['fragmentation','Shard detail',1,3,1],
    ['driftSpread','Weightless spread',0,2,.05],
    ['particleTravel','Travel distance',0,.6,.01],
    ['randomness','Velocity variation',0,1.5,.05],
    ['windCurl','Orbital drift',0,2,.05],
    ['fragmentSpin','Fragment rotation',0,2,.05],
    ['fragmentDepth','Fragment depth',0,1.5,.05],
    ['flightDepth','Near / far depth',0,1.5,.05],
    ['streamReach','Far fragment reach',0,2,.05],
    ['debrisDensity','Particle density',0,.6,.01],
  ]],
  ['Touch & scatter', [
    ['brushSize','Brush size · pixels',40,200,2],
    ['trailPersistence','Trail persistence · seconds',.2,2,.05],
  ]],
  ['Character animation', [
    ['scrambleHz','Rewrite speed',0,16,.5],
    ['densityJitter','Density variation',0,3,.25],
    ['glitchBandSpeed','Scramble band speed',0,1,.05],
  ]],

];
const fields=groups.flatMap(g=>g[1]);
export function createTuner(config,onChange,onPreview,onReplay=()=>{}){
const defaults={...publishedLook,
  idleAmount:Math.round((config.shader.idleFraction??.1)*100),
  textIdleAmount:Math.round((config.shader.textIdleFraction??config.shader.idleFraction??.1)*100),
  idleTravel:config.shader.idleTravel??1,
  textIdleTravel:config.shader.textIdleTravel??config.shader.idleTravel??1,
  idleCopies:!!config.shader.idleCopies,
  idleRetention:Math.round((config.shader.idleRetention??(config.shader.idleCopies?1:0))*100),
  redAmount:Math.round((config.shader.redFraction??.5)*100),
  redIntensity:config.shader.redIntensity??1,
};
// Start the release from its selected settings, without older preview overrides.
const storageKey='danny-portrait-tuning-v4';
function sanitize(input){
  const result={...defaults};
  for(const [key,,min,max,step,kind] of fields){
    if(kind==='checkbox'){
      if(typeof input?.[key]==='boolean')result[key]=input[key];
      continue;
    }
    if(typeof input?.[key]==='number' && Number.isFinite(input[key]))
      result[key]=Number((Math.round(Math.max(min,Math.min(max,input[key]))/step)*step).toFixed(4));
  }
  if(/^#[\da-f]{6}$/i.test(input?.eyeColor))result.eyeColor=input.eyeColor;
  // Older shared looks used a checkbox. Preserve their meaning on import.
  if(typeof input?.idleRetention!=='number'&&typeof input?.idleCopies==='boolean')
    result.idleRetention=input.idleCopies?100:0;
  result.idleCopies=result.idleRetention>0;
  return result;
}
  let values={...defaults};
  try{values=sanitize(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{}
  try{const shared=new URLSearchParams(location.hash.slice(1)).get('look');if(shared)values=sanitize(JSON.parse(shared));}catch{}
  const panel=document.createElement('aside');panel.className='tuner';panel.hidden=true;panel.id='portrait-tuner';panel.setAttribute('aria-label','Appearance controls');
  const toggle=document.createElement('button');toggle.className='tuner-toggle';toggle.setAttribute('aria-label','Tune appearance');toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h3m5 0h8"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/></svg><span>Tune</span>';toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');
  panel.innerHTML=`<header><div><h2>Dial in the look</h2><p>Changes save on this device.</p></div><button type="button" class="tuner-close" aria-label="Close controls">×</button></header>
    <div class="tuner-toolbar"><label>Starting point <select aria-label="Starting point"><option value="current">Current look</option><option value="clean">Clean portrait</option><option value="ghost">More fragmented</option><option value="coarse">Coarse characters</option></select></label></div>
    <div class="tuner-fields"></div><footer><button type="button" data-action="replay">Restart cycle</button><button type="button" data-action="reset">Reset</button><button type="button" data-action="copy">Copy settings</button><button type="button" data-action="link">Copy look link</button><button type="button" data-action="import">Import settings</button><p role="status" class="tuner-status"></p><textarea hidden aria-label="Settings JSON" spellcheck="false"></textarea><button hidden type="button" data-action="apply">Apply JSON</button></footer>`;
  const controls=new Map();
  const orderedGroups=config.ascii.binary
    ? [...groups.filter(([title])=>title==='Idle floating'),...groups.filter(([title])=>title!=='Idle floating')]
    : groups;
  for(const [title,entries] of orderedGroups){
    const details=document.createElement('details');details.open=title==='Idle floating'||(title==='Portrait'&&!config.ascii.binary);
    const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
    for(const [key,label,min,max,step,kind] of entries){
      const row=document.createElement('div');row.className='tuner-row';
      const id=`tune-${key}`;
      if(kind==='checkbox'){
        row.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="checkbox">`;
        const input=row.querySelector('input');controls.set(key,[input]);
        input.addEventListener('change',()=>{values=sanitize({...values,[key]:input.checked});sync();apply();});
        details.append(row);continue;
      }
      row.innerHTML=`<label for="${id}">${label}</label><input type="number" aria-label="${label} value" min="${min}" max="${max}" step="${step}"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}">`;
      if(key==='idleRetention'){
        const help=document.createElement('p');help.className='tuner-help';help.id=`${id}-help`;
        help.textContent='100% floats copies and keeps the face intact. 0% leaves holes. The name still leaves holes.';
        row.append(help);for(const input of row.querySelectorAll('input'))input.setAttribute('aria-describedby',help.id);
      }
      if(key==='glyphFillX'||key==='glyphFillY'||key==='gapFill'){
        const help=document.createElement('p');help.className='tuner-help';help.id=`${id}-help`;
        help.textContent=key==='gapFill'?'0 = original ASCII. 100 = solid cells, including character holes.':key==='glyphFillX'?'1 = original. Increase to narrow gaps between characters.':'1 = original. Increase to narrow gaps between rows.';
        row.append(help);for(const input of row.querySelectorAll('input'))input.setAttribute('aria-describedby',help.id);
      }
      const inputs=[...row.querySelectorAll('input')];controls.set(key,inputs);
      const range=inputs[1];let touchEdit=null;
      const commit=input=>{if(input.value===''||!input.validity.valid)return;values=sanitize({...values,[key]:Number(input.value)});sync();apply();};
      // Native ranges change on touch-down, before the browser knows whether the
      // user means to scroll. Wait for horizontal intent or a completed tap.
      range.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchEdit={id:e.pointerId,x:e.clientX,y:e.clientY,direction:null};});
      range.addEventListener('pointermove',e=>{
        if(!touchEdit||e.pointerId!==touchEdit.id)return;
        const dx=Math.abs(e.clientX-touchEdit.x),dy=Math.abs(e.clientY-touchEdit.y);
        if(!touchEdit.direction){
          if(dx>8&&dx>dy*1.2){touchEdit.direction='horizontal';commit(range);}
          else if(dy>8&&dy>dx){touchEdit.direction='vertical';sync();}
        }
      });
      range.addEventListener('pointerup',e=>{
        if(!touchEdit||e.pointerId!==touchEdit.id)return;
        const direction=touchEdit.direction;touchEdit=null;
        if(direction!=='vertical')commit(range);else sync();
      });
      for(const event of ['pointercancel','lostpointercapture'])range.addEventListener(event,()=>{if(touchEdit){touchEdit=null;sync();}});
      for(const input of inputs)input.addEventListener('input',()=>{
        if(input===range&&touchEdit&&touchEdit.direction!=='horizontal')return;
        commit(input);
      });
      inputs[0].addEventListener('blur',()=>{
        if(inputs[0].value===''||!inputs[0].validity.valid){
          inputs[0].value=values[key];
          status.textContent=`${label} restored to ${values[key]}. Enter a value from ${min} to ${max}.`;
        }
      });
      details.append(row);
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
  function sync(){for(const [key,inputs] of controls)for(const input of inputs){if(input.type==='checkbox')input.checked=values[key];else input.value=values[key];}}
  function open(value){panel.hidden=!value;toggle.hidden=value;toggle.setAttribute('aria-expanded',String(value));document.body.classList.toggle('tuning-open',value);if(value)panel.querySelector('.tuner-close').focus();else toggle.focus();}
  toggle.addEventListener('click',()=>open(true));panel.querySelector('.tuner-close').addEventListener('click',()=>open(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopPropagation();open(false);}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  panel.querySelector('[data-action="replay"]').addEventListener('click',()=>{onReplay();status.textContent=reduced.matches?'Reduced motion is enabled. The portrait stays still.':'Cycle restarted.';});
  panel.querySelector('select').addEventListener('change',e=>{
    const presets={current:{},clean:{breakup:0,contrast:1.2,density:190,scrambleHz:3},ghost:{breakup:1,breakupCenter:.60,particleSpeed:.8,randomness:1.4,debrisDensity:.28},coarse:{density:100,glyphWeight:2,brightness:1.1}};
    values=sanitize({...defaults,...presets[e.target.value]});sync();apply();status.textContent='Starting point applied.';
  });
  panel.querySelector('[data-action="reset"]').addEventListener('click',()=>{values={...defaults};sync();apply();panel.querySelector('select').value='current';history.replaceState(null,'',location.pathname+location.search);status.textContent='Reset to this preview’s starting look.';});
  async function copy(text,message){try{await navigator.clipboard.writeText(text);status.textContent=message;}catch{textarea.hidden=false;textarea.value=text;textarea.focus();textarea.select();status.textContent='Select and copy the text below.';}}
  panel.querySelector('[data-action="copy"]').addEventListener('click',()=>copy(JSON.stringify(values,null,2),'Settings copied. Paste them into the chat to keep this look.'));
  panel.querySelector('[data-action="link"]').addEventListener('click',()=>{const url=new URL(location.href);url.hash=new URLSearchParams({look:JSON.stringify(values)}).toString();copy(url.href,'Look link copied. It opens these settings on another device.');});
  panel.querySelector('[data-action="import"]').addEventListener('click',()=>{textarea.hidden=false;applyButton.hidden=false;textarea.value='';textarea.placeholder='Paste copied settings here';textarea.focus();});
  applyButton.addEventListener('click',()=>{try{const parsed=JSON.parse(textarea.value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.keys(parsed).some(k=>k in defaults))throw new Error();values=sanitize(parsed);sync();apply();textarea.hidden=true;applyButton.hidden=true;status.textContent='Settings applied.';}catch{status.textContent='Paste a settings JSON object copied from this panel.';}});
  sync();apply();
  if(new URLSearchParams(location.search).has('tune'))open(true);
}
