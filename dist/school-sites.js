import {addSchoolCourt,schoolTexture,schoolSurfaceScale,schoolGroundMaterial,schoolBuildingStyle,createSchoolFacades} from './school-appearance.js';
import {createModernSite} from './modern-site.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {schoolLocal,schoolWorld,schoolClearance,schoolSiteRecords} from './school-sites-data.js';
import {pointInRing,segments} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {addSchoolGroundDetails} from './school-ground-details.js';
import {addGutaoShopfronts} from './gutao-shopfronts.js';

export function addSchoolSite(scene,survey){
 const s=createModernSite(scene,survey,{leafDensity:20,chunkSize:120,surfaceMaterialFactory:schoolGroundMaterial,surfaceScale:schoolSurfaceScale}),{box,glass,line,pad,sign}=s;
 const facades=createSchoolFacades(s,survey);
 const image=p=>schoolLocal(survey,p),poly=r=>r.map(image),bounds=survey.protectedRings.map(r=>r.map(s.local)),solids=survey.buildings.map(b=>clearanceRect(b.u,b.v,b.w+2,b.d+2));
 const paths=survey.lanes.map(l=>({...l,points:poly(l.points)})),pathRings=paths.flatMap(l=>segments(l.points).map(e=>clearanceRect((e.start[0]+e.end[0])/2,(e.start[1]+e.end[1])/2,e.length,l.width,-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]))));
 const plannedSports=survey.courts.map(([px,py,pw,pd])=>clearanceRect(...image([px,py]),pw*survey.metresPerPixel,pd*survey.metresPerPixel));
 if(survey.track){const [px,py,pw,pd]=survey.track,[u,v]=image([px,py]),w=pw*survey.metresPerPixel,d=pd*survey.metresPerPixel,hor=w>d,r=Math.min(w,d)/2,st=Math.abs(d-w)/2;plannedSports.push(Array.from({length:96},(_,i)=>{const a=i*Math.PI/48;return [u+Math.cos(a)*r+(hor?(Math.cos(a)>=0?st:-st):0),v+Math.sin(a)*r+(!hor?(Math.sin(a)>=0?st:-st):0)];}));}
 const details={paths:[],trees:[],furniture:[],sports:[],gates:[],green:[]},surfaces=createSurveySurfaces(s.root,{ground:s.ground,tileScale:schoolSurfaceScale,textureFactory:schoolTexture});
 const safeRing=(r,pathsToo=true)=>r.every(p=>bounds.some(b=>pointInRing(...p,b)))&&!solids.some(b=>clearancePolygonsOverlap(b,r))&&(!pathsToo||!pathRings.some(b=>clearancePolygonsOverlap(b,r)))&&schoolClearance.clear(r.map(p=>schoolWorld(survey,...p)));
 const safe=(u,v,w,d=w,pathsToo=true)=>safeRing(clearanceRect(u,v,w,d),pathsToo);
 const at=(fn,col,u,y,v,w,h,d,a=0)=>fn(col,u,s.ground(u,v)+y,v,w,h,d,a);
 // Clip paving in small cells at public streets; never paint across existing roadways.
 for(const bound of bounds){const xs=bound.map(p=>p[0]),zs=bound.map(p=>p[1]);for(let u=Math.min(...xs)+1;u<Math.max(...xs);u+=2)for(let v=Math.min(...zs)+1;v<Math.max(...zs);v+=2){const r=clearanceRect(u,v,2,2);if(r.every(p=>pointInRing(...p,bound))&&schoolClearance.clear(r.map(p=>schoolWorld(survey,...p))))surfaces.polygon(r,Math.floor(u/12)%2===0?'#c3beb0':'#b8b4a9',.17,'paving');}}
 for(const [index,p] of survey.buildings.entries()){
  const style=schoolBuildingStyle(survey,p);
  const b=s.building({...p,color:style.color,trimColor:style.trim,roofColor:style.roof,storeyHeight:p.neighbour?3.05:3.6},{photoLevels:true,windows:false});
  facades.building(b,p);
  if(p.type==='shed'){s.part('roof',p.neighbour?'#74766b':'#567a96',b.u,b.base+b.h+.65,b.v,b.w,1.3,b.d);continue;}
  // Deep stairwell, sill, lintel and rainwater downpipes on each long face.
  for(const side of [-1,1]){
   const z=b.v+side*(b.d/2+.32);
   for(const x of [b.u-b.w/2+.4,b.u+b.w/2-.4])box('#8b918a',x,b.base+b.h/2,z,.1,b.h,.12);
   if(!p.neighbour){glass('#52676d',b.u,b.base+b.h/2,z,3.2,b.h-.7,.12);for(let f=1;f<b.levels;f++)box('#d8d3c5',b.u,b.base+f*3.6,z,3.6,.22,.25);}
   else if(p.type!=='commercial')for(let x=b.u-b.w/2+4;x<b.u+b.w/2-3;x+=9)for(let f=1;f<b.levels;f++){
    box('#b2ae9f',x,b.base+f*3.05+.45,z,3.1,.14,1.05);glass('#6b8080',x,b.base+f*3.05+1.15,z+side*.45,2.8,1.25,.08);
    for(const dx of [-1.4,0,1.4])box('#dbd9ca',x+dx,b.base+f*3.05+1.2,z+side*.52,.06,1.4,.06);
    box('#c2c3b7',x+2.4,b.base+f*3.05+.8,z,.7,.5,.45);
   }
  }
  if(p.type==='commercial'&&survey.id==='gutao')addGutaoShopfronts(s,survey,b,p,surfaces);
  else if(p.type==='commercial'){
   let shopBay=0;
   for(let x=b.u-b.w/2+2;x<b.u+b.w/2-1;x+=4,shopBay++){
    box('#dad1bb',x,b.base+1.5,b.v+b.d/2+.28,3.6,2.9,.18);
    glass('#435d62',x,b.base+1.5,b.v+b.d/2+.4,3.3,2.7,.09);
    const shopTone=['#6b7770','#9a7158','#586e79','#8e665c'][shopBay%4];
    box(shopTone,x,b.base+3.2,b.v+b.d/2+.45,3.7,.6,.18);
    box(shopTone,x,b.base+2.9,b.v+b.d/2+1,3.8,.12,1.3);
    box('#d0d1c4',x,b.base+1.5,b.v+b.d/2+.46,.07,2.7,.08);
    // Inferred anonymous shop details: never assign a real name without a location source.
    for(const dx of [-.12,.12])box('#d1d2c7',x+dx,b.base+1.4,b.v+b.d/2+.54,.035,.42,.055);
    box('#8b897e',x,b.base+.13,b.v+b.d/2+.45,3.6,.18,.65);
    box('#575e57',x-1.7,b.base+1.4,b.v+b.d/2+.35,.055,2.8,.08);
    box('#c6c7b9',x+1.3,b.base+2.4,b.v+b.d/2+.4,.43,.36,.21);
    for(const y of [1.0,1.75,2.5]){
     box('#82705a',x-.7,b.base+y,b.v+b.d/2+.49,1.05,.06,.26);
     for(let j=0;j<5;j++)box(['#b7aa7d','#8c9f8c','#ad816b','#78929a'][j%4],x-1.1+j*.2,b.base+y+.17,b.v+b.d/2+.46,.15,.28,.15);
    }
    for(const dx of [-1.35,1.35]){box('#4e5954',x+dx,b.base+3.65,b.v+b.d/2+.5,.06,.22,.35);box('#d1c5a6',x+dx,b.base+3.72,b.v+b.d/2+.65,.29,.07,.22);}
   }
   s.root.userData.schoolGateShopBays=(s.root.userData.schoolGateShopBays??0)+shopBay;
  }
  if(survey.id==='gutao'&&p.name==='南教学主楼'){
   glass('#508c9d',b.u,b.base+b.h/2,b.v+b.d/2+.5,5.6,b.h-.8,.14);
   for(const dx of [-3,3])box('#e3d7c4',b.u+dx,b.base+b.h/2,b.v+b.d/2+.62,.3,b.h,.25);
   sign('古陶一中',b.u,b.base+b.h-1.6,b.v+b.d/2+.72,5,1,0,'#508c9d','#f0dfb2');
  }
  // Service equipment and varied rooftops remain attached to each authored mass.
  if(p.neighbour&&b.w>25){box('#a7b3b1',b.u+5,b.base+b.h+.8,b.v,2.6,.6,.7);box('#526c79',b.u+5,b.base+b.h+.4,b.v+1.3,2.8,.16,1.5);}
  if(!p.neighbour&&b.w>25){box('#c7c3b4',b.u,b.base+3.2,b.v+b.d/2+1.1,6.5,.2,2.4);for(const dx of [-2.8,2.8])box('#9faaa6',b.u+dx,b.base+1.5,b.v+b.d/2+1.8,.12,3,.12);}
 }
 for(const path of paths)for(const e of segments(path.points)){
  const n=Math.ceil(e.length/2),nx=-(e.end[1]-e.start[1])/e.length,nz=(e.end[0]-e.start[0])/e.length;
  for(let j=0;j<n;j++){const a=[e.start[0]+(e.end[0]-e.start[0])*j/n,e.start[1]+(e.end[1]-e.start[1])*j/n],b=[e.start[0]+(e.end[0]-e.start[0])*(j+1)/n,e.start[1]+(e.end[1]-e.start[1])*(j+1)/n],r=clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,e.length/n,path.width,-Math.atan2(b[1]-a[1],b[0]-a[0]));if(!safeRing(r,false)||plannedSports.some(p=>clearancePolygonsOverlap(p,r)))continue;surfaces.strip(a,b,path.width,path.width>=4?'#505855':'#b7aa94',.258,path.width>=4?'asphalt':'courtyard');details.paths.push(r);for(const side of [-1,1])line('#c8c4b3',[a[0]+nx*side*path.width/2,a[1]+nz*side*path.width/2],[b[0]+nx*side*path.width/2,b[1]+nz*side*path.width/2],.16,.14,.26);}
 }
 for(const region of survey.green){const r=poly(region),xs=r.map(p=>p[0]),zs=r.map(p=>p[1]);for(let u=Math.min(...xs)+1;u<Math.max(...xs);u+=2)for(let v=Math.min(...zs)+1;v<Math.max(...zs);v+=2){const cell=clearanceRect(u,v,2,2);if(cell.every(p=>pointInRing(...p,r))&&safeRing(cell)){surfaces.polygon(cell,'#73845f',.29,'ground');details.green.push(cell);}}}
 // Stadium capsule: straight sides and semicircular ends, with inferred lane markings.
 if(survey.track){const [px,py,pw,pd]=survey.track,[u,v]=image([px,py]),m=survey.metresPerPixel,w=pw*m,d=pd*m,horizontal=w>d,r=Math.min(w,d)/2,straight=Math.abs(d-w)/2;const oval=inset=>Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return [u+Math.cos(a)*(r-inset)+(horizontal?(Math.cos(a)>=0?straight:-straight):0),v+Math.sin(a)*(r-inset)+(!horizontal?(Math.sin(a)>=0?straight:-straight):0)];});
  if(safeRing(oval(0),false)){s.surface(oval(0),'#a44e3e',.30,'rubber');s.surface(oval(6),'#538341',.33,'turf');for(let n=0;n<5;n++){const q=oval(.4+n*1.15);for(const e of segments([...q,q[0]]))line('#e4d5bd',e.start,e.end,.075,.015,.35);}
   const fw=horizontal?w-23:w-17,fd=horizontal?d-17:d-23,q=clearanceRect(u,v,fw,fd);for(const e of segments([...q,q[0]]))line('#eee5cf',e.start,e.end,.1,.02,.37);line('#eee5cf',horizontal?[u,v-fd/2]:[u-fw/2,v],horizontal?[u,v+fd/2]:[u+fw/2,v],.1,.02,.37);const circle=Array.from({length:48},(_,i)=>[u+Math.cos(i*Math.PI/24)*7,v+Math.sin(i*Math.PI/24)*7]);for(const e of segments([...circle,circle[0]]))line('#eee5cf',e.start,e.end,.1,.02,.37);for(const side of [-1,1]){for(const dx of [-3,3])at(box,'#d7ddd3',u+(horizontal?side*fw/2:dx),1.6,v+(horizontal?dx:side*fd/2),.08,2.5,.08);at(box,'#d7ddd3',u+(horizontal?side*fw/2:0),2.85,v+(horizontal?0:side*fd/2),horizontal?.08:6.1,.08,horizontal?6.1:.08);}details.sports.push({kind:'track',ring:oval(0)});}
 }
 for(const [px,py,pw,pd] of survey.courts){const [u,v]=image([px,py]),w=pw*survey.metresPerPixel,d=pd*survey.metresPerPixel,r=clearanceRect(u,v,w,d);if(!safeRing(r,false))continue;addSchoolCourt(s,u,v,w,d);details.sports.push({kind:'court',ring:r});}
 const sports=details.sports.map(p=>p.ring),furniture=[];
 function free(u,v,w,d=w){const r=clearanceRect(u,v,w,d);return safeRing(r)&&!sports.some(s=>clearancePolygonsOverlap(s,r))&&!furniture.some(s=>clearancePolygonsOverlap(s,r));}
 function reserve(kind,u,v,w,d=w){const ring=clearanceRect(u,v,w,d);furniture.push(ring);details.furniture.push({kind,u,v,ring});}
 function lamp(u,v){if(!free(u,v,1.5))return;at(box,'#646b61',u,.24,v,.55,.35,.55);at(box,'#535e56',u,3.1,v,.14,6.2,.14);at(box,'#adb4a5',u,.62,v,.22,.48,.22);at(box,'#707b70',u+.4,6.2,v,1,.12,.15);at(glass,'#e3d4a5',u+.8,6.15,v,.55,.1,.3);at(box,'#675c4a',u,2.9,v,.6,1.4,.08);for(const yy of [2.35,3.45])at(box,'#bea989',u,yy,v+.05,.5,.035,.03);reserve('lamp',u,v,1.5);}
 for(const [i,p] of survey.trees.entries()){const [u,v]=image(p);if(!free(u,v,3))continue;pad(u,v,2.1,2.1,'#66764d',.31,'soil');for(const side of [-1,1]){at(box,'#b5ad97',u+side*1.1,.35,v,.16,.25,2.3);at(box,'#b5ad97',u,.35,v+side*1.1,2.3,.25,.16);}s.trees.tree({x:u,z:v,height:5.8+i%3*.6,crown:3.4,base:.3},i);details.trees.push([u,v]);reserve('tree',u,v,3);if(i%3===0)lamp(u+4,v);
  if(i%4===0&&free(u-4,v,2.4,1.2)){for(const dx of [-.8,.8])at(box,'#48534b',u-4+dx,.45,v,.12,.6,.55);for(let j=0;j<4;j++)at(box,'#95795a',u-4,.78,v-.25+j*.15,2.1,.08,.1);at(box,'#95795a',u-4,1.05,v-.32,2.1,.45,.08);reserve('bench',u-4,v,2.4,1.2);}
 }
 for(const path of paths)for(const [i,[u,v]] of path.points.entries()){
  lamp(u+path.width/2+2,v);if(i%2===0&&free(u-path.width/2-1,v,1)){at(box,'#536a5c',u-path.width/2-1,.7,v,.55,1,.55);at(box,'#adb29f',u-path.width/2-1,1.23,v,.62,.08,.6);reserve('bin',u-path.width/2-1,v,1);}
  if(safe(u,v,.7,.7,false)){at(box,'#58635c',u,.272,v,.65,.025,.65);for(let j=0;j<5;j++)at(box,'#969e91',u-.24+j*.12,.289,v,.03,.01,.5);}
 }
 // Ground detail follows entrances and surveyed planting zones, not random scatter.
 for(const b of survey.buildings){
  if(b.type==='shed')continue;
  const u=b.u,v=b.v+b.d/2+4.4,w=Math.min(b.w*.65,18),d=4.7;
  if(!free(u,v,w+.4,d+.4))continue;
  surfaces.polygon(clearanceRect(u,v,w,d),'#9b9180',.285,'stone');surfaces.polygon(clearanceRect(u,v,w-.6,d-.6),'#d4cabc',.296,'paving');
  for(const side of [-1,1])line('#655f54',[u-w/2+.3,v+side*(d/2-.3)],[u+w/2-.3,v+side*(d/2-.3)],.13,.02,.31);
  for(let x=u-w/2+1.2;x<u+w/2-1;x+=2.4)line('#a48a63',[x,v-d/2+.4],[x,v+d/2-.4],.1,.018,.32);
  reserve('entrance-paving',u,v,w+.4,d+.4);
 }
 for(const region of survey.green){const ring=poly(region);for(const e of segments([...ring,ring[0]])){
  const count=Math.max(1,Math.floor(e.length/3.2));for(let i=0;i<count;i++){
   const u=e.start[0]+(e.end[0]-e.start[0])*(i+.5)/count,v=e.start[1]+(e.end[1]-e.start[1])*(i+.5)/count;
   if(!free(u,v,1.8,1.4))continue;
   surfaces.polygon(clearanceRect(u,v,1.6,1.2),'#665b43',.32,'soil');s.trees.shrub(u,v,1.3,.65,.34);
   for(const side of [-1,1])at(box,'#bcb09a',u,.38,v+side*.65,1.8,.2,.12);
   reserve('hedge',u,v,1.8,1.4);
  }
 }}
 // Gate posts and sign wall, with the entry centre left traversable.
 const [gu,gv]=survey.gate,a=survey.facing,c=Math.cos(a),sn=Math.sin(a),gatePart=(fn,col,du,y,dv,w,h,d)=>at(fn,col,gu+du*c+dv*sn,y,gv-du*sn+dv*c,w,h,d,a);
 for(const side of [-1,1])gatePart(box,'#9c9b8d',side*8,1.6,0,1.2,3.2,1.2);
 gatePart(box,'#96988d',-16,1.5,0,13,3,.6);
 if(survey.id==='experimental'){for(const side of [-1,1]){gatePart(box,'#dfd9cb',side*8,2.2,0,1.5,4.4,2);gatePart(glass,'#576e72',side*8,2.2,.0,1.1,3.4,2.04);}gatePart(box,'#b06a5b',0,4.6,0,17.5,.6,1.4);}
 const text=survey.id==='vocational'?survey.mapName:survey.name;
 sign(text,gu-16*c+.34*sn,s.ground(gu,gv)+1.8,gv+16*sn+.34*c,12,1,a,'#96988d','#f0eee0');
 for(let dx=5.5;dx<7;dx+=.25)gatePart(box,'#738078',dx,.95,0,.05,1.8,.12);
 // Small gate-side shelter and bicycle racks, only when the full footprint fits.
 const shelter=[gu-18*c-8*sn,gv+18*sn-8*c];
 if(free(...shelter,9,4)){
  const [u,v]=shelter;at(glass,'#7e9292',u,2.6,v,8.5,.15,3.5);
  for(const dx of [-4,4])for(const dz of [-1.4,1.4])at(box,'#66756c',u+dx,1.4,v+dz,.09,2.5,.09);
  for(let dx=-3.5;dx<=3.5;dx++)at(box,'#8b8e7d',u+dx,.65,v,.05,.85,1.3);
  reserve('bicycle-shelter',u,v,9,4);
 }
 details.gates.push({position:[gu,gv],clearWidth:11,facing:a});
 const groundDetails=addSchoolGroundDetails(s,survey,details,surfaces);
 s.root.userData.schoolDetails=details;const facadeController=facades.finish(),ground=surfaces.finish(),controller=s.finish(),dispose=controller.dispose;let released=false;const setNight=controller.setNight;controller.setNight=value=>{setNight(value);groundDetails.setNight(value);};controller.dispose=()=>{if(released)return;released=true;groundDetails.dispose();facadeController.dispose();ground.dispose();dispose();};controller.record=schoolSiteRecords.find(r=>r.id===survey.id);return controller;
}
