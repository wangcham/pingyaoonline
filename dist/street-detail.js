import {isWestNeighbourhood} from './west-neighbourhood-data.js';
import {southCityStops} from './south-city-survey.js';
import * as T from 'three';
import {westSiteStops,isWestSiteParcel} from './west-sites-data.js';
import {westLinkStops} from './west-link-survey.js';
import {smallSouthGateStop} from './yingxun-park-data.js';
import {schoolStops} from './pingyao-school-data.js';
import {addWestStreetExperience} from './west-experience.js';
import {addWestGreenery} from './west-greenery.js';
import {addWestBlocks,addSchoolInterior} from './west-blocks.js';
import {westInteriorStops} from './west-block-data.js';
import {mapData} from './map-data.js';
import {westGroundHeight} from './west-terrain.js';
import {addWestFrontages, isWestFrontage, westStops} from './west-corridor.js';
import {addTheater, theaterStops} from './theater.js';
import {addWestDistrict, isWestDistrictParcel, westDistrictStops} from './west-district.js';
import {addShuncheng, isShunchengParcel, shunchengStops} from './shuncheng.js';
import {makeGrid, createRingQuery,pointInRing, projectOnSegment, segments} from './geography.js';

export const streetStops = [
  ...schoolStops,
  ...westSiteStops,
  ...westLinkStops,
  ...southCityStops,
  smallSouthGateStop,
  ...westInteriorStops,
  {name:'下西关街 · 绿化步道',keywords:'绿化 行道树 花坛 景林江米油糕 城门外',address:'下西门外至油糕店一带 · 树木与花坛位置近似',eye:[-1760,2.1,116],target:[-1840,3.2,130]},
  {name:'古城灰石板街景',keywords:'古城 地砖 石板 院落 街坊 西大街',address:'灰石板铺装参考提供照片 · 街区院落为密度示意',eye:[-608,2.1,-46],target:[-540,3,-60]},
  {name:'景林江米油糕', keywords:'油糕 江米', address:'平遥二中北门西侧 · 店址近似', eye:[-1888,3.1,130], target:[-1888,2.7,147]},
  {name:'平遥二中', keywords:'平遥县第二中学校 二中 西关大街', address:'西关大街162号 · 校园轮廓来自地图', eye:[-1858,4.5,128], target:[-1858,3.8,160]},
  {name:'顺城路 × 上西关街', keywords:'顺城路交叉路口 转盘 田森汇', address:'顺城路与上西关街交叉口 · 转盘来自地图', eye:[-1465,13,909], target:[-1430,2,861]},
  {name:'上西门外 · 永定门', keywords:'上西门外面街道 上西关街 永定门', address:'上西关街东段至上西门', eye:[-1138,5.4,830], target:[-1049,8,809]},
  {name:'今度烘焙', keywords:'今度烘焙平遥上西关店 永安路', address:'上西关街永安路口东南角 · 店址近似', eye:[-1942,3.2,928], target:[-1942,2.8,949]},
  ...westDistrictStops,
  ...shunchengStops,
  ...westStops,
  ...theaterStops,
];

export function streetAtPosition() {
  const grid = makeGrid(80);
  for (const [, , name, path] of mapData.roads) {
    if (!name) continue;
    for (const line of segments(path)) {
      const [ax,az]=line.start, [bx,bz]=line.end;
      grid.add({name,line},Math.min(ax,bx)-26,Math.min(az,bz)-26,Math.max(ax,bx)+26,Math.max(az,bz)+26);
    }
  }
  return (x,z) => {
    let name = '';
    let best = 26;
    for (const road of grid.at(x,z)) {
      const {distance} = projectOnSegment([x,z],road.line);
      if (distance < best) {
        name=road.name;
        best=distance;
      }
    }
    return name;
  };
}

const campusQuery=createRingQuery(mapData.campus);
const streetDetailCircles=[[-1888,150,11],[-1942,952,14],[-1440,870,27],[-1248,450,77],[-1259,538,62],[-1138,830,18]];

