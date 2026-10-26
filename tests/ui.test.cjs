// Run from the repository root. See PATCH_REPORT.md for dependencies.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{fs.mkdirSync('tests/screenshots',{recursive:true});const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync('index.html'));});await new Promise(r=>server.listen(8767,'127.0.0.1',r));
 const browser=await chromium.launchPersistentContext(path.resolve('.ui-profile'),{channel:'chrome',headless:true,viewport:{width:1280,height:800},args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/three.min.js',r=>r.fulfill({path:process.env.THREE_JS||require.resolve('three/build/three.min.js'),contentType:'application/javascript'}));await page.route('**/fonts.googleapis.com/**',r=>r.abort());await page.route('**/fonts.gstatic.com/**',r=>r.abort());
 await page.goto('http://127.0.0.1:8767');await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hide'));
 await page.evaluate(()=>{window.starts=0;const start=startRace;startRace=()=>{window.starts++;start();};});await page.locator('#goBtn').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.starts),1);console.log('PASS focused Start button Enter invokes once');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>STATE),'paused');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>STATE),'race');
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('ShiftRight');await page.keyboard.up('ShiftLeft');assert.equal(await page.evaluate(()=>KEYS.drift),1);await page.keyboard.up('ShiftRight');assert.equal(await page.evaluate(()=>KEYS.drift),0);
 await page.keyboard.down('ArrowUp');await page.evaluate(()=>dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>STATE),'paused');assert.equal(await page.evaluate(()=>KEYS.up),0);await page.keyboard.up('ArrowUp');console.log('PASS pause/resume, overlapping Shift keys, focus loss clears input');
 const ui=await page.evaluate(()=>{
  const rows=[];for(let track=0;track<3;track++)for(const bots of [1,3,5,7]){STATE='paused';SEL.track=track;SEL.bots=bots;startRace();STATE='paused';const raf=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;try{frame(performance.now());}finally{window.requestAnimationFrame=raf;}const ok=RACE.rs.every((r,i)=>i===0?TAGS[i]===null:TAGS[i].position.distanceTo(new THREE.Vector3(r.x,r.y+2.7,r.z))<1e-6);if(!ok)throw Error('tag mismatch');rows.push({track,bots,ok});}
  const p=RACE.rs[0];p.finished=true;p.finishT=42;RACE.t=50;updateHUD(.2);if(p.isBot||!p.autoPilot||document.getElementById('hTime').textContent!==fmtT(42))throw Error('player identity/time');
  p.finished=false;p.retired=true;RACE.retireLeft=0;updateHUD(.2);if(!document.getElementById('hRetire').classList.contains('hide'))throw Error('retirement countdown');
  showResult();if(STATE!=='result'||document.getElementById('rRank').textContent!=='RETIRE')throw Error('result');
  toMenu();if(MESHES.length||TAGS.length||GFX.world||RACE)throw Error('menu cleanup');
  const memory=[];for(let i=0;i<32;i++){setPreview(i%6,i%8);GFX.renderer.render(PV.scene,PV.cam);if(i>=24)memory.push({...GFX.renderer.info.memory});}
  return {rows,memory};
 });console.log('PASS tags across 12 map/bot setups; finish identity/time; retirement HUD; result and menu cleanup');console.log('preview memory',JSON.stringify(ui.memory));
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync('tests/ui-results.json',JSON.stringify({errors,...ui},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
