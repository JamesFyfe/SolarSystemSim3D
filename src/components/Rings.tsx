import * as THREE from 'three';
import CelestialBody, { RingDataParams } from '../classes/CelestialBody';
import useCachedTexture from '../hooks/useCachedTexture';

export default function Rings({ body }: { body: CelestialBody }) {
  const ringData = body.ringData as RingDataParams;
  const texture = useCachedTexture(ringData.textureName);

  const distance = ringData.distance / 1000;
  const width = ringData.width / 1000;

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[distance, distance + width, 100]} />
      {/* See useCachedTexture for why the key changes with the texture */}
      <meshBasicMaterial
        key={texture ? 'textured' : 'plain'}
        map={texture}
        color={ringData.color}
        transparent
        opacity={ringData.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
