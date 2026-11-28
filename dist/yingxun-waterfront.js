import * as T from 'three';
import {yingxunPonds,isYingxunPark,yingxunParkPaths} from './yingxun-park-data.js';
import {segments,pointInRing,projectOnSegment} from './geography.js';
import {createUrbanBatch} from './urban-batch.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {westGroundHeight} from './west-terrain.js';
import {moatTexture} from './moat.js';

export const waterfrontStops=[
 {name:'人工湖 · 临水步道',keywords:'人工湖 迎薰公园 湖岸 水边 南门',address:'迎薰公园西侧水景 · 水岸细节参考公开航拍近似复原',eye:[-266,4.2,777],target:[-232,1,744]},
 {name:'人工湖 · 东侧水景',keywords:'人工湖 东湖 水景 迎薰公园 石岸',address:'迎薰公园东侧水景',eye:[155,9,797],target:[112,0,753]},
 {name:'小南门桥 · 护城河',keywords:'小南门桥 康宁路 桥 护城河',address:'康宁路跨护城河 · 桥位来自道路交点，石栏造型为照片参考近似',eye:[-579,3.8,907],target:[-597,1.1,891]},
];

export function addYingxunWaterfront(scene){
 const root=new T.Group();root.name='人工湖石岸与亲水步道';scene.add(root);
 const batch=createUrbanBatch(root,{ground:westGroundHeight}),surface=createSurveySurfaces(root,{textureFactory:moatTexture,tileScale:k=>k==='water'?5:2}),lamps=[];
 const report={ponds:yingxunPonds.length,shoreSegments:0,benches:[],reedBeds:0,people:0,estimated:true};
 const inWater=(x,z)=>yingxunPonds.some(r=>pointInRing(x,z,r));
 const pathClear=(x,z,pad=.3)=>!yingxunParkPaths.some(p=>p.type!=='water'&&projectOnSegment([x,z],p.line).distance<p.width/2+pad);
 for(const [index,ring] of yingxunPonds.entries()){
  surface.polygon(ring,'#547d74',.059,'water');
  // Mitered shoreline follows the actual mapped ring, including the small
  // inlets. No rectangular replacement lake or new building footprint.
  const normals=ring.map((p,i)=>{
   const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];
   const len=Math.hypot(b[0]-a[0],b[1]-a[1]);let n=[-(b[1]-a[1])/len,(b[0]-a[0])/len];
   if(pointInRing(p[0]+n[0]*.3,p[1]+n[1]*.3,ring))n=n.map(v=>-v);return n;
  });
  const off=(i,d)=>ring[i].map((v,j)=>v+normals[i][j]*d);
  for(let i=0;i<ring.length;i++){
   const j=(i+1)%ring.length,a=ring[i],b=ring[j],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/1.9);
   const outer=[off(i,.45),off(j,.45),off(j,3.4),off(i,3.4)];
   if(outer.every(p=>isYingxunPark(...p)&&!inWater(...p)))surface.polygon(outer,'#bebba8',.115,'paving');
   for(let k=0;k<n;k++){
    const t=(k+.5)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,yaw=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    batch.box('#737c6d',x,.16,z,len/n+.02,.28,.46,yaw);
    batch.box('#c2c1ad',x,.34,z,len/n-.035,.12,.66,yaw);report.shoreSegments++;
    batch.box('#5c6d60',x,.06,z,len/n,.045,.49,yaw);
   }
   const normal=normals[i],tx=(b[0]-a[0])/len,tz=(b[1]-a[1])/len;
   if(i%7===2){
    const x=a[0]-normal[0]*.4,z=a[1]-normal[1]*.4;
    if(inWater(x,z))for(let k=0;k<9;k++){const px=x+Math.sin(k*2.4)*.4,pz=z+Math.cos(k*2.4)*.4;if(!inWater(px,pz))continue;batch.box(k%2?'#808449':'#9b9863',px,.4+k*.017,pz,.025,.65+k*.03,.025);report.reedBeds++;}
   }
   if(i%9!==3)continue;
   const x=a[0]+normal[0]*4.3,z=a[1]+normal[1]*4.3;
   if(!isYingxunPark(x,z)||inWater(x,z)||!pathClear(x,z,1.3)||report.benches.some(p=>Math.hypot(x-p.x,z-p.z)<12))continue;
   const angle=-Math.atan2(tz,tx),local=(u,v)=>[x+tx*u+normal[0]*v,z+tz*u+normal[1]*v];
   const corners=[[-1.7,-.8],[1.7,-.8],[1.7,.8],[-1.7,.8]].map(p=>local(...p));surface.polygon(corners,'#b9b5a0',.12,'paving');
   for(let k=0;k<5;k++){const q=local(0,-.26+k*.13);batch.box('#8d7757',q[0],.52,q[1],2.3,.08,.1,angle);}
   for(const u of [-.85,.85]){const q=local(u,0);batch.box('#5b6458',q[0],.3,q[1],.12,.5,.55,angle);}
   for(const y of [.82,1.02]){const q=local(0,.32);batch.box('#8d7757',q[0],y,q[1],2.3,.15,.08,angle);}
   const q=local(2.2,0);batch.box('#626e5c',q[0],.61,q[1],.2,1.2,.2);batch.box('#747d67',q[0],1.25,q[1],.35,.1,.35);lamps.push([q[0],westGroundHeight(...q)+1.14,q[1]]);
   report.benches.push({x,z,pond:index});
  }
 }
 batch.finish();const surfaces=surface.finish();for(const m of surfaces.meshes)if(m.name.endsWith('water')){m.name='迎薰人工湖水面';m.material.roughness=.25;m.material.metalness=.16;m.material.bumpScale=.025;}
 const mat=new T.MeshStandardMaterial({color:'#ebdeb9',emissive:'#f7d492',emissiveIntensity:0}),lights=new T.InstancedMesh(new T.BoxGeometry(.23,.14,.23),mat,lamps.length),transform=new T.Matrix4();lamps.forEach((p,i)=>lights.setMatrixAt(i,transform.makeTranslation(...p)));lights.name='人工湖步道灯';root.add(lights);root.userData=report;
 return {root,setNight(v){mat.emissiveIntensity=v?1.5:0;}};
}
