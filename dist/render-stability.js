// r180 calls this option "reversedDepthBuffer". Never enable both depth modes.
export function stableDepthOptions(context) {
  // Reversing a 24-bit integer buffer alone does not give floating-point precision.
  const reversed=Boolean(context?.getExtension('EXT_clip_control'))
    && context.getParameter(context.DEPTH_BITS)>=32;
  return {reversedDepthBuffer:reversed,logarithmicDepthBuffer:!reversed};
}

export function stableDetailVisibility(visible,distance,enter,leave) {
  return visible?distance<leave:distance<enter;
}
