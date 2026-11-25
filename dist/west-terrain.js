import * as T from 'three';
import {mapData} from './map-data.js';
import {segments, sample,projectOnSegment} from './geography.js';
import {westElevation} from './west-elevation.js';
import {westBlockAlleys} from './west-block-data.js';

const westRoute = segments(mapData.lowerWestRoad);
const elevationBase = Math.min(...westElevation.map(([,level])=>level));
const smooth = (a,b,t) => {
  const v=Math.max(0,Math.min(1,(t-a)/(b-a)));
  return v*v*(3-2*v);
};

function roadLevelAtX(x) {
  const i=Math.max(0,Math.min(westElevation.length-2,Math.floor((x-westElevation[0][0])/25)));
  const [ax,a]=westElevation[i], [bx,b]=westElevation[i+1];
  const t=Math.max(0,Math.min(1,(x-ax)/(bx-ax)));
  return a+(b-a)*t-elevationBase+.12;
}

export function westGroundHeight(x,z) {
  if (x <= -2160 || x >= -1180 || z <= -95 || z >= 285) return 0;
  const line=westRoute.find(s=>x<=s.end[0]) ?? westRoute.at(-1);
  const t=Math.max(0,Math.min(1,(x-line.start[0])/(line.end[0]-line.start[0])));
  const [,roadZ]=sample(line,t);
  const across=1-smooth(28,116,Math.abs(z-roadZ));
  const ends=smooth(-2160,-2074,x)*(1-smooth(-1248,-1180,x));
  return roadLevelAtX(x)*across*ends;
}

function surfaceTexture(kind) {
  const canvas=document.createElement('canvas');
  canvas.width=256;
  canvas.height=256;
  const ctx=canvas.getContext('2d');
  let state=4793;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  if(kind==='pavers') {
    ctx.fillStyle='#8e8b81';
    ctx.fillRect(0,0,256,256);
    for(let row=0;row<8;row++) {
      for(let col=-1;col<8;col++) {
        const x=col*32+(row%2)*16;
        const gray=173+Math.floor(random()*22);
        ctx.fillStyle=`rgb(${gray+6},${gray+4},${gray})`;
        ctx.fillRect(x+1,row*32+1,30,30);
        ctx.fillStyle='#ffffff33';
        ctx.fillRect(x+2,row*32+2,28,1);
      }
    }
  } else {
    const pixels=ctx.createImageData(256,256);
    const base=kind==='asphalt'?108:155;
    for(let i=0;i<pixels.data.length;i+=4) {
      const n=base+(random()+random()-1)*32;
      pixels.data[i]=n+(kind==='asphalt'?0:6);
      pixels.data[i+1]=n+(kind==='asphalt'?1:4);
      pixels.data[i+2]=n+(kind==='asphalt'?3:0);
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.anisotropy=8;
  return texture;
}

const sectionOffsets=[-7.4,-4.91,-4.68,-4.66,-4.30,-2.15,0,2.15,4.30,4.66,4.68,4.91,7.4];
const sectionHeights=[.16,.23,.22,.055,.04,.10,.15,.10,.04,.055,.22,.23,.16];
const bandMaterials=[2,2,3,1,0,0,0,0,1,3,2,2];
const roadJunctionXs=[-2068.9,-2027.1,-1959.6,-1527.5,-1206.8,...westBlockAlleys.map(path=>path[0]).filter(([x,z])=>westRoute.some(s=>{
  const t=(x-s.start[0])/(s.end[0]-s.start[0]);
  return t>=0&&t<=1&&Math.abs(sample(s,t)[1]-z)<3;
})).map(([x])=>x)];

function junctionInfluence(x) {
  const closest=Math.min(...roadJunctionXs.map(k=>Math.abs(k-x)));
  return 1-smooth(3.4,10.3,closest);
}

function pavementLift(x,offset) {
  const u=Math.abs(offset);
  for(let i=6;i<sectionOffsets.length-1;i++) {
    if(u<=sectionOffsets[i+1]) {
      const t=(u-sectionOffsets[i])/(sectionOffsets[i+1]-sectionOffsets[i]);
      const rise=sectionHeights[i]+(sectionHeights[i+1]-sectionHeights[i])*t;
      return rise+(0.08-rise)*junctionInfluence(x)*smooth(3.6,4.9,u);
    }
  }
  return 0;
}

function streetFrames() {
  const route=mapData.lowerWestRoad;
  const normals=westRoute.map(({start,end,length})=>[-(end[1]-start[1])/length,(end[0]-start[0])/length]);
  let distance=0;
  function frame(x,z,normal) { return {x,z,nx:normal[0],nz:normal[1],distance}; }
  const frames=[];
  for(let i=0;i<westRoute.length;i++) {
    const segment=westRoute[i], normal=normals[i], previous=normals[Math.max(0,i-1)];
    const sum=[normal[0]+previous[0],normal[1]+previous[1]];
    const dot=Math.max(.4,sum[0]*normal[0]+sum[1]*normal[1]);
    frames.push(frame(...segment.start,sum.map(v=>v/dot)));
    const steps=Math.ceil(segment.length/1.9);
    const step=segment.length/steps;
    for(let j=1;j<steps;j++) {
      distance+=step;
      frames.push(frame(...sample(segment,j/steps),normal));
    }
    distance+=step;
  }
  frames.push(frame(...route.at(-1),normals.at(-1)));
  return frames;
}

function roadPoint(frame,offset,lift=0) {
  const x=frame.x+frame.nx*offset, z=frame.z+frame.nz*offset;
  return [x,westGroundHeight(x,z)+pavementLift(frame.x,offset)+lift,z];
}

// Shared by road details, entrance ramps and light pools: one surface height source.
export function westRoadSurfaceHeight(x,z){
  let best=null;
  for(const line of westRoute){const p=projectOnSegment([x,z],line);if(!best||p.distance<best.distance)best={...p,line};}
  const [px,pz]=sample(best.line,best.t),dx=(best.line.end[0]-best.line.start[0])/best.line.length,dz=(best.line.end[1]-best.line.start[1])/best.line.length;
  const offset=-(x-px)*dz+(z-pz)*dx;
  return westGroundHeight(x,z)+(Math.abs(offset)<=7.4?pavementLift(px,offset):.08);
}

export function addWestRoadSurface(scene) {
  const ground=new T.PlaneGeometry(980,380,180,76);
  ground.rotateX(-Math.PI/2);
  ground.translate(-1670,0,95);
  const terrain=ground.attributes.position, terrainUV=ground.attributes.uv;
  for(let i=0;i<terrain.count;i++) {
    const x=terrain.getX(i),z=terrain.getZ(i);
    terrain.setY(i,westGroundHeight(x,z)-.075);
    terrainUV.setXY(i,x/4,z/4);
  }
  ground.computeVertexNormals();
  const terrainMesh=new T.Mesh(ground,new T.MeshStandardMaterial({color:'#c3b692',roughness:1}));
  terrainMesh.receiveShadow=true;
  scene.add(terrainMesh);

  const asphalt=surfaceTexture('asphalt');
  const materials = [
    new T.MeshStandardMaterial({map:asphalt,bumpMap:asphalt,bumpScale:.013,roughness:.97,vertexColors:true,side:T.DoubleSide}),
    new T.MeshStandardMaterial({map:surfaceTexture('gutter'),color:'#968c78',roughness:.92,vertexColors:true,side:T.DoubleSide}),
    new T.MeshStandardMaterial({map:surfaceTexture('pavers'),roughness:.85,vertexColors:true,side:T.DoubleSide}),
    new T.MeshStandardMaterial({color:'#bcb5a5',roughness:.93,vertexColors:true,side:T.DoubleSide}),
  ];
  const frames=streetFrames();
  const positions=[],uvs=[],colors=[],indices=[];
  const geo=new T.BufferGeometry();
  for(let i=0;i<bandMaterials.length;i++) {
    const groupStart=indices.length;
    const first=positions.length/3;
    const a=sectionOffsets[i],b=sectionOffsets[i+1];
    frames.forEach((frame,k)=>{
      const v=frame.distance;
      const variation=1+.042*Math.sin(v*.09)+.035*Math.sin(v*.017+i*.83);
      for(const u of [a,b]) {
        positions.push(...roadPoint(frame,u));
        const repeat=bandMaterials[i]===2?2.4:3.0;
        uvs.push(u/repeat,v/repeat);
        colors.push(variation,variation,variation);
      }
      if(k>0) {
        const index=first+2*k;
        indices.push(index-2,index-1,index,index-1,index+1,index);
      }
    });
    geo.addGroup(groupStart,indices.length-groupStart,bandMaterials[i]);
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const road=new T.Mesh(geo,materials);
  road.receiveShadow=true;
  scene.add(road);

  function flatDetail(points,color) {
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
    g.setIndex([0,1,2,0,2,3]);
    g.computeVertexNormals();
    const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.89,side:T.DoubleSide}));
    mesh.receiveShadow=true;
    scene.add(mesh);
  }

  for(let i=2;i<frames.length-2;i+=7) {
    const a=frames[i], b=frames[i+2];
    if(junctionInfluence(a.x)>.3) continue;
    flatDetail([roadPoint(a,-.065,.006),roadPoint(a,.065,.006),roadPoint(b,.065,.006),roadPoint(b,-.065,.006)],'#c8af79');
  }
  for(let i=16;i<frames.length-15;i+=39) {
    const f=frames[i];
    if(junctionInfluence(f.x)>.15) continue;
    const offset=(i%2?1:-1)*1.75;
    const [x,y,z]=roadPoint(f,offset,.008);
    const lid=new T.Mesh(new T.CylinderGeometry(.29,.30,.025,20),new T.MeshStandardMaterial({color:'#4b4741',metalness:.66,roughness:.69}));
    lid.position.set(x,y,z);
    scene.add(lid);
  }
  for(let i=20;i<frames.length-12;i+=27) {
    const f=frames[i];
    if(junctionInfluence(f.x)>.15) continue;
    const side=i%2?1:-1;
    const shifted = d=>({...f,x:f.x+f.nz*d,z:f.z-f.nx*d});
    const from=shifted(-.36),to=shifted(.36);
    flatDetail([roadPoint(from,4.32*side,.006),roadPoint(from,4.63*side,.006),
      roadPoint(to,4.63*side,.006),roadPoint(to,4.32*side,.006)],'#423e36');
    for(let row=-2;row<=2;row++) {
      const a=shifted(row*.113), b=shifted(row*.113+.035);
      flatDetail([roadPoint(a,4.34*side,.013),roadPoint(a,4.61*side,.013),
        roadPoint(b,4.61*side,.013),roadPoint(b,4.34*side,.013)],'#858071');
    }
  }
}
