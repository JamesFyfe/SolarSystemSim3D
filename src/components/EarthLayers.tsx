import { useFrame } from "@react-three/fiber";
import CelestialBody from "../CelestialBody";
import useCacheLoader from "../TextureCacheUtils";
import CityLightsShaderMaterial from '../shaders/CityLightsShaderMaterial';
import * as THREE from 'three';
import { useEffect } from "react";

export function Clouds({ earth, rotationSpeed = 0.01 }: { earth: CelestialBody, rotationSpeed?: number }) {
const meshRef = useCacheLoader("earth_clouds.png");
const distFromSurface = 0.02;

useFrame(( state, delta ) => {
	// meshRef.current?.rotateY(rotationSpeed * delta);
});

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

	useFrame((state, delta) => {
		if(earth.rotatingGroupRef.current) {
			const earthPosition = earth.position;
			const sunPosition = earth.parent!.position;

			const sunDirection = new THREE.Vector3().subVectors(sunPosition, earthPosition).normalize();

			// Create a quaternion representing the Earth's rotation
			const earthRotation = new THREE.Quaternion().setFromEuler(earth.rotatingGroupRef.current.rotation);
			
			// Apply the inverse of the Earth's rotation to the sunDirection
			const localSunDirection = sunDirection.applyQuaternion(earthRotation.invert());

			cityLightsMat.uniforms.sunDirection.value.copy(sunDirection);
		}

	});
	
	return (
		<mesh ref={meshRef} name={"Earth city lights"} userData={{ bodyId: earth.id }}>
			<sphereGeometry args={[earth.physicalData.radius + distFromSurface, 80, 40]}></sphereGeometry>
			<primitive object={cityLightsMat} attach="material" />
		</mesh>
	);
};