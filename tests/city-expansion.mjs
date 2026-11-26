import assert from 'node:assert/strict';
import * as T from 'three';
import {commercialPlots} from '../dist/west-district.js';
import {addRoadAdjustedCommercial} from '../dist/road-adjusted-commercial.js';
import {buildingRoadClearance,clearanceRect} from '../dist/road-clearance.js';
import {tiansenBuildings,tiansenSurvey,siteToWorld} from '../dist/west-sites-data.js';
import {addTiansen} from '../dist/tiansen.js';
const scene=new T.Scene();
for(const plot of commercialPlots.filter(p=>['宇峰写字楼','希岸酒店','麗枫酒店'].includes(p.name))){
  const root=addRoadAdjustedCommercial(scene,plot,(parent,text,x,y,z,w,h,a)=>{
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial());mesh.position.set(x,y,z);mesh.rotation.y=a;parent.add(mesh);
  });assert.ok(root);root.updateMatrixWorld(true);
  const record=root.userData.buildingRecord;
  assert.ok(buildingRoadClearance.clear(record.footprint),plot.name);
  assert.equal(root.position.x,plot.x);assert.equal(root.position.z,plot.z);
  let count=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.isInstancedMesh){
      for(let i=0;i<mesh.count;i++){
        const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
        const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>{const p=new T.Vector3(x,0,z).applyMatrix4(matrix);return [p.x,p.z];});
        assert.ok(buildingRoadClearance.clear(corners),`${plot.name} facade/door ${i} intrudes into road`);count++;
      }
    }else{
      const pos=mesh.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(buildingRoadClearance.clear(clearanceRect(p.x,p.z,.001,.001)),plot.name+' mesh vertex');}
    }
  });assert.ok(count>50);
}
const south=tiansenBuildings.find(p=>p.id==='south'),p=siteToWorld(tiansenSurvey,south.u,south.v);
assert.ok(buildingRoadClearance.clear(clearanceRect(...p,south.w,south.d,tiansenSurvey.angle,1.2)),'Tiansen southern facade clears Shangxiguan');
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const mall=addTiansen(new T.Scene());mall.root.updateMatrixWorld(true);
mall.root.traverse(mesh=>{
  if(!mesh.isInstancedMesh||mesh.geometry.type!=='BoxGeometry')return;
  for(let i=0;i<mesh.count;i++){
    const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);if(new T.Vector3().setFromMatrixScale(matrix).y<.4)continue;matrix.premultiply(mesh.matrixWorld);
    const ring=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>{const p=new T.Vector3(x,0,z).applyMatrix4(matrix);return [p.x,p.z];});
    assert.ok(buildingRoadClearance.clear(ring),'Tiansen walls, corner volume or canopy support in road');
  }
});
console.log('Three clipped commercial masses, all facade instances/signs, fixed positions and Tiansen setback passed.');
