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
const doc=new Element();doc.body=new Element();doc.pointerLockElement=null;doc.getElementById=id=>ids.get(id)??null;doc.createElement=()=>new Element();doc.querySelectorAll=()=>[];
globalThis.document=doc;globalThis.window=new Element();window.devicePixelRatio=1;
globalThis.Option=Element;globalThis.matchMedia=()=>({matches:false});globalThis.ResizeObserver=class{observe(){}};
await import('../dist/city.js');
const {planWestFrontages}=await import('../dist/west-corridor.js');
const firstRow=planWestFrontages().units.filter(p=>p.x>=-1894);
assert.ok(firstRow.length>60&&firstRow.every(p=>p.buildingRecord.floors===1));
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
assert.equal(ids.get('landmark-list').children.length,6,'school must appear alongside the five existing landmarks');
ids.get('night').click();testRenderer.frame(performance.now()+1200);
const campus=testRenderer.scene.getObjectByName('山西省平遥中学');assert.ok(campus.children.some(o=>o.isPointLight&&o.visible),'campus lamps must follow day/night state');
console.log('Scene boot, entry without Pointer Lock, Escape, school search/labels, day/night and frame update passed without opening a browser.');
