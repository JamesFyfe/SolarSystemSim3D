import { useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import CelestialBody, { AtmosphereParams } from '../classes/CelestialBody';
import createAtmosphereMaterial from '../shaders/AtmosphereShaderMaterial';
import { getSunDirection } from '../utils/UtilFunctions';
import { atmosphereSphereGeometry } from '../utils/sharedGeometries';

const _camRel = new THREE.Vector3();
const _center = new THREE.Vector3();

export default function Atmosphere({ body }: { body: CelestialBody }) {
  const atmosphere = body.atmosphereData as AtmosphereParams;
  const planetRadius = body.physicalData.radius;
  const atmosphereRadius = planetRadius * (1 + atmosphere.height);

  const material = useMemo(
    () =>
      createAtmosphereMaterial({
        color: atmosphere.color,
        planetRadius,
        atmosphereRadius,
        intensity: atmosphere.intensity,
        density: atmosphere.density,
        opacity: atmosphere.opacity,
        falloff: atmosphere.falloff,
      }),
    [atmosphere, planetRadius, atmosphereRadius],
  );

  useEffect(() => () => material.dispose(), [material]);

  // Runs right before the shell is drawn, after all world matrices are up to
  // date, so the camera-relative origin always matches where the planet was
  // actually drawn this frame (important at high time multipliers).
  const onBeforeRender = useCallback(
    (_renderer: THREE.WebGLRenderer, _scene: THREE.Scene, camera: THREE.Camera) => {
      const group = body.threeGroupRef.current;
      if (!group) return;

      _center.setFromMatrixPosition(group.matrixWorld);
      _camRel.copy(camera.position).sub(_center);

      const uniforms = material.uniforms;
      uniforms.uCameraRel.value.copy(_camRel);
      getSunDirection(body, uniforms.uLightDir.value);

      // When the camera is inside the shell the front faces are behind it, so
      // draw the back faces instead. The raymarch already clips against the
      // planet surface, so depth testing can be dropped in that case.
      const inside = _camRel.lengthSq() < atmosphereRadius * atmosphereRadius;
      material.side = inside ? THREE.BackSide : THREE.FrontSide;
      material.depthTest = !inside;
    },
    [body, material, atmosphereRadius],
  );

  return (
    <mesh
      name={`${body.name} atmosphere`}
      geometry={atmosphereSphereGeometry}
      scale={atmosphereRadius}
      renderOrder={2}
      dispose={null}
      onBeforeRender={onBeforeRender}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}
