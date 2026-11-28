import assert from 'node:assert/strict';
import * as T from 'three';
import {addTheater} from '../dist/theater.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),theater=addTheater(scene,null,(root,title,x,y,z,w,h,angle)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial());m.name=title;m.position.set(x,y,z);m.rotation.y=angle;root.add(m);});
scene.updateMatrixWorld(true);
let draws=0,triangles=0;
theater.root.traverse(o=>{if(!o.isMesh)return;draws++;const g=o.geometry;assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));});
assert.ok(draws<100&&triangles<100000,`${draws} draws / ${triangles} triangles`);
const bounds=new T.Box3().setFromObject(theater.root);assert.ok(bounds.max.y>8.7&&bounds.max.y<9.2,'visible roof should be about 9 m; underground height is not above ground');
assert.ok(theater.root.userData.detailReview.ticketFootprint[0]>47&&theater.root.userData.detailReview.ticketFootprint[1]>38,'southern annex must match the mapped footprint');
for(const entry of theater.root.userData.detailReview.entrances)for(const du of [-1,0,1])for(const y of [1,2]){
 const origin=theater.root.localToWorld(new T.Vector3(entry.u+du,y,84)),end=theater.root.localToWorld(new T.Vector3(entry.u+du,y,72));
 assert.equal(new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,origin.distanceTo(end)).intersectObject(theater.root,true).length,0,'queue rails must leave a walking route to doors');
}
const logo=theater.root.getObjectByName('又见平遥红印竖排标识'),end=logo.getWorldPosition(new T.Vector3()),origin=theater.root.localToWorld(new T.Vector3(38.7,2.8,74));
assert.equal(new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,origin.distanceTo(end)+.01).intersectObject(theater.root,true)[0]?.object,logo,'earth cladding hides the logo');
const lamps=theater.root.getObjectByName('又见平遥墙脚照明');theater.setNight(true);assert.ok(lamps.material.emissiveIntensity>0);theater.setNight(false);assert.equal(lamps.material.emissiveIntensity,0);
theater.dispose();theater.dispose();assert.equal(scene.children.length,0);
console.log(`Theater: low silhouette, open queue lanes, readable logo, finite geometry and unload passed (${draws} draws, ${triangles} triangles).`);
