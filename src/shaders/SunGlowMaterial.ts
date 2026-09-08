import * as THREE from 'three';

/**
 * Additive glow drawn on a camera-facing quad centred on the Sun.
 *
 * Everything is evaluated per fragment from the true angular geometry, so the
 * look is continuous with distance and does not depend on the quad size:
 *
 *   x     = angle from the Sun's centre / angular radius of the disc
 *   sigma = angular size of one pixel / angular radius of the disc
 *
 * The disc is a constant-brightness HDR source (`uDiscIntensity`). It shrinks
 * with distance; when it is smaller than a pixel, `sigma` spreads the edge
 * over the pixel footprint so it still hits a pixel instead of aliasing out.
 * Intensity is not divided by that area — energy conservation would dim it as
 * ~1/d^2, which is the falloff we don't want.
 *
 * A wide 1/x^2 glare term (like a camera point-spread function) is added on
 * top, softened by the same pixel footprint. The two terms blend smoothly.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  varying vec2 vUv;
  varying vec3 vCenterView;  // Sun centre in view space
  varying vec3 vOffsetView;  // fragment position relative to the Sun centre, view space

  void main() {
    vUv = uv;
    vCenterView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // Computed from the rotation/scale part only so there is no large-number subtraction
    vOffsetView = mat3(modelViewMatrix) * position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform vec3 uCoreColor;
  uniform vec3 uGlareColor;
  uniform float uSunRadius;      // world units
  uniform float uPixelAngle;     // radians subtended by one screen pixel
  uniform float uDiscIntensity;  // HDR intensity of the disc (>> 1)
  uniform float uGlareStrength;  // glare intensity at the limb, relative to 1.0 = white

  varying vec2 vUv;
  varying vec3 vCenterView;
  varying vec3 vOffsetView;

  void main() {
    #include <logdepthbuf_fragment>

    vec3 c = vCenterView;
    float dist = length(c);

    // Angle between the ray to the Sun centre and the ray to this fragment.
    // atan(|c x p|, c . p) stays precise for very small angles, unlike acos.
    float angle = atan(length(cross(c, vOffsetView)), dot(c, c) + dot(c, vOffsetView));

    float discAngle = asin(min(uSunRadius / dist, 1.0));
    float x = angle / discAngle;          // distance from centre in disc radii
    float sigma = uPixelAngle / discAngle; // pixel footprint in disc radii

    // Disc, anti-aliased by the pixel footprint. Edge softness is at least a
    // pixel (or a hair when the disc is huge). Brightness is constant; the
    // disc just occupies fewer pixels as you recede.
    float edge = max(sigma, 0.02);
    float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, x);
    float core = uDiscIntensity * disc;

    // Wide glare wing (~1/x^2), softened by the pixel footprint
    float glare = uGlareStrength / (x * x + sigma * sigma + 1.0);

    // Soft fade at the quad boundary (the profile is already ~0 there)
    float r = length(vUv * 2.0 - 1.0);
    float fade = 1.0 - smoothstep(0.7, 1.0, r);

    vec3 col = (uCoreColor * core + uGlareColor * glare) * fade;
    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface SunGlowMaterialOptions {
  sunRadius: number;
  coreColor?: THREE.ColorRepresentation;
  glareColor?: THREE.ColorRepresentation;
  discIntensity?: number;
  glareStrength?: number;
}

export type SunGlowMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uCoreColor: THREE.IUniform<THREE.Color>;
    uGlareColor: THREE.IUniform<THREE.Color>;
    uSunRadius: THREE.IUniform<number>;
    uPixelAngle: THREE.IUniform<number>;
    uDiscIntensity: THREE.IUniform<number>;
    uGlareStrength: THREE.IUniform<number>;
  };
};

export default function createSunGlowMaterial({
  sunRadius,
  coreColor = 'rgb(255, 210, 120)',
  glareColor = 'rgb(255, 210, 120)',
  discIntensity = 400,
  glareStrength = 0.75,
}: SunGlowMaterialOptions): SunGlowMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uCoreColor: { value: new THREE.Color(coreColor) },
      uGlareColor: { value: new THREE.Color(glareColor) },
      uSunRadius: { value: sunRadius * 0.9 },
      uPixelAngle: { value: 0.001 },
      uDiscIntensity: { value: discIntensity },
      uGlareStrength: { value: glareStrength },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }) as SunGlowMaterial;
}
