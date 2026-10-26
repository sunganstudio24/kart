const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];new vm.Script(script);
const source=script.slice(0,script.indexOf('//{TRACKS'));
let seed=42;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const a=vm.runInNewContext(source+';({TRACKS,KARTS,CHARS,DIFFS,PHYS,buildTrack,makeRace,makeRacer,stepRace,stepRacer,updateProgress,respawn,collideRacers,botThink,speedOf})',{Math:math});
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
for(let track=0;track<3;track++)for(let laps=1;laps<=3;laps++)test(`ordered checkpoints / reverse / records track=${track} laps=${laps}`,()=>{
 const T=a.buildTrack(a.TRACKS[track]),r=a.makeRacer(T,0,0,0,0,false,0);let t=0;
 function move(p){r.idx=((Math.round(p*T.N)%T.N)+T.N)%T.N;a.updateProgress(r,T,t++,laps);}
 move(.98);for(let i=0;i<10;i++){move(.01);move(.99);}assert.equal(r.lap,0);
 for(let i=98;i>=48;i--)move(i/100);for(let i=49;i<=101;i++)move(i/100);assert.equal(r.lap,0);
 for(let lap=0;lap<laps;lap++){for(let i=2;i<=101;i++)move(i/100);assert.equal(r.lap,lap+1);const records=[...r.lapTimes];move(.99);move(.01);assert.deepEqual([...r.lapTimes],records);}
 assert(r.finished);assert.equal(r.lapTimes.length,laps);assert(r.lapTimes.every(v=>v>0));const done=JSON.stringify(r);move(.5);r.idx= Math.round(.01*T.N);assert.equal(r.lap,laps);
});
test('retirement locks race time, ranks and results for all 2.4 seconds',()=>{
 const R=a.makeRace(0,1,{kart:0,char:0},3,2);R.started=true;R.t=20;R.firstFinishT=10;R.rs[1].finished=true;R.rs[1].finishT=10;R.rs[1].prog=1.999;
 a.stepRace(R,1/120,{up:1});assert(R.over&&R.rs[0].retired);const snapshot=JSON.stringify(R);
 for(let i=0;i<300;i++)a.stepRace(R,1/120,{up:1,boost:1});assert.equal(JSON.stringify(R),snapshot);
 const p=R.rs[0];p.idx=0;a.updateProgress(p,R.T,999,1);assert(!p.finished);assert.equal(p.lapTimes.length,0);
});
test('finished and retired racers cannot collide with active racers',()=>{
 const R=a.makeRace(0,1,{kart:0,char:0},1,2),[p,b]=R.rs;b.x=p.x+.1;b.z=p.z;b.finished=true;const x=p.x;a.collideRacers(R.rs);assert.equal(p.x,x);b.finished=false;b.retired=true;a.collideRacers(R.rs);assert.equal(p.x,x);
});
test('respawn clears transient rewards but preserves earned inventory and checkpoints',()=>{
 const R=a.makeRace(0,2,{kart:0,char:0},1,2),r=R.rs[0];Object.assign(r,{instWin:.4,instCharges:2,startBoostT:1,boostT:3,instT:.3,tapGrip:.2,boosts:2,gauge:.4,pathP:.6,nextGate:.75});a.respawn(r,R.T);
 for(const key of ['instWin','instCharges','startBoostT','boostT','instT','tapGrip'])assert.equal(r[key],0,key);
 assert.equal(r.boosts,2);assert.equal(r.gauge,.4);assert.equal(r.pathP,.6);assert.equal(r.nextGate,.75);
});
test('slow moving bot with no forward progress respawns',()=>{
 const R=a.makeRace(0,2,{kart:0,char:0},1,2),r=R.rs[1];r.vx=3;r.bot.progressT=2.49;r.bot.lastProgress=r.prog;a.botThink(r,.02,{T:R.T,started:true});assert.equal(a.speedOf(r),0);
});
test('exactly overlapping racers separate without NaN',()=>{const R=a.makeRace(0,1,{kart:0,char:0},1,2),[p,b]=R.rs;b.x=p.x;b.z=p.z;a.collideRacers(R.rs);assert(Math.abs(b.x-p.x)>2);assert(Number.isFinite(p.vx));});
console.log(`${passed} regression tests passed`);
if(process.argv.includes('--simulate')){const rows=[];
 for(let track=0;track<3;track++)for(let diff=0;diff<5;diff++)for(const bots of [1,3,5,7])for(const laps of [1,2,3]){
  const R=a.makeRace(track,laps,{kart:0,char:0},bots,diff);R.rs[0].autoPilot=true;R.rs[0].diff=diff;R.started=true;
  let ticks=0;while(!R.over&&ticks++<120*300)a.stepRace(R,1/120,{});
  assert(R.over,`timeout ${track}/${diff}/${bots}/${laps}`);assert(R.rs.every(r=>r.finished!==r.retired));
  assert(R.rs.every(r=>!r.finished||r.lapTimes.length===laps));assert.equal(new Set(R.rs.map(r=>r.rank)).size,bots+1);
  rows.push({track,diff,bots,laps,first:+R.firstFinishT.toFixed(3),finished:R.rs.filter(r=>r.finished).length});
 }
 fs.writeFileSync(path.join(__dirname,'simulation-results.json'),JSON.stringify(rows,null,2));console.log('PASS',rows.length,'race configurations at 120Hz');
}
