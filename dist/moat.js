import * as T from 'three';
import {moatReaches,moatEvidence,moatRoadClear,moatPlantClear,planMoatLandscape} from './moat-data.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {createUrbanBatch} from './urban-batch.js';
import {createTreeBatch} from './vegetation.js';
import {westGroundHeight} from './west-terrain.js';
import {addSmallSouthBridge} from './small-south-bridge.js';

export function moatTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle=kind==='water'?'#c1cec6':'#c8c5b9';c.fillRect(0,0,256,256);
  if(kind==='water'){
    for(let i=0;i<160;i++){const x=i*71%256,y=i*37%256;c.strokeStyle=i%3?'#e7eee052':'#526d6135';c.lineWidth=i%4===0?1.5:.6;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+7,y-2,x+15,y+2,x+24,y);c.stroke();}
  }else{
    for(let i=0;i<1800;i++){c.fillStyle=i%2?'#4c4f4316':'#ffffff20';c.fillRect(i*73%256,i*127%256,1,2);}
    if(kind!=='grass')for(let y=0;y<256;y+=32)for(let x=-64;x<256;x+=64){c.strokeStyle='#656c5c55';c.lineWidth=1.5;c.strokeRect(x+(y%64?32:0),y,64,32);}
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;return texture;
}

export function addMoatLandscape(scene){
  const root=new T.Group();root.name='古城四面护城河与河岸绿化';scene.add(root);
  const ground=westGroundHeight,plan=planMoatLandscape();
  const surfaces=createSurveySurfaces(root,{ground,textureFactory:kind=>moatTexture(kind),tileScale:kind=>kind==='water'?4:2});
  const bank=createUrbanBatch(root,{ground,chunkSize:240}),detail=new T.Group();detail.name='河岸近景设施';root.add(detail);
  const furniture=createUrbanBatch(detail,{ground,chunkSize:240}),trees=createTreeBatch(root,{ground,leafDensity:10,park:true,chunkSize:240});
  // Opaque overlapping foliage lobes keep a full crown at middle distance;
  // small geometry leaves and branching remain visible around its silhouette.
  const foliage=createUrbanBatch(root,{ground,chunkSize:240});
  const points=[],widths=[];
  for(const reach of moatReaches)for(const [i,p]of reach.points.entries()){
    if(i===0&&points.length)continue;points.push(p);widths.push(reach.width);
  }
  if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.01){points.pop();widths.pop();}
  const joins=points.map((p,i)=>{
    const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
    const al=Math.hypot(p[0]-a[0],p[1]-a[1]),bl=Math.hypot(b[0]-p[0],b[1]-p[1]);
    const na=[-(p[1]-a[1])/al,(p[0]-a[0])/al],nb=[-(b[1]-p[1])/bl,(b[0]-p[0])/bl];
    const len=Math.hypot(na[0]+nb[0],na[1]+nb[1]),n=len>.01?[(na[0]+nb[0])/len,(na[1]+nb[1])/len]:nb;
    const miter=Math.min(2,1/Math.max(.1,n[0]*nb[0]+n[1]*nb[1]));return n.map(v=>v*miter);
  });
  let bankSections=0;
  for(let i=0;i<points.length;i++){
    const j=(i+1)%points.length,a=points[i],b=points[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/4),half=widths[i]/2;
    const at=(t,offset)=>[a[0]+(b[0]-a[0])*t+(joins[i][0]*(1-t)+joins[j][0]*t)*offset,a[1]+(b[1]-a[1])*t+(joins[i][1]*(1-t)+joins[j][1]*t)*offset];
    const strip=(lo,hi,t0,t1,color,y,kind)=>surfaces.polygon([at(t0,lo),at(t1,lo),at(t1,hi),at(t0,hi)],color,y,kind);
    // Continuous joined water mesh; both banks use the same mitered path.
    strip(-half,half,0,1,'#7d9e91',.055,'water');
    for(let k=0;k<steps;k++){
      const t0=k/steps,t1=(k+1)/steps,mid=(t0+t1)/2;
      for(const side of [-1,1]){
        const p=at(mid,side*(half+.34));
        const crossing=!moatRoadClear(...p,1.4)||plan.bridges.some(q=>Math.hypot(q.x-p[0],q.z-p[1])<q.width/2+1.2);
        if(!crossing){
          const u=at(t0,side*(half+.32)),v=at(t1,side*(half+.32)),yaw=-Math.atan2(v[1]-u[1],v[0]-u[0]),len=Math.hypot(v[0]-u[0],v[1]-u[1]);
          bank.box('#727b68',...[(u[0]+v[0])/2,.22,(u[1]+v[1])/2,len+.025,.34,.58,yaw]);
          bank.box('#b1b2a0',(u[0]+v[0])/2,.43,(u[1]+v[1])/2,len+.04,.12,.72,yaw);bankSections++;
          // Mortar joints and a dark waterline give the channel a readable edge.
          bank.box('#59695c',(u[0]+v[0])/2,.09,(u[1]+v[1])/2,len,.06,.61,yaw);
          for(const t of [.2,.55,.9]){const q=[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];furniture.box('#7b8272',q[0],.497,q[1],.022,.012,.7,yaw);}
        }
        const walk=at(mid,side*(half+2));
        if(moatRoadClear(...walk,.2)&&moatPlantClear(...at(mid,side*(half+4.4)),.1)){
          strip(side*(half+.76),side*(half+3.2),t0,t1,'#b6b6a4',.08,'paving');
          const grass=at(mid,side*(half+5));
          if(moatPlantClear(...grass,.8))strip(side*(half+3.35),side*(half+6.6),t0,t1,k%3?'#7c8962':'#87926a',.062,'grass');
        }
        if(!crossing&&k%9===3){
          const p=at(mid,side*(half-.2));
          for(let reed=0;reed<5;reed++)furniture.box(reed%2?'#6f7850':'#93905b',p[0]+Math.sin(reed*2.4)*.22,.26+reed*.027,p[1]+Math.cos(reed*2.4)*.22,.035,.40+reed*.055,.035);
        }
      }
    }
  }
  const lenses=[];
  for(const b of plan.bridges){
    const yaw=-Math.atan2(b.dz,b.dx),nx=-b.dz,nz=b.dx;
    const p=(along,side)=>[b.x+b.dx*along+nx*side,b.z+b.dz*along+nz*side];
    // Clear deck with rails on the sides only, no posts across the approaches.
    if(b.smallSouth)addSmallSouthBridge(root,b);
    else bank.box('#a7a897',b.x,.18,b.z,b.length,.18,b.width,yaw);
    for(const side of b.culvert||b.smallSouth?[]:[-1,1]){
      const rail=p(0,side*(b.width/2+.12));
      bank.box('#b2b29e',rail[0],.38,rail[1],b.length,.23,.34,yaw);
      furniture.box('#bfc0aa',rail[0],1.22,rail[1],b.length,.14,.24,yaw);
      furniture.box('#969d8a',rail[0],.68,rail[1],b.length,.13,.20,yaw);
      const count=Math.ceil(b.length/2.3);
      for(let i=0;i<=count;i++){
        const q=p(-b.length/2+b.length*i/count,side*(b.width/2+.12));
        furniture.box('#b3b5a3',q[0],.78,q[1],.28,1.12,.28,yaw);
        furniture.box('#d0ceb8',q[0],1.38,q[1],.36,.16,.36,yaw);
        if(i<count){const q2=p(-b.length/2+b.length*(i+.5)/count,side*(b.width/2+.12));furniture.box('#a5aa97',q2[0],.94,q2[1],.12,.42,.12,yaw);}
      }
    }
    for(const side of [-1,1]){
      const a=p(side*b.length/2,-b.width/2),c=p(side*(b.length/2+1.7),-b.width/2),d=p(side*(b.length/2+1.7),b.width/2),e=p(side*b.length/2,b.width/2);
      const g=new T.BufferGeometry(),corners=[a,c,d,e];g.setAttribute('position',new T.Float32BufferAttribute(corners.flatMap((q,i)=>[q[0],ground(...q)+(i===0||i===3?.271:.14),q[1]]),3));g.setIndex(side===1?[0,2,1,0,3,2]:[0,1,2,0,2,3]);g.computeVertexNormals();const ramp=new T.Mesh(g,new T.MeshStandardMaterial({color:'#a7a897',roughness:.95,side:T.DoubleSide}));ramp.receiveShadow=true;root.add(ramp);
    }
  }
  for(const [i,p]of plan.trees.entries()){
    trees.tree(p);
    for(let j=0;j<6;j++){
      const phase=j*2.39996+i*.73,spread=j===5?0:p.crown*.22;
      foliage.part('globe',['#66764d','#778456','#5e754e','#849160'][(i+j)%4],p.x+Math.cos(phase)*spread,p.height*(j===5?.84:.70+(j%3)*.045),p.z+Math.sin(phase)*spread,p.crown*(j===5?.55:.48),p.height*.29,p.crown*.46,phase);
    }
  }
  for(const [i,p]of plan.shrubs.entries()){
    trees.shrub(p.x,p.z,p.width,p.height,.08);
    for(let j=0;j<3;j++)foliage.part('globe',i%2?'#6c8052':'#7c8e5e',p.x+Math.cos(j*2.4)*p.width*.23,.12+p.height*.42,p.z+Math.sin(j*2.4)*p.width*.23,p.width*.65,p.height*.8,p.width*.48,j);
  }
  for(const {x,z,angle,dx,dz} of plan.furniture){
    const local=(u,v)=>[x+dx*u-dz*v,z+dz*u+dx*v];
    for(let n=0;n<5;n++){const q=local(0,-.26+n*.13);furniture.box('#8f7959',q[0],.51,q[1],2.1,.09,.1,angle);}
    for(const side of [-1,1]){const q=local(side*.78,0);furniture.box('#596357',q[0],.26,q[1],.1,.5,.52,angle);}
    const back=local(0,.3);for(const y of [.83,1.02])furniture.box('#8f7959',back[0],y,back[1],2.1,.14,.08,angle);
    const lamp=local(3.1,0);furniture.box('#525e51',lamp[0],.72,lamp[1],.14,1.42,.14);furniture.box('#687160',lamp[0],1.5,lamp[1],.38,.12,.38);
    lenses.push([lamp[0],ground(...lamp)+1.36,lamp[1]]);
    const bin=local(-2.6,.18);furniture.box('#596b59',bin[0],.48,bin[1],.5,.85,.5,angle);furniture.box('#a7aa95',bin[0],.94,bin[1],.56,.08,.56,angle);
  }
  const skin=surfaces.finish();for(const m of skin.meshes)if(m.name.endsWith('water')){m.name='连续护城河水面';m.material.roughness=.32;m.material.metalness=.12;m.material.bumpScale=.028;}
  bank.finish();furniture.finish();trees.finish();foliage.finish();
  const lightMaterial=new T.MeshStandardMaterial({color:'#e8d9b0',emissive:'#ffce83',emissiveIntensity:0}),lightMesh=new T.InstancedMesh(new T.BoxGeometry(.22,.17,.22),lightMaterial,lenses.length),matrix=new T.Matrix4();
  lenses.forEach((p,i)=>{matrix.makeTranslation(...p);lightMesh.setMatrixAt(i,matrix);});lightMesh.name='沿河低位灯';detail.add(lightMesh);
  root.userData={...moatEvidence,trees:plan.trees.length,shrubs:plan.shrubs.length,benches:plan.furniture.length,bridges:plan.bridges,bankSections};
  let released=false;
  return {root,setNight(v){lightMaterial.emissiveIntensity=v?1.6:0;},update(camera){const visible=camera.position.y<(detail.visible?180:150);if(visible===detail.visible)return false;detail.visible=visible;return true;},dispose(){
    if(released)return;released=true;root.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();
  }};
}
