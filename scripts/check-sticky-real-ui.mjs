import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {REPAIR_QUESTIONS} from '../src/utils/repairDiagnostic.js';
const before=process.argv.includes('--before');
const out=new URL('../sticky-real-review.local/',import.meta.url);await mkdir(out,{recursive:true});
const port=before?4331:4330;
const server=await createServer({plugins:before?[{name:'reported-head',enforce:'pre',transform(code,id){const path=id.replaceAll('\\','/');if(path.endsWith('/src/App.jsx'))return execFileSync('git',['show','e89700dfc3847b80f33e361d2e4a4bf4ccf0be1a:src/App.jsx'],{encoding:'utf8'});if(path.endsWith('/src/App.css'))return execFileSync('git',['show','e89700dfc3847b80f33e361d2e4a4bf4ccf0be1a:src/App.css'],{encoding:'utf8'});}}]:[],server:{host:'127.0.0.1',port,strictPort:true}});
let browser;const rows=[];
async function geometry(page){return page.locator('.estimator-home .unified-result').evaluate(e=>{const box=e.getBoundingClientRect(),core=e.querySelector('.compact-estimate')?.getBoundingClientRect(),grid=e.parentElement.getBoundingClientRect(),h=document.querySelector('.navbar').getBoundingClientRect();const cta=e.querySelector(':scope > .btn-primary').getBoundingClientRect();const ancestors=[];for(let p=e.parentElement;p;p=p.parentElement){const c=getComputedStyle(p);ancestors.push({tag:p.tagName,class:p.className,overflowX:c.overflowX,overflowY:c.overflowY});}return{scrollY,viewportHeight:innerHeight,height:box.height,coreTop:core?.top,coreBottom:core?.bottom,top:box.top,bottom:box.bottom,ctaTop:cta.top,ctaBottom:cta.bottom,headerBottom:h.bottom,offset:e.style.getPropertyValue('--summary-top'),position:getComputedStyle(e).position,fits:e.dataset.stickyFits,gridTop:grid.top,gridBottom:grid.bottom,ancestors};});}
try{await server.listen();browser=await chromium.launch();
for(const viewport of (before?[{width:1686,height:896},{width:1686,height:700}]:[{width:1686,height:896},{width:1686,height:700},{width:1440,height:900},{width:1280,height:896},{width:1180,height:896},{width:390,height:844},{width:320,height:740},{width:1686,height:360},{width:1686,height:896,motion:"no-preference"}]))for(const en of (before?[false]:[false,true])){
console.log(before?'before':'after',viewport.width,viewport.height,en?'EN':'FR');
const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:viewport.motion??'reduce'});const errors=[],writes=[];
await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method()))writes.push(q.method());return u.hostname==='127.0.0.1'&&['GET','HEAD'].includes(q.method())&&!['media'].includes(q.resourceType())?r.continue():r.abort();});await context.routeWebSocket('**/*',s=>s.close());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(('http://127.0.0.1:'+port+'/')+(en?'en/':''),{waitUntil:'domcontentloaded'});
const section=page.locator('.estimator-home');await section.waitFor();const project=section.getByRole('group',{name:en?'One-off project':'Projet ponctuel',exact:true});await project.getByRole('button').nth(2).click();
const select=async(key,id)=>{const q=REPAIR_QUESTIONS[key],o=q.options.find(x=>x[0]===id);await section.getByRole('group',{name:q[en?'en':'fr']+(en?' (required)':' (requis)'),exact:true}).getByRole('button',{name:o[en?2:1],exact:true}).click();};
await select('issue','other');await select('intervention','targeted');await select('platform','custom');
// Complete urgency without altering the reported technical routing; quote CTA must be usable.
if(!before) await select('urgency','normal');
const start=await section.locator('.estimator-grid').evaluate(e=>e.getBoundingClientRect().top+scrollY);
for(const delta of [80,260,440,650,800,260]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),start+delta);await page.waitForTimeout(450);const g=await geometry(page);if(!before)assert.ok(Math.abs(g.gridTop+g.scrollY-start)<2,'Estimator grid moved during scrolling');rows.push({viewport,en,delta,...g});if(delta===650)await page.screenshot({path:new URL(`${before?'before':'after'}-${en?'EN':'FR'}-${viewport.width}x${viewport.height}${viewport.motion?'-normal-motion':''}-scroll650.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
if(!before&&viewport.width>960&&viewport.height>=600){assert.equal(g.position,'sticky');assert.equal(g.fits,'true');assert.ok(g.top>=g.headerBottom+15||Math.abs(g.bottom-g.gridBottom)<2,JSON.stringify(g));assert.ok(g.coreTop>=g.headerBottom&&g.coreBottom<=viewport.height-8,JSON.stringify(g));assert.ok(g.ctaTop>=g.headerBottom&&g.ctaBottom<=viewport.height-8,JSON.stringify(g));}
if(!before&&(viewport.width<=960||viewport.height<600))assert.equal(g.position,'static');}
await page.screenshot({path:new URL(`${before?'before':'after'}-${en?'EN':'FR'}-${viewport.width}x${viewport.height}-repair.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
if(!before){const open=section.getByRole('button',{name:en?'View full estimate and terms':'Voir le détail et les conditions',exact:true});await open.focus();const savedScroll=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');const dialog=section.getByRole('dialog');await dialog.waitFor({state:'visible'});assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth),'Horizontal overflow in terms');assert.ok((await dialog.innerText()).includes(en?'The definitive price is confirmed':'Le prix définitif est confirmé'));assert.ok((await dialog.innerText()).includes(en?'VAT':'TVA'));await page.screenshot({path:new URL(`after-${en?'EN':'FR'}-${viewport.width}x${viewport.height}-details.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
// Modal keyboard containment: the native dialog must be modal, start with focus inside, keep the page inert,
// and never let Tab/Shift+Tab land on a background element. Chromium may briefly hand focus to browser chrome
// (activeElement=body) at the cycle edge; the very next key press must then return focus into the dialog.
assert.ok(await dialog.evaluate(e=>e.open&&e.matches(':modal')),'Details must open as a native modal dialog');
assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)),'Focus must start inside the open dialog');
const focusState=()=>dialog.evaluate(e=>{const a=document.activeElement;return{inside:e.contains(a),chrome:a===null||a===document.body,tag:a?.tagName,text:(a?.textContent||'').trim().slice(0,60)};});
const focusables=await dialog.evaluate(e=>[...e.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(x=>!x.disabled&&x.tabIndex>=0).length);
assert.ok(focusables>=1,'Dialog must contain a focusable control');
for(const key of ['Tab','Shift+Tab']){let insideHits=0,chromeRun=0;for(let i=0;i<focusables*2+4;i++){await page.keyboard.press(key);const s=await focusState();assert.ok(s.inside||s.chrome,`Focus escaped the modal dialog to ${s.tag} "${s.text}" (${key} #${i+1})`);chromeRun=s.inside?0:chromeRun+1;assert.ok(chromeRun<=1,`Focus did not return into the dialog after ${key} #${i+1}`);if(s.inside)insideHits++;}assert.ok(insideHits>=focusables,`${key} did not cycle through the dialog controls`);}
for(const selector of [':scope > .btn-primary',':scope > .summary-details-button']){const moved=await section.locator('.unified-result').locator(selector).evaluate(b=>{b.focus();return document.activeElement===b;});assert.equal(moved,false,`Background control ${selector} accepted focus while the modal was open`);}
assert.ok(await section.locator('.unified-result > .btn-primary').evaluate(b=>{const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !hit||!b.contains(hit);}),'Background quote CTA is reachable by pointer while the modal is open');
await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-savedScroll)<2,'Opening details changed page position');assert.equal(await open.evaluate(e=>e===document.activeElement),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const compact=section.locator('.compact-estimate');
for(let index=1;index<await project.getByRole('button').count();index++){
  await project.getByRole('button').nth(index).click();
  assert.equal((await compact.locator('strong').first().textContent()).trim(),(await section.locator('.estimate-details-dialog .result-metrics strong').first().textContent()).trim());
  if(index===1){const pages=section.getByRole('group',{name:en?'Website pages':'Pages du site',exact:true});const previous=await compact.innerText();await pages.getByRole('button').nth(2).click();assert.notEqual(await compact.innerText(),previous);}
  const gridStart=await section.locator('.estimator-grid').evaluate(e=>e.getBoundingClientRect().top+scrollY);
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),gridStart+120);await page.waitForTimeout(200);
  const m=await geometry(page);if(viewport.width>960&&viewport.height>=600){assert.equal(m.position,'sticky');assert.ok(m.ctaTop>=m.headerBottom&&m.ctaBottom<=viewport.height-8);}
}
await project.getByRole('button').first().click();const content=section.getByRole('group',{name:en?'Social media and video':'Réseaux sociaux et vidéo',exact:true});
for(let i=1;i<await content.getByRole('button').count();i++){const previous=await compact.innerText();await content.getByRole('button').nth(i).click();assert.notEqual(await compact.innerText(),previous);assert.ok(await compact.locator('strong').count()>0);}
}
if(!before){
await project.getByRole('button').nth(2).click();const content=section.getByRole('group',{name:en?'Social media and video':'Réseaux sociaux et vidéo',exact:true});await content.getByRole('button').nth(1).click();
const setup=section.getByRole('checkbox',{name:/Audit de départ et mise en place|Initial audit and set-up/});if(!await setup.isChecked())await setup.locator('..').click();
const top=await section.locator('.estimator-grid').evaluate(e=>e.getBoundingClientRect().top+scrollY);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),top+120);await page.waitForTimeout(250);const combined=await geometry(page);
if(viewport.width>960&&viewport.height>=600){assert.equal(combined.position,'sticky','Combined summary must stay compact');assert.ok(combined.ctaTop>=combined.headerBottom&&combined.ctaBottom<=viewport.height-8);}
rows.push({viewport,en,combined:true,...combined});
}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await context.close();}
await writeFile(new URL(before?'before.json':'after.json',out),JSON.stringify(rows,null,2));console.log('PASS',rows.length,'real-page scroll measurements');
}finally{await browser?.close();await server.close();}
