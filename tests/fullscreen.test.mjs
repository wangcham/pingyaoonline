import test from 'node:test';
import assert from 'node:assert/strict';
import {attachFullscreen} from '../dist/fullscreen.js';

function target(){
 const listeners=new Map();
 return {attributes:{},addEventListener(type,fn){const list=listeners.get(type)??[];list.push(fn);listeners.set(type,list);},setAttribute(name,value){this.attributes[name]=value;},async emit(type,event={}){await Promise.all((listeners.get(type)??[]).map(fn=>fn(event)));}};
}
function setup({denied=false,unsupported=false}={}){
 const button=target(),doc=target(),win=target(),errors=[];let exits=0,resizes=0;
 doc.documentElement={};doc.fullscreenElement=null;
 if(!unsupported)doc.documentElement.requestFullscreen=async()=>{if(denied)throw Error('denied');doc.fullscreenElement=doc.documentElement;await doc.emit('fullscreenchange');};
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null;await doc.emit('fullscreenchange');};
 const control=attachFullscreen({button,doc,win,onExit:()=>exits++,onResize:()=>resizes++,onError:message=>errors.push(message)});
 return {button,doc,win,errors,control,get exits(){return exits;},get resizes(){return resizes;}};
}
test('button enters native fullscreen and toggles out with synchronized state',async()=>{
 const s=setup();await s.button.emit('click');
 assert.equal(s.doc.fullscreenElement,s.doc.documentElement);assert.equal(s.button.textContent,'退出全屏');assert.equal(s.button.attributes['aria-pressed'],'true');assert.equal(s.button.disabled,false);
 await s.button.emit('click');assert.equal(s.doc.fullscreenElement,null);assert.equal(s.button.textContent,'全屏');assert.equal(s.exits,1);assert.ok(s.resizes>=3);
});
test('Escape and browser-driven exit both reset the button and pause once',async()=>{
 const s=setup();await s.button.emit('click');await s.win.emit('keydown',{code:'Escape'});
 assert.equal(s.doc.fullscreenElement,null);assert.equal(s.exits,1);assert.equal(s.button.attributes['aria-pressed'],'false');
 await s.button.emit('click');s.doc.fullscreenElement=null;await s.doc.emit('fullscreenchange');await s.doc.emit('fullscreenchange');
 assert.equal(s.exits,2);assert.equal(s.button.textContent,'全屏');
});
test('rejected or unavailable fullscreen never leaves the button pending or falsely active',async()=>{
 for(const options of [{denied:true},{unsupported:true}]){
  const s=setup(options);await s.button.emit('click');assert.equal(s.doc.fullscreenElement,null);assert.equal(s.button.attributes['aria-pressed'],'false');assert.notEqual(s.button.disabled,true);assert.equal(s.errors.length,1);assert.equal(s.exits,0);
 }
});
