import assert from 'node:assert/strict';
import * as T from 'three';
import {planWestFrontages} from '../dist/west-corridor.js';
import {yufengLanes,addYufengBlock} from '../dist/yufeng-block.js';
import {nearestShuncheng,yufengAccessEdge} from '../dist/west-road-layout.js';
import {segments,sample} from '../dist/geography.js';
import {westGroundHeight} from '../dist/west-terrain.js';
import {commercialPlots} from '../dist/west-district.js';
import {junctionJewelry,addJunctionJewelry} from '../dist/junction-jewelry.js';

const plan=planWestFrontages();
assert.ok(plan.units.length>120);
for(const row of plan.rows){
  const units=plan.units.filter(p=>p.row===row.id);
  assert.ok(Math.abs(units.reduce((s,p)=>s+p.width,0)-(row.end-row.start))<1e-7);
  for(let i=1;i<units.length;i++)assert.ok(Math.hypot(...units[i].left.map((v,k)=>v-units[i-1].right[k]))<1e-7,'unintended gap between shops');
}
const oil=plan.units.find(p=>p.shop?.food);
assert.ok(oil&&Math.abs(oil.x+1888)<.1);
assert.ok(plan.units.filter(p=>p.row===oil.row).length>2,'oil-cake shop must be part of a connected row');
assert.ok(plan.units.every(p=>p.side!==1||p.x<=-1871||p.x>=-1845),'keep school entry open');
assert.ok(Math.abs(nearestShuncheng(yufengAccessEdge).distance-4.8)<1e-7);
for(const lane of yufengLanes)for(const line of segments(lane)){
  for(let i=0;i<=20;i++)assert.ok(nearestShuncheng(sample(line,i/20)).distance>=4.8-1e-6,'side road center enters main carriageway');
}
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}})})};
const group=addYufengBlock(new T.Scene(),()=>{}),lanes=group.getObjectByName('宇峰支路贴地连接');
assert.ok(lanes);
for(const mesh of lanes.children){
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),distance=nearestShuncheng([x,z]).distance;
    assert.ok(distance>4.79,'side-road strip overlays main carriageway');
    assert.ok(y-westGroundHeight(x,z)<.241,'floating side-road surface');
    if(Math.abs(distance-4.8)<.01)assert.ok(Math.abs(y-westGroundHeight(x,z)-.121)<.001,'access height must match main road');
  }
}
console.log(JSON.stringify({rows:plan.rows.length,connectedShops:plan.units.length,access:yufengAccessEdge,continuity:'passed',roadHeight:'passed'}));
for(const record of junctionJewelry){
  const host=commercialPlots.find(p=>p.name===record.host),labels=[];
  assert.ok(host);
  const jewelry=addJunctionJewelry(new T.Scene(),host,null,(_g,text)=>labels.push(text));
  assert.ok(labels.some(label=>record.name.startsWith(label)));
  assert.equal(jewelry.position.x,host.x);assert.equal(jewelry.position.z,host.z);
  let batches=0;
  jewelry.traverse(mesh=>{
    if(!mesh.isInstancedMesh)return;batches++;
    const matrix=new T.Matrix4(),bounds=new T.Box3(),unit=new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5));
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);bounds.copy(unit).applyMatrix4(matrix);
      assert.ok(bounds.min.x>=-host.w/2-.8&&bounds.max.x<=host.w/2+.8,'shop detached from host footprint');
      assert.ok(bounds.min.z>=-host.d/2-.8&&bounds.max.z<=host.d/2+.8,'shop detached from host footprint');
    }
  });
  assert.equal(batches,1);
}
console.log('Both jewelry corners are attached to their host buildings; batched geometry passed.');
