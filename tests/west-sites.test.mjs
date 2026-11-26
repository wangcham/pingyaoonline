import test from 'node:test';
import assert from 'node:assert/strict';
import {mapData} from '../dist/map-data.js';
import {pointInRing,segments,projectOnSegment} from '../dist/geography.js';
import {geographicToLocal} from '../dist/landmarks/coordinates.js';
import {tiansenSurvey,thirdSchoolSurvey,tiansenBuildings,thirdSchoolBuildings,thirdSchoolGate,siteToWorld,isWestSiteParcel,westSiteIntersectsRing} from '../dist/west-sites-data.js';

test('Tiansen stands west of Shuncheng and northwest of the mapped roundabout',()=>{
  for(const p of tiansenBuildings){
    const [x,z]=siteToWorld(tiansenSurvey,p.u,p.v);
    assert.ok(x<-1470&&z<875);
    assert.ok(pointInRing(x,z,tiansenSurvey.boundary));
    const roads=mapData.shunchengWays.flatMap(segments);
    for(const du of [-p.w/2,p.w/2])for(const dv of [-p.d/2,p.d/2]){
      const corner=siteToWorld(tiansenSurvey,p.u+du,p.v+dv);
      assert.ok(roads.every(e=>projectOnSegment(corner,e).distance>8),'mall must not occupy the road');
    }
  }
  assert.equal(isWestSiteParcel(-1383,812),false,'do not reserve the old wrong-side mall');
});
test('No. 3 school uses its own GCJ-02 POI and southeast gate, not Pingyao Middle School',()=>{
  const gate=siteToWorld(thirdSchoolSurvey,...thirdSchoolGate),expected=geographicToLocal([112.165798,37.188222],'GCJ-02');
  assert.ok(Math.hypot(gate[0]-expected[0],gate[1]-expected[1])<1e-7);
  assert.ok(thirdSchoolSurvey.origin[0]<-1900&&thirdSchoolSurvey.origin[1]>1600);
  for(const p of thirdSchoolBuildings)for(const du of [-p.w/2,p.w/2])for(const dv of [-p.d/2,p.d/2]){
    const corner=siteToWorld(thirdSchoolSurvey,p.u+du,p.v+dv);
    assert.ok(pointInRing(...corner,thirdSchoolSurvey.boundary),`${p.id} must remain in campus`);
  }
  assert.ok(gate[0]>thirdSchoolSurvey.origin[0]&&gate[1]>thirdSchoolSurvey.origin[1]);
});
test('generic buildings cannot cross either reserved site, even with all corners outside',()=>{
  for(const s of [tiansenSurvey,thirdSchoolSurvey]){
    const [x,z]=s.origin;
    assert.ok(westSiteIntersectsRing([[x-250,z-2],[x+250,z-2],[x+250,z+2],[x-250,z+2]]));
    assert.ok(westSiteIntersectsRing([[x-400,z-400],[x+400,z-400],[x+400,z+400],[x-400,z+400]]));
    assert.equal(westSiteIntersectsRing([[0,0],[1,0],[1,1],[0,1]]),false);
  }
});
