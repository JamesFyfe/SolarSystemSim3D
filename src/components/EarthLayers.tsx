import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import useCachedTexture from '../hooks/useCachedTexture';
import { loadTexture } from '../utils/textureCache';
import InvertedLightShaderMaterial from '../shaders/InvertedLightShaderMaterial';
import EarthSurfaceMaterial, { configureOceanNormal } from '../shaders/EarthSurfaceMaterial';
import { getSunDirection } from '../utils/UtilFunctions';
import { planetSphereGeometry, shellSphereGeometry } from '../utils/sharedGeometries';

const OCEAN_MASK_TEXTURE = 'earth_specular.jpg';
const OCEAN_NORMAL_TEXTURE = 'ocean-normal.jpg';
const CLOUDS_TEXTURE = 'earth_clouds.png';
const CITY_LIGHTS_TEXTURE = 'earth_lights.png';

interface EarthLayerProps {
  earth: CelestialBody;
}

/** Earth is drawn as a stack of shells: surface, night-side city lights, and drifting clouds. */
export default function EarthLayers({ earth }: EarthLayerProps) {
  return (
    <>
      <EarthSurface earth={earth} />
      <CityLights earth={earth} />
      <Clouds earth={earth} />
    </>
  );
}

/** Earth's surface: day texture plus shader-driven ocean specular / sky reflection. */
export function EarthSurface({ earth }: EarthLayerProps) {
  const material = useMemo(() => new EarthSurfaceMaterial(), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [dayMap, oceanMask, oceanNormal] = await Promise.all([
        loadTexture(earth.physicalData.textureName),
        loadTexture(OCEAN_MASK_TEXTURE),
        loadTexture(OCEAN_NORMAL_TEXTURE),
      ]);
      if (cancelled) return;
      configureOceanNormal(oceanNormal);
      material.map = dayMap;
      material.oceanUniforms.oceanMask.value = oceanMask;
      material.oceanUniforms.oceanNormal.value = oceanNormal;
      material.needsUpdate = true;
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [material, earth]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    getSunDirection(earth, material.oceanUniforms.sunDirection.value);
  });

  return (
    <mesh name={`${earth.name} mesh`} geometry={planetSphereGeometry} scale={earth.physicalData.radius} dispose={null}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function Clouds({ earth, rotationSpeed = 0.002 }: EarthLayerProps & { rotationSpeed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useCachedTexture(CLOUDS_TEXTURE);
  const distFromSurface = 0.02;

  useFrame((_state, delta) => {
    // Slow drift on top of the rotating group's spin
    meshRef.current?.rotateY(-rotationSpeed * delta);
  });

  // Without its alpha map the shell would be a solid white sphere over the surface
  if (!texture) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      name={`${earth.name} clouds`}
      geometry={shellSphereGeometry}
      scale={earth.physicalData.radius + distFromSurface}
      dispose={null}
    >
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  );
}

export function CityLights({ earth }: EarthLayerProps) {
  const texture = useCachedTexture(CITY_LIGHTS_TEXTURE);
  const distFromSurface = 0.01;

  const material = useMemo(
    () =>
      new InvertedLightShaderMaterial({
        uniforms: {
          sunDirection: { value: new THREE.Vector3(-1, 0, 0) },
          map: { value: null },
        },
        transparent: true,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.map.value = texture;
  }, [material, texture]);

  useFrame(() => {
    const rotatingGroup = earth.rotatingGroupRef.current;
    if (!rotatingGroup) {
      return;
    }
    // Sun direction in the surface's local frame: undo Earth's spin/tilt
    const sunDirection = material.uniforms.sunDirection.value as THREE.Vector3;
    getSunDirection(earth, sunDirection);
    rotatingGroup.getWorldQuaternion(_inverseRotation).invert();
    sunDirection.applyQuaternion(_inverseRotation);
  });

  if (!texture) {
    return null;
  }

  return (
    <mesh
      name={`${earth.name} city lights`}
      geometry={shellSphereGeometry}
      scale={earth.physicalData.radius + distFromSurface}
      dispose={null}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}

const _inverseRotation = new THREE.Quaternion();
