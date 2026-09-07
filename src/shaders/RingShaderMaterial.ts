import * as THREE from 'three';

/**
 * Unlit ring disc. `uBrightness` is a placeholder multiply so you can see the
 * shader is running; replace it with a Saturn-cast shadow when you are ready.
 *
 * Shadow inputs are in planet-relative world space (Saturn at the origin).
 * Subtracting two world positions on the GPU at AU scales loses precision, so
 * the JS side passes already-relative vectors and the vertex shader drops the
 * model-matrix translation the same way the atmosphere shader does.
 *
 * A single sun/Saturn angle is not enough: the shadow is a 2D region on the
 * ring plane. Per fragment you want the ring point (`vRelPos`), the sun vector
 * (`uSunRel` / `uLightDir`), and `uPlanetR`.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  varying vec2 vUv;
  // Fragment position relative to the planet centre, world orientation.
  varying vec3 vRelPos;

  void main() {
    vUv = uv;
    vRelPos = mat3(modelMatrix) * position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBrightness;

  uniform vec3 uLightDir;  // planet centre -> sun, world space, unit length
  uniform vec3 uSunRel;    // sun position relative to planet centre
  uniform float uPlanetR;

  varying vec2 vUv;
  varying vec3 vRelPos;

  void main() {
    #include <logdepthbuf_fragment>

    vec4 tex = texture2D(uMap, vUv);

    float along = dot(vRelPos, uLightDir);
    float perpSqrd = dot(vRelPos, vRelPos) - along * along;

    float brightness = uBrightness;

    if (along < 0.0 && perpSqrd < uPlanetR * uPlanetR) {
      brightness = 0.1;
    }

    vec3 col = tex.rgb * brightness;
    float alpha = tex.a * uOpacity;

    if (alpha <= 0.0) discard;

    gl_FragColor = vec4(col, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const WHITE = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
})();

export interface RingMaterialOptions {
  opacity: number;
  planetRadius: number;
  brightness?: number;
}

export type RingMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uMap: THREE.IUniform<THREE.Texture>;
    uOpacity: THREE.IUniform<number>;
    uBrightness: THREE.IUniform<number>;
    uLightDir: THREE.IUniform<THREE.Vector3>;
    uSunRel: THREE.IUniform<THREE.Vector3>;
    uPlanetR: THREE.IUniform<number>;
  };
};

export default function createRingMaterial({
  opacity,
  planetRadius,
  brightness = 0.8,
}: RingMaterialOptions): RingMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: WHITE },
      uOpacity: { value: opacity },
      uBrightness: { value: brightness },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uSunRel: { value: new THREE.Vector3(1, 0, 0) },
      uPlanetR: { value: planetRadius },
    },
    transparent: true,
    side: THREE.DoubleSide,
  }) as RingMaterial;
}
