import * as THREE from 'three';
import CelestialBody from '../CelestialBody';
import { Line } from "@react-three/drei";
import { useLayoutEffect, useRef } from 'react';

type OrbitEllipseProps = {
  body: CelestialBody;
};

export default function OrbitEllipse({ body }: OrbitEllipseProps) {
  const orbitData = body.orbitData!;
  const semiMinorAxis = orbitData.semiMajorAxis * Math.sqrt(1 - orbitData.eccentricity ** 2);
  const parentPos = Math.sqrt(orbitData.semiMajorAxis ** 2 - semiMinorAxis ** 2);

  const curve = new THREE.EllipseCurve(
    0,						// ax
    -parentPos, 	// aY
    semiMinorAxis,	//xRadius
    orbitData.semiMajorAxis, // yRadius
    0,						// aStartAngle
    2 * Math.PI, 	// aEndAngle
    false 				// aClockwise
  );

  const points = curve.getPoints(5000);
  const lineRotation = [
    orbitData.longitudeOfAscendingNode - Math.PI / 2,
    orbitData.inclination,
    orbitData.argumentOfPeriapsis
  ];

  const lineRef = useRef<any>(null);
  const group = new THREE.Group();

  group.rotateX(Math.PI / 2);
  if (orbitData.frame === "laplace") {
    group.rotateY(-body.parent!.physicalData.axisTilt);
  }
  group.rotateZ(orbitData.longitudeOfAscendingNode - Math.PI / 2);
  group.rotateX(orbitData.inclination);
  group.rotateZ(orbitData.argumentOfPeriapsis + Math.PI / 2);
  // group.position.set(...body.parent!.position.toArray());

  return (
    <primitive object={group}>
      <Line 
        ref={lineRef} 
        points={points} 
        color={body.physicalData.color} 
        lineWidth={1} 
        transparent={true}
        opacity={0.8}
      />
    </primitive>
  );
}
