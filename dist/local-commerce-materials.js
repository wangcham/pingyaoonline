import * as T from 'three';
import {schoolTexture,schoolSurfaceScale} from './school-appearance.js';

// Meter-based UVs, per-vertex tints and spatial batches: brick size does not grow
// with the building, and a whole street does not cost one draw call per brick.
export function createCommerceMaterials(root,{chunkSize=180}={}){
 const buffers=new Map(),maps=new Map(),materials=new Map(),meshes=[],color=new T.Color();
 function quad(kind,tint,points,uv=null){
  const center=points.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[2]/4],[0,0]);
  const key=`${kind}:${Math.floor(center[0]/chunkSize)}:${Math.floor(center[1]/chunkSize)}`;
  if(!buffers.has(key))buffers.set(key,{kind,p:[],uv:[],c:[]});const b=buffers.get(key);
  const scale=schoolSurfaceScale(kind),width=Math.hypot(...points[1].map((v,i)=>v-points[0][i])),height=Math.hypot(...points[3].map((v,i)=>v-points[0][i]));
  const coords=uv??[[0,0],[width/scale,0],[width/scale,height/scale],[0,height/scale]];
  color.set(tint);for(const i of [0,1,2,0,2,3]){b.p.push(...points[i]);b.uv.push(...coords[i]);b.c.push(color.r,color.g,color.b);}
 }
 function box(kind,tint,x,y,z,w,h,d,angle=0){
  const c=Math.cos(angle),s=Math.sin(angle),p=(a,b,e)=>[x+a*c+e*s,y+b,z-a*s+e*c],hw=w/2,hh=h/2,hd=d/2;
  for(const q of [
   [[-hw,-hh,hd],[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd]],
   [[hw,-hh,-hd],[-hw,-hh,-hd],[-hw,hh,-hd],[hw,hh,-hd]],
   [[hw,-hh,hd],[hw,-hh,-hd],[hw,hh,-hd],[hw,hh,hd]],
   [[-hw,-hh,-hd],[-hw,-hh,hd],[-hw,hh,hd],[-hw,hh,-hd]],
   [[-hw,hh,hd],[hw,hh,hd],[hw,hh,-hd],[-hw,hh,-hd]],
  ])quad(kind,tint,q.map(v=>p(...v)));
 }
 function finish(){
  for(const [key,b] of buffers){
   if(!materials.has(b.kind)){
    if(!maps.has(b.kind)&&!['glass','lamp'].includes(b.kind))maps.set(b.kind,schoolTexture(b.kind));
    const map=maps.get(b.kind)??null,lit=['sign','glass','lamp'].includes(b.kind);
    const mat=new T.MeshStandardMaterial({map,vertexColors:true,bumpMap:lit?null:map,bumpScale:b.kind==='brick'?.038:.018,roughness:b.kind==='glass'?.3:.92,metalness:b.kind==='glass'?.12:0,side:T.DoubleSide,emissive:lit?'#ffe3ab':'#000000',emissiveMap:b.kind==='sign'?map:null,emissiveIntensity:0});
    materials.set(b.kind,mat);
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.computeBoundingSphere();
   const mesh=new T.Mesh(g,materials.get(b.kind));mesh.name=`生活街区材质-${key}`;mesh.castShadow=!['sign','glass','lamp'].includes(b.kind);mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);
  }
  return {meshes,setNight(value){for(const [kind,mat] of materials)mat.emissiveIntensity=value?kind==='lamp'?.8:kind==='glass'?.18:kind==='sign'?.25:0:0;},dispose(){meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});materials.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());}};
 }
 return {box,quad,finish};
}

// Upgrade an existing mall shell without changing its surveyed footprint/windows.
export function addCommerceMallSkin(root,buildings){
 const m=createCommerceMaterials(root);
 for(const b of buildings){
  const u=b.u??0,v=b.v??0,w=b.w,d=b.d,h=b.h,base=b.base??0;
  for(let face=0;face<4;face++){
   const a=(b.rotation??0)+face*Math.PI/2,c=Math.cos(a),s=Math.sin(a),span=face%2?d:w,dep=face%2?w:d;
   const point=(x,y,off=.012)=>[u+x*c+(dep/2+off)*s,base+y,v-x*s+(dep/2+off)*c];
   m.quad('stone',b.color??'#c9bc9e',[point(-span/2,0),point(span/2,0),point(span/2,h),point(-span/2,h)]);
   m.quad('stone','#777269',[point(-span/2,.05,.025),point(span/2,.05,.025),point(span/2,.45,.025),point(-span/2,.45,.025)]);
  }
  const ry=base+h+(b.roofOffset??.21);
  m.quad('roof','#89918a',[[u-w/2,ry,v+d/2],[u+w/2,ry,v+d/2],[u+w/2,ry,v-d/2],[u-w/2,ry,v-d/2]]);
 }
 return m.finish();
}
