// Geometry/data admission only. Does not create a renderer or open the experience.
import {writeFileSync} from 'node:fs';
import {qixiangSurvey,qixiangCourts,qixiangSolids,qixiangOmitted,qixiangBoundary,qixiangLaneSurfaces,qixiangPublicClear,qixiangRoofColors} from '../dist/qixiang-block-data.js';
import {clearanceRect,clearancePolygonsOverlap} from '../dist/road-clearance.js';
import {pointInRing} from '../dist/geography.js';
function area(r){return Math.abs(r.reduce((a,p,i)=>{const q=r[(i+1)%r.length];return a+p[0]*q[1]-p[1]*q[0];},0))/2;}
function overlapArea(ring,clip){
 let r=ring;const winding=Math.sign(clip.reduce((a,p,i)=>{const q=clip[(i+1)%clip.length];return a+p[0]*q[1]-p[1]*q[0];},0));
 for(let j=0;j<clip.length;j++){
  const a=clip[j],b=clip[(j+1)%clip.length],n=[],distance=p=>winding*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
  for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length],pd=distance(p),qd=distance(q);if(pd>=0)n.push(p);if((pd>=0)!==(qd>=0)){const t=pd/(pd-qd);n.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
  r=n;if(r.length<3)return 0;
 }return area(r);
}
const routes=[];
for(const [i,p] of qixiangSolids.entries()){
 const parent=qixiangCourts.find(q=>q.id===p.parent);
 if(!qixiangPublicClear(p.ring))throw Error('Mapped road conflict: '+p.id);
 if(!p.ring.every(v=>pointInRing(...v,parent.ring)))throw Error('Roof outside courtyard: '+p.id);
 if(qixiangSolids.slice(i+1).some(q=>clearancePolygonsOverlap(p.ring,q.ring)))throw Error('Roof/eave collision: '+p.id);
 if(qixiangLaneSurfaces.some(l=>overlapArea(l.ring,p.ring)>.0001))throw Error('Roof/lane collision: '+p.id);
}
for(const q of qixiangCourts){
 const main=qixiangSolids.find(p=>p.parent===q.id&&p.role==='main'),a=-q.d/2+main.d+.8,b=q.d/2,v=(a+b)/2,u=q.gateOffset,c=Math.cos(q.angle),s=Math.sin(q.angle),x=q.x+u*c+v*s,z=q.z-u*s+v*c;
 const ring=clearanceRect(x,z,1.4,b-a,q.angle);
 if(qixiangSolids.some(p=>p.parent===q.id&&clearancePolygonsOverlap(p.ring,ring)))throw Error('Blocked gate/door route: '+q.id);
 routes.push({parent:q.id,ring,width:1.4});
}
for(let i=0;i<qixiangLaneSurfaces.length;i++)for(let j=i+1;j<qixiangLaneSurfaces.length;j++)if(overlapArea(qixiangLaneSurfaces[i].ring,qixiangLaneSurfaces[j].ring)>.0001)throw Error('Coplanar lane overlap');
const report={id:qixiangSurvey.id,courts:qixiangCourts.length,buildings:qixiangSolids.length,singleStorey:qixiangSolids.filter(p=>p.levels===1).length,twoStorey:qixiangSolids.filter(p=>p.levels===2).length,areaM2:Math.round(area(qixiangBoundary)),roofEnvelopeAreaM2:Math.round(qixiangSolids.reduce((sum,p)=>sum+area(p.ring),0)),clearGateRoutes:routes.length,laneSurfacePieces:qixiangLaneSurfaces.length,omitted:qixiangOmitted.length,acceptance:'pending-user-review',checks:'numeric geometry admission only; no browser, renderer, interaction or performance test'};
writeFileSync(new URL('../data/C03-01-qixiang-block.json',import.meta.url),JSON.stringify({survey:qixiangSurvey,report,boundary:qixiangBoundary,courts:qixiangCourts,buildings:qixiangSolids,lanes:qixiangLaneSurfaces,gateRoutes:routes,omitted:qixiangOmitted},null,2));
const points=[...qixiangBoundary,...qixiangLaneSurfaces.flatMap(l=>l.ring)],xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),minX=Math.min(...xs),minZ=Math.min(...zs),scale=4.6;
const xy=p=>[(p[0]-minX)*scale+35,(p[1]-minZ)*scale+88],poly=(ring,fill,stroke='none',width=1)=>`<polygon points="${ring.map(p=>xy(p).map(n=>n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="730" viewBox="0 0 1100 730"><rect width="1100" height="730" fill="#eee9dc"/><g font-family="PingFang SC, sans-serif" fill="#35473d"><text x="35" y="33" font-size="22">C03-01 七号巷北侧 · 本次完整细化区块</text><text x="35" y="59" font-size="14">建筑与通路数据示意，非卫星截图 / 非三维渲染 · 北 ↑</text></g>',poly(qixiangBoundary,'#b8b09c')];
for(const q of qixiangCourts)svg.push(poly(q.ring,'#dbd3bf','#a39f90',.5));
for(const p of qixiangLaneSurfaces)svg.push(poly(p.ring,'#999f97'));
for(const p of qixiangSolids)svg.push(poly(clearanceRect(p.x,p.z,p.w,p.d,p.angle),qixiangRoofColors[p.roof],'#4c5b50',.5));
for(const p of routes)svg.push(poly(p.ring,'#eee7d4'));
svg.push(`<g font-family="PingFang SC, sans-serif" fill="#35473d" font-size="15"><text x="35" y="655">${report.courts} 个院落建模单元 · ${report.buildings} 段主房 / 侧房 / 附房 · ${report.clearGateRoutes} 条进院通路</text><text x="35" y="682">院墙、门窗、屋面及生活设施分别建模；户界、层高与摆件为近似，待用户体验验收。</text><text x="35" y="708">这是 C03 的一个子区块，其他区域不标记为达到同样细节。</text></g></svg>`);
writeFileSync(new URL('../data/C03-01-layout.svg',import.meta.url),svg.join('\n'));
console.log(JSON.stringify(report,null,2));
