import * as THREE from 'three'
import CelestialBody from "../classes/CelestialBody";
import useCacheLoader from '../TextureCacheUtils';

export default function Rings({ body }: { body: CelestialBody }) {
	const meshRef = useCacheLoader(body.ringData.textureName, false);

  const distance = body.ringData.distance / 1000;
  const width = body.ringData.width / 1000;

  return <mesh
		ref={meshRef}
		userData={{ bodyId: body.id }}
		rotation={[Math.PI / 2, 0, 0]}
	>
	<ringGeometry args={[distance, distance + width, 100]} />
	<meshBasicMaterial
		color={body.ringData.color} 
		transparent={true}
		opacity={body.ringData.opacity}
		side={THREE.DoubleSide}
	/>
</mesh>
};
