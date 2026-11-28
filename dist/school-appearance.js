import * as T from 'three';

// Authored, tileable microtextures. They are design approximations, not photographs.
export function schoolTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 let seed=173;const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 ctx.fillStyle=kind==='brick'?'#9d9991':kind==='asphalt'?'#b8b8b8':'#dfdfdb';ctx.fillRect(0,0,256,256);
 if(['paving','courtyard','brick','stone'].includes(kind)){
  const bw=kind==='brick'?64:kind==='stone'?128:64,bh=kind==='brick'?16:kind==='stone'?64:32;
  for(let y=0;y<256;y+=bh)for(let x=-bw;x<256;x+=bw){const offset=(y/bh%2)*(bw/2),shade=205+Math.floor(random()*39);ctx.fillStyle=`rgb(${shade},${shade},${shade-3})`;ctx.fillRect(x+offset+1,y+1,bw-2,bh-2);ctx.fillStyle='rgba(255,255,255,.23)';ctx.fillRect(x+offset+2,y+2,bw-4,1);ctx.fillStyle='rgba(0,0,0,.11)';ctx.fillRect(x+offset+2,y+bh-2,bw-3,1);}
 }
 if(kind==='turf'){ctx.fillStyle='#c3c9bb';ctx.fillRect(0,0,128,256);ctx.fillStyle='#e2e6d8';ctx.fillRect(128,0,128,256);}
 if(kind==='roof'){ctx.fillStyle='#a9aba5';for(let x=0;x<256;x+=16)ctx.fillRect(x,0,2,256);}
 for(let i=0;i<11000;i++){const shade=random()>.5?'255,255,255':'25,24,22';ctx.fillStyle=`rgba(${shade},${kind==='asphalt'?.20:kind==='rubber'?.14:.065})`;ctx.fillRect(random()*256,random()*256,kind==='asphalt'?1.6:1,kind==='turf'?3:1);}
 const map=new T.CanvasTexture(canvas);map.name=`校园-${kind}-原创纹理`;map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;return map;
}
export function schoolSurfaceScale(kind){return ({paving:1.2,courtyard:1.2,stone:2.4,brick:.96,asphalt:2,rubber:2,turf:12,soil:1,ground:2,roof:2})[kind]??1.2;}
export function schoolGroundMaterial(color,kind){const map=schoolTexture(kind);return new T.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='asphalt'?.022:kind==='rubber'?.014:.025,roughness:kind==='rubber'?.86:.95,side:T.DoubleSide});}
export function schoolBuildingStyle(survey,p){
 if(p.type==='shed')return {color:p.neighbour?'#928b79':'#c1c0ae',wall:'brick',trim:'#b0aaa0',roof:p.neighbour?'#5d615c':'#397292'};
 if(p.neighbour)return {color:p.type==='commercial'?'#b8b3a3':'#c5b9a4',wall:'stone',trim:'#e3dcd0',roof:'#74756d'};
 if(survey.id==='vocational')return {color:'#c2bfb0',wall:'stone',trim:'#eee5d6',roof:'#6d7778'};
 return {color:survey.id==='gutao'?'#b25145':'#ad5b4e',wall:'brick',trim:'#e9e4d8',roof:'#666d68'};
}
export function createSchoolFacades(s,survey){
 const buffers=new Map(),materials=[],textures=[],meshes=[];let openings=0;
 function quad(kind,color,points,uv){const key=kind+color;if(!buffers.has(key))buffers.set(key,{kind,color,p:[],uv:[]});const b=buffers.get(key);for(const i of [0,1,2,0,2,3]){b.p.push(...points[i]);b.uv.push(...uv[i]);}}
 function building(b,p){
  const style=schoolBuildingStyle(survey,p),storey=b.h/b.levels;
  for(let face=0;face<4;face++){
   const a=face*Math.PI/2,c=Math.cos(a),sn=Math.sin(a),span=face%2?b.d:b.w,depth=face%2?b.w:b.d;
   const pos=(x,y,off)=>[b.u+x*c+(depth/2+off)*sn,b.base+y,b.v-x*sn+(depth/2+off)*c];
   const panel=(kind,col,x,y,w,h,off=.021)=>quad(kind,col,[pos(x-w/2,y-h/2,off),pos(x+w/2,y-h/2,off),pos(x+w/2,y+h/2,off),pos(x-w/2,y+h/2,off)],[[0,0],[w/schoolSurfaceScale(kind),0],[w/schoolSurfaceScale(kind),h/schoolSurfaceScale(kind)],[0,h/schoolSurfaceScale(kind)]]);
   const part=(fn,col,x,y,w,h,d,off=.12)=>fn(col,...pos(x,y,off),w,h,d,a);
   panel(style.wall,style.color,0,b.h/2,span,b.h);
   panel('stone',p.neighbour?'#77796f':'#655f56',0,.45,span,.9,.035);
   const bay=span/Math.max(1,Math.round(span/(p.type==='shed'?4.8:p.neighbour?3.8:4.1)));
   for(let level=0;level<b.levels;level++){
    if(p.type==='commercial'&&face===0&&level===0)continue;
    // Distinct floor lines and projecting white window sills throw real shadows.
    part(s.box,style.trim,0,level*storey+.12,span,.16,.16);
    for(let x=-span/2+bay/2,index=0;x<span/2;x+=bay,index++){
     const hh=storey*(p.type==='shed'?.32:.52),ww=Math.min(bay*.69,p.neighbour?2.35:2.9),y=level*storey+storey*.59;
     const tint=['#45666e','#60818a','#3b5660','#718485'][(index+level*3+face)%4];
     part(s.box,'#4d514c',x,y,ww+.24,hh+.22,.08,.06);
     part(s.glass,tint,x,y,ww,hh,.07,.13);
     for(const side of [-1,1]){part(s.box,style.trim,x+side*(ww/2+.04),y,.09,hh+.18,.16,.19);part(s.box,style.trim,x,y+side*(hh/2+.04),ww+.18,.09,.16,.19);}
     for(const dx of [-ww/6,ww/6])part(s.box,p.neighbour?'#b8beb9':'#eff0e5',x+dx,y,.048,hh,.08,.24);
     part(s.box,'#d4dcd7',x,y+hh*.24,ww,.045,.08,.24);
     part(s.box,style.trim,x,y-hh/2-.13,ww+.35,.16,.43,.25);
     if((index+level+face)%5===0)part(s.box,'#d7ccaf',x-ww*.31,y,ww*.24,hh-.12,.02,.175);
     if(level===0&&p.neighbour)for(let j=-2;j<=2;j++)part(s.box,'#657169',x+j*ww/5,y,.035,hh,.04,.32);
     openings++;
    }
   }
   // Broad light piers distinguish school wings; each school keeps one coherent palette.
   if(!p.neighbour&&p.type!=='shed')for(let x=-span/2+.35;x<span/2;x+=bay*3)part(s.box,style.trim,x,b.h/2,.3,b.h,.28,.18);
   part(s.box,'#d7d4c7',0,b.h+.55,span+.12,.16,.42,.05);
   part(s.box,'#696e67',0,b.h-.12,span,.11,.25,.08);
  }
  if(p.type!=='shed'){
   // Coarse roof weathering, seams, raised service plinth and vent caps.
   const y=b.base+b.h+.205,w=b.w-.5,d=b.d-.5;
   quad('roof',style.roof,[[b.u-w/2,y,b.v+d/2],[b.u+w/2,y,b.v+d/2],[b.u+w/2,y,b.v-d/2],[b.u-w/2,y,b.v-d/2]],[[0,0],[w/2,0],[w/2,d/2],[0,d/2]]);
   for(let x=b.u-b.w/2+4;x<b.u+b.w/2-3;x+=12){s.box('#9c9e93',x,b.base+b.h+.55,b.v-b.d*.25,.8,.7,.8);s.box('#d3d1c5',x,b.base+b.h+.95,b.v-b.d*.25,1.1,.12,1.1);}
  }
 }
 return {building,finish(){for(const b of buffers.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeVertexNormals();const map=schoolTexture(b.kind),mat=new T.MeshStandardMaterial({map,color:b.color,bumpMap:map,bumpScale:b.kind==='brick'?.035:.018,roughness:.87,side:T.DoubleSide});textures.push(map);materials.push(mat);const mesh=new T.Mesh(g,mat);mesh.name=`校园立面-${b.kind}`;mesh.receiveShadow=true;s.root.add(mesh);meshes.push(mesh);}s.root.userData.schoolAppearance={openings,facadeBatches:meshes.length,authoredMaterials:true};return {dispose(){meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};}};
}

export function addSchoolCourt(s,u,v,w,d){
 const horizontal=w>d,long=Math.max(w,d),short=Math.min(w,d),halfL=long/2-.7,halfW=short/2-.7;
 const point=(x,z)=>horizontal?[u+z,v-x]:[u+x,v+z];
 const segment=(a,b)=>s.line('#eee8d5',point(...a),point(...b),.075,.015,.383);
 const rect=(cx,cz,ww,dd,color,y)=>s.surface([[cx-ww/2,cz-dd/2],[cx+ww/2,cz-dd/2],[cx+ww/2,cz+dd/2],[cx-ww/2,cz+dd/2]].map(p=>point(...p)),color,y,'rubber');
 s.pad(u,v,w,d,'#a2604c',.33,'rubber');rect(0,0,halfW*2,halfL*2,'#477f83',.351);
 const corners=[[-halfW,-halfL],[halfW,-halfL],[halfW,halfL],[-halfW,halfL]];for(let i=0;i<4;i++)segment(corners[i],corners[(i+1)%4]);segment([-halfW,0],[halfW,0]);
 const arc=(x,z,r,start,end)=>{for(let i=0;i<36;i++){const a=start+(end-start)*i/36,b=start+(end-start)*(i+1)/36;segment([x+Math.cos(a)*r,z+Math.sin(a)*r],[x+Math.cos(b)*r,z+Math.sin(b)*r]);}};
 arc(0,0,Math.min(1.8,halfW*.35),0,Math.PI*2);
 for(const side of [-1,1]){
  const keyW=Math.min(4.9,halfW*1.05),keyD=Math.min(5.8,halfL*.5),z=side*(halfL-keyD/2);rect(0,z,keyW,keyD,'#b87753',.365);
  for(const x of [-keyW/2,keyW/2])segment([x,side*halfL],[x,side*(halfL-keyD)]);segment([-keyW/2,side*(halfL-keyD)],[keyW/2,side*(halfL-keyD)]);
  arc(0,side*(halfL-keyD),Math.min(1.8,keyW/2),0,Math.PI*2);
  arc(0,side*(halfL-1.3),Math.min(6.25,halfW-.5),side>0?Math.PI:0,side>0?Math.PI*2:Math.PI);
  const [px,pz]=point(0,side*(halfL-.15)),base=s.ground(px,pz),angle=horizontal?Math.PI/2:0;
  s.box('#315b58',px,base+1.75,pz,.18,3.1,.18);const [bx,bz]=point(0,side*(halfL-.9));
  s.box('#cdded7',bx,base+3.45,bz,1.8,1.08,.09,angle);s.box('#f0eee0',bx,base+3.45,bz,1.84,1.12,.04,angle);
  const [rx,rz]=point(0,side*(halfL-1.35));
  // Circular hoop and hanging net rather than a solid square shelf.
  for(let j=0;j<20;j++){const a=j*Math.PI/10,b=(j+1)*Math.PI/10,xx=rx+Math.cos(a)*.23,zz=rz+Math.sin(a)*.23,ex=rx+Math.cos(b)*.23,ez=rz+Math.sin(b)*.23;s.box('#be6535',(xx+ex)/2,base+3.05,(zz+ez)/2,Math.hypot(xx-ex,zz-ez),.035,.035,-Math.atan2(ez-zz,ex-xx));if(j%2===0)s.box('#d8d8c7',xx,base+2.88,zz,.018,.35,.018);}
 }
}
