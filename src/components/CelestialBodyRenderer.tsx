import { memo, useCallback, useLayoutEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import CelestialBody from '../classes/CelestialBody';
import useCachedTexture from '../hooks/useCachedTexture';
import type { SelectBody } from '../hooks/useAnimationLoop';
import { multiplyRGB } from '../utils/UtilFunctions';
import { planetSphereGeometry } from '../utils/sharedGeometries';
import Atmosphere from './Atmosphere';
import BodyIndicator from './BodyIndicator';
import EarthLayers from './EarthLayers';
import OrbitEllipse from './OrbitEllipse';
import Rings from './Rings';
import SunGlow from './SunGlow';

/** Pointer travel (px) above which a pointerdown/up pair counts as an orbit drag, not a click */
const CLICK_DRAG_TOLERANCE_PX = 5;

/** Warm HDR tint so the photosphere is as bright as the glow disc, without growing the silhouette */
const SUN_COLOR: [number, number, number] = [1, 1, 1];

/** Skip picking so clicks pass through non-selectable bodies to whatever is behind them */
function noRaycast() {}

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
  const { radius, color, lightIntensity } = body.physicalData;
  const isStar = body.isStar;
  const texture = useCachedTexture(fullyRendered && body.renderer !== 'earth' ? body.physicalData.textureName : null);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!body.clickable || event.delta > CLICK_DRAG_TOLERANCE_PX) {
        return;
      }
      // Only the nearest body under the pointer should be selected
      event.stopPropagation();
      onSelect(body.id, true);
    },
    [body.clickable, body.id, onSelect],
  );

  const raycast = body.clickable ? undefined : noRaycast;

  useLayoutEffect(() => {
    const group = body.rotatingGroupRef.current;
    if (group) {
      group.quaternion.copy(body.equatorQuaternion);
    }
  }, [body]);

  return (
    <group ref={body.threeGroupRef} name={body.name} onClick={body.clickable ? handleClick : undefined}>
      {/* Spin is around local Y after equatorQuaternion tips that axis to the orbit-relative pole */}
      <group ref={body.rotatingGroupRef} name={`${body.name} rotating group`}>
        {fullyRendered ? (
          <>
            {body.renderer === 'earth' ? (
              <EarthLayers earth={body} />
            ) : (
              <mesh
                name={`${body.name} mesh`}
                geometry={planetSphereGeometry}
                scale={isStar ? 0.9 * radius : radius}
                dispose={null}
                raycast={raycast}
              >
                {/* See useCachedTexture: a new key when the map arrives forces a shader rebuild */}
                {isStar ? (
                  <meshBasicMaterial
                    key={texture ? 'textured' : 'plain'}
                    map={texture}
                    color={SUN_COLOR}
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
          <points frustumCulled={false} raycast={raycast}>
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
      {fullyRendered && isStar && <pointLight ref={body.lightRef} intensity={lightIntensity} decay={0.35} />}
    </group>
  );
});

export default CelestialBodyRenderer;
