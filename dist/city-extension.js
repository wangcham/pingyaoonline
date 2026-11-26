import {mapData} from './map-data.js';
import {cityExtensionData} from './city-extension-data.js';
// Keep the original geometry and tuned roads authoritative. New roads are
// surface roads only; bridges/tunnels need an elevation model before rendering.
const extensionRoadKeys=new Set(mapData.roads.map(r=>JSON.stringify(r[3])));
export const cityExtensionRoads=cityExtensionData.roads.filter((r,i)=>{
 const m=cityExtensionData.roadMetadata[i];
 return !extensionRoadKeys.has(JSON.stringify(r[3]))&&(!m.bridge||m.bridge==='no')&&(!m.tunnel||m.tunnel==='no')&&(!m.layer||Number(m.layer)===0);
});
export const citySurfaceRoads=[...mapData.roads,...cityExtensionRoads];
export const cityExperienceBounds=[-5000,-2500,4000,6500];
