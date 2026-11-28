// CPU geometry/data checks only. Do not create a WebGL renderer or drive the UI.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import {addCivicSites} from '../dist/civic-sites.js';
import {civicSiteSurveys,civicSiteFrames,civicImagePoint,civicWorld,civicDetailBlocks,civicSiteIntersects} from '../dist/civic-sites-data.js';
import {geographicToLocal,localToGeographic} from '../dist/landmarks/coordinates.js';
import {pointInRing} from '../dist/geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from '../dist/road-clearance.js';
import {citySurfaceRoads} from '../dist/city-extension.js';
import {createRegionalLayout} from '../dist/regional-survey.js';
const publicClear=createRoadClearance(citySurfaceRoads.filter(([type])=>!['service','footway','path','pedestrian','steps','cycleway'].includes(type)).map(r=>['trunk','trunk_link'].includes(r[0])?['primary',...r.slice(1)]:r));
for(const s of civicSiteSurveys){
 assert.ok(civicImagePoint(s.id,640,360).every((v,i)=>Math.abs(v-geographicToLocal(civicSiteFrames[s.id].center,'GCJ-02')[i])<1e-6),'shared coordinate origin within numeric precision');
 assert.ok(publicClear.clear(s.boundary),'site paving does not cover public roads');
 for(const p of s.buildings){assert.ok(p.ring.every(q=>pointInRing(...q,s.boundary)),`${s.id}/${p.id} inside parcel`);assert.ok(publicClear.clear(clearanceRect(p.x,p.z,p.w,p.d,p.angle,1)),`${s.id}/${p.id} frontage clears public road`);}
 const [u,v]=s.gate,a=s.gateFacing,passage=clearanceRect(u-Math.sin(a)*5,v-Math.cos(a)*5,3.5,10,a).map(p=>civicWorld(s,...p));
 assert.ok(!s.buildings.some(b=>b.type!=='roof'&&clearancePolygonsOverlap(b.ring,passage)),`${s.id} entry route`);
}
for(let i=0;i<civicSiteSurveys.length;i++)for(let j=i+1;j<civicSiteSurveys.length;j++)assert.equal(clearancePolygonsOverlap(civicSiteSurveys[i].boundary,civicSiteSurveys[j].boundary),false,'sites do not overwrite one another');
const layout=createRegionalLayout();assert.ok(layout.roofs.every(p=>!civicSiteIntersects(p.ring)),'old regional placeholder buildings are removed throughout all four parcels');
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),start=performance.now(),sites=addCivicSites(scene),buildMs=Math.round(performance.now()-start);scene.updateMatrixWorld(true);
const records=[],details=[];let meshes=0,triangles=0,solidInstances=0;
for(const site of sites){
 const survey=civicSiteSurveys.find(s=>s.id===site.record.id),r=site.root.userData.heightRecords,d=site.root.userData.siteDetails;
 assert.equal(r.length,survey.buildings.filter(b=>b.type!=='roof').length);
 assert.ok(d.parking.length>0&&d.trees.length>0&&d.green.length>0&&d.lanes.length>0,'each site has internal detail');
 const buildings=r.map(b=>clearanceRect(b.x,b.z,b.w,b.d,b.angle));
 if(survey.id==='outlets'){
  const shops=site.root.userData.outletsDetails;assert.ok(shops.shopfronts.length>50&&shops.furniture.length>5,'outlets need articulated retail bays and street furniture');
  assert.ok(shops.upperShops.some(p=>p.floor===2)&&shops.upperShops.some(p=>p.floor===3),'upper levels must contain retail detail');
  assert.ok(shops.stairs.length>0&&shops.terraces.length>0,'upper retail must have exterior circulation');
  for(const t of shops.terraces){const ring=t.ring.map(p=>civicWorld(survey,...p));assert.ok(publicClear.clear(ring)&&!buildings.some(b=>clearancePolygonsOverlap(b,ring)),'balcony crosses a building or public road');}
  for(const stair of shops.stairs)if(stair.from===2)assert.ok(shops.stairs.some(a=>a.building===stair.building&&a.from===1&&a.to===2),'upper stair has no lower connection');
  assert.equal(shops.tenants.find(p=>p.name==='Kirakira Beauty').floor,2);
  assert.equal(shops.tenants.length,15,'all 15 sourced brands have distinct storefronts');
  assert.equal(new Set(shops.tenants.map(p=>p.name)).size,15);
  for(const name of ['NIKE','ADIDAS','MCM','PINKO','LACOSTE','必胜客'])assert.ok(shops.tenants.some(p=>p.name===name&&p.w>5&&p.kind),'brand must have a physical display bay');
  assert.ok(shops.tenants.every(p=>p.placementEstimated),'do not claim verified unit assignments');
  site.root.updateMatrixWorld(true);
  for(const p of shops.tenants){
   const sign=site.root.getObjectByName('奥莱品牌店招-'+p.name),a=p.face*Math.PI/2,n=new T.Vector3(Math.sin(a),0,Math.cos(a));
   const end=sign.getWorldPosition(new T.Vector3()),start=site.root.localToWorld(sign.position.clone().addScaledVector(n,5));
   assert.equal(new T.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end)+.03).intersectObject(site.root,true)[0]?.object,sign,p.name+' fascia is hidden by a canopy or floor');
   const b=r.find(b=>b.id===p.building),entryEnd=site.root.localToWorld(new T.Vector3(p.u,b.base+(p.floor-1)*4.15+1.55,p.v)),entryStart=site.root.localToWorld(new T.Vector3(p.u+n.x*2.7,b.base+(p.floor-1)*4.15+1.55,p.v+n.z*2.7));
   assert.equal(new T.Raycaster(entryStart,entryEnd.clone().sub(entryStart).normalize(),0,entryStart.distanceTo(entryEnd)).intersectObject(site.root,true).length,0,p.name+' door approach blocked');
  }
  for(const p of shops.furniture){const world=p.ring.map(a=>civicWorld(survey,...a));assert.ok(!buildings.some(b=>clearancePolygonsOverlap(world,b))&&publicClear.clear(world),'mall furniture outside buildings and public roads');
   for(const lane of d.lanes){const a=civicWorld(survey,...lane.a),b=civicWorld(survey,...lane.b),ring=clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(a[0]-b[0],a[1]-b[1]),lane.width,-Math.atan2(b[1]-a[1],b[0]-a[0]));assert.ok(!clearancePolygonsOverlap(world,ring),'mall furniture blocks circulation');}
  }
 }
 for(const lane of d.lanes){const a=civicWorld(survey,...lane.a),b=civicWorld(survey,...lane.b),ring=clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(a[0]-b[0],a[1]-b[1]),lane.width,-Math.atan2(b[1]-a[1],b[0]-a[0]));assert.ok(!buildings.some(b=>clearancePolygonsOverlap(ring,b)),'internal lanes do not pass through buildings');}
 for(const record of r){for(const key of ['height','levels','buildingType','heightSource','confidence','estimated','footprintSource'])assert.ok(record[key]!==undefined,key);assert.ok(record.estimated&&record.confidence<=.5);records.push({...record,coordinate:localToGeographic([record.x,record.z]),crs:'WGS84'});}
 details.push({id:survey.id,name:survey.name,buildings:r.length,...Object.fromEntries(Object.entries(d).map(([k,v])=>[k,v.length]))});
 site.setNight(true);site.update({position:{x:survey.origin[0],z:survey.origin[1]}});
 assert.ok(site.root.children.some(o=>o.isPointLight&&o.visible),'local lighting available');site.setNight(false);assert.ok(site.root.children.filter(o=>o.isPointLight).every(o=>!o.visible));
 site.root.traverse(o=>{
  if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);
  for(const x of o.geometry.attributes.position.array)assert.ok(Number.isFinite(x));
  if(!o.isInstancedMesh||o.geometry.type!=='BoxGeometry')return;
  const mat=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,mat);const scale=new T.Vector3().setFromMatrixScale(mat);if(scale.y<.4)continue;mat.premultiply(o.matrixWorld);const ring=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>{const p=new T.Vector3(x,0,z).applyMatrix4(mat);return [p.x,p.z];});assert.ok(publicClear.clear(ring),'walls, windows, fences and vehicles clear public roads');solidInstances++;}
 });
}
assert.equal(new Set(records.map(r=>r.id)).size,32);assert.equal(records.find(r=>r.id==='hospital-inpatient').levels,15);assert.ok(records.filter(r=>r.id.startsWith('ziyuechen-')).every(r=>r.levels===6));assert.ok(records.filter(r=>r.id.startsWith('outlets-')).some(r=>r.levels===3));
const report={checked:'2026-11-26',buildings:records.length,buildMs,meshes,triangles,solidInstances,sites:details,checks:'CPU geometry/data only; no browser, GPU, interaction or visual acceptance',acceptance:'pending-user-review'};
if(process.argv.includes('--export'))writeFileSync(new URL('../data/C04-civic-sites.json',import.meta.url),JSON.stringify({report,blocks:civicDetailBlocks,surveys:civicSiteSurveys,records},null,2));
for(const site of sites){site.dispose();site.dispose();}assert.equal(scene.children.length,0,'unload removes every new site');
console.log(JSON.stringify(report,null,2));
