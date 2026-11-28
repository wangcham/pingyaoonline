import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment} from './geography.js';

// OSM way 401952981 is Pingyao Middle School, NOT the western No. 2 school.
// Interior footprints were visually traced against the displayed Amap satellite
// image on 2026-11-25, registered to this boundary. They are NOT surveyed outlines.
export const pingyaoSchoolSurvey = {
  id:'pingyao-middle-school',name:'山西省平遥中学',crs:'WGS84',
  boundary:[[112.1996192,37.2078834],[112.2009901,37.2027962],[112.2033853,37.2031562],[112.2032647,37.2036721],[112.2043041,37.2038641],[112.2030539,37.2084592],[112.1996192,37.2078834]],
  boundarySource:'https://www.openstreetmap.org/way/401952981',
  imagerySource:'https://www.amap.com/place/B016200A69',
  checked:'2026-11-25',imageryDate:null,
  accuracy:'校园边界来自 OSM；内部轮廓按高德卫星图人工判读。楼高、用途、砖缝和景观细部近似；入口外观采用用户照片中的白色校名墙版本。',
  facadeSource:'用户提供的校门照片；高德公开相册中的教学楼及夜景照片',
};
export const schoolBoundary = pingyaoSchoolSurvey.boundary.map(p=>geographicToLocal(p));
const schoolOrigin=schoolBoundary[0],schoolNorth=schoolBoundary[5];
export const schoolAngle=Math.atan2(schoolOrigin[1]-schoolNorth[1],schoolNorth[0]-schoolOrigin[0]);
export function schoolToWorld(u,v){
  const c=Math.cos(schoolAngle),s=Math.sin(schoolAngle);
  return [schoolOrigin[0]+u*c+v*s,schoolOrigin[1]-u*s+v*c];
}
export function worldToSchool(x,z){
  const c=Math.cos(schoolAngle),s=Math.sin(schoolAngle),dx=x-schoolOrigin[0],dz=z-schoolOrigin[1];
  return [dx*c-dz*s,dx*s+dz*c];
}
export const schoolLocalBoundary=schoolBoundary.map(p=>worldToSchool(...p));
// The OSM parcel also contains the southern forecourt/annex. The public-facing
// school gate is north of that approach, not at the inner oval garden.
// Revised from the user's southeast-entrance satellite screenshot; dimensions
// remain visual estimates, not a surveyed gate or cadastral subdivision.
export const schoolEntrance={
  wall:[174,525],gate:[212,520],gateClearWidth:12,
  approach:[[212,580],[212,520],[212,509],[216,484],[220,458]],
  // Keep the staggered rows, with the dated lettering centered on the school
  // name at u=174 (lettering is offset -1 m from each panel's origin).
  // Every panel is parallel to the white school-name wall (local angle 0).
  // Unreadable dates in the supplied photograph are deliberately left blank.
  historyWalls:[
    {u:175,v:565,year:'1924',row:'front',angle:0},
    {u:163,v:558,year:null,row:'back',angle:0},
    {u:163,v:544,year:null,row:'back',angle:0},
    {u:175,v:549,year:'1956',row:'front',angle:0},
    {u:163,v:531,year:null,row:'back',angle:0},
    {u:175,v:535,year:'1961',row:'front',angle:0},
  ],
  // Only short entrance barriers are photo-supported. OSM land-use edges are
  // not evidence for a tall fence around the publicly accessible forecourt.
  barriers:[[193,197.5,520],[222,296,520]],
  reference:'用户提供的校门实景照片及东南门卫星截图（2026-11-25 校正）',
};
const schoolEdges=segments(schoolBoundary);
export function isPingyaoSchoolParcel(x,z,radius=0){
  if(x<1590-radius||x>2040+radius||z< -515-radius||z>150+radius)return false;
  return pointInRing(x,z,schoolBoundary)||schoolEdges.some(e=>projectOnSegment([x,z],e).distance<radius+2);
}
// Units are metres in a campus-aligned frame, derived from the satellite image.
// Labels describe spatial roles; unverified internal building names are omitted.
export const schoolBuildings=[
  ['north-1','北部楼群西翼',216,28,57,18,5],
  ['north-2','北部楼群东翼',273,28,48,18,5],
  ['north-3','北部楼群南西栋',216,73,58,22,5],
  ['north-4','北部楼群南东栋',277,73,38,22,5],
  ['north-link','北部楼群连接廊',183,51,9,64,3],
  ['sports-hall','东北蓝顶场馆',233,130,55,66,2,'#b2a79a','blue'],
  ['east-service-1','东侧附属楼一',285,110,23,19,3],
  ['east-service-2','东侧附属楼二',285,146,23,29,3],
  ['east-service-3','东侧附属楼三',285,177,23,13,2],
  ['central-hall','中部公共楼',174,281,48,37,4,'#ad7772'],
  ['west-1','西侧教学楼北栋',84,298,48,22,4],
  ['west-2','西侧教学楼中栋',88,341,53,22,4],
  ['west-3','西侧教学楼南栋',90,384,53,22,4],
  ['west-link','西侧教学楼连接廊',114,341,10,106,3],
  ['east-1','东侧教学楼北栋',269,339,47,23,4],
  ['east-2','东侧教学楼南栋',269,383,47,23,4],
  ['east-link','东侧教学楼连接廊',242,361,10,67,3],
  ['front-west','入口主楼西翼',142,433,36,21,4,'#ad6668','flat',-.12],
  ['front-center','入口主楼中央',178,431,37,24,4,'#b66e70'],
  ['front-east','入口主楼东翼',214,433,36,21,4,'#ad6668','flat',.12],
  ['southwest','西南长楼',37,442,35,94,4,'#ad6668'],
  ['southeast-roof','东南附属棚',246,494,36,31,1,'#a6a4a0','metal'],
  ['south-1','南部楼群北西栋',44,537,62,18,4,'#b6827a'],
  ['south-2','南部楼群北东栋',113,537,64,18,4,'#b6827a'],
  ['south-3','南部楼群南栋',111,568,68,18,4,'#b6827a'],
].map(([id,name,u,v,w,d,levels,color='#ae7271',roof='flat',angle=0])=>({
  id,name,u,v,w,d,levels,color,roof,angle,
  coordinate:localToGeographic(schoolToWorld(u,v)),crs:'WGS84',
  footprintSource:id.startsWith('south-')?'User southeast-gate satellite reference, visually registered to OSM 401952981':'AMap satellite visual interpretation, registered to OSM 401952981',
  levelsSource:id.startsWith('front-')||id==='southwest'?'photo-reference':'typology-estimate',
  confidence:id.startsWith('front-')?.6:.3,estimated:true,
}));
function schoolView(u,y,v){const [x,z]=schoolToWorld(u,v);return [x,y,z];}
export const schoolStops=[
  {name:'平遥中学 · 校门广场',keywords:'山西省平遥中学 平中 学校 校门 教学楼 东南门',address:'东南门外侧前区 · 沿入口通道进入校园 · 布局近似',eye:schoolView(194,2.6,552),target:schoolView(174,3.5,525)},
  {name:'平遥中学 · 校园全景',keywords:'平遥中学 俯瞰 校园 操场',address:'OSM 校园边界 · 卫星图判读的楼群与运动场',eye:schoolView(173,285,600),target:schoolView(156,0,255)},
  {name:'平遥中学 · 运动场',keywords:'平遥中学 田径场 足球 篮球',address:'校园西北侧田径场与相邻球场',eye:schoolView(145,5,251),target:schoolView(69,4,131)},
];
const schoolLabelPosition=schoolToWorld(...schoolEntrance.wall),schoolEntryEye=schoolStops[0].eye;
export const schoolLandmarkRecord={
  id:pingyaoSchoolSurvey.id,name:pingyaoSchoolSurvey.name,position:schoolLabelPosition,
  coordinate:localToGeographic(schoolLabelPosition),crs:'WGS84',scale:1,height:8.75,
  view:[schoolEntryEye[0]-schoolLabelPosition[0],schoolEntryEye[1],schoolEntryEye[2]-schoolLabelPosition[1]],
  description:'位于平遥古城东侧的平遥中学。校园包含南部红白楼群与入口广场、西北侧田径场、东侧球场、校内道路和景观庭院。模型按卫星图分区，入口外观参考提供的实景照片。',
  accuracy:pingyaoSchoolSurvey.accuracy,sources:[pingyaoSchoolSurvey.boundarySource,pingyaoSchoolSurvey.imagerySource],approximate:true,
};
