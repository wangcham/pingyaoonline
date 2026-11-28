import assert from 'node:assert/strict';
import * as T from 'three';
import {addCivicSite} from '../dist/civic-sites.js';
import {civicSiteSurveys,outletsContextSurvey,civicWorld,civicPublicRoads} from '../dist/civic-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from '../dist/road-clearance.js';
import {createRegionalLayout} from '../dist/regional-survey.js';
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:100})},{get:(o,k)=>o[k]??noop});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),site=addCivicSite(scene,civicSiteSurveys.find(s=>s.id==='outlets')),context=site.context,report=context.root.userData.outletsContext;
assert.ok(report.towers.length>=6&&report.parking.length>50&&report.scooters.length>30&&report.fences.length>10);
const road=createRoadClearance(civicPublicRoads),world=r=>r.map(p=>civicWorld(outletsContextSurvey,...p));
const groups=[report.towers,report.parking,report.scooters].flat().map(p=>p.ring);
for(let i=0;i<groups.length;i++){
 assert.ok(road.clear(world(groups[i])),'building or vehicle crosses public road');
 for(const b of groups.slice(i+1))assert.ok(!clearancePolygonsOverlap(groups[i],b),'context footprints overlap');
}
for(const r of [...report.gardens,...report.fences])assert.ok(![...groups,...report.driveRings].some(p=>clearancePolygonsOverlap(r,p)),'landscaping blocks parking or a drive aisle');
const layout=createRegionalLayout();assert.ok(layout.roofs.every(p=>!clearancePolygonsOverlap(p.ring,outletsContextSurvey.boundary)),'generic district adds duplicate buildings');
let draws=0,triangles=0;context.root.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1);assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));});
assert.ok(draws<100&&triangles<1500000,`${draws} draws / ${triangles} triangles`);
site.setNight(true);assert.ok(context.root.children.some(o=>o.isPointLight&&o.visible));site.setNight(false);assert.ok(context.root.children.filter(o=>o.isPointLight).every(o=>!o.visible));site.dispose();site.dispose();assert.equal(scene.children.length,0);
console.log(JSON.stringify({towers:report.towers.length,parking:report.parking.length,scooters:report.scooters.length,gardens:report.gardens.length,fences:report.fences.length,draws,triangles,collision:'passed',genericDuplicates:'absent',lifecycle:'passed'}));
