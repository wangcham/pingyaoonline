import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import {schoolSites,schoolSiteIntersects,schoolClearance,schoolDetailBlocks} from '../dist/school-sites-data.js';
import {addSchoolSite} from '../dist/school-sites.js';
import {createWestLinkLayout} from '../dist/west-link-survey.js';
import {createSouthCityLayout} from '../dist/south-city-survey.js';
import {createRegionalLayout} from '../dist/regional-survey.js';
import {pointInRing} from '../dist/geography.js';
import {geographicToLocal} from '../dist/landmarks/coordinates.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const reports=[],records=[];
for(const survey of schoolSites){
 assert.ok(survey.origin.every((v,i)=>Math.abs(v-geographicToLocal(survey.center,'GCJ-02')[i])<1e-6),'viewport center uses one GCJ conversion');
 for(const b of survey.buildings)assert.ok(b.ring.every(p=>survey.protectedRings.some(r=>pointInRing(...p,r))),'every authored roof is protected from old infill');
 const scene=new T.Scene(),c=addSchoolSite(scene,survey),d=c.root.userData.schoolDetails,buildings=survey.buildings.map(b=>clearanceRect(b.u,b.v,b.w,b.d));
 for(let i=0;i<buildings.length;i++)for(let j=i+1;j<buildings.length;j++)assert.ok(!clearancePolygonsOverlap(buildings[i],buildings[j]),`${survey.id}: overlapping ${survey.buildings[i].name}/${survey.buildings[j].name}`);
 for(const p of [...d.paths,...d.sports.map(s=>s.ring)])assert.ok(!buildings.some(b=>clearancePolygonsOverlap(b,p)),`${survey.id}: path/sport through building`);
 for(const path of d.paths)assert.ok(!d.sports.some(p=>clearancePolygonsOverlap(path,p.ring)), 'circulation avoids sports fields');
 for(const p of d.furniture)assert.ok(!buildings.some(b=>clearancePolygonsOverlap(b,p.ring)),`${survey.id}: furniture through building`);
 assert.ok(d.sports.some(p=>p.kind==='track'),`${survey.id}: track must render`);
 assert.ok(d.paths.length&&d.trees.length&&d.green.length&&d.sports.length&&d.gates.length);
 assert.ok(d.enclosures.length>100&&d.enclosures.some(p=>p.parcel>0),'campus and surrounding compounds have fences');
 assert.ok(d.connections.length>10&&d.gardenBeds.length>5,'building entrances connect into landscaped grounds');
 assert.ok(d.amenities.some(p=>p.kind==='cycle-shelter')&&d.parking.length,'neighbourhood transport facilities render');
 for(const fence of [...d.enclosures,...d.sportsFences]){
  assert.ok(d.compoundGates.every(g=>!clearancePolygonsOverlap(fence.ring,g.ring)),'fence must leave every compound entrance open');
  assert.ok(d.connections.every(c=>c.rings.every(r=>!clearancePolygonsOverlap(fence.ring,r))),'fence must not sever an entrance path');
 }
 const fencedParcels=new Set(d.enclosures.map(p=>p.parcel));
 for(const parcel of fencedParcels)assert.ok(d.compoundGates.some(g=>g.parcel===parcel),'every fenced parcel needs an opening');
 const gate=d.gates[0],pass=clearanceRect(...gate.position,gate.clearWidth,6,gate.facing);assert.ok(!buildings.some(b=>clearancePolygonsOverlap(b,pass)),'gate passage remains open');
 assert.ok(c.root.userData.schoolAppearance.openings>20,'articulated window frames are present');
 const textured=[];c.root.traverse(o=>{if(o.isMesh&&o.name.startsWith('校园立面'))textured.push(o);});assert.ok(textured.length>=3&&textured.every(o=>o.material.map&&o.material.bumpMap),'facades have repeatable material and relief');
 scene.updateMatrixWorld(true);let meshes=0,triangles=0;
 c.root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);for(const p of o.geometry.attributes.position.array)assert.ok(Number.isFinite(p));
 if(!o.isInstancedMesh||o.geometry.type!=='BoxGeometry')return;
 const mat=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,mat);const scale=new T.Vector3().setFromMatrixScale(mat);if(scale.y<.4)continue;mat.premultiply(o.matrixWorld);const r=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>{const v=new T.Vector3(x,0,z).applyMatrix4(mat);return [v.x,v.z];});assert.ok(schoolClearance.clear(r),`${survey.id}: solid intrudes public road`);}});
 c.setNight(true);c.update({position:{x:survey.origin[0],z:survey.origin[1]}});assert.ok(!c.root.children.some(o=>o.isPointLight));
 const gardenLights=c.root.children.filter(o=>o.name.startsWith('生活街区材质-lamp'));assert.ok(gardenLights.length&&gardenLights.every(o=>o.material.emissiveIntensity>0),'garden lights follow night state without individual point lights');c.setNight(false);assert.ok(gardenLights.every(o=>o.material.emissiveIntensity===0));
 records.push(...c.root.userData.heightRecords);reports.push({id:survey.id,buildings:survey.buildings.length,meshes,triangles,details:Object.fromEntries(Object.entries(d).map(([k,v])=>[k,v.length]))});c.dispose();c.dispose();assert.equal(scene.children.length,0);
}
for(const layout of [createSouthCityLayout(),createRegionalLayout(),createWestLinkLayout()])assert.ok(layout.roofs.every(p=>!schoolSiteIntersects(p.ring)),'old coarse buildings excluded');
if(process.argv.includes('--export'))writeFileSync(new URL('../data/school-sites.json',import.meta.url),JSON.stringify({checked:'2026-11-27',verification:'CPU geometry/data only; visual acceptance pending',reports,blocks:schoolDetailBlocks,surveys:schoolSites,records},null,2));
console.log(JSON.stringify(reports,null,2));
