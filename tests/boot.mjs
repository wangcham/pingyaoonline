import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const noop=()=>{};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:100})},{get:(target,key)=>target[key]??noop});
class Element extends EventTarget{
  constructor(){super();this.style={};this.hidden=false;this.disabled=true;this.children=[];this.clientWidth=1280;this.clientHeight=720;this.width=160;this.height=160;this.value='';this.open=false;this.flags=new Set();this.classList={toggle:(name,on)=>on?this.flags.add(name):this.flags.delete(name)};}
  append(...items){this.children.push(...items);}appendChild(item){this.children.push(item);}add(item){this.children.push(item);}replaceChildren(...items){this.children=items;}
  setAttribute(){}getBoundingClientRect(){return {left:0,top:0,width:1280,height:720};}
  getContext(kind){return kind==='webgl2'?{getExtension:()=>null,getParameter:()=>24}:context;}
  close(){this.open=false;}showModal(){this.open=true;}focus(){}click(){this.dispatchEvent(new Event('click'));}
}
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
ids.get('landmark-label-toggle').checked=true;
const doc=new Element();doc.body=new Element();doc.pointerLockElement=null;doc.getElementById=id=>ids.get(id)??null;doc.createElement=()=>new Element();doc.querySelectorAll=()=>[];doc.querySelector=selector=>ids.get(selector.replace(/^#/,''))??null;
globalThis.document=doc;globalThis.window=new Element();window.devicePixelRatio=1;
globalThis.Option=Element;globalThis.matchMedia=()=>({matches:false});globalThis.ResizeObserver=class{observe(){}};
if(process.argv.includes('--standalone')){
 const standalone=readFileSync(new URL('../平遥online.html',import.meta.url),'utf8');
 const app=[...standalone.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(code=>code.includes("import('three')"));
 assert.ok(app,'standalone must contain its scene entry point');
 const previousError=console.error;let bootError;console.error=error=>{bootError=error;};
 try{await import('data:text/javascript,'+encodeURIComponent(app.replace("import('three')","await import('three')")));}finally{console.error=previousError;}
 if(bootError)throw new Error('Standalone initialization failed: '+bootError.message);
}else await import('../dist/city.js');
testRenderer.frame(performance.now()+1);
assert.ok(testRenderer.scene.getObjectByName('古城四面护城河与河岸绿化'),'moat module must be present in both module and standalone boots');
assert.ok(testRenderer.scene.getObjectByName('城外主干道沿街店面').userData.shops.length>900);
assert.ok(testRenderer.scene.getObjectByName('小南门石桥'));
assert.ok(testRenderer.scene.getObjectByName('人工湖石岸与亲水步道'));
assert.ok(testRenderer.scene.getObjectByName('高铁站周边与绿化').userData.trees.length>300);
const infillRecords=testRenderer.scene.getObjectByName('普通沿街建筑高度记录').userData.heightRecords;
assert.ok(infillRecords.some(r=>r.floors===1));assert.ok(infillRecords.some(r=>r.floors===2));
assert.ok(infillRecords.filter(r=>r.rasterHeight===null).every(r=>r.floors<=2),'unverified infill must not invent random tall buildings');
const firstRow=testRenderer.scene.getObjectByName('下西关街连续商铺').userData.heightRecords.filter(p=>p.id?.startsWith('west-shop-')&&p.x>=-1894);
assert.ok(firstRow.length>60&&firstRow.every(p=>p.floors===1));
assert.equal(ids.get('start').disabled,false);assert.equal(ids.get('start').textContent,'开始体验');
assert.match(ids.get('building-data-summary').textContent,/已记录 \d+/);
ids.get('start').click();assert.equal(ids.get('intro').hidden,true,'unsupported capture must still enter the scene');assert.equal(ids.get('capture-retry').hidden,false);
testRenderer.frame(performance.now()+16);
for(const name of ['平遥站','家家利超市','万福隆超市总店']){
  assert.ok(testRenderer.scene.getObjectByName(name)?.userData.buildingRecord,name);
}
const escape=new Event('keydown');Object.defineProperty(escape,'code',{value:'Escape'});window.dispatchEvent(escape);assert.equal(ids.get('intro').hidden,false);
ids.get('night').click();testRenderer.frame(performance.now()+300);assert.match(ids.get('night').textContent,/日景/);
ids.get('night').click();testRenderer.frame(performance.now()+600);assert.match(ids.get('night').textContent,/夜景/);
for(const id of ['gate','school-intro','street-intro','shuncheng-intro','school-open','landmark-open'])assert.ok(!ids.has(id));
ids.get('street-open').click();
const streetQuery=ids.get('street-query');
streetQuery.value='平遥中学';streetQuery.dispatchEvent(new Event('input'));
const schoolResult=ids.get('street-results').children.find(choice=>choice.children[0].textContent==='平遥中学 · 校门广场');
assert.ok(schoolResult,'school remains searchable');
schoolResult.click();testRenderer.frame(performance.now()+900);
assert.equal(ids.get('intro').hidden,true,'school search must enter the experience');
const {isPingyaoSchoolParcel}=await import('../dist/pingyao-school-data.js');
assert.ok(isPingyaoSchoolParcel(testRenderer.camera.position.x,testRenderer.camera.position.z),'school search must reach the eastern campus');
assert.ok(testRenderer.scene.getObjectByName('山西省平遥中学'));
const {schoolSites}=await import('../dist/school-sites-data.js');
const {civicSiteSurveys}=await import('../dist/civic-sites-data.js');
const {westNeighbourBlocks}=await import('../dist/west-neighbourhood-data.js');
assert.equal(ids.get('landmark-list').children.length,8+schoolSites.length+civicSiteSurveys.length+westNeighbourBlocks.length,'all registered schools and neighbourhoods appear alongside existing landmarks');
ids.get('night').click();testRenderer.frame(performance.now()+1200);
const campus=testRenderer.scene.getObjectByName('山西省平遥中学');assert.ok(campus.children.some(o=>o.isPointLight&&o.visible),'campus lamps must follow day/night state');
for(const [query,name] of [['田森','田森汇 · 顺城路立面'],['平遥三中','平遥三中 · 东南门'],['新华书店','新华书店 · 田森对面']]){
  ids.get('street-open').click();streetQuery.value=query;streetQuery.dispatchEvent(new Event('input'));
  const result=ids.get('street-results').children.find(choice=>choice.children[0].textContent===name);assert.ok(result,query+' remains searchable');
  result.click();testRenderer.frame(performance.now()+1500);assert.equal(ids.get('intro').hidden,true);
}
assert.ok(testRenderer.scene.getObjectByName('田森汇'));assert.ok(testRenderer.scene.getObjectByName('平遥三中'));
assert.equal(testRenderer.scene.getObjectByName('田森街区人物'),undefined,'people remain removed in the shareable build');
for(const [query,name]of [['品牌内街','尚特奥特莱斯 · 品牌内街'],['明清街','明清街 · 南大街']]){
 ids.get('street-open').click();streetQuery.value=query;streetQuery.dispatchEvent(new Event('input'));
 const choice=ids.get('street-results').children.find(row=>row.children[0].textContent===name);assert.ok(choice,query+' search');choice.click();testRenderer.frame(performance.now()+1700);
}
// The visible duplicate houses came from two independent generators. Exercise
// their combined scene, not just the individual mall/market constructor.
const {collectBuildingRecords}=await import('../dist/building-heights.js');
const {clearanceRect,clearancePolygonsOverlap}=await import('../dist/road-clearance.js');
const {tiansenStreetAprons}=await import('../dist/west-sites-data.js');
const allRecords=collectBuildingRecords(testRenderer.scene),jiajiali=allRecords.find(b=>b.name==='家家利超市');
const footprint=b=>b.footprint??b.ring??clearanceRect(b.x,b.z,b.w,b.d,b.angle??0);
const bookstoreRecord=allRecords.find(b=>b.id==='xinhua-pingyao');assert.ok(bookstoreRecord,'the bookstore must be loaded in the complete city');
for(const b of allRecords){
 if(b!==jiajiali&&Math.hypot(b.x-jiajiali.x,b.z-jiajiali.z)<100)assert.ok(!clearancePolygonsOverlap(footprint(jiajiali),footprint(b)),`${b.id} overlaps Jiajiali`);
 if(b.id?.startsWith('west-road-infill-'))assert.ok(tiansenStreetAprons.every(r=>!clearancePolygonsOverlap(footprint(b),r)),`${b.id} occupies Tiansen's scooter apron`);
 if(b!==bookstoreRecord&&Math.hypot(b.x-bookstoreRecord.x,b.z-bookstoreRecord.z)<150)assert.ok(!clearancePolygonsOverlap(footprint(bookstoreRecord),footprint(b)),`${b.id} overlaps Xinhua Bookstore`);
}
assert.ok(!allRecords.some(b=>['yufeng-rear-3','yufeng-rear-4','yufeng-rear-6','yufeng-rear-7'].includes(b.id)));
for(const [query,name] of [['南城','南城 · 连续街坊全景'],['街坊全景','二中至三中 · 街坊全景'],['内部街巷','永安北路 · 内部街巷'],['柳根街','柳根街 · 南侧街区'],['迎薰门','迎薰门 · 绿化步道']]){
  ids.get('street-open').click();streetQuery.value=query;streetQuery.dispatchEvent(new Event('input'));
  const result=ids.get('street-results').children.find(choice=>choice.children[0].textContent===name);assert.ok(result,query+' search');
  result.click();testRenderer.frame(performance.now()+1800);assert.equal(ids.get('intro').hidden,true);
}
assert.ok(testRenderer.scene.getObjectByName('南城连续街坊 · 柳根街至南外环'));assert.ok(testRenderer.scene.getObjectByName('平遥二中至三中街坊'));assert.ok(testRenderer.scene.getObjectByName('迎薰门公园绿化'));
ids.get('city-plan-open').click();assert.equal(ids.get('city-plan-dialog').open,true);assert.equal(ids.get('city-plan-list').children.length,25);
ids.get('city-plan-list').children.find(row=>row.children[0].textContent.startsWith('B02')).click();assert.equal(ids.get('city-plan-visit').hidden,false);
ids.get('city-plan-visit').click();testRenderer.frame(performance.now()+2000);assert.equal(ids.get('city-plan-dialog').open,false);assert.equal(ids.get('intro').hidden,true);
assert.ok(Math.abs(testRenderer.camera.position.x+603)<.1);
// Check Jinglin together with all legacy street lights, schools and courtyard fences.
const JT=await import('three');
const bookRoot=testRenderer.scene.getObjectByName('新华书店（平遥店）'),bookEntry=bookRoot.userData.streetLife;
testRenderer.scene.updateMatrixWorld(true);
for(const dx of [-.6,.6]){
 const [u,v]=bookEntry.entry,a=bookEntry.entryAngle;
 const start=bookRoot.localToWorld(new JT.Vector3(u+Math.sin(a)*4+Math.cos(a)*dx,1.5,v+Math.cos(a)*4-Math.sin(a)*dx));
 const end=bookRoot.localToWorld(new JT.Vector3(u+Math.sin(a)*.65+Math.cos(a)*dx,1.5,v+Math.cos(a)*.65-Math.sin(a)*dx));
 assert.equal(new JT.Raycaster(start,end.clone().sub(start).normalize(),0,start.distanceTo(end)).intersectObject(testRenderer.scene,true).length,0,'bookstore entry must remain open in the complete city');
}
ids.get('street-open').click();streetQuery.value='景林';streetQuery.dispatchEvent(new Event('input'));
const jinglinChoice=ids.get('street-results').children.find(choice=>choice.children[0].textContent==='景林江米油糕');assert.ok(jinglinChoice);jinglinChoice.click();testRenderer.frame(performance.now()+2400);
testRenderer.scene.updateMatrixWorld(true);
const jinglin=testRenderer.scene.getObjectByName('景林江米油糕 · 照片细化门店');
const jinglinBlock=testRenderer.scene.getObjectByName('景林右侧 · 玻璃店面与小路及地税局');
const {jinglinContext:jinglinLayout}=await import('../dist/jinglin-context-data.js');
// Check the whole window width: the automatic row layout must not stretch
// Jinglin's tiled wall across the adjacent glass after the lane is moved.
for(const offset of [-1.35,-.65,.65,1.35]){
 const from=jinglinBlock.localToWorld(new JT.Vector3(jinglinLayout.glass.u+offset,2.2,5));
 const direction=new JT.Vector3(0,0,-1).transformDirection(jinglinBlock.matrixWorld);
 const hit=new JT.Raycaster(from,direction,0,3).intersectObject(testRenderer.scene,true)[0];
 assert.ok(hit?.object.parent===jinglinBlock&&hit.object.name.startsWith('生活街区材质-glass:'),'Jinglin wall must not cover the adjacent upper window');
}
for(const [root,u,v,length] of [[jinglin,0,4.2,3.5],...[-1.4,0,1.4].map(du=>[jinglinBlock,jinglinLayout.lane.u+du,5,58])]){
 const from=root.localToWorld(new JT.Vector3(u,1.3,v)),direction=new JT.Vector3(0,0,-1).transformDirection(root.matrixWorld);
 assert.equal(new JT.Raycaster(from,direction,0,length).intersectObject(testRenderer.scene,true).length,0,'Jinglin entrance and its lane must stay clear in the complete city');
}
const landmarkLayer=ids.get('world').children.find(element=>element.id==='landmark-labels');
const {westGroundHeight:labelGround}=await import('../dist/west-terrain.js');
const labelToggle=ids.get('landmark-label-toggle');
let labelTime=performance.now()+3000;
const checkLabelHeight=(height,hidden)=>{
 testRenderer.camera.position.y=labelGround(testRenderer.camera.position.x,testRenderer.camera.position.z)+height;
 testRenderer.frame(labelTime+=150);
 assert.equal(landmarkLayer.hidden,hidden,`landmark label layer at ${height} metres above ground`);
};
checkLabelHeight(1.8,true);checkLabelHeight(11,true);checkLabelHeight(12.1,false);
checkLabelHeight(9,false);checkLabelHeight(7.9,true);
labelToggle.checked=false;labelToggle.dispatchEvent(new Event('change'));checkLabelHeight(30,true);
labelToggle.checked=true;labelToggle.dispatchEvent(new Event('change'));assert.equal(landmarkLayer.hidden,false);
checkLabelHeight(1.8,true);
console.log('Scene boot, entry without Pointer Lock, Escape, school search/labels, near-ground label visibility, day/night and frame update passed without opening a browser.');
