import assert from 'node:assert/strict';
import * as T from 'three';
import {addPingyaoSchool} from '../dist/pingyao-school.js';
import {schoolBuildings,schoolToWorld,worldToSchool,schoolBoundary,schoolLocalBoundary,schoolStops,isPingyaoSchoolParcel,schoolLandmarkRecord,schoolEntrance} from '../dist/pingyao-school-data.js';
import {pointInRing} from '../dist/geography.js';
import {localToGeographic,geographicToLocal} from '../dist/landmarks/coordinates.js';
import {collectBuildingRecords} from '../dist/building-heights.js';
import {createLandmarkManager} from '../dist/landmarks/LandmarkManager.js';
const noop=()=>{},ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
// Ensure no accidental placement at the western No. 2 school or GCJ/WGS mix-up.
assert.equal(isPingyaoSchoolParcel(-1858,160),false);
assert.equal(isPingyaoSchoolParcel(...schoolToWorld(155,250)),true);
for(const [u,v] of [[0,0],[150,250],[190,560]]){
 const p=schoolToWorld(u,v),q=worldToSchool(...p),r=geographicToLocal(localToGeographic(p));
 assert.ok(Math.hypot(q[0]-u,q[1]-v)<1e-8);assert.ok(Math.hypot(r[0]-p[0],r[1]-p[1])<1e-7);
}
for(const b of schoolBuildings){
 for(const du of [-b.w/2,b.w/2])for(const dv of [-b.d/2,b.d/2]){
  const c=Math.cos(b.angle),s=Math.sin(b.angle);assert.ok(pointInRing(b.u+du*c+dv*s,b.v-du*s+dv*c,schoolLocalBoundary),`${b.id} crosses actual campus boundary`);
 }
 const [x,z]=geographicToLocal(b.coordinate);assert.ok(isPingyaoSchoolParcel(x,z));
}
for(const stop of schoolStops)assert.ok(pointInRing(stop.target[0],stop.target[2],schoolBoundary));
// The name wall must face the outside approach, south of the actual gate line.
assert.ok(schoolEntrance.wall[1]>schoolEntrance.gate[1]+3);
assert.ok(worldToSchool(schoolStops[0].eye[0],schoolStops[0].eye[2])[1]>schoolEntrance.wall[1]);
const southRows=schoolBuildings.filter(b=>b.id.startsWith('south-'));
assert.ok(southRows.every(b=>b.u+b.w/2<150),'southern rows must stay west of the open entry forecourt');
assert.ok(Math.min(...southRows.map(b=>b.v-b.d/2))>schoolEntrance.gate[1]+7);
const scene=new T.Scene(),campus=addPingyaoSchool(scene);scene.updateMatrixWorld(true);
const records=collectBuildingRecords(scene);assert.equal(records.length,schoolBuildings.length);
for(const r of records){for(const k of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource'])assert.ok(k in r);assert.ok(r.estimated&&r.height>3&&r.height<25);}
let draws=0,triangles=0,instances=0;const matrix=new T.Matrix4();
campus.root.traverse(o=>{
 if(!o.isMesh)return;draws++;const g=o.geometry,p=g.attributes.position;triangles+=(g.index?g.index.count:p.count)/3*(o.count??1);
 for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),'non-finite geometry');
 if(o.userData.schoolSurface==='road'){
  // Interpolate both edges across long segments; endpoints alone miss roads
  // running through the middle of a footprint.
  for(let i=0;i<p.count-2;i+=2)for(let k=0;k<=40;k++)for(const side of [0,1]){
   const t=k/40,u=p.getX(i+side)*(1-t)+p.getX(i+2+side)*t,v=p.getZ(i+side)*(1-t)+p.getZ(i+2+side)*t;
   for(const b of schoolBuildings){const du=u-b.u,dv=v-b.v,c=Math.cos(b.angle),s=Math.sin(b.angle);
    assert.ok(!(Math.abs(du*c-dv*s)<b.w/2-.1&&Math.abs(du*s+dv*c)<b.d/2-.1),`${o.name} crosses ${b.id} at ${u.toFixed(1)},${v.toFixed(1)}`);
   }
  }
 }
 if(o.isInstancedMesh){instances+=o.count;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));}}
});
assert.ok(draws<130,`too many draw calls: ${draws}`);assert.ok(triangles<800000,`campus triangle budget exceeded: ${triangles}`);
const camera=new T.PerspectiveCamera();const [x,z]=schoolToWorld(181,476);camera.position.set(x,3,z);
campus.setNight(true);campus.update(camera,1000);const lights=campus.root.children.filter(o=>o.isPointLight);assert.equal(lights.length,3);assert.ok(lights.some(l=>l.visible));assert.ok(lights.every(l=>!l.castShadow));
camera.position.set(-1800,3,120);campus.update(camera,1500);assert.ok(lights.every(l=>!l.visible));campus.setNight(false);assert.ok(lights.every(l=>l.intensity===0));
const manager=createLandmarkManager(scene);manager.registerExternal(schoolLandmarkRecord,campus.root,campus.dispose);manager.update(camera);
// A real Three raycast from the entry must recognize the photo-referenced school wall.
const [wallU,wallV]=schoolEntrance.wall;
const eye=schoolToWorld(wallU,wallV+20),target=schoolToWorld(wallU,wallV);camera.position.set(eye[0],3.5,eye[1]);camera.lookAt(target[0],3.5,target[1]);camera.updateMatrixWorld(true);
assert.equal(manager.pick(camera,new T.Vector2(0,0))?.id,schoolLandmarkRecord.id);
const sign=campus.root.children.find(o=>o.isMesh&&o.name==='山西省平遥中学');assert.ok(sign&&sign.position.z>schoolEntrance.gate[1]);
const wallRay=new T.Raycaster();wallRay.setFromCamera(new T.Vector2(0,0),camera);
assert.equal(wallRay.intersectObject(campus.root,true)[0]?.object,sign,'exterior school sign must not be hidden behind another building');
// Check real geometry, including fence posts, gate bars, trees and the annexes:
// an 8 m entry lane must stay open from the outer boundary to the garden access.
for(const u of [209,212,215])for(const y of [1,2,4]){
 const a=schoolToWorld(u,583),b=schoolToWorld(u,509);
 const origin=new T.Vector3(a[0],y,a[1]),end=new T.Vector3(b[0],y,b[1]);
 const ray=new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,origin.distanceTo(end));
 const hit=ray.intersectObject(campus.root,true)[0];assert.equal(hit,undefined,`entry lane blocked at u=${u}, y=${y} by ${hit?.object.name}`);
}
// View the legible year plaques from the road: their text must face the road,
// not face away or be hidden by the stone seats / the other staggered row.
for(const plaque of schoolEntrance.historyWalls.filter(p=>p.year)){
 const a=schoolToWorld(198,plaque.v+1),b=schoolToWorld(plaque.u,plaque.v+1);
 const origin=new T.Vector3(a[0],1.68,a[1]),end=new T.Vector3(b[0],1.68,b[1]);
 const ray=new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,origin.distanceTo(end)+1);
 assert.equal(ray.intersectObject(campus.root,true)[0]?.object.name,plaque.year,`${plaque.year} must be readable from the road`);
}
// A land-use boundary must no longer put a tall fence across the public apron.
const outer=schoolToWorld(230,550),inner=schoolToWorld(205,550);
const origin=new T.Vector3(outer[0],1.2,outer[1]),end=new T.Vector3(inner[0],1.2,inner[1]);
const apronRay=new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,origin.distanceTo(end));
assert.equal(apronRay.intersectObject(campus.root,true)[0],undefined,'public frontage remains enclosed by a generated fence');
manager.unload(schoolLandmarkRecord.id);assert.equal(campus.root.parent,null);assert.equal(campus.root.children.length,0);campus.dispose();manager.dispose();
console.log(JSON.stringify({buildings:records.length,drawCalls:draws,triangles,instances,boundary:'passed',clickIdentification:'passed',nightLights:'passed',unload:'passed'}));
