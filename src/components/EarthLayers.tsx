import CelestialBody from "../CelestialBody";
import useCacheLoader from "../TextureCacheUtils";
import CityLightsShaderMaterial from '../shaders/CityLightsShaderMaterial';
import * as THREE from 'three';

export function Clouds({ earth }: { earth: CelestialBody }) {
const meshRef = useCacheLoader("earth_clouds.png");
const distFromSurface = 0.02

  return (
    <mesh ref={meshRef} name={"Earth clouds"} userData={{ bodyId: earth.id }}>
      <sphereGeometry args={[earth.physicalData.radius + distFromSurface, 80, 40]}></sphereGeometry>
      <meshStandardMaterial transparent />
    </mesh>
  );
};

export function CityLights({ earth }: { earth: CelestialBody }) {
	const meshRef = useCacheLoader("earth_lights.png");
	const distFromSurface = 0.01;

	const cityLightsMat = new CityLightsShaderMaterial({
    uniforms: {
      sunDirection: { value: new THREE.Vector3(-1, 0, 0) },
      map: { value: new THREE.Texture() },
    },
    transparent: true,
  });
	
		return (
			<mesh ref={meshRef} name={"Earth city lights"} userData={{ bodyId: earth.id }}>
				<sphereGeometry args={[earth.physicalData.radius + distFromSurface, 80, 40]}></sphereGeometry>
				<primitive object={cityLightsMat} attach="material" />
			</mesh>
		);
	};
