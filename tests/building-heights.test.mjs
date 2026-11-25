import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveBuildingHeight,sampleWestBuildingHeight} from '../dist/building-heights.js';
import {westBuildingHeightGrid as grid} from '../dist/west-building-height-data.js';

test('an 18-storey building keeps its recorded height instead of becoming low-rise',()=>{
  const record=resolveBuildingHeight({x:-1600,z:200,w:30,d:15,levels:18,source:'planning-record'});
  assert.equal(record.floors,18);assert.ok(record.height>50);assert.equal(record.source,'planning-record');
  const surveyed=resolveBuildingHeight({x:-1600,z:200,w:30,d:15,height:47.8,levels:15});
  assert.equal(surveyed.height,47.8);assert.equal(surveyed.floors,15);
});
test('old raster evidence does not flatten newer buildings and no-data is explicit',()=>{
  assert.equal(sampleWestBuildingHeight(10000,10000),null);
  const high=resolveBuildingHeight({x:-1600,z:200,w:30,d:15,fallbackFloors:14});
  assert.equal(high.floors,14);assert.ok(high.height>40);
  const missing=resolveBuildingHeight({x:10000,z:10000,w:15,d:10,fallbackFloors:2});
  assert.equal(missing.source,'existing-approximation');assert.equal(missing.rasterHeight,null);
});
test('source raster is sampled in local metre coordinates without a second GCJ shift',()=>{
  assert.equal(grid.values.length,grid.rows);
  assert.ok(grid.values.every(r=>r.length===grid.cols&&r.every(Number.isFinite)));
  for(const [row,col] of [[0,0],[120,230],[370,350]])assert.equal(sampleWestBuildingHeight(grid.x+col*grid.step,grid.z+row*grid.step),grid.values[row][col]/10);
  assert.ok(grid.values.some(row=>row.some(value=>value>150)),'source includes taller roof values, not a constant low-rise height');
});

test('height source priority keeps measured and OSM evidence ahead of estimates',()=>{
  const site={x:-1600,z:200,w:30,d:15,buildingType:'office',knownHeight:52,osmHeight:'34 m',osmLevels:'8',lidar:{height:44,reliable:true}};
  const known=resolveBuildingHeight(site);assert.equal(known.height,52);assert.equal(known.heightSource,'known-height');assert.equal(known.estimated,false);
  const osm=resolveBuildingHeight({...site,knownHeight:null});assert.equal(osm.height,34);assert.equal(osm.heightSource,'OSM:height');
  const levels=resolveBuildingHeight({...site,knownHeight:null,osmHeight:null});assert.equal(levels.levels,8);assert.equal(levels.heightSource,'OSM:building:levels');assert.equal(levels.estimated,true);
  const lidar=resolveBuildingHeight({...site,knownHeight:null,osmHeight:null,osmLevels:null});assert.equal(lidar.height,44);assert.equal(lidar.heightSource,'LiDAR');
  for(const record of [known,osm,levels,lidar])for(const key of ['height','levels','buildingType','heightSource','confidence','estimated'])assert.ok(key in record,key);
});
test('DSM absolute elevation is never mistaken for building height',()=>{
  const site={x:-1600,z:200,w:30,d:15,dsm:{surfaceElevation:780,reliable:true,datum:'same-survey'}};
  assert.ok(resolveBuildingHeight(site).height<80);
  const record=resolveBuildingHeight({...site,dsm:{...site.dsm,groundElevation:750}});
  assert.equal(record.height,30);assert.equal(record.heightSource,'DSM-minus-ground');
  assert.ok(resolveBuildingHeight({...site,osmHeight:'not measured',osmLevels:'unknown'}).estimated);
});
