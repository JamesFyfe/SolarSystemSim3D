import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import OrbitData from '../classes/OrbitData';
import { getDate } from '../state/simulationClock';

interface OrbitEllipseProps {
  body: CelestialBody;
}

/** Smooth enough for screen-space ellipses; 5000-point fat lines stalled the first camera pan. */
const ORBIT_SEGMENTS = 256;

/** Orbit lines are decorative: let clicks pass through to the bodies behind them */
function noRaycast() {}

export default function OrbitEllipse({ body }: OrbitEllipseProps) {
  const orbitData = body.orbitData as OrbitData;
  const color = body.physicalData.color;

  const line = useMemo(() => {
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

    const positions = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    const point = new THREE.Vector2();
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      curve.getPoint(i / ORBIT_SEGMENTS, point);
      const offset = i * 3;
      positions[offset] = point.x;
      positions[offset + 1] = point.y;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const object = new THREE.Line(geometry, material);
    object.raycast = noRaycast;
    return object;
  }, [orbitData, color]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );

  // Orient once on mount; the Moon's fast-precessing orbit is re-oriented every frame in CelestialBody.update
  useLayoutEffect(() => {
    if (body.ellipseRef?.current) {
      orbitData.orientEllipse(body.ellipseRef.current, getDate());
    }
  }, [body, orbitData]);

  return (
    <group ref={body.ellipseRef}>
      <primitive object={line} />
    </group>
  );
}
