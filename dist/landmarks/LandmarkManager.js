import * as T from 'three';
import {stableDetailVisibility} from '../render-stability.js';
import {landmarkRecords} from './data.js';
import {createHeritageMaterials} from './architecture.js';
import {createPingyaoCityWall} from './PingyaoCityWall.js';
import {createPingyaoBellTower} from './PingyaoBellTower.js';
import {createRishengchang} from './Rishengchang.js';
import {createPingyaoCountyYamen} from './PingyaoCountyYamen.js';
import {createPingyaoConfucianTemple} from './PingyaoConfucianTemple.js';

export function createLandmarkManager(scene,{onChange=()=>{}}={}) {
  const materials=createHeritageMaterials(),entries=new Map(),raycaster=new T.Raycaster();
  for(const key of ['tile','green','gold'])materials[key].side=T.DoubleSide;
  const factories={wall:createPingyaoCityWall,tower:createPingyaoBellTower,rishengchang:createRishengchang,yamen:createPingyaoCountyYamen,temple:createPingyaoConfucianTemple};
  let disposed=false;
  function load(id) {
    if(disposed)throw new Error('LandmarkManager is disposed');
    if(entries.has(id))return entries.get(id);
    const record=landmarkRecords.find(r=>r.id===id);
    if(!record)throw new Error(`Unknown landmark: ${id}`);
    const object=factories[id](materials,record);object.name=record.name;
    if(id!=='wall'){object.position.set(record.position[0],0,record.position[1]);object.rotation.y=record.rotation;}
    object.scale.setScalar(record.scale);object.traverse(child=>{child.userData.landmarkId=id;});
    scene.add(object);object.updateMatrixWorld(true);
    const entry={record,object};entries.set(id,entry);onChange();return entry;
  }
  function unload(id) {
    const entry=entries.get(id);if(!entry)return;
    if(entry.dispose)entry.dispose();
    else {entry.object.removeFromParent();entry.object.traverse(child=>child.geometry?.dispose());}
    entries.delete(id);onChange();
  }
  function update(camera) {
    for(const {record,object} of entries.values()) {
      const distance=Math.hypot(camera.position.x-record.position[0],camera.position.z-record.position[1],camera.position.y);
      // Separate entry/exit distances prevent toggling repeatedly near one threshold.
      const detail=object.userData.detail;
      if(!detail)continue;
      detail.visible=record.id==='wall'
        ?stableDetailVisibility(detail.visible,camera.position.y,160,200)
        :stableDetailVisibility(detail.visible,distance,235,285);
    }
  }
  function pick(camera,ndc) {
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(ndc,camera);
    // Include the existing city in the raycast, so buildings behind it cannot be selected.
    const hits=raycaster.intersectObjects(scene.children,true);
    const hit=hits.find(({object})=>{
      if(!object.isMesh || object.name==='sky')return false;
      for(let node=object;node;node=node.parent)if(!node.visible)return false;
      return true;
    });
    return hit?entries.get(hit.object.userData.landmarkId)?.record:null;
  }
  function dispose() {
    for(const id of [...entries.keys()])unload(id);
    const textures=new Set();
    for(const material of Object.values(materials)){if(material.map)textures.add(material.map);if(material.bumpMap)textures.add(material.bumpMap);material.dispose();}
    textures.forEach(texture=>texture.dispose());disposed=true;
  }
  function registerExternal(record,object,release){
    if(disposed)throw new Error('LandmarkManager is disposed');
    if(entries.has(record.id))throw new Error(`Duplicate landmark: ${record.id}`);
    object.traverse(child=>{child.userData.landmarkId=record.id;});object.updateMatrixWorld(true);
    entries.set(record.id,{record,object,dispose:release});onChange();
  }
  return {entries,load,unload,update,pick,dispose,registerExternal,loadAll(){landmarkRecords.forEach(r=>load(r.id));}};
}

