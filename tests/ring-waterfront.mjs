import assert from 'node:assert/strict';
import * as T from 'three';
import {createRegionalLayout} from '../dist/regional-survey.js';
import {createSouthCityLayout} from '../dist/south-city-survey.js';
import {createWestLinkLayout} from '../dist/west-link-survey.js';
import {addRingCommerce} from '../dist/ring-commerce.js';
import {addYingxunWaterfront} from '../dist/yingxun-waterfront.js';
import {yingxunPonds} from '../dist/yingxun-park-data.js';
import {createPingyaoCityWall} from '../dist/landmarks/PingyaoCityWall.js';
import {createHeritageMaterials} from '../dist/landmarks/architecture.js';
import {buildingRoadClearance} from '../dist/road-clearance.js';
import {pointInRing} from '../dist/geography.js';
import {mapData} from '../dist/map-data.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),commerce=addRingCommerce(scene,[...createRegionalLayout().roofs,...createSouthCityLayout().roofs,...createWestLinkLayout().roofs]);
const shops=commerce.root.userData.shops;
assert.ok(shops.length>400,'surveyed roofs alone must provide continuous street retail');
for(const road of ['王景慧街','罗哲文路','柳根街','康宁路'])assert.ok(shops.some(s=>s.road===road),road+' missing frontages');
for(const p of shops){assert.ok(buildingRoadClearance.clear(p.apron),'shop apron intersects road');assert.equal(pointInRing(p.x,p.z,mapData.wall),false);assert.ok(!yingxunPonds.some(r=>p.apron.some(q=>pointInRing(...q,r))));}
const lake=addYingxunWaterfront(scene),water=lake.root.getObjectByName('迎薰人工湖水面');
assert.ok(water);assert.equal(lake.root.userData.ponds,2);assert.ok(lake.root.userData.benches.length>=4);
// Triangulation must conserve the actual lake areas, including concave inlets.
const positions=water.geometry.attributes.position,index=water.geometry.index;let area=0;
for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);area+=Math.abs((positions.getX(b)-positions.getX(a))*(positions.getZ(c)-positions.getZ(a))-(positions.getZ(b)-positions.getZ(a))*(positions.getX(c)-positions.getX(a)))/2;}
const expected=yingxunPonds.reduce((sum,r)=>sum+Math.abs(r.reduce((v,p,i)=>{const q=r[(i+1)%r.length];return v+p[0]*q[1]-p[1]*q[0];},0))/2,0);assert.ok(Math.abs(area-expected)<.1);
assert.equal(commerce.root.userData.people,0);assert.equal(lake.root.userData.people,0);
commerce.setNight(true);lake.setNight(true);assert.ok(commerce.root.getObjectByName('沿街店铺分类招牌').material.emissiveIntensity>0);assert.ok(lake.root.getObjectByName('人工湖步道灯').material.emissiveIntensity>0);
commerce.setNight(false);lake.setNight(false);
let triangles=0,draws=0;scene.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));if(o.isInstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));});
assert.ok(draws<650&&triangles<900000,`${draws} draws / ${triangles} triangles`);
const wall=createPingyaoCityWall(createHeritageMaterials());wall.updateMatrixWorld(true);
for(const offset of [-2,0,2]){
 const start=new T.Vector3(-599.3+offset+.09*20,1.7,867),direction=new T.Vector3(-.09,0,-1).normalize();
 assert.equal(new T.Raycaster(start,direction,0,40).intersectObject(wall,true).length,0,'small south gate must connect bridge to inner street');
}
console.log(JSON.stringify({shops:shops.length,pondArea:area,shoreSegments:lake.root.userData.shoreSegments,draws,triangles,checks:'main-road coverage, road/water clearance, real lake area, no people, night lights, finite geometry, open small south portal'}));
