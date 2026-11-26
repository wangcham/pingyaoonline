// Data export + geometric admission audit; no renderer, browser or interaction tests.
import {writeFileSync} from 'node:fs';
import {createRegionalLayout,regionalFrames,regionalSurvey,regionalAlleys,regionalOpenGround,guchengStationSurvey,regionalClearanceRoads} from '../dist/regional-survey.js';
import {cityRegionAt,cityPlanTileId} from '../dist/city-plan-data.js';
import {cityExtensionRoads} from '../dist/city-extension.js';
import {resolveBuildingHeight} from '../dist/building-heights.js';
import {createRoadClearance,clearanceRect} from '../dist/road-clearance.js';
const layout=createRegionalLayout(),regions={},tiles={},classes={},records=[];
const barrier=createRoadClearance(regionalClearanceRoads.map(r=>['trunk','trunk_link','motorway','motorway_link','footway','path','pedestrian','steps','cycleway'].includes(r[0])?['primary',...r.slice(1)]:r));
for(const p of layout.roofs){
 if(!barrier.clear(clearanceRect(p.x,p.z,p.w,p.d,p.angle,1.5)))throw new Error(`Road envelope conflict: ${p.id}`);
 const h=resolveBuildingHeight({...p,buildingType:p.kind==='lowrise'?'residential':p.kind==='shed'?'industrial':p.kind,fallbackFloors:p.levels,useRasterHeight:false});
 const id=cityRegionAt(p.x,p.z),tile=cityPlanTileId(p.x,p.z),heightClass=h.levels<=1?'single-storey':h.levels<=3?'low-rise':h.levels<=7?'multi-storey':'high-rise';
 regions[id]??={buildings:0,classes:{},survey:'partial',acceptance:'pending'};regions[id].buildings++;regions[id].classes[heightClass]=(regions[id].classes[heightClass]||0)+1;tiles[tile]=(tiles[tile]||0)+1;classes[heightClass]=(classes[heightClass]||0)+1;
 records.push({...p,...h,heightSource:'satellite-morphology-estimate',confidence:p.levels>=10?.25:.3,estimated:true,heightClass,region:id,tile,levelsEstimateRange:p.levelsEstimateRange});
}
const progress={checked:'2026-11-26',frames:regionalFrames.length,buildings:records.length,classes,regions,tiles,roadWays:cityExtensionRoads.length,alleyTraces:regionalAlleys.length,groundPolygons:regionalOpenGround.length,complete:false};
writeFileSync(new URL('../data/regional-building-register.json',import.meta.url),JSON.stringify({survey:regionalSurvey,progress,station:guchengStationSurvey,records,omitted:layout.omitted},null,2));
writeFileSync(new URL('../dist/city-survey-progress.js',import.meta.url),'export const citySurveyProgress='+JSON.stringify(progress)+';\n');
console.log(JSON.stringify(progress));
