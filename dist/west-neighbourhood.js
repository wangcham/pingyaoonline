import {createUrbanBatch} from './urban-batch.js';
import {createModernSite} from './modern-site.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {westNeighbourBlocks,westNeighbourRecords,westNeighbourRoadClearance} from './west-neighbourhood-data.js';
import {civicSiteSurveys,civicSiteIntersects,civicPublicRoads} from './civic-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {segments,pointInRing,makeGrid} from './geography.js';

const neighbourhoodBuildingGrid=makeGrid(64);
for(const b of [...westNeighbourBlocks,...civicSiteSurveys].flatMap(s=>s.buildings).filter(b=>b.type!=='roof')){
 const ring=clearanceRect(b.x,b.z,b.w,b.d,b.angle,1.15),xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
 neighbourhoodBuildingGrid.add({ring},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));
}
const neighbourhoodLaneClearance=createRoadClearance(westNeighbourBlocks.flatMap(s=>s.lanes.map(l=>['service',l.width+.8,'楼间通道',l.points])));
function neighbourhoodBuildingHit(ring){const candidates=new Set(),xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);for(let x=Math.floor(Math.min(...xs)/64)*64;x<=Math.max(...xs);x+=64)for(let z=Math.floor(Math.min(...zs)/64)*64;z<=Math.max(...zs);z+=64)neighbourhoodBuildingGrid.at(x+.01,z+.01).forEach(b=>candidates.add(b));return [...candidates].some(b=>clearancePolygonsOverlap(ring,b.ring));}
// Per-block construction is resumable: the loader yields between authored rows.
export function* createWestNeighbourhoodSteps(scene,survey){
 const s=createModernSite(scene,survey,{leafDensity:20,chunkSize:100}),{box,glass,part,trees}=s;
 const ground=createSurveySurfaces(s.root,{ground:s.ground}),details={lanes:[],green:[],trees:[],parking:[],furniture:[],shopfronts:[],sidewalks:[]};
 const local=p=>[p[0]-survey.origin[0],p[1]-survey.origin[1]],world=(u,v)=>[u+survey.origin[0],v+survey.origin[1]];
 const distant=createUrbanBatch(s.root,{chunkSize:100});
 const treePoints=[],paint='#d4d2bd';let lampCount=0;
 function belongs(x,z){return survey.query.contains(x,z)||survey.buildings.some(b=>b.query.contains(x,z));}
 function safe(ring,{buildings=true,lanes=true}={}){
  if(!ring.every(p=>belongs(...p))||civicSiteIntersects(ring)||!westNeighbourRoadClearance.clear(ring))return false;
  return (!buildings||!neighbourhoodBuildingHit(ring))&&(!lanes||neighbourhoodLaneClearance.clear(ring));
 }
 function rect(x,z,w,d=w,a=0,opts){return safe(clearanceRect(x,z,w,d,a),opts);}
 function block(color,x,y,z,w,h,d,a=0){const [u,v]=local([x,z]);box(color,u,s.ground(u,v)+y,v,w,h,d,a);}
 function line(color,a,b,w=.12,h=.04,y=.26){s.line(color,local(a),local(b),w,h,y);}
 function polygon(ring,color,y=.2,kind='paving'){ground.polygon(ring.map(local),color,y,kind);}
 function strip(a,b,w,color,y=.23,kind='asphalt'){ground.strip(local(a),local(b),w,color,y,kind);}
 function bounds(ring){const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);return [Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
 function plant(x,z,index=0){
  if(!rect(x,z,3.2)||treePoints.some(p=>Math.hypot(p[0]-x,p[1]-z)<6))return false;
  const [u,v]=local([x,z]);trees.tree({x:u,z:v,height:5.4+(index%4)*.55,crown:3.8+(index%3)*.35,base:.3},index);// Distant trees keep a solid irregular crown; full branches return nearby.
  const base=s.ground(u,v);distant.part('stem','#716855',u,base+2.2,v,.2,4.4,.2);
  for(const [dx,dy,dz,w,h] of [[-.65,4.8,0,2.9,3.3],[.7,5.2,.45,2.8,3.1],[0,6,-.55,2.6,2.6]])distant.part('globe','#6c805b',u+dx,base+dy,v+dz,w,h,w);
  treePoints.push([x,z]);details.trees.push({x,z,estimated:true});return true;
 }
 function bench(x,z,a=0){if(!rect(x,z,2.4,1.1,a))return;const c=Math.cos(a),sn=Math.sin(a);for(const t of [-.8,.8])block('#4b524a',x+t*c,.51,z-t*sn,.12,.6,.65,a);for(let i=0;i<4;i++)block('#89785d',x+(i*.17-.25)*sn,.8,z+(i*.17-.25)*c,2.1,.09,.13,a);block('#8f7c5f',x-.35*sn,1.04,z-.35*c,2.1,.45,.12,a);details.furniture.push({kind:'bench',x,z});}
 function lamp(x,z){if(lampCount>=4||!rect(x,z,.7))return;const [u,v]=local([x,z]);s.lamp(u,v,5.7);lampCount++;details.furniture.push({kind:'lamp',x,z});}
 // Ground cells are merged into one geometry per material. Strict clipping
 // retains the public roads and the four existing detailed compounds.
 const [left,top,right,bottom]=bounds(survey.boundary),step=5;
 for(let z=Math.floor(top/step)*step;z<bottom;z+=step){
  for(let x=Math.floor(left/step)*step;x<right;x+=step){
   const ring=clearanceRect(x+step/2,z+step/2,step,step);
   if(!safe(ring,{buildings:false,lanes:false}))continue;
   // Overlapping trace frames have one surface owner, avoiding coplanar floors.
   const owner=westNeighbourBlocks.find(b=>b.query.contains(x+step/2,z+step/2));if(owner&&owner.id!==survey.id)continue;
   polygon(ring,'#a49f90',.185,'courtyard');
  }
  if(Math.round(z/step)%20===0)yield;
 }
 for(const [index,p] of survey.buildings.entries()){
  const b=s.building({...p,trimColor:p.levels>=10?'#ded6bf':'#c4baa7',glassColor:'#596c70',roofColor:p.pitched?'#836d5c':'#8d9084'},{photoLevels:true});
  distant.box(p.color,b.u,b.base+b.h/2,b.v,b.w,b.h,b.d,p.angle);
  distant.box('#8c8879',b.u,b.base+b.h+.3,b.v,b.w+.2,.5,b.d+.2,p.angle);
  if(p.pitched)distant.part('roof','#776b5e',b.u,b.base+b.h+.45,b.v,b.w+.35,Math.min(2.5,b.d*.18),b.d+.35,p.angle);
  const c=Math.cos(p.angle),sn=Math.sin(p.angle),at=(fn,col,x,y,z,w,h,d,a=0)=>fn(col,b.u+x*c+z*sn,b.base+y,b.v-x*sn+z*c,w,h,d,p.angle+a);
  if(p.pitched){
   const rise=Math.min(2.5,b.d*.18);part('roof','#776b5e',b.u,b.base+b.h+.45,b.v,b.w+.35,rise,b.d+.35,p.angle);
   at(box,'#b2a28c',0,b.h+rise+.52,0,b.w+.4,.16,.2);
   for(let x=-b.w/2+2;x<b.w/2;x+=5.5)at(box,'#8e8271',x,b.h+rise*.7,b.d*.16,.7,.9,.7);
  }
  for(const side of [-1,1]){
   const face=p.angle+(side<0?Math.PI:0),front=b.d/2;
   for(let x=-b.w/2+5;x<b.w/2-2;x+=11.5){
    at(glass,'#394c50',x,1.25,side*(front+.2),1.45,2.5,.14);
    at(box,'#aaa28f',x,2.65,side*(front+.5),2.5,.16,1.1);
    at(box,'#98988a',x,.26,side*(front+.65),2.7,.25,1.05);
    if(p.type==='residential')for(let f=1;f<b.levels;f++){
     const y=f*(b.h/b.levels)+.5;
     at(box,'#aba795',x,y,side*(front+.52),3.2,.16,.9);
     at(glass,'#687c7d',x,y+1.03,side*(front+.9),2.95,1.85,.08);
     for(const dx of [-1.5,0,1.5])at(box,'#d4d1c0',x+dx,y+1.03,side*(front+.95),.06,2.05,.08);
    }
   }
   if(p.frontage&&(p.type==='commercial'||side===1)){
    const bays=Math.max(1,Math.round(b.w/5.3)),width=b.w/bays;
    for(let i=0;i<bays;i++){
     const x=-b.w/2+(i+.5)*width,colors=['#655d50','#526768','#754e43','#6b6b59'];
     at(glass,'#40585f',x,1.5,side*(front+.28),width-.35,2.7,.13);
     at(box,'#cbc5b3',x-width/2+.12,1.5,side*(front+.38),.24,3,.3);
     at(box,colors[(i+index)%colors.length],x,3.15,side*(front+.44),width-.22,.66,.18);
     at(box,'#a6b1af',x,1.5,side*(front+.4),.06,2.7,.07);
     // Continuous signboard bays, without invented shop names or brands.
     for(let k=0;k<3;k++)at(box,'#bdb49c',x-.5+k*.48,3.15,side*(front+.55),.22,.18,.025);
     if(i%3===0)at(box,colors[(i+1)%4],x,2.74,side*(front+.58),width-.4,.16,1.1);
     at(box,'#aaa99c',x+width*.32,3.95,side*(front+.48),.72,.55,.5);
     details.shopfronts.push({building:p.id,side,bay:i,estimated:true});
    }
   }
   // Street-side planting follows the observed parallel strips between rows.
   for(let x=-b.w/2+4;x<b.w/2;x+=4){
    const [cx,cz]=world(b.u+x*c+side*(front+6)*sn,b.v-x*sn+side*(front+6)*c),ring=clearanceRect(cx,cz,3.9,2.3,p.angle);
    if(!safe(ring))continue;polygon(ring,'#788266',.27,'ground');details.green.push(ring);
    if(Math.round((x+b.w/2)/4)%5===1&&side===1)plant(cx,cz,index+Math.round(x));
   }
   if(side===1){const [x,z]=world(b.u+(front+10)*sn,b.v+(front+10)*c);bench(x,z,face);if(index%7===0)lamp(x+3*c,z-3*sn);}
  }
  // Stair rooms, rooftop ducts and solar hot-water arrays distinguish near views.
  if(!p.pitched&&p.levels>2){
   at(box,'#b5b4a6',b.w*.2,b.h+1.2,0,3.4,2.4,3.6);
   for(let n=0;n<Math.floor(b.w/18);n++){const x=-b.w*.3+n*13;at(box,'#506e79',x,b.h+.65,-b.d*.15,2.6,.16,1.45);at(box,'#b3b8ae',x,b.h+.98,-b.d*.15-.7,2.5,.36,.35);}
  }
  if(index%4===3)yield;
 }
 // Internal roads and footways are clipped against full wall envelopes.
 for(const l of survey.lanes)for(const e of segments(l.points)){
  const count=Math.ceil(e.length/2),dx=(e.end[0]-e.start[0])/count,dz=(e.end[1]-e.start[1])/count,a=-Math.atan2(dz,dx),len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  for(let i=0;i<count;i++){
   const p=[e.start[0]+dx*i,e.start[1]+dz*i],q=[p[0]+dx,p[1]+dz],x=(p[0]+q[0])/2,z=(p[1]+q[1])/2,ring=clearanceRect(x,z,len+.02,l.width,a);
   if(!safe(ring,{lanes:false}))continue;
   strip(p,q,l.width,l.width<3?'#b8af9b':'#747975',.235,l.width<3?'paving':'asphalt');details.lanes.push({a:p,b:q,width:l.width});
   for(const side of [-1,1]){
    const a1=[p[0]+nx*side*(l.width/2+1),p[1]+nz*side*(l.width/2+1)],b1=[q[0]+nx*side*(l.width/2+1),q[1]+nz*side*(l.width/2+1)],r=clearanceRect((a1[0]+b1[0])/2,(a1[1]+b1[1])/2,len,1.6,a);
    if(safe(r,{lanes:false})){strip(a1,b1,1.6,'#b4afa0',.29,'paving');details.sidewalks.push(r);}
   }
   if(i%17===5){block('#555f58',x,.254,z,.65,.035,.65,a);for(let k=0;k<4;k++)block('#a2a394',x-.2+k*.14,.276,z,.035,.012,.5,a);}
   if(i%11===3)for(const side of [-1,1]){
    const px=x+nx*side*(l.width/2+4.4),pz=z+nz*side*(l.width/2+4.4),ring=clearanceRect(px,pz,2.55,4.8,a);
    if(!safe(ring))continue;
    const c=Math.cos(a),sn=Math.sin(a);for(const off of [-1.2,1.2])line(paint,[px+off*c-2.35*sn,pz-off*sn-2.35*c],[px+off*c+2.35*sn,pz-off*sn+2.35*c],.09,.02,.32);
    details.parking.push({x:px,z:pz,angle:a});
    if(details.parking.length%8===1){
     block(['#d0d2ca','#596567','#b6b1a3'][details.parking.length%3],px,.85,pz,1.7,.65,3.8,a);
     const [u,v]=local([px,pz]);glass('#42585f',u,s.ground(u,v)+1.35,v,1.55,.55,2.05,a);
     for(const side of [-1,1])for(const along of [-1.15,1.15])part('globe','#303833',u+side*.85*c+along*sn,s.ground(u,v)+.52,v-side*.85*sn+along*c,.22,.5,.5,a);
     details.furniture.push({kind:'parked-car',x:px,z:pz,estimated:true});
    }
   }
  }
  yield;
 }
 // Trace-based planted courts; species and exact planting density are estimates.
 for(const g of survey.greens){
  const [l,t,r,b]=bounds(g.ring);let n=0;
  for(let z=t+1.5;z<b;z+=3)for(let x=l+1.5;x<r;x+=3){
   const ring=clearanceRect(x,z,3,3);if(!ring.every(p=>pointInRing(...p,g.ring))||!safe(ring))continue;
   polygon(ring,'#738363',.275,'ground');details.green.push(ring);
   if(n++%33===0){plant(x,z,n);const [u,v]=local([x+1.4,z]);if(rect(x+1.4,z,1.4))part('globe','#607855',u,s.ground(u,v)+.7,v,1.4,1,1.2);}
  }
  for(const e of segments([...g.ring,g.ring[0]])){
   const n=Math.ceil(e.length/3);for(let i=0;i<n;i++){const p=[e.start[0]+(e.end[0]-e.start[0])*i/n,e.start[1]+(e.end[1]-e.start[1])*i/n],q=[e.start[0]+(e.end[0]-e.start[0])*(i+1)/n,e.start[1]+(e.end[1]-e.start[1])*(i+1)/n],x=(p[0]+q[0])/2,z=(p[1]+q[1])/2,a=-Math.atan2(q[1]-p[1],q[0]-p[0]);if(rect(x,z,e.length/n,1.5,a))strip(p,q,1.5,'#b8b09b',.3,'paving');if(i%9===0)bench(x,z,a);}
  }yield;
 }
 for(const c of survey.courts){const [l,t,r,b]=bounds(c.ring);for(let x=l+2;x<r;x+=4)for(let z=t+2;z<b;z+=4){const ring=clearanceRect(x,z,4,4);if(ring.every(p=>pointInRing(...p,c.ring))&&safe(ring))polygon(ring,'#b7b3a3',.28,'paving');}}
 // The school track stays an open sports area, not residential infill.
 for(const p of survey.sports){
  const c=Math.cos(p.angle),sn=Math.sin(p.angle),at=(x,z)=>[p.center[0]+x*c+z*sn,p.center[1]-x*sn+z*c],oval=(inset=0)=>Array.from({length:64},(_,i)=>{const a=i*Math.PI*2/64;return at(Math.cos(a)*(p.w/2-inset),Math.sin(a)*(p.d/2-inset));});
  const outer=oval();if(!civicSiteIntersects(outer)&&westNeighbourRoadClearance.clear(outer)&&!neighbourhoodBuildingHit(outer)){
   polygon(outer,'#8e8068',.3,'ground');polygon(oval(6),'#728568',.31,'ground');
   for(let k=1;k<=4;k++){const ring=oval(k*1.2);for(const e of segments([...ring,ring[0]]))line('#c2beaa',e.start,e.end,.07,.012,.32);}
   for(const z of [-p.d*.31,p.d*.31]){const a=at(-3.5,z),b=at(3.5,z);for(const q of [a,b])block('#c3c9b9',q[0],1.3,q[1],.09,2.4,.09);line('#c3c9b9',a,b,.09,.09,2.5);}
   details.furniture.push({kind:'sports-track',x:p.center[0],z:p.center[1]});
  }
 }
 // Public-road edges are derived from the existing road network. Keep original
 // road centre lines, controls and map rendering untouched.
 for(const [,width,,points] of civicPublicRoads)for(const e of segments(points)){
  if(Math.max(e.start[0],e.end[0])+width+15<left||Math.min(e.start[0],e.end[0])-width-15>right||Math.max(e.start[1],e.end[1])+width+15<top||Math.min(e.start[1],e.end[1])-width-15>bottom)continue;
  const n=Math.ceil(e.length/5),dx=(e.end[0]-e.start[0])/e.length,dz=(e.end[1]-e.start[1])/e.length;
  if(!e.start||e.length<.1)continue;
  for(let i=0;i<n;i++)for(const side of [-1,1]){
   const x=e.start[0]+dx*e.length*(i+.5)/n-dz*side*(width/2+1.8),z=e.start[1]+dz*e.length*(i+.5)/n+dx*side*(width/2+1.8);
   if(!belongs(x,z))continue;const a=-Math.atan2(dz,dx),ring=clearanceRect(x,z,e.length/n,2.8,a);
   if(!safe(ring))continue;polygon(ring,'#b1ab9c',.28,'paving');details.sidewalks.push(ring);
   if(i%4===0)plant(x-dz*side*2.8,z+dx*side*2.8,i);
   if(i%11===0){block('#626e5f',x,.7,z,.55,1.1,.5,a);details.furniture.push({kind:'bin',x,z});}
  }
 }
 if(lampCount===0){const p=details.trees[0];if(p)lamp(p.x+3,p.z);}
 s.root.userData.neighbourhoodDetails=details;
 const surfaceController=ground.finish(),controller=s.finish(),release=controller.dispose,baseUpdate=controller.update;
 const nearMeshes=[];s.root.traverse(o=>{if(o.isInstancedMesh&&o.userData.chunkId)nearMeshes.push(o);});
 const farRoot=distant.finish(),chunks=new Map();
 for(const [meshes,far] of [[nearMeshes,false],[farRoot.children,true]])for(const mesh of meshes){const id=mesh.userData.chunkId;if(!chunks.has(id))chunks.set(id,{id,near:true,nearMeshes:[],farMeshes:[]});chunks.get(id)[far?'farMeshes':'nearMeshes'].push(mesh);mesh.visible=!far;}
 let lastLod=-Infinity;controller.update=(camera,now=performance.now())=>{if(disposed)return;baseUpdate(camera);if(now-lastLod<150)return;lastLod=now;
  for(const chunk of chunks.values()){const [cx,cz]=chunk.id.split(':').map(Number),x=survey.origin[0]+(cx+.5)*100,z=survey.origin[1]+(cz+.5)*100,distance=Math.hypot(camera.position.x-x,camera.position.z-z,(camera.position.y??0)-10);chunk.near=distance<(chunk.near?470:370);chunk.nearMeshes.forEach(m=>m.visible=chunk.near);chunk.farMeshes.forEach(m=>m.visible=!chunk.near);}
 };s.root.userData.detailChunks=chunks;
 let disposed=false;
 controller.dispose=()=>{if(disposed)return;disposed=true;surfaceController.dispose();release();};controller.record=westNeighbourRecords.find(r=>r.id===survey.id);return controller;
}
export async function addWestNeighbourhood(scene,survey,checkpoint=async()=>{}){
 const steps=createWestNeighbourhoodSteps(scene,survey);let next=steps.next(),start=performance.now();
 while(!next.done){if(performance.now()-start>8){await checkpoint(`正在细化${survey.name}…`);start=performance.now();}next=steps.next();}return next.value;
}
