import assert from 'node:assert/strict';
import * as T from 'three';
import {addGuchengStation} from '../dist/gucheng-station.js';
import {stationSite,stationWorld,stationLocal,stationParking,stationDetailStops} from '../dist/gucheng-station-data.js';
import {regionalRoadClear} from '../dist/regional-survey.js';
import {pointInRing} from '../dist/geography.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
for(const q of [[0,0],[-230,54],[120,-280]])assert.ok(stationLocal(...stationWorld(...q)).every((v,i)=>Math.abs(v-q[i])<1e-8));
const scene=new T.Scene(),station=addGuchengStation(scene);scene.updateMatrixWorld(true);
const context=station.root.getObjectByName('高铁站周边与绿化'),report=context.userData;
assert.equal(station.root.userData.buildingRecord.height,16.9);assert.equal(station.root.userData.buildingRecord.levels,2);
assert.ok(report.trees.length>300);assert.ok(report.parkingSpaces.length>100);assert.equal(report.people,0);
for(const t of report.trees)assert.ok(regionalRoadClear(t.x,t.z,t.crown*.48),'trees must not block the station road');
for(const p of report.parkingSpaces){assert.ok(pointInRing(p.x,p.z,stationParking.find(l=>l.id===p.lot).ring));assert.ok(regionalRoadClear(p.x,p.z,1));}
function surfaceAt(u,v,y){const [x,z]=stationWorld(u,v);const hits=new T.Raycaster(new T.Vector3(x,y+.3,z),new T.Vector3(0,-1,0),0,.6).intersectObject(station.root,true);assert.ok(hits.length,`missing walking surface at ${u},${v},${y}`);assert.ok(Math.abs(hits[0].point.y-y)<.05,`wrong walking level at ${u},${v}: ${hits[0].point.y} expected ${y}`);}
for(const u of [-41,41])for(let i=0;i<24;i++)surfaceAt(u,-50.8+i*.7,(i+1)*.16);
for(const r of report.ramps)for(const t of [.1,.5,.9])surfaceAt(r.u,r.a+(r.b-r.a)*t,r.up?r.y0+(r.y1-r.y0)*t:r.y1-(r.y1-r.y0)*t);
assert.equal(report.ramps.length,10);assert.ok(report.ramps.every(r=>(r.y1-r.y0)/(r.b-r.a)<.06));
assert.equal(report.platforms,2);assert.equal(report.tracks,4);
for(const v of [30.3,36,41.7,47.3]){
 const [x,z]=stationWorld(-224,v),dir=new T.Vector3(Math.cos(stationSite.angle),0,-Math.sin(stationSite.angle));
 assert.equal(new T.Raycaster(new T.Vector3(x,4.5,z),dir,0,448).intersectObject(station.root,true).length,0,'clear rail corridor');
}
let draws=0,triangles=0;station.root.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);for(const name of ['position','normal'])assert.ok(Array.from(o.geometry.attributes[name].array).every(Number.isFinite));if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));});
assert.ok(draws<160&&triangles<1100000,`${draws} draws / ${triangles} triangles`);
station.setNight(true);assert.ok(station.root.getObjectByName('高铁站照明').material.emissiveIntensity>0);station.setNight(false);assert.equal(station.root.getObjectByName('高铁站照明').material.emissiveIntensity,0);
const camera=new T.PerspectiveCamera();camera.position.y=400;station.update(camera);assert.equal(station.root.getObjectByName('高铁站近景设施').visible,false);camera.position.y=20;station.update(camera);assert.equal(station.root.getObjectByName('高铁站近景设施').visible,true);
assert.equal(stationDetailStops.length,3);
console.log(JSON.stringify({trees:report.trees.length,parking:report.parkingSpaces.length,cars:report.cars,ramps:report.ramps.length,draws,triangles,checks:'aligned station, distinct hall height, roadside clearance, continuous stairs and ramps, unobstructed tracks, night lighting and LOD'}));
