import { memo, useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import CelestialBody from '../classes/CelestialBody';
import useCachedTexture from '../hooks/useCachedTexture';
import type { SelectBody } from '../hooks/useAnimationLoop';
import { multiplyRGB } from '../utils/UtilFunctions';
import Atmosphere from './Atmosphere';
import BodyIndicator from './BodyIndicator';
import EarthLayers from './EarthLayers';
import OrbitEllipse from './OrbitEllipse';
import Rings from './Rings';
import SunGlow from './SunGlow';

/** Pointer travel (px) above which a pointerdown/up pair counts as an orbit drag, not a click */
const CLICK_DRAG_TOLERANCE_PX = 5;

/** A single vertex at the origin, shared by every point-rendered body */
const POINT_POSITION = new Float32Array([0, 0, 0]);

interface CelestialBodyRendererProps {
  body: CelestialBody;
  fullyRendered?: boolean;
  onSelect: SelectBody;
}

const CelestialBodyRenderer = memo(function CelestialBodyRenderer({
  body,
  fullyRendered = true,
  onSelect,
}: CelestialBodyRendererProps) {
  const { radius, color, axisTilt, lightIntensity } = body.physicalData;
  const isStar = body.isStar;
  const texture = useCachedTexture(fullyRendered && body.renderer !== 'earth' ? body.physicalData.textureName : null);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > CLICK_DRAG_TOLERANCE_PX) {
        return;
      }
      // Only the nearest body under the pointer should be selected
      event.stopPropagation();
      onSelect(body.id, true);
    },
    [body.id, onSelect],
  );

  return (
    <group ref={body.threeGroupRef} name={body.name} onClick={handleClick}>
      {/* Spin happens around local Y; the Z tilt is applied first (ZXY order) */}
      <group
        ref={body.rotatingGroupRef}
        name={`${body.name} rotating group`}
        rotation-order="ZXY"
        rotation-z={-axisTilt}
      >
        {fullyRendered ? (
          <>
            {body.renderer === 'earth' ? (
              <EarthLayers earth={body} />
            ) : (
              <mesh name={`${body.name} mesh`}>
                <sphereGeometry args={[radius, 100, 50]} />
                {/* See useCachedTexture: a new key when the map arrives forces a shader rebuild */}
                {isStar ? (
                  <meshStandardMaterial
                    key={texture ? 'textured' : 'plain'}
                    map={texture}
                    emissiveMap={texture}
                    emissive="rgb(160, 160, 90)"
                    emissiveIntensity={3}
                  />
                ) : (
                  <meshStandardMaterial
                    key={texture ? 'textured' : 'plain'}
                    map={texture}
                    color={texture ? 'white' : color}
                  />
                )}
              </mesh>
            )}
            {body.ringData && <Rings body={body} />}
          </>
        ) : (
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[POINT_POSITION, 3]} />
            </bufferGeometry>
            <pointsMaterial color={multiplyRGB(color, 1.5)} size={radius ** 0.5 / 5} sizeAttenuation={false} />
          </points>
        )}
      </group>

      <BodyIndicator body={body} />
      {body.orbitData && <OrbitEllipse body={body} />}
      {fullyRendered && body.atmosphereData && <Atmosphere body={body} />}
      {isStar && <SunGlow body={body} />}
      {/* The light sits at the group origin, which already tracks the body's position */}
      {fullyRendered && isStar && <pointLight ref={body.lightRef} intensity={lightIntensity} />}
    </group>
  );
});

export default CelestialBodyRenderer;
