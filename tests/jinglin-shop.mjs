import assert from 'node:assert/strict';
import * as T from 'three';
import {addJinglinShop} from '../dist/jinglin-shop.js';
const noop=()=>{},ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),shop=addJinglinShop(scene,{x:-1888,z:148.38,yaw:-3.033,width:4.6,depth:6,base:0});
scene.updateMatrixWorld(true);
function ray(x,y,z,distance){
 const from=shop.root.localToWorld(new T.Vector3(x,y,z));
 const dir=new T.Vector3(0,0,-1).transformDirection(shop.root.matrixWorld);
 return new T.Raycaster(from,dir,0,distance).intersectObject(shop.root,true);
}
for(const x of [-.25,0,.25])assert.equal(ray(x,1.5,4.2,3.5).length,0,'entry must have a real opening into the room');
assert.equal(ray(0,3.79,5,3)[0].object.name,'景林江米油糕','sign lettering must be in front of the fascia');
let draws=0,triangles=0;const maps=new Set();
shop.root.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));for(const key of ['map','bumpMap','emissiveMap'])if(o.material[key])maps.add(o.material[key]);});
assert.ok(draws<45&&triangles<50000,JSON.stringify({draws,triangles}));
const layout=shop.root.userData.jinglinDetails;
assert.ok(layout.fryer[0]<0);
for(const section of layout.displays){assert.ok(section.tray[0]>0&&section.label[0]>section.tray[0]);assert.equal(section.label[2],section.tray[2]);assert.ok(section.label[1]>section.tray[1]);assert.equal(shop.root.getObjectByName(section.name).rotation.y,-Math.PI/2);}
for(const section of layout.displays){
 const from=shop.root.localToWorld(new T.Vector3(0,section.label[1],section.label[2]));
 const dir=new T.Vector3(1,0,0).transformDirection(shop.root.matrixWorld);
 assert.equal(new T.Raycaster(from,dir,0,3).intersectObject(shop.root,true)[0].object.name,section.name,'flavour labels must sit in front of the inside wall face');
}
const cake=shop.root.getObjectByName('景林-cake-cake');assert.equal(cake.count,39);assert.ok(cake.material.bumpMap);
const light=shop.root.getObjectByName('景林-light-box');shop.setNight(true);assert.ok(light.material.emissiveIntensity>1);shop.setNight(false);assert.ok(light.material.emissiveIntensity<1);
const camera=new T.PerspectiveCamera();camera.position.copy(shop.root.localToWorld(new T.Vector3(0,1.8,5)));shop.update(camera);assert.equal(cake.parent.visible,true);
camera.position.set(0,100,0);shop.update(camera);assert.equal(cake.parent.visible,false);
const disposed=new Set();maps.forEach(t=>t.addEventListener('dispose',()=>disposed.add(t)));shop.dispose();assert.equal(shop.root.parent,null);assert.equal(disposed.size,maps.size);
console.log(JSON.stringify({draws,triangles,textures:maps.size,entry:'open',sign:'unobstructed',night:'passed',lod:'passed',dispose:'passed'}));
