import CelestialBody from "./CelestialBody";
import useCacheLoader from "./TextureCacheUtils";
import CityLightsShaderMaterial from './shaders/CityLightsShaderMaterial';
import * as THREE from 'three';

export default function AdditionalLayer({ body, textureName, distFromSurface, matType="standard" }: { body: CelestialBody, textureName: string, distFromSurface: number, matType?: string }) {
  const textureRef = useCacheLoader(textureName);

  const cityLightsShaderMat = new CityLightsShaderMaterial({
    uniforms: {
      sunDirection: { value: new THREE.Vector3(-1, 0, 0) },
      map: { value: new THREE.Texture() },
    },
    transparent: true,
  });

  return (
    <mesh ref={textureRef} name={textureName.substring(0, textureName.length - 4)} userData={{ bodyId: body.id }} >
      <sphereGeometry args={[body.physicalData.radius + distFromSurface, 80, 40]}></sphereGeometry>
      {matType === "basic" && <meshBasicMaterial transparent />}
      {matType === "cityLights" && <primitive object={cityLightsShaderMat} attach="material" />}
      {matType === "standard" && <meshStandardMaterial transparent />}
    </mesh>
  );
}