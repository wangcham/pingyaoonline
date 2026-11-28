import * as T from 'three';
import {mapData} from './map-data.js';
import {segments,sample,projectOnSegment} from './geography.js';
import {planWestFrontages} from './west-corridor.js';
import {planWestGreenery} from './west-greenery.js';
import {westBlockAlleys} from './west-block-data.js';
import {westGroundHeight,westRoadSurfaceHeight} from './west-terrain.js';
import {createUrbanBatch} from './urban-batch.js';

// These furniture locations are design estimates within the already reviewed corridor.
export function planWestStreetFurniture(){
  const trees=planWestGreenery().trees,alleys=westBlockAlleys.flatMap(segments),lamps=[],bikeBays=[];
  const junctions=mapData.roads.filter(([, ,name])=>name!=='下西关街').flatMap(([,width,,points])=>segments(points).map(line=>({line,width})));
  const free=(x,z)=>!alleys.some(line=>projectOnSegment([x,z],line).distance<4)
    &&!junctions.some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+3)
    &&!trees.some(p=>Math.hypot(p.x-x,p.z-z)<2.5)&&Math.abs(x+1858)>18;
  for(const line of segments(mapData.lowerWestRoad)){
    const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
    for(let along=16;along<line.length-8;along+=34){
      const [cx,cz]=sample(line,along/line.length);if(cx< -2055||cx> -1245)continue;
      for(const side of [-1,1]){
        for(const shift of [0,4,-4]){
          const x=cx-dz*side*5.25+dx*shift,z=cz+dx*side*5.25+dz*shift;
          if(!free(x,z))continue;
          lamps.push({x,z,dx,dz,side,base:westRoadSurfaceHeight(x,z),estimated:true});break;
        }
      }
      if(Math.floor(along/34)%4===1){
        const x=cx-dz*7.0,z=cz+dx*7.0;
        if(free(x,z)&&free(x+dx*3,z+dz*3)&&free(x-dx*3,z-dz*3))bikeBays.push({x,z,dx,dz,estimated:true});
      }
    }
  }
  return {lamps,bikeBays};
}
export function addWestStreetExperience(scene){
  const plan=planWestStreetFurniture(),batch=createUrbanBatch(scene),root=new T.Group();root.name='下西关街照明与设施（近似）';scene.add(root);
  const lenses=[],windows=[],pools=[],transform=new T.Object3D();
  for(const p of plan.lamps){
    const {x,z,base,dx,dz,side}=p,nx=-dz*side,nz=dx*side;
    batch.part('stem','#596260',x,base+3.3,z,.12,6.6,.12);
    batch.box('#737975',x,base+.22,z,.25,.44,.25);
    batch.box('#596260',x-nx*.55,base+6.35,z-nz*.55,.09,.09,1.25,Math.atan2(nx,nz));
    const lx=x-nx*1.05,lz=z-nz*1.05;
    batch.box('#4c5655',lx,base+6.28,lz,.55,.16,.9,Math.atan2(nx,nz));
    lenses.push({x:lx,y:base+6.18,z:lz,w:.44,h:.05,d:.72,angle:Math.atan2(nx,nz)});
    p.light=[lx,base+5.95,lz];
    // Pool follows the same crowned road geometry; no floating light planes.
    const center=[x-nx*3,z-nz*3],count=24;
    for(let i=0;i<count;i++){
      for(const [a,r] of [[0,0],[i*Math.PI*2/count,1],[(i+1)*Math.PI*2/count,1]]){
        const px=center[0]+dx*Math.cos(a)*5*r+nx*Math.sin(a)*2.65*r,pz=center[1]+dz*Math.cos(a)*5*r+nz*Math.sin(a)*2.65*r;
        pools.push({position:[px,westRoadSurfaceHeight(px,pz)+.025,pz],color:r?[0,0,0]:[1,.75,.42]});
      }
    }
  }
  for(const {x,z,dx,dz} of plan.bikeBays){
    const yaw=-Math.atan2(dz,dx),nx=-dz,nz=dx;
    // Narrow bicycle bays at the outer pavement edge leave a continuous walking strip.
    for(const side of [-1,1])for(let k=-2.8;k<2.8;k+=.65){
      const px=x+dx*k+nx*side*.28,pz=z+dz*k+nz*side*.28;
      batch.box('#d2cfc2',px,westRoadSurfaceHeight(px,pz)+.022,pz,.38,.015,.045,yaw);
    }
    for(let k=-2.4;k<=2.4;k+=1.2){
      for(const side of [-1,1]){
        const px=x+dx*k+nx*side*.22,pz=z+dz*k+nz*side*.22;
        batch.part('stem','#788580',px,westRoadSurfaceHeight(px,pz)+.3,pz,.055,.6,.055);
      }
      batch.box('#788580',x+dx*k,westRoadSurfaceHeight(x+dx*k,z+dz*k)+.6,z+dz*k,.06,.06,.5,yaw);
    }
  }
  const frontages=planWestFrontages().units;
  for(const [i,p] of frontages.entries()){
    // Jinglin owns its open glass doors and interior lighting. A generic opaque
    // window panel here would cover the entrance and hide the tray rack.
    if(p.shop?.food)continue;
    const front=p.depth/2+.27,base=p.base??westGroundHeight(p.x,p.z),c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    if(p.variant===4&&!p.shop)continue;
    if(i%3!==0)windows.push({x:p.x-p.width*.09*c+front*s,y:base+1.45,z:p.z+p.width*.09*s+front*c,w:p.width*.48,h:1.85,d:.025,angle:p.yaw});
  }
  function luminous(items,name){
    const material=new T.MeshStandardMaterial({color:'#b4beb8',emissive:'#ffcf83',emissiveIntensity:0,roughness:.45});
    const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,items.length);mesh.name=name;
    items.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.angle,0);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
    mesh.computeBoundingSphere();root.add(mesh);return material;
  }
  const lensMaterial=luminous(lenses,'路灯灯头'),windowMaterial=luminous(windows,'沿街橱窗灯光');
  const glowGeometry=new T.BufferGeometry();glowGeometry.setAttribute('position',new T.Float32BufferAttribute(pools.flatMap(p=>p.position),3));glowGeometry.setAttribute('color',new T.Float32BufferAttribute(pools.flatMap(p=>p.color),3));
  const glowMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const glow=new T.Mesh(glowGeometry,glowMaterial);glow.name='贴地灯光范围';glow.visible=false;root.add(glow);
  root.add(batch.finish());
  // Four non-shadow-casting lights are reused near the viewer instead of one per lamp.
  const lights=Array.from({length:4},()=>{const light=new T.PointLight('#ffdfac',0,24,2);light.visible=false;scene.add(light);return light;});
  const signs=[];scene.traverse(mesh=>{if(mesh.userData?.nightSign)signs.push(mesh.material);});
  let night=false,lastUpdate=-Infinity;
  root.userData={estimated:true,lamps:plan.lamps.length,bicycleBays:plan.bikeBays.length,activeLightBudget:lights.length};
  return {root,setNight(value){
    night=value;lastUpdate=-Infinity;glow.visible=value;
    lensMaterial.emissiveIntensity=value?2.3:0;windowMaterial.emissiveIntensity=value?.65:0;
    windowMaterial.color.set(value?'#fff0ce':'#536d75');
    signs.forEach(material=>{material.emissiveIntensity=value?.65:0;});
    for(const light of lights){light.visible=false;light.intensity=0;}
  },update(camera,now){
    if(!night||now-lastUpdate<200)return;lastUpdate=now;
    const nearby=plan.lamps.map(p=>({p,d:Math.hypot(camera.position.x-p.light[0],camera.position.y-p.light[1],camera.position.z-p.light[2])})).filter(v=>v.d<65).sort((a,b)=>a.d-b.d);
    lights.forEach((light,i)=>{const found=nearby[i];light.visible=!!found;light.intensity=found?75:0;if(found)light.position.set(...found.p.light);});
  },dispose(){root.removeFromParent();root.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});lights.forEach(light=>light.removeFromParent());}};
}
