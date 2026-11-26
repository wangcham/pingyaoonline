import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {createRingQuery,pointInRing} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {civicSiteSurveys,civicSiteIntersects,civicPublicRoads} from './civic-sites-data.js';

// North-up 1280 × 720 public satellite views, manually reviewed 2026-11-26.
// Coordinates below are retained observations, not a random parcel generator.
export const westNeighbourFrames={
 north:{center:[112.1485,37.1916],zoom:18},south:{center:[112.149,37.1887],zoom:18},
 garden:{center:[112.1546,37.1941],zoom:18},east:{center:[112.1564,37.1897],zoom:18},
 overview:{center:[112.1546,37.1933],zoom:17},towers:{center:[112.1504,37.1875],zoom:18},
};
export function westNeighbourImage(frame,u,v){
 const {center:[lon,lat],zoom}=westNeighbourFrames[frame],size=256*2**zoom,cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
 return geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
}
export const westNeighbourSource=frame=>{const f=westNeighbourFrames[frame];return `https://www.amap.com/ssr/embed/view?lng=${f.center[0]}&lat=${f.center[1]}&zoom=${f.zoom}&maptype=satellite&platform=pc`;};
const neighbourhoodRaw=[];
function neighbourhood(id,name,frame,boundary){const b={id,name,frame,boundary,roofs:[],lanes:[],greens:[],courts:[],sports:[]};neighbourhoodRaw.push(b);return b;}
// [screen x,y,width,depth, optional angle]. Dimensions refer to roof axes.
function neighbourhoodRoofs(b,frame,levels,type,color,rows,{angle=.24,pitched=false,frontage=false}={}){for(const r of rows)b.roofs.push({frame,px:r[0],py:r[1],pw:r[2],pd:r[3],angle:r[4]??angle,levels,type,color,pitched,frontage});}
function neighbourhoodLane(b,frame,width,points){b.lanes.push({frame,width,points});}
function neighbourhoodGreen(b,frame,points){b.greens.push({frame,points});}
function neighbourhoodCourt(b,frame,points){b.courts.push({frame,points});}
const neighbourhoodNorth=neighbourhood('C04-05','西城新区 · 北部住宅与沿街底商','north',[[62,550],[700,-12],[1177,-12],[1262,330],[1262,575],[282,780],[150,662]]);
neighbourhoodRoofs(neighbourhoodNorth,'north',10,'residential','#b5ad97',[[856,30,220,48],[742,121,170,46],[1100,55,150,44],[575,236,166,45],[763,230,163,45],[958,193,159,44]]);
neighbourhoodRoofs(neighbourhoodNorth,'north',2,'commercial','#b8ac94',[[889,115,99,23],[1145,143,38,126],[1165,279,74,30],[1231,384,82,33]],{frontage:true});
neighbourhoodRoofs(neighbourhoodNorth,'north',5,'residential','#b3a28d',[[417,349,115,29,.62],[558,362,201,35],[769,325,149,35],[967,286,168,35],[621,432,148,34],[446,478,167,33],[795,417,169,35],[997,416,176,35],[260,520,159,35],[278,596,169,35],[303,675,171,35],[468,550,166,34],[489,627,176,34],[518,707,179,34],[637,507,157,34],[659,584,158,35],[683,660,158,34],[835,524,156,37],[858,619,168,33],[1041,501,176,36],[1066,586,164,33]],{pitched:true,frontage:true});
neighbourhoodLane(neighbourhoodNorth,'north',5.5,[[252,343],[329,469],[382,746]]);neighbourhoodLane(neighbourhoodNorth,'north',5,[[570,99],[655,219],[768,690]]);neighbourhoodLane(neighbourhoodNorth,'north',5,[[819,84],[857,266],[955,651]]);neighbourhoodLane(neighbourhoodNorth,'north',5,[[1013,3],[1058,211],[1156,604]]);
for(const points of [[[328,458],[1070,260]],[[349,548],[1091,342]],[[366,636],[1111,430]],[[382,730],[1141,522]],[[293,760],[1253,582]]])neighbourhoodLane(neighbourhoodNorth,'north',4.5,points);
const neighbourhoodSouth=neighbourhood('C04-06','西城新区 · 南部住宅与社区巷道','south',[[89,110],[681,-48],[795,364],[170,524]]);
neighbourhoodRoofs(neighbourhoodSouth,'south',5,'residential','#b2a38d',[[234,75,174,34],[407,30,181,34],[233,210,163,34],[275,290,176,34],[294,369,179,35],[306,450,190,35],[414,201,166,34],[440,287,163,34],[470,359,160,35],[586,77,169,33],[608,155,173,35],[623,233,169,35],[653,308,168,35]],{pitched:true,frontage:true});
neighbourhoodRoofs(neighbourhoodSouth,'south',1,'shed','#667d82',[[156,141,53,21],[539,347,23,39],[753,335,32,43]],{angle:.24});
neighbourhoodLane(neighbourhoodSouth,'south',5,[[314,55],[363,425],[791,323]]);neighbourhoodLane(neighbourhoodSouth,'south',5,[[494,17],[556,379]]);neighbourhoodLane(neighbourhoodSouth,'south',6,[[693,-38],[783,348],[805,384]]);
for(const points of [[[114,179],[715,44]],[[134,260],[735,128]],[[153,345],[758,209]],[[172,429],[781,294]],[[178,515],[795,365]]])neighbourhoodLane(neighbourhoodSouth,'south',4.2,points);
const neighbourhoodTowers=neighbourhood('C04-07','医院西侧 · 馨御华庭及配套街坊','towers',[[447,-407],[787,-493],[872,-247],[975,163],[1119,695],[724,799],[574,306]]);
neighbourhoodRoofs(neighbourhoodTowers,'south',5,'residential','#b5aa93',[[812,35,160,36],[980,78,151,36]],{pitched:true});
neighbourhoodRoofs(neighbourhoodTowers,'south',3,'public','#c8b994',[[910,173,203,35],[826,241,26,38],[1039,190,31,47]]);
neighbourhoodRoofs(neighbourhoodTowers,'south',14,'residential','#c2baa5',[[903,272,112,44],[1044,247,106,44]],{angle:.26});
neighbourhoodRoofs(neighbourhoodTowers,'towers',14,'residential','#c2baa5',[[732,133,143,53],[882,214,136,55],[727,285,141,54],[788,437,143,56],[945,345,145,53],[799,632,146,54],[1069,552,145,55]],{angle:.28});
neighbourhoodRoofs(neighbourhoodTowers,'towers',2,'commercial','#b5b0a1',[[930,457,183,23],[937,489,243,27],[914,705,220,20],[651,195,23,120]],{angle:.28,frontage:true});
neighbourhoodLane(neighbourhoodTowers,'south',6,[[699,-42],[755,148],[836,399],[928,697]]);neighbourhoodLane(neighbourhoodTowers,'south',5,[[802,111],[1061,49],[1128,202]]);
neighbourhoodLane(neighbourhoodTowers,'towers',5.5,[[589,28],[652,240],[734,507],[800,710],[1097,619]]);neighbourhoodLane(neighbourhoodTowers,'towers',5,[[703,365],[994,283],[1058,471],[1095,645]]);
for(const p of [[[670,219],[900,156]],[[720,397],[984,325]],[[759,563],[1067,473]],[[803,715],[1111,626]]])neighbourhoodLane(neighbourhoodTowers,'towers',4.5,p);
neighbourhoodGreen(neighbourhoodTowers,'towers',[[772,296],[858,271],[881,314],[797,340]]);neighbourhoodGreen(neighbourhoodTowers,'towers',[[829,518],[944,485],[965,541],[855,571]]);neighbourhoodGreen(neighbourhoodTowers,'south',[[916,313],[1027,285],[1074,348],[958,382]]);
const neighbourhoodSchool=neighbourhood('C04-08','西城生活区 · 实验二小周边','towers',[[-100,231],[520,112],[642,469],[159,582],[-93,596]]);
neighbourhoodRoofs(neighbourhoodSchool,'towers',4,'public','#c8bca2',[[422,172,200,39],[461,326,211,43],[337,260,27,92],[548,229,25,76]],{angle:.23});
neighbourhoodRoofs(neighbourhoodSchool,'towers',1,'shed','#607e98',[[20,346,105,44],[38,447,148,34],[137,482,25,41],[67,541,185,39]],{angle:.23});
neighbourhoodLane(neighbourhoodSchool,'towers',5,[[294,196],[358,458],[601,402],[524,141],[294,196]]);neighbourhoodLane(neighbourhoodSchool,'towers',4,[[0,480],[344,450]]);
neighbourhoodCourt(neighbourhoodSchool,'towers',[[366,356],[574,305],[599,402],[386,454]]);neighbourhoodGreen(neighbourhoodSchool,'towers',[[367,208],[511,173],[534,250],[391,282]]);
neighbourhoodSchool.sports.push({frame:'towers',center:[220,332],w:169,d:258,angle:.22});
const neighbourhoodGarden=neighbourhood('C04-09','柳根花园 · 公共服务街坊','overview',[[342,179],[557,0],[652,0],[769,214],[880,453],[910,571],[532,641],[433,493],[359,480],[353,408],[401,354]]);
neighbourhoodRoofs(neighbourhoodGarden,'overview',6,'residential','#b0a38c',[[512,97,69,19,.64],[596,65,69,20],[559,106,67,19],[627,103,64,19],[561,145,69,20],[669,139,64,19],[589,184,69,20],[681,183,66,20],[697,222,63,19]],{angle:.18,pitched:true});
neighbourhoodRoofs(neighbourhoodGarden,'garden',5,'residential','#b5a28d',[[226,105,136,31,.65],[128,185,110,29,.65],[286,201,142,34],[201,282,169,35],[378,259,123,37],[224,371,169,36],[393,338,139,35],[239,446,167,35],[408,420,142,36]],{angle:.18,pitched:true});
neighbourhoodRoofs(neighbourhoodGarden,'overview',5,'residential','#b6a58e',[[456,347,69,18],[551,340,71,18],[487,385,73,18],[573,366,69,18],[506,426,72,18],[581,411,70,18],[513,463,66,18],[590,449,72,18]],{angle:.18,pitched:true,frontage:true});
neighbourhoodRoofs(neighbourhoodGarden,'overview',5,'office','#bfc2b4',[[638,479,113,18],[593,522,15,43],[696,511,16,54],[647,551,78,17]],{angle:.18});
neighbourhoodRoofs(neighbourhoodGarden,'overview',2,'public','#b5b6ac',[[453,598,50,18],[478,564,42,17],[520,528,40,17],[518,548,23,15]],{angle:.18,frontage:true});
neighbourhoodLane(neighbourhoodGarden,'overview',5,[[366,192],[410,333],[486,477],[631,449]]);neighbourhoodLane(neighbourhoodGarden,'overview',5,[[453,112],[504,175],[477,277],[482,324],[524,468]]);neighbourhoodLane(neighbourhoodGarden,'overview',5,[[631,144],[670,236]]);
for(const p of [[[386,261],[566,220]],[[402,298],[571,265]],[[421,337],[584,307]],[[454,376],[592,350]],[[474,416],[606,392]],[[488,456],[617,434]]])neighbourhoodLane(neighbourhoodGarden,'overview',4,p);
neighbourhoodLane(neighbourhoodGarden,'overview',5,[[572,487],[593,584],[707,564],[689,467],[572,487]]);neighbourhoodLane(neighbourhoodGarden,'overview',5,[[536,567],[556,625],[709,591]]);
neighbourhoodGreen(neighbourhoodGarden,'garden',[[466,281],[543,268],[604,294],[618,359],[583,409],[515,418],[472,383],[452,330]]);
neighbourhoodLane(neighbourhoodGarden,'garden',2.2,Array.from({length:49},(_,i)=>[540+62*Math.cos(i*Math.PI/24),350+62*Math.sin(i*Math.PI/24)]));
neighbourhoodLane(neighbourhoodGarden,'garden',2,[[480,350],[600,350]]);
neighbourhoodLane(neighbourhoodGarden,'garden',2,[[540,290],[540,410]]);
neighbourhoodGreen(neighbourhoodGarden,'overview',[[540,200],[608,185],[618,209],[554,226]]);
neighbourhoodGreen(neighbourhoodGarden,'overview',[[380,411],[400,402],[421,412],[435,435],[425,456],[403,468],[380,459],[369,438]]);
neighbourhoodLane(neighbourhoodGarden,'overview',2,[[379,409],[400,400],[423,411],[438,435],[428,459],[403,471],[377,462],[366,438],[379,409]]);
const neighbourhoodEastNorth=neighbourhood('C04-10','兴平路两侧 · 兴平家园与光大商住','overview',[[658,0],[757,-15],[897,154],[1198,105],[1252,525],[914,572],[880,450],[771,215]]);
neighbourhoodRoofs(neighbourhoodEastNorth,'overview',6,'residential','#c1b9a8',[[686,50,70,19,.58],[731,100,57,18,.58],[742,151,65,20,.58],[794,204,62,19,.58],[822,250,61,19,.58],[852,300,60,19,.58],[859,347,63,20,.58],[938,414,73,22,.18],[987,487,67,21,.18],[1093,435,76,20,.18],[1160,408,44,19,.18]],{angle:.18,frontage:true});
neighbourhoodRoofs(neighbourhoodEastNorth,'overview',6,'residential','#b6b19e',[[1039,151,147,19],[1057,201,141,20],[1079,256,131,21],[1031,311,47,19],[1096,321,45,19]],{angle:.18});
neighbourhoodRoofs(neighbourhoodEastNorth,'overview',2,'commercial','#b0a58f',[[978,183,57,22],[1002,245,51,20],[1008,363,50,22],[1104,375,127,19],[1168,479,100,19],[1199,501,60,18]],{angle:.18,frontage:true});
neighbourhoodLane(neighbourhoodEastNorth,'overview',5,[[670,8],[775,185],[890,400],[917,440],[1031,414]]);neighbourhoodLane(neighbourhoodEastNorth,'overview',4.5,[[891,160],[1197,110],[1229,477],[1072,503]]);
for(const p of [[[932,192],[1208,146]],[[965,247],[1218,200]],[[994,299],[1227,253]],[[1023,350],[1236,303]],[[1060,406],[1240,370]],[[920,456],[1007,439]],[[937,509],[1036,489]]])neighbourhoodLane(neighbourhoodEastNorth,'overview',4.5,p);
neighbourhoodGreen(neighbourhoodEastNorth,'overview',[[1098,277],[1197,259],[1203,284],[1107,301]]);neighbourhoodGreen(neighbourhoodEastNorth,'overview',[[1069,448],[1164,432],[1168,452],[1075,470]]);
const neighbourhoodEastSouth=neighbourhood('C04-11','医院东侧 · 书林家园和临街商住','east',[[187,81],[717,-31],[1242,-72],[1280,522],[550,675],[403,423]]);
neighbourhoodRoofs(neighbourhoodEastSouth,'east',6,'residential','#bdb39e',[[428,164,146,37],[543,150,84,34],[632,132,75,35],[713,116,65,33],[863,76,121,35],[1038,45,94,35],[1135,22,60,32]],{angle:.2,frontage:true});
neighbourhoodRoofs(neighbourhoodEastSouth,'east',5,'residential','#c3b59a',[[539,426,83,32],[618,411,75,32],[697,392,74,33],[778,378,78,32],[854,359,78,33],[973,333,132,34],[1121,290,125,35],[1226,268,78,33]],{angle:.24});
neighbourhoodRoofs(neighbourhoodEastSouth,'east',5,'residential','#bca58a',[[592,480,99,35],[704,456,99,35],[803,438,91,35],[897,415,60,32],[988,397,114,35],[1178,358,68,35],[1246,340,63,35]],{angle:.24,pitched:true});
neighbourhoodRoofs(neighbourhoodEastSouth,'east',2,'commercial','#b2ad9c',[[406,370,160,28,-1.02],[476,489,116,24,-1.02],[721,549,271,27,.24],[997,486,253,28,.24],[851,569,240,27,.24],[1081,513,145,30,.24]],{frontage:true});
neighbourhoodRoofs(neighbourhoodEastSouth,'east',2,'public','#c1b59d',[[450,267,136,30,.22],[426,310,24,35,.22],[516,303,24,36,.22]],{angle:.22});
neighbourhoodLane(neighbourhoodEastSouth,'east',6,[[293,157],[381,246],[455,393],[524,576],[508,600]]);neighbourhoodLane(neighbourhoodEastSouth,'east',5,[[394,239],[1171,88],[1259,203],[1280,272]]);
neighbourhoodLane(neighbourhoodEastSouth,'east',4,[[739,28],[777,208],[806,333]]);neighbourhoodLane(neighbourhoodEastSouth,'east',4.5,[[480,408],[1269,234]]);
neighbourhoodLane(neighbourhoodEastSouth,'east',5,[[550,548],[1273,384]]);neighbourhoodLane(neighbourhoodEastSouth,'east',5,[[570,609],[1280,448]]);
neighbourhoodLane(neighbourhoodEastSouth,'east',4,[[868,321],[900,391],[1107,343],[1156,458]]);
neighbourhoodGreen(neighbourhoodEastSouth,'east',[[483,251],[737,199],[754,287],[798,304],[802,333],[523,393]]);neighbourhoodLane(neighbourhoodEastSouth,'east',2,Array.from({length:33},(_,i)=>[779+33*Math.cos(i*Math.PI/16),250+33*Math.sin(i*Math.PI/16)]));
neighbourhoodGreen(neighbourhoodEastSouth,'east',[[810,196],[1133,127],[1177,153],[1201,211],[1243,223],[1237,245],[826,331]]);
// Exact shrubs and trees are illustrative. Broad planted areas above follow imagery.
export const westNeighbourRoadClearance=createRoadClearance(civicPublicRoads);
export const westNeighbourOmitted=[];
export const westNeighbourBlocks=neighbourhoodRaw.map(raw=>{
 const origin=westNeighbourImage(raw.frame,640,360),s={...raw,origin,angle:0,checked:'2026-11-26',imageryDate:null,source:westNeighbourSource(raw.frame),boundary:raw.boundary.map(p=>westNeighbourImage(raw.frame,...p)),estimated:true};
 s.query=createRingQuery(s.boundary);s.contextBoundary=s.boundary;
 s.accuracy='固定卫星视图逐排人工判读；屋顶投影不是测绘基底，定位约 5–15 米误差。楼高按形态区分估算，层数、分户门面、树种及铺装细节待实景校核；未把空地虚构成楼房。';
 s.buildings=raw.roofs.map((r,i)=>{const [x,z]=westNeighbourImage(r.frame,r.px,r.py),scale=Math.hypot(...westNeighbourImage(r.frame,r.px+1,r.py).map((v,j)=>v-[x,z][j])),w=r.pw*scale,d=r.pd*scale;
  return {...r,id:`${raw.id}-${i+1}`,name:`${raw.name} · 楼体 ${i+1}`,x,z,u:x-origin[0],v:z-origin[1],w,d,rotation:r.angle,ring:clearanceRect(x,z,w,d,r.angle),levelsEstimateRange:r.levels>=10?[r.levels-3,r.levels+4]:[Math.max(1,r.levels-1),r.levels+1],heightSource:'satellite-morphology-estimate',confidence:.3,estimated:true,footprintEstimated:true,footprintSource:westNeighbourSource(r.frame)};
 });
 s.lanes=raw.lanes.map(l=>({...l,points:l.points.map(p=>westNeighbourImage(l.frame,...p))}));
 for(const k of ['greens','courts'])s[k]=raw[k].map(l=>({...l,ring:l.points.map(p=>westNeighbourImage(l.frame,...p))}));
 s.sports=raw.sports.map(p=>{const scale=Math.hypot(...westNeighbourImage(p.frame,641,360).map((v,i)=>v-westNeighbourImage(p.frame,640,360)[i]));return {...p,center:westNeighbourImage(p.frame,...p.center),w:p.w*scale,d:p.d*scale};});
 s.focus=s.buildings.reduce((p,b)=>[p[0]+b.x/s.buildings.length,p[1]+b.z/s.buildings.length],[0,0]);
 return s;
});
// Explicit exclusion reasons remain inspectable; no silent movement away from roads.
const neighbourhoodAccepted=[];
for(const s of westNeighbourBlocks){s.buildings=s.buildings.filter(b=>{
 let reason=civicSiteIntersects(clearanceRect(b.x,b.z,b.w,b.d,b.angle,1))?'existing-detailed-site':!westNeighbourRoadClearance.clear(clearanceRect(b.x,b.z,b.w,b.d,b.angle,1.2))?'public-road':neighbourhoodAccepted.some(p=>clearancePolygonsOverlap(b.ring,p.ring))?'duplicate-roof':null;
 if(reason){westNeighbourOmitted.push({...b,reason});return false;}b.query=createRingQuery(clearanceRect(b.x,b.z,b.w,b.d,b.angle,2));neighbourhoodAccepted.push(b);return true;
});}
export function isWestNeighbourhood(x,z,pad=0){return westNeighbourBlocks.some(b=>b.query.contains(x,z,pad)||b.buildings.some(p=>Math.abs(x-p.x)<p.w+p.d+pad&&Math.abs(z-p.z)<p.w+p.d+pad&&p.query.contains(x,z,pad)));}
export function westNeighbourIntersects(ring){return westNeighbourBlocks.some(b=>clearancePolygonsOverlap(ring,b.boundary)||b.buildings.some(p=>clearancePolygonsOverlap(ring,p.ring)));}
export const westNeighbourRecords=westNeighbourBlocks.map(s=>({id:s.id,name:s.name,position:s.focus,coordinate:localToGeographic(s.focus),crs:'WGS84',height:12,scale:1,view:[90,120,150],approximate:true,description:'整片住宅、沿街底商、楼间通道和绿化。地图标注“西城新区”，搜索西城小区亦可定位。',accuracy:s.accuracy,sources:[...new Set([s.source,...s.buildings.map(b=>b.footprintSource)])]}));
export const westNeighbourStops=westNeighbourBlocks.map(s=>({name:`${s.name} · 街坊全景`,keywords:`西城小区 西城新区 紫悦城 紫悦宸 政务大厅 人民医院 ${s.name} 街坊 内部 绿化`,address:s.accuracy,eye:[s.focus[0]+80,190,s.focus[1]+190],target:[s.focus[0],0,s.focus[1]]}));
export const westNeighbourDetailBlocks=westNeighbourBlocks.map(s=>({id:s.id,siteId:s.id,name:s.name,region:'C04',boundary:s.boundary,buildings:s.buildings.length,checked:s.checked,sources:westNeighbourRecords.find(r=>r.id===s.id).sources,accuracy:s.accuracy,survey:'satellite-traced',acceptance:'pending-user-review'}));
