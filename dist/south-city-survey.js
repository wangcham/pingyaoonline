import {splitSurveyRoof} from './west-link-survey.js';
import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment,createRingQuery,makeGrid} from './geography.js';
import {mapData} from './map-data.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {isYingxunPark} from './yingxun-park-data.js';

// Hand-traced roof rows from four north-up 1280 × 720 Amap views, zoom 17.
// A row is a visible connected roof, not a surveyed household or cadastral parcel.
export const southCityFrames={liugen:{center:[112.184,37.193]},shuguang:{center:[112.184,37.187]},shuanglin:{center:[112.184,37.181]},outer:{center:[112.184,37.175]}};
export function southImagePoint(frame,u,v){
  const [lon,lat]=southCityFrames[frame].center,size=256*2**17;
  const cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
  return geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
}
export const southCitySurvey={checked:'2026-11-26',imageryDate:null,crs:'WGS84',
  sources:Object.entries(southCityFrames).map(([id,{center:[lng,lat]}])=>({id,url:`https://www.amap.com/ssr/embed/view?lng=${lng}&lat=${lat}&zoom=17&maptype=satellite&platform=pc`})),
  attribution:'卫星图人工判读：高德 / DigitalGlobe & SpaceView；道路：© OpenStreetMap contributors (ODbL)',
  accuracy:'屋顶与内部通道为影像人工判读，卫星拍摄日期未知；楼层、立面、用途、铺装及单株树位为估算。大面积屋顶不自动判为高楼。尚未取得逐栋实测高度。',
};
const southRoofRows=[];
// Explicit observed rows; no random density fill. Each tuple is image x,y,w,d.
function southRows(frame,levels,kind,color,rows){for(const [u,v,w,d,angle=.15] of rows)southRoofRows.push({frame,u,v,w,d,levels,kind,roofColor:color,angle});}
southRows('liugen',1,'lowrise','#797a70',[[103,269,94,11],[106,290,92,11],[110,312,94,11],[113,335,94,11],[116,357,93,11],[119,380,94,11],[121,403,94,11],[126,425,93,11],[130,450,93,11],[222,252,90,11],[225,273,90,11],[228,294,90,11],[230,316,91,11],[234,339,91,11],[237,362,91,11],[240,385,92,11],[243,408,92,11],[245,430,92,11],[341,231,104,11],[344,253,104,11],[347,276,103,11],[350,299,105,11],[34,289,37,11],[36,313,38,11],[39,338,39,11],[42,362,39,11],[44,386,40,11],[47,410,40,11],[50,434,40,11],[54,457,40,11],[151,491,91,11],[154,516,90,11],[157,540,89,11],[161,563,89,11]]);
southRows('liugen',4,'public','#a5a597',[[357,349,90,25],[365,419,96,21],[241,497,21,67],[339,577,104,23],[397,531,20,84],[401,682,92,24]]);
southRows('liugen',5,'residential','#96978b',[[47,518,54,20],[56,558,54,20],[221,600,67,22],[232,637,67,22],[141,661,70,22],[61,670,45,23]]);
southRows('liugen',2,'commercial','#8a8d83',[[527,315,92,29],[490,348,42,26],[526,663,68,28],[662,653,39,21],[803,627,64,23]]);
southRows('shuguang',1,'lowrise','#777b71',[[322,89,97,12],[325,112,97,12],[329,134,97,12],[332,157,97,12],[336,180,97,12],[339,203,97,12],[342,226,97,12],[345,247,96,12],[418,75,83,12],[421,98,83,12],[424,120,83,12],[428,144,83,12],[431,168,83,12],[434,190,83,12],[438,214,83,12],[441,238,83,12],[221,325,82,12],[225,348,82,12],[228,371,82,12],[231,394,82,12],[234,416,82,12],[337,305,103,12],[340,330,103,12],[344,354,103,12],[347,379,103,12],[351,402,103,12],[447,287,83,12],[451,310,83,12],[455,333,83,12],[459,356,83,12],[462,379,83,12],[597,133,91,12],[601,157,91,12],[605,180,91,12],[608,204,91,12],[612,229,91,12],[616,252,91,12],[620,278,91,12],[791,220,85,12],[794,243,85,12],[797,267,85,12],[801,292,85,12],[804,315,85,12],[808,339,85,12],[874,206,32,12],[878,230,32,12],[881,254,32,12],[885,279,32,12],[889,305,32,12],[893,329,32,12],[896,354,32,12],[843,451,91,12],[847,476,91,12],[851,501,91,12],[855,526,91,12],[859,550,91,12],[864,576,91,12],[931,446,51,12],[936,471,51,12],[941,496,51,12],[946,522,51,12],[950,547,51,12],[955,572,51,12],[54,347,95,12],[58,372,95,12],[62,397,95,12],[67,424,95,12],[71,449,95,12],[75,477,95,12]]);
southRows('shuguang',6,'residential','#a79a8a',[[229,130,64,19],[233,168,64,19],[238,207,64,19],[243,247,64,19],[247,284,64,19],[158,162,58,20],[163,196,58,20],[168,230,58,20],[173,268,58,20],[87,158,35,19],[91,194,35,19],[95,232,35,19],[99,268,35,19],[680,51,74,20],[686,92,74,20],[693,131,74,20],[700,168,74,20],[706,201,74,20],[791,35,78,20],[797,73,78,20],[805,110,78,20],[812,150,78,20],[819,185,78,20],[1002,45,94,20],[1008,79,94,20],[1014,114,94,20],[1020,151,94,20],[1115,32,78,20],[1121,69,78,20],[1127,106,78,20],[1133,141,78,20],[994,226,52,21],[1001,263,52,21],[1009,300,52,21],[1079,211,52,21],[1086,249,52,21],[1094,287,52,21],[1185,198,84,21],[1192,237,84,21],[1199,276,84,21],[1060,394,64,22],[1068,433,64,22],[1076,471,64,22],[1084,507,64,22],[1181,372,84,22],[1188,411,84,22],[1196,449,84,22],[1203,490,84,22],[735,533,82,22],[741,574,82,22],[749,615,82,22],[756,657,82,22],[385,662,95,20],[390,695,95,20],[253,679,99,20],[117,703,91,20]]);
southRows('shuguang',3,'commercial','#9f9f94',[[579,52,83,21],[582,87,82,20],[640,350,73,23],[677,392,83,24],[331,563,25,90],[216,600,81,23],[404,553,64,22]]);
southRows('shuanglin',6,'residential','#b0a08d',[[294,7,81,19],[299,34,81,18],[304,62,81,18],[309,92,81,18],[317,151,81,19],[322,180,81,19],[327,211,81,19],[332,241,81,19],[337,271,81,19],[400,14,78,19],[404,42,78,19],[409,71,78,19],[415,100,78,19],[424,145,70,19],[430,179,70,19],[436,210,70,19],[441,241,70,19],[168,166,83,20],[172,198,83,20],[177,228,83,20],[182,260,83,20],[186,292,83,20],[63,185,78,20],[67,217,78,20],[72,250,78,20],[77,281,78,20],[81,312,78,20],[131,459,83,23],[139,505,83,23],[145,550,83,23],[152,596,83,23],[158,642,83,23],[165,687,83,23],[47,476,67,23],[54,525,67,23],[61,574,67,23],[68,624,67,23],[906,67,102,22],[912,111,102,22],[920,155,102,22],[983,18,105,22],[1217,306,80,24],[1226,354,80,24],[1232,405,80,24],[1241,448,80,24],[1236,520,65,23],[1244,567,65,23],[1252,617,65,23]]);
southRows('shuanglin',1,'lowrise','#808176',[[1146,15,71,11],[1150,38,71,11],[1154,61,71,11],[1157,85,71,11],[1161,109,71,11],[1165,133,71,11],[1168,158,71,11],[1172,182,71,11],[1176,207,71,11],[1180,233,71,11],[1219,9,54,11],[1223,32,54,11],[1227,56,54,11],[1231,80,54,11],[1235,104,54,11],[1239,128,54,11],[1242,152,54,11],[1246,176,54,11],[1250,202,54,11],[1254,226,54,11]]);
southRows('shuanglin',4,'public','#a49f8d',[[712,68,22,74],[722,167,24,81],[764,209,65,23],[347,410,110,25],[316,462,24,62],[346,600,84,24],[493,432,24,90],[516,562,66,23],[525,600,66,23]]);
southRows('outer',1,'shed','#688694',[[176,183,35,37],[204,239,36,24],[294,179,54,23],[338,203,30,45],[287,371,49,43],[247,388,30,10],[628,77,51,34],[996,188,40,35],[1007,248,32,38],[1098,166,23,31],[1105,199,23,30]]);
southRows('outer',2,'commercial','#94978b',[[232,293,94,23],[270,321,66,21],[208,363,38,20],[126,509,96,27],[134,583,90,25],[155,632,42,22],[667,256,49,22],[674,290,49,22],[1120,316,100,18],[1143,360,107,20],[1158,401,110,21]]);
southRows('outer',6,'residential','#a79e8a',[[129,84,66,23],[212,60,69,23],[205,21,69,23]]);

