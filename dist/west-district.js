import * as T from 'three';
import {resolveBuildingHeight} from './building-heights.js';
import {addYufengBlock,isYufengBlock,yufengStops} from './yufeng-block.js';
import {mapData} from './map-data.js';
import {pointInRing, projectOnSegment, segments} from './geography.js';
import {westGroundHeight} from './west-terrain.js';
import {createTreeBatch} from './vegetation.js';
import {surveyedWestPark} from './west-green-survey.js';
import {addJunctionJewelry,jewelryStops} from './junction-jewelry.js';

export const commercialPlots = [
  {x:-1450,z:151,w:106,d:70,floors:5,facade:'#bab2a2',trim:'#635c56',glass:'#426678',
    name:'陶源丰新天地',subtitle:'顺城路72号',groundShops:['汇丰通讯','乔丹体育','学而思学习机','万家惠生鲜超市'],face:Math.PI},
  {x:-1451,z:18,w:98,d:105,floors:5,facade:'#a69d93',trim:'#8c4240',glass:'#53818e',
    name:'宇峰购物广场',subtitle:'顺城北路口东北侧',groundShops:['幸运咖','岭峥炒栗'],face:0},
  {x:-1565,z:-10,w:35,d:39,floors:9,facade:'#a3a9a6',trim:'#565e61',glass:'#52798b',
    name:'宇峰写字楼',subtitle:'顺城路28号',groundShops:['如家华驿酒店','新味轩'],face:-Math.PI/2},
  {x:-1548,z:165,w:35,d:63,floors:7,facade:'#b4a793',trim:'#564c49',glass:'#5c737d',
    name:'万人商厦',subtitle:'顺城路37号',groundShops:['汉庭优佳酒店'],face:Math.PI/2},
  {x:-1575,z:69,w:52,d:32,floors:6,facade:'#bdad95',trim:'#345052',glass:'#5d7a85',
    name:'希岸酒店',subtitle:'顺城路31号',groundShops:['希岸酒店'],face:0},
  {x:-1503,z:56,w:39,d:28,floors:7,facade:'#b0a897',trim:'#654b73',glass:'#637d86',
    name:'麗枫酒店',subtitle:'顺城路56号',groundShops:['麗枫酒店'],face:0},
];

export const westDistrictStops = [
  ...jewelryStops,
  ...yufengStops,
  {name:'下西关街 × 顺城路商业路口',keywords:'顺城北路 下西关街 交叉口 商业街',address:'陶源丰新天地、宇峰购物广场、万人商厦附近',
    eye:[-1542,7.0,105],target:[-1476,8.8,105]},
  {name:'又见平遥 · 周边街坊',keywords:'又见平遥 剧场 周边 后街 街坊 绿地',address:'剧场西侧建筑街坊与东侧绿地 · 建筑细分近似',
    eye:[-1385,2.0,512],target:[-1267,12,451]},
  {name:'永定公园',keywords:'又见平遥 公园 草地 人工湖 上西门',address:'上西门外 · 按地图公园范围和公开规划做近似',
    eye:[-1087,18,1101],target:[-1136,1,992]},
  ...commercialPlots.map(({name,subtitle,x,z,face,w,d})=>{
    const depth=Math.abs(Math.sin(face))>.5?w:d;
    const mall=name==='陶源丰新天地'||name==='宇峰购物广场';
    const eye=mall?[x-12,8,94]:[x+Math.sin(face)*(depth/2+22),6.4,z+Math.cos(face)*(depth/2+22)];
    const target=mall?[x,11,z+Math.cos(face)*depth/2]:[x,11,z];
    return {name,keywords:name==='陶源丰新天地'?'桃源峰 桃源丰 陶源峰 顺城路72号 商场':'顺城路商业楼 宇锋',
      address:subtitle+' · 建筑体量示意',eye,target};
  }),
];

// Satellite review shows buildings west of the theater; retain mapped green areas only.
const greenAreas = [surveyedWestPark,mapData.yongdingPark];
const parkPaths = [
  [[-1179,930],[-1161,958],[-1164,998],[-1154,1062],[-1124,1115],[-1081,1119],[-1081,1081],[-1095,1032],[-1110,995],[-1133,949],[-1179,930]],
];
const parkWater = [
  [-1150,978],[-1126,974],[-1109,1003],[-1096,1042],[-1093,1070],
  [-1109,1089],[-1137,1090],[-1151,1065],[-1159,1039],[-1156,1005],
];

export function isWestDistrictParcel(x,z,radius=0) {
  const mallApproach=x-radius<-1400&&x+radius>-1505&&z+radius>70&&z-radius<116;
  return isYufengBlock(x,z,radius) || mallApproach || commercialPlots.some(plot=>Math.abs(x-plot.x)<plot.w/2+radius+2&&Math.abs(z-plot.z)<plot.d/2+radius+2)
    || greenAreas.some(ring=>pointInRing(x,z,ring));
}