export function attachLandmarkUI({manager,camera,canvas,world,pause,visit}) {
  const layer=document.createElement('div');layer.id='landmark-labels';world.append(layer);
  const dialog=document.getElementById('landmark-dialog'),list=document.getElementById('landmark-list');
  const card=document.getElementById('landmark-card'),title=document.getElementById('landmark-title');
  let selected=null,down=null,lastUpdate=-Infinity;
  const labels=[],projection=new T.Vector3(),viewPosition=new T.Vector3();
  const flightInfo=document.createElement('aside');flightInfo.id='flight-landmark-info';flightInfo.hidden=true;world.append(flightInfo);
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)flightInfo.hidden=true;});
  function show(record) {
    if(document.pointerLockElement===canvas){
      flightInfo.textContent=record.name+' · '+record.description+'（近似复原；Esc 退出体验后可查看详细资料）';
      flightInfo.hidden=false;return;
    }
    selected=record;title.textContent=record.name;card.hidden=false;
    document.getElementById('landmark-description').textContent=record.description;
    document.getElementById('landmark-accuracy').textContent='近似复原 · '+record.accuracy;
    const coordinate=document.getElementById('landmark-coordinate');
    coordinate.textContent=`WGS84 经纬度：${record.coordinate.map(n=>n.toFixed(6)+'°').join(', ')} · 模型单位：米`;
    const sources=document.getElementById('landmark-sources');sources.replaceChildren();
    record.sources.forEach((url,index)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=`资料 ${index+1}`;sources.append(a);});
    pause();if(!dialog.open)dialog.showModal();
  }
  for(const {record} of manager.entries.values()) {
    const label=document.createElement('button');label.className='landmark-label';label.textContent=record.name;
    label.setAttribute('aria-label',`查看${record.name}介绍`);label.addEventListener('click',()=>show(record));layer.append(label);labels.push({record,label});
    const button=document.createElement('button');button.textContent=record.name;button.addEventListener('click',()=>show(record));list.append(button);
  }
  const open=document.getElementById('landmark-open');open.disabled=false;
  open.addEventListener('click',()=>{pause();card.hidden=true;title.textContent='城市地标';if(!dialog.open)dialog.showModal();});
  document.getElementById('landmark-visit').addEventListener('click',()=>{if(selected){dialog.close();visit(selected);}});
  const toggle=document.getElementById('landmark-label-toggle');
  toggle.addEventListener('change',()=>{layer.hidden=!toggle.checked;});
  canvas.addEventListener('pointerdown',event=>{if(event.isPrimary && event.button===0)down={id:event.pointerId,x:event.clientX,y:event.clientY,moved:0};});
  canvas.addEventListener('pointermove',event=>{if(down&&down.id===event.pointerId)down.moved+=Math.abs(event.movementX)+Math.abs(event.movementY);});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('pointerup',event=>{
    if(!down||down.id!==event.pointerId)return;
    const click=down.moved<6&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<6;down=null;if(!click)return;
    const rect=canvas.getBoundingClientRect(),locked=document.pointerLockElement===canvas;
    const ndc=new T.Vector2(locked?0:(event.clientX-rect.left)/rect.width*2-1,locked?0:1-(event.clientY-rect.top)/rect.height*2);
    const record=manager.pick(camera,ndc);if(record)show(record);
  });
  return {update(now){
    manager.update(camera);if(now-lastUpdate<100)return;lastUpdate=now;
    camera.updateMatrixWorld(true);
    const placed=[];
    for(const {record,label} of [...labels].sort((a,b)=>camera.position.distanceTo(new T.Vector3(a.record.position[0],0,a.record.position[1]))-camera.position.distanceTo(new T.Vector3(b.record.position[0],0,b.record.position[1])))) {
      projection.set(record.position[0],record.height+5,record.position[1]);
      const inFront=viewPosition.copy(projection).applyMatrix4(camera.matrixWorldInverse).z<-camera.near;
      const distance=projection.distanceTo(camera.position);projection.project(camera);
      const x=(projection.x*.5+.5)*world.clientWidth,y=(-projection.y*.5+.5)*world.clientHeight;
      const visible=inFront&&manager.entries.has(record.id)&&projection.z>-1&&projection.z<1&&Math.abs(projection.x)<.96&&Math.abs(projection.y)<.9&&distance<6500&&!placed.some(p=>Math.abs(p[0]-x)<135&&Math.abs(p[1]-y)<34);
      label.hidden=!visible;if(visible){label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;placed.push([x,y]);}
    }
  }};
}
