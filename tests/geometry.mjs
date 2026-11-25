// Run with a loader mapping 'three' to the same 0.180.0 module as the page.
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLandmarkManager} from '../dist/landmarks/LandmarkManager.js';
import {pointInRing,segments,projectOnSegment} from '../dist/geography.js';

// CanvasTexture does not upload until a renderer is created; no WebGL context is needed here.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillStyle:''})})};
const scene=new T.Scene(),manager=createLandmarkManager(scene);
const start=performance.now();manager.loadAll();scene.updateMatrixWorld(true);
assert.equal(manager.entries.size,5);
let triangles=0,meshes=0;
for(const [id,{record,object}] of manager.entries) {
  let count=0;
  object.traverse(child=>{
    if(!child.geometry)return;meshes++;
    const p=child.geometry.attributes.position;
    assert.ok(Array.from(p.array).every(Number.isFinite),id+' has invalid geometry');count+=p.count/3;
  });
  triangles+=count;
  const bounds=new T.Box3().setFromObject(object);
  assert.ok(bounds.min.y>=-.01,id+' below ground');
  if(id==='tower')assert.ok(Math.abs(bounds.max.y-18.5)<.01,'tower height must remain 18.5 m');
  if(id!=='wall') {
    assert.ok(pointInRing(...record.position,record.ring));
    const edges=segments([...record.ring,record.ring[0]]),v=new T.Vector3();
    object.traverse(child=>{
      if(!child.geometry)return;
      const p=child.geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        v.fromBufferAttribute(p,i).applyMatrix4(child.matrixWorld);
        if(v.y>.2||pointInRing(v.x,v.z,record.ring))continue;
        const distance=Math.min(...edges.map(e=>projectOnSegment([v.x,v.z],e).distance));
        assert.ok(distance<1.6,`${id}: ground footprint exceeds geographic envelope by ${distance.toFixed(2)} m`);
      }
    });
  }
  console.log(id,Math.round(count)+' triangles',JSON.stringify({min:bounds.min.toArray(),max:bounds.max.toArray()}));
}
assert.ok(triangles<800000,'new landmark triangle budget exceeded');
assert.ok(meshes<120,'merged mesh budget exceeded');
const camera=new T.PerspectiveCamera(56,1,.1,10000),tower=manager.entries.get('tower');
const worldPoint=(x,y,z)=>tower.object.localToWorld(new T.Vector3(x,y,z));
camera.position.copy(worldPoint(0,2,25));camera.lookAt(worldPoint(0,2,0));camera.updateMatrixWorld();
let ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(),camera);
assert.equal(ray.intersectObject(tower.object,true).length,0,'market tower passage is blocked');
camera.position.copy(worldPoint(0,10,35));camera.lookAt(worldPoint(0,10,0));camera.updateMatrixWorld();
assert.equal(manager.pick(camera,new T.Vector2())?.id,'tower','visible tower must be identifiable');
const obstacle=new T.Mesh(new T.BoxGeometry(20,20,1),new T.MeshBasicMaterial());
obstacle.position.copy(worldPoint(0,10,20));obstacle.rotation.y=tower.record.rotation;scene.add(obstacle);
assert.equal(manager.pick(camera,new T.Vector2()),undefined,'foreground building must occlude picking');
scene.remove(obstacle);obstacle.geometry.dispose();obstacle.material.dispose();
camera.position.set(0,900,0);manager.update(camera);
assert.ok([...manager.entries.values()].every(e=>!e.object.userData.detail.visible));
const original=manager.load('tower');assert.equal(original,tower,'load must be idempotent');
let released=0;tower.object.traverse(c=>c.geometry?.addEventListener('dispose',()=>released++));
manager.unload('tower');assert.ok(released>0);assert.equal(manager.entries.size,4);
manager.load('tower');assert.equal(manager.entries.size,5);
manager.dispose();assert.equal(scene.children.length,0);assert.throws(()=>manager.load('tower'));
console.log(JSON.stringify({triangles,meshes,buildAndTestsMs:Math.round(performance.now()-start),lifecycle:'passed',picking:'passed',passage:'passed'}));
