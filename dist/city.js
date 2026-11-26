import {westNeighbourStops,isWestNeighbourhood} from './west-neighbourhood-data.js';
import {citySurfaceRoads,cityExperienceBounds} from './city-extension.js';
import {regionalStops,isRegionalBuilding} from './regional-survey.js';
import {qixiangStops} from './qixiang-block-data.js';
import {civicSiteStops} from './civic-sites-data.js';
import {isSouthCityStudy} from './south-city-survey.js';
import {isWestSiteParcel,westSiteSurveys} from './west-sites-data.js';
import {isWestLinkStudy} from './west-link-survey.js';
import {isYingxunPark} from './yingxun-park-data.js';
import {smallSouthGateStop} from './yingxun-park-data.js';
import {attachCityPlanUI} from './city-plan.js';
import * as T from 'three';
import {isPingyaoSchoolParcel,schoolLandmarkRecord,schoolStops,schoolBoundary} from './pingyao-school-data.js';
import {buildCity} from './model.js';
import {mapData} from './map-data.js';
import {westGroundHeight} from './west-terrain.js';
import {streetAtPosition, streetStops} from './street-detail.js';
import {sample, segments} from './geography.js';
import {createDaySky} from './sky.js';
import {stableDepthOptions} from './render-stability.js';
import {collectBuildingRecords} from './building-heights.js';
import {localToGeographic} from './landmarks/coordinates.js';
import {createFlightPointer} from './flight-pointer.js';
import {createLandmarkManager, attachLandmarkUI} from './landmarks/LandmarkManager.js';

const get = id => document.getElementById(id);
const world = get('world');
const renderCanvas=document.createElement('canvas');
const renderContext=renderCanvas.getContext('webgl2',{antialias:true});
const renderer = new T.WebGLRenderer({canvas:renderCanvas,context:renderContext,antialias:true,...stableDepthOptions(renderContext)});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = T.ACESFilmicToneMapping;
world.append(renderer.domElement);
const canvas = renderer.domElement;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(56,1,.25,17500);
camera.rotation.order = 'YXZ';

