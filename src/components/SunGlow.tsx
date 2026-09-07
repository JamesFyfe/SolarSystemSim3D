import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import CelestialBody from '../classes/CelestialBody';
import createSunGlowMaterial from '../shaders/SunGlowMaterial';

/** Quad half-size in sun radii; the glare profile is negligible beyond this */
const QUAD_SUN_RADII = 30;
/** Quad half-size never drops below this many pixels so a sub-pixel disc still has room to be spread over its footprint */
const QUAD_MIN_PX = 8;

const _worldPos = new THREE.Vector3();

/**
 * Camera-facing additive quad centred on the Sun. The quad is only a canvas:
 * the shader computes the glow from true angular geometry, so its on-screen
 * size and brightness fall off continuously with distance.
 *
 * Depth testing stays on, so the Sun's own sphere hides the part of the quad
 * behind the disc (leaving the surface texture visible close up) and planets
 * passing in front still occlude the glow.
 */
export default function SunGlow({ body }: { body: CelestialBody }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const viewportHeight = useThree((state) => state.size).height;

  const sunRadius = body.physicalData.radius;
  const material = useMemo(() => createSunGlowMaterial({ sunRadius }), [sunRadius]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.getWorldPosition(_worldPos);
    const dist = _worldPos.distanceTo(camera.position);

    // Radians subtended by one pixel at the centre of the view
    const pixelAngle = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight;
    material.uniforms.uPixelAngle.value = pixelAngle;

    const worldPerPx = pixelAngle * dist;
    mesh.scale.setScalar(Math.max(sunRadius * QUAD_SUN_RADII, QUAD_MIN_PX * worldPerPx));
    // Parent group has no rotation (axis tilt is applied on the inner rotating group), so this billboards the quad
    mesh.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh
      ref={meshRef}
      name={`${body.name} glow`}
      renderOrder={3}
      raycast={() => null}
    >
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
