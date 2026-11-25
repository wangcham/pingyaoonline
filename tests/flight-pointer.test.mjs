import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightPointer} from '../dist/flight-pointer.js';

function target(){
  const listeners=new Map();
  return {style:{},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    removeEventListener(type,fn){listeners.set(type,listeners.get(type).filter(f=>f!==fn));},
    emit(type,values={}){const event={isPrimary:true,button:0,pointerId:1,clientX:20,clientY:30,preventDefault(){},stopImmediatePropagation(){this.stopped=true;},...values};
      for(const fn of listeners.get(type)??[]){fn(event);if(event.stopped)break;}return event;}};
}
function setup({touch=false,denied=false}={}){
  const canvas=target(),doc=target(),win=target(),turns=[];let starts=0,pauses=0,requests=0;const errors=[],timers=new Map();let timerId=0;
  doc.pointerLockElement=null;
  doc.exitPointerLock=()=>{doc.pointerLockElement=null;doc.emit('pointerlockchange');};
  canvas.requestPointerLock=()=>{requests++;if(denied)return Promise.reject(new Error('denied'));doc.pointerLockElement=canvas;doc.emit('pointerlockchange');return Promise.resolve();};
  canvas.setPointerCapture=()=>{};
  const control=createFlightPointer({canvas,doc,win,isTouch:()=>touch,onStart:()=>starts++,onPause:()=>pauses++,onTurn:(x,y)=>turns.push([x,y]),onError:message=>errors.push(message),schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:id=>timers.delete(id)});
  return {canvas,doc,win,control,turns,errors,timers,get starts(){return starts;},get pauses(){return pauses;},get requests(){return requests;}};
}
test('click captures mouse, hides cursor, moves view without dragging and consumes entry pick',()=>{
  const s=setup();let picked=0;s.canvas.addEventListener('pointerdown',()=>picked++);
  s.canvas.emit('pointerdown');assert.equal(s.control.mode,'locked');assert.equal(s.canvas.style.cursor,'none');assert.equal(s.starts,1);assert.equal(picked,0);
  s.doc.emit('mousemove',{movementX:17,movementY:-3,buttons:0});assert.deepEqual(s.turns,[[17,-3]]);
  s.canvas.emit('pointerdown');assert.equal(picked,1,'later clicks may pick landmarks');
  s.win.emit('keydown',{code:'Escape'});assert.equal(s.control.mode,'idle');assert.equal(s.canvas.style.cursor,'');assert.equal(s.pauses,1);
  s.doc.emit('mousemove',{movementX:8,movementY:9});assert.equal(s.turns.length,1);
  s.canvas.emit('pointerdown');assert.equal(s.control.mode,'locked');s.win.emit('blur');s.canvas.emit('pointerleave');assert.equal(s.control.mode,'locked');
  s.doc.pointerLockElement=null;s.doc.emit('pointerlockchange');assert.equal(s.control.mode,'idle');
});
test('denied capture still enters experience, visibly uses drag and can retry real capture',async()=>{
  const s=setup({denied:true});s.canvas.emit('pointerdown');assert.equal(s.control.mode,'pending');assert.equal(s.starts,1);
  await Promise.resolve();assert.equal(s.control.mode,'compatible');assert.equal(s.canvas.style.cursor,'grab');assert.equal(s.errors.length,1);assert.equal(s.pauses,0);
  s.canvas.emit('pointermove',{clientX:29,clientY:34,buttons:0});assert.deepEqual(s.turns,[],'free cursor movement is never fake lock');
  s.canvas.emit('pointerdown');s.canvas.emit('pointermove',{clientX:25,clientY:35});s.canvas.emit('pointerup');
  s.canvas.emit('pointermove',{clientX:29,clientY:34});assert.deepEqual(s.turns,[[5,5]]);
  s.canvas.requestPointerLock=()=>{s.doc.pointerLockElement=s.canvas;s.doc.emit('pointerlockchange');};
  s.control.requestCapture();assert.equal(s.control.mode,'locked');assert.equal(s.starts,1);
  s.win.emit('keydown',{code:'Escape'});assert.equal(s.control.mode,'idle');assert.equal(s.pauses,1);
});
test('unsupported capture enters compatible experience instead of blocking the start button',()=>{
  const s=setup();delete s.canvas.requestPointerLock;s.control.start();
  assert.equal(s.control.mode,'compatible');assert.equal(s.starts,1);assert.equal(s.errors.length,1);
});
test('a browser with no capture callback cannot leave entry pending forever',()=>{
  const s=setup();let requested=0;s.canvas.requestPointerLock=()=>{requested++;};
  s.control.start();s.control.start();assert.equal(requested,1);assert.equal(s.starts,1);
  [...s.timers.values()][0]();assert.equal(s.control.mode,'compatible');assert.equal(s.timers.size,0);
  s.control.requestCapture();s.win.emit('keydown',{code:'Escape'});assert.equal(s.timers.size,0);
  s.doc.pointerLockElement=s.canvas;s.doc.emit('pointerlockchange');assert.equal(s.doc.pointerLockElement,null);
});
test('touch keeps drag look without requesting pointer lock',()=>{
  const s=setup({touch:true});s.canvas.emit('pointerdown');s.canvas.emit('pointermove',{clientX:25,clientY:37});
  assert.equal(s.requests,0);assert.equal(s.canvas.style.cursor,'');assert.deepEqual(s.turns,[[5,7]]);
});
test('late capture after exit is released instead of unexpectedly trapping cursor',()=>{
  const s=setup();s.control.start();s.control.release();s.doc.pointerLockElement=s.canvas;s.doc.emit('pointerlockchange');
  assert.equal(s.doc.pointerLockElement,null);assert.equal(s.control.mode,'idle');
});
