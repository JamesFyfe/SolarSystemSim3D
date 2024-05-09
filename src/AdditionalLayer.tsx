import CelestialBody from "./CelestialBody";
import useCacheLoader from "./TextureCacheUtils";

export default function AdditionalLayer({ body, textureName, distFromSurface, matType="standard" }: { body: CelestialBody, textureName: string, distFromSurface: number, matType?: string }) {
	const textureRef = useCacheLoader(textureName);
  return <mesh ref={textureRef} name={textureName.substring(0, textureName.length - 4)} userData={{ bodyId: body.id }}>
			<sphereGeometry args={[body.physicalData.radius + distFromSurface, 80, 40]}></sphereGeometry>
			{matType === "basic" && <meshBasicMaterial transparent={true}/>}
			{matType === "standard" && <meshStandardMaterial transparent={true}/>}
		</mesh>
};
