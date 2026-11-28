import {mapData} from './map-data.js';
import {createModernSite} from './modern-site.js';
import {createSchoolFacades,schoolGroundMaterial,schoolSurfaceScale} from './school-appearance.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {pointInRing,segments} from './geography.js';

// Existing OSM parcel and photo-referenced northern gate. Internal dimensions
// remain estimates. Two old annex envelopes were corrected to clear the track.
export const secondSchoolSurvey={id:'second-school',name:'平遥二中',origin:[-1858,156],angle:0,boundary:mapData.campus,accuracy:'既有地图校园边界与北门；楼群、附属楼避让调整、步道及设施近似。'};
export const secondSchoolBuildings=[
 ['main-west',14,49,41,18,4],['main-east',76,58,49,18,4],['main-south',6,93,54,18,3],
 ['annex-north',163,43,46,11,4],['annex-middle',179,73,20,11,4],['annex-south',184,114,24,11,4],
].map(([id,u,v,w,d,levels])=>({id,u,v,w,d,levels,type:id.startsWith('annex')?'residential':'public',neighbour:id.startsWith('annex'),footprintEstimated:true,footprintSource:'existing campus estimate; track overlap corrected',heightSource:'photo-and-type-estimate',confidence:.3}));
export function addSecondSchool(scene){
 const s=createModernSite(scene,secondSchoolSurvey,{leafDensity:16,surfaceSegmentLength:2,surfaceMaterialFactory:(color,kind)=>schoolGroundMaterial(color,kind==='pavers'?'paving':kind),surfaceScale:schoolSurfaceScale});
 const {box,glass,line,pad,trees}=s,skin=createCommerceMaterials(s.root),facades=createSchoolFacades(s,secondSchoolSurvey);
 const boundary=mapData.campus.map(s.local),footprints=secondSchoolBuildings.map(b=>clearanceRect(b.u,b.v,b.w,b.d,0,.35));
 const detail={paths:[],gardens:[],furniture:[],fences:[],buildings:secondSchoolBuildings,approximate:true};
 const field=Array.from({length:80},(_,i)=>{const a=i*Math.PI/40,dx=Math.cos(a)*48,dz=Math.sin(a)*26;return [127+dx*Math.cos(.108)+dz*Math.sin(.108),94-dx*Math.sin(.108)+dz*Math.cos(.108)];});
 const occupied=[];
 const clear=(ring,extra=[])=>ring.every(p=>pointInRing(...p,boundary))&&![...footprints,field,...extra].some(p=>clearancePolygonsOverlap(ring,p));
 const at=(fn,col,u,y,v,w,h,d,a=0)=>fn(col,u,s.ground(u,v)+y,v,w,h,d,a);
 s.surface(boundary,'#a8aa8b',.07,'ground');
 for(const p of secondSchoolBuildings){
  const b=s.building({...p,color:p.neighbour?'#b6ac99':'#aa5c48',trimColor:'#dfd6bb'},{windows:false,photoLevels:true});facades.building(b,p);
  // Ground-level door, frame, shallow treads and canopy facing the main walks.
  const v=p.v-p.d/2;
  at(box,'#354448',p.u,1.6,v-.08,3,2.9,.14);at(glass,'#57747b',p.u,1.65,v-.17,2.65,2.6,.06);
  for(const du of [-1.5,0,1.5])at(box,'#d3d5c8',p.u+du,1.65,v-.22,.07,2.9,.09);
  for(const du of [-.18,.18])at(box,'#c4c9bd',p.u+du,1.4,v-.3,.04,.45,.06);
  for(let k=0;k<3;k++)at(box,'#b2b0a0',p.u,.1+k*.09,v-1.65+k*.35,4,.18,1.3-k*.3);
  at(box,'#d8d1bc',p.u,3.3,v-1,4.7,.22,2.2);
 }
 const paths=[[[0,-1],[0,29],[163,29]],[[14,29],[14,37]],[[76,29],[76,46]],[[0,29],[-29,29],[-29,75],[6,75],[6,81]],[[163,29],[163,35.5]],[[135,29],[135,59],[191,59],[191,104],[184,104],[184,106.5]],[[179,59],[179,65.5]], [[-29,75],[-29,114],[48,114],[56,89],[56,76]]];
 for(const path of paths)for(const e of segments(path)){
  const yaw=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]),ring=clearanceRect((e.start[0]+e.end[0])/2,(e.start[1]+e.end[1])/2,e.length,2.8,yaw);
  // The gate starts on the parcel edge, so its short apron is retained separately.
  if(!clear(ring))continue;s.surface(ring,'#bdb8a5',.21,'paving');detail.paths.push(ring);occupied.push(ring);
  for(const side of [-1,1]){const dx=Math.sin(yaw)*side*1.45,dz=Math.cos(yaw)*side*1.45;line('#918f80',[e.start[0]+dx,e.start[1]+dz],[e.end[0]+dx,e.end[1]+dz],.12,.12,.25);}
 }
 pad(0,15,16,32,'#b9b09c',.19,'paving');
 // Elliptical running field retained at its existing footprint; detailed rubber,
 // inner turf, lane paint and goals replace the earlier untextured disks.
 const ellipse=(rx,rz)=>Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,dx=Math.cos(a)*rx,dz=Math.sin(a)*rz;return [127+dx*Math.cos(.108)+dz*Math.sin(.108),94-dx*Math.sin(.108)+dz*Math.cos(.108)];});
 s.surface(ellipse(47,25),'#a45e4d',.20,'rubber');s.surface(ellipse(40,19),'#5b8059',.23,'turf');
 for(let k=0;k<5;k++){const ring=ellipse(46-k*1.35,24-k*1.35);for(const e of segments([...ring,ring[0]]))line('#e3ddc8',e.start,e.end,.075,.018,.27);}
 const fp=(x,z)=>[127+x*Math.cos(.108)+z*Math.sin(.108),94-x*Math.sin(.108)+z*Math.cos(.108)];
 for(const z of [-12,12])line('#e2e1cf',fp(-27,z),fp(27,z),.09,.018,.28);
 for(const x of [-27,0,27])line('#e2e1cf',fp(x,-12),fp(x,12),.09,.018,.28);
 for(const side of [-1,1]){
  for(const z of [-3,3]){const [u,v]=fp(side*27,z);at(box,'#d8dace',u,1.4,v,.10,2.4,.10);}
  const [u,v]=fp(side*27,0);at(box,'#d8dace',u,2.64,v,.12,.12,6.1,.108);
  for(let z=-3;z<=3;z+=.35){const [x,y]=fp(side*28.4,z);at(box,'#a8b6a6',x,1.4,y,.02,2.3,.02);}
 }
 function reserve(kind,u,v,w,d){const ring=clearanceRect(u,v,w,d);if(!clear(ring,occupied))return false;occupied.push(ring);detail.furniture.push({kind,u,v,w,d,ring});return true;}
 for(const [u,v,w,d] of [[-39,47,8,20],[41,51,8,18],[-4,67,16,5],[26,68,14,5],[-8,112,22,6],[101,35,18,5],[126,48,8,16],[202,130,13,6],[149,132,22,6]]){
  const ring=clearanceRect(u,v,w,d);if(!clear(ring,occupied))continue;occupied.push(ring);detail.gardens.push(ring);pad(u,v,w,d,'#677b51',.24,'soil');
  for(const side of [-1,1]){at(box,'#bbb5a1',u,.4,v+side*d/2,w+.3,.3,.25);at(box,'#bbb5a1',u+side*w/2,.4,v,.25,.3,d);}
  for(let x=-w/2+1.2;x<w/2-1;x+=2){trees.shrub(u+x,v-d/2+1,1.3,.7,.25);s.part('globe','#617a48',u+x,s.ground(u,v)+.65,v-d/2+1,1.6,.7,1.2);}
  if(w>10)for(const dx of [-w*.28,w*.28]){trees.tree({x:u+dx,z:v,height:5.2,crown:3.3,base:.25});s.part('globe','#6d8053',u+dx,s.ground(u,v)+4.6,v,2.4,2.3,2.4);}
 }
 for(const [u,v] of [[-12,31],[42,34],[118,28],[28,111],[145,124]])if(reserve('bench',u,v,2.5,1.2)){
  for(const dx of [-.85,.85])at(box,'#55645a',u+dx,.5,v,.1,.65,.6);
  for(let j=0;j<4;j++)at(box,'#907859',u,.79,v-.25+j*.16,2.2,.08,.12);at(box,'#907859',u,1.1,v-.3,2.2,.38,.08);
 }
 for(const [u,v] of [[-37,87],[180,135]])if(reserve('cycle-shelter',u,v,12,4)){
  pad(u,v,12,4,'#a8a696',.23,'paving');skin.box('roof','#728582',u,s.ground(u,v)+2.9,v,12,.15,3.8);
  for(const dx of [-5.5,5.5])for(const dz of [-1.5,1.5])at(box,'#56675e',u+dx,1.55,v+dz,.12,2.7,.12);
  for(let dx=-5;dx<=5;dx++)for(const dz of [-.45,.45]){at(box,'#aab7aa',u+dx,.6,v+dz,.05,.7,.05);at(box,'#aab7aa',u+dx,.96,v,.05,.05,1);}
 }
 for(const [u,v] of [[30,20],[-21,32],[120,60],[182,89],[45,111]])if(reserve('lamp',u,v,.7,.7))s.lamp(u,v,4.5);
 // Perimeter plinth, piers and metal infill, with a true northern gate opening.
 for(const e of segments([...boundary,boundary[0]])){
  const n=Math.ceil(e.length/2.6),a=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]);
  for(let i=0;i<n;i++){
   const u=e.start[0]+(e.end[0]-e.start[0])*(i+.5)/n,v=e.start[1]+(e.end[1]-e.start[1])*(i+.5)/n;
   if(v<12&&Math.abs(u)<12)continue;detail.fences.push([u,v]);
   skin.box('stone','#999789',u,s.ground(u,v)+.48,v,e.length/n,.65,.4,a);at(box,'#c4c0ad',u,.88,v,e.length/n,.12,.52,a);
   at(box,'#aeb0a1',u,1.47,v,.2,1.8,.4,a);
   for(const y of [1.05,2.15])at(box,'#4b6057',u,y,v,e.length/n,.065,.065,a);
   for(let dx=-1;dx<=1;dx+=.25)at(box,'#4b6057',u+dx*Math.cos(a),1.61,v-dx*Math.sin(a),.035,1.05,.035,a);
  }
 }
 for(const side of [-1,1]){at(box,'#c4b89d',side*9,2.2,0,2.8,4.4,2.2);at(box,'#8c6d55',side*9,4.5,0,3.35,.25,2.7);}
 at(box,'#9b572f',0,4.02,0,20.5,.95,2);s.sign('平遥县第二中学校',0,s.ground(0,0)+4.02,-1.02,17.4,.86,Math.PI,'#693629','#e9d8b8');
 s.root.userData.campusDetails=detail;
 const skinController=skin.finish(),faceController=facades.finish(),controller=s.finish(),release=controller.dispose;let disposed=false;
 controller.dispose=()=>{if(disposed)return;disposed=true;skinController.dispose();faceController.dispose();release();};return controller;
}
