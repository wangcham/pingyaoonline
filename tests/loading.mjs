// CPU-only loading/geometry regression. No browser, WebGL context or interaction.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {createRingQuery,pointInRing,segments,projectOnSegment} from '../dist/geography.js';
import {createSurveySurfaces} from '../dist/survey-surfaces.js';
import {addRegionalDistricts} from '../dist/regional-districts.js';
import {collectBuildingRecords} from '../dist/building-heights.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const ring=[[0,0],[8,0],[8,3],[4,3],[4,9],[0,9]],edges=segments([...ring,ring[0]]),query=createRingQuery(ring);
for(let x=-10;x<18;x+=.5)for(let z=-10;z<19;z+=.5)for(const pad of [0,.7,3,8])assert.equal(query.contains(x,z,pad),pointInRing(x,z,ring)||edges.some(e=>projectOnSegment([x,z],e).distance<pad));
const root=new T.Group(),surfaces=createSurveySurfaces(root);
surfaces.polygon([[0,0],[10,0],[10,10],[0,10]],'#999999',0,'paving',[[[4,4],[6,4],[6,6],[4,6]]]);
surfaces.polygon([[20,0],[24,0],[24,3],[20,3]],'#999999',0,'ground');
surfaces.polygon([[30,3],[34,3],[34,0],[30,0]],'#999999',0,'ground');
surfaces.finish();root.updateMatrixWorld(true);
const ray=(x,z)=>new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0),0,10).intersectObject(root,true);
assert.equal(ray(5,5).length,0,'courtyard/pond holes remain holes');assert.ok(ray(2,2).length);assert.ok(ray(22,1).length);assert.ok(ray(32,1).length);
for(const mesh of root.children)for(let i=0;i<mesh.geometry.attributes.normal.count;i++)assert.ok(mesh.geometry.attributes.normal.getY(i)>.99,'upward normals for either ring winding');
function digest(scene){let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);}});return {meshes,triangles};}
const recordsHash=scene=>createHash('sha256').update(JSON.stringify(collectBuildingRecords(scene))).digest('hex');
function dispose(scene){const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){ms.add(o.material);for(const k of ['map','bumpMap','emissiveMap'])if(o.material[k])ts.add(o.material[k]);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());scene.clear();}
let fullScene=new T.Scene(),t=performance.now(),full=addRegionalDistricts(fullScene),fullMs=performance.now()-t;
const fullGeometry=digest(fullScene),fullHash=recordsHash(fullScene),count=collectBuildingRecords(fullScene).length;
dispose(fullScene);full=null;fullScene=null;globalThis.gc?.();
const scene=new T.Scene();t=performance.now();const staged=addRegionalDistricts(scene,{progressive:true}),shellMs=performance.now()-t;
assert.equal(collectBuildingRecords(scene).length,count);assert.equal(recordsHash(scene),fullHash,'all heights and footprints available before detail loading');assert.ok(staged.groups.every(g=>g.proxy?.children.length&&g.state==='pending'));
staged.setNight(true);
const camera={position:{x:-1875,y:2,z:128.7}};let turns=0,maxSlice=0;
while(staged.status.ready<staged.status.total&&turns<10000){const start=performance.now();staged.update(camera,turns*16);maxSlice=Math.max(maxSlice,performance.now()-start);turns++;}
assert.equal(staged.status.failed,0);assert.equal(staged.status.ready,staged.status.total);assert.equal(recordsHash(scene),fullHash,'no duplicate or missing building records after swap');assert.deepEqual(digest(scene),fullGeometry,'progressive loading retains complete geometry');
assert.ok(staged.groups.every(g=>!g.proxy&&g.detail.root.parent===g.root));
for(const g of staged.groups){const pane=g.detail.root.children.find(o=>o.isInstancedMesh&&o.material.emissiveMap);assert.equal(pane.material.emissiveIntensity,.24,'night mode survives a delayed load');}
// A failed detailed build keeps the shell visible and can be retried.
let failedGroup=staged.groups[0]; // use a separate lightweight shell-only scene
const retryScene=new T.Scene(),retry=addRegionalDistricts(retryScene,{progressive:true});failedGroup=retry.groups.reduce((a,b)=>Math.hypot(a.center[0]-camera.position.x,a.center[1]-camera.position.z)<Math.hypot(b.center[0]-camera.position.x,b.center[1]-camera.position.z)?a:b);
const original=failedGroup.config.layout,originalError=console.error;failedGroup.config.layout=()=>{throw Error('intentional loading regression');};console.error=noop;try{retry.update(camera,0);}finally{console.error=originalError;}
assert.equal(retry.status.failed,1);assert.ok(failedGroup.proxy.parent===failedGroup.root);assert.equal(collectBuildingRecords(retryScene).length,count);
failedGroup.config.layout=original;retry.retryFailed();for(let i=0;i<10000&&failedGroup.state!=='ready';i++)retry.update(camera,i*16);assert.equal(failedGroup.state,'ready');assert.equal(retry.status.failed,0);
console.log(JSON.stringify({fullBuildMs:Math.round(fullMs),initialShellsMs:Math.round(shellMs),backgroundSlices:turns,maxCpuSliceMs:Math.round(maxSlice),buildings:count,...fullGeometry,checks:'numeric/CPU only; no browser or GPU'},null,2));
dispose(scene);dispose(retryScene);
