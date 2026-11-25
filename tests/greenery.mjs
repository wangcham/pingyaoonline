// CPU-only verification; run through the existing Three.js module loader.
import assert from 'node:assert/strict';
import * as T from 'three';
import {planWestGreenery,addWestGreenery} from '../dist/west-greenery.js';
import {mapData} from '../dist/map-data.js';
import {segments,projectOnSegment} from '../dist/geography.js';
import {createTreeBatch} from '../dist/vegetation.js';
import {westGreenSurvey,surveyedWestPark} from '../dist/west-green-survey.js';
const plan=planWestGreenery(),route=segments(mapData.lowerWestRoad);
assert.ok(plan.trees.length>35&&plan.trees.length<130);
assert.ok(plan.beds.length>5);
for(const p of plan.trees){
  assert.ok(p.x>=-1912&&p.x<-1230);
  assert.ok(Math.min(...route.map(s=>projectOnSegment([p.x,p.z],s).distance))>5.9,'tree in roadway');
  assert.ok(Math.abs(p.x+1858)>=16,'school entrance blocked');
  assert.ok(Math.abs(p.x+1888)>=8,'shop entrance blocked');
}
const scene=new T.Scene(),group=addWestGreenery(scene);
let draws=0,triangles=0;
group.traverse(mesh=>{
  if(!mesh.isInstancedMesh)return;
  draws++;
  assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
  const geometry=mesh.geometry;
  triangles+=(geometry.index?.count??geometry.attributes.position.count)/3*mesh.count;
  assert.ok(Array.from(geometry.attributes.position.array).every(Number.isFinite));
  assert.ok(Array.from(geometry.attributes.normal.array).every(Number.isFinite));
  if(mesh.name==='不透明几何叶簇'){
    assert.equal(mesh.material.transparent,false,'avoid sorted foliage flicker');
    assert.ok(geometry.attributes.color,'leaf shading variation');
  }
});
assert.ok(draws<=5,'vegetation must stay batched');
assert.ok(triangles<750000,'street vegetation triangle budget');
assert.equal(westGreenSurvey.treeNodes,0,'do not claim individually surveyed street trees');
assert.ok(surveyedWestPark.length>=4);
assert.deepEqual(surveyedWestPark[0],surveyedWestPark.at(-1),'OSM park boundary must be closed');
// Identical seeds must produce identical meshes; changing viewpoint never rebuilds trees.
function singleTree(){const b=createTreeBatch(new T.Scene());b.tree({x:-1700,z:120,height:7,crown:4});return b.finish();}
const first=singleTree(),second=singleTree();
for(let i=0;i<first.children.length;i++)assert.deepEqual(first.children[i].instanceMatrix.array,second.children[i].instanceMatrix.array);
const bounds=new T.Box3().setFromObject(first);
assert.ok(bounds.min.y>=.4&&bounds.max.y<9,'plausible tree height');
assert.ok(bounds.max.x-bounds.min.x<5.5,'keep crown within street scale');
console.log(JSON.stringify({trees:plan.trees.length,beds:plan.beds.length+2,draws,triangles,osm:westGreenSurvey}));
