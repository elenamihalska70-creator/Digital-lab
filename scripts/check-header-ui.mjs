import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
const phase = process.argv.includes('--before') ? 'before' : 'after';
const artifacts = new URL('../header-review.local/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const server = await createServer({ configFile:false, server: { host: '127.0.0.1', port: 4325, strictPort: true }, plugins: [react(), {
  name: 'header-review-only', enforce: 'pre',
  transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/src/App.jsx')) return code + '\nexport { SiteHeader, scrollToElementWithHeaderOffset };'; },
  configureServer(s) { s.middlewares.use('/header-fixture', async (_req, res) => {
    const html = await s.transformIndexHtml('/header-fixture', `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SiteHeader, scrollToElementWithHeaderOffset } from '/src/App.jsx';
import '/src/index.css';
const p = new URLSearchParams(location.search), role = p.get('role'), en = p.get('lang') === 'en';
window.navCalls = []; window.logoutCalls = 0;
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment, null,
React.createElement(SiteHeader, {pathname: en ? '/en' : '/', session: role === 'guest' ? null : {user:{id:'synthetic-header-user',email:'synthetic@example.invalid',user_metadata:{full_name:'Alexandralongname Synthetic'}}}, isAdmin:role === 'admin', clientUnreadMessageCount:12, adminUnreadMessageCount:12,
onNavigate: target => {window.navCalls.push(target); if(target.includes('#')) scrollToElementWithHeaderOffset('#services');}, onLogout:()=>window.logoutCalls++}),
React.createElement('main', {style:{paddingTop:700,minHeight:3000}},React.createElement('section',{id:'services',tabIndex:-1},'Synthetic anchor'),React.createElement('input',{'aria-label':'Synthetic focus',style:{display:'block',marginTop:400}}))));
</script></body></html>`);
    res.setHeader('Content-Type', 'text/html'); res.end(html);
  }); }
}] });
let browser; const rows = [];
const pause = p => p.waitForTimeout(380);
async function measure(page) { return page.locator('.navbar').evaluate(el => ({height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,scrolled:el.classList.contains('is-scrolled')})); }
async function geometry(page, width) {
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Horizontal overflow');
  const boxes = await page.locator('.navbar').evaluate(h => [...h.querySelectorAll('.navbar-brand,.navbar-menu > a,.navbar-cta,.navbar-auth-state > span,.navbar-auth-state button,.lang-switcher')].filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden').map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent.trim(),x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  if(width>1180) for(const b of boxes) assert.ok(b.x>=0 && b.right<=width,`Clipped control: ${b.text}`);
  if(width>1180) for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {const a=boxes[i],b=boxes[j];assert.ok(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1),`Overlap: ${a.text}/${b.text}`);}
}
try {
  await server.listen(); browser = await chromium.launch({headless:true});
  for(const width of (process.env.HEADER_WIDTH ? [Number(process.env.HEADER_WIDTH)] : [1680,1440,1280,1180,390,320])) for(const en of [false,true]) {
    console.log(phase, width, en?'EN':'FR');
    const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors=[],writes=[];
    await context.route('**/*',r=>{const q=r.request();if(!['GET','HEAD'].includes(q.method()))writes.push(q.method());return new URL(q.url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(q.method())?r.continue():r.abort();});
    await context.routeWebSocket('**/*',s=>s.close());
    const page=await context.newPage(); page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
    await page.goto('http://127.0.0.1:4325/'+(en?'en/':''),{waitUntil:'domcontentloaded'});
    await page.locator('.navbar-brand').waitFor(); await pause(page);
    const top=await measure(page);
    assert.equal(top.height,width>1180?150:68,'Initial header changed');
    await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-top.png`,artifacts).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    await page.evaluate(()=>window.scrollTo({top:800,behavior:'instant'}));await pause(page);
    const scrolled=await measure(page); await geometry(page,width);
    assert.equal(await page.locator('.navbar-menu > a').count(),9);
    if(width>1180 && phase==='after') assert.ok(scrolled.height<=120,'Desktop not compact: '+scrolled.height);
    await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-scrolled.png`,artifacts).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    if(width<=1180) {await page.locator('.navbar-burger').click();await pause(page);await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-menu.png`,artifacts).pathname.replace(/^\/([A-Za-z]:)/,'$1')});await page.keyboard.press('Escape');await pause(page);assert.equal(await page.locator('.navbar-burger').getAttribute('aria-expanded'),'false');}
    if(phase==='after') {
      if(width<=1180) await page.locator('.navbar-burger').click();
      await page.locator('.navbar-menu > a[href="/#services"]').click();await page.waitForTimeout(1100);
      const target=await page.locator('#services').boundingBox();const h=await measure(page);assert.ok(target.y>=h.bottom+8,'Anchor hidden');
      const field=page.locator('.estimator-home button').first();await field.focus();await page.waitForTimeout(100);
      await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-estimator.png`,artifacts).pathname.replace(/^\/([A-Za-z]:)/,'$1')});assert.ok((await field.boundingBox()).y>=(await measure(page)).bottom+8,'Estimator focus hidden');
      if(width<=1180) await page.locator('.navbar-burger').click();
      await page.locator('.navbar-client-button').click();await page.waitForURL('**/login');await page.locator('.auth-modal-close').click();await page.waitForURL(url=>url.pathname!=='/login');await pause(page);
      if(width<=1180) await page.locator('.navbar-burger').click();
      await page.locator('.navbar-auth-button').click();await page.waitForURL('**/login');await page.locator('.auth-modal-close').click();
      assert.equal(await page.locator('.navbar-burger').getAttribute('aria-expanded'),'false');
      await page.waitForURL(url=>url.pathname!=='/login');await pause(page);
      for(const y of [0,23,25,26,23,0]) {await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(page);assert.equal((await measure(page)).scrolled,y>24, `Scroll state at ${width}px, requested ${y}, actual ${await page.evaluate(()=>scrollY)}`);}
    }
    rows.push({width,language:en?'EN':'FR',role:'integrated-guest',top:top.height,scrolled:scrolled.height});
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    for(const role of ['client','admin']) {
      await page.goto(`http://127.0.0.1:4325/header-fixture?role=${role}&lang=${en?'en':'fr'}`);await page.locator('.navbar-brand').waitFor();await pause(page);
      const initial=await measure(page);await page.evaluate(()=>scrollTo({top:800,behavior:'instant'}));await pause(page);const compact=await measure(page);await geometry(page,width);
      await page.screenshot({path:new URL(`${phase}-${en?'EN':'FR'}-${width}-${role}.png`,artifacts).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
      if(phase==='after') {
        if(width<=1180) await page.locator('.navbar-burger').click();
        await page.locator('.navbar-client-button').click();assert.ok((await page.evaluate(()=>window.navCalls)).includes('/dashboard'));
        if(width<=1180) await page.locator('.navbar-burger').click();
        if(role==='admin') {await page.locator('.navbar-admin-button').click();assert.ok((await page.evaluate(()=>window.navCalls)).includes('/admin'));if(width<=1180)await page.locator('.navbar-burger').click();}
        await page.locator('.navbar-logout-button').click();assert.equal(await page.evaluate(()=>window.logoutCalls),1);
        const input=page.getByLabel('Synthetic focus');await input.focus();await page.waitForTimeout(100);assert.ok((await input.boundingBox()).y>=(await measure(page)).bottom+8);
      }
      rows.push({width,language:en?'EN':'FR',role:'synthetic-'+role,top:initial.height,scrolled:compact.height});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    await context.close();
  }
  if(phase==='after') {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
    await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4325/header-fixture?role=admin&lang=en');await page.locator('.navbar-brand').waitFor();await pause(page);
    const documentTop=await page.locator('#services').evaluate(el=>el.getBoundingClientRect().top+scrollY);
    for(const width of [1680,1440,1280,1180,390,320]) {
      await page.setViewportSize({width,height:1000});await pause(page);
      for(const y of [0,23,25,26,23,0]) {await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await pause(page);assert.equal((await measure(page)).scrolled,y>24,'Normal-motion scroll flicker');}
      if(width>1180) assert.ok(Math.abs(await page.locator('#services').evaluate(el=>el.getBoundingClientRect().top+scrollY)-documentTop)<2,'Header changed document position');
      await page.evaluate(()=>scrollTo({top:800,behavior:'instant'}));await pause(page);await geometry(page,width);
      if(width<=1180) {await page.locator('.navbar-burger').focus();await page.keyboard.press('Tab');assert.ok(!(await page.evaluate(()=>document.activeElement.closest('.navbar-menu'))),'Closed menu received keyboard focus');await page.locator('.navbar-burger').press('Enter');await pause(page);await page.keyboard.press('Tab');assert.equal(await page.locator('.navbar-menu > a').first().evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');}
      else {await page.locator('.navbar-brand').focus();for(const control of await page.locator('.navbar-menu > a,.navbar-cta,.navbar-auth-state button,.lang-switcher a').all()) {await page.keyboard.press('Tab');assert.equal(await control.evaluate(el=>el===document.activeElement),true,'Header keyboard order');}}
    }
    await page.setViewportSize({width:1440,height:1000});await pause(page);await page.locator('.navbar-menu > a[href="/#services"]').click();await page.waitForTimeout(1300);assert.ok((await page.locator('#services').boundingBox()).y>=(await measure(page)).bottom+8,'Smooth anchor hidden');
    await context.close();
  }
  await writeFile(new URL(`${phase}-measurements.json`,artifacts),JSON.stringify(rows,null,2)); console.table(rows);
} finally {await browser?.close();await server.close();}
