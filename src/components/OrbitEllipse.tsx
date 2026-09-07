import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import CelestialBody from '../classes/CelestialBody';
import OrbitData from '../classes/OrbitData';
import { getDate } from '../state/simulationClock';

interface OrbitEllipseProps {
  body: CelestialBody;
}

/** Orbit lines are decorative: let clicks pass through to the bodies behind them */
const noRaycast = () => null;

export default function OrbitEllipse({ body }: OrbitEllipseProps) {
  const orbitData = body.orbitData as OrbitData;

  const points = useMemo(() => {
    const a = orbitData.semiMajorAxis;
    const b = a * Math.sqrt(1 - orbitData.eccentricity ** 2);
    const focalDistance = Math.sqrt(a ** 2 - b ** 2);

    // Drawn in the group's local xy-plane with the parent (focus) at the origin
    // and periapsis on +x, matching the basis used by OrbitData.orientEllipse.
    const curve = new THREE.EllipseCurve(
      -focalDistance, // aX (ellipse centre)
      0, // aY
      a, // xRadius
      b, // yRadius
      0, // aStartAngle
      2 * Math.PI, // aEndAngle
      false, // aClockwise
    );
    return curve.getPoints(5000);
  }, [orbitData]);

  // Orient once on mount; the Moon's fast-precessing orbit is re-oriented every frame in CelestialBody.update
  useLayoutEffect(() => {
    if (body.ellipseRef?.current) {
      orbitData.orientEllipse(body.ellipseRef.current, getDate());
    }
  }, [body, orbitData]);

  return (
    <group ref={body.ellipseRef}>
      <Line
        points={points}
        color={body.physicalData.color}
        lineWidth={1}
        transparent
        opacity={0.8}
        raycast={noRaycast}
      />
    </group>
  );
}
