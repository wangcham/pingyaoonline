import assert from 'node:assert/strict';
import * as T from 'three';
import {createWestBlockLayout,westBlockWorld} from '../dist/west-block-layout.js';
import {addWestBlocks,addSchoolInterior} from '../dist/west-blocks.js';
import {mapData} from '../dist/map-data.js';
import {pointInRing,segments,projectOnSegment} from '../dist/geography.js';
import {westBlockZones,westBlockAlleys,schoolImageryArea,schoolImageryGround} from '../dist/west-block-data.js';
import {planWestFrontages} from '../dist/west-corridor.js';
import {planWestGreenery} from '../dist/west-greenery.js';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){}})})};
const layout=createWestBlockLayout();
assert.ok(layout.plots.length<300,'do not restore blanket infill down to the roundabout');
for(const zone of westBlockZones)assert.ok(layout.plots.some(p=>p.zone===zone.id),zone.id+' remains empty');
const mainRoads=[...mapData.roads.map(([,w,,p])=>({w,p})),...mapData.shunchengWays.map(p=>({w:16,p}))].flatMap(({w,p})=>segments(p).map(line=>({line,w})));
for(const p of layout.plots){
  for(const dx of [-p.w/2,0,p.w/2])for(const dz of [-p.d/2,0,p.d/2]){
    const [x,z]=westBlockWorld(p.x+dx,p.z+dz);
    assert.ok(!layout.protectedRings.some(r=>pointInRing(x,z,r)),'building in reserved parcel');
    assert.ok(!schoolImageryGround.some(({ring})=>pointInRing(x,z,ring)),'building on reviewed open ground');
    if(p.kind!=='imagery')assert.ok(!pointInRing(x,z,schoolImageryArea),'generated building inside satellite study area');
    assert.ok(!mainRoads.some(({line,w})=>projectOnSegment([x,z],line).distance<w/2),'building in road');
  }
}
const sorted=[...layout.plots].sort((a,b)=>a.x-b.x);
for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].x-sorted[i].x<30;j++){
  const a=sorted[i],b=sorted[j];
  assert.ok(Math.abs(a.x-b.x)>(a.w+b.w)/2+.5||Math.abs(a.z-b.z)>(a.d+b.d)/2+.5,'overlapping plots');
}
const alleyEdges=westBlockAlleys.flatMap(segments);
for(const p of planWestFrontages().units)assert.ok(!alleyEdges.some(e=>projectOnSegment([p.x,p.z],e).distance<3.1),'shop blocks alley');
for(const p of planWestGreenery().trees)assert.ok(!alleyEdges.some(e=>projectOnSegment([p.x,p.z],e).distance<3.7),'tree blocks alley');
const scene=new T.Scene(),group=addWestBlocks(scene,layout),school=addSchoolInterior(scene);
assert.equal(group.userData.style,'modern-mixed-height');
assert.equal(group.userData.pitchedRoofs,0);
group.traverse(mesh=>{if(mesh.geometry)assert.notEqual(mesh.geometry.type,'ExtrudeGeometry','outside infill must not reuse ancient pitched roofs');});
let triangles=0,draws=0;
for(const root of [group,school])root.traverse(mesh=>{
  if(!mesh.geometry)return;
  draws++;const g=mesh.geometry;
  assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));
  if(mesh.isInstancedMesh)assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
  triangles+=(g.index?.count??g.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
});
assert.ok(draws<=18&&triangles<300000,`keep infill inexpensive (${draws} draws, ${triangles} triangles)`);
for(const mesh of school.children){
  if(!mesh.geometry)continue;
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(pointInRing(p.getX(i),p.getZ(i),mapData.campus),'sports field outside campus');
}
const {heightRecords,...counts}=group.userData;
assert.ok(heightRecords.some(r=>r.source==='GBA.Height-2019'),'height dataset must affect rendered buildings');
const traced=heightRecords.filter(r=>r.footprintSource==='Esri World Imagery trace');
assert.ok(traced.length>=40&&new Set(traced.map(r=>r.roofColor)).size>=20,'preserve varied roof colors');
assert.ok(traced.some(r=>r.name==='光大时尚'&&r.buildingType==='commercial'&&r.roofColor==='#5a5f4f'),'preserve the verified commercial building and its roof color');
assert.ok(traced.some(r=>r.source==='GBA.Height-2019'&&r.height===r.rasterHeight),'use local raster heights on traced roofs');
assert.equal(group.children.filter(o=>o.name.includes('停车')).length,3);
const eastParking=group.getObjectByName('光大时尚东停车场');
const westParking=group.getObjectByName('光大时尚西停车场');
assert.equal(eastParking.material.color.getHexString(),'939081');
assert.equal(westParking.material.color.getHexString(),'ac9f89');
console.log(JSON.stringify({...counts,draws,triangles,heightRange:[Math.min(...heightRecords.map(r=>r.height)),Math.max(...heightRecords.map(r=>r.height))],rasterAdjusted:heightRecords.filter(r=>r.source==='GBA.Height-2019').length,zones:Object.fromEntries(westBlockZones.map(z=>[z.id,layout.plots.filter(p=>p.zone===z.id).length]))}));
