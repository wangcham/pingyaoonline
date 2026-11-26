import * as T from 'three';
import {createModernSite} from './modern-site.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {civicSiteSurveys,civicSiteRecords,civicLocal,civicWorld,civicPublicRoads} from './civic-sites-data.js';
import {pointInRing,segments} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';

// Detailed surfaces and furniture share instanced batches. All positions are
// measured in the site's local metre frame; no second GCJ transform at render.
const civicPublicClearance=createRoadClearance(civicPublicRoads);
export function addCivicSite(scene,survey){
 const s=createModernSite(scene,survey),{box,glass,part,line,pad,sign,trees}=s;
 const image=p=>civicLocal(survey,p),polygon=p=>p.map(image),masses=[],detailRecords={trees:[],parking:[],furniture:[],lanes:[],green:[]};
 const greenSurfaces=createSurveySurfaces(s.root,{ground:s.ground});
 const boundary=survey.boundary.map(s.local),localLanes=survey.lanes.map(l=>({...l,points:polygon(l.points)}));
 const buildingRings=survey.buildings.filter(b=>b.type!=='roof').map(b=>clearanceRect(b.u,b.v,b.w+.7,b.d+.7));
 const laneRings=localLanes.flatMap(l=>segments(l.points).map(e=>clearanceRect((e.start[0]+e.end[0])/2,(e.start[1]+e.end[1])/2,e.length,l.width,-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]))));
 function safeRing(ring,{lanes=true}={}){
  return ring.every(p=>pointInRing(...p,boundary))&&!buildingRings.some(b=>clearancePolygonsOverlap(ring,b))&&(!lanes||!laneRings.some(l=>clearancePolygonsOverlap(ring,l)))&&civicPublicClearance.clear(ring.map(p=>civicWorld(survey,...p)));
 }
 function safe(u,v,w=1,d=w,{lanes=true}={}){
  return safeRing(clearanceRect(u,v,w,d),{lanes});
 }
 function frameBox(fn,color,u,y,v,w,h,d,a=0){fn(color,u,s.ground(u,v)+y,v,w,h,d,a);}
 s.surface(boundary,survey.kind==='outlets'?'#aaa69c':survey.kind==='residential'?'#a3a297':'#b2b0a5',.16,'pavers');
 const paint=survey.kind==='hospital'?'#d2d1c3':survey.kind==='outlets'?'#c5b293':survey.kind==='residential'?'#71685e':'#cecbbb';
 for(const p of survey.buildings){
  if(p.type==='roof')continue;
  const role=survey.kind==='hospital'?({inpatient:'住院综合楼',outpatient:'门诊楼','medical-west':'医技西翼','medical-link':'连接楼体','south-west':'南部楼体','north-annex':'北部附楼','west-annex':'西部附楼','south-annex':'南侧附楼',canteen:'东南附楼'}[p.id]??p.id):survey.kind==='residential'?`${p.id} 号楼（编号按地图）`:p.id==='main'?'主楼':'商业/附属楼体';
  const b=s.building({...p,name:`${survey.name} · ${role}`,color:paint,trimColor:survey.kind==='residential'?'#a69b89':'#d4d1c3',glassColor:survey.kind==='outlets'?'#3e525c':'#596e74',pierColor:'#b3b4a7',roofColor:survey.kind==='government'?'#496986':'#85877c',storeyHeight:survey.kind==='hospital'?3.8:survey.kind==='outlets'?4.15:undefined},{photoLevels:true});
  masses.push(b);
  // Every building has articulated entrances, glazing, frames, plinth and roof.
  // Extra façade signatures distinguish the four sites without invented tenants.
  for(const face of [0,Math.PI]){
   const cs=Math.cos(face),sn=Math.sin(face),at=(fn,col,dx,y,ww,hh,dd,off=.3)=>fn(col,b.u+dx*cs+(b.d/2+off)*sn,b.base+y,b.v-dx*sn+(b.d/2+off)*cs,ww,hh,dd,face);
   if(survey.kind==='hospital'){
    for(let f=1;f<b.levels;f++)at(box,f%3===0?'#a6aca9':'#deddd1',0,f*(b.h/b.levels)-.22,b.w,.42,.22);
    for(let x=-b.w/2+4;x<b.w/2;x+=8)at(box,'#bdc4c2',x,b.h/2,.18,b.h,.2);
   }else if(survey.kind==='outlets'){
    at(glass,'#3b4d55',0,2.05,b.w-.5,3.7,.14,.27);at(box,'#383f3e',0,4.15,b.w,.9,.35,.3);
    for(let x=-b.w/2+1.8;x<b.w/2;x+=4){at(box,'#bfae93',x,2.1,.32,4.2,.5,.4);at(box,'#a8b2b0',x+1.3,1.95,.06,3.8,.07,.38);at(box,'#a59d8a',x,4.72,3.6,.16,1.15,.65);}
    for(let f=1;f<b.levels;f++)at(box,'#e0d2b8',0,f*4.15+.22,b.w,.48,.32);
   }else if(survey.kind==='residential'){
    for(let x=-b.w/2+5;x<b.w/2-2;x+=12){
     at(box,'#4c514c',x,1.2,1.5,2.4,.16,.32);at(box,'#b5b1a1',x,2.7,2.5,.2,1.4,.8);
     for(let f=1;f<b.levels;f++){
      at(box,'#a39c8c',x,f*3.05+.55,3.2,.17,.9,.6);at(glass,'#607071',x,f*3.05+1.65,2.9,2,.12,.91);
      for(const dx of [-1.5,0,1.5])at(box,'#c6c8bb',x+dx,f*3.05+1.65,.07,2.12,.1,.99);
      at(box,'#b0b4aa',x+3.1,f*3.05+.68,.75,.52,.48,.52);at(box,'#525e5b',x+3.1,f*3.05+.68,.5,.31,.02,.78);
     }
    }
    // Roof stair enclosure and open roof screen, visible in the reference photo.
    for(let x=-b.w/2+1;x<b.w/2;x+=3.5)at(box,'#a99f8e',x,b.h+1.1,.12,1.35,.12,-.35);
    at(box,'#958a77',0,b.h+1.8,b.w,.14,.24,-.35);
   }
  }
  for(let k=0;k<Math.floor(b.w/15);k++){
   box('#a3aaa6',b.u-b.w*.3+k*8,b.base+b.h+.65,b.v-b.d*.15,2.1,.95,1.5);
   for(let j=0;j<5;j++)box('#626d69',b.u-b.w*.3+k*8,b.base+b.h+.65,b.v-b.d*.15-.5+j*.25,1.8,.05,.06);
  }
 }
 // Base paving, then one distinct layer each for lanes, planters and markings.
 for(const lane of localLanes)for(const e of segments(lane.points)){
  const count=Math.ceil(e.length/1.5);
  for(let j=0;j<count;j++){
   const a=[e.start[0]+(e.end[0]-e.start[0])*j/count,e.start[1]+(e.end[1]-e.start[1])*j/count],b=[e.start[0]+(e.end[0]-e.start[0])*(j+1)/count,e.start[1]+(e.end[1]-e.start[1])*(j+1)/count],u=(a[0]+b[0])/2,v=(a[1]+b[1])/2;
   if(!safe(u,v,lane.width,lane.width,{lanes:false}))continue;
   line(survey.kind==='outlets'?'#898a81':'#737975',a,b,lane.width,.055,.215);detailRecords.lanes.push({a,b,width:lane.width});
   const nx=-(b[1]-a[1])/e.length*count,nz=(b[0]-a[0])/e.length*count;
   for(const side of [-1,1])line('#bcbcaf',[a[0]+nx*side*lane.width/2,a[1]+nz*side*lane.width/2],[b[0]+nx*side*lane.width/2,b[1]+nz*side*lane.width/2],.16,.17,.25);
  }
 }
 for(const poly of survey.green){
  const ring=polygon(poly),xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
  // Clip traced planting areas against actual building and lane envelopes.
  // Batch small cells instead of drawing grass across the access road.
  for(let u=Math.min(...xs)+.75;u<Math.max(...xs);u+=1.5)for(let v=Math.min(...zs)+.75;v<Math.max(...zs);v+=1.5){
   const cell=clearanceRect(u,v,1.5,1.5);if(!cell.every(p=>pointInRing(...p,ring))||!safeRing(cell))continue;
   greenSurfaces.polygon(cell,'#728061',.27,'ground');detailRecords.green.push(cell);
  }
  for(const e of segments([...ring,ring[0]]))if(safeRing(clearanceRect((e.start[0]+e.end[0])/2,(e.start[1]+e.end[1])/2,e.length,.3,-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]))))line('#a8a99b',e.start,e.end,.18,.22,.29);
 }
 // Parking spaces follow traced parking bands, never fill the central drive.
 for(const band of survey.parking){
  const [a,b]=polygon(band),dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),cs=dx/length,sn=dz/length,angle=-Math.atan2(dz,dx);
  for(let t=2.6,index=0;t<length-2.6;t+=2.65,index++){
   const u=a[0]+cs*t,v=a[1]+sn*t;if(!safeRing(clearanceRect(u,v,2.6,5.1,angle)))continue;
   for(const offset of [-1.25,1.25])line('#dbd8c6',[u+cs*offset-sn*2.5,v+sn*offset+cs*2.5],[u+cs*offset+sn*2.5,v+sn*offset-cs*2.5],.09,.018,.27);
   line('#dbd8c6',[u-cs*1.25-sn*2.5,v-sn*1.25+cs*2.5],[u+cs*1.25-sn*2.5,v+sn*1.25+cs*2.5],.09,.018,.27);
   frameBox(box,'#555c55',u+sn*1.95,.31,v-cs*1.95,1.7,.12,.15,angle);
   detailRecords.parking.push([u,v]);
   // A minority of bays have simple parked cars; no vehicles on circulation lanes.
   if(index%4===1){frameBox(box,['#d5d7d1','#586367','#b8b2a5'][index%3],u,.83,v,1.75,.65,3.8,angle);frameBox(glass,'#46575c',u+sn*.15,1.38,v-cs*.15,1.55,.6,2.05,angle);for(const side of [-1,1])for(const along of [-1.15,1.15])part('globe','#303936',u+side*.85*cs-along*sn,s.ground(u,v)+.53,v+side*.85*sn+along*cs,.22,.52,.52,angle);}
  }
 }
 for(const [i,px] of survey.trees.entries()){
  const [u,v]=image(px);if(!safe(u,v,2.2,2.2))continue;
  pad(u,v,2.1,2.1,'#65774e',.3,'soil');for(const side of [-1,1]){frameBox(box,'#b0ae9d',u+side*1.05,.35,v,.15,.2,2.25);frameBox(box,'#b0ae9d',u,.35,v+side*1.05,2.1,.2,.15);}
  trees.tree({x:u,z:v,height:5.4+i%3*.7,crown:3.2+i%4*.35,base:.32},i);detailRecords.trees.push([u,v]);
 }
 function bench(u,v){if(!safe(u,v,2.5,1.2))return;for(const x of [-.8,.8])frameBox(box,'#414b44',u+x,.45,v,.12,.6,.65);for(let j=0;j<4;j++)frameBox(box,'#8c765a',u,.78,v-.25+j*.17,2.1,.09,.13);frameBox(box,'#8c765a',u,1.05,v-.34,2.1,.45,.1);detailRecords.furniture.push({kind:'bench',u,v});}
 for(const poly of survey.green){const pts=polygon(poly),[u,v]=pts.reduce((a,p)=>[a[0]+p[0]/pts.length,a[1]+p[1]/pts.length],[0,0]);bench(u,v);}
 // Service furniture sits on the edge of open paving, with no random infill.
 for(const [i,p] of survey.trees.entries())if(i%4===0){
  const [u,v]=image(p);if(!safe(u+3,v,1.5,1.5))continue;
  frameBox(box,'#647366',u+3,.65,v,.6,1.05,.55);frameBox(box,'#acb5a3',u+3,1.2,v,.65,.12,.6);
  if(safe(u+4,v,1,1)){s.lamp(u+4,v,5);detailRecords.furniture.push({kind:'lamp',u:u+4,v});}
 }
 // Manhole and storm drain gratings: finite authored placements by paths.
 for(const lane of localLanes)for(const [i,p] of lane.points.entries())if(i%2===1&&safe(...p,1,1,{lanes:false})){
  frameBox(box,'#555f5c',p[0],.26,p[1],.65,.03,.65);
  for(let j=0;j<5;j++)frameBox(box,'#91968a',p[0]-.24+j*.12,.281,p[1],.035,.01,.5);
 }
 function entrance(p,width,face=0,text=''){
  const a=face,c=Math.cos(a),sn=Math.sin(a),[u,v]=p,base=s.ground(u,v);
  // Canopy, step treads, ramp and handrail leave a clear centre passage.
  box('#d1cfc0',u,base+4.1,v,width,.22,3.6,a);glass('#708b90',u,base+4.24,v,width-.4,.06,3.2,a);
  for(const side of [-1,1])box('#7e8b89',u+side*(width/2-.3)*c,base+2,v-side*(width/2-.3)*sn,.16,4,.16);
  for(let k=0;k<3;k++)box('#adada1',u+(1.5+k*.32)*sn,base+.15+k*.06,v+(1.5+k*.32)*c,width-.7,.16,1.15,a);
  if(text)sign(text,u+1.86*sn,base+3.35,v+1.86*c,width-.5,.8,a,survey.kind==='hospital'?'#7d2f32':'#4d5f58','#f2ead5');
  // A separate accessible route along the canopy side, with a sloped solid mesh.
  const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(5,0);shape.lineTo(5,.45);shape.lineTo(0,.03);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:1.5,bevelEnabled:false}),mat=new T.MeshStandardMaterial({color:'#b6b6aa',roughness:.9});
  const ramp=new T.Mesh(geo,mat);ramp.position.set(u-(width/2+5)*c+3*sn,base+.16,v+(width/2+5)*sn+3*c);ramp.rotation.y=a;ramp.receiveShadow=true;s.root.add(ramp);
 }
 if(survey.kind==='hospital'){
  const p=masses.find(p=>p.id==='hospital-outpatient'),base=p.base;
  entrance([p.u+p.w/2+2,p.v],13,Math.PI/2,'门诊');
  sign('平遥县人民医院',p.u,base+p.h+1.9,p.v+p.d/2+.25,Math.min(27,p.w),1.65,0,'#e2dfce','#a23f3d');
  const tower=masses.find(p=>p.id==='hospital-inpatient');sign('住院综合楼',tower.u,tower.base+tower.h+1.3,tower.v+tower.d/2+.35,23,1.5,0,'#d6d8cb','#8a3433');
  const [u,v]=image([802,390]);sign('急诊',u,s.ground(u,v)+3.1,v,5.5,1.05,Math.PI/2,'#9b3a3a','#f4e7d2');
 }else if(survey.kind==='government'){
  const main=masses.find(p=>p.id==='government-main');
  for(const p of survey.buildings.filter(p=>p.type==='roof'))box('#d0cdbd',p.u,main.base+main.h+1.3,p.v,p.w,2.6,p.d);
  entrance([main.u,main.v+main.d/2+2],15,0,'政务服务');
  sign('平遥县政务服务中心',main.u,main.base+main.h-1.2,main.v+main.d/2+.42,Math.min(44,main.w),1.55,0,'#dedccf','#8e3634');
  for(const du of [-5,0,5])frameBox(box,'#a9b4b0',survey.gate[0]+du,5.1,survey.gate[1]-16,.1,9.7,.1);
 }else if(survey.kind==='residential'){
  const [u,v]=survey.gate;
  for(const side of [-1,1])frameBox(box,'#605b52',u,2.2,v+side*5,1,4.4,.9);
  frameBox(box,'#ada28d',u,4.55,v,1.7,.55,11.3);
  sign('紫悦宸',u+.91,s.ground(u,v)+4.55,v,8,.6,Math.PI/2,'#695f50','#e7d8ad');
  if(safe(u-4,v+7,3.5,3.5,{lanes:false})){frameBox(box,'#b6b0a0',u-4,1.5,v+7,3,3,3);frameBox(glass,'#607876',u-2.45,1.8,v+7,.05,1.1,2.5);}
  frameBox(box,'#e3e1ce',u-.7,1.15,v-2,.12,.12,5.5);
  // Small bicycle shelter and resident seating near the southeast open area.
  const [bu,bv]=image([893,488]);if(safe(bu,bv,7,4)){frameBox(glass,'#718584',bu,2.6,bv,6.5,.14,3);for(const du of [-3,3])frameBox(box,'#6b7470',bu+du,1.35,bv,.1,2.7,.1);for(let i=0;i<6;i++)frameBox(box,'#9caaa4',bu-2.5+i, .65,bv,.05,.8,1);}
 }else{
  // Photo reference: broad folded canopy bridging two modern commercial wings.
  const [u,v]=survey.gate,face=Math.PI/2,base=s.ground(u,v),w=21;
  const outline=new T.Shape();outline.moveTo(-w/2,15.5);outline.lineTo(-w/2,16.3);outline.lineTo(0,15.1);outline.lineTo(w/2,16.3);outline.lineTo(w/2,15.5);outline.lineTo(0,14.3);outline.closePath();
  const geo=new T.ExtrudeGeometry(outline,{depth:6,bevelEnabled:false});geo.translate(0,0,-3);
  const canopy=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#c8bda4',roughness:.7}));canopy.position.set(u,base,v);canopy.rotation.y=face;canopy.castShadow=true;s.root.add(canopy);
  for(const side of [-1,1])frameBox(box,'#9f9681',u,7.8,v+side*w/2,1.3,15.6,1.1);
  sign('尚特奥特莱斯',u+3.05,base+15.5,v,19,1.05,face,'#baae94','#f1ecdc');
  // Dark stone fountain court: jets are static geometry to avoid animation cost.
  const [fu,fv]=image([654,314]);if(safe(fu,fv,10,15,{lanes:false})){pad(fu,fv,10,15,'#5d6766',.27,'pavers');for(let x=-3;x<=3;x+=2)for(let z=-5;z<=5;z+=2.5){part('stem','#a0c1c3',fu+x,base+1.1,fv+z,.065,1.5+(x+z+8)%3*.3,.065);part('globe','#c6ded9',fu+x,base+2,fv+z,.13,.3,.13);}}
  const [tu,tv]=image([712,367]);if(safe(tu,tv,2.5,2.5,{lanes:false})){frameBox(box,'#56605c',tu,5.5,tv,1.2,11,1.2);sign('尚特奥莱',tu+.64,base+8,tv,1,4,Math.PI/2,'#56605c','#e5deca');}
 }
 // Discrete boundary fencing keeps every gateway open (no barrier across the entry).
 if(survey.kind!=='outlets')for(const e of segments([...boundary,boundary[0]])){
  const n=Math.ceil(e.length/2.5);for(let i=0;i<n;i++){
   const u=e.start[0]+(e.end[0]-e.start[0])*(i+.5)/n,v=e.start[1]+(e.end[1]-e.start[1])*(i+.5)/n;
   const a=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]),cs=Math.cos(a),sn=Math.sin(a);
   if(Math.hypot(u-survey.gate[0],v-survey.gate[1])<12||!civicPublicClearance.clear(clearanceRect(...civicWorld(survey,u,v),e.length/n+.3,.4,survey.angle+a)))continue;
   frameBox(box,'#858779',u,.85,v,.18,1.5,.18);for(const y of [.42,1.3])frameBox(box,'#727e73',u,y,v,e.length/n,.07,.07,a);
   for(let j=-1;j<=1;j++)frameBox(box,'#727e73',u+j*.65*cs,.88,v-j*.65*sn,.045,.86,.045);
  }
 }
 s.root.userData.siteDetails=detailRecords;
 const planting=greenSurfaces.finish(),controller=s.finish(),release=controller.dispose;let disposed=false;
 controller.dispose=()=>{if(disposed)return;disposed=true;planting.dispose();release();};controller.record=civicSiteRecords.find(r=>r.id===survey.id);return controller;
}
export function addCivicSites(scene){return civicSiteSurveys.map(s=>addCivicSite(scene,s));}
