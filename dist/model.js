import {schoolSites,isSchoolSite,schoolSiteIntersects} from './school-sites-data.js';
import {addSchoolSite} from './school-sites.js';
import {isWestNeighbourhood,westNeighbourIntersects,westNeighbourBlocks} from './west-neighbourhood-data.js';
import {addWestNeighbourhood} from './west-neighbourhood.js';
import {citySurfaceRoads} from './city-extension.js';
import {cityExtensionData} from './city-extension-data.js';
import {isRegionalBuilding,isRegionalSurveyArea,isGuchengStationParcel} from './regional-survey.js';
import {addRegionalDistricts} from './regional-districts.js';
import {addGuchengStation} from './gucheng-station.js';
import {addQixiangBlock} from './qixiang-block.js';
import {isQixiangBlock} from './qixiang-block-data.js';
import {isSouthCityStudy} from './south-city-survey.js';
import {addSouthCity} from './south-city.js';
import {isWestSiteParcel,westSiteIntersectsRing} from './west-sites-data.js';
import {addTiansen} from './tiansen.js';
import {stationStreetIntersects} from './shuncheng.js';
import {addPingyaoThirdSchool} from './pingyao-third-school.js';
import {addCivicSite} from './civic-sites.js';
import {civicSiteSurveys} from './civic-sites-data.js';
import {isWestLinkStudy,westLinkBoundary,westLinkRingsIntersect} from './west-link-survey.js';
import {isYingxunPark,yingxunPonds} from './yingxun-park-data.js';
import {addRingCommerce} from './ring-commerce.js';
import {addYingxunWaterfront} from './yingxun-waterfront.js';
import {addWestLinkDistrict} from './west-link-district.js';
import {addYingxunGreenery} from './yingxun-greenery.js';
import {addMoatLandscape} from './moat.js';
import {isMoatCorridor} from './moat-data.js';
import {buildingRoadClearance,clearanceRect} from './road-clearance.js';
import * as T from 'three';
import {isPingyaoSchoolParcel} from './pingyao-school-data.js';
import {addPingyaoSchool} from './pingyao-school.js';
import {resolveBuildingHeight} from './building-heights.js';
import {mapData} from './map-data.js';
import {createPavingMaterial} from './paving.js';
import {addOldTownCourtyards} from './old-town.js';
import {addOldTownStreetDetails} from './old-town-streets.js';
import {isOldTownDetailParcel,oldTownDetailIntersects} from './old-town-streets-data.js';
import {createOldTownLayout} from './old-town-layout.js';
import {isWestGreenCorridor} from './west-greenery.js';
import {isWestInteriorStudy} from './west-block-layout.js';
import {isLandmarkParcel} from './landmarks/data.js';
import {westGroundHeight} from './west-terrain.js';
import {addStreetDetails, isStreetDetailParcel} from './street-detail.js';
import {locateGates, makeGrid, passageCut, pointInRing, projectOnSegment, sample, segments} from './geography.js';

