import * as T from 'three';
import {createModernSite} from './modern-site.js';
import {resolveBuildingHeight} from './building-heights.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {schoolClearance} from './school-sites-data.js';
import {siteToWorld,tiansenSurvey} from './west-sites-data.js';
import {tiansenRetailFronts,xinhuaBookstoreSurvey} from './tiansen-life-data.js';

function tiansenPlanter(s,u,v,w=.7,d=.7,flowers=false){
 const y=s.ground(u,v)+.28;s.box('#867c66',u,y+.24,v,w,.48,d);s.box('#4f633d',u,y+.5,v,w*.89,.08,d*.89);
 for(let k=0;k<7;k++){
  const a=k*2.4,r=.33*Math.sqrt((k+1)/7),x=u+Math.cos(a)*r*w,z=v+Math.sin(a)*r*d;
  s.part('stem','#4f6b3d',x,y+.68,z,.04,.36,.04);
  s.part('globe',flowers?['#b65366','#d5b39d','#d4be61'][k%3]:'#547648',x,y+.85,z,.23,.25,.23);
 }
}

export function addTiansenStreetLife(s,masses,entrance,treePositions){
 const eu=entrance[0],base=masses[0].base,parking=s.root.userData.streetParking;
 const footprints=masses.map(b=>clearanceRect(b.u,b.v,b.w,b.d,0,.45)),trees=treePositions.map(p=>clearanceRect(...p,2.7,2.7));
 const doors=tiansenRetailFronts.map(p=>clearanceRect(eu+2.9,p.v,5.2,2.8)),furniture=[];
 const forbidden=[...footprints,parking.entrancePass,...parking.placements.map(p=>p.ring),...trees,...doors];
 const safe=ring=>schoolClearance.clear(ring.map(p=>siteToWorld(tiansenSurvey,...p)))&&![...forbidden,...furniture.map(p=>p.ring)].some(r=>clearancePolygonsOverlap(r,ring));
 function reserve(u,v,w,d,kind){const ring=clearanceRect(u,v,w,d);if(!safe(ring))return false;furniture.push({u,v,w,d,kind,ring});return true;}
 // Photo-based shop fascias sit just outside the existing masonry/glass shell.
 for(const p of tiansenRetailFronts){
  const face=eu+.20,at=(fn,color,dv,y,w,h,depth,out=0)=>fn(color,face+out,base+y,p.v-dv,depth,h,w);
  at(s.box,p.color,0,4.65,p.width,1.22,.34,.15);
  s.sign(p.name,face+.34,base+4.77,p.v,p.width*.80,.68,Math.PI/2,p.color,'#f1eadb').name='田森店招-'+p.id;
  s.sign(p.english,face+.35,base+4.28,p.v,p.width*.79,.22,Math.PI/2,p.color,'#ddd5bf');
  at(s.glass,'#344b46',0,2.05,p.width-.4,3.7,.11,.13);
  // Warm counter/display strips behind the visual glass layer.
  for(let dv=-p.width/2+1.6;dv<p.width/2;dv+=3.1){
   if(Math.abs(dv)<1.45)continue;
   at(s.box,'#bd9c71',dv,.78,2.3,.15,.10,.23);at(s.box,'#8d8771',dv,2.03,.055,3.6,.12,.28);
   for(let k=0;k<4;k++)at(s.box,['#d3c4a0','#9f7050','#b09868'][k%3],dv-.8+k*.48,1.01,.23,.27,.08,.25);
  }
  for(const dv of [-1.13,0,1.13])at(s.box,'#bab8a0',dv,1.95,.055,3.7,.12,.31);
  for(const dv of [-.13,.13])at(s.box,'#d9c9a6',dv,1.35,.035,.48,.08,.38);
  at(s.box,'#65523e',0,3.87,p.width,.15,1.7,.75);
  for(let dv=-p.width/2+.12;dv<p.width/2;dv+=.28)at(s.box,'#b19060',dv,3.78,.075,.11,1.62,.75);
  if(p.id==='food'){
   at(s.box,'#a32e2e',p.width/2-.6,2.85,1.1,5.5,.37,.4);
   s.sign('M',face+.61,base+4.4,p.v-p.width/2+.6,.9,1.1,Math.PI/2,'#a32e2e','#f4c34d');
   for(const dv of [-6,-3,3,6]){s.part('globe','#b84636',face+1,base+3.45,p.v+dv,.34,.43,.34);s.box('#c79e53',face+1,base+3.16,p.v+dv,.035,.18,.035);}
  }
 }
 // Café tables, flower buckets and short benches occupy discrete recesses.
 for(const v of [-27,-17]){
  const u=eu+2.25;if(!reserve(u,v,2.2,2.1,'cafe'))continue;const y=s.ground(u,v)+.28;
  s.part('stem','#575c4c',u,y+.40,v,.10,.80,.10);s.part('stem','#ae9671',u,y+.82,v,1,.07,1);
  for(const side of [-1,1]){s.box('#536458',u,y+.49,v+side*.75,.48,.10,.48);s.box('#536458',u,y+.85,v+side*.94,.48,.65,.07);for(const dx of [-.18,.18])for(const dz of [-.16,.16])s.box('#424c45',u+dx,y+.23,v+side*.75+dz,.035,.46,.035);
  }
  s.part('stem','#eee0bd',u+.15,y+.93,v,.10,.18,.10);
 }
 for(const [v,w,d]of [[20.5,.65,.8],[21.5,.6,.65],[28.5,.75,.8],[29.5,.6,.65]])if(reserve(eu+1.15,v,w,d,'flowers'))tiansenPlanter(s,eu+1.15,v,w,d,true);
 for(const v of [-9,42,64]){
  const u=eu+2.1;if(!reserve(u,v,1.4,2.7,'bench'))continue;const y=s.ground(u,v)+.28;
  for(let j=0;j<4;j++)s.box('#997959',u-.28+j*.18,y+.48,v,.14,.1,2.35);
  for(const z of [-.9,.9])s.box('#4d5950',u,y+.24,v+z,.6,.48,.10);
  s.box('#997959',u-.37,y+.78,v,.1,.6,2.35);
 }
 // A-boards stay near the shop wall, leaving the through-walk strip clear.
 for(const [v,text,color]of [[-29.8,'COFFEE','#345347'],[16,'点餐 · 取餐','#594c38'],[31.5,'今日鲜花','#486449']]){
  if(!reserve(eu+1.3,v,.8,.65,'board'))continue;const y=s.ground(eu+1.3,v);
  s.box('#866b4d',eu+1.3,y+.83,v,.14,1.1,.68);s.sign(text,eu+1.39,y+.95,v,.6,.62,Math.PI/2,color,'#e9dfc4');
 }
 s.root.userData.streetLife={people:[],furniture,doors,footprints,trees,estimated:true,fronts:tiansenRetailFronts};
}

