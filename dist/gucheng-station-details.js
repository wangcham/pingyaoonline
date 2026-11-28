import * as T from 'three';
import {stationSite,stationWorld,stationLocal,stationParking,stationGreenZones,stationFieldZones} from './gucheng-station-data.js';
import {createUrbanBatch} from './urban-batch.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {createTreeBatch} from './vegetation.js';
import {pointInRing,segments,projectOnSegment} from './geography.js';
import {regionalRoadClear} from './regional-survey.js';

export function addGuchengStationDetails(parent){
 const root=new T.Group();root.name='高铁站周边与绿化';parent.add(root);
 const detail=new T.Group();detail.name='高铁站近景设施';root.add(detail);
 const batch=createUrbanBatch(root,{chunkSize:180}),fine=createUrbanBatch(detail,{chunkSize:180}),skin=createCommerceMaterials(root,{chunkSize:180}),surfaces=createSurveySurfaces(root),trees=createTreeBatch(detail,{leafDensity:9,park:true,chunkSize:180});
 const p=stationSite,lights=[],labels=[],report={trees:[],parkingSpaces:[],cars:0,platforms:2,tracks:4,ramps:[],people:0,estimated:true};
 const at=(u,y,v)=>{const [x,z]=stationWorld(u,v);return [x,y,z];};
 const box=(color,u,y,v,w,h,d)=>batch.box(color,...at(u,y,v),w,h,d,p.angle);
 const small=(color,u,y,v,w,h,d)=>fine.box(color,...at(u,y,v),w,h,d,p.angle);
 function rect(u,v,w,d,color,y=.12,kind='paving'){surfaces.polygon([[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>stationWorld(u+a*w/2,v+b*d/2)),color,y,kind);}
 function line(a,b,width,color,y=.14,kind='paving'){surfaces.strip(stationWorld(...a),stationWorld(...b),width,color,y,kind);}
 function plaque(text,u,y,v,w=4,h=.65,angle=p.angle+Math.PI,bg='#35586a',ink='#f0ead8'){labels.push({text,position:at(u,y,v),w,h,angle,bg,ink});}
 function tree(x,z,height=6.5,crown=5,base=.06){
  if(!regionalRoadClear(x,z,crown*.48)||report.trees.some(t=>Math.hypot(x-t.x,z-t.z)<5.7))return;
  const t={x,z,height,crown,base};trees.tree(t,report.trees.length);report.trees.push(t);
  for(let j=0;j<5;j++){const a=j*2.4+x*.01,spread=j===4?0:crown*.21;batch.part('globe',['#69814e','#80905a','#5e794c','#8a985f'][j%4],x+Math.cos(a)*spread,base+height*(j===4?.84:.72+(j%2)*.06),z+Math.sin(a)*spread,crown*.58,height*.36,crown*.55,a);}
 }
 function bench(u,v,angle=p.angle){
  const [x,z]=stationWorld(u,v),c=Math.cos(angle),s=Math.sin(angle);
  for(let j=0;j<5;j++){const off=-.26+j*.13;fine.box('#8b7252',x+off*s,.52,z+off*c,2.2,.09,.10,angle);}
  for(const side of [-1,1])fine.box('#5a655f',x+side*.82*c,.29,z-side*.82*s,.12,.48,.55,angle);
  for(const y of [.8,1.02])fine.box('#8b7252',x+.32*s,y,z+.32*c,2.2,.14,.08,angle);
 }
 function lamp(u,v,height=6){box('#aeb3a9',u,height/2,v,.15,height,.15);box('#aeb3a9',u,height-.2,v,1.4,.12,.2);lights.push({position:at(u,height-.3,v),size:[1,.12,.3],angle:p.angle});}

 // Lower forecourt joins both mapped stair approaches and the station road.
 rect(0,-65,153,24,'#beb8a6');
 for(const u of [-41,41]){rect(u,-62,13,28,'#c9c2ae');line([u,-76],[u,-54],.34,'#d8b36c',.14);}
 // Twenty-four 16 cm steps rise to the existing 3.84 m station terrace.
 for(const u of [-41,41])for(let i=0;i<24;i++){
  const top=(i+1)*.16,v=-50.8+i*.7;
  box('#b7b5a6',u,top/2,v,12,top,.71);
  small('#d7d1bb',u,top+.012,v-.31,12,.024,.065);
 }
 for(const u of [-41,41])rect(u,-34.25,12,1,'#c8c1ad',3.88);
 box('#b9b5a7',0,1.92,-36.5,68,3.84,5.2);
 // Central elevated planting, with a clear front walkway and side stairs.
 rect(0,-27,116,13,'#c8c1ad',3.94);
 for(const u of [-24,0,24]){
  skin.quad('ground','#7a8957',[at(u-9.5,.24,-49),at(u+9.5,.24,-49),at(u+9.5,3.87,-39),at(u-9.5,3.87,-39)]);
  for(const side of [-1,1])skin.quad('stone','#b5b09a',[at(u+side*9.5,.08,-49),at(u+side*9.5,.08,-39),at(u+side*9.5,3.87,-39),at(u+side*9.5,.24,-49)]);
  for(const du of [-6,0,6]){const [x,z]=stationWorld(u+du,-41);tree(x,z,4.7,3.8,3.15);}
  for(let du=-8;du<=8;du+=2.6)batch.part('globe','#77884e',...at(u+du,1.45,-47),2.4,1.05,1.8,p.angle);
 }
 // Folded ramps to either side of the stairs. Ends have level landings; rails
 // follow the slope and leave the actual route width unobstructed.
 for(const side of [-1,1]){
  const u0=side*59.7,lanes=5,width=1.8,len=15.5,rise=3.84/lanes;
  for(let lane=0;lane<lanes;lane++){
   const u=u0+side*lane*2.2,up=lane%2===0,a=-52.8,b=a+len,y0=lane*rise+.04,y1=(lane+1)*rise+.04;
   const yAt=t=>up?y0+(y1-y0)*t:y1-(y1-y0)*t;
   skin.quad('stone','#bcb7a7',[at(u-width/2,yAt(0),a),at(u+width/2,yAt(0),a),at(u+width/2,yAt(1),b),at(u-width/2,yAt(1),b)]);
   for(const edge of [-1,1]){
    const x=u+edge*width/2;
    for(let k=0;k<=8;k++){const t=k/8;small('#a8aea6',x,yAt(t)+.55,a+len*t,.045,1.05,.045);}
    for(const dy of [.57,1.06])skin.quad('metal','#b4bab2',[at(x,yAt(0)+dy-.03,a),at(x,yAt(1)+dy-.03,b),at(x,yAt(1)+dy+.03,b),at(x,yAt(0)+dy+.03,a)]);
   }
   if(lane<lanes-1){const end=up?b+.9:a-.9;rect(u+side*1.1,end,4,1.8,'#bcb7a7',y1);}
   report.ramps.push({side,lane,u,width,a,b,y0,y1,up});
  }
  // The final landing is connected back along the upper edge to the terrace.
  rect(side*65.2,-35.6,18,3.4,'#c8c1ad',3.89);
  rect(side*59.7,-54.5,4.2,3,'#c8c1ad',.06);
  plaque('无障碍通道',side*77,2,-55,3.4,.6);box('#647872',side*77,.9,-54.7,.08,1.8,.08);
 }
 // Circular plaza: jointed paving, quiet bands and small planting islands.
 const plaza=stationLocal(...p.plaza);
 for(const radius of [27,55,89]){
  const ring=Array.from({length:97},(_,i)=>stationWorld(plaza[0]+Math.cos(i*Math.PI/48)*radius,plaza[1]+Math.sin(i*Math.PI/48)*radius));
  for(const edge of segments(ring))surfaces.strip(edge.start,edge.end,.45,'#998f7d',.084,'paving');
 }
 for(const side of [-1,1])for(const off of [-42,-10,25,53]){
  const u=plaza[0]+side*Math.sqrt(80**2-off**2),v=plaza[1]+off;
  rect(u,v,7,11,'#748350',.11,'ground');
  for(const dv of [-3,3]){const [x,z]=stationWorld(u,v+dv);tree(x,z,5.7,4.1);}
  bench(u-side*6,v);lamp(u-side*6,v+6,4.5);
 }
 // Trace green parcels instead of paving over orchards and field margins.
 for(const zone of stationGreenZones){
  surfaces.polygon(zone.ring,'#7a895c',.035,'ground');
  const xs=zone.ring.map(q=>q[0]),zs=zone.ring.map(q=>q[1]);
  for(let x=Math.min(...xs)+5;x<Math.max(...xs)-3;x+=12.5)for(let z=Math.min(...zs)+5;z<Math.max(...zs)-3;z+=12.5){
   if(!pointInRing(x,z,zone.ring)||segments([...zone.ring,zone.ring[0]]).some(e=>projectOnSegment([x,z],e).distance<3))continue;
   const h=5.8+Math.abs(Math.round(x+z))%22/10;tree(x,z,h,5.2);
  }
 }
 for(const zone of stationFieldZones){
  surfaces.polygon(zone.ring,'#8b9269',.027,'field');
  const points=zone.ring.map(q=>stationLocal(...q)),us=points.map(q=>q[0]),vs=points.map(q=>q[1]);
  for(let v=Math.min(...vs)+4;v<Math.max(...vs);v+=8)for(let u=Math.min(...us);u<Math.max(...us);u+=5){
   const a=stationWorld(u,v),b=stationWorld(u+4.8,v);
   if([a,b].every(q=>pointInRing(...q,zone.ring)&&regionalRoadClear(...q,.8)))surfaces.strip(a,b,.5,'#768158',.039,'ground');
  }
 }
 // Parking cells follow the three satellite-visible paved lots. Only fully
 // contained cells are striped; driving aisles and road mouths stay empty.
 for(const lot of stationParking){
  surfaces.polygon(lot.ring,'#848984',.10,'asphalt');
  const c=Math.cos(lot.angle),s=Math.sin(lot.angle),local=q=>[q[0]*c-q[1]*s,q[0]*s+q[1]*c],world=(u,v)=>[u*c+v*s,-u*s+v*c],points=lot.ring.map(local),us=points.map(q=>q[0]),vs=points.map(q=>q[1]);
  for(let u=Math.min(...us)+2;u<Math.max(...us)-2;u+=2.8)for(let v=Math.min(...vs)+3;v<Math.max(...vs)-3;v+=12){
   const corners=[[-1.25,-2.5],[1.25,-2.5],[1.25,2.5],[-1.25,2.5]].map(([a,b])=>world(u+a,v+b));
   if(!corners.every(q=>pointInRing(...q,lot.ring)&&regionalRoadClear(...q,.2)))continue;
   const [x,z]=world(u,v);report.parkingSpaces.push({x,z,angle:lot.angle,lot:lot.id});
   for(let j=0;j<3;j++)surfaces.strip(corners[j],corners[j+1],.09,'#d9d6be',.125,'paving');
   const stop=world(u,v-2.2);fine.box('#a19e86',stop[0],.18,stop[1],1.5,.16,.16,lot.angle);
   if(report.parkingSpaces.length%4!==1)continue;
   const color=['#d8d6c9','#657881','#8c8e83','#b6aa94'][report.cars%4];
   fine.box(color,x,.68,z,1.8,.72,4.3,lot.angle);fine.box('#4e6369',x,1.19,z,1.6,.62,2.25,lot.angle);fine.box(color,x,1.52,z,1.63,.08,2.3,lot.angle);
   for(const a of [-.92,.92])for(const b of [-1.3,1.3]){const q=world(u+a,v+b);fine.part('globe','#343b39',q[0],.37,q[1],.25,.55,.55,lot.angle);}
   report.cars++;
  }
 }
 // Mapped station-front road remains the carriageway. Crossing stripes and
 // low curb details connect it to the two pedestrian approaches.
 for(const u of [-41,41])for(let k=-4;k<=4;k++)rect(u+k*.8,-81.8,.45,7,'#e1d9c1',.16);
 for(const side of [-1,1])for(let u=75;u<=155;u+=18){const [x,z]=stationWorld(side*u,-67);tree(x,z,6.2,4.8);}
 for(const u of [-99,-62,62,99])lamp(u,-72,7);
 // Bus / taxi waiting shelters: shallow roofs, open sides, seats and signs.
 for(const [u,text] of [[-101,'公交候车'],[100,'出租车候车']]){
  box('#666f67',u,3.2,-70,13,.17,3.4);
  for(const du of [-5.8,5.8])box('#89958c',u+du,1.6,-69,.10,3.2,.10);
  skin.box('glass','#839c94',...at(u,1.75,-68.7),11.7,2.7,.06,p.angle);
  bench(u,-70.5);plaque(text,u,2.9,-71.8,7,.5);
  lights.push({position:at(u,3.08,-70),size:[6,.05,.15],angle:p.angle});
 }
 // Two platforms / four tracks, aligned to the existing mapped rail corridor.
 box('#858878',0,1.2,39,482,2.4,41);
 for(const v of [30.3,36,41.7,47.3]){
  box('#817b6e',0,2.46,v,480,.16,3.6);
  for(let u=-239;u<=239;u+=.75)small('#a7a397',u,2.59,v,.22,.16,2.5);
  for(const side of [-1,1])box('#666f6d',0,2.73,v+side*.718,480,.16,.08);
 }
 for(const [index,v] of [23.7,54].entries()){
  box('#bcb9aa',0,3.13,v,450,1.36,9);
  rect(0,v,450,9,'#c8c4b4',3.82);line([-224,v+(index===0?3.6:-3.6)],[224,v+(index===0?3.6:-3.6)],.24,'#cbbb69',3.835);
  box('#c5cbc7',0,7.6,v,452,.23,10);box('#9aa7a4',0,7.82,v,452,.12,.28);
  for(let u=-216;u<=216;u+=18){
   box('#a0aaa5',u,5.65,v,.28,3.9,.3);box('#9aa5a0',u,7.25,v,.28,.25,8.8);
   lights.push({position:at(u,7.39,v),size:[.16,.06,4],angle:p.angle});
  }
  for(const u of [-168,-72,72,168]){plaque('平遥古城',u,6.25,v,5,.8,index===0?p.angle:p.angle+Math.PI);}
 }
 // Rail bed transitions smoothly back to the existing low-detail route.
 for(const side of [-1,1])skin.quad('stone','#858878',[at(side*241,2.4,18.5),at(side*292,.12,18.5),at(side*292,.12,59.5),at(side*241,2.4,59.5)]);
 for(let u=-228;u<=228;u+=42){
  for(const v of [14,65])box('#87918b',u,6.4,v,.25,12.8,.25);
  box('#7d8783',u,12.8,39.5,.22,.22,51);
 }
 // Forecourt handrails and jointed stone base, avoiding stair/ramp landings.
 for(const side of [-1,1])for(let u=0;u<34;u+=2){
  const x=side*u;small('#b9b8aa',x,4.55,-34.4,.12,1.2,.12);
 }
 box('#c4c3b4',0,5.13,-34.4,68,.12,.16);
 for(const u of [-18,18]){plaque('进站口',u,5.7,-20,4,.7);}
 plaque('出站口',48,5.7,-20,4,.7);
 // Sign textures are reused by text and colour, not one canvas per platform.
 const signCache=new Map(),signMats=[];
 for(const l of labels){
  const key=l.text+l.bg+l.ink;if(!signCache.has(key)){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=l.bg;c.fillRect(0,0,768,128);c.fillStyle=l.ink;c.textAlign='center';c.textBaseline='middle';c.font='bold 65px "PingFang SC",sans-serif';c.fillText(l.text,384,65,720);
   const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map,emissiveMap:map,emissive:'#f2d8a5',emissiveIntensity:0,side:T.DoubleSide,roughness:.8});signCache.set(key,mat);signMats.push(mat);
  }
  const mesh=new T.Mesh(new T.PlaneGeometry(l.w,l.h),signCache.get(key));mesh.position.set(...l.position);mesh.rotation.y=l.angle;mesh.name=l.text;detail.add(mesh);
 }
 surfaces.finish();batch.finish();fine.finish();trees.finish();const masonry=skin.finish();
 const lit=new T.MeshStandardMaterial({color:'#e9dfbf',emissive:'#ffdda2',emissiveIntensity:0}),lenses=new T.InstancedMesh(new T.BoxGeometry(1,1,1),lit,lights.length),t=new T.Object3D();
 lights.forEach((l,i)=>{t.position.set(...l.position);t.scale.set(...l.size);t.rotation.set(0,l.angle,0);t.updateMatrix();lenses.setMatrixAt(i,t.matrix);});lenses.name='高铁站照明';root.add(lenses);
 root.userData=report;
 return {root,report,setNight(v){masonry.setNight(v);lit.emissiveIntensity=v?1.6:0;signMats.forEach(m=>m.emissiveIntensity=v?.55:0);},update(camera){const visible=camera.position.y<(detail.visible?350:300);if(visible===detail.visible)return false;detail.visible=visible;return true;}};
}
