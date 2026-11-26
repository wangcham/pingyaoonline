import test from 'node:test';
import assert from 'node:assert/strict';
import {clearanceRect,createRoadClearance,roadAdjustedFootprint,buildingRoadClearance} from '../dist/road-clearance.js';

test('road collision checks detect crossing with no road endpoint or building corner inside',()=>{
  const check=createRoadClearance([['residential',6,'test',[[-100,0],[100,0]]]]);
  assert.equal(check.clear(clearanceRect(0,0,12,30,.3)),false);
  assert.equal(check.clear(clearanceRect(0,30,10,10)),true);
  const elevated=createRoadClearance([['motorway',12,'bridge',[[-100,0],[100,0]]]]);
  assert.equal(elevated.clear(clearanceRect(0,0,10,10)),true,'no unsupported claim about bridge/building height collisions');
});
test('three known approximate commercial corners retract to road edges while retaining most massing',()=>{
  const area=r=>Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  for(const p of [[-1565,-10,35,39],[-1575,69,52,32],[-1511,75,27,28]]){
    const ring=clearanceRect(...p),fixed=roadAdjustedFootprint(ring,p.slice(0,2));
    assert.ok(!buildingRoadClearance.clear(ring));assert.ok(fixed&&buildingRoadClearance.clear(fixed));
    assert.ok(area(fixed)/area(ring)>.7,'do not uniformly shrink or relocate the building');
    assert.ok(fixed.some(v=>ring.some(q=>Math.hypot(v[0]-q[0],v[1]-q[1])<.01)),'land-side vertices remain fixed');
  }
});