export function addTiansenBookstore(scene){
 const survey=xinhuaBookstoreSurvey,s=createModernSite(scene,survey),ring=survey.boundary.map(s.local),base=Math.max(...ring.map(p=>s.ground(...p)))+.25,h=11.3;
 const shape=new T.Shape(ring.map(([u,v])=>new T.Vector2(u,-v))),geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geometry.translate(0,base,0);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#c5c4b9';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#9c9e96';ctx.lineWidth=1;for(let n=0;n<=128;n+=32){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,128);ctx.moveTo(0,n);ctx.lineTo(128,n);ctx.stroke();}
 const tile=new T.CanvasTexture(canvas);tile.colorSpace=T.SRGBColorSpace;tile.wrapS=tile.wrapT=T.RepeatWrapping;tile.repeat.set(.7,.7);
 const wall=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#e0ddce',map:tile,roughness:.86}));wall.castShadow=wall.receiveShadow=true;s.root.add(wall);
 const roof=new T.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,base+h+.03,0);s.root.add(new T.Mesh(roof,new T.MeshStandardMaterial({color:'#7b827d',roughness:.9})));
 s.root.userData.heightRecords.push({...resolveBuildingHeight({x:survey.origin[0],z:survey.origin[1],w:64.4,d:40,levels:3,height:h,buildingType:'commercial',source:'place-photos-estimated'}),id:survey.id,name:survey.name,x:survey.origin[0],z:survey.origin[1],w:64.4,d:40,angle:0,footprint:survey.boundary,coordinate:survey.coordinate,crs:survey.crs,footprintSource:survey.source,estimated:true,approximate:true,confidence:.5});
 const faces=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return {u:(a[0]+b[0])/2,v:(a[1]+b[1])/2,length,nx:(b[1]-a[1])/length,nz:-(b[0]-a[0])/length};});
 const entryFace=faces[3],entry=[entryFace.u+entryFace.nx*.5,entryFace.v+entryFace.nz*.5],entryAngle=Math.atan2(entryFace.nx,entryFace.nz),entryPass=clearanceRect(entry[0]+entryFace.nx*2,entry[1]+entryFace.nz*2,3.5,5,entryAngle);
 const furniture=[];
 const safe=r=>schoolClearance.clear(r.map(p=>siteToWorld(survey,...p)))&&!clearancePolygonsOverlap(r,ring)&&!clearancePolygonsOverlap(r,entryPass)&&!furniture.some(p=>clearancePolygonsOverlap(r,p.ring));
 for(const [i,f]of faces.entries()){
  const angle=Math.atan2(f.nx,f.nz),point=(x,out)=>[f.u+x*f.nz+out*f.nx,f.v-x*f.nx+out*f.nz];
  const at=(fn,color,x,y,w,hh,d,out=.12)=>{const [u,v]=point(x,out);fn(color,u,base+y,v,w,hh,d,angle);};
  at(s.box,'#e2dfcf',0,h+.15,f.length+.05,.3,.46,.02);at(s.box,'#b2b3a8',0,5.55,f.length,.18,.23);
  if(i>5)continue;
  at(s.box,'#892f3e',0,4.3,f.length+.06,1.95,.36,.21);at(s.box,'#ddd6c4',0,3.23,f.length,.18,.44,.25);
  // Upper tiled stories have narrow dark window bays and small AC units.
  const bays=Math.max(1,Math.round(f.length/4.7)),spacing=f.length/bays;
  for(let k=0;k<bays;k++){
   const x=-f.length/2+(k+.5)*spacing,ww=Math.min(2.35,spacing*.65);
   for(const y of [6.55,9.25]){at(s.box,'#e8e3d4',x,y,ww+.16,1.95,.15);at(s.glass,'#405255',x,y,ww,1.8,.10,.22);at(s.box,'#a7b1ae',x,y,.05,1.8,.07,.28);}
   if(k%3===1){at(s.box,'#bbbdb3',x+1.35,5.86,.72,.52,.39,.38);at(s.box,'#6f7c77',x+1.35,5.86,.42,.36,.05,.60);}
   at(s.glass,'#354b4e',x,1.65,spacing-.42,2.9,.10,.22);
   for(const edge of [-1,1])at(s.box,'#c3c6b9',x+edge*(spacing-.42)/2,1.64,.06,2.95,.08,.29);
   if(i!==3){
    for(const y of [.65,1.35,2.05]){at(s.box,'#917858',x,y,spacing-.7,.08,.09,.30);for(let b=0;b<9;b++)at(s.box,['#b66152','#c6b98c','#719292','#e0ccb0','#7d6b8b'][b%5],x-(spacing-.9)/2+(b+.5)*(spacing-.9)/9,y+.23,(spacing-.9)/11,.38+(b%3)*.04,.07,.32);}
   }
  }
  if(i===3){
   for(const edge of [-1,1]){at(s.box,'#a13d35',edge*1.75,1.65,.27,2.9,.10,.35);at(s.box,'#aeb3ac',edge*1.53,1.5,.25,2.7,.16,.36);for(let k=0;k<4;k++)at(s.box,'#737e76',edge*(1.45+k*.05),1.5,.018,2.65,.04,.46);}
   at(s.box,'#cdd0bd',0,1.6,.06,2.85,.10,.38);
  }
  if([0,2,4].includes(i)){
   const [u,v]=point(0,.42),title=i===0?'新华书店':i===2?'新华现代连锁':'平遥店';
   s.sign(title,u,base+4.5,v,Math.min(f.length*.90,i===0?24:10),i===0?1.1:.68,angle,'#892f3e','#fff1dc').name='新华书店店招-'+i;
   if(i===0)s.sign('XINHUA BOOKSTORE',u+f.nx*.01,base+3.64,v+f.nz*.01,22,.36,angle,'#892f3e','#f1e8d3');
  }
  // Small flags follow the photographed parapet, not an invented festival.
  if(i===0)for(let k=-12;k<=12;k+=8){const [u,v]=point(k,0);s.box('#a8b0a6',u,base+h+1.1,v,.035,1.9,.035);s.box('#b13b32',u+.36,base+h+1.55,v,.72,.45,.025);}
  // A narrow forecourt follows each frontage and stops short of the road edge.
  const apron=[point(-f.length/2,.12),point(f.length/2,.12),point(f.length/2,2.35),point(-f.length/2,2.35)];
  if(schoolClearance.clear(apron.map(p=>siteToWorld(survey,...p))))s.surface(apron,'#aba995',.23);

 }
 for(const [u,v]of [[-23,-23],[-10,-25],[27,-12],[31,4]]){
  const r=clearanceRect(u,v,1.3,1.1);if(!safe(r))continue;furniture.push({u,v,kind:'planter',ring:r});tiansenPlanter(s,u,v,1.3,1.1);s.trees.tree({x:u,z:v,height:6.8,crown:3.4,base:.4});
 }
 // Amber bollards and a short book display at the sides of the corner entrance.
 for(const side of [-1,1]){
  const u=entry[0]+entryFace.nx*2.7+side*2.5*entryFace.nz,v=entry[1]+entryFace.nz*2.7-side*2.5*entryFace.nx;
  if(!safe(clearanceRect(u,v,.35,.35)))continue;const y=s.ground(u,v);s.part('stem','#b45b35',u,y+.62,v,.14,1.1,.14);s.part('stem','#d6bf77',u,y+.94,v,.16,.12,.16);
 }
 s.lamp(-7,-24,5.3);
 const controller=s.finish();
 s.root.userData.streetLife={people:[],furniture,entryPass,footprint:ring,entry,entryAngle,estimated:true};
 let disposed=false;
 return {...controller,dispose(){if(disposed)return;disposed=true;controller.dispose();tile.dispose();}};
}
