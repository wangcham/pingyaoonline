import {isSchoolSite,schoolSiteIntersects} from './school-sites-data.js';
import * as T from 'three';
import {createUrbanBatch} from './urban-batch.js';
import {createTreeBatch} from './vegetation.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {resolveBuildingHeight} from './building-heights.js';
import {westGroundHeight} from './west-terrain.js';
import {mapData} from './map-data.js';
import {pointInRing,segments,projectOnSegment,sample,makeGrid} from './geography.js';
import {isWestSiteParcel} from './west-sites-data.js';
import {createWestLinkLayout,westLinkSurvey,westLinkOpenGround,westLinkAlleys,isWestLinkStudy,westLinkRoadClear} from './west-link-survey.js';
import {isQixiangBlock} from './qixiang-block-data.js';

export function addWestLinkDistrict(scene){
  return addSurveyDistrict(scene,{name:'平遥二中至三中街坊',layout:createWestLinkLayout,survey:westLinkSurvey,openGround:westLinkOpenGround.filter(g=>!schoolSiteIntersects(g.ring)),alleys:westLinkAlleys,contains:(x,z,pad=0)=>isWestLinkStudy(x,z,pad)&&!isSchoolSite(x,z,pad)&&!isQixiangBlock(x,z,3),roadClear:westLinkRoadClear,reserved:(x,z,pad=0)=>isSchoolSite(x,z,pad)||isWestSiteParcel(x,z,pad)||isQixiangBlock(x,z,pad+3)});
}
export function addSurveyDistrict(scene,config){
  const steps=createSurveyDistrictSteps(scene,config);let result;
  do{result=steps.next();}while(!result.done);return result.value;
}
export function resolveSurveyBuildingRecord(p,useRaster){
  const {x,z,w,d,angle,kind}=p;
  const r=resolveBuildingHeight({x,z,w,d,angle,buildingType:kind==='lowrise'?'residential':kind==='shed'?'industrial':kind,fallbackFloors:p.levels,knownHeight:p.knownHeight,osmHeight:p.osmHeight,osmLevels:p.osmLevels,source:p.heightSource,useRasterHeight:useRaster,preserveFloorClass:true,preferRasterHeight:useRaster!==false&&p.levels<8});
  return {...p,...r,heightSource:r.heightSource==='existing-approximation'?'satellite-morphology-estimate':r.heightSource,levelsSource:'类型和建筑形态估计，非实测层数',heightClass:r.floors<=1?'single-storey':r.floors<=3?'low-rise':r.floors<=7?'multi-storey':'high-rise',name:kind==='residential'?'影像判读住宅楼':kind==='public'?'影像判读公共楼群':kind==='shed'?'影像判读蓝顶长屋':'影像判读低层连排楼房',confidence:r.estimated?Math.min(r.confidence,p.levels>=10?.25:.4):r.confidence,estimated:r.estimated,footprintEstimated:true};
}
// The same geometry path can be consumed synchronously by local districts or
// cooperatively by the regional loader. No reduced-detail replacement code.
export function* createSurveyDistrictSteps(scene,config){
  const {layout:createWestLinkLayout,survey:westLinkSurvey,openGround:westLinkOpenGround,alleys:westLinkAlleys,contains:isWestLinkStudy,roadClear:westLinkRoadClear,reserved:isWestSiteParcel}=config;
  const root=new T.Group();root.name=config.name;scene.add(root);
  const batch=createUrbanBatch(root,{chunkSize:config.chunkSize??0}),surfaces=createSurveySurfaces(root),trees=createTreeBatch(root,{ground:westGroundHeight,leafDensity:12,park:true,chunkSize:config.chunkSize??0});
  const {roofs,omitted}=createWestLinkLayout(),heightRecords=[],windows=[],lampHeads=[];
  const roofGrid=makeGrid(80);
  for(const p of roofs){const xs=p.ring.map(v=>v[0]),zs=p.ring.map(v=>v[1]);roofGrid.add(p,Math.min(...xs)-8,Math.min(...zs)-8,Math.max(...xs)+8,Math.max(...zs)+8);}
  const box=(...p)=>batch.box(...p);
  const inRoof=(x,z,pad=0)=>config.isOccupied?config.isOccupied(x,z,pad):roofGrid.at(x,z).some(p=>{
    if(Math.abs(x-p.x)>p.w/2+p.d/2+pad||Math.abs(z-p.z)>p.w/2+p.d/2+pad)return false;
    const c=Math.cos(p.angle),s=Math.sin(p.angle),dx=x-p.x,dz=z-p.z;
    return Math.abs(dx*c-dz*s)<p.w/2+pad&&Math.abs(dx*s+dz*c)<p.d/2+pad;
  });
  const forecourtSamples=[],courtyardRecords=[];let completedRoofs=0;
  for(const p of roofs){
    const {x,z,w,d,angle,kind}=p,c=Math.cos(angle),s=Math.sin(angle);
    const base=Math.max(...p.ring.map(([x,z])=>westGroundHeight(x,z)))+.08;
    const r=resolveSurveyBuildingRecord(p,config.useRaster);
    const height=r.height,h=height-(kind==='shed'?1.1:.55),storey=h/r.floors;
    heightRecords.push(r);
    const paint=p.wallColor??(kind==='residential'?'#b7b4a3':kind==='public'?'#c8b991':kind==='shed'?'#b2b4a7':['#b9b1a0','#b9ae9a','#c0bba8'][p.id.length%3]);
    function local(fn,color,u,y,v,ww,hh,dd,a=0){fn(color,x+u*c+v*s,base+y,z-u*s+v*c,ww,hh,dd,angle+a);}
    local(box,'#88867a',0,-.08,0,w+.2,.4,d+.2);local(box,paint,0,h/2,0,w,h,d);
    if(kind==='shed'){
      batch.part('roof',p.roofColor,x,base+h,z,w,1.1,d,angle);
      for(let u=-w/2+1;u<w/2;u+=3)local(box,'#788b95',u,h+.025,0,.035,.06,d);
    }else{
      local(box,p.roofColor,0,h+.08,0,w+.22,.16,d+.22);
      for(const side of [-1,1]){local(box,'#aaa99a',0,h+.35,side*(d/2-.08),w,.45,.16);local(box,'#aaa99a',side*(w/2-.08),h+.35,0,.16,.45,d);}
      if(w>30&&r.floors>2)local(box,'#aaa99b',w*.22,h+.5,-d*.18,3.3,.8,2.4);
    }
    // One textured quad per recessed framed window (two triangles), backed by
    // actual walls/sills/entrances. Keeps long apartment rows inexpensive.
    for(let face=0;face<4;face++){
      const a=face*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a),span=face%2?d:w,depth=face%2?w:d;
      const bay=span/Math.max(1,Math.round(span/(kind==='shed'?7:3.8)));
      for(let floor=0;floor<r.floors;floor++)for(let i=0;i<Math.max(1,Math.round(span/bay));i++){
        const off=(i+.5)*bay-span/2,u=off*ca+(depth/2+.035)*sa,v=-off*sa+(depth/2+.035)*ca;
        const ww=Math.min(2.5,bay*.73),hh=Math.min(1.75,storey*.53),y=floor*storey+storey*.57;
        windows.push({x:x+u*c+v*s,y:base+y,z:z-u*s+v*c,w:ww,h:hh,angle:angle+a});
        if(face%2===0&&floor===0&&i%4===1){
          const du=off*ca+(depth/2+.12)*sa,dv=-off*sa+(depth/2+.12)*ca;
          local(box,'#576668',du,1.12,dv,1.3,2.24,.12,a);
          local(box,'#93978f',du,2.46,dv,2.3,.16,1.1,a);
          if(kind==='lowrise'||kind==='commercial')local(box,['#586961','#92725d','#586e7a'][i%3],du,2.8,dv,Math.min(4,bay*.94),.62,.22,a);
        }
        if(face%2===0&&floor>0&&i%3===0&&kind==='residential'){
          local(box,'#c6c4b5',u,floor*storey+.6,v,ww+.35,.13,.6,a);
          local(box,'#bdbcae',u,floor*storey+.95,v+.22*ca,ww+.25,.55,.08,a);
        }
      }
      if(r.floors>1)for(let f=1;f<r.floors;f++)local(box,'#aaa99d',(depth/2+.02)*sa,f*storey,-0+(depth/2+.02)*ca,span,.12,.14,a);
    }
    if(config.courtyardWalls&&kind==='lowrise'&&r.floors<=2&&!config.retailFrontages?.some(s=>s.buildingId===p.id&&Math.cos(s.angle-angle)>.9)){
      for(let u=-w/2+6;u<w/2-6;u+=12){
        const v=d/2+2.45,wx=x+u*c+v*s,wz=z-u*s+v*c;
        const corners=[[-5.5,-2.1],[5.5,-2.1],[5.5,2.1],[-5.5,2.1]].map(([du,dv])=>[wx+du*c+dv*s,wz-du*s+dv*c]);
        if(!corners.every(([xx,zz])=>isWestLinkStudy(xx,zz)&&!inRoof(xx,zz,.15))||!config.detailClear?.(corners))continue;
        for(const side of [-1,1]){local(box,'#96958a',u+side*5.4,.85,v,.16,1.7,4.2);local(box,'#aaa99b',u+side*5.4,1.73,v,.22,.1,4.3);}
        local(box,'#96958a',u-3.25,.85,v+2.02,4.3,1.7,.16);
        local(box,'#96958a',u+3.25,.85,v+2.02,4.3,1.7,.16);
        local(box,'#66726d',u,.94,v+2.05,2.05,1.88,.13);
        local(box,'#aaa99b',u,1.96,v+2.05,2.3,.15,.4);
        surfaces.polygon(corners,'#b1ae9f',.082,'paving');courtyardRecords.push({x:wx,z:wz,ring:corners});
      }
    }
    // Image-visible setbacks between parallel roof rows: small paved aprons,
    // clipped before they meet another building, a lane, field or campus.
    for(const side of [-1,1])for(let u=-w/2+1.5;u<w/2-1.5;u+=3){
      const v=side*(d/2+2.25),wx=x+u*c+v*s,wz=z-u*s+v*c;
      const corners=[[-1.5,-1.8],[1.5,-1.8],[1.5,1.8],[-1.5,1.8]].map(([du,dv])=>[wx+du*c+dv*s,wz-du*s+dv*c]);
      if(!corners.every(([x,z])=>isWestLinkStudy(x,z)&&!isWestSiteParcel(x,z)&&!inRoof(x,z,.3)&&westLinkRoadClear(x,z)&&!westLinkOpenGround.some(g=>pointInRing(x,z,g.ring))))continue;
      surfaces.polygon(corners,kind==='shed'?'#aaa696':'#b3af9f',.085,'paving');forecourtSamples.push([wx,wz]);
    }
    if(++completedRoofs%8===0)yield;
  }
  for(const area of westLinkOpenGround){
    surfaces.polygon(area.ring,area.color,.045,area.kind==='paving'?'paving':area.kind==='field'&&config.fieldTextureOnly?'field':'ground');
    const xs=area.ring.map(p=>p[0]),zs=area.ring.map(p=>p[1]);
    if(area.kind==='field'&&!config.fieldTextureOnly){
      // Thin field furrows, clipped to the observed field polygon; not houses.
      for(let x=Math.min(...xs)+4;x<Math.max(...xs);x+=12)for(let z=Math.min(...zs);z<Math.max(...zs);z+=5){
        const a=[x,z],b=[x+.6,z+4.95];if(pointInRing(...a,area.ring)&&pointInRing(...b,area.ring))surfaces.strip(a,b,1.5,'#777f5c',.052,'ground');
      }
    }
    if(area.kind==='sports'){
      const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
      const rx=(Math.max(...xs)-Math.min(...xs))*.42,rz=(Math.max(...zs)-Math.min(...zs))*.39;
      const oval=Array.from({length:64},(_,i)=>[cx+Math.cos(i*Math.PI/32)*rx,cz+Math.sin(i*Math.PI/32)*rz]);
      surfaces.polygon(oval,'#a0715c',.06,'ground');
      const inner=oval.map(([x,z])=>[cx+(x-cx)*.87,cz+(z-cz)*.77]);surfaces.polygon(inner,'#68806a',.075,'ground');
    }
    yield;
  }
  // Build verified minor lanes behind frontages. Clip every short section to
  // the study boundary, occupied footprints, campuses, fields and public roads.
  const drawnAlleys=[];
  for(const {points,width} of westLinkAlleys)for(const line of segments(points)){
    const n=Math.ceil(line.length/1.5),nx=-(line.end[1]-line.start[1])/line.length,nz=(line.end[0]-line.start[0])/line.length;
    for(let i=0;i<n;i++){
      if(i%96===0)yield;
      const a=sample(line,i/n),b=sample(line,(i+1)/n),corners=[a,b].flatMap(([x,z])=>[-1,1].map(k=>[x+nx*k*width/2,z+nz*k*width/2]));
      if(!corners.every(([x,z])=>isWestLinkStudy(x,z)&&!isWestSiteParcel(x,z)&&!inRoof(x,z,.45)&&westLinkRoadClear(x,z)&&!westLinkOpenGround.some(p=>pointInRing(x,z,p.ring))))continue;
      surfaces.strip(a,b,width,'#94968b',.17,'asphalt');drawnAlleys.push({a,b,width});
    }
  }
  // Street edges / setbacks along the real network; leave carriageways and
  // intersections untouched. Stops and original camera controls are unchanged.
  const roads=(config.roads??mapData.roads).filter(([type])=>!['path','footway','pedestrian'].includes(type)).flatMap(([,width,name,points])=>segments(points).map(line=>({line,width,name})))
    .filter(({line})=>[0,.25,.5,.75,1].some(t=>isWestLinkStudy(...sample(line,t),30)));
  const planting=[],curbs=[],roadNeighbourGrid=makeGrid(80);
  for(const item of roads){const {line,width}=item,pad=width/2+8;roadNeighbourGrid.add(item,Math.min(line.start[0],line.end[0])-pad,Math.min(line.start[1],line.end[1])-pad,Math.max(line.start[0],line.end[0])+pad,Math.max(line.start[1],line.end[1])+pad);}
  function freeTree(x,z){return isWestLinkStudy(x,z)&&!isWestSiteParcel(x,z,4)&&!inRoof(x,z,4)&&westLinkRoadClear(x,z,2.5)&&
    !westLinkOpenGround.some(p=>p.kind!=='green'&&pointInRing(x,z,p.ring))&&
    !drawnAlleys.some(({a,b,width})=>projectOnSegment([x,z],{start:a,end:b,length:Math.hypot(b[0]-a[0],b[1]-a[1])}).distance<width/2+3)&&
    planting.every(p=>Math.hypot(p.x-x,p.z-z)>(config.treeSeparation??10));}
  for(const {line,width,name} of roads){
    const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
    for(let d=2;d<line.length;d+=3){
      if(Math.floor((d-2)/3)%96===0)yield;
      const [x,z]=sample(line,d/line.length);
      for(const side of [-1,1]){
        const px=x-dz*(width/2+1.3)*side,pz=z+dx*(width/2+1.3)*side;
        if(!isWestLinkStudy(px,pz)||isWestSiteParcel(px,pz,2)||inRoof(px,pz,1.5)||
          roadNeighbourGrid.at(px,pz).some(other=>other.line!==line&&projectOnSegment([px,pz],other.line).distance<other.width/2+1.8))continue;
        surfaces.strip([px-dx*1.5,pz-dz*1.5],[px+dx*1.5,pz+dz*1.5],1.8,'#b5b09e',.145,'paving');
        curbs.push([px,pz]);
      }
    }
    if(config.streetFurniture&&width>=6){
      for(let distance=24;distance<line.length;distance+=70){
        const [x,z]=sample(line,distance/line.length);
        if(!isWestLinkStudy(x,z))continue;
        for(const side of [-1,1]){
          const px=x-dz*(width/2+2.5)*side,pz=z+dx*(width/2+2.5)*side;
          if(!isWestLinkStudy(px,pz)||isWestSiteParcel(px,pz,.8)||inRoof(px,pz,1)||!westLinkRoadClear(px,pz,.7))continue;
          const y=westGroundHeight(px,pz),a=-Math.atan2(dz,dx);
          box('#6b716d',px,y+3.25,pz,.15,6.5,.15);
          box('#717874',px+dz*side*.55,y+6.35,pz-dx*side*.55,.15,.15,1.2,a);
          lampHeads.push({x:px+dz*side,y:y+6.36,z:pz-dx*side,angle:a});
          box('#666b65',px,y+.18,pz,1,.035,.33,a);
          for(let k=-.35;k<=.35;k+=.14)box('#9b9d91',px+k*dx,y+.204,pz+k*dz,.025,.015,.30,a);
        }
        // Flush access cover on the carriageway, never a raised obstruction.
        batch.part('stem','#666d69',x,westGroundHeight(x,z)+.156,z,.65,.018,.65);
      }
    }
    // No second tree row is added to the existing Shuncheng detailed road module.
    if(name.includes('顺城')||width<6)continue;
    for(let d=12;d<line.length;d+=(config.treeSpacing??28)){const [x,z]=sample(line,d/line.length);for(const side of [-1,1]){
      const px=x-dz*(width/2+5)*side,pz=z+dx*(width/2+5)*side;if(freeTree(px,pz))planting.push({x:px,z:pz,height:6.8,crown:4.6,base:.16});
    }}
  }
  // Planted internal yards are visible within the apartment estates. These
  // sparse rows follow the open spaces between roofs, never the north fields.
  for(const area of westLinkOpenGround.filter(p=>p.kind==='green')){
    const xs=area.ring.map(p=>p[0]),zs=area.ring.map(p=>p[1]);
    for(let x=Math.min(...xs)+5;x<Math.max(...xs);x+=18)for(let z=Math.min(...zs)+5;z<Math.max(...zs);z+=18)if(pointInRing(x,z,area.ring)&&freeTree(x,z))planting.push({x,z,height:6.1,crown:5.5,base:.08});
  }
  for(const [i,p] of planting.entries()){trees.tree(p,i);if(i%16===0)yield;}
  const treeRoot=trees.finish();yield;surfaces.finish();yield;batch.finish();yield;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d2d1c4';ctx.fillRect(0,0,128,96);ctx.fillStyle='#526b74';ctx.fillRect(5,5,118,86);
  ctx.fillStyle='#879b9e';ctx.fillRect(8,8,53,33);ctx.fillRect(68,8,51,33);ctx.fillStyle='#d2d1c4';ctx.fillRect(61,5,5,86);ctx.fillRect(5,41,118,4);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map:texture,roughness:.43,metalness:.06,emissive:'#d7b97d',emissiveMap:texture,emissiveIntensity:0});
  const pane=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,windows.length),transform=new T.Object3D();
  windows.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.angle,0);transform.scale.set(p.w,p.h,1);transform.updateMatrix();pane.setMatrixAt(i,transform.matrix);});pane.computeBoundingSphere();pane.receiveShadow=true;root.add(pane);
  const lampMaterial=new T.MeshStandardMaterial({color:'#e4dfbf',emissive:'#f7dba1',emissiveIntensity:0,roughness:.45});
  if(lampHeads.length){const heads=new T.InstancedMesh(new T.BoxGeometry(1,1,1),lampMaterial,lampHeads.length);lampHeads.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.angle,0);transform.scale.set(.35,.16,.9);transform.updateMatrix();heads.setMatrixAt(i,transform.matrix);});heads.computeBoundingSphere();root.add(heads);}
  root.userData={heightRecords,approximate:true,survey:westLinkSurvey,roofCount:roofs.length,omitted,treeCount:planting.length,drawnAlleys,curbSamples:curbs,forecourtSamples,planting,courtyardRecords,lampCount:lampHeads.length};
  return {root,treeRoot,setNight(value){material.emissiveIntensity=value?.24:0;lampMaterial.emissiveIntensity=value?1.8:0;}};
}
