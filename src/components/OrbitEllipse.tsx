import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import OrbitData from '../classes/OrbitData';
import { Line } from "@react-three/drei";
import { forwardRef } from 'react';
import useForwardedRef from '../hooks/useForwardedRef';

type OrbitEllipseProps = {
  body: CelestialBody;
};

const OrbitEllipse = forwardRef<THREE.Group, OrbitEllipseProps>(
  ({ body }, ref) => {
    const ellipseRef = useForwardedRef(ref);
    const orbitData = body.orbitData as OrbitData;
    const a = orbitData.semiMajorAxis;
    const b = a * Math.sqrt(1 - orbitData.eccentricity ** 2);
    const focalDistance = Math.sqrt(a ** 2 - b ** 2);

    // Drawn in the group's local xy-plane with the parent (focus) at the origin
    // and periapsis on +x, matching the basis used by OrbitData.orientEllipse.
    const curve = new THREE.EllipseCurve(
      -focalDistance, // aX (ellipse centre)
      0,              // aY
      a,              // xRadius
      b,              // yRadius
      0,              // aStartAngle
      2 * Math.PI,    // aEndAngle
      false           // aClockwise
    );

    const points = curve.getPoints(5000);

    const group = new THREE.Group();
    orbitData.orientEllipse(group, new Date());

    return (
      <primitive object={group} ref={ellipseRef}>
        <Line
          points={points} 
          color={body.physicalData.color} 
          lineWidth={1} 
          transparent={true}
          opacity={0.8}
        />
       </primitive>
    );
  }
);

export default OrbitEllipse;
