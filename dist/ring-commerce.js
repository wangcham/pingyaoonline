import * as T from 'three';
import {mapData} from './map-data.js';
import {segments,sample,projectOnSegment,pointInRing,makeGrid} from './geography.js';
import {clearanceRect,buildingRoadClearance} from './road-clearance.js';
import {isMoatCorridor} from './moat-data.js';
import {isYingxunPark} from './yingxun-park-data.js';
import {createUrbanBatch} from './urban-batch.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {westGroundHeight} from './west-terrain.js';
import {stableDetailVisibility} from './render-stability.js';

export const ringCommerceStops=[
 {name:'城外店面 · 东城沿街',keywords:'城外 店面 店铺 主干道 罗哲文路 东门',address:'罗哲文路 · 沿街铺面与生活商业',eye:[367,3.1,-143],target:[387,2.1,-158]},
 {name:'城外店面 · 北城沿街',keywords:'城外 店面 店铺 主干道 王景慧街 北门',address:'王景慧街 · 北城沿街店面',eye:[-33,3,-825],target:[-30,2,-849]},
 {name:'城外店面 · 柳根街',keywords:'城外 店面 店铺 主干道 柳根街 南门',address:'柳根街 · 连续底商',eye:[-1278,3.1,1196],target:[-1267,2.2,1176]},
];

// Existing footprints own the buildings. This layer only dresses faces that
// actually look onto a main road; trade signs are illustrative, not POI claims.
export function planRingCommerce(records){
 const roadGrid=makeGrid(80),buildingGrid=makeGrid(80),roads=[];
 for(const [type,width,name,path] of mapData.roads){
  if(width<7||['motorway','trunk','motorway_link','trunk_link'].includes(type))continue;
  for(const line of segments(path)){
   const r={line,width,name};roads.push(r);const [a,b]=[line.start,line.end];
   roadGrid.add(r,Math.min(a[0],b[0])-45,Math.min(a[1],b[1])-45,Math.max(a[0],b[0])+45,Math.max(a[1],b[1])+45);
  }
 }
 const buildings=records.map((r,index)=>({...r,index,ring:r.ring??r.footprint??clearanceRect(r.x,r.z,r.w,r.d,r.angle??0)}));
 for(const b of buildings){const xs=b.ring.map(p=>p[0]),zs=b.ring.map(p=>p[1]);buildingGrid.add(b,Math.min(...xs)-1,Math.min(...zs)-1,Math.max(...xs)+1,Math.max(...zs)+1);}
 const shops=[];
 for(const b of buildings){
  if(b.kind==='shed'||b.kind==='public'||b.x< -2200||b.x>1000||b.z< -1250||b.z>2200||pointInRing(b.x,b.z,mapData.wall)||isYingxunPark(b.x,b.z))continue;
  for(const edge of segments([...b.ring,b.ring[0]])){
   if(edge.length<3.4)continue;
   const [x,z]=sample(edge,.5),dx=(edge.end[0]-edge.start[0])/edge.length,dz=(edge.end[1]-edge.start[1])/edge.length;
   let nx=-dz,nz=dx;if(pointInRing(x+nx*.15,z+nz*.15,b.ring)){nx=-nx;nz=-nz;}
   const options=roadGrid.at(x,z).map(r=>({...r,p:projectOnSegment([x,z],r.line)})).filter(r=>{
    const q=sample(r.line,r.p.t),vx=q[0]-x,vz=q[1]-z;
    return r.p.distance<r.width/2+28&&r.p.distance>r.width/2+1.25&&(vx*nx+vz*nz)/r.p.distance>.86;
   }).sort((a,b)=>a.p.distance-b.p.distance);
   if(!options.length)continue;const road=options[0],angle=Math.atan2(nx,nz),cx=Math.cos(angle),sz=-Math.sin(angle);
   const count=Math.max(1,Math.floor(edge.length/5.4)),bay=edge.length/count;
   for(let i=0;i<count;i++){
    const off=(i+.5)*bay-edge.length/2,px=x+cx*off,pz=z+sz*off,w=bay-.22;
    const apron=clearanceRect(px+nx*.48,pz+nz*.48,w,.96,angle);
    if(!buildingRoadClearance.clear(apron)||apron.some(p=>isMoatCorridor(...p,.2)||isYingxunPark(...p)||mapData.areas.some(([,ring])=>pointInRing(...p,ring))))continue;
    // Reject faces hidden behind another row of buildings, including long
    // terraces where only a few bays are directly exposed to the road.
    const q=sample(road.line,projectOnSegment([px,pz],road.line).t);let blocked=false;
    for(let t=.08;t<.95;t+=.08){const ax=px+(q[0]-px)*t,az=pz+(q[1]-pz)*t;if(buildingGrid.at(ax,az).some(o=>o.index!==b.index&&pointInRing(ax,az,o.ring))){blocked=true;break;}}
    if(blocked)continue;
    const variant=(Math.abs(Math.round(px*11+pz*7))+i)%12;
    shops.push({x:px,z:pz,w,angle,variant,road:road.name||'城外主干道',base:b.base??westGroundHeight(px,pz)+.08,apron,buildingIndex:b.index,buildingId:b.id,estimated:true});
   }
  }
 }
 return shops;
}

