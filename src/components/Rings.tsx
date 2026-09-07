import { useCallback, useEffect, useMemo } from 'react';
import CelestialBody, { RingDataParams } from '../classes/CelestialBody';
import useCachedTexture from '../hooks/useCachedTexture';
import createRingMaterial from '../shaders/RingShaderMaterial';
import { getRootBody, getSunDirection } from '../utils/UtilFunctions';

export default function Rings({ body }: { body: CelestialBody }) {
  const ringData = body.ringData as RingDataParams;
  const texture = useCachedTexture(ringData.textureName);
  const sun = getRootBody(body);

  const distance = ringData.distance / 1000;
  const width = ringData.width / 1000;

  const material = useMemo(
    () =>
      createRingMaterial({
        opacity: ringData.opacity,
        planetRadius: body.physicalData.radius,
      }),
    [ringData, body.physicalData.radius],
  );

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (texture) {
      material.uniforms.uMap.value = texture;
    }
  }, [material, texture]);

  const onBeforeRender = useCallback(() => {
    const uniforms = material.uniforms;
    getSunDirection(body, uniforms.uLightDir.value);
    uniforms.uSunRel.value.copy(sun.position).sub(body.position);
  }, [body, sun, material]);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} onBeforeRender={onBeforeRender}>
      <ringGeometry args={[distance, distance + width, 100]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
