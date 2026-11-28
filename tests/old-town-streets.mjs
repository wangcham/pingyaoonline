import assert from 'node:assert/strict';
import * as T from 'three';
import {addOldTownStreetDetails} from '../dist/old-town-streets.js';
import {oldTownFrontages,wuTemple,oldTownDetailIntersects} from '../dist/old-town-streets-data.js';
import {createOldTownLayout,townWorld} from '../dist/old-town-layout.js';
import {clearanceRect,clearancePolygonsOverlap,buildingRoadClearance} from '../dist/road-clearance.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
for(const p of [...oldTownFrontages,wuTemple])assert.ok(buildingRoadClearance.clear(p.ring),'frontage crosses a mapped road');
for(let i=0;i<oldTownFrontages.length;i++)for(const p of oldTownFrontages.slice(i+1))assert.ok(!clearancePolygonsOverlap(oldTownFrontages[i].ring,p.ring));
for(const p of createOldTownLayout())assert.equal(oldTownDetailIntersects(clearanceRect(...townWorld(p.x,p.z),p.w,p.d,p.angle)),false,'legacy courtyard overlaps detailed frontage');
const scene=new T.Scene(),detail=addOldTownStreetDetails(scene);scene.updateMatrixWorld(true);
assert.ok(detail.report.frontages>150);for(const street of ['南大街','衙门街','书院街'])assert.ok(detail.report.streets[street]>15);
assert.ok(detail.report.latticePanels>300&&detail.report.drains>50);
assert.equal(detail.report.people,0);
assert.ok(detail.report.mingqingDisplays.length>60&&detail.report.hangingBoards>30&&detail.report.awnings>30,'Mingqing Street needs varied shop displays and hanging signs');
for(const p of detail.report.mingqingDisplays)assert.ok(buildingRoadClearance.clear(clearanceRect(p.x,p.z,p.w,p.d,p.angle)),'shop display intrudes into the road');
for(const p of oldTownFrontages.filter(p=>p.street==='南大街'))for(const u of [-.55,.55]){
 const c=Math.cos(p.angle),s=Math.sin(p.angle),point=v=>new T.Vector3(p.x+u*c+v*s,1.6,p.z-u*s+v*c),start=point(p.d/2+1.4),end=point(p.d/2+.45);
 assert.equal(new T.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end)).intersectObject(detail.root,true).length,0,'new goods obstruct the shop approach');
}
const camera=new T.PerspectiveCamera();camera.position.set(-175,1.8,260);detail.update(camera);
let draws=0,triangles=0;const maps=new Set();scene.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));for(const key of ['map','bumpMap','emissiveMap'])if(o.material[key])maps.add(o.material[key]);});
// Includes the new merchandise, canvas awnings and cage lanterns along South Street.
assert.ok(draws<350&&triangles<1650000,JSON.stringify({draws,triangles}));
detail.setNight(true);assert.ok(scene.getObjectByName('古城木匾文字').material.emissiveIntensity>0);detail.setNight(false);
camera.position.set(5000,150,5000);detail.update(camera);assert.equal(scene.getObjectByName('古城木匾文字').visible,false);
const disposed=new Set();maps.forEach(t=>t.addEventListener('dispose',()=>disposed.add(t)));detail.dispose();assert.equal(detail.root.parent,null);assert.equal(disposed.size,maps.size);
console.log(JSON.stringify({...detail.report,mingqingDisplays:detail.report.mingqingDisplays.length,draws,triangles,textures:maps.size,clearance:'passed',lod:'passed',dispose:'passed'}));
