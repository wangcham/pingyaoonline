import {citySurveyProgress} from './city-survey-progress.js';
import {mapData} from './map-data.js';
import {pointInRing,segments,projectOnSegment} from './geography.js';
import {geographicToLocal,localToGeographic,wgs84ToGcj02} from './landmarks/coordinates.js';

// Project work areas, not administrative boundaries. IDs remain stable when
// later data refines the urban fringe. A grid cell has one ID even at a seam.
export const cityPlanScope={version:1,date:'2026-11-26',cellSize:500,
  title:'平遥全城与古城站分区',crs:'WGS84',
  boundary:[[-5000,-2500],[4000,-2500],[4000,3500],[1500,4500],[-1500,6500],[-5000,6500]],
  note:'范围为县城及古城站连接片区的工作包络，非行政区界；农田、水面和村庄保留实际用途。总览核对不等于逐栋完成。',
  overviewSources:[
    'https://www.amap.com/ssr/embed/view?lng=112.180&lat=37.192&zoom=14&maptype=satellite&platform=pc',
    'https://www.amap.com/ssr/embed/view?lng=112.180&lat=37.223&zoom=14&maptype=satellite&platform=pc',
    'https://www.amap.com/ssr/embed/view?lng=112.151&lat=37.163&zoom=14&maptype=satellite&platform=pc'],
  imageryDate:null,
};
export const cityPlanGroups=[
  {id:'A',name:'古城内',color:'#bba078'}, {id:'B',name:'城墙外缘',color:'#6fa98c'},
  {id:'C',name:'西城',color:'#81a6c5'}, {id:'D',name:'东城',color:'#b390ba'},
  {id:'E',name:'南城',color:'#cf987a'}, {id:'F',name:'北城',color:'#a5b574'},
  {id:'G',name:'古城站连接片区',color:'#73b4b3'},
];
export const cityPlanRegions=[
  ['A01','古城西北片','西大街以北、北大街以西及内部院落',[-850,-400],'partial'],
  ['A02','古城东北片','北大街以东、东大街以北及内部院落',[-40,-430],'partial'],
  ['A03','古城西南片','县衙、书院街、上西门街及内部院落',[-720,400],'partial'],
  ['A04','古城东南片','市楼南部、文庙、城隍庙及内部院落',[150,300],'partial'],
  ['B01','西城墙外缘','西门、又见平遥、城墙步道与绿地',[-1280,400],'partial'],
  ['B02','南城墙外缘','小南门、迎薰门、柳根河及两侧公园',[-550,980],'active'],
  ['B03','东城墙外缘','上下东门、护城道路、惠济河周边',[600,250],'planned'],
  ['B04','北城墙外缘','北门、北护城道路及北侧绿地',[-450,-980],'planned'],
  ['C01','平遥站与站前街坊','平遥站、中都街及站前后街',[-1900,-400],'partial'],
  ['C02','下西关街与二中','下西关街、二中、宇峰及后排街坊',[-2100,220],'partial'],
  ['C03','三中与田森片区','上西关街、永安北路、三中与田森',[-2000,1350],'partial'],
  ['C04','人民医院与西城新区','人民医院新院区及周边连续街坊',[-3500,1700],'planned'],
  ['D01','东关街坊','上下东关街及内部居民区',[1200,750],'planned'],
  ['D02','平遥中学周边','校园、学府街及周边楼群',[1900,-350],'partial'],
  ['D03','东城外缘','东城连续建成区及城乡接合部',[3100,400],'planned'],
  ['E01','柳根街片区','柳根街两侧及南城北部内部街坊',[-100,1250],'partial'],
  ['E02','曙光街片区','曙光街、康宁路、城南路周边',[-150,1800],'partial'],
  ['E03','双林大道片区','双林大道沿线及南北楼群',[-700,2400],'partial'],
  ['E04','南外环与南城街坊','南城道路、南外环方向及住宅片区',[-750,3150],'partial'],
  ['F01','北城西片','铁路以西及西北城市边缘',[-3100,-1750],'planned'],
  ['F02','北门外片','北门以北的街坊与道路',[-700,-1750],'planned'],
  ['F03','东北片','东北住宅、道路与城乡接合部',[2200,-1750],'planned'],
  ['G01','城区至古城站连接片区','南城向西南延伸的道路及相邻地块',[-1000,4100],'planned'],
  ['G02','古城站沿线村居','文景大道方向、沿线村居、农田与路网',[-3800,4100],'planned'],
  ['G03','古城站与站前区域','站房、站前广场、停车区及出入道路',[-3500,5550],'planned'],
].map(([id,name,scope,anchor,status])=>{if(status==='planned'&&citySurveyProgress.regions[id]?.buildings)status='partial';return {id,name,scope,anchor,status,
  stages:{survey:status==='planned'?'overview-only':'partial',roads:'pending-audit',buildings:status==='planned'?'pending':'partial',ground:'pending',greenery:id==='B02'?'partial':'pending',acceptance:'pending'},
  priority:id==='B02'?1:['C01','C02','C03','C04','E01','E02','D02'].includes(id)?2:3,
};});
export const cityPlanAnchors=[
  {name:'平遥站',position:[-1754,-284],source:'existing-station-survey'},
  {name:'小南门',position:[-600.6,838.2],source:'https://www.amap.com/place/B0FFIDO7BC'},
  {name:'人民医院新院区',position:geographicToLocal([112.152735,37.189202],'GCJ-02'),source:'https://www.amap.com/place/B0FFHTX6L6'},
  {name:'平遥中学',position:[1840,-250],source:'https://www.openstreetmap.org/way/401952981'},
  {name:'平遥古城站',position:geographicToLocal([112.148933,37.157199],'GCJ-02'),source:'https://www.amap.com/place/B0FFFRH4NV'},
];
const cityPlanWallEdges=segments(mapData.wall);
export function cityRegionAt(x,z){
  if(!pointInRing(x,z,cityPlanScope.boundary))return null;
  const wallRegion=()=>z>550?'B02':z< -520?'B04':x< -400?'B01':'B03';
  if(cityPlanWallEdges.some(e=>projectOnSegment([x,z],e).distance<20))return wallRegion();
  if(pointInRing(x,z,mapData.wall))return z<100?(x< -400?'A01':'A02'):(x< -400?'A03':'A04');
  if(cityPlanWallEdges.some(e=>projectOnSegment([x,z],e).distance<220))return wallRegion();
  if(z< -1000)return x< -1500?'F01':x<700?'F02':'F03';
  if(z>=3500)return x< -2600&&z>=4700?'G03':x< -2000?'G02':'G01';
  if(x< -2700)return 'C04';
  if(x< -1300&&z<2100)return z< -150?'C01':z<500?'C02':'C03';
  if(x>650&&z<1600)return x>2400?'D03':z<100?'D02':'D01';
  return z<1400?'E01':z<2100?'E02':z<2800?'E03':'E04';
}
export function cityPlanTileId(x,z){
  const part=n=>(n<0?'m':'p')+String(Math.abs(n)).padStart(2,'0');
  return `PY-X${part(Math.floor(x/500))}-Z${part(Math.floor(z/500))}`;
}
export function cityPlanMapURL(x,z,zoom=17){const [lng,lat]=wgs84ToGcj02(...localToGeographic([x,z]));return `https://www.amap.com/ssr/embed/view?lng=${lng}&lat=${lat}&zoom=${zoom}&maptype=satellite&platform=pc`;}
export const cityPlanTiles=[];
for(let z=-2500;z<6500;z+=500)for(let x=-5000;x<4000;x+=500){
  const samples=[50,250,450].flatMap(dx=>[50,250,450].map(dz=>[x+dx,z+dz]));
  const regions=[...new Set(samples.map(p=>cityRegionAt(...p)).filter(Boolean))];if(!regions.length)continue;
  const primary=cityRegionAt(x+250,z+250);if(primary)regions.sort((a,b)=>a===primary?-1:b===primary?1:0);
  cityPlanTiles.push({id:cityPlanTileId(x,z),boundsLocal:[x,z,x+500,z+500],regions,
    ringWGS84:[[x,z],[x+500,z],[x+500,z+500],[x,z+500]].map(localToGeographic),
    center:localToGeographic([x+250,z+250]),crs:'WGS84',satelliteURL:cityPlanMapURL(x+250,z+250),
    survey:'pending',buildings:'pending',roads:'pending',greenery:'pending',acceptance:'pending'});
}
export const cityPlanStatusText={planned:'待逐格核对',partial:'已有局部模型',active:'本批修补中'};
