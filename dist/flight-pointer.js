// Keep scene entry separate from the optional browser Pointer Lock permission.
export function createFlightPointer({canvas,doc=document,win=window,isTouch,onStart,onPause,onTurn,onMode=()=>{},onError=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
  let active=false,mode='idle',drag=null,request=0,timer=null;
  const listeners=[];
  function listen(target,type,handler){target.addEventListener(type,handler);listeners.push(()=>target.removeEventListener(type,handler));}
  function clearTimer(){if(timer!==null){cancel(timer);timer=null;}}
  function setMode(value){mode=value;canvas.style.cursor=value==='locked'?'none':value==='compatible'?'grab':'';onMode(value);}
  function fail(token){
    if(!active||token!==request||mode!=='pending')return;
    clearTimer();setMode('compatible');
    onError('已进入兼容体验：按住鼠标拖动转头，WASD 移动，Esc 退出。当前窗口未允许锁定鼠标，可在独立浏览器中重试。');
  }
  function requestCapture(){
    if(!active||isTouch()||mode==='pending'||mode==='locked')return;
    const token=++request;setMode('pending');
    if(!canvas.requestPointerLock){fail(token);return;}
    timer=schedule(()=>fail(token),1800);
    try{canvas.requestPointerLock()?.catch(()=>fail(token));}catch{fail(token);}
  }
  function start(){
    if(active){if(mode==='compatible')requestCapture();return;}
    active=true;onStart();
    if(isTouch()){setMode('touch');return;}
    if(doc.pointerLockElement===canvas){setMode('locked');return;}
    requestCapture();
  }
  function release(){
    active=false;request++;clearTimer();
    if(drag&&canvas.hasPointerCapture?.(drag.id))canvas.releasePointerCapture(drag.id);
    drag=null;setMode('idle');
    if(doc.pointerLockElement===canvas)doc.exitPointerLock();
  }
  function pause(){if(!active)return;release();onPause();}
  listen(canvas,'pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    if(!active){event.preventDefault();event.stopImmediatePropagation();start();}
    if(mode==='touch'||mode==='compatible'){
      canvas.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    }
  });
  listen(doc,'pointerlockchange',()=>{
    if(doc.pointerLockElement===canvas){
      if(!active){doc.exitPointerLock();return;}
      clearTimer();drag=null;setMode('locked');
    }else if(mode==='locked')pause();
  });
  listen(doc,'pointerlockerror',()=>fail(request));
  listen(doc,'mousemove',event=>{if(active&&doc.pointerLockElement===canvas)onTurn(event.movementX,event.movementY);});
  listen(canvas,'pointermove',event=>{
    if(active&&(mode==='touch'||mode==='compatible')&&drag?.id===event.pointerId){
      onTurn(event.clientX-drag.x,event.clientY-drag.y);drag.x=event.clientX;drag.y=event.clientY;
    }
  });
  const endDrag=()=>{drag=null;};
  listen(canvas,'pointerup',endDrag);listen(canvas,'pointercancel',endDrag);listen(canvas,'lostpointercapture',endDrag);
  listen(win,'keydown',event=>{if(event.code==='Escape')pause();});
  // Browser/OS capture loss is authoritative; blur alone never voluntarily unlocks.
  return {start,release,requestCapture,get mode(){return mode;},dispose(){release();listeners.forEach(remove=>remove());}};
}
