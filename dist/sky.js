import * as T from 'three';

export function createDaySky() {
  const material = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      zenith: {value: new T.Color('#4596e5')},
      horizon: {value: new T.Color('#cae9ff')},
      cloudLight: {value: new T.Color('#fffefb')},
      cloudShade: {value: new T.Color('#c7d9eb')},
    },
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        skyDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 skyDirection;
      uniform vec3 zenith;
      uniform vec3 horizon;
      uniform vec3 cloudLight;
      uniform vec3 cloudShade;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(cell), hash(cell + vec2(1.0, 0.0)), u.x),
          mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), u.x), u.y);
      }

      float cloudNoise(vec2 p) {
        return noise(p) * 0.60 + noise(p * 2.1) * 0.25
          + noise(p * 4.4) * 0.10 + noise(p * 8.6) * 0.05;
      }

      void main() {
        vec3 direction = normalize(skyDirection);
        float height = max(0.0, direction.y);
        vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.58, height));
        // Project a cloud layer above the viewer; flatten its pattern near the horizon.
        vec2 cloudUV = direction.xz * 2.05 / (height + 0.28) + vec2(1.7, -5.6);
        float density = cloudNoise(cloudUV);
        float outline = smoothstep(0.51, 0.65, density) * smoothstep(0.015, 0.11, height);
        vec3 white = mix(cloudShade, cloudLight, smoothstep(0.53, 0.74, density));
        gl_FragColor = vec4(mix(color, white, outline), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new T.Mesh(new T.SphereGeometry(12500, 32, 16), material);
  sky.renderOrder = -100;
  sky.name = 'sky';
  sky.frustumCulled = false;
  return sky;
}
