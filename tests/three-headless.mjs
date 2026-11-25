export * from 'three';
// Exercise real scene construction, without a WebGL context or opening a browser.
export class WebGLRenderer{
  constructor({canvas}){this.domElement=canvas;this.shadowMap={};globalThis.testRenderer=this;}
  setPixelRatio(){}setSize(){}render(scene,camera){this.scene=scene;this.camera=camera;}
  setAnimationLoop(callback){this.frame=callback;}
}
