import assert from 'node:assert/strict';
import * as T from 'three';
import {addSecondSchool,secondSchoolSurvey,secondSchoolBuildings} from '../dist/second-school.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
import {pointInRing} from '../dist/geography.js';
import {westGroundHeight} from '../dist/west-terrain.js';
const noop=()=>{},ctx=new Proxy({},{get:()=>noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),school=addSecondSchool(scene),d=school.root.userData.campusDetails;
const boundary=secondSchoolSurvey.boundary.map(([x,z])=>[x+1858,z-156]);
const field=Array.from({length:96},(_,i)=>{const t=i*Math.PI/48,x=47*Math.cos(t),z=25*Math.sin(t);return [127+x*Math.cos(.108)+z*Math.sin(.108),94-x*Math.sin(.108)+z*Math.cos(.108)];});
const buildings=secondSchoolBuildings.map(b=>clearanceRect(b.u,b.v,b.w,b.d));
for(const ring of buildings){assert.ok(ring.every(p=>pointInRing(...p,boundary)));assert.ok(!clearancePolygonsOverlap(ring,field),'annex overlaps track');}
for(const ring of [...d.paths,...d.gardens,...d.furniture.map(p=>p.ring)]){assert.ok(ring.every(p=>pointInRing(...p,boundary)));assert.ok(![...buildings,field].some(b=>clearancePolygonsOverlap(ring,b)),'detail occupies a building or track');}
for(const p of d.furniture)assert.ok(!d.paths.some(r=>clearancePolygonsOverlap(p.ring,r)),'furniture blocks a path');
assert.ok(d.paths.length>10&&d.gardens.length>5&&d.furniture.some(p=>p.kind==='cycle-shelter'));
scene.updateMatrixWorld(true);
// Field remains above the terrain-following campus slab (regression for occlusion).
for(const [u,v] of [[127,94],[127,75],[100,94]]){
 const ray=new T.Raycaster(new T.Vector3(-1858+u,40,156+v),new T.Vector3(0,-1,0),0,80),hits=ray.intersectObject(school.root,true);
 assert.ok(hits.length&&hits[0].point.y>westGroundHeight(-1858+u,156+v)+.19,'campus slab must not hide the field');
 const turf=hits.find(h=>h.object.material.color.getHexString()==='5b8059');assert.ok(turf,'turf must exist at field probe');
 assert.ok(!hits.some(h=>h.object.material.color.getHexString()==='a8aa8b'&&h.point.y>=turf.point.y),'base ground hides turf');
}
// Northern entry remains walkable at human eye height after perimeter detailing.
const eye=new T.Vector3(-1858,westGroundHeight(-1858,156)+2.1,151),end=new T.Vector3(-1858,westGroundHeight(-1858,156)+2.1,181);
const ray=new T.Raycaster(eye,end.clone().sub(eye).normalize(),0,eye.distanceTo(end));assert.equal(ray.intersectObject(school.root,true).length,0);
let draws=0,triangles=0;school.root.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));});
assert.ok(draws<100&&triangles<500000);
school.setNight(true);school.update({position:new T.Vector3(-1858,2,156)});assert.ok(school.root.children.some(o=>o.isPointLight&&o.visible));school.setNight(false);assert.ok(school.root.children.filter(o=>o.isPointLight).every(o=>!o.visible));
school.dispose();school.dispose();assert.equal(scene.children.length,0);
console.log(JSON.stringify({buildings:buildings.length,paths:d.paths.length,gardens:d.gardens.length,facilities:d.furniture.length,fencePanels:d.fences.length,draws,triangles,trackClear:'passed',gateClear:'passed'}));
