import assert from 'node:assert/strict';
import * as T from 'three';
import {addTiansen} from '../dist/tiansen.js';
import {addPingyaoThirdSchool} from '../dist/pingyao-third-school.js';
import {thirdSchoolSurvey,thirdSchoolGate,siteToWorld,westSiteStops,tiansenSurvey,tiansenBuildings} from '../dist/west-sites-data.js';
import {collectBuildingRecords} from '../dist/building-heights.js';
import {createLandmarkManager} from '../dist/landmarks/LandmarkManager.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),sites=[addTiansen(scene),addPingyaoThirdSchool(scene)],manager=createLandmarkManager(scene);
for(const s of sites)manager.registerExternal(s.record,s.root,s.dispose);
scene.updateMatrixWorld(true);
const records=collectBuildingRecords(scene);assert.equal(records.length,21);
for(const r of records){for(const key of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource','coordinate'])assert.ok(key in r);assert.ok(r.height>2&&r.height<50&&r.estimated);}
let draws=0,triangles=0;scene.traverse(o=>{if(!o.isMesh)return;draws++;const g=o.geometry;assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);});
assert.ok(draws<100&&triangles<450000,`${draws} draw calls, ${triangles} triangles`);
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
