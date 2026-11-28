import * as T from 'three';
import {planSchoolGroundDetails} from './school-ground-layout.js';
import {createTreeBatch} from './vegetation.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {clearanceRect} from './road-clearance.js';
import {segments} from './geography.js';

export function addSchoolGroundDetails(s,survey,details,surfaces){
 const layout=planSchoolGroundDetails(survey,details),masonry=createCommerceMaterials(s.root,{chunkSize:120});
 const planting=createTreeBatch(s.root,{ground:s.ground,leafDensity:12,park:true,chunkSize:120});
 const tubes=[],wheels=[],temp=new T.Object3D(),up=new T.Vector3(0,1,0),shade=new T.Color();
 function tube(a,b,r,color='#65736b'){
  const direction=new T.Vector3(...b).sub(new T.Vector3(...a));temp.position.fromArray(a).add(new T.Vector3(...b)).multiplyScalar(.5);temp.quaternion.setFromUnitVectors(up,direction.clone().normalize());temp.scale.set(r,direction.length(),r);temp.updateMatrix();tubes.push({matrix:temp.matrix.clone(),color});
 }
 function box(color,u,y,v,w,h,d,a=0){s.box(color,u,s.ground(u,v)+y,v,w,h,d,a);}
 function frame(p){const c=Math.cos(p.angle??0),sn=Math.sin(p.angle??0);return (u,y,v)=>[p.u+u*c+v*sn,s.ground(p.u,p.v)+y,p.v-u*sn+v*c];}
 function item(p,color,u,y,v,w,h,d){const q=frame(p)(u,y,v);s.box(color,...q,w,h,d,p.angle??0);}
 function roundedWheel(p,u,y,v,size=1){const q=frame(p)(u,y,v);temp.position.fromArray(q);temp.rotation.set(0,(p.angle??0)+Math.PI/2,0);temp.scale.setScalar(size);temp.updateMatrix();wheels.push(temp.matrix.clone());}
 function fence(p,net=false){
  const at=frame(p),h=net?3.6:p.height;
  if(!net){masonry.box('stone','#8e8b7d',...at(0,.37,0),p.length,.45,.4,p.angle);masonry.box('stone','#c3beac',...at(0,.63,0),p.length,.09,.48,p.angle);}
  for(const x of [-p.length/2,p.length/2]){
   item(p,net?'#426954':'#56665c',x,h/2+.22,0,net?.085:.11,h,.11);
   if(!net){item(p,'#b9b6a4',x,.4,0,.25,.65,.26);item(p,'#a6aa99',x,h+.25,0,.17,.09,.17);}
  }
  const color=net?'#56806a':'#5a6c5e';
  for(const y of net?[.5,1.0,1.5,2.0,2.5,3,3.6]:[.82,h-.1])item(p,color,0,y,0,p.length,.035,net?.025:.055);
  for(let x=-p.length/2+.18;x<p.length/2-.05;x+=net?.4:.19)item(p,color,x,net?2:(h+.72)/2,0,net?.018:.032,net?3.25:h-.72,net?.018:.032);
 }
 for(const p of layout.fences)fence(p);
 for(const p of layout.sportsFences)fence(p,true);
 for(const p of layout.gatePosts){
  masonry.box('stone','#96998b',...frame(p)(0,1.4,0),.68,2.3,.68,p.angle);
  masonry.box('stone','#c0baa6',...frame(p)(0,2.6,0),.85,.16,.85,p.angle);
  item(p,'#54665b',0,1.75,.36,.42,.65,.045);
  masonry.box('lamp','#e4d7b7',...frame(p)(0,2.85,0),.3,.34,.3,p.angle);
 }
 // Connection paving has a contrasting narrow edge, drain grates and flush joins.
 for(const p of layout.connections)for(const e of segments(p.points)){
  surfaces.strip(e.start,e.end,p.width+.16,'#8d8e80',.274,'stone');surfaces.strip(e.start,e.end,p.width,'#c2b59e',.285,'paving');
  const count=Math.floor(e.length/11);for(let i=0;i<count;i++){const t=(i+.5)/count,u=e.start[0]+(e.end[0]-e.start[0])*t,v=e.start[1]+(e.end[1]-e.start[1])*t;box('#686f64',u,.304,v,.55,.025,.43);for(let j=-2;j<=2;j++)box('#a2a89a',u+j*.095,.32,v,.022,.012,.34);}
 }
 for(const p of layout.entries){
  const b=survey.buildings.find(b=>b.id===p.buildingId),record=s.root.userData.heightRecords.find(r=>r.id===`${survey.id}-${p.buildingId}`),base=record?.base??s.ground(p.u,p.v)+.18;
  const v=p.v+p.side*.03;
  s.box('#535c55',p.u,base+1.35,v,1.6,2.7,.14);
  s.glass('#36515b',p.u,base+1.35,v+p.side*.09,1.4,2.5,.06);
  for(const dx of [-.76,0,.76])s.box('#d4d3c0',p.u+dx,base+1.35,v+p.side*.14,.055,2.68,.08);
  for(const dx of [-.12,.12])s.box('#b8c0b8',p.u+dx,base+1.3,v+p.side*.2,.03,.4,.07);
  s.box('#a2a490',p.u,base+2.84,v+p.side*.52,2.5,.17,1.0);
  s.box('#7f8e88',p.u,base+2.95,v+p.side*.52,2.55,.07,1.04);
  s.box('#a59f8d',p.u,base+.06,v+p.side*.47,2.1,.12,.8);
  s.box('#c6bdab',p.u,base-.01,v+p.side*.95,2.3,.08,.3);
  s.box('#3f6263',p.u-1.05,base+1.7,v,.35,.48,.12);
  if(b.neighbour)s.box('#bfc4b4',p.u+1.1,base+1.3,v,.22,.5,.15);
 }
 // Landscape islands alternate soft lawn edges and stone-edged planting beds.
 for(const [i,p] of layout.beds.entries()){
  surfaces.polygon(p.ring,i%3===0?'#79895b':'#6d8153',.325,'ground');
  if(i%3===0){
   const corners=clearanceRect(p.u,p.v,p.w,p.d);for(const e of segments([...corners,corners[0]]))s.line('#b9b29c',e.start,e.end,.14,.16,.32);
  }
  const treeCount=p.w>=12?2:1;
  for(let j=0;j<treeCount;j++){
   const u=p.u+(j-(treeCount-1)/2)*5,v=p.v+(i%2?.7:-.7);surfaces.polygon(clearanceRect(u,v,1.1,1.1),'#6a5f45',.34,'soil');
   planting.tree({x:u,z:v,height:p.residential?4.9+i%3*.5:5.4+i%4*.45,crown:3.2+i%3*.2,base:.34},i*2+j);
   details.trees.push([u,v]);
  }
  // A low hedge and individual shrubs leave the centre of the lawn visible.
  for(let u=p.u-p.w/2+1;u<p.u+p.w/2-1;u+=2.3)planting.shrub(u,p.v+p.d/2-.8,1.35,.58,.34);
  if(i%5===0)for(let j=0;j<4;j++)s.part('globe',['#a9ad7a','#9d775d'][j%2],p.u-1.3+j*.8,s.ground(p.u,p.v)+.56,p.v-p.d/2+1,.5,.3,.5);
 }
 for(const [i,p] of layout.planting.entries()){
  planting.tree({x:p.u,z:p.v,height:5+i%4*.65,crown:3.3,base:.34},3000+i);
  details.trees.push([p.u,p.v]);
  if(i%3===0)for(const side of [-1,1])planting.shrub(p.u+side*1.1,p.v+.8,.85,.5,.34);
 }
 function bench(p){
  for(const x of [-.8,.8])item(p,'#4a5750',x,.5,0,.13,.65,.65);
  for(let j=0;j<4;j++)item(p,'#9b8059',0,.82,-.27+j*.18,2.05,.075,.13);
  for(let j=0;j<3;j++)item(p,'#9b8059',0,1.02+j*.15,-.33,2.05,.1,.08);
  for(const x of [-.8,.8])tube(frame(p)(x,.5,-.3),frame(p)(x,1.4,-.3),.035);
 }
 function bike(p,u,v,index){
  roundedWheel(p,u,.64,v-.48);roundedWheel(p,u,.64,v+.48);
  const at=(x,y,z)=>frame(p)(u+x,y,v+z),tone=['#667d81','#8a6e56','#546a61'][index%3];
  for(const [a,b] of [[[0,.64,-.48],[0,.87,0]],[[0,.87,0],[0,.64,.48]],[[0,.64,-.48],[0,1.04,-.17]],[[0,1.04,-.17],[0,.64,0]],[[0,.64,0],[0,.64,.48]],[[0,1.04,-.17],[0,1.10,.36]],[[0,1.10,.36],[0,.64,.48]]])tube(at(...a),at(...b),.023,tone);
  tube(at(0,1.10,.36),at(0,1.26,.4),.025);tube(at(-.23,1.26,.4),at(.23,1.26,.4),.025);
  item(p,'#373e38',u,1.1,v-.17,.22,.08,.29);
 }
 for(const [i,p] of layout.amenities.entries()){
  if(p.kind==='bench'){bench(p);continue;}
  if(p.kind==='garden-lamp'){
   item(p,'#a3a38e',0,.4,0,.42,.45,.42);item(p,'#58685f',0,2.1,0,.085,3.5,.085);item(p,'#58685f',0,3.9,0,.7,.12,.7);
   const at=frame(p);masonry.box('lamp','#e7d9b1',...at(0,3.7,0),.38,.32,.38,p.angle);continue;
  }
  if(p.kind==='notice-board'){
   for(const x of [-.9,.9])item(p,'#576c60',x,1.2,0,.09,2,.09);
   item(p,'#b1b7a5',0,1.6,0,2.1,1.12,.12);item(p,'#49645c',0,1.6,.07,1.96,.98,.035);
   for(const x of [-.58,0,.58]){item(p,'#dbd6c2',x,1.6,.095,.46,.74,.015);for(let j=0;j<4;j++)item(p,'#828e7f',x,1.8-j*.13,.11,.34,.016,.01);}continue;
  }
  surfaces.polygon(p.ring,p.kind==='fitness'?'#b49270':'#b8b3a2',.3,p.kind==='fitness'?'rubber':'paving');
  if(p.kind==='cycle-shelter'){
   for(const x of [-3.55,0,3.55])for(const z of [-1.4,1.4]){item(p,'#566c65',x,1.6,z,.085,2.6,.085);item(p,'#a8aa96',x,.39,z,.24,.28,.24);}
   item(p,'#758b88',0,2.94,0,7.55,.13,3.2);
   for(let x=-3.7;x<=3.7;x+=.45)item(p,'#9fada2',x,3.015,0,.045,.025,3.22);
   for(let x=-3;x<=3;x+=.75){tube(frame(p)(x,.35,-.5),frame(p)(x,.95,-.5),.026);tube(frame(p)(x,.95,-.5),frame(p)(x,.95,.3),.026);tube(frame(p)(x,.95,.3),frame(p)(x,.35,.3),.026);}
   for(let j=0;j<5;j++)bike(p,-2.8+j*1.35,0,i+j);continue;
  }
  if(p.kind==='study-court'){
   // Small shaded seat group, keeping a straight 2 m walking axis through it.
   for(const x of [-4.5,4.5])for(const z of [-3.2,3.2])item(p,'#7d6d56',x,1.75,z,.18,2.9,.18);
   for(let z=-3.4;z<=3.4;z+=.52)item(p,'#9c8867',0,3.24,z,9.5,.16,.12);
   for(const x of [-3.3,3.3])bench({...p,u:p.u+x,v:p.v-1.5});
   continue;
  }
  if(p.kind==='fitness'){
   for(const x of [-4,-1.5]){tube(frame(p)(x,.36,-2),frame(p)(x,2.65,-2),.06,'#70866d');tube(frame(p)(x,.36,0),frame(p)(x,2.65,0),.06,'#70866d');tube(frame(p)(x,2.65,-2),frame(p)(x,2.65,0),.055,'#c1b47b');}
   for(const z of [1.4,2.5]){for(const x of [-3.4,.6])tube(frame(p)(x,.36,z),frame(p)(x,1.5,z),.055,'#648174');tube(frame(p)(-3.4,1.5,z),frame(p)(.6,1.5,z),.05,'#c4b785');}
   item(p,'#4d7d77',3,1.1,0,2.4,.12,4.2);item(p,'#d3d0b6',3,1.18,0,2.4,.035,.035);item(p,'#839185',3,1.35,0,2.4,.35,.025);
   for(const x of [2.2,3.8])for(const z of [-1.4,1.4])item(p,'#56665d',x,.7,z,.08,.7,.08);
  }
 }
 for(const [i,p] of layout.parking.entries()){
  surfaces.polygon(p.ring,'#6e7771',.29,'asphalt');
  const ring=clearanceRect(p.u,p.v,p.w-.15,p.d-.15,p.angle);for(const e of segments([...ring,ring[0]]))s.line('#ddd6bd',e.start,e.end,.075,.014,.315);
  if(i%3===0)continue; // A mix of empty spaces and parked vehicles.
  const tint=['#d5d7ce','#727f81','#acaba0','#5f6d76'][i%4];
  item(p,tint,0,.87,0,4.25,.64,1.8);item(p,tint,-.25,1.36,0,2.35,.55,1.65);
  for(const side of [-1,1]){item(p,'#425c65',-.25,1.39,side*.835,2.03,.38,.035);item(p,tint,-.25,1.39,side*.865,.09,.43,.035);item(p,'#d7dbcc',side*2.12,.91,.57,.05,.17,.35);}
  item(p,'#4f6870',-.25,1.65,0,1.8,.04,1.45);
  // Wheels lie in XY planes with the axle along the vehicle's local Z.
  for(const x of [-1.35,1.35])for(const z of [-.91,.91]){
   const q=frame(p)(x,.61,z);temp.position.fromArray(q);temp.rotation.set(0,p.angle,0);temp.scale.setScalar(1.05);temp.updateMatrix();wheels.push(temp.matrix.clone());
  }
 }
 const partRoot=new T.Group();partRoot.name='校园与住宅设施细节';s.root.add(partRoot);
 const materials=[],geometries=[];
 for(const [kind,items,geo] of [['steel',tubes,new T.CylinderGeometry(1,1,1,6)],['tyre',wheels,new T.TorusGeometry(.29,.035,4,12)]]){
  const mat=new T.MeshStandardMaterial({color:kind==='tyre'?'#353c35':'#ffffff',roughness:.82}),mesh=new T.InstancedMesh(geo,mat,items.length);
  items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix??item);if(item.color)mesh.setColorAt(i,shade.set(item.color));});mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();partRoot.add(mesh);materials.push(mat);geometries.push(geo);
 }
 planting.finish();const skin=masonry.finish();
 details.connections=layout.connections;details.enclosures=layout.fences;details.gardenBeds=layout.beds;details.planting=layout.planting;details.compoundGates=layout.gates;details.gatePosts=layout.gatePosts;details.amenities=layout.amenities;details.parking=layout.parking;details.sportsFences=layout.sportsFences;
 for(const p of [...layout.fences,...layout.gatePosts,...layout.sportsFences,...layout.beds,...layout.planting,...layout.amenities,...layout.parking])details.furniture.push({kind:p.kind??'fence',ring:p.ring});
 for(const p of layout.connections)details.paths.push(...p.rings);
 s.root.userData.groundDetailAccuracy='既有影像判读边界与楼体；步道连接、围栏样式、树木和设施布置为近似复原';
 return {layout,setNight:skin.setNight,dispose(){skin.dispose();partRoot.removeFromParent();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
