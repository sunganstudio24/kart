// Run from the repository root. See PATCH_REPORT.md for dependencies.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{fs.mkdirSync('tests/screenshots',{recursive:true});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url.startsWith('/before')?require('child_process').execFileSync('git',['show','1e357552b36bb500b5f67b7f5e9d3c64a3421b9f:index.html'],{encoding:'utf8'}):fs.readFileSync('index.html'));});await new Promise(r=>server.listen(8766,'127.0.0.1',r));
 const browser=await chromium.launchPersistentContext(path.resolve('.qa-profile'),{channel:'chrome',headless:true,viewport:{width:1280,height:800},args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await page.addInitScript(()=>{let seed=42;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);localStorage.clear();});
 await page.route('**/three.min.js',route=>route.fulfill({path:process.env.THREE_JS||require.resolve('three/build/three.min.js'),contentType:'application/javascript'}));
 await page.route('**/fonts.googleapis.com/**',r=>r.abort());await page.route('**/fonts.gstatic.com/**',r=>r.abort());
 const results=[];
 for(const version of ['before','after']){
  await page.goto('http://127.0.0.1:8766/'+version);await page.waitForFunction(()=>document.getElementById('loading').classList.contains('hide'),{},{timeout:15000});
  console.log('booted',version);await page.screenshot({path:'tests/screenshots/'+version+'-menu.png'});
  await page.evaluate(async()=>{window.measureRAF=requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>0;await new Promise(measureRAF);});
  for(const bots of [1,3,5,7]){
   const result=await page.evaluate(async bots=>{let seed=42;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);SEL.bots=bots;SEL.track=0;STATE='menu';startRace();STATE='paused';frame(performance.now());
    const r=GFX.renderer;for(let i=0;i<5;i++)r.render(GFX.scene,GFX.camera);
    const times=[],begin=performance.now();for(let i=0;i<30;i++){const t=performance.now();r.render(GFX.scene,GFX.camera);r.getContext().finish();times.push(performance.now()-t);await new Promise(measureRAF);}const fps=30000/(performance.now()-begin);
    let meshes=0;MESHES[0].traverse(o=>{if(o.isMesh)meshes++;});
    const gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {bots,meshes,calls:r.info.render.calls,triangles:r.info.render.triangles,memory:{...r.info.memory},renderMs:times.reduce((a,b)=>a+b)/times.length,fps,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};},bots);
   results.push({version,...result});console.log(JSON.stringify(results.at(-1)));
  }
  if(version==='after'){
   console.log('restarts',await page.evaluate(()=>{const rows=[];for(let i=0;i<8;i++){STATE='paused';startRace();STATE='paused';frame(performance.now());rows.push({...GFX.renderer.info.memory});}updateHUD(.2);return rows;}));
   await page.evaluate(()=>{RACE.rs.forEach((r,i)=>{if(TAGS[i])TAGS[i].position.set(r.x,r.y+2.7,r.z);});});await page.screenshot({path:'tests/screenshots/after-race.png'});
   console.log('tagcheck',await page.evaluate(()=>RACE.rs.every((r,i)=>i===0?TAGS[i]===null:Math.abs(TAGS[i].position.x-r.x)<1e-9)));
  }
 }
 fs.writeFileSync('tests/render-results.json',JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
