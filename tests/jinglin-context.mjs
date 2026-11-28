import assert from 'node:assert/strict';
import * as T from 'three';
import {addJinglinContext} from '../dist/jinglin-context.js';
import {jinglinContext,jinglinContextRing,jinglinContextWorld,isJinglinContext} from '../dist/jinglin-context-data.js';
import {createWestBlockLayout} from '../dist/west-block-layout.js';
import {planWestFrontages} from '../dist/west-corridor.js';
import {buildingRoadClearance,clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
const noop=()=>{},ctx=new Proxy({},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),context=addJinglinContext(scene,()=>{});scene.updateMatrixWorld(true);
const p=jinglinContext;
assert.ok(p.glass.u+p.glass.w/2<p.lane.u-p.lane.w/2);
assert.ok(p.tax.u-p.tax.w/2>p.lane.u+p.lane.w/2);
for(const b of [p.glass,p.tax]){const [x,z]=jinglinContextWorld(b.u,b.v);assert.ok(buildingRoadClearance.clear(clearanceRect(x,z,b.w,b.d,p.yaw)),'building must not cross public carriageway');}
for(const unit of planWestFrontages().units)assert.ok(unit.shop?.food||!isJinglinContext(unit.x,unit.z),'legacy shop must not occupy context parcel');
for(const plot of createWestBlockLayout().plots)assert.ok(!clearancePolygonsOverlap(clearanceRect(...plot.world,plot.w,plot.d,plot.angle),jinglinContextRing),'legacy interior building overlaps tax office/lane');
for(const du of [-1.4,0,1.4]){
 const from=context.root.localToWorld(new T.Vector3(p.lane.u+du,1.3,5)),dir=new T.Vector3(0,0,-1).transformDirection(context.root.matrixWorld);
 assert.equal(new T.Raycaster(from,dir,0,58).intersectObject(context.root,true).length,0,'lane must be open at walking height');
}
let draws=0,triangles=0;context.root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(draws<30&&triangles<15000);
context.setNight(true);context.dispose();assert.equal(context.root.parent,null);
console.log(JSON.stringify({draws,triangles,order:'glass-lane-tax',lane:'clear',road:'clear',legacyOverlap:'none'}));
