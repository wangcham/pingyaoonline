import assert from 'node:assert/strict';
import * as T from 'three';
import {createWestLinkLayout,westLinkImagePoint,westLinkSurvey,westLinkStops,westLinkOpenGround,westLinkRingsIntersect,westLinkRoadClear,isWestLinkStudy} from '../dist/west-link-survey.js';
import {canPlantYingxun,planYingxunPlanting,yingxunClearings,yingxunPonds} from '../dist/yingxun-park-data.js';
import {westSiteIntersectsRing} from '../dist/west-sites-data.js';
import {pointInRing} from '../dist/geography.js';
import {addWestLinkDistrict} from '../dist/west-link-district.js';
import {addYingxunGreenery} from '../dist/yingxun-greenery.js';
import {collectBuildingRecords} from '../dist/building-heights.js';

// Registration anchors are physical map features, not the POI label offsets.
for(const [frame,u,v,expected] of [
  ['north',1070,584,[-1440,870]],['middle',1120,107,[-1440,870]],
  ['south',656,91,[-1906,1315]],['gate',699,433,[-10.7,896.3]],
]){const actual=westLinkImagePoint(frame,u,v);assert.ok(Math.hypot(...actual.map((p,i)=>p-expected[i]))<1.5,frame);}
assert.equal(westLinkSurvey.imageryDate,null);
const layout=createWestLinkLayout();
for(const frame of ['north','middle','south'])assert.ok(layout.roofs.filter(p=>p.frame===frame).length>45,`${frame}: fill internal blocks`);
assert.ok(layout.roofs.some(p=>p.roadTrimmed),'retain split roof rows beside narrow roads');
for(const [i,p] of layout.roofs.entries()){
  assert.ok(!westSiteIntersectsRing(p.ring),p.id+' campus collision');
  assert.ok(p.ring.every(v=>isWestLinkStudy(...v)),p.id+' scope');
  assert.ok(p.ring.every(v=>westLinkRoadClear(...v,.69)),p.id+' road setback');
  assert.ok(!westLinkOpenGround.some(g=>westLinkRingsIntersect(p.ring,g.ring)),p.id+' field/yard');
  assert.ok(!layout.roofs.slice(i+1).some(q=>westLinkRingsIntersect(p.ring,q.ring)),p.id+' duplicate footprint');
}
const planting=planYingxunPlanting();assert.ok(planting.trees.length>650&&planting.trees.length<1000);
assert.ok(planting.trees.filter(p=>p.x< -650&&p.z>850).length>100,'continuous green belt must reach the southwest corner');
for(const tree of planting.trees){
  assert.ok(canPlantYingxun(tree.x,tree.z,3.2));
  assert.ok(![...yingxunPonds,...yingxunClearings.map(p=>p.ring)].some(r=>pointInRing(tree.x,tree.z,r)));
}
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),district=addWestLinkDistrict(scene),park=addYingxunGreenery(scene);scene.updateMatrixWorld(true);
const records=collectBuildingRecords(scene);assert.equal(records.length,layout.roofs.length);
for(const record of records){
  for(const key of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource','coordinate'])assert.ok(key in record);
  assert.ok(record.height>2&&record.height<45&&record.estimated&&record.confidence<=.4);
}
assert.ok(records.some(r=>r.levels>=10));assert.ok(records.some(r=>r.levels===1));
assert.ok(district.root.userData.drawnAlleys.length>1500,'internal paths, not just outer roads');
assert.ok(district.root.userData.forecourtSamples.length>500,'paving reaches the spaces between roof rows');
let draws=0,triangles=0;scene.traverse(o=>{
  if(!o.isMesh)return;draws++;const g=o.geometry;
  assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));
  if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));
  triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);
});assert.ok(draws<=20&&triangles<2500000,`${draws} draws / ${triangles} triangles`);
// New park vegetation / furniture must not obstruct the actual south-gate approach.
for(const x of [-76,-71.5,-67])for(const y of [1,2.5,4]){
  const ray=new T.Raycaster(new T.Vector3(x,y,720),new T.Vector3(0,0,-1),0,55);
  assert.equal(ray.intersectObject(park,true)[0],undefined,`gate approach ${x}, ${y}`);
}
const grass=park.getObjectByName('卫星判读地表-ground');
for(const ring of yingxunPonds){
  const [x,z]=ring.reduce((a,p)=>a.map((v,i)=>v+p[i]/ring.length),[0,0]);
  assert.ok(pointInRing(x,z,ring));
  const ray=new T.Raycaster(new T.Vector3(x,2,z),new T.Vector3(0,-1,0),0,3);
  assert.equal(ray.intersectObject(grass)[0],undefined,'park ground must have actual holes for the ponds');
}
const windowMesh=district.root.children.find(o=>o.isInstancedMesh&&o.material.emissiveMap);
district.setNight(true);assert.ok(windowMesh.material.emissiveIntensity>0);district.setNight(false);assert.equal(windowMesh.material.emissiveIntensity,0);
assert.ok(westLinkStops.some(s=>s.name==='二中至三中 · 街坊全景'));
assert.ok(westLinkStops.some(s=>s.name==='C03-01 七号巷北侧 · 院落入口'));
console.log(`West school corridor and Yingxun Park passed: ${records.length} roof sections, ${district.root.userData.treeCount}+${park.userData.treeCount} trees, ${draws} draws / ${triangles} triangles.`);
