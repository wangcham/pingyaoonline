import {westBuildingHeightGrid} from './west-building-height-data.js';

export function sampleWestBuildingHeight(x,z){
  const g=westBuildingHeightGrid,col=Math.round((x-g.x)/g.step),row=Math.round((z-g.z)/g.step);
  if(!Number.isFinite(col)||!Number.isFinite(row)||col<0||col>=g.cols||row<0||row>=g.rows)return null;
  const value=g.values[row][col];return value>=0?value/10:null;
}
function heightNumber(value){
  if(typeof value==='number')return Number.isFinite(value)&&value>0?value:null;
  if(typeof value!=='string')return null;
  const match=value.trim().match(/^(\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet)?$/i);
  if(!match)return null;const n=Number(match[1])*(/^(ft|feet)$/i.test(match[2]||'')?.3048:1);return n>0?n:null;
}
export function resolveBuildingHeight(options){
  const {x,z,w=10,d=10,angle=0,buildingType='residential',fallbackFloors=2,source=null}=options;
  const storey=options.storeyHeight??({commercial:3.28,office:3.35,hotel:3.35,public:3.6,industrial:4.5}[buildingType]??3.05);
  function record(height,levels,heightSource,confidence,estimated,extra={}){
    const count=levels??Math.max(1,Math.round((height-.35)/storey));
    return {height,levels:count,buildingType,heightSource,confidence,estimated,
      floors:Math.max(1,Math.round(count)),source:heightSource,approximate:estimated,...extra};
  }
  const known=heightNumber(options.knownHeight??options.height),osmHeight=heightNumber(options.osmHeight);
  const explicitLevels=heightNumber(options.levels),osmLevels=heightNumber(options.osmLevels);
  if(known)return record(known,explicitLevels,source||'known-height',.95,false);
  if(osmHeight)return record(osmHeight,osmLevels,'OSM:height',.85,false);
  if(osmLevels)return record(osmLevels*storey+.35,osmLevels,'OSM:building:levels',.8,true);
  if(explicitLevels)return record(explicitLevels*storey+.35,explicitLevels,source||'known-levels',.85,true);
  // A DSM is an elevation, not a building height. It needs a co-referenced ground sample.
  const lidar=options.lidar,dsm=options.dsm;
  if(lidar?.reliable&&heightNumber(lidar.height))return record(lidar.height,null,lidar.source||'LiDAR',.9,false,{dataYear:lidar.year??null});
  if(dsm?.reliable&&dsm.datum&&Number.isFinite(dsm.surfaceElevation)&&Number.isFinite(dsm.groundElevation)){
    const h=dsm.surfaceElevation-dsm.groundElevation;
    if(h>0)return record(h,null,dsm.source||'DSM-minus-ground',.75,true,{dataYear:dsm.year??null});
  }
  const fallbackLevels=heightNumber(fallbackFloors)??2;
  const fallback=heightNumber(options.estimatedHeight)??fallbackLevels*storey+.35;
  const samples=[],c=Math.cos(angle),s=Math.sin(angle),nx=Math.max(2,Math.min(80,Math.ceil(w/3))),nz=Math.max(2,Math.min(80,Math.ceil(d/3)));
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const dx=((i+.5)/nx-.5)*w,dz=((j+.5)/nz-.5)*d;
    const value=sampleWestBuildingHeight(x+dx*c+dz*s,z-dx*s+dz*c);
    if(value!==null&&value>=2.5)samples.push(value);
  }
  samples.sort((a,b)=>a-b);
  const estimate=samples.length>=Math.max(4,nx*nz*.25)?samples[Math.floor((samples.length-1)*.85)]:null;
  // GBA is an old image-derived estimate, NOT reliable DSM/LiDAR. Never flatten newer massing.
  const useRaster=estimate!==null&&estimate>fallback;
  return record(useRaster?estimate:fallback,useRaster?null:fallbackLevels,useRaster?'GBA.Height-2019':'existing-approximation',useRaster?.4:.3,true,
    {rasterHeight:estimate,dataYear:useRaster?2019:null});
}

// Preserve individual records even when meshes are instanced for performance.
export function collectBuildingRecords(scene){
  const records=[];scene.traverse(object=>{
    if(object.userData?.buildingRecord)records.push(object.userData.buildingRecord);
    if(object.userData?.heightRecords)records.push(...object.userData.heightRecords);
  });return records;
}
