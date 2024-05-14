import { Canvas } from '@react-three/fiber';
import { Stats, OrbitControls } from '@react-three/drei';
import CelestialBody, { CelestialBodyRenderer, createCelestialBodyFromJSON } from './CelestialBody';
import { useState, useRef } from 'react';
import { useAnimationLoop } from './useAnimationLoop';
import Constants from './Constants';
import React from 'react';
// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// interface SolarSystemProps {
//   onDateChange: (newDate: Date) => void
// }

export default function SolarSystem() {
  const data = require('./data/PlanetData.json');
  const sun = useRef(createCelestialBodyFromJSON(data[0]));
  const [visibleBodies, setVisibleBodies] = useState<CelestialBody[]>([sun.current, ...sun.current.children]);
  const orbitControlsRef = useRef<any>(null);

  // if (!sun.current.threeGroupRef.current) {
  //   console.log("loading body data");
  //   return <div>Loading...</div>;
  // }
  console.log("SOLAR SYSTEM");
  return (
    <Canvas camera={{ position: Constants.startingRelativePosition, far: 20000000, near: Constants.cameraNear }} gl={{logarithmicDepthBuffer: true}}>
      <Stats />
      <OrbitControls makeDefault ref={orbitControlsRef} enableDamping={true} dampingFactor={0.05} screenSpacePanning={false} zoomSpeed={0.7} maxDistance={10000000}/>
      <ambientLight intensity={0.07}></ambientLight>
      <SolarSystemScene sun={sun} setVisibleBodies={setVisibleBodies} visibleBodies={visibleBodies} />
    </Canvas>
  );
}

interface AnimationLoopOptions {
  sun: React.MutableRefObject<CelestialBody>;
  setVisibleBodies: React.Dispatch<React.SetStateAction<CelestialBody[]>>;
  visibleBodies: CelestialBody[];
}

const SolarSystemScene = ({ sun, setVisibleBodies, visibleBodies }: AnimationLoopOptions) => {
  const { setSelectedBody } = useAnimationLoop({ sun, visibleBodies, setVisibleBodies});
  console.log("Returning Solar System Scene");
  return (
    <>
    {/* Could just call it once since im passing visibleBodies anyways */}
      {visibleBodies.map((body: CelestialBody) => (
        <CelestialBodyRenderer key={body.id} body={body} setSelectedBody={setSelectedBody}/>
      ))}
    </>
  );
};
