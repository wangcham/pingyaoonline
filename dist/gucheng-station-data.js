import {geographicToLocal} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment} from './geography.js';

export const stationSite={center:[-3374.5090819982133,5481.490794573612],plaza:[-3466.0448282564284,5308.535690413239],angle:.5,width:116,depth:39,height:16.9};
export function stationWorld(u,v){const p=stationSite,c=Math.cos(p.angle),s=Math.sin(p.angle);return [p.center[0]+u*c+v*s,p.center[1]-u*s+v*c];}
export function stationLocal(x,z){const p=stationSite,c=Math.cos(p.angle),s=Math.sin(p.angle),dx=x-p.center[0],dz=z-p.center[1];return [dx*c-dz*s,dx*s+dz*c];}
// Public World Imagery export, 1200 px, EPSG:3857. Photo capture date unknown.
// These traced ground zones are approximate, not cadastral boundaries.
export function guchengImagePoint(u,v){
 const x=12483250.73688793+u*950/1200,y=4461400.2264241045-v*950/1200;
 return geographicToLocal([x/20037508.34*180,Math.atan(Math.sinh(y/20037508.34*Math.PI))*180/Math.PI]);
}
const stationTrace=points=>points.map(p=>guchengImagePoint(...p));
export const stationParking=[
 {id:'west',name:'西侧停车区',ring:stationTrace([[226,799],[337,782],[348,815],[238,844]]),angle:.16},
 {id:'east',name:'东侧停车区',ring:stationTrace([[693,629],[879,471],[910,484],[726,658]]),angle:.70},
 {id:'southwest',name:'站房西侧停车区',ring:stationTrace([[320,883],[366,863],[412,936],[368,962]]),angle:-1.07},
];
export const stationGreenZones=[
 {id:'west-grove',ring:stationTrace([[139,497],[250,425],[303,453],[251,679],[188,750],[137,727]])},
 {id:'east-grove',ring:stationTrace([[648,445],[594,316],[1030,176],[1018,341],[935,415],[679,573]])},
 {id:'west-terrace',ring:stationTrace([[416,836],[472,808],[479,825],[447,859]])},
 {id:'east-terrace',ring:stationTrace([[671,764],[710,729],[751,695],[760,725],[698,783]])},
 {id:'east-garden',ring:stationTrace([[649,621],[675,619],[706,650],[680,707],[648,724],[622,701]])},
 {id:'west-garden',ring:stationTrace([[344,771],[383,763],[435,797],[404,819],[359,807]])},
];
export const stationFieldZones=[
 {id:'rail-south-fields',ring:stationTrace([[439,1124],[1084,758],[1157,868],[758,1199],[376,1199]])},
 {id:'west-fields',ring:stationTrace([[20,754],[155,764],[184,898],[113,1024],[20,1063]])},
];
export function stationDetailedParcel(x,z,pad=0){
 const [u,v]=stationLocal(x,z);
 if(Math.abs(u)<242+pad&&v> -76-pad&&v<65+pad)return true;
 return [...stationParking,...stationGreenZones,...stationFieldZones].some(p=>pointInRing(x,z,p.ring)||pad>0&&segments([...p.ring,p.ring[0]]).some(e=>projectOnSegment([x,z],e).distance<pad));
}
export const stationDetailStops=[
 {name:'平遥古城高铁站 · 站房近景',keywords:'平遥古城站 高铁站 站房 进站 台阶',address:'站名、灰瓦屋顶、双侧高台与入口细节',eye:[...stationWorld(0,-94).slice(0,1),7,stationWorld(0,-94)[1]],target:[stationSite.center[0],10,stationSite.center[1]]},
 {name:'平遥古城高铁站 · 周边全景',keywords:'高铁站 广场 停车场 绿化 站台',address:'站前广场、环路、两侧停车区和站台雨棚',eye:[stationWorld(-210,-320)[0],190,stationWorld(-210,-320)[1]],target:[stationWorld(0,-70)[0],2,stationWorld(0,-70)[1]]},
 {name:'平遥古城高铁站 · 台阶与坡道',keywords:'高铁站 无障碍 坡道 台阶 绿化',address:'站房高台与折返坡道 · 细部按照片近似',eye:[stationWorld(-78,-65)[0],4,stationWorld(-78,-65)[1]],target:[stationWorld(-43,-37)[0],4,stationWorld(-43,-37)[1]]},
];
