// Use browser fullscreen so Escape and browser/OS exits remain authoritative.
export function attachFullscreen({button,doc=document,win=window,onExit=()=>{},onError=()=>{},onResize=()=>{}}){
 const target=doc.documentElement??doc.body;
 const active=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
 let wasActive=active(),busy=false;
 function sync(){const full=active();button.textContent=full?'退出全屏':'全屏';button.setAttribute('aria-pressed',String(full));button.title=full?'退出全屏（Esc）':'占满整个屏幕';if(wasActive&&!full)onExit();wasActive=full;onResize();}
 async function exit(){if(!active())return;try{await (doc.exitFullscreen??doc.webkitExitFullscreen)?.call(doc);}catch{onError('暂时无法退出全屏，请按 Esc。');}finally{sync();}}
 async function toggle(){
  if(busy)return;
  if(active()){await exit();return;}
  const request=target.requestFullscreen??target.webkitRequestFullscreen;
  if(!request){onError('当前浏览器不支持全屏，请使用 Chrome、Edge 或 Safari 打开。');return;}
  busy=true;button.disabled=true;
  try{await request.call(target);}catch{onError('当前窗口未允许全屏，请在独立浏览器中打开后重试。');}
  finally{busy=false;button.disabled=false;sync();}
 }
 button.addEventListener('click',toggle);
 doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);
 win.addEventListener('keydown',event=>{if(event.code==='Escape')void exit();});
 sync();return {exit};
}
