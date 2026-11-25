import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geographicToLocal,localToGeographic,wgs84ToGcj02,gcj02ToWgs84} from '../dist/landmarks/coordinates.js';
import {landmarkRecords,isLandmarkParcel} from '../dist/landmarks/data.js';
import {landmarkSurvey} from '../dist/landmarks/survey.js';
import {mapData} from '../dist/map-data.js';
import {pointInRing} from '../dist/geography.js';

test('coordinate origin, handedness, standard GCJ fixture and inverse',()=>{
  assert.deepEqual(geographicToLocal([112.1815,37.204]),[0,0]);
  assert.ok(geographicToLocal([112.182,37.205])[0]>0);
  assert.ok(geographicToLocal([112.182,37.205])[1]<0);
  const gcj=wgs84ToGcj02(116.404,39.915);
  assert.ok(Math.abs(gcj[0]-116.41024449916938)<1e-8);
  assert.ok(Math.abs(gcj[1]-39.91640428150164)<1e-8);
  for(const record of landmarkRecords){
    const xy=geographicToLocal(wgs84ToGcj02(...record.coordinate),'GCJ-02');
    assert.ok(Math.hypot(xy[0]-record.position[0],xy[1]-record.position[1])<.01);
    assert.ok(localToGeographic(xy).every((n,i)=>Math.abs(n-record.coordinate[i])<1e-7));
  }
  assert.deepEqual(gcj02ToWgs84(0,0),[0,0]);
  assert.throws(()=>geographicToLocal([112,37],'BD09'));
  assert.throws(()=>geographicToLocal([NaN,37]));
});
test('OSM tower footprint exactly matches the existing map projection',()=>{
  const mapped=mapData.buildings.find(([name])=>name==='市楼')[2];
  landmarkSurvey.tower.ring.map(p=>geographicToLocal(p)).forEach((p,i)=>p.forEach((v,j)=>assert.ok(Math.abs(v-mapped[i][j])<=.051)));
});
test('core monuments lie inside the surveyed city and reserve their parcels',()=>{
  assert.equal(landmarkRecords.length,5);
  for(const r of landmarkRecords.filter(r=>r.id!=='wall')) {
    assert.ok(pointInRing(...r.position,mapData.wall),r.id);
    assert.ok(isLandmarkParcel(...r.position),r.id);
    assert.ok(r.ring.every(p=>pointInRing(...p,mapData.wall)),r.id+' footprint outside walls');
    assert.ok(r.approximate&&r.sources.length>=2&&r.accuracy);
  }
  assert.equal(isLandmarkParcel(-1900,100),false,'must not reserve western modern district');
  assert.ok(mapData.wall.length>300,'retain detailed bastion / irregular south wall outline');
  assert.equal(mapData.gates.length,6);
});
test('landmark manager is integrated in both module and standalone build paths',()=>{
  const city=readFileSync(new URL('../dist/city.js',import.meta.url),'utf8');
  const build=readFileSync(new URL('../scripts/build_standalone.py',import.meta.url),'utf8');
  assert.ok(city.includes('landmarkManager.loadAll()'));
  assert.ok(city.includes('landmarkUI.update(now)'));
  for(const file of ['coordinates','survey','data','architecture','PingyaoCityWall','PingyaoBellTower','Rishengchang','PingyaoCountyYamen','PingyaoConfucianTemple','LandmarkManager'])assert.ok(build.includes(`landmarks/${file}.js`));
});
