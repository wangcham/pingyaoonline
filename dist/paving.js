import * as T from 'three';

// Procedural material authored from the supplied street photo's gray slabs and wear.
// The photo is a color / joint reference, not projected over the map as a photograph.
export function createPavingMaterial(kind='street') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');
  let seed=9217;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  ctx.fillStyle='#383b3c';ctx.fillRect(0,0,512,256);
  for(let row=0;row<4;row++)for(let col=-1;col<5;col++) {
    const x=col*128+(row%2)*64,y=row*64,v=78+rand()*25;
    ctx.fillStyle=`rgb(${v+3},${v+3},${v+1})`;ctx.fillRect(x+1.5,y+1.5,125,61);
    ctx.strokeStyle='rgba(170,165,150,.18)';ctx.lineWidth=1;ctx.strokeRect(x+3,y+3,121,57);
    for(let k=0;k<70;k++) {
      const p=x+4+rand()*119,q=y+4+rand()*54;
      ctx.fillStyle=rand()>.5?'rgba(191,177,148,.10)':'rgba(36,40,42,.10)';
      ctx.fillRect(p,q,1+rand()*10,1+rand()*2);
    }
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;
  const material=new T.MeshStandardMaterial({color:kind==='street'?'#dadcda':'#c1c1b9',map:texture,bumpMap:texture,bumpScale:.018,roughness:.79,side:T.DoubleSide});
  // Physical slab dimensions remain 0.8 × 0.4 m on both scaled instances and polygons.
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 pavingPoint=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        pavingPoint=instanceMatrix*pavingPoint;
      #endif
      vec2 pavingUV=(modelMatrix*pavingPoint).xz/vec2(3.2,1.6);
      #ifdef USE_MAP
        vMapUv=pavingUV;
      #endif
      #ifdef USE_BUMPMAP
        vBumpMapUv=pavingUV;
      #endif`);
  };
  material.customProgramCacheKey=()=> 'pingyao-slab-world-uv-v1';
  return material;
}
