import assert from 'node:assert/strict';
import * as T from 'three';
import {addTiansen} from '../dist/tiansen.js';
import {addPingyaoThirdSchool} from '../dist/pingyao-third-school.js';
import {thirdSchoolSurvey,thirdSchoolGate,siteToWorld,westSiteStops,tiansenSurvey,tiansenBuildings} from '../dist/west-sites-data.js';
import {collectBuildingRecords} from '../dist/building-heights.js';
import {createLandmarkManager} from '../dist/landmarks/LandmarkManager.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
import {schoolClearance} from '../dist/school-sites-data.js';
import {xinhuaBookstoreSurvey} from '../dist/tiansen-life-data.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),sites=[addTiansen(scene),addPingyaoThirdSchool(scene)],manager=createLandmarkManager(scene);
for(const s of sites)manager.registerExternal(s.record,s.root,s.dispose);
scene.updateMatrixWorld(true);
const parking=sites[0].root.userData.streetParking;
assert.ok(parking.placements.some(p=>p.side==='mall')&&parking.placements.some(p=>p.side==='opposite'));
const mallFootprints=sites[0].root.userData.heightRecords.map(b=>clearanceRect(b.u,b.v,b.w,b.d));
for(const [i,p]of parking.placements.entries()){
 assert.ok(schoolClearance.clear(p.ring.map(q=>siteToWorld(tiansenSurvey,...q))),'scooter occupies carriageway');
 assert.ok(![parking.entrancePass,...mallFootprints,...parking.placements.slice(i+1).map(q=>q.ring)].some(r=>clearancePolygonsOverlap(r,p.ring)),'scooter crosses entrance, building or another scooter');
}
// The user-confirmed B1 supermarket shares Tiansen's entrance; its carts stay
// outside the approach and the canopy fascia does not hide its lettering.
const market=sites[0].root.userData.supermarket,marketSign=sites[0].root.getObjectByName('快乐购超市-B1门头');assert.equal(market.floor,'B1');assert.ok(marketSign);
const signStart=sites[0].root.localToWorld(marketSign.position.clone().add(new T.Vector3(4,0,0))),signEnd=marketSign.getWorldPosition(new T.Vector3());
assert.equal(new T.Raycaster(signStart,signEnd.clone().sub(signStart).normalize(),0,4.1).intersectObject(sites[0].root,true)[0]?.object,marketSign);
const [entryU,entryV]=market.entrance;
for(const dv of [-.7,.7]){
 const start=sites[0].root.localToWorld(new T.Vector3(entryU+8,marketSign.position.y-2.6,entryV+dv)),end=sites[0].root.localToWorld(new T.Vector3(entryU+1.2,marketSign.position.y-2.6,entryV+dv));
 assert.equal(new T.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end)).intersectObject(sites[0].root,true).length,0,'B1 shared entrance approach blocked');
}
const records=collectBuildingRecords(scene);assert.equal(records.length,22);assert.equal(records.filter(r=>r.id==='xinhua-pingyao').length,1,'one separate bookstore across Shangxiguan');
const book=scene.getObjectByName(xinhuaBookstoreSurvey.name),bookLife=book.userData.streetLife,life=sites[0].root.userData.streetLife;
assert.ok(book.position.z>tiansenSurvey.origin[1]+100&&book.position.x<-1460,'bookstore belongs south of the mall, west of the roundabout');
assert.ok(schoolClearance.clear(xinhuaBookstoreSurvey.boundary),'bookstore roof footprint must not invade the mapped road');
assert.equal(life.people.length+bookLife.people.length,0,'street scenes contain no people');
assert.equal(scene.getObjectByName('田森街区人物'),undefined,'remove the person meshes, not just their visibility');
const e=bookLife.entry,bookAngle=bookLife.entryAngle;
for(const dx of [-.6,.6]){
 const start=book.localToWorld(new T.Vector3(e[0]+Math.sin(bookAngle)*4+Math.cos(bookAngle)*dx,1.5,e[1]+Math.cos(bookAngle)*4-Math.sin(bookAngle)*dx));
 const end=book.localToWorld(new T.Vector3(e[0]+Math.sin(bookAngle)*.65+Math.cos(bookAngle)*dx,1.5,e[1]+Math.cos(bookAngle)*.65-Math.sin(bookAngle)*dx));
 assert.equal(new T.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end)).intersectObject(book,true).length,0,'bookshop entrance approach blocked');
}
for(const r of records){for(const key of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource','coordinate'])assert.ok(key in r);assert.ok(r.height>2&&r.height<50&&r.estimated);}
let draws=0,triangles=0;scene.traverse(o=>{if(!o.isMesh)return;draws++;const g=o.geometry;assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);});
// Includes the three-storey bookstore; all pedestrian meshes have been removed.
assert.ok(draws<125&&triangles<500000,`${draws} draw calls, ${triangles} triangles`);
// Actual ray tests include posts, canopies, windows, trees and the entire open gate.
const [gu,gv]=thirdSchoolGate;
for(const du of [-3,0,3])for(const y of [1,2,4]){
  const a=siteToWorld(thirdSchoolSurvey,gu+du,gv+18),b=siteToWorld(thirdSchoolSurvey,gu+du,gv-11);
  const start=new T.Vector3(a[0],y,a[1]),end=new T.Vector3(b[0],y,b[1]);
  const ray=new T.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end));
  assert.equal(ray.intersectObject(sites[1].root,true)[0],undefined,`school entry blocked at ${du}, ${y}`);
}
const camera=new T.PerspectiveCamera();
const views=[{site:sites[0],eye:westSiteStops[0].eye,target:westSiteStops[0].target},
  {site:sites[1],eye:westSiteStops[2].eye,target:[...siteToWorld(thirdSchoolSurvey,gu,gv)]}];
for(const {site,eye,target} of views){
  camera.position.fromArray(eye);camera.lookAt(target[0],site===sites[1]?6.8:target[1],site===sites[1]?target[1]:target[2]);camera.updateMatrixWorld(true);
  assert.equal(manager.pick(camera,new T.Vector2())?.id,site.record.id,'street view identifies the correct site');
  site.setNight(true);site.update(camera);assert.ok(site.root.children.some(o=>o.isPointLight&&o.visible));
  camera.position.set(0,200,0);site.update(camera);assert.ok(site.root.children.filter(o=>o.isPointLight).every(o=>!o.visible&&!o.castShadow));site.setNight(false);
}
// The east normal remains east-facing after the site rotation.
const main=tiansenBuildings[0],a=siteToWorld(tiansenSurvey,main.u,main.v),b=siteToWorld(tiansenSurvey,main.u+10,main.v);assert.ok(b[0]>a[0]+9.8);
for(const s of sites){manager.unload(s.record.id);assert.equal(s.root.parent,null);s.dispose();}
assert.equal(scene.children.length,0,'mall surroundings must unload with the mall');
console.log(`Tiansen and No. 3 school: coordinates, open entrance, click identity, night lights, lifecycle and budget passed (${draws} draws, ${triangles} triangles).`);