const sky = new T.HemisphereLight('#d9ebff','#828275',2.2);
const daySky = createDaySky();
const sun = new T.DirectionalLight('#fff8ed',3);
sun.position.set(-210,300,170);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-1300,right:1300,top:1300,bottom:-1300,near:1,far:2500});
sun.shadow.normalBias = .14;
scene.add(sun,sun.target,sky,daySky);
const {lantern,streetLighting,school,westSites,westLink,southCity,regionalCity,guchengStation,qixiangBlock} = await buildCity(scene,{onProgress:label=>{get('start').textContent=label;}});
const landmarkManager = createLandmarkManager(scene,{onChange:()=>{renderer.shadowMap.needsUpdate=true;}});
landmarkManager.loadAll();
landmarkManager.registerExternal(schoolLandmarkRecord,school.root,school.dispose);
for(const site of westSites)landmarkManager.registerExternal(site.record,site.root,site.dispose);
const buildingRecords=collectBuildingRecords(scene).map(record=>({...record,coordinate:localToGeographic([record.x,record.z]),crs:'WGS84'}));
get('building-data-summary').textContent=`已记录 ${buildingRecords.length} 栋/处建筑的高度、层数、类型和来源；其中 ${buildingRecords.filter(r=>r.estimated).length} 处高度为估算。商铺分户不等同于独立建筑测绘。`;
get('building-data-export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({project:'平遥online',scope:'平遥城区与古城站连接片区；包含卫星判读与估算建筑',records:buildingRecords},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='平遥建筑数据.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

let isNight = false;
function lighting() {
  const horizon = isNight ? '#29374a' : '#cae9ff';
  daySky.visible = !isNight;
  scene.background = new T.Color(horizon);
  scene.fog = new T.FogExp2(horizon,.00017);
  sky.color.set(isNight ? '#93aed9' : '#d9ebff');
  sky.intensity = isNight ? 1.2 : 2.2;
  sun.color.set(isNight ? '#97b7fa' : '#fff8ed');
  sun.intensity = isNight ? .7 : 2.8;
  lantern?.emissive.set(isNight ? '#ff982f' : '#000000');
  if (lantern) lantern.emissiveIntensity = 3.4;
  streetLighting.setNight(isNight);
  school.setNight(isNight);
  westSites.forEach(site=>site.setNight(isNight));
  westLink.setNight(isNight);
  southCity.setNight(isNight);
  regionalCity.setNight(isNight);guchengStation.setNight(isNight);
  qixiangBlock.setNight(isNight);
  renderer.shadowMap.needsUpdate = true;
}
lighting();
let regionalStatusKey='';
function updateRegionalStatus(){
  const {ready,total,failed}=regionalCity.status,key=`${ready}:${failed}`;if(key===regionalStatusKey)return;regionalStatusKey=key;
  get('region-status').hidden=ready===total;
  get('region-status').textContent=failed?'部分街区细节尚未载入，可重试。':`已可开始体验，其他街区细节载入中（${ready}/${total}）。`;
  get('region-retry').hidden=failed===0;
}
get('region-retry').addEventListener('click',()=>{regionalCity.retryFailed();updateRegionalStatus();});
updateRegionalStatus();

const motionKeys = new Set(['KeyW','KeyA','KeyS','KeyD','Space','KeyQ','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
const keys = new Set();
const touch = matchMedia('(pointer:coarse)');
let flying = false;
let selectedStreetStop = null;
let pitch = 0;
let yaw = 0;
function look() {
  camera.rotation.set(pitch,yaw,0,'YXZ');
}
function aimAt(x,y,z) {
  camera.lookAt(x,y,z);
  yaw = camera.rotation.y;
  pitch = camera.rotation.x;
  look();
}
function aimFromStreet(eye,target) {
  const [x,height,z]=eye, [tx,ty,tz]=target;
  camera.position.set(x,height+westGroundHeight(x,z),z);
  aimAt(tx,ty+westGroundHeight(tx,tz),tz);
}
function streetLevelView() {
  aimFromStreet([-1875,1.68,128.7],[-1872,2.55,150]);
}
function aerialView() {
  camera.position.set(2050,2680,3180);
  aimAt(0,0,0);
}
streetLevelView();
function setFlying(active) {
  flying = active;
  if (!active) selectedStreetStop = null;
  document.body.classList.toggle('flying',active);
  get('intro').hidden = active;
  get('instruments').hidden = !active;
  get('touch').hidden = !active || !touch.matches;
  if (!active) get('street-location').hidden=true;
  get('start').textContent = '继续体验';
  keys.clear();
  get('help').textContent = touch.matches
    ? (active ? '拖动场景转头 · 按住方向键移动' : '拖动转头 · 使用屏幕方向键')
    : (active ? '移动鼠标转头 · WASD 移动 · 空格 / Q 升降 · Shift 加速 · Esc 释放鼠标' : '点击场景进入 · WASD 移动 · 空格 / Q 升降 · Esc 释放鼠标');
}
function pause() {
  if (!flying) return;
  setFlying(false);
  flightPointer.release();
}
function turn(x,y) {
  yaw -= x*.003;
  pitch = T.MathUtils.clamp(pitch-y*.003,-1.54,1.54);
  look();
}
const flightPointer=createFlightPointer({canvas,isTouch:()=>touch.matches,onStart:()=>setFlying(true),onPause:()=>setFlying(false),onTurn:turn,
  onError(message){get('help').textContent=message;},
  onMode(mode){
    document.body.classList.toggle('mouse-look',mode==='locked');
    get('capture-retry').hidden=mode!=='compatible';
    if(mode==='pending')get('help').textContent='已进入体验 · 正在请求鼠标锁定 · WASD 移动 · Esc 退出';
    if(mode==='locked')get('help').textContent='移动鼠标转头 · WASD 移动 · 空格 / Q 升降 · Shift 加速 · Esc 退出体验';
  },
});
function startFlying() {flightPointer.start();}
get('start').addEventListener('click',startFlying);
get('capture-retry').addEventListener('click',()=>flightPointer.requestCapture());
window.addEventListener('keydown',event => {
  if (event.code==='Escape') pause();
  if (!flying || !motionKeys.has(event.code)) return;
  if (event.code==='Space' && event.target.closest?.('button') && event.target!==get('start')) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('#touch button').forEach(button => {
  button.addEventListener('pointerdown',event=>{
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
  });
  button.addEventListener('lostpointercapture',()=>keys.delete(button.dataset.key));
});

get('night').addEventListener('click',({currentTarget})=>{
  isNight = !isNight;
  currentTarget.textContent = isNight ? '☀ 日景' : '☾ 夜景';
  currentTarget.setAttribute('aria-pressed',String(isNight));
  lighting();
});
get('overview').addEventListener('click',()=>{
  pause();
  aerialView();
  get('start').textContent = '开始体验';
});
get('sources').addEventListener('click',pause);
const streetNameAt = streetAtPosition();
const streetDialog = get('street-dialog');
const query = get('street-query');
const results = get('street-results');
const normalizeStreet = value => value.toLowerCase().replace(/[\s·×（）()]/g,'');
const allStreetStops=[...streetStops,...civicSiteStops,...westNeighbourStops,...regionalStops];
const searchableRoads = new Map();
for (const [, , name, points] of citySurfaceRoads) {
  if (!name || allStreetStops.some(stop=>stop.name===name)) continue;
  const road = segments(points).reduce((longest,line)=>!longest||line.length>longest.length?line:longest,null);
  if (!road || (searchableRoads.get(name)?.length ?? 0)>=road.length) continue;
  const [x,z] = sample(road,.42), [tx,tz] = sample(road,.65);
  searchableRoads.set(name,{name,keywords:'',address:'道路位置来自地图',eye:[x,7,z],target:[tx,6,tz],length:road.length});
}
const streetRecords = [...allStreetStops,...searchableRoads.values()];
function visitStreet(stop) {
  streetDialog.close();
  selectedStreetStop=stop.length ? null : stop;
  aimFromStreet(stop.eye,stop.target);
  startFlying();
}
function showStreetResults() {
  const term = normalizeStreet(query.value);
  const lookup = new URL('https://www.amap.com/ssr/embed/search');
  lookup.searchParams.set('city','140728');
  lookup.searchParams.set('keyword',query.value.trim() || '景林江米油糕');
  get('amap-lookup').href=lookup.href;
  const isRoadGuide = term === '顺城路全线';
  const found = term
    ? streetRecords.filter(stop=>normalizeStreet(stop.name+stop.keywords).includes(term)).slice(0,isRoadGuide?24:12)
    : allStreetStops.filter(stop=>stop.keywords!=='下西关街商户');
  results.replaceChildren();
  if (!found.length) results.textContent='地图里暂时没有这个名字。';
  for (const stop of found) {
    const choice=document.createElement('button');
    const name=document.createElement('strong');
    const address=document.createElement('small');
    name.textContent=stop.name;
    address.textContent=stop.address;
    choice.append(name,address);
    choice.addEventListener('click',()=>visitStreet(stop));
    results.append(choice);
  }
}
function openStreetSearch(initial='') {
  pause();
  if(!streetDialog.open) streetDialog.showModal();
  query.value=initial;
  showStreetResults();
  query.focus();
}
get('street-open').disabled=false;
get('street-open').addEventListener('click',()=>openStreetSearch());
get('qixiang-entry').addEventListener('click',()=>visitStreet(qixiangStops[0]));
get('qixiang-overview').addEventListener('click',()=>visitStreet(qixiangStops[1]));
get('west-neighbourhood').addEventListener('click',()=>visitStreet(westNeighbourStops[0]));
for(const [i,id] of ['hospital','outlets','government','ziyuechen'].entries())get(`civic-${id}`).addEventListener('click',()=>visitStreet(civicSiteStops[i*2]));
get('shuncheng-guide').addEventListener('click',()=>openStreetSearch('顺城路全线'));
get('street-search').addEventListener('submit',event=>{
  event.preventDefault();
  showStreetResults();
});
query.addEventListener('input',showStreetResults);
attachCityPlanUI({pause,visitSmallSouth:()=>visitStreet(smallSouthGateStop),visitQixiang:()=>visitStreet(qixiangStops[1]),visitCivic:index=>visitStreet(civicSiteStops[index*2+1]),visitNeighbour:index=>visitStreet(westNeighbourStops[index])});

const landmarkUI = attachLandmarkUI({manager:landmarkManager,camera,canvas,world,pause,
  visit(record) {
    const [x,z]=record.position,[dx,dy,dz]=record.view;
    aimFromStreet([x+dx,dy,z+dz],[x,record.height*.4,z]);
    startFlying();
  },
});

function resize() {
  const {clientWidth:w,clientHeight:h} = world;
  renderer.setSize(w,h,false);
  camera.aspect = w/Math.max(h,1);
  camera.fov = camera.aspect<.85 ? 68 : 56;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(world);
resize();

const directions = ['北','东北','东','东南','南','西南','西','西北'];
const movement = new T.Vector3();
const [west,north,east,south] = cityExperienceBounds;
const minimap = get('minimap');
const mapContext = minimap.getContext('2d');
const mapBackground = document.createElement('canvas');
mapBackground.width = minimap.width;
mapBackground.height = minimap.height;
const background = mapBackground.getContext('2d');
const mapPoint = (x,z) => [8+(x-west)/(east-west)*144,8+(z-north)/(south-north)*144];
function mapLine(points,color,width) {
  background.beginPath();
  points.forEach(([x,z],index) => background[index ? 'lineTo' : 'moveTo'](...mapPoint(x,z)));
  background.strokeStyle=color;
  background.lineWidth=width;
  background.stroke();
}
background.fillStyle='#26332b';
background.fillRect(0,0,160,160);
for (const [,width,,points] of citySurfaceRoads) mapLine(points,width>=7?'#a9a58b':'#58675a',width>=7?1:.55);
for (const route of mapData.shunchengWays) mapLine(route,'#e7dac0',1.2);
mapLine(mapData.wall,'#e5ba80',1.6);
mapLine(schoolBoundary,'#c6d7d2',1.1);
for(const site of westSiteSurveys)mapLine([...site.boundary,site.boundary[0]],'#c6d7d2',1.1);
background.fillStyle='#f4e4c8';
background.font='12px system-ui';
background.fillText('北',140,15);

function updateMap() {
  const [x,z] = mapPoint(camera.position.x,camera.position.z);
  mapContext.drawImage(mapBackground,0,0);
  mapContext.save();
  mapContext.translate(Math.min(154,Math.max(6,x)),Math.min(154,Math.max(6,z)));
  mapContext.rotate(-yaw);
  mapContext.beginPath();
  mapContext.moveTo(0,-6);
  mapContext.lineTo(4,4);
  mapContext.lineTo(-4,4);
  mapContext.closePath();
  mapContext.fillStyle='#fff0b1';
  mapContext.fill();
  mapContext.restore();
}
let shadowRegion='';
function updateStreetShadow(){
  const {x,y,z}=camera.position;
  const close=((x>-2110&&x<-1190&&z>0&&z<230)||isPingyaoSchoolParcel(x,z,30)||isWestNeighbourhood(x,z,30)||isWestSiteParcel(x,z,30)||isWestLinkStudy(x,z)||isYingxunPark(x,z)||isSouthCityStudy(x,z)||isRegionalBuilding(x,z,60))&&y-westGroundHeight(x,z)<150;
  const cx=close?Math.round(x/64)*64:0,cz=close?Math.round(z/64)*64:0,key=`${close}:${cx}:${cz}`;
  if(key===shadowRegion)return;shadowRegion=key;
  const ground=close?westGroundHeight(cx,cz):0,radius=close?260:1300;
  sun.target.position.set(cx,ground,cz);sun.position.set(cx-210,ground+300,cz+170);
  Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius});sun.shadow.camera.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate=true;
}
let lastFrame = performance.now();
function render(now) {
  const dt = Math.min((now-lastFrame)/1000,.05);
  lastFrame = now;
  if (flying) {
    const axis = (positive,negative) => Number(keys.has(positive))-Number(keys.has(negative));
    turn(axis('ArrowRight','ArrowLeft')*520*dt,axis('ArrowDown','ArrowUp')*480*dt);
    movement.set(axis('KeyD','KeyA'),axis('Space','KeyQ'),-axis('KeyW','KeyS'));
    movement.applyAxisAngle(T.Object3D.DEFAULT_UP,yaw).normalize();
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const previousGround=westGroundHeight(camera.position.x,camera.position.z);
    const previousAltitude=camera.position.y-previousGround;
    const speed = boost ? 255 : T.MathUtils.clamp(8+previousAltitude*.42,8,103);
    camera.position.addScaledVector(movement,speed*dt);
    camera.position.clamp(minBounds,maxBounds);
    const ground=westGroundHeight(camera.position.x,camera.position.z);
    const altitude=T.MathUtils.clamp(previousAltitude+movement.y*speed*dt,1.65,maxBounds.y);
    camera.position.y=ground+altitude;
    get('altitude').textContent = altitude.toFixed(1);
    get('compass').textContent = directions[(Math.round(-yaw/(Math.PI/4))%8+8)%8];
    updateMap();
    const {x,z}=camera.position;
    const y=altitude;
    const stopDistance = stop => Math.hypot(x-stop.eye[0],z-stop.eye[2]);
    if (selectedStreetStop && stopDistance(selectedStreetStop)>55) selectedStreetStop=null;
    const nearby = y < 85 ? allStreetStops.filter(stop=>stopDistance(stop)<33) : [];
    const localStop = y < 85 && (selectedStreetStop ||
      nearby.reduce((closest,stop)=>!closest||stopDistance(stop)<stopDistance(closest)?stop:closest,null));
    const label = y < 120 && (localStop?.name || streetNameAt(x,z));
    get('street-location').hidden = !label;
    if (label) {
      get('street-name').textContent = label;
      get('street-note').textContent = localStop?.address || '';
    }
  }
  daySky.position.copy(camera.position);
  landmarkUI.update(now);
  streetLighting.update(camera,now);
  school.update(camera,now);
  westSites.forEach(site=>site.update(camera,now));
  if(regionalCity.update(camera,now))renderer.shadowMap.needsUpdate=true;
  updateRegionalStatus();
  if(qixiangBlock.update(camera))renderer.shadowMap.needsUpdate=true;
  updateStreetShadow();
  renderer.render(scene,camera);
}
const minBounds=new T.Vector3(west-220,1.65,north-220), maxBounds=new T.Vector3(east+220,3600,south+750);
renderer.setAnimationLoop(render);
get('start').disabled = false;
get('start').textContent = '开始体验';
