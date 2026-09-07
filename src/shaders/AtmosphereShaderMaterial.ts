import * as THREE from 'three';

/**
 * Atmospheric haze on a sphere shell centred on the planet and scaled to the
 * top of the atmosphere. Two independently authored contributions:
 *
 *  1. Limb (`uLimb`) — raymarched in-scatter along the view ray. Path length
 *     is long at the silhouette, so this is the glow around the planet.
 *  2. Surface (`uSurface`) — a thin analytic veil when the ray hits the
 *     planet, so the disc is tinted without affecting the limb.
 *
 * Both fade toward the night side. Ray math is relative to the planet centre
 * so it stays precise for bodies far from the origin.
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
  uniform float uLimb;
  uniform float uSurface;
  uniform vec3 uLightDir;   // planet centre -> sun, world space
  uniform vec3 uCameraRel;  // camera position relative to planet centre

  varying vec3 vRelPos;

  const float FALLOFF = 4.0;

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

    bool hitsPlanet = false;
    float pNear, pFar;
    if (raySphere(ro, rd, uPlanetR, pNear, pFar)) {
      if (pNear > 0.0) {
        tExit = min(tExit, pNear);
        hitsPlanet = true;
      }
    }

    float path = max(tExit - tEnter, 0.0);
    if (path <= 0.0) discard;

    const int STEPS = 10;
    float dt = path / float(STEPS);
    float scatterOptical = 0.0;
    float heightScale = max(uAtmosR - uPlanetR, 1e-5);

    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * (tEnter + (float(i) + 0.5) * dt);
      float alt = (length(p) - uPlanetR) / heightScale;
      float dens = exp(-max(alt, 0.0) * FALLOFF) * uLimb;

      vec3 n = normalize(p);
      float day = smoothstep(-0.05, 0.55, dot(n, uLightDir));
      dens *= mix(0.05, 1.0, day);

      scatterOptical += dens * dt;
    }

    // Path length in planet radii so the glow does not depend on planet size
    float limbAlpha = 1.0 - exp(-scatterOptical / uPlanetR * 2.4);
    limbAlpha = smoothstep(0.0, 0.8, limbAlpha);

    float alpha = limbAlpha;
    vec3 col = uColor * (0.7 + limbAlpha * 0.35);

    if (hitsPlanet) {
      vec3 nHit = normalize(ro + rd * pNear);
      float ndotv = max(dot(nHit, -rd), 0.25);
      float airmass = mix(1.0, 1.0 / ndotv, 0.2);
      float day = smoothstep(-0.05, 0.55, dot(nHit, uLightDir));
      float fog = (1.0 - exp(-uSurface * airmass)) * mix(0.12, 1.0, day);

      alpha = 1.0 - (1.0 - fog) * (1.0 - limbAlpha);
      col = uColor * (0.7 + alpha * 0.35);
    }

    gl_FragColor = vec4(col, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface AtmosphereMaterialOptions {
  color: THREE.ColorRepresentation;
  planetRadius: number;
  atmosphereRadius: number;
  limb?: number;
  surface?: number;
}

export type AtmosphereMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uColor: THREE.IUniform<THREE.Color>;
    uPlanetR: THREE.IUniform<number>;
    uAtmosR: THREE.IUniform<number>;
    uLimb: THREE.IUniform<number>;
    uSurface: THREE.IUniform<number>;
    uLightDir: THREE.IUniform<THREE.Vector3>;
    uCameraRel: THREE.IUniform<THREE.Vector3>;
  };
};

export default function createAtmosphereMaterial({
  color,
  planetRadius,
  atmosphereRadius,
  limb = 1,
  surface = 0.15,
}: AtmosphereMaterialOptions): AtmosphereMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPlanetR: { value: planetRadius },
      uAtmosR: { value: atmosphereRadius },
      uLimb: { value: limb },
      uSurface: { value: surface },
      uLightDir: { value: new THREE.Vector3(1, 0, 0) },
      uCameraRel: { value: new THREE.Vector3(0, 0, 10) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  }) as AtmosphereMaterial;
}
