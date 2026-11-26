import * as T from 'three';
import {westGroundHeight} from './west-terrain.js';

// One draw per surface family, world-space UVs and opaque textures. Thousands
// of small polygons do not become thousands of meshes or transparent layers.
export function createSurveySurfaces(root,{ground=westGroundHeight}={}){
  const buffers=new Map(),materials=[],surfaceColor=new T.Color();
  function polygon(ring,color,y=.02,kind='ground',holes=[]){
    if(ring.length<3)return;
    let vertices=ring,indices;
    // Almost all lane/curb/forecourt pieces are convex quads. Append them
    // directly instead of allocating Shape, Path and BufferGeometry per piece.
    let sign=0,convex=ring.length===4&&holes.length===0;
    if(convex)for(let i=0;i<4;i++){const a=ring[i],b=ring[(i+1)%4],c=ring[(i+2)%4],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<1e-9||sign&&Math.sign(cross)!==sign){convex=false;break;}sign=Math.sign(cross);}
    if(convex)indices=sign>0?[0,2,1,0,3,2]:[0,1,2,0,2,3];
    else{
      const contour=ring.map(([x,z])=>new T.Vector2(x,-z)),inner=holes.map(h=>h.map(([x,z])=>new T.Vector2(x,-z)));
      if(!T.ShapeUtils.isClockWise(contour))contour.reverse();
      for(const h of inner)if(T.ShapeUtils.isClockWise(h))h.reverse();
      indices=T.ShapeUtils.triangulateShape(contour,inner).flat();
      vertices=[...contour,...inner.flat()].map(p=>[p.x,-p.y]);
    }
    if(!buffers.has(kind))buffers.set(kind,{positions:[],colors:[],uv:[],indices:[]});
    const b=buffers.get(kind),base=b.positions.length/3,c=surfaceColor.set(color);
    for(const [x,z] of vertices){
      b.positions.push(x,ground(x,z)+y,z);
      const tileScale=kind==='courtyard'?1.2:kind==='paving'?2.4:5;
      b.colors.push(c.r,c.g,c.b);b.uv.push(x/tileScale,z/tileScale);
    }
    for(const i of indices)b.indices.push(i+base);
  }
  function strip(a,b,width,color,y=.12,kind='asphalt'){
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<.01)return;
    const nx=-dz/l*width/2,nz=dx/l*width/2;
    polygon([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],color,y,kind);
  }
  function texture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#dddddd';ctx.fillRect(0,0,128,128);
    for(let i=0;i<1300;i++){ctx.fillStyle=i%2?'rgba(0,0,0,.13)':'rgba(255,255,255,.17)';ctx.fillRect(i*47%128,(i*83+Math.floor(i/7))%128,1,kind==='ground'?3:1);}
    if(kind==='field'){ctx.fillStyle='rgba(50,65,25,.16)';for(let y=0;y<128;y+=16)ctx.fillRect(0,y,128,3);}
    if(kind==='paving'||kind==='courtyard'){ctx.strokeStyle='rgba(70,70,65,.18)';ctx.lineWidth=1;for(let y=0;y<128;y+=32)for(let x=-64;x<128;x+=64)ctx.strokeRect(x+(y/32%2)*32,y,64,32);}
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;return map;
  }
  return {polygon,strip,finish(){
    const meshes=[];
    for(const [kind,b] of buffers){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));g.setAttribute('color',new T.Float32BufferAttribute(b.colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.indices);g.computeVertexNormals();
      const map=texture(kind),mat=new T.MeshStandardMaterial({vertexColors:true,map,bumpMap:map,bumpScale:['paving','courtyard'].includes(kind)?.012:.006,roughness:.94,side:T.DoubleSide});materials.push(mat);
      const mesh=new T.Mesh(g,mat);mesh.receiveShadow=true;mesh.name=`卫星判读地表-${kind}`;root.add(mesh);meshes.push(mesh);
    }
    return {meshes,dispose(){meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});materials.forEach(m=>{m.map.dispose();m.dispose();});}};
  }};
}
