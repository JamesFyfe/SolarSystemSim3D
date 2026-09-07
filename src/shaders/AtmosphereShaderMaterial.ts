import * as THREE from 'three';

/**
 * Raymarched atmospheric haze. The material is applied to a sphere shell that is
 * centred on the planet and scaled to the top of the atmosphere. Each fragment
 * casts a ray from the camera through the shell, integrates an exponential
 * density profile between the shell and the planet surface, and lights the
 * result by the sun direction so the night side fades out.
 *
 * All ray math is done relative to the planet centre (not in world space) so it
 * stays precise for bodies far from the origin.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  // Fragment position relative to the planet centre. The shell is a sphere
  // centred on the planet so dropping the model matrix translation gives this
  // directly, without subtracting two large world-space positions.
  varying vec3 vRelPos;

  void main() {
    vRelPos = mat3(modelMatrix) * position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform vec3 uColor;
  uniform float uPlanetR;
  uniform float uAtmosR;
  uniform float uIntensity;
  uniform float uDensity;
  uniform float uOpacity;
  uniform float uFalloff;
  uniform vec3 uLightDir;   // planet centre -> sun, world space
  uniform vec3 uCameraRel;  // camera position relative to planet centre

  varying vec3 vRelPos;

  bool raySphere(vec3 ro, vec3 rd, float radius, out float tNear, out float tFar) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return false;
    h = sqrt(h);
    tNear = -b - h;
    tFar = -b + h;
    return true;
  }

  void main() {
    #include <logdepthbuf_fragment>

    vec3 ro = uCameraRel;
    vec3 rd = normalize(vRelPos - uCameraRel);

    float aNear, aFar;
    if (!raySphere(ro, rd, uAtmosR, aNear, aFar)) discard;

    float tEnter = max(aNear, 0.0);
    float tExit = aFar;

    float pNear, pFar;
    if (raySphere(ro, rd, uPlanetR, pNear, pFar)) {
      if (pNear > 0.0) tExit = min(tExit, pNear);
    }

    float path = max(tExit - tEnter, 0.0);
    if (path <= 0.0) discard;

    const int STEPS = 10;
    float dt = path / float(STEPS);
    float optical = 0.0;
    float heightScale = uAtmosR - uPlanetR;

    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * (tEnter + (float(i) + 0.5) * dt);
      float alt = (length(p) - uPlanetR) / heightScale;
      float dens = exp(-max(alt, 0.0) * uFalloff) * uDensity;

      vec3 n = normalize(p);
      // Soft terminator: night ~0, day ~1
      float day = smoothstep(-0.05, 0.55, dot(n, uLightDir));
      dens *= mix(0.05, 1.0, day);

      optical += dens * dt;
    }

    // Path length is measured in planet radii so the look does not depend on planet size
    float alpha = 1.0 - exp(-optical / uPlanetR * 2.4 * uIntensity);
    alpha = smoothstep(0.0, 0.8, alpha) * uOpacity;

    // Keep saturation, lift only slightly toward white where dense
    vec3 col = uColor * (0.7 + alpha * 0.35);
    gl_FragColor = vec4(col, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface AtmosphereMaterialOptions {
  color: THREE.ColorRepresentation;
  planetRadius: number;
  atmosphereRadius: number;
  intensity?: number;
  density?: number;
  opacity?: number;
  falloff?: number;
}

export type AtmosphereMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uColor: THREE.IUniform<THREE.Color>;
    uPlanetR: THREE.IUniform<number>;
    uAtmosR: THREE.IUniform<number>;
    uIntensity: THREE.IUniform<number>;
    uDensity: THREE.IUniform<number>;
    uOpacity: THREE.IUniform<number>;
    uFalloff: THREE.IUniform<number>;
    uLightDir: THREE.IUniform<THREE.Vector3>;
    uCameraRel: THREE.IUniform<THREE.Vector3>;
  };
};

export default function createAtmosphereMaterial({
  color,
  planetRadius,
  atmosphereRadius,
  intensity = 1,
  density = 1,
  opacity = 0.5,
  falloff = 5,
}: AtmosphereMaterialOptions): AtmosphereMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPlanetR: { value: planetRadius },
      uAtmosR: { value: atmosphereRadius },
      uIntensity: { value: intensity },
      uDensity: { value: density },
      uOpacity: { value: opacity },
      uFalloff: { value: falloff },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uCameraRel: { value: new THREE.Vector3(0, 0, 10) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  }) as AtmosphereMaterial;
}
