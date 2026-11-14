import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from 'playwright';
const before=process.argv.includes('--before'), phase=before?'before':'after', port=process.argv.includes('--content-only')?4328:before?4326:4327;
const contentOnly=process.argv.includes('--content-only');
const out=new URL('../sticky-review.local/',import.meta.url);await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,plugins:[react(),{name:'sticky-review',enforce:'pre',transform(code,id){const path=id.replaceAll('\\','/');if(path.endsWith('/src/App.jsx'))return (before?execFileSync('git',['show','65ae6ed1af62a07f46e623471f281a9f2e31cf93:src/App.jsx'],{encoding:'utf8'}):code)+'\nexport {UnifiedEstimator,SiteHeader};';if(before&&path.endsWith('/src/App.css'))return execFileSync('git',['show','65ae6ed1af62a07f46e623471f281a9f2e31cf93:src/App.css'],{encoding:'utf8'});},configureServer(s){s.middlewares.use('/sticky-fixture',async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/sticky-fixture',`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';import {createRoot} from 'react-dom/client';import {UnifiedEstimator,SiteHeader} from '/src/App.jsx';import '/src/index.css';
const p=new URLSearchParams(location.search),en=p.get('lang')==='en',role=p.get('role');
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(SiteHeader,{pathname:en?'/en':'/',session:role==='guest'?null:{user:{id:'synthetic',email:'synthetic@example.invalid',user_metadata:{full_name:'Synthetic long account name'}}},isAdmin:role==='admin',onNavigate:()=>{},onLogout:()=>{}}),React.createElement('main',null,React.createElement('div',{style:{height:600}}),React.createElement(UnifiedEstimator,{isEnglish:en}),React.createElement('footer',{style:{height:1200}},'Unrelated footer'))));
</script></body></html>`));});}}],server:{host:'127.0.0.1',port,strictPort:true}});
let browser;const rows=[];
try{await server.listen();browser=await chromium.launch({headless:true});
for(const width of [1680,1440,1280,1180,390,320])for(const en of [false,true]){
console.log(phase,width,en?'EN':'FR');const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());await context.routeWebSocket('**/*',s=>s.close());
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const role of (contentOnly?['guest']:['guest','client','admin'])){
await page.goto(`http://127.0.0.1:${port}/sticky-fixture?lang=${en?'en':'fr'}&role=${role}`);const section=page.locator('.estimator-home');await section.waitFor();
await page.addStyleTag({content:'.reveal-on-scroll{opacity:1!important;transform:none!important}'});
const project=section.locator('[aria-labelledby="estimator-home'+(en?'-en':'')+'-project"]');
const content=section.locator('[aria-labelledby="estimator-home'+(en?'-en':'')+'-content"]');
const result=section.locator('.unified-result');
for(let category=contentOnly?99:1;category<await project.getByRole('button').count();category++){
await project.getByRole('button').nth(category).click();await page.waitForTimeout(80);
const text=await result.innerText();assert.ok(text.length>80);
const gridTop=await section.locator('.estimator-grid').evaluate(e=>e.getBoundingClientRect().top+scrollY);
for(const distance of [300,700,300]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),gridTop+distance);await page.waitForTimeout(80);
const geom=await result.evaluate(e=>{const r=e.getBoundingClientRect(),h=document.querySelector('.navbar').getBoundingClientRect(),g=e.parentElement.getBoundingClientRect();return{top:r.top,bottom:r.bottom,header:h.bottom,gridBottom:g.bottom,position:getComputedStyle(e).position,fits:e.dataset.stickyFits,overflow:getComputedStyle(e).overflowY};});
if(!before&&width>960&&geom.fits==='true'){assert.equal(geom.position,'sticky');assert.ok(geom.top>=geom.header+15 || Math.abs(geom.bottom-geom.gridBottom)<2,JSON.stringify(geom));assert.ok(geom.bottom<=geom.gridBottom+1);}
if(!before&&width<=960)assert.equal(geom.position,'static');assert.ok(!['auto','scroll'].includes(geom.overflow));}
if(role==='guest'){await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-category${category}.png`,out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});}
rows.push({width,en,role,category,position:await result.evaluate(e=>getComputedStyle(e).position)});
}
await project.getByRole('button').first().click();
for(let i=1;i<await content.getByRole('button').count();i++){
const previous=await result.innerText();await content.getByRole('button').nth(i).click();assert.notEqual(await result.innerText(),previous,'Content service live update');
const top=await section.locator('.estimator-grid').evaluate(e=>e.getBoundingClientRect().top+scrollY);
await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),top+300);await page.waitForTimeout(100);
const g=await result.evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,end:e.parentElement.getBoundingClientRect().bottom,header:document.querySelector('.navbar').getBoundingClientRect().bottom,position:getComputedStyle(e).position,fits:e.dataset.stickyFits};});
if(!before&&width>960&&g.fits==='true'){assert.equal(g.position,'sticky');assert.ok(g.top>=g.header+15||Math.abs(g.bottom-g.end)<2);}
if(!before&&width<=960)assert.equal(g.position,'static');
if(role==='guest')await page.screenshot({path:new URL(phase+'-'+(en?'EN':'FR')+'-'+width+'-content'+i+'.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
rows.push({width,en,role,content:i,...g});
}
await page.evaluate(()=>document.querySelector('footer').scrollIntoView());await page.waitForTimeout(80);assert.ok((await result.boundingBox()).y+(await result.boundingBox()).height<=await page.locator('footer').evaluate(e=>e.getBoundingClientRect().top)+1);
if(width<=1180){await page.evaluate(()=>scrollTo(0,800));await page.locator('.navbar-burger').click();await page.keyboard.press('Escape');}
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
assert.deepEqual(errors,[]);await context.close();}
await writeFile(new URL(phase+(contentOnly?'-content':'')+'-measurements.json',out),JSON.stringify(rows,null,2));console.log('PASS',rows.length,'category/state combinations');
}finally{await browser?.close();await server.close();}
