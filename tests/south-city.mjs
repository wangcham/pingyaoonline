import assert from 'node:assert/strict';
import * as T from 'three';
import {createSouthCityLayout,southCityOpenGround,southCitySurvey,southCityAlleys,southImagePoint} from '../dist/south-city-survey.js';
import {createRoadClearance,clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
import {mapData} from '../dist/map-data.js';
import {geographicToLocal} from '../dist/landmarks/coordinates.js';
import {addSouthCity} from '../dist/south-city.js';
const layout=createSouthCityLayout(),roads=createRoadClearance([...mapData.roads,...southCityAlleys.map(p=>['service',p.width,'内部巷道',p.points])]);
assert.ok(layout.roofs.length>200);assert.equal(southCitySurvey.imageryDate,null);
assert.deepEqual(southImagePoint('shuguang',640,360),geographicToLocal([112.184,37.187],'GCJ-02'));
for(const [i,p] of layout.roofs.entries()){
 assert.ok(roads.clear(clearanceRect(p.x,p.z,p.w,p.d,p.angle,1.3)),p.id+' facade road envelope');
 assert.ok(!southCityOpenGround.some(g=>clearancePolygonsOverlap(p.ring,g.ring)),p.id+' field/parking');
 assert.ok(!layout.roofs.slice(i+1).some(q=>clearancePolygonsOverlap(p.ring,q.ring)),p.id+' overlap');
 assert.ok(p.estimated&&p.footprintSource);
}
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new T.Scene(),result=addSouthCity(scene),data=result.root.userData;
assert.equal(data.heightRecords.length,layout.roofs.length);
assert.ok(data.heightRecords.some(r=>r.levels===1&&r.height<5));
assert.ok(data.heightRecords.some(r=>r.levels===6&&r.height>17));
assert.ok(data.heightRecords.every(r=>r.estimated&&r.confidence<=.4&&r.heightSource==='satellite-morphology-estimate'));
assert.ok(data.drawnAlleys.length>1000,'interior alleys');assert.ok(data.forecourtSamples.length>500,'building aprons');
let draws=0,triangles=0;scene.traverse(o=>{if(!o.isMesh)return;draws++;const g=o.geometry;assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));triangles+=(g.index?.count??g.attributes.position.count)/3*(o.count??1);});
assert.ok(draws<20&&triangles<1500000,`${draws} draws ${triangles} triangles`);
result.setNight(true);assert.ok(result.root.children.some(o=>o.material?.emissiveIntensity===.24));result.setNight(false);
console.log(JSON.stringify({buildings:layout.roofs.length,classes:data.heightRecords.reduce((a,r)=>(a[r.heightClass]=(a[r.heightClass]||0)+1,a),{}),alleys:data.drawnAlleys.length,trees:data.treeCount,draws,triangles}));
