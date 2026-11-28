import * as T from 'three';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {jinglinContext,jinglinContextWorld} from './jinglin-context-data.js';
import {westGroundHeight,westRoadSurfaceHeight} from './west-terrain.js';

export function addJinglinContext(scene,namedBoard){
 const p=jinglinContext,root=new T.Group();root.name='景林右侧 · 玻璃店面与小路及地税局';root.position.set(p.x,westGroundHeight(p.x,p.z)+.04,p.z);root.rotation.y=p.yaw;scene.add(root);
 const skin=createCommerceMaterials(root,{chunkSize:100}),base=root.position.y;
 const box=(kind,col,u,y,v,w,h,d)=>skin.box(kind,col,u,y,v,w,h,d);
 const label=(name,u,y,v,w,h,face=0,bg='#254d72')=>namedBoard(root,name,u,y,v,w,h,face,bg);
 // One half-wall window bay joins Jinglin directly, followed by the lane.
 const g=p.glass;
 box('plaster','#d3cbb9',g.u,2,g.v,g.w,4,g.d);
 box('stone','#989c95',g.u,.18,3.23,g.w,.36,.66);
 box('plaster','#d4c8ab',g.u,3.46,3.05,g.w,.86,.18);
 box('stone','#bdbab0',g.u,3.98,3.1,g.w+.1,.12,.3);
 {
   const u=g.u,w=g.w-.14;
   box('plaster','#d3cbb9',u,.86,3.10,w,1.0,.16);
   box('stone','#989c95',u,.43,3.20,w,.14,.12);
   box('glass','#718786',u,2.22,3.075,w,1.64,.06);
   for(const side of [-1,1])box('stone','#c4c4b7',u+side*w/2,2.22,3.13,.065,1.76,.1);
   for(const y of [1.38,3.07])box('stone','#aeb3ad',u,y,3.14,w,.065,.1);
   box('stone','#bcc1b8',u,2.22,3.14,.05,1.64,.1);
   box('stone','#bdbab0',u,1.35,3.19,w+.1,.1,.28);
 }
 // The lane is open from the public pavement into the block, with a flush mouth.
 const lane=p.lane;
 for(let j=0;j<57;j++){
  const v=3.5-j-.5,corners=[[-lane.w/2,.5],[lane.w/2,.5],[lane.w/2,-.5],[-lane.w/2,-.5]].map(([du,dv])=>{
   const [x,z]=jinglinContextWorld(lane.u+du,v+dv),y=v>1?westRoadSurfaceHeight(x,z)+.016:westGroundHeight(x,z)+.025;
   return [lane.u+du,y-base,v+dv];
  });skin.quad('paving',j%11===0?'#9d9e92':'#c2c1b3',corners);
 }
 for(const side of [-1,1]){
  for(let j=0;j<55;j+=1.2){const v=2-j,[x,z]=jinglinContextWorld(lane.u+side*(lane.w/2+.1),v);box('stone','#8b8f83',lane.u+side*(lane.w/2+.1),westGroundHeight(x,z)-base+.07,v,.14,.13,1.12);}
 }
 // Slotted drainage crosses the mouth without creating a raised barrier.
 box('stone','#5f685e',lane.u,.027,3.15,lane.w-.2,.025,.34);
 for(let i=0;i<28;i++)box('stone','#a4a99b',lane.u-lane.w/2+.14+i*.108,.045,3.15,.04,.025,.32);
 // Four-storey tax-office frontage: pale tiled walls, blue fascia and central glazing.
 const b=p.tax,front=b.v+b.d/2;
 box('brick','#e6e6db',b.u,b.h/2,b.v,b.w,b.h,b.d);
 box('stone','#aba99c',b.u,.35,front+.06,b.w,.7,.18);
 box('stone','#c9c7b8',b.u,3.25,front+.15,b.w,.6,.35);
 box('stone','#556e80',b.u,b.h+.12,b.v,b.w+.25,.25,b.d+.2);
 for(const v of [b.v-b.d/2,b.v+b.d/2])box('stone','#637a88',b.u,b.h+.37,v,b.w,.5,.2);
 for(const side of [-1,1])box('stone','#a9b3b3',b.u+side*b.w/2,b.h+.35,b.v,.2,.45,b.d);
 // Ground-floor windows, white pilasters and shallow entrance steps.
 for(let i=0;i<10;i++){
  const u=b.u-b.w/2+2.05+i*4.13;
  box('glass','#5b747a',u,1.6,front+.13,3.65,2.52,.07);
  for(const dx of [-1.87,0,1.87])box('stone','#d0cfc2',u+dx,1.62,front+.2,.085,2.66,.14);
  for(const y of [.32,2.89])box('stone','#a6aaa3',u,y,front+.22,3.85,.07,.15);
  for(const dx of [-.15,.15])box('stone','#c9cfc5',u+dx,1.38,front+.28,.025,.42,.055);
 }
 for(let k=0;k<3;k++)box('stone','#b3b1a3',b.u-5,.05+k*.065,front+.35+k*.15,7.2,.08,.9-k*.25);
 box('sign','#244d79',b.u-5,2.95,front+.32,12.8,.78,.22);label('办税服务厅',b.u-5,2.95,front+.445,11.5,.62);
 for(let level=0;level<3;level++){
  const y=4.7+level*3.05;
  for(let i=0;i<10;i++){
   const u=b.u-b.w/2+2.05+i*4.13;
   box('stone','#d8d6c9',u,y,front+.08,2.08,1.94,.14);
   box('glass',(i+level)%3?'#526c7a':'#6d838b',u,y,front+.165,1.84,1.68,.045);
   for(const dx of [-.94,0,.94])box('stone','#a7b0b0',u+dx,y,front+.21,.045,1.75,.09);
   box('stone','#c6c8bd',u,y-.92,front+.26,2.14,.12,.37);
   if((i+level)%4===0){box('plaster','#b9b9ab',u+1.3,y-.84,front+.38,.7,.48,.36);for(let j=0;j<5;j++)box('stone','#787e73',u+1.3,y-1+j*.08,front+.58,.56,.025,.025);}
  }
 }
 // Recess-like dark central stair glazing with visible frame divisions.
 box('glass','#354e68',b.u,8.08,front+.28,6.2,8.75,.18);
 for(const dx of [-3.1,-1.55,0,1.55,3.1])box('stone','#7f929f',b.u+dx,8.08,front+.39,.065,8.8,.08);
 for(let y=3.8;y<12.6;y+=1.45)box('stone','#7f929f',b.u,y,front+.4,6.25,.06,.08);
 // Historic rooftop letters visible in the Amap facade photograph.
 const signCanvas=document.createElement('canvas');signCanvas.width=1536;signCanvas.height=128;const c=signCanvas.getContext('2d');c.clearRect(0,0,1536,128);c.fillStyle='#8b2d2b';c.font='bold 104px "Songti SC",serif';c.textAlign='center';c.textBaseline='middle';c.fillText('平遥地方税务局',768,66,1480);
 const signMap=new T.CanvasTexture(signCanvas);signMap.colorSpace=T.SRGBColorSpace;
 const roofSign=new T.Mesh(new T.PlaneGeometry(25,1.4),new T.MeshStandardMaterial({map:signMap,transparent:true,alphaTest:.15,side:T.DoubleSide,roughness:.8}));roofSign.name='平遥地方税务局 · 照片中的屋顶字';roofSign.position.set(b.u,14.15,front+.05);root.add(roofSign);
 for(const u of [-11,-6,0,6,11])box('stone','#6e7571',b.u+u,13.85,front-.12,.055,1.3,.055);
 // Narrow service sign beside the doorway, matching the modern Amap entrance photo.
 label('城西税务所',b.u+4.4,1.9,front+.26,2.3,.38,0,'#eeecdf');
 // Modest rear boundary and metal fence beside the lane, leaving the lane open.
 const fenceU=lane.u+4;
 for(let v=-17;v>-52;v-=.65)box('stone','#626e68',fenceU,1.12,v,.045,1.9,.045);
 for(const y of [.25,1.9])box('stone','#77847c',fenceU,y,-34.5,.07,.07,35);
 box('stone','#a5a79b',fenceU,.12,-34.5,.26,.24,35);
 const surfaces=skin.finish();
 root.userData={estimated:true,layoutSource:'user-confirmed-order-plus-amap-pois-and-photos',laneWidth:lane.w,heightRecords:[{id:'jinglin-tax-office',name:'平遥县税务局城西税务所（原地税局）',x:jinglinContextWorld(b.u,b.v)[0],z:jinglinContextWorld(b.u,b.v)[1],w:b.w,d:b.d,angle:p.yaw,height:b.h,floors:b.levels,levels:b.levels,buildingType:'government',estimated:true,heightSource:'Amap exterior photo; estimated storey height',footprintEstimated:true}]};
 return {root,setNight:v=>surfaces.setNight(v),dispose(){surfaces.dispose();root.removeFromParent();root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});}};
}
