import assert from 'node:assert/strict';
import * as T from 'three';
import {addWestFrontages,planWestFrontages} from '../dist/west-corridor.js';
import {addWestStreetExperience,planWestStreetFurniture} from '../dist/west-experience.js';
import {collectBuildingRecords} from '../dist/building-heights.js';
import {westRoadSurfaceHeight} from '../dist/west-terrain.js';
const context={fillRect(){},strokeRect(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const scene=new T.Scene();addWestFrontages(scene,()=>{});
const records=collectBuildingRecords(scene);assert.equal(records.length,planWestFrontages().units.length);
for(const r of records){
  for(const key of ['height','levels','buildingType','heightSource','confidence','estimated'])assert.ok(key in r,key);
  assert.ok(r.height>0&&r.confidence>=0&&r.confidence<=1);assert.equal(r.buildingType,'commercial');
}
const street=addWestStreetExperience(scene),plan=planWestStreetFurniture();assert.ok(plan.lamps.length>15&&plan.lamps.length<60);
for(const p of plan.lamps){assert.equal(p.base,westRoadSurfaceHeight(p.x,p.z));assert.ok(p.x>=-2060&&p.x<=-1240);}
const glow=street.root.getObjectByName('贴地灯光范围'),positions=glow.geometry.attributes.position;
for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-westRoadSurfaceHeight(positions.getX(i),positions.getZ(i))-.025)<.002,'light pool floats off road');
const camera=new T.PerspectiveCamera();camera.position.set(plan.lamps[0].x,plan.lamps[0].base+2,plan.lamps[0].z);
street.setNight(true);street.update(camera,1000);assert.equal(glow.visible,true);
let lights=[];scene.traverse(o=>{if(o.isPointLight)lights.push(o);});assert.equal(lights.length,4);assert.ok(lights.some(l=>l.visible&&l.intensity>0));assert.ok(lights.every(l=>!l.castShadow));
camera.position.y=1000;street.update(camera,1300);assert.ok(lights.every(l=>!l.visible));
street.setNight(false);assert.equal(glow.visible,false);assert.ok(lights.every(l=>!l.visible&&l.intensity===0));
console.log(JSON.stringify({buildingRecords:records.length,lamps:plan.lamps.length,bicycleBays:plan.bikeBays.length,pointLights:lights.length,groundContact:'passed',dayNight:'passed'}));
