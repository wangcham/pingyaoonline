// CPU-only spatial and geometry audit. No renderer or browser interaction.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import {westNeighbourBlocks,westNeighbourOmitted,westNeighbourDetailBlocks,westNeighbourRoadClearance,westNeighbourIntersects} from '../dist/west-neighbourhood-data.js';
import {createWestNeighbourhoodSteps} from '../dist/west-neighbourhood.js';
import {civicSiteIntersects} from '../dist/civic-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
import {createRegionalLayout} from '../dist/regional-survey.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const all=westNeighbourBlocks.flatMap(b=>b.buildings);
for(const b of all){assert.ok(westNeighbourRoadClearance.clear(clearanceRect(b.x,b.z,b.w,b.d,b.angle,1.2)),b.id+' road clearance');assert.ok(!civicSiteIntersects(b.ring),b.id+' preserves landmark compound');}
for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(!clearancePolygonsOverlap(all[i].ring,all[j].ring),`${all[i].id} / ${all[j].id} overlap`);
const old=createRegionalLayout();assert.ok(old.roofs.every(b=>!westNeighbourIntersects(b.ring)),'coarse regional placeholders are replaced');
const scene=new T.Scene(),records=[],blocks=[],controllers=[],start=performance.now();let yields=0,meshes=0,triangles=0,solids=0;
for(const survey of westNeighbourBlocks){
 const iterator=createWestNeighbourhoodSteps(scene,survey);let next=iterator.next();while(!next.done){yields++;next=iterator.next();}const site=next.value;controllers.push(site);
 const data=site.root.userData.neighbourhoodDetails,r=site.root.userData.heightRecords;records.push(...r);assert.equal(r.length,survey.buildings.length);
 blocks.push({id:survey.id,name:survey.name,buildings:r.length,...Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value.length]))});
 for(const record of r)for(const key of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource'])assert.ok(record[key]!==undefined,key);
 for(const l of data.lanes){const dx=l.b[0]-l.a[0],dz=l.b[1]-l.a[1],ring=clearanceRect((l.a[0]+l.b[0])/2,(l.a[1]+l.b[1])/2,Math.hypot(dx,dz),l.width,-Math.atan2(dz,dx));assert.ok(!all.some(b=>clearancePolygonsOverlap(ring,b.ring)),'lane clips full building footprint');assert.ok(westNeighbourRoadClearance.clear(ring),'internal paving clears public streets');}
 for(const cell of [...data.green,...data.sidewalks]){assert.ok(!all.some(b=>clearancePolygonsOverlap(cell,b.ring)),'planting/paving outside buildings');assert.ok(westNeighbourRoadClearance.clear(cell),'planting/paving outside public carriageway');}
 if(survey.id==='C04-08')assert.ok(data.furniture.some(p=>p.kind==='sports-track'),'school sports ground retained');
 assert.ok(data.trees.length>0&&data.lanes.length>0&&data.green.length>0,'interior trees, circulation and gardens in every block');
 site.setNight(true);site.update({position:{x:survey.origin[0],z:survey.origin[1]}});site.setNight(false);
}
let farTriangles=0;
for(const c of controllers){
 c.update({position:{x:100000,y:1000,z:100000}},100000);
 const chunks=[...c.root.userData.detailChunks.values()];assert.ok(chunks.every(ch=>!ch.near&&ch.nearMeshes.every(m=>!m.visible)&&ch.farMeshes.every(m=>m.visible)),'far view swaps coherent chunks');
 c.root.traverse(o=>{if(o.isMesh&&o.visible)farTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);});
 const chunk=chunks.find(ch=>ch.nearMeshes.length&&ch.farMeshes.length),[cx,cz]=chunk.id.split(':').map(Number),origin=c.root.userData.survey.origin;
 const at=distance=>({position:{x:origin[0]+(cx+.5)*100+distance,y:10,z:origin[1]+(cz+.5)*100}});
 c.update(at(0),100200);assert.ok(chunk.near,'close view restores all detail');
 c.update(at(420),100400);assert.ok(chunk.near,'exit hysteresis retains near detail');
 c.update(at(500),100600);assert.ok(!chunk.near);c.update(at(420),100800);assert.ok(!chunk.near,'entry hysteresis retains distant shell');
 c.update(at(0),101000);
}
scene.updateMatrixWorld(true);const collisions=[];
scene.traverse(o=>{
 if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));
 if(!o.isInstancedMesh||o.geometry.type!=='BoxGeometry')return;
 const mat=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,mat);const scale=new T.Vector3().setFromMatrixScale(mat);if(scale.y<.4)continue;mat.premultiply(o.matrixWorld);const ring=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>{const p=new T.Vector3(x,0,z).applyMatrix4(mat);return [p.x,p.z];});if(!westNeighbourRoadClearance.clear(ring))collisions.push(ring);solids++;}
});
const report={buildMs:Math.round(performance.now()-start),buildings:records.length,meshes,triangles,solidInstances:solids,farTriangles,yields,blocks,roadCollisions:collisions.length,checks:'CPU spatial/geometry; user performs visual and interaction acceptance',acceptance:'pending-user-review'};
console.log(JSON.stringify(report,null,2));assert.equal(collisions.length,0,'all wall and facade instances clear public roads');
assert.ok(records.some(b=>b.levels>=10)&&records.some(b=>b.levels===1)&&records.some(b=>b.levels===5),'distinct low, mid-rise and high-rise buildings');
if(process.argv.includes('--export'))writeFileSync(new URL('../data/C04-west-neighbourhood.json',import.meta.url),JSON.stringify({report,blocks:westNeighbourDetailBlocks,surveys:westNeighbourBlocks.map(({query,...s})=>({...s,buildings:s.buildings.map(({query,...b})=>b)})),omitted:westNeighbourOmitted,records},null,2));
for(const c of controllers){c.dispose();c.dispose();}assert.equal(scene.children.length,0,'idempotent full unload');
