import assert from 'node:assert/strict';
import * as T from 'three';
import {mapData} from '../dist/map-data.js';
import {pointInRing,sample} from '../dist/geography.js';
import {moatSegments,moatRoadClear,planMoatLandscape,moatStops} from '../dist/moat-data.js';
import {addMoatLandscape} from '../dist/moat.js';
import {westGroundHeight} from '../dist/west-terrain.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
for(const line of moatSegments)for(let d=0;d<line.length;d+=2)assert.equal(pointInRing(...sample(line,d/line.length),mapData.wall),false,'river must remain outside the mapped wall');
const plan=planMoatLandscape();
for(const side of ['north','south','east','west'])assert.ok(plan.trees.filter(t=>t.reach===side).length>35,side+' needs a real planting strip');
for(const p of plan.trees){assert.ok(moatRoadClear(p.x,p.z,3.1),'tree trunk/crown clearance across existing roads');assert.equal(pointInRing(p.x,p.z,mapData.wall),false);}
assert.equal(moatStops.length,6,'both gates on the east/west sides must be accessible');
const scene=new T.Scene(),landscape=addMoatLandscape(scene);scene.updateMatrixWorld(true);
let triangles=0,draws=0;
landscape.root.traverse(o=>{
  if(!o.isMesh)return;draws++;const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);
  for(const name of ['position','normal'])assert.ok(Array.from(g.attributes[name].array).every(Number.isFinite),'finite '+name);
  if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));
});
assert.ok(draws<275&&triangles<2200000,`${draws} draws, ${triangles} triangles exceeds ring landscape budget`);
for(const b of plan.bridges)for(const offset of [-.25,0,.25]){
  const along=b.length/2+1,side=offset*b.width;
  const x=b.x-b.dx*along-b.dz*side,z=b.z-b.dz*along+b.dx*side;
  const ray=new T.Raycaster(new T.Vector3(x,westGroundHeight(x,z)+1.7,z),new T.Vector3(b.dx,0,b.dz),0,along*2);
  assert.equal(ray.intersectObject(landscape.root,true).length,0,'bridge route blocked: '+b.road);
}
const water=landscape.root.getObjectByName('连续护城河水面');assert.ok(water);assert.equal(water.material.transparent,false);
const p=water.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.equal(pointInRing(p.getX(i),p.getZ(i),mapData.wall),false,'water edge clips into wall');
const lamps=landscape.root.getObjectByName('沿河低位灯');landscape.setNight(true);assert.ok(lamps.material.emissiveIntensity>0);landscape.setNight(false);assert.equal(lamps.material.emissiveIntensity,0);
const camera=new T.PerspectiveCamera();camera.position.y=200;landscape.update(camera);assert.equal(lamps.parent.visible,false);camera.position.y=140;landscape.update(camera);assert.equal(lamps.parent.visible,true);
landscape.dispose();landscape.dispose();assert.equal(scene.children.length,0);
console.log(JSON.stringify({trees:plan.trees.length,shrubs:plan.shrubs.length,benches:plan.furniture.length,bridges:plan.bridges.filter(b=>!b.culvert).length,culverts:plan.bridges.filter(b=>b.culvert).length,draws,triangles,checks:'river/wall separation, six gate stops, road clearance, open bridges, day/night, LOD and disposal'}));
