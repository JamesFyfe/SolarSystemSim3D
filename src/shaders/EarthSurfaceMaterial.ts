import * as THREE from 'three';

function flatNormalTexture(): THREE.Texture {
  const data = new Uint8Array([128, 128, 255, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Earth surface material: a MeshStandardMaterial (so it is lit by the same sun
 * point light as every other body) with ocean shading injected via
 * onBeforeCompile. An ocean mask (white = water) drives:
 *  - low roughness over water so the sun produces a broad specular glint
 *  - a subtle deep-blue tint of the water albedo
 *  - a Fresnel "sky reflection" that brightens water toward the limb on the day side
 *  - tiled ocean-normal waves (same map/tiling as earth-history), with polar-cap
 *    UVs so lat-lon meridians don't streak at the poles
 */
export default class EarthSurfaceMaterial extends THREE.MeshStandardMaterial {
  readonly oceanUniforms = {
    oceanMask: { value: null as THREE.Texture | null },
    oceanNormal: { value: flatNormalTexture() },
    /** World-space direction from Earth toward the Sun */
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    oceanRoughness: { value: 0.16 },
    oceanTint: { value: new THREE.Color(0.8, 0.9, 1.08) },
    skyColor: { value: new THREE.Color(0.35, 0.55, 1.0) },
    skyStrength: { value: 0.35 },
    uNormalScale: { value: 0.25 },
  };

  constructor() {
    super({ roughness: 1, metalness: 0 });

    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.oceanUniforms);

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform sampler2D oceanMask;
          uniform sampler2D oceanNormal;
          uniform vec3 sunDirection;
          uniform float oceanRoughness;
          uniform vec3 oceanTint;
          uniform vec3 skyColor;
          uniform float skyStrength;
          uniform float uNormalScale;

          // Tangent-space normal map → view space (derivative TBN)
          vec3 sampleOceanBump(vec3 surfNorm, vec2 uv, float scale) {
            vec3 mapN = texture2D(oceanNormal, uv).xyz * 2.0 - 1.0;
            mapN.xy *= scale;
            mapN = normalize(mapN);

            vec3 q0 = dFdx(vViewPosition);
            vec3 q1 = dFdy(vViewPosition);
            vec2 st0 = dFdx(uv);
            vec2 st1 = dFdy(uv);
            vec3 N = normalize(surfNorm);
            vec3 q1perp = cross(q1, N);
            vec3 q0perp = cross(N, q0);
            vec3 T = q1perp * st0.x + q0perp * st1.x;
            vec3 B = q1perp * st0.y + q0perp * st1.y;
            float det = max(dot(T, T), dot(B, B));
            float invMax = det == 0.0 ? 0.0 : inversesqrt(det);
            return normalize(T * (mapN.x * invMax) + B * (mapN.y * invMax) + N * mapN.z);
          }
          `,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          #include <map_fragment>
          float ocean = 0.0;
          #ifdef USE_MAP
            ocean = texture2D(oceanMask, vMapUv).r;
          #endif
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * oceanTint, ocean);
          `,
        )
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `
          #include <normal_fragment_maps>
          // vMapUv only exists once a map is assigned; before then ocean == 0 and there is nothing to perturb
          #ifdef USE_MAP
          {
            // Same 3 × 1.5 lat-lon tiling as earth-history. Near the poles those
            // UVs pinch into meridians, so blend to an XZ polar-cap projection.
            vec2 tiledUv = vMapUv * vec2(3.0, 1.5);
            float lon = vMapUv.x * 6.28318530718;
            float theta = (1.0 - vMapUv.y) * 3.14159265359;
            vec3 sph = vec3(-cos(lon) * sin(theta), cos(theta), sin(lon) * sin(theta));
            vec2 polarUv = sph.xz * 0.48 + 0.5;
            float poleW = smoothstep(0.88, 0.98, abs(sph.y));
            vec3 waveN = sampleOceanBump(nonPerturbedNormal, tiledUv, uNormalScale);
            vec3 poleN = sampleOceanBump(nonPerturbedNormal, polarUv, uNormalScale);
            vec3 waterN = normalize(mix(waveN, poleN, poleW));
            normal = normalize(mix(nonPerturbedNormal, waterN, ocean));
          }
          #endif
          `,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `
          #include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, oceanRoughness, ocean);
          `,
        )
        .replace(
          '#include <lights_fragment_end>',
          /* glsl */ `
          #include <lights_fragment_end>
          {
            // Fresnel sky reflection on water, only where the sun is up
            vec3 viewDir = normalize(vViewPosition);
            float NdotV = saturate(dot(normal, viewDir));
            float fresnel = pow(1.0 - NdotV, 4.0);
            vec3 sunDirView = normalize((viewMatrix * vec4(sunDirection, 0.0)).xyz);
            float daylight = smoothstep(-0.05, 0.35, dot(normal, sunDirView));
            reflectedLight.indirectSpecular += ocean * fresnel * daylight * skyStrength * skyColor;
          }
          `,
        );
    };

    this.customProgramCacheKey = () => 'EarthSurfaceMaterial-v3-ocean-normal';
  }
}

export function configureOceanNormal(map: THREE.Texture) {
  map.colorSpace = THREE.NoColorSpace;
  map.anisotropy = 8;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
}
