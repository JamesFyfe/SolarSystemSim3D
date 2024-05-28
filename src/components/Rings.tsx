import * as THREE from 'three'
import CelestialBody, { RingDataParams } from "../classes/CelestialBody";
import useCacheLoader from '../TextureCacheUtils';

export default function Rings({ body }: { body: CelestialBody }) {
	const ringData = body.ringData as RingDataParams;
	const meshRef = useCacheLoader(ringData.textureName, false);

  const distance = ringData.distance / 1000;
  const width = ringData.width / 1000;

  return <mesh
		ref={meshRef}
		userData={{ bodyId: body.id }}
		rotation={[Math.PI / 2, 0, 0]}
	>
	<ringGeometry args={[distance, distance + width, 100]} />
	<meshBasicMaterial
		color={ringData.color} 
		transparent={true}
		opacity={ringData.opacity}
		side={THREE.DoubleSide}
	/>
</mesh>
};
