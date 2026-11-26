import {westNeighbourDetailBlocks} from '../dist/west-neighbourhood-data.js';
import {writeFileSync} from 'node:fs';
import {cityPlanScope,cityPlanRegions,cityPlanTiles,cityPlanAnchors,cityPlanGroups} from '../dist/city-plan-data.js';
import {qixiangSurvey,qixiangBoundary,qixiangCourts,qixiangSolids} from '../dist/qixiang-block-data.js';
import {civicDetailBlocks} from '../dist/civic-sites-data.js';
const data={scope:cityPlanScope,regions:cityPlanRegions,tiles:cityPlanTiles,anchors:cityPlanAnchors,groups:cityPlanGroups,detailedBlocks:[{...qixiangSurvey,boundary:qixiangBoundary,courts:qixiangCourts.length,buildings:qixiangSolids.length},...civicDetailBlocks,...westNeighbourDetailBlocks]};
writeFileSync(new URL('../data/city-region-plan.json',import.meta.url),JSON.stringify(data,null,2));
console.log(`Exported ${cityPlanRegions.length} regions and ${cityPlanTiles.length} fixed survey cells.`);