function pathCurve(points) {
  return new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
}

export function addWestDistrict(scene,box,namedBoard) {
  addYufengBlock(scene,namedBoard);
  for (const plot of commercialPlots) {
    const {x,z,w,d,floors,facade,trim,glass,name,groundShops,face}=plot;
    const group=new T.Group();
    group.position.set(x,westGroundHeight(x,z),z);
    group.rotation.y=face;
    scene.add(group);
    const sideways=Math.abs(Math.sin(face))>.5;
    const width=sideways?d:w, depth=sideways?w:d;
    const podium = width>80;
    const height=5.2+(floors-1)*(podium?4:3.35);
    group.userData.buildingRecord={id:`commercial-${name}`,name,x,z,w,d,angle:face,
      ...resolveBuildingHeight({x,z,w,d,buildingType:name.includes('酒店')?'hotel':name.includes('写字楼')?'office':'commercial',fallbackFloors:floors,estimatedHeight:height}),
      height,levels:floors,floors,heightSource:'existing-approximation',source:'existing-approximation',confidence:.3,estimated:true,approximate:true,footprintSource:'AMap-POI-and-image-estimate',footprintEstimated:true};
    const front=depth/2;
    box(group,'#a8a195',0,-.55,0,width+1,1.1,depth+1);
    box(group,facade,0,height/2,0,width,height,depth);
    box(group,trim,0,height+.25,0,width+.6,.7,depth+.65);
    box(group,facade,width*.22,height+1.45,-depth*.2,width*.25,2.6,depth*.32);
    box(group,'#b4ada0',0,.12,front+2.3,width+.4,.24,4.8);
    box(group,trim,0,4.45,front+.7,width+.35,.55,1.65);
    for(const side of [-1,1]) {
      const windows=Math.floor(width/(podium?5.45:4.55));
      for(let floor=1;floor<floors;floor++) {
        const y=4.7+(floor-.5)*(podium?4:3.35);
        for(let i=0;i<windows;i++) {
          const xx=(i-(windows-1)/2)*(podium?5.45:4.55);
          box(group,glass,xx,y,side*(front+.075),podium?4.65:2.68,podium?2.55:1.9,.17);
          if(podium) box(group,'#9babb0',xx+.37,y,side*(front+.18),.11,2.57,.07);
        }
      }
    }
    for(const side of [-1,1]) for(let floor=1;floor<floors;floor++) {
      const y=4.7+(floor-.5)*(podium?4:3.35);
      for(let k=5;k<depth-3;k+=8) box(group,glass,side*(width/2+.07),y,k-front,.16,2.05,4.35);
    }
    const entryWidth = Math.min(12,width*.22);
    box(group,'#353e40',0,1.82,front+.1,entryWidth,3.6,.22);
    for(const x of [-1,1]) {
      box(group,'#73939d',x*entryWidth*.25,1.82,front+.28,entryWidth*.42,3.25,.055);
      box(group,trim,x*(entryWidth*.5+.5),2.0,front+1,.35,4,1.3);
    }
    const topSignY=podium?height-2.3:height-1.5;
    box(group,trim,0,topSignY,front+.3,Math.min(width*.72,38),2.65,.24);
    namedBoard(group,name,0,topSignY,front+.43,Math.min(width*.68,36),2.4,0,trim);
    const tenantWidth=Math.min(14,(width-entryWidth)/4.15);
    groundShops.forEach((shop,i)=>{
      const side=i%2===0?-1:1;
      const px=side*(entryWidth*.55+tenantWidth*(.58+Math.floor(i/2)));
      box(group,'#39484c',px,1.64,front+.14,tenantWidth*.91,2.85,.22);
      box(group,'#65858c',px,1.59,front+.28,tenantWidth*.76,2.46,.12);
      box(group,trim,px,1.7,front+.36,.12,2.75,.10);
      if(!podium&&name!=='万人商厦') namedBoard(group,shop,px,3.6,front+.27,tenantWidth*.91,.92,0,trim);
    });
    if(podium) {
      groundShops.forEach((shop,i)=>{
        namedBoard(group,shop,-entryWidth*.65,3.75-i*.70,front+.84,7.5,.58,0,'#3b494f');
      });
      for(const px of [-width*.4,width*.4]) {
        box(group,'#a1a0a0',px,8,front+.46,2.5,16,.55);
      }
      const side=Math.PI;
      namedBoard(group,name,0,topSignY,-front-.22,Math.min(width*.55,29),2.2,side,trim);
    }
    addJunctionJewelry(scene,plot,box,namedBoard);
  }

  // A lawn belt around the theater and a separate landscaped park farther south.
  const grassCanvas=document.createElement('canvas');
  grassCanvas.width=128;
  grassCanvas.height=128;
  const ctx=grassCanvas.getContext('2d');
  let seed=92511;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const pixels=ctx.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4) {
    const value=(rand()+rand()-1)*31;
    pixels.data[i]=92+value;
    pixels.data[i+1]=124+value;
    pixels.data[i+2]=59+value;
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const grass=new T.CanvasTexture(grassCanvas);
  grass.colorSpace=T.SRGBColorSpace;
  grass.wrapS=grass.wrapT=T.RepeatWrapping;
  grass.anisotropy=8;
  function surface(ring,y,material) {
    if(ring.length<3) return;
    const shape=new T.Shape(ring.map(([x,z])=>new T.Vector2(x,-z)));
    const geo=new T.ShapeGeometry(shape);
    geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)/4,pos.getZ(i)/4);
    const mesh=new T.Mesh(geo,material);
    mesh.position.y=y;
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
  const lawnMaterial=new T.MeshStandardMaterial({map:grass,roughness:1,side:T.DoubleSide});
  for(const ring of greenAreas) surface(ring,.049,lawnMaterial);
  const lakeCurve=new T.CatmullRomCurve3(parkWater.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');
  const shoreline=lakeCurve.getPoints(90).slice(0,-1).map(p=>[p.x,p.z]);
  const lakeCenter=[-1128,1032];
  const verge=shoreline.map(([x,z])=>[lakeCenter[0]+(x-lakeCenter[0])*1.06,lakeCenter[1]+(z-lakeCenter[1])*1.035]);
  surface(verge,.068,new T.MeshStandardMaterial({color:'#a9a78d',roughness:.92,side:T.DoubleSide}));
  surface(shoreline,.077,new T.MeshStandardMaterial({color:'#427d80',roughness:.38,metalness:.08,side:T.DoubleSide}));

  function pathMesh(curve,width,color,y) {
    const points=curve.getSpacedPoints(Math.ceil(curve.getLength()/2));
    const vertices=[],indices=[];
    points.forEach((p,i)=>{
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next.x-prev.x,dz=next.z-prev.z,L=Math.hypot(dx,dz)||1;
      vertices.push(p.x-dz/L*width/2,y,p.z+dx/L*width/2,p.x+dz/L*width/2,y,p.z-dx/L*width/2);
      if(i) {const j=(i-1)*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
    });
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.92,side:T.DoubleSide}));
    mesh.receiveShadow=true;
    scene.add(mesh);
    return points;
  }
  const trails=parkPaths.map(path=>pathMesh(pathCurve(path),3.7,'#bcb2a1',.108));
  for(const trail of trails) {
    for(let i=12;i<trail.length-6;i+=22) {
      const p=trail[i],next=trail[i+1];
      const yaw=-Math.atan2(next.z-p.z,next.x-p.x);
      const dx=next.x-p.x,dz=next.z-p.z;
      const l=Math.hypot(dx,dz);
      const x=p.x-dz/l*2.4,z=p.z+dx/l*2.4;
      box(scene,'#4f5b4d',x,1.65,z,.115,3.3,.115);
      box(scene,'#e3d5ac',x,3.25,z,.25,.18,.28);
      if(i%3===0) {
        box(scene,'#604b37',x+1,.48,z,1.85,.12,.48,yaw);
        box(scene,'#786045',x+1,.78,z-.17,1.85,.38,.10,yaw);
      }
    }
  }

  const lawnTrees=[];
  const edges=parkPaths.flatMap(path=>segments(path));
  for(const [index,ring] of greenAreas.entries()) {
    const xs=ring.map(([x])=>x),zs=ring.map(([,z])=>z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    for(let i=0;i<145;i++) {
      const x=minX+rand()*(maxX-minX), z=minZ+rand()*(maxZ-minZ);
      if(!pointInRing(x,z,ring)||pointInRing(x,z,parkWater))continue;
      if(edges.some(line=>projectOnSegment([x,z],line).distance<4.0))continue;
      if(lawnTrees.some(tree=>Math.hypot(x-tree.x,z-tree.z)<7.8))continue;
      const h=4.6+rand()*3.4;
      lawnTrees.push({x,z,h});
    }
  }
  const parkTrees=createTreeBatch(scene,{ground:westGroundHeight,leafDensity:24,park:true});
  lawnTrees.forEach(({x,z,h},i)=>parkTrees.tree({x,z,height:h,crown:h*.62,base:.06},i));
  parkTrees.finish();
}