export function addRingCommerce(scene,records){
 const root=new T.Group();root.name='城外主干道沿街店面';scene.add(root);
 const shops=planRingCommerce(records),solid=createUrbanBatch(root,{chunkSize:180}),skin=createCommerceMaterials(root,{chunkSize:180}),labels=new Map();
 const trades=['面馆','便利店','水果蔬菜','早点铺','五金日杂','家常菜','茶叶','药房','糕点','服装','电动车维修','土特产'];
 const palette=['#8e3c2d','#41695a','#487258','#9b5d35','#50657a','#a04532','#536353','#466958','#976947','#606579','#4e6977','#77533e'];
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=768;const ctx=canvas.getContext('2d');
 trades.forEach((name,i)=>{const x=(i%2)*768,y=Math.floor(i/2)*128;ctx.fillStyle=palette[i];ctx.fillRect(x,y,768,128);ctx.strokeStyle='#d9cab0';ctx.lineWidth=2;ctx.strokeRect(x+10,y+6,748,116);ctx.fillStyle='#f3e8ce';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 58px "PingFang SC",sans-serif';ctx.fillText(name,x+384,y+53,700);ctx.font='18px "PingFang SC",sans-serif';ctx.fillText('欢迎光临',x+384,y+104);});
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const signMaterial=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffe1a7',emissiveIntensity:0,roughness:.8});
 for(const p of shops){
  const c=Math.cos(p.angle),s=Math.sin(p.angle),at=(u,y,v)=>[p.x+u*c+v*s,p.base+y,p.z-u*s+v*c],box=(color,u,y,v,w,h,d)=>solid.box(color,...at(u,y,v),w,h,d,p.angle);
  const w=p.w,v=p.variant;
  skin.box('stone','#c1b7a3',...at(0,1.55,.075),w,3.1,.14,p.angle);
  skin.box('glass',v%3?'#5d7478':'#70817c',...at(0,1.4,.16),w-.35,2.5,.08,p.angle);
  // Framed display windows and a distinct entrance, kept within the facade.
  for(const u of [-w/2+.12,-w*.16,w*.16,w/2-.12])box('#b8b6a6',u,1.4,.23,.075,2.5,.08);
  for(const y of [.19,2.65])box('#b8b6a6',0,y,.23,w-.2,.075,.08);
  for(const u of [-.16,.16])box('#dbcaa4',u,1.24,.29,.035,.42,.045);
  box('#7f796b',0,.09,.34,w,.12,.65);
  box('#b6ab90',0,3.19,.19,w+.04,.92,.25);
  // A shallow awning never projects beyond the reserved 0.96 m apron.
  if(v%3!==1){box(palette[v],0,2.74,.53,w,.12,.86);box(palette[v],0,2.59,.93,w,.22,.055);for(let u=-w/2+.18;u<w/2;u+=.5)box('#d6c5a6',u,2.807,.53,.16,.015,.84);}
  const key=`${Math.floor(p.x/180)}:${Math.floor(p.z/180)}`;if(!labels.has(key))labels.set(key,{p:[],uv:[]});const b=labels.get(key);
  const points=[at(-w/2+.06,2.80,.325),at(w/2-.06,2.80,.325),at(w/2-.06,3.58,.325),at(-w/2+.06,3.58,.325)],u=v%2/2,yy=Math.floor(v/2)/6,uv=[[u,1-yy-1/6],[u+.5,1-yy-1/6],[u+.5,1-yy],[u,1-yy]];
  for(const j of [0,1,2,0,2,3]){b.p.push(...points[j]);b.uv.push(...uv[j]);}
  // Window merchandise is on the outside of the opaque building shell.
  for(const side of [-1,1]){
   const u=side*w*.31;box('#8c795b',u,.75,.33,w*.23,.08,.25);
   for(let j=0;j<4;j++)box(['#bf9b54','#7e8d60','#bd6d48'][j%3],u+(j-1.5)*w*.05,.96,.34,w*.036,.33,.16);
  }
  if([1,2,3,8,11].includes(v)){
   const u=-w*.32;box('#77614a',u,.48,.63,w*.24,.8,.54);box('#b99c69',u,.9,.64,w*.25,.07,.57);
   for(let j=0;j<5;j++)solid.part('globe',['#b49d41','#ba683d','#67824a'][j%3],...at(u+(j-2)*w*.04,1.02,.66),.18,.19,.2);
  }else if(v%3===0){box('#797d6b',-w*.34,.36,.62,.48,.62,.48);solid.part('globe','#72845a',...at(-w*.34,.88,.62),.65,.6,.6);}
  skin.box('lamp','#e5d4a0',...at(0,3.68,.35),w*.65,.05,.12,p.angle);
 }
 for(const b of labels.values()){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeVertexNormals();g.computeBoundingSphere();const m=new T.Mesh(g,signMaterial);m.name='沿街店铺分类招牌';root.add(m);
 }
 solid.finish();const materials=skin.finish(),meshes=[];root.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingSphere();meshes.push(o);}});
 root.userData={shops,people:0,estimated:true,source:'Mapped roads and existing building footprints; illustrative local trades, not surveyed tenant names'};
 const center=new T.Vector3();
 return {root,setNight(v){materials.setNight(v);signMaterial.emissiveIntensity=v?.55:0;},update(camera){let changed=false;for(const m of meshes){const sphere=m.isInstancedMesh?m.boundingSphere:m.geometry.boundingSphere;center.copy(sphere.center).applyMatrix4(m.matrixWorld);const visible=stableDetailVisibility(m.visible,camera.position.distanceTo(center)-sphere.radius,220,280);if(visible!==m.visible){m.visible=visible;changed=true;}}return changed;}};
}
