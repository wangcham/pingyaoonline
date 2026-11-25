import test from 'node:test';
import assert from 'node:assert/strict';
import {stableDepthOptions,stableDetailVisibility} from '../dist/render-stability.js';

test('kilometer-scale detail uses logarithmic depth on normal 24-bit contexts',()=>{
  for(const extension of [null,{}]){
    const context={DEPTH_BITS:3414,getExtension:()=>extension,getParameter:()=>24};
    assert.deepEqual(stableDepthOptions(context),{reversedDepthBuffer:false,logarithmicDepthBuffer:true});
  }
  assert.deepEqual(stableDepthOptions({DEPTH_BITS:3414,getExtension:()=>({}),getParameter:()=>32}),{reversedDepthBuffer:true,logarithmicDepthBuffer:false});
});
test('small movement around LOD threshold does not repeatedly switch details',()=>{
  let visible=false;
  for(const d of [259,261,258,262,240]){visible=stableDetailVisibility(visible,d,235,285);assert.equal(visible,false);}
  visible=stableDetailVisibility(visible,230,235,285);assert.equal(visible,true);
  for(const d of [259,261,284,260]){visible=stableDetailVisibility(visible,d,235,285);assert.equal(visible,true);}
  assert.equal(stableDetailVisibility(visible,286,235,285),false);
});
