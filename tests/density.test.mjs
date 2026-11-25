import test from 'node:test';
import assert from 'node:assert/strict';
import {createOldTownLayout,townWorld} from '../dist/old-town-layout.js';
import {mapData} from '../dist/map-data.js';
import {pointInRing} from '../dist/geography.js';
import {isLandmarkParcel} from '../dist/landmarks/data.js';
const plots=createOldTownLayout();
test('dense internal courtyards remain within city and outside landmark footprints',()=>{
  assert.ok(plots.length>1300&&plots.length<2500);
  for(const p of plots)for(const dx of [-p.w/2,0,p.w/2])for(const dz of [-p.d/2,0,p.d/2]){
    const [x,z]=townWorld(p.x+dx,p.z+dz);
    assert.ok(pointInRing(x,z,mapData.wall));assert.equal(isLandmarkParcel(x,z),false);
  }
});
test('large and infill courtyards do not overlap and are reproducible',()=>{
  assert.deepEqual(createOldTownLayout(),plots);
  const sorted=[...plots].sort((a,b)=>a.x-b.x);
  for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].x-sorted[i].x<24;j++){
    const a=sorted[i],b=sorted[j];
    assert.ok(Math.abs(a.x-b.x)>(a.w+b.w)/2+.5||Math.abs(a.z-b.z)>(a.d+b.d)/2+.5,'courtyard overlap');
  }
});
