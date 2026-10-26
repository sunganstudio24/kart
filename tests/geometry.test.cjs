const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const THREE=require(process.env.THREE_JS||'three');
function api(html){const src=html.split('<script>')[1].split('</script>')[0];return vm.runInNewContext(src.slice(0,src.indexOf('/* ===================== APP:'))+';GFX.camera=new THREE.PerspectiveCamera();({makeKartMesh,updateKartMesh,makeRacer,buildTrack,TRACKS,KARTS,CHARS,PHYS,DIFFS,stepRacer})',{THREE,Math,document:{createElement:()=>({})},Image:class {}});}
const before=api(require('child_process').execFileSync('git',['show','1e357552b36bb500b5f67b7f5e9d3c64a3421b9f:index.html'],{encoding:'utf8'})),after=api(fs.readFileSync('index.html','utf8'));
// Kart body/wheel geometry is preserved. Character artwork is intentionally replaced.
function stats(mesh){mesh.updateMatrixWorld(true);const groups={};mesh.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(p===mesh.userData.C)return;const m=o.material,key=[m.type,m.color.getHex(),m.shininess,m.opacity,m.transparent,m.blending].join(':');const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;const p=g.attributes.position;const data=groups[key]||(groups[key]={n:0,sum:[0,0,0],sq:[0,0,0],bounds:[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity]});for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).toArray();data.n++;for(let j=0;j<3;j++){data.sum[j]+=v[j];data.sq[j]+=v[j]*v[j];data.bounds[j]=Math.min(data.bounds[j],v[j]);data.bounds[j+3]=Math.max(data.bounds[j+3],v[j]);}}});return groups;}
const T=before.buildTrack(before.TRACKS[0]);
for(let kart=0;kart<6;kart++)for(let char=0;char<8;char++){
 const b=before.makeKartMesh(kart,char),a=after.makeKartMesh(kart,char);
 for(const animated of [false,true]){if(animated){const r=before.makeRacer(T,0,kart,char,0,false,0);Object.assign(r,{vx:20,vz:5,drifting:true,dDir:1,boostT:2});r.inp.right=1;before.updateKartMesh(b,r,.1,2);after.updateKartMesh(a,r,.1,2);}
  const x=stats(b),y=stats(a);assert.deepEqual(Object.keys(x).sort(),Object.keys(y).sort());for(const key in x){assert.equal(x[key].n,y[key].n);for(const name of ['sum','sq','bounds'])for(let i=0;i<x[key][name].length;i++)assert(Math.abs(x[key][name][i]-y[key][name][i])<Math.max(.001,Math.abs(x[key][name][i])*1e-6),`${kart}/${char}/${name}`);}
 }
}
console.log('PASS 48 kart/character combinations, static and animated KART geometry/material preservation (driver excluded)');
assert.equal(JSON.stringify(before.KARTS),JSON.stringify(after.KARTS));assert.equal(JSON.stringify(before.DIFFS),JSON.stringify(after.DIFFS));assert.equal(JSON.stringify(before.PHYS),JSON.stringify(after.PHYS));
for(let kart=0;kart<6;kart++){
 const b=before.makeRacer(T,0,kart,0,0,false,0),a=after.makeRacer(T,0,kart,0,0,false,0);
 for(let step=0;step<2400;step++){const inp={up:step%400<380?1:0,down:step%550>520?1:0,right:step%180>90?1:0,left:0,drift:step%180===100?1:0,boost:step%250===0?1:0};Object.assign(b.inp,inp);Object.assign(a.inp,inp);before.stepRacer(b,1/120,{T,started:true});after.stepRacer(a,1/120,{T,started:true});for(const k of ['x','z','h','vx','vz','gauge','boostT','instT'])assert.equal(a[k],b[k],k);}
}
console.log('PASS unchanged normal driving physics across all six karts (14,400 steps)');