export function isStreetDetailParcel(x,z,radius) {
  if (isWestNeighbourhood(x,z,radius)||isWestSiteParcel(x,z,radius)||isShunchengParcel(x,z,radius)||isWestDistrictParcel(x,z,radius)||isWestFrontage(x,z,radius)||campusQuery.contains(x,z,radius+2)) return true;
  return streetDetailCircles.some(([px,pz,size])=>Math.hypot(x-px,z-pz)<size+radius);
}

export function addStreetDetails(scene) {
  const bulk = new T.BoxGeometry(1,1,1);
  const materialsByColor = new Map();
  function box(group,color,x,y,z,w,h,d,rotation=0) {
    if (!materialsByColor.has(color)) materialsByColor.set(color,new T.MeshStandardMaterial({color,roughness:.84}));
    const mesh = new T.Mesh(bulk,materialsByColor.get(color));
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    mesh.rotation.y=rotation;
    mesh.receiveShadow=true;
    mesh.castShadow=h>1;
    group.add(mesh);
    return mesh;
  }
  function segment(group,color,[ax,az],[bx,bz],width,height,y) {
    const x=(ax+bx)/2,z=(az+bz)/2;
    box(group,color,x,y+westGroundHeight(x,z),z,Math.hypot(bx-ax,bz-az),height,width,-Math.atan2(bz-az,bx-ax));
  }
  function namedBoard(group,text,x,y,z,w,h,face,background='#214c55',ink='#fff4d3') {
    const canvas=document.createElement('canvas');
    canvas.width=768;
    canvas.height=192;
    const context=canvas.getContext('2d');
    context.fillStyle=background;
    context.fillRect(0,0,768,192);
    context.strokeStyle=ink;
    context.lineWidth=5;
    context.strokeRect(11,10,746,171);
    context.fillStyle=ink;
    context.font='bold 88px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.textAlign='center';
    context.textBaseline='middle';
    context.fillText(text,384,98,704);
    const texture=new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=4;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    mesh.position.set(x,y,z);
    mesh.rotation.y=face;
    group.add(mesh);
    const position=mesh.getWorldPosition(new T.Vector3());
    if(position.x>=-2110&&position.x<=-1190&&position.z>=-150&&position.z<=350){
      mesh.material.dispose();mesh.material=new T.MeshStandardMaterial({map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:0,roughness:.65});mesh.userData.nightSign=true;
    }
  }

  addWestFrontages(scene,namedBoard);
  addTheater(scene,box,namedBoard);
  addWestDistrict(scene,box,namedBoard);
  addWestGreenery(scene);
  addWestBlocks(scene,undefined,namedBoard);
  addShuncheng(scene,box,namedBoard);

  function frontage({x,z,w,name,body,sign,canopy,food}) {
    const store=new T.Group();
    store.position.set(x,westGroundHeight(x,z),z);
    scene.add(store);
    box(store,body,0,2.25,0,w,4.5,6);
    box(store,'#a7a093',0,.12,-3.4,w+.75,.24,1.45);
    box(store,'#393632',0,1.35,-3.035,w*.82,2.5,.09);
    box(store,'#596e6a',-w*.18,1.47,-3.095,w*.38,2.14,.08);
    box(store,'#d7cfb1',-w*.18,1.25,-3.15,w*.4,.18,.17);
    box(store,'#85827a',w*.19,1.47,-3.105,w*.21,2.4,.11);
    box(store,'#a0b3b3',w*.19,1.56,-3.17,w*.17,2.1,.04);
    for (const offset of [-.44,-.04,.34,.44]) box(store,'#353a34',w*offset,1.4,-3.18,.12,2.55,.14);
    namedBoard(store,name,0,3.62,-3.07,w*.96,1.15,Math.PI,sign);
    if (canopy) {
      for(let i=0;i<12;i++) {
        box(store,i%2?canopy:'#f1e2c6',(i-5.5)*w/12,2.67,-3.72,w/12+.025,.14,1.46).rotation.x=-.16;
      }
    }
    if(food) {
      box(store,'#a79f8d',-1.5,.78,-3.5,2.55,1.45,.75);
      box(store,'#d6cdb6',-1.5,1.54,-3.5,2.67,.1,.82);
      const pastry=new T.SphereGeometry(.19,10,5);
      const gold=new T.MeshStandardMaterial({color:'#c98832',roughness:.72});
      for(let i=0;i<10;i++) {
        const cake=new T.Mesh(pastry,gold);
        cake.scale.y=.48;
        cake.position.set(-2.52+i%5*.33,1.65,-3.35-Math.floor(i/5)*.30);
        store.add(cake);
      }
    }
  }
  // The oil-cake shop now belongs to the connected lower-west frontage row.
  frontage({x:-1942,z:952,w:12,name:'今度烘焙',body:'#bea98e',sign:'#3b3330',canopy:'#6b4833'});

  const grounds = new T.Shape(mapData.campus.map(([x,z])=>new T.Vector2(x,-z)));
  const schoolGeo = new T.ShapeGeometry(grounds);
  schoolGeo.rotateX(-Math.PI/2);
  const floor=schoolGeo.attributes.position;
  for(let i=0;i<floor.count;i++) floor.setY(i,westGroundHeight(floor.getX(i),floor.getZ(i)));
  schoolGeo.computeVertexNormals();
  const schoolGround = new T.Mesh(schoolGeo,new T.MeshStandardMaterial({color:'#cec0a7'}));
  schoolGround.position.y=.045;
  scene.add(schoolGround);
  const school=new T.Group();
  school.position.set(-1858,westGroundHeight(-1858,156),156);
  scene.add(school);school.userData.heightRecords=[];
  for(const side of [-1,1]) {
    box(school,'#c4b89d',side*9,2.2,0,2.8,4.4,2.2);
    box(school,'#8c6d55',side*9,4.5,0,3.35,.25,2.7);
    box(school,'#2f3639',side*6.9,1,0,1.4,2,.2);
  }
  box(school,'#9b572f',0,4.02,0,20.5,.95,2);
  namedBoard(school,'平遥县第二中学校',0,4.02,-1.01,17.4,.86,Math.PI,'#693629');
  box(school,'#c5b396',0,.08,15,16,.16,35);
  // The pedestrian entrance and teaching blocks use shallow stone steps and landings.
  function schoolEntrance(x,z,width,steps){
    const height=steps*.14;
    box(school,'#b4ad9f',x,height/2,z+.9,width,height,1.8);
    for(let i=0;i<steps;i++){
      const rise=(steps-i)*.14;
      box(school,'#a39e95',x,rise/2,z-.19-i*.38,width,rise,.38);
      box(school,'#77736e',x,rise-.013,z-.36-i*.38,width,.026,.028);
    }
    for(const side of [-1,1]){
      const railX=x+side*(width/2-.16);
      for(const end of [-.9,.85])box(school,'#686b67',railX,.62+height/2,z+end,.045,1.05,.045);
      box(school,'#797d76',railX,1.13+height/2,z,.063,.059,1.95);
    }
  }
  schoolEntrance(-6.6,1.5,2.6,2);
  schoolEntrance(6.6,1.5,2.6,2);
  for(let i=-6;i<=6;i++)box(school,'#8c8578',i*1.14,.084,9,.035,.016,10);
  for (const line of segments([...mapData.campus,mapData.campus[0]])) {
    const [left,right]=[line.start,line.end].sort((a,b)=>a[0]-b[0]);
    if (left[1]<168 && right[1]<168 && left[0]<-1870 && right[0]>-1847) {
      segment(scene,'#ad9c80',left,[-1870,154],.3,1.8,.9);
      segment(scene,'#ad9c80',[-1847,151],right,.3,1.8,.9);
    } else segment(scene,'#ad9c80',line.start,line.end,.3,1.8,.9);
  }

  for(const [x,z,width,floors] of [[14,49,41,4],[76,58,49,4],[6,93,54,3]]) {
    const height=3.35*floors;
    school.userData.heightRecords.push({id:`school-main-${x}-${z}`,name:'平遥二中教学楼（近似）',x:x-1858,z:z+156,w:width,d:18,height,levels:floors,buildingType:'public',heightSource:'photo-and-type-estimate',confidence:.35,estimated:true,footprintEstimated:true});
    box(school,'#a4533f',x,height/2,z,width,height,18);
    box(school,'#e5c8a2',x,height+.28,z,width+.65,.55,18.6);
    box(school,'#796d62',x,.46,z,width+.08,.92,18.06);
    schoolEntrance(x,z-10,5.4,3);
    box(school,'#493d39',x,1.88,z-9.10,3.4,2.95,.17);
    for(const side of [-1,1]){
      box(school,'#617a84',x+side*.8,1.87,z-9.22,1.42,2.63,.08);
      box(school,'#d8c3a7',x+side*2.00,1.62,z-9.55,.35,2.78,.45);
    }
    box(school,'#b9ab92',x,3.08,z-10.08,5.32,.24,2.3);
    for(let f=0;f<floors;f++) {
      for(let wx=-width/2+3;wx<width/2-2;wx+=4.7) {
        if(f===0&&Math.abs(wx)<2.8)continue;
        box(school,'#ede0ca',x+wx,2.2+f*3.35,z-9.035,2.7,1.95,.11);
        box(school,'#586c72',x+wx,2.2+f*3.35,z-9.105,2.36,1.63,.08);
        box(school,'#b7b6a7',x+wx,2.2+f*3.35,z-9.16,.075,1.63,.031);
        box(school,'#e0c8a6',x+wx,1.27+f*3.35,z-9.16,2.88,.15,.29);
      }
    }
  }
  namedBoard(school,'平遥二中',14,12.5,39.76,13,1.6,Math.PI,'#8c3f30','#ffdd8a');
  addSchoolInterior(scene);

  const round=mapData.roundabout;
  const [cx,cz]=round.reduce(([x,z],[a,b])=>[x+a/round.length,z+b/round.length],[0,0]);
  for (const [radius,height,y,color] of [[20.3,.12,.085,'#747678'],[11.5,.3,.15,'#c9c1a9'],[10.8,.32,.32,'#667d52'],[3.1,.55,.7,'#a7a597']]) {
    const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,40),new T.MeshStandardMaterial({color}));
    mesh.position.set(cx,y,cz);
    scene.add(mesh);
  }

  function streetSign(name,x,z,face,w=6) {
    box(scene,'#64736e',x,2.13,z,.13,4.26,.13);
    namedBoard(scene,name,x,4.1,z,w,.85,face);
    namedBoard(scene,name,x,4.1,z,w,.85,face+Math.PI);
  }

  streetSign('顺城路',-1455,842,Math.PI/2,5.2);
  streetSign('上西关街',-1414,852,0,5.2);
  streetSign('永安北路',-1985,916,Math.PI/2,5.5);
  streetSign('郑孝燮路',-1137,814,Math.PI/2,5.3);
  streetSign('永定门 / 上西门',-1108,798,-Math.PI/2,9);
  namedBoard(scene,'永定门',-1054.17,7.5,808.6,7.1,.95,-Math.PI/2,'#42352a');


  // Street markings and kerbs along the modelled approaches.
  const paint='#eae0c6';
  for(const x of [-1489,-1397]) {
    for (let i=0;i<10;i++) {
      const z=x<-1440?868:864;
      box(scene,paint,x+i*.68,.179,z,.28,.02,6.5,-.11);
    }
  }
  for (const x of [-1200,-1170]) {
    box(scene,'#7c7568',x,1.26,825,.18,2.52,.18);
    box(scene,'#ad614b',x,2.33,825,.37,.48,.37);
  }
  return addWestStreetExperience(scene);
}
