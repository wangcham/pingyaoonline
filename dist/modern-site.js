import * as T from 'three';
import {createUrbanBatch} from './urban-batch.js';
import {createTreeBatch} from './vegetation.js';
import {resolveBuildingHeight} from './building-heights.js';
import {westGroundHeight} from './west-terrain.js';
import {siteToWorld,worldToSite} from './west-sites-data.js';

// Shared rendering only; each site's footprint, massing and entrances are data-driven.
export function createModernSite(scene,survey,{leafDensity=32,chunkSize=0,surfaceMaterialFactory=null,surfaceScale=()=>2.4,surfaceSegmentLength=0}={}){
  const root=new T.Group();root.name=survey.name;root.position.set(survey.origin[0],0,survey.origin[1]);root.rotation.y=survey.angle;
  scene.add(root);
  const batch=createUrbanBatch(root,{chunkSize}),glazing=createUrbanBatch(root,{chunkSize}),lights=[],litMaterials=[],textures=new Set();
  const heightRecords=[];root.userData.heightRecords=heightRecords;root.userData.survey=survey;
  const ground=(u,v)=>westGroundHeight(...siteToWorld(survey,u,v));
  const trees=createTreeBatch(root,{ground,leafDensity,chunkSize});
  const box=(...p)=>batch.box(...p),glass=(...p)=>glazing.box(...p);
  function line(color,a,b,width=.12,height=.04,y=.22){
    const u=(a[0]+b[0])/2,v=(a[1]+b[1])/2;
    box(color,u,ground(u,v)+y,v,Math.hypot(b[0]-a[0],b[1]-a[1]),height,width,-Math.atan2(b[1]-a[1],b[0]-a[0]));
  }
  function groundMaterial(color,kind='pavers'){
    if(surfaceMaterialFactory){const mat=surfaceMaterialFactory(color,kind);if(mat.map)textures.add(mat.map);return mat;}
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,128,128);
    // Authored texture: no satellite photographs are embedded or projected.
    if(kind==='pavers'){
      ctx.strokeStyle='rgba(65,62,57,.22)';ctx.lineWidth=1;
      for(let y=0;y<128;y+=32){ctx.strokeRect(0,y,128,32);for(let x=(y/32%2)*32;x<128;x+=64)ctx.strokeRect(x,y,64,32);}
    }
    for(let i=0;i<650;i++){
      const x=(i*73)%128,y=(i*43+Math.floor(i/7))%128;
      ctx.fillStyle=i%2?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';ctx.fillRect(x,y,1,1);
    }
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.add(map);
    return new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:kind==='asphalt'?.008:.012,roughness:.91,side:T.DoubleSide});
  }
  const surfaces=new Map();
  function surface(ring,color,y=.17,kind='pavers'){
    const key=color+kind;if(!surfaces.has(key))surfaces.set(key,groundMaterial(color,kind));
    const shape=new T.Shape(ring.map(([u,v])=>new T.Vector2(u,-v)));
    let geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
    if(surfaceSegmentLength>0){
      const src=geo.toNonIndexed(),a=src.attributes.position.array,vertices=[];
      // Subdivide long triangles before sampling curved terrain; a boundary-only
      // campus slab can otherwise float over the running field and paths.
      function split(p,q,r){
        const points=[p,q,r],lengths=points.map((v,i)=>Math.hypot(v[0]-points[(i+1)%3][0],v[1]-points[(i+1)%3][1])),k=lengths.indexOf(Math.max(...lengths));
        if(lengths[k]<=surfaceSegmentLength){for(const v of points)vertices.push(v[0],0,v[1]);return;}
        const x=points[k],y=points[(k+1)%3],z=points[(k+2)%3],m=[(x[0]+y[0])/2,(x[1]+y[1])/2];split(x,m,z);split(m,y,z);
      }
      for(let i=0;i<a.length;i+=9)split([a[i],a[i+2]],[a[i+3],a[i+5]],[a[i+6],a[i+8]]);
      src.dispose();geo.dispose();geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));
    }
    const p=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<p.count;i++){p.setY(i,ground(p.getX(i),p.getZ(i))+y);uv.setXY(i,p.getX(i)/surfaceScale(kind),p.getZ(i)/surfaceScale(kind));}
    geo.computeVertexNormals();const mesh=new T.Mesh(geo,surfaces.get(key));mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  function pad(u,v,w,d,color,y=.17,kind='pavers'){return surface([[u-w/2,v-d/2],[u+w/2,v-d/2],[u+w/2,v+d/2],[u-w/2,v+d/2]],color,y,kind);}
  function sign(text,u,y,v,w,h,angle=0,background='#d2c3a2',ink='#773e37'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');
    ctx.fillStyle=background;ctx.fillRect(0,0,1024,192);ctx.font='bold 100px "PingFang SC","Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;ctx.fillText(text,512,101,980);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.add(map);
    const mat=new T.MeshStandardMaterial({map,roughness:.65,emissive:'#fff0ce',emissiveMap:map,emissiveIntensity:0});litMaterials.push(mat);
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(u,y,v);mesh.rotation.y=angle;root.add(mesh);return mesh;
  }
  function building(p,{windows=true,photoLevels=false}={}){
    const {u,v,w,d,type='public',color='#d2bc82',rotation=0}=p,[x,z]=siteToWorld(survey,u,v);
    const rc=Math.cos(rotation),rs=Math.sin(rotation);
    const rotate=(fn)=>(color,px,y,pz,ww,hh,dd,a=0)=>fn(color,u+(px-u)*rc+(pz-v)*rs,y,v-(px-u)*rs+(pz-v)*rc,ww,hh,dd,a+rotation);
    const box=rotate(batch.box),glass=rotate(glazing.box);
    const resolved=resolveBuildingHeight({x,z,w,d,angle:survey.angle+rotation,buildingType:type,
      ...(photoLevels?{levels:p.levels,source:p.heightSource??'facade-photo-level-estimate',storeyHeight:p.storeyHeight}:{fallbackFloors:p.levels,preferRasterHeight:true,preserveFloorClass:true})});
    if(photoLevels)resolved.confidence=p.confidence??.5;
    const {height:h,floors}=resolved;
    const base=Math.max(...[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>ground(u+a*rc+b*rs,v-a*rs+b*rc)))+.18;
    const names={main:'北部主体',link:'连接楼体',south:'南侧楼',north:'北侧楼',west:'西侧楼',east:'东侧楼',middle:'中部楼',southeast:'东南侧附楼','east-link':'东侧连接楼','northwest-annex':'西北附属用房','west-annex':'西侧附属用房'};
    const record={...p,...resolved,id:`${survey.id}-${p.id}`,name:p.name??`${survey.name} · ${names[p.id]??'周边楼房'}`,x,z,w,d,angle:survey.angle+rotation,estimated:true,approximate:true,base};
    heightRecords.push(record);
    box('#8e8a80',u,base-.12,v,w+.35,.6,d+.35);
    box(color,u,base+h/2,v,w,h,d);
    if(type==='public')box('#a47662',u,base+.38,v,w+.08,.76,d+.08);
    box(p.roofColor??'#717975',u,base+h+.1,v,w+.15,.2,d+.15);
    for(const side of [-1,1]){
      box(p.trimColor??'#c6c2b0',u,base+h+.45,v+side*(d/2-.1),w,.7,.22);
      box(p.trimColor??'#c6c2b0',u+side*(w/2-.1),base+h+.45,v,.22,.7,d);
    }
    // Each elevation has windows/frames/recesses, not a single textured cuboid.
    if(windows)for(let face=0;face<4;face++){
      const a=face*Math.PI/2,span=face%2?d:w,depth=face%2?w:d,c=Math.cos(a),s=Math.sin(a);
      const f=(fn,col,dx,y,ww,hh,dd,off=.08)=>fn(col,u+dx*c+(depth/2+off)*s,base+y,v-dx*s+(depth/2+off)*c,ww,hh,dd,a);
      const bay=span/Math.max(1,Math.round(span/3.8)),storey=h/floors;
      for(let level=0;level<floors;level++){
        f(box,p.trimColor??'#c8c2a8',0,level*storey+.15,span,.22,.18);
        for(let dx=-span/2+bay/2;dx<span/2;dx+=bay){
          const y=level*storey+storey*.58,ww=Math.min(bay*.72,2.65),hh=storey*.49;
          f(box,'#e5e1cd',dx,y,ww+.16,hh+.16,.16);
          f(glass,p.glassColor??'#4d6871',dx,y,ww,hh,.09,.19);
          f(box,'#c6cecb',dx,y,.055,hh,.08,.25);
          f(box,'#c6cecb',dx,y+.24,ww,.055,.08,.25);
          if(type==='residential'&&level>0&&Math.round(dx/bay)%3===0)f(box,'#d0cec1',dx+.9,level*storey+.65,.65,.45,.4,.35);
        }
      }
      if(type==='public')for(let dx=-span/2+.5;dx<span/2;dx+=Math.max(8,span/4))f(box,p.pierColor??'#aa6652',dx,h/2,.45,h,.18);
      if(face===0){f(glass,'#344d53',0,1.3,2.4,2.6,.16,.3);f(box,'#9e9c91',0,2.9,3.8,.18,1.8,.85);}
    }
    if(w>18&&d>12){box('#b6b4a6',u-w*.25,base+h+.9,v-d*.15,3.4,1.8,2.8);box('#87908c',u-w*.25,base+h+1.85,v-d*.15,3.7,.15,3.1);}
    return {...record,u,v,h,base};
  }
  function lamp(u,v,height=5.5){
    const base=ground(u,v);box('#5e625b',u,base+height/2,v,.13,height,.13);box('#d1c9a7',u,base+height,v,.8,.16,.36);
    const light=new T.PointLight('#ffe2ac',0,19,2);light.position.set(u,base+height-.15,v);light.visible=false;root.add(light);lights.push(light);
  }
  function finish(){
    batch.finish();const g=glazing.finish();for(const m of g.children){m.material.roughness=.35;m.material.metalness=.16;m.material.emissive.set('#e8d1a0');m.material.emissiveIntensity=0;litMaterials.push(m.material);}
    trees.finish();root.updateMatrixWorld(true);let night=false,disposed=false;
    const controller={root,record:null,setNight(value){night=value;litMaterials.forEach(m=>m.emissiveIntensity=value?.35:0);lights.forEach(l=>{l.intensity=value?14:0;l.visible=value;});},
      update(camera){if(disposed)return;const near=Math.hypot(camera.position.x-survey.origin[0],camera.position.z-survey.origin[1])<220;lights.forEach(l=>l.visible=night&&near);},
      dispose(){if(disposed)return;disposed=true;root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
    return controller;
  }
  return {root,box,glass,part:batch.part,line,surface,pad,sign,building,lamp,trees,ground,finish,local:p=>worldToSite(survey,...p)};
}
