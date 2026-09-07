import * as THREE from 'three';

/**
 * Earth surface material: a MeshStandardMaterial (so it is lit by the same sun
 * point light as every other body) with ocean shading injected via
 * onBeforeCompile. An ocean mask (white = water) drives:
 *  - low roughness over water so the sun produces a broad specular glint
 *  - a subtle deep-blue tint of the water albedo
 *  - a Fresnel "sky reflection" that brightens water toward the limb on the day side
 */
export default class EarthSurfaceMaterial extends THREE.MeshStandardMaterial {
  readonly oceanUniforms = {
    oceanMask: { value: null as THREE.Texture | null },
    /** World-space direction from Earth toward the Sun */
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    oceanRoughness: { value: 0.38 },
    oceanTint: { value: new THREE.Color(0.8, 0.9, 1.08) },
    skyColor: { value: new THREE.Color(0.35, 0.55, 1.0) },
    skyStrength: { value: 0.35 },
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
          uniform vec3 sunDirection;
          uniform float oceanRoughness;
          uniform vec3 oceanTint;
          uniform vec3 skyColor;
          uniform float skyStrength;
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

    this.customProgramCacheKey = () => 'EarthSurfaceMaterial';
  }
}
