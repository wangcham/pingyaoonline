// Chain after a loader providing the project's exact Three.js version.
export async function resolve(specifier,context,next){
  if(specifier==='three'&&!context.parentURL?.endsWith('/three-headless.mjs'))return {url:new URL('./three-headless.mjs',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}
