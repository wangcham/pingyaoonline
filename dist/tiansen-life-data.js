import {geographicToLocal} from './landmarks/coordinates.js';

// Amap POI coordinates and public place photographs checked 2026-11-28.
// POIs locate the businesses; storefront widths and activity are visual estimates.
export const tiansenRetailFronts=[
 {id:'coffee',name:'星巴克咖啡',english:'STARBUCKS COFFEE',poi:'B0KAROB1S0',coordinate:[112.171192,37.197879],v:-22,width:18,color:'#314d43'},
 {id:'food',name:'麦当劳',english:"McDonald's",poi:'B0FFHF0QY6',coordinate:[112.171286,37.197570],v:6,width:20,color:'#292f2c'},
 {id:'flowers',name:'花·时间',english:'FLOWERS & LIFE',poi:'B0FFJOYLXL',coordinate:[112.171192,37.197460],v:25,width:10,color:'#456444'},
];
export const xinhuaBookstoreSurvey={
 id:'xinhua-pingyao',name:'新华书店（平遥店）',origin:[-1502,900],angle:0,
 coordinate:[112.171400,37.196576],crs:'GCJ-02',address:'上西关街60号',
 poiPosition:geographicToLocal([112.171400,37.196576],'GCJ-02'),
 source:'https://www.amap.com/place/B0FFG4GRCV',checked:'2026-11-28',imageryDate:null,
 // North and northeast elevations follow the rounded corner seen in photos.
 // Satellite roof trace interpreted in GCJ-02, converted to the scene's WGS84 frame.
 boundary:[[-1533.82,880.50],[-1500.91,876.62],[-1491.50,878.20],[-1482.79,881.33],[-1476.20,886.00],[-1471.35,891.76],[-1469.44,910.30],[-1523.80,916.61]],
 contextBoundary:[[-1537,877],[-1501,872],[-1480,877],[-1466,888],[-1464,914],[-1527,920]],
 accuracy:'书店位于田森南侧，隔上西关街面对商场，靠转盘西南侧。弧形红色店招、浅色瓷砖与上层窗参考实景；卫星屋面轮廓、三层体量和门窗分格为约 10–20 米精度的近似，门前陈设为氛围示意。',
};
export const tiansenLifeStops=[
 {name:'新华书店 · 田森对面',keywords:'新华 书店 平遥店 上西关街60号 田森 对面 看书',address:'田森南侧隔街 · 上西关街60号',eye:[-1514,3.2,867.5],target:[-1517,4.7,878.5]},
 {name:'田森 · 沿街生活',keywords:'田森 热闹 商圈 麦当劳 星巴克 花时间 咖啡 花店 逛街',address:'顺城路西侧 · 咖啡、餐饮、花店门面参考地点照片',eye:[-1455,3.1,803],target:[-1480,2.9,783]},
 {name:'田森与新华书店 · 路口全景',keywords:'田森 新华书店 对面 转盘 上西关街',address:'商场北侧、书店南侧，隔街相望',eye:[-1380,73,964],target:[-1497,2,837]},
];
