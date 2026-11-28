import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {schoolSites} from '../dist/school-sites-data.js';
import {gutaoShops} from '../dist/gutao-shops-data.js';
import {addSchoolSite} from '../dist/school-sites.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
const noop=()=>{},ctx=new Proxy({},{get:()=>noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const pois=JSON.parse(readFileSync(new URL('../data/gutao-shop-pois.json',import.meta.url))).pois;
const scene=new T.Scene(),survey=schoolSites.find(s=>s.id==='gutao'),site=addSchoolSite(scene,survey),d=site.root.userData.gutaoShops;
assert.equal(d.named.length,gutaoShops.length);assert.equal(new Set(d.named.map(p=>p.id)).size,gutaoShops.length);
for(const shop of d.named){
 const source=pois.find(p=>p.id===shop.id);assert.ok(source,'every named sign has a returned POI');
 assert.deepEqual(shop.coordinate,source.location.split(',').map(Number));assert.equal(shop.address,source.address);
 const building=survey.buildings.find(p=>p.id===shop.building);assert.ok(shop.u-shop.w/2>=building.u-building.w/2&&shop.u+shop.w/2<=building.u+building.w/2,'sign stays on its host facade');
}
const ground=d.named.filter(p=>!p.upper);
for(let i=0;i<ground.length;i++)for(let j=i+1;j<ground.length;j++)if(ground[i].building===ground[j].building)assert.ok(Math.abs(ground[i].u-ground[j].u)>(ground[i].w+ground[j].w)/2,'ground-floor tenants do not occupy the same bay');
const gate=clearanceRect(...survey.gate,14,45);for(const b of survey.buildings.filter(p=>p.type==='commercial'))assert.ok(!clearancePolygonsOverlap(gate,clearanceRect(b.u,b.v,b.w,b.d)),'extended retail keeps the school gate open');
scene.updateMatrixWorld(true);
for(const shop of d.named){
 const label=site.root.getObjectByName(`古陶商铺门头-${shop.id}`),start=label.position.clone().add(new T.Vector3(0,0,3)),end=label.position.clone();site.root.localToWorld(start);site.root.localToWorld(end);
 const ray=new T.Raycaster(start,end.clone().sub(start).normalize(),0,3.1);
 assert.equal(ray.intersectObject(site.root,true)[0]?.object,label,`${shop.name}: fascia or geometry hides the name`);
 if(!shop.upper){
  const eye=site.root.localToWorld(new T.Vector3(shop.door,label.position.y-1.75,shop.front+3.7)),target=site.root.localToWorld(new T.Vector3(shop.door,label.position.y-1.75,shop.front+.85));
  const doorRay=new T.Raycaster(eye,target.clone().sub(eye).normalize(),0,eye.distanceTo(target));assert.equal(doorRay.intersectObject(site.root,true).length,0,`${shop.name}: street display blocks its door`);
 }
}
site.setNight(true);assert.ok(d.named.every(p=>site.root.getObjectByName(`古陶商铺门头-${p.id}`).material.emissiveIntensity>0));site.setNight(false);
assert.ok(!site.root.userData.schoolDetails.enclosures.some(p=>p.parcel===2),'open shopping row must not be fenced off as housing');
site.dispose();assert.equal(scene.children.length,0);
console.log(JSON.stringify({poiCandidates:pois.length,namedSigns:d.named.length,groundFloorShops:ground.length,unnamedBays:d.anonymous.length,checks:'source mapping, bay overlap, visible fascia, unblocked door approaches, open retail frontage, night state and disposal'}));