export async function buildCity(scene,{onProgress=()=>{}}={}) {
  const commerceBuildings=[];
  const ordinaryHeightRecords=[];
  const checkpoint=async label=>{onProgress(label);await new Promise(resolve=>setTimeout(resolve,0));};
  await checkpoint('正在准备道路与地形…');
  let seed = 8783;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const materials = new Map();
  materials.set('ancient-paving',createPavingMaterial());
  const geometry = {
    box: new T.BoxGeometry(1, 1, 1),
    globe: new T.IcosahedronGeometry(.5, 1),
  };
  // A pitched roof with an overhanging eave. Geometry is shared by all houses.
  const roofShape = new T.Shape();
  roofShape.moveTo(-.5, 0);
  roofShape.lineTo(-.40, .12);
  roofShape.lineTo(0, 1);
  roofShape.lineTo(.40, .12);
  roofShape.lineTo(.5, 0);
  roofShape.closePath();
  geometry.roof = new T.ExtrudeGeometry(roofShape, {depth: 1, bevelEnabled: false});
  geometry.roof.translate(0, 0, -.5);

  const batches = new Map();
  function part(kind, color, x, y, z, w, h, d, angle = 0, slope = 0) {
    const key = kind + color;
    if (!batches.has(key)) batches.set(key, {kind, color, parts: []});
    batches.get(key).parts.push([x,y,z,w,h,d,angle,slope]);
  }
  const box = (color, ...args) => part('box', color, ...args);

  const brick = ['#777c78','#878980','#727874','#929187','#80867e'];
  const tiles = ['#444b49','#565956','#61605a','#4c4e4e','#6a6960'];
  const pick = values => values[Math.floor(random() * values.length)];
  function building(x,z,w,d,h,angle=0,formal=false,base=0) {
    const body = formal ? '#943e2e' : pick(brick);
    const tile = formal ? '#3e5049' : pick(tiles);
    box('#8d8572',x,base+.22,z,w+.55,.44,d+.55,angle);
    box(body,x,base+h/2+.4,z,w,h,d,angle);
    part('roof',tile,x,base+h+.45,z,w+1.3,h*.39+1,d+1.6,angle);
    box('#4d5049',x,base+h*.39+h+1.42,z,.25,.28,d+1,angle);
    for (const offset of [-.26,0,.26]) {
      const local = w*offset;
      const front = d/2+.015;
      const dx = local*Math.cos(angle)+front*Math.sin(angle);
      const dz = front*Math.cos(angle)-local*Math.sin(angle);
      box(formal?'#d89754':'#554337',x+dx,base+h*.48,z+dz,w*.12,h*.58,.09,angle);
    }
  }

  function segment(color,a,b,height,width,y) {
    const dx=b[0]-a[0], dz=b[1]-a[1];
    const length=Math.hypot(dx,dz);
    const crossesWest=Math.max(a[0],b[0])>-2160 && Math.min(a[0],b[0])<-1180
      && Math.max(a[1],b[1])>-95 && Math.min(a[1],b[1])<285;
    const steps=crossesWest?Math.ceil(length/7):1;
    const yaw=-Math.atan2(dz,dx);
    for(let i=0;i<steps;i++) {
      const t0=i/steps,t1=(i+1)/steps,t=(t0+t1)/2;
      const x=a[0]+dx*t,z=a[1]+dz*t;
      const y0=westGroundHeight(a[0]+dx*t0,a[1]+dz*t0);
      const y1=westGroundHeight(a[0]+dx*t1,a[1]+dz*t1);
      const slope=Math.atan2(y1-y0,length/steps);
      const normalY=y+(y0+y1)/2-westGroundHeight(x,z);
      box(color,x,normalY,z,Math.hypot(length/steps,y1-y0),height,width,yaw,slope);
    }
  }

  const {wall, gates} = locateGates(mapData);
  const [west, north, east, south] = mapData.bounds;
  const withinMap = (x, z) => x > west && x < east && z > north && z < south;
  box('#aaa388',0,-1.1,0,15000,2,15000);

  function surface(ring, color, elevation, height = 0) {
    const shape = new T.Shape(ring.map(([x,z]) => new T.Vector2(x,-z)));
    const geo = height
      ? new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false})
      : new T.ShapeGeometry(shape);
    geo.rotateX(-Math.PI/2);
    const points=geo.attributes.position;
    for(let i=0;i<points.count;i++) {
      points.setY(i,points.getY(i)+westGroundHeight(points.getX(i),points.getZ(i)));
    }
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo,color?.isMaterial?color:new T.MeshStandardMaterial({color,roughness:.94,side:T.DoubleSide}));
    mesh.position.y=elevation;
    mesh.castShadow=height>0;
    mesh.receiveShadow=true;
    scene.add(mesh);return mesh;
  }
  surface(mapData.wall.slice(0,-1),createPavingMaterial('yard'),-.04);
  for (const [kind, ring] of mapData.areas) {
    if(kind==='water'&&yingxunPonds.includes(ring))continue;
    surface(ring,kind==='park'?'#829468':'#5f9294',.025);
  }
  for (const [name,height,ring,metadata] of mapData.buildings) {
    if (name==='又见平遥剧场'||name==='又见平遥'||oldTownDetailIntersects(ring)) continue;
    const [cx,cz]=ring.reduce((sum,p)=>[sum[0]+p[0]/ring.length,sum[1]+p[1]/ring.length],[0,0]);
    if (stationStreetIntersects(ring) || schoolSiteIntersects(ring) || westNeighbourIntersects(ring) || isQixiangBlock(cx,cz) || isRegionalBuilding(cx,cz) || isSouthCityStudy(cx,cz) || westSiteIntersectsRing(ring) || westLinkRingsIntersect(ring,westLinkBoundary) || isLandmarkParcel(cx,cz) || ring.some(([x,z])=>isLandmarkParcel(x,z)) || isPingyaoSchoolParcel(cx,cz)) continue;
    const mesh=surface(ring,'#948b7b',.035,height);
    commerceBuildings.push({x:cx,z:cz,ring,height});
    if(cx>=-2110&&cx<=-1190&&cz>=-260&&cz<=850)mesh.userData.buildingRecord={...metadata,name,x:cx,z:cz,height,footprint:ring};
  }

  await checkpoint('正在准备街道与基础建筑…');
  const roadGrid=makeGrid(64);
  function indexLine(line, clearance) {
    const {start:[ax,az],end:[bx,bz]}=line;
    roadGrid.add({line,clearance},Math.min(ax,bx)-clearance,Math.min(az,bz)-clearance,
      Math.max(ax,bx)+clearance,Math.max(az,bz)+clearance);
  }
  const roadLines=[];
  for (const [type,width,name,points] of citySurfaceRoads) {
    for (const line of segments(points)) {
      const [x,z]=sample(line,.5);
      if(isSchoolSite(x,z)&&isSchoolSite(...line.start)&&isSchoolSite(...line.end))continue;
      if(isWestSiteParcel(x,z)&&isWestSiteParcel(...line.start)&&isWestSiteParcel(...line.end))continue;
      if(isPingyaoSchoolParcel(x,z)&&isPingyaoSchoolParcel(...line.start)&&isPingyaoSchoolParcel(...line.end))continue;
      const inside=pointInRing(x,z,mapData.wall);
      const main=width>=7;
      const color=inside?'ancient-paving':(main?'#747678':'#8c8a82');
      const detailed=['顺城路 × 上西关街','顺城北路','顺城南路','下西关街'].includes(name);
      if (!detailed) segment(color,line.start,line.end,.065,width,main?.113:.075);
      indexLine(line,width/2+34);
      if (main && line.length>7 && !inside && !detailed) {
        const [ax,az]=sample(line,.11), [bx,bz]=sample(line,.89);
        segment('#cdbb91',[ax,az],[bx,bz],.022,.19,.161);
      }
      roadLines.push({line,width,type,name,inside});
    }
  }
  for (const [width,points] of mapData.water) {
    for (const line of segments(points)) {
      if(points!==mapData.water[1][1]&&points!==mapData.water[3][1])segment('#679c9b',line.start,line.end,.035,width,.038);
      indexLine(line,width/2+34);
    }
  }
  for (const rail of [...mapData.rail,...cityExtensionData.rail]) {
    for (const line of segments(rail)) {
      segment('#7b7065',line.start,line.end,.09,4,.08);
      indexLine(line,37);
    }
  }

  // LandmarkManager owns the wall and gate geometry; retain road clearance here.
  for (const line of wall) indexLine(line,42);

  const parcelGrid=makeGrid(48);
  const ancientPlots=createOldTownLayout();
  for(const plot of ancientPlots){
    const [x,z]=plot.world,radius=Math.hypot(plot.w,plot.d)/2+1;
    parcelGrid.add({x,z,radius},x-radius-20,z-radius-20,x+radius+20,z+radius+20);
  }
  const occupied = [...mapData.areas.map(([,ring])=>ring),...mapData.buildings.map(([, ,ring])=>ring)];
  const parcels = occupied.map(ring=>{
    const xs=ring.map(([x])=>x), zs=ring.map(([,z])=>z);
    return {ring, bounds:[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)]};
  });
  function canBuild(x,z,radius) {
    if(isMoatCorridor(x,z,radius))return false;
    if(isOldTownDetailParcel(x,z,radius))return false;
    if (isWestNeighbourhood(x,z,radius)||!withinMap(x,z)||isRegionalSurveyArea(x,z,radius)||isGuchengStationParcel(x,z,radius)||isSouthCityStudy(x,z,radius)||isStreetDetailParcel(x,z,radius)||isLandmarkParcel(x,z,radius)||isWestInteriorStudy(x,z,radius)||isPingyaoSchoolParcel(x,z,radius)||isWestLinkStudy(x,z,radius)||isYingxunPark(x,z,radius)) return false;
    if (gates.some(({center:[gx,gz],normal:[nx,nz]})=>{
      const dx=x-gx,dz=z-gz;
      return Math.abs(dx*nx+dz*nz)<82+radius&&Math.abs(dz*nx-dx*nz)<8+radius;
    })) return false;
    if (parcels.some(({ring,bounds:[l,t,r,b]})=>x>l-radius&&x<r+radius&&z>t-radius&&z<b+radius&&
      (pointInRing(x,z,ring)||segments([...ring,ring[0]]).some(edge=>projectOnSegment([x,z],edge).distance<radius)))) return false;
    if (parcelGrid.at(x,z).some(plot=>Math.hypot(x-plot.x,z-plot.z)<plot.radius+radius)) return false;
    return !roadGrid.at(x,z).some(({line,clearance})=>projectOnSegment([x,z],line).distance<clearance-34+radius+2);
  }
  const plaster=['#c2b6a4','#d4c8b5','#aaa89f','#b8a48d','#a1a399'];
  function modernBuilding(x,z,w,d,h,angle) {
    commerceBuildings.push({x,z,w,d,angle,height:h});
    box(pick(plaster),x,h/2,z,w,h,d,angle);
    box('#83857d',x,h+.2,z,w+.22,.4,d+.22,angle);
    const sin=Math.sin(angle), cos=Math.cos(angle);
    for (const side of [-1,1]) {
      const front=(d/2+.05)*side;
      for (let floor=1.75;floor<h-.5;floor+=3.2) {
        box('#687677',x+front*sin,floor,z+front*cos,w*.8,.82,.11,angle);
      }
    }
  }
  function tree(x,z,size) {
    box('#70513b',x,size*.32,z,.34,size*.64,.34);
    part('globe',pick(['#52634a','#69704b','#778258','#526953']),x,size*.84,z,size*.71,size,size*.71);
  }
  for (const {line,width,type,inside} of roadLines) {
    if (['steps','path','motorway','trunk'].includes(type)||line.length<8) continue;
    if (!inside && type==='footway') continue;
    const dx=(line.end[0]-line.start[0])/line.length;
    const dz=(line.end[1]-line.start[1])/line.length;
    const angle=-Math.atan2(dz,dx);
    const spacing=inside?13:28;
    for (let distance=4+random()*9;distance<line.length;distance+=spacing) {
      const [cx,cz]=sample(line,distance/line.length);
      for (const side of [-1,1]) {
        if (random()<.13) continue;
        const w=inside?7+random()*5:13+random()*11;
        const d=inside?5+random()*5:10+random()*13;
        const radius=Math.hypot(w,d)/2;
        const offset=(width/2+radius+(inside?3:6))*side;
        const x=cx-dz*offset, z=cz+dx*offset;
        const envelope=clearanceRect(x,z,w,d,inside?angle+Math.PI/2:angle,inside?.85:.45);
        if (inside!==pointInRing(x,z,mapData.wall)||!canBuild(x,z,radius)||!buildingRoadClearance.clear(envelope)) continue;
        const plot={x,z,radius};
        parcelGrid.add(plot,x-radius-20,z-radius-20,x+radius+20,z+radius+20);
        if (inside) building(x,z,w,d,3.8+random()*2.3,angle+Math.PI/2);
        else {
          // Keep the placement RNG sequence stable, but never invent 2–7
          // storeys at random. Unverified infill stays low; measured/surveyed
          // taller blocks are owned by their district modules.
          random();
          const fallbackFloors=w<18||d<13?1:2;
          const heightRecord=resolveBuildingHeight({x,z,w,d,angle,buildingType:'commercial',fallbackFloors,preferRasterHeight:true});
          modernBuilding(x,z,w,d,heightRecord.height,angle);
          ordinaryHeightRecords.push({...heightRecord,x,z,w,d,angle,name:'普通沿街楼房',heightClass:heightRecord.floors===1?'single-storey':heightRecord.floors<=3?'low-rise':heightRecord.floors<=7?'multi-storey':'high-rise',footprint:clearanceRect(x,z,w,d,angle),footprintEstimated:true});
        }
      }
      if (width>=7 && random()<.52) {
        const x=cx-dz*(width/2+2.5), z=cz+dx*(width/2+2.5);
        if(isMoatCorridor(x,z,4))continue;
        if (isSchoolSite(x,z,5)||isWestNeighbourhood(x,z,5)||!withinMap(x,z)||isRegionalSurveyArea(x,z,5)||isSouthCityStudy(x,z,4)||isWestSiteParcel(x,z,4)||isPingyaoSchoolParcel(x,z,4)||isWestLinkStudy(x,z,4)||isYingxunPark(x,z,4)) continue;
        if (!inside) {if(!isWestGreenCorridor(x,z)&&!isWestInteriorStudy(x,z))tree(x,z,3.5+random()*2.5);}
        else {
          box('#5d4537',x,1.4,z,.21,2.8,.21);
          part('globe','#ffbc63',x,3,z,.72,.82,.72);
        }
      }
    }
  }
  for (const [kind,ring] of mapData.areas) {
    if (kind!=='park') continue;
    if ([mapData.theaterGreen,mapData.yongdingPark].some(area=>
      area.length>0 && area[0][0]===ring[0][0] && area[0][1]===ring[0][1])) continue;
    const xs=ring.map(([x])=>x), zs=ring.map(([,z])=>z);
    const l=Math.min(...xs), t=Math.min(...zs), w=Math.max(...xs)-l, d=Math.max(...zs)-t;
    for (let i=0;i<Math.min(100,w*d/95);i++) {
      const x=l+random()*w, z=t+random()*d;
      if(isMoatCorridor(x,z,4))continue;
      if (pointInRing(x,z,ring)&&!isSchoolSite(x,z,5)&&!isWestNeighbourhood(x,z,5)&&!isRegionalSurveyArea(x,z,5)&&!isSouthCityStudy(x,z,5)&&!isWestSiteParcel(x,z,5)&&!isPingyaoSchoolParcel(x,z,5)&&!isWestLinkStudy(x,z,5)&&!isYingxunPark(x,z,5)) tree(x,z,3.2+random()*6);
    }
  }

  const transform = new T.Object3D();
  for (const {kind,color,parts} of batches.values()) {
    if (!materials.has(color)) {
      materials.set(color,new T.MeshStandardMaterial({color,roughness:.93}));
    }
    const mesh = new T.InstancedMesh(geometry[kind],materials.get(color),parts.length);
    parts.forEach(([x,y,z,w,h,d,angle,slope],index) => {
      transform.position.set(x,y+westGroundHeight(x,z),z);
      transform.scale.set(w,h,d);
      transform.rotation.set(0,angle,slope,'YZX');
      transform.updateMatrix();
      mesh.setMatrixAt(index,transform.matrix);
    });
    mesh.castShadow = kind !== 'box' || parts.some(part => part[4] > 1);
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
  await checkpoint('正在准备下西关街…');
  const heightInventory=new T.Group();heightInventory.name='普通沿街建筑高度记录';heightInventory.userData.heightRecords=ordinaryHeightRecords;scene.add(heightInventory);
  const streetLighting=addStreetDetails(scene);
  await checkpoint('正在准备校园与公共建筑…');
  const school=addPingyaoSchool(scene);
  const westSites=[addTiansen(scene),addPingyaoThirdSchool(scene)];
  for(const site of schoolSites){await checkpoint(`正在准备${site.name}与周边街坊…`);westSites.push(addSchoolSite(scene,site));}
  for(const site of civicSiteSurveys){await checkpoint(`正在准备${site.name}…`);westSites.push(addCivicSite(scene,site));}
  for(const block of westNeighbourBlocks){await checkpoint(`正在准备${block.name}…`);westSites.push(await addWestNeighbourhood(scene,block,checkpoint));}
  await checkpoint('正在准备西城街坊…');
  const westLink=addWestLinkDistrict(scene);
  await checkpoint('正在准备南城街坊…');
  const southCity=addSouthCity(scene);
  await checkpoint('正在准备其他片区…');
  const regionalCity=addRegionalDistricts(scene,{progressive:true});
  const guchengStation=addGuchengStation(scene);
  await checkpoint('正在准备七号巷院落…');
  const qixiangBlock=addQixiangBlock(scene);
  await checkpoint('正在准备古城与公园…');
  addYingxunGreenery(scene);
  const waterfront=addYingxunWaterfront(scene);
  const moatLandscape=addMoatLandscape(scene);
  const ringCommerce=addRingCommerce(scene,[...commerceBuildings,...westLink.root.userData.heightRecords,...southCity.root.userData.heightRecords,...regionalCity.groups.flatMap(g=>g.root.userData.heightRecords??[])]);
  // Progressive regional details have not started yet. Let their courtyard
  // builder preserve clear entrances on the faces selected for street retail.
  for(const g of regionalCity.groups)g.config.retailFrontages=ringCommerce.root.userData.shops;
  addOldTownCourtyards(scene,ancientPlots);
  const oldTownStreets=addOldTownStreetDetails(scene);
  return {lantern:materials.get('#ffbc63'),gates,streetLighting,school,westSites,westLink,southCity,regionalCity,guchengStation,qixiangBlock,oldTownStreets,moatLandscape,ringCommerce,waterfront};
}
