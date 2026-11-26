import test from 'node:test';
import assert from 'node:assert/strict';
import {cityPlanRegions,cityPlanTiles,cityPlanAnchors,cityRegionAt,cityPlanTileId} from '../dist/city-plan-data.js';
import {geographicToLocal} from '../dist/landmarks/coordinates.js';
import {mapData} from '../dist/map-data.js';

test('25 work areas cover all five named anchors including the high-speed station',()=>{
  assert.equal(cityPlanRegions.length,25);
  const expected=['C01','B02','C04','D02','G03'];
  cityPlanAnchors.forEach((a,i)=>assert.equal(cityRegionAt(...a.position),expected[i],a.name));
  const station=cityPlanAnchors.at(-1).position;
  assert.ok(station[0]<mapData.bounds[0]&&station[1]>mapData.bounds[3],'new plan must not pretend the station is already inside the old model');
  for(const r of cityPlanRegions){assert.ok(cityPlanTiles.some(t=>t.regions.includes(r.id)),r.id);assert.equal(r.stages.acceptance,'pending');}
});
test('500 m tile IDs and coordinate export are unique and do not claim full survey completion',()=>{
  assert.equal(cityPlanTiles.length,294);assert.equal(new Set(cityPlanTiles.map(t=>t.id)).size,294);
  for(const tile of cityPlanTiles){
    const [x,z,r,b]=tile.boundsLocal;assert.equal(r-x,500);assert.equal(b-z,500);
    assert.equal(cityPlanTileId(x+250,z+250),tile.id);
    const actual=geographicToLocal(tile.center);assert.ok(Math.hypot(actual[0]-x-250,actual[1]-z-250)<1e-6);
    assert.equal(tile.survey,'pending');assert.equal(tile.acceptance,'pending');assert.ok(tile.satelliteURL.startsWith('https://www.amap.com/ssr/embed/view?'));
  }
  assert.notEqual(cityPlanTileId(-.01,0),cityPlanTileId(.01,0),'negative grid coordinates must not collapse');
});