export const southCityBoundaries=Object.keys(southCityFrames).map(id=>[[15,12],[1264,12],[1264,708],[15,708]].map(p=>southImagePoint(id,...p)));
const southCityQueries=southCityBoundaries.map(createRingQuery);
export function isSouthCityStudy(x,z,pad=0){if(x< -1000-pad||x>260+pad||z<940-pad||z>3650+pad)return false;return !isYingxunPark(x,z,pad)&&southCityQueries.some(q=>q.contains(x,z,pad));}
function southPolygon(frame,points){return points.map(p=>southImagePoint(frame,...p));}
export const southCityOpenGround=[
 ['liugen','paving',[[456,162],[592,147],[614,276],[475,298]]],
 ['liugen','paving',[[474,382],[607,361],[633,582],[504,607]]],
 ['liugen','sports',[[310,443],[402,431],[415,501],[324,512]]],
 ['liugen','soil',[[634,148],[768,125],[789,247],[666,291]]],
 ['liugen','soil',[[659,313],[738,290],[761,370],[799,384],[820,478],[700,492]]],
 ['liugen','field',[[722,505],[799,497],[830,558],[738,581]]],
 ['liugen','soil',[[1007,352],[1096,335],[1130,607],[1052,620]]],
 ['liugen','soil',[[1102,447],[1260,418],[1260,512],[1146,524],[1152,601],[1136,605]]],
 ['shuguang','green',[[575,510],[640,496],[657,680],[603,694]]],
 ['shuguang','green',[[52,84],[90,290],[17,300],[17,90]]],
 ['shuguang','green',[[1003,188],[1173,159],[1183,180],[1014,211]]],
 ['shuanglin','field',[[692,306],[1076,246],[1116,516],[745,588]]],
 ['shuanglin','soil',[[750,601],[1102,540],[1126,685],[771,699]]],
 ['shuanglin','sports',[[367,461],[445,445],[470,526],[387,543]]],
 ['shuanglin','green',[[773,76],[823,68],[846,183],[793,196]]],
 ['outer','sports',[[333,14],[496,14],[483,118],[343,142]]],
 ['outer','field',[[371,366],[621,322],[668,626],[314,673]]],
 ['outer','field',[[20,197],[141,181],[167,442],[20,467]]],
 ['outer','field',[[792,21],[1172,21],[1181,109],[815,163]]],
 ['outer','field',[[870,211],[964,193],[991,360],[904,380]]],
 ['outer','green',[[1059,442],[1236,419],[1259,550],[1074,583]]],
].map(([frame,kind,pixels],i)=>({id:`south-open-${i}`,kind,color:{field:'#8a8d65',soil:'#a69b80',green:'#7b8a66',sports:'#718772',paving:'#b1afa0'}[kind],ring:southPolygon(frame,pixels)}));
export const southCityAlleys=[
 ['liugen',[[57,255],[92,473],[121,578]],3.5],['liugen',[[165,235],[195,444],[208,572]],3.5],['liugen',[[278,212],[315,437]],3.5],['liugen',[[96,472],[409,422]],4],['liugen',[[64,338],[422,279]],4],['liugen',[[113,588],[433,537]],4],
 ['shuguang',[[191,86],[222,291]],4],['shuguang',[[262,81],[298,280]],4],['shuguang',[[377,64],[410,260]],3.5],['shuguang',[[172,317],[204,487]],3.5],['shuguang',[[284,298],[313,469]],3.5],['shuguang',[[389,280],[421,442]],3.5],['shuguang',[[654,19],[676,166]],4],['shuguang',[[745,24],[772,189]],4],['shuguang',[[746,201],[779,392]],3.5],['shuguang',[[839,198],[870,377]],3.5],['shuguang',[[1044,185],[1067,327]],4],['shuguang',[[1121,177],[1148,310]],4],['shuguang',[[1111,367],[1143,548]],4],['shuguang',[[788,498],[819,681]],3.5],['shuguang',[[883,426],[917,601]],3.5],
 ['shuanglin',[[250,15],[283,110],[317,135],[361,141],[386,322]],4],['shuanglin',[[370,20],[387,103],[461,93]],4],['shuanglin',[[195,18],[229,334]],4],['shuanglin',[[94,433],[132,710]],4],['shuanglin',[[1194,18],[1237,255]],3.5],['shuanglin',[[107,672],[219,657]],4],
 ['outer',[[146,151],[203,652]],4],['outer',[[168,269],[363,238],[629,190]],4],['outer',[[632,219],[679,647]],4],['outer',[[247,678],[768,642]],4],
].map(([frame,points,width])=>({points:southPolygon(frame,points),width,estimated:true}));
const southRoads=mapData.roads.concat(southCityAlleys.map(p=>['service',p.width,'影像判读内部通道',p.points]));
const southClearance=createRoadClearance(southRoads),southRoadSegments=southRoads.flatMap(([,width,,points])=>segments(points).map(line=>({line,width,ring:clearanceRect((line.start[0]+line.end[0])/2,(line.start[1]+line.end[1])/2,line.length,width+3.4,-Math.atan2(line.end[1]-line.start[1],line.end[0]-line.start[0]))})));
const southPublicRoadSegments=mapData.roads.flatMap(([,width,,points])=>segments(points).map(line=>({line,width}))).filter(({line})=>Math.max(line.start[0],line.end[0])> -1050&&Math.min(line.start[0],line.end[0])<310&&Math.max(line.start[1],line.end[1])>900&&Math.min(line.start[1],line.end[1])<3700);
const southPublicRoadGrid=makeGrid(80);
for(const item of southPublicRoadSegments){const {line,width}=item,pad=width/2+41;southPublicRoadGrid.add(item,Math.min(line.start[0],line.end[0])-pad,Math.min(line.start[1],line.end[1])-pad,Math.max(line.start[0],line.end[0])+pad,Math.max(line.start[1],line.end[1])+pad);}
export function southCityRoadClear(x,z,radius=0){return !(radius<=40?southPublicRoadGrid.at(x,z):southPublicRoadSegments).some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+radius+1);}
let southLayoutCache;
export function createSouthCityLayout(){
 if(southLayoutCache)return southLayoutCache;
 const roofs=[],omitted=[];
 southRoofRows.forEach((p,index)=>{
  const [x,z]=southImagePoint(p.frame,p.u,p.v),q=southImagePoint(p.frame,p.u+p.w/2,p.v),t=southImagePoint(p.frame,p.u,p.v+p.d/2);
  const original={...p,id:`south-${p.frame}-${index}`,x,z,w:2*Math.hypot(q[0]-x,q[1]-z),d:2*Math.hypot(t[0]-x,t[1]-z),coordinate:localToGeographic([x,z]),crs:'WGS84',estimated:true,footprintEstimated:true,footprintSource:southCitySurvey.sources.find(s=>s.id===p.frame).url};
  const parts=splitSurveyRoof(original,southRoadSegments);
  if(!parts.length)omitted.push({id:original.id,reason:'road'});
  for(const item of parts){
  item.ring=clearanceRect(item.x,item.z,item.w,item.d,p.angle);
  const envelope=clearanceRect(item.x,item.z,item.w,item.d,p.angle,1.3);
  const reason=!envelope.every(v=>isSouthCityStudy(...v))?'boundary':!southClearance.clear(envelope)?'road':southCityOpenGround.some(g=>clearancePolygonsOverlap(envelope,g.ring))?'open-ground':roofs.some(r=>clearancePolygonsOverlap(envelope,r.ring))?'duplicate':null;
  if(reason)omitted.push({id:item.id,reason});else roofs.push(item);
  }
 });
 return southLayoutCache={roofs,omitted};
}

export const southCityStops=[
 {name:'南城 · 连续街坊全景',keywords:'南城 平房 多层 楼房 卫星 街坊',address:'柳根街至南外环方向 · 已判读片区，层数估算',eye:[-430,430,2780],target:[-460,0,1850]},
 {name:'曙光街 · 内部低层街坊',keywords:'曙光 康宁 院落 平房 后街',address:'低层连排房屋与内部巷道 · 近似建模',eye:[-730,85,1880],target:[-700,0,1760]},
 {name:'双林大道 · 多层住宅',keywords:'双林 春蕾 多层 住宅 南城',address:'多层楼群保留楼间距和内部通道 · 层数估算',eye:[-650,100,2550],target:[-730,0,2420]},
];
