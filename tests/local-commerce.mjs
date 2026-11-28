import assert from 'node:assert/strict';
import * as T from 'three';
import {addWestFrontages,planWestFrontages} from '../dist/west-corridor.js';
import {createCommerceMaterials} from '../dist/local-commerce-materials.js';

const noop=()=>{},ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene();addWestFrontages(scene,()=>{});
const root=scene.getObjectByName('下西关街连续商铺'),details=root.userData.commerceDetails;
assert.equal(details.find(p=>p.name==='晓亮书店').role,'bookshop');
assert.equal(details.find(p=>p.name==='鲜活香超市').role,'grocer');
assert.equal(details.find(p=>p.name==='景林江米油糕').role,'breakfast');
assert.equal(details.find(p=>p.name==='蜜雪冰城').role,'drinks');
assert.ok(root.getObjectByName('饮品杯、蒸笼与花盆')?.isInstancedMesh,'food and beverage detail stays in one instance batch');
assert.ok(root.userData.materialBatches<75,'material seams must be batched rather than meshes per brick');
const apron=root.getObjectByName('商铺门前坡面铺装');
assert.equal(apron.geometry.attributes.uv.count,apron.geometry.attributes.position.count);
assert.ok(apron.material.map&&apron.material.bumpMap);
// New material geometry must be finite and retain the existing school-entry gap.
const plan=planWestFrontages();
for(const mesh of root.children.filter(o=>o.name.startsWith('生活街区材质-'))){
 assert.ok(mesh.material.map&&mesh.material.bumpMap);
 assert.ok(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));
}
assert.ok(plan.units.every(p=>p.side!==1||p.x<=-1871||p.x>=-1845),'school gate gap remains open');
// Meter-scaled texture coordinates must not stretch when a facade doubles in width.
const probe=new T.Group(),m=createCommerceMaterials(probe);m.quad('brick','#ffffff',[[0,0,0],[9.6,0,0],[9.6,4.8,0],[0,4.8,0]]);const c=m.finish();
const uv=c.meshes[0].geometry.attributes.uv;assert.ok(Math.abs(uv.getX(1)-10)<1e-5);assert.ok(Math.abs(uv.getY(2)-5)<1e-5);
let released=0;c.meshes[0].material.map.addEventListener('dispose',()=>released++);c.dispose();assert.equal(probe.children.length,0);assert.equal(released,1);
console.log(JSON.stringify({connectedFrontages:plan.units.length,namedShops:details.length,materialBatches:root.userData.materialBatches,physicalUV:'passed',schoolGate:'open'}));
// Whole-street lighting must not place an opaque faux window over Jinglin's entrance.
const {addWestStreetExperience}=await import('../dist/west-experience.js');
const experience=addWestStreetExperience(scene),jinglin=root.getObjectByName('景林江米油糕 · 照片细化门店');
scene.updateMatrixWorld(true);
const eye=jinglin.localToWorld(new T.Vector3(0,1.5,4.2)),direction=new T.Vector3(0,0,-1).transformDirection(jinglin.matrixWorld);
assert.equal(new T.Raycaster(eye,direction,0,3.5).intersectObject(scene,true).length,0,'integrated storefront entry must stay unobstructed');
experience.dispose();
