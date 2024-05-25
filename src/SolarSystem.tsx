import { Canvas, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import CelestialBody, { CelestialBodyRenderer, createCelestialBodyFromJSON } from './CelestialBody';
import { useState, useRef, memo } from 'react';
import { useAnimationLoop } from './useAnimationLoop';
import Constants from './Constants';
import DateDisplay from './DateDisplay';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Perf } from 'r3f-perf';
import BackgroundStars from './components/BackgroudStars';

extend({ UnrealBloomPass })


const SolarSystem = memo(() => {
  const orbitControlsRef = useRef<any>(null);
  const dateRef = useRef(Constants.startDate);

  console.log("SOLAR SYSTEM");

  return (
    <>
      <Canvas camera={{ position: Constants.startingRelativePosition, far: 25000000, near: Constants.cameraNear }} gl={{logarithmicDepthBuffer: true}}>
        <Effects multisamping={8} renderIndex={1} disableGamma={true}>
          <unrealBloomPass threshold={0.4} strength={1.5} radius={0.7} />
        </Effects>
        <Perf />
        <OrbitControls makeDefault ref={orbitControlsRef} enableDamping={true} dampingFactor={0.05} screenSpacePanning={false} zoomSpeed={0.7} maxDistance={20000000}/>
        <ambientLight intensity={0.07}></ambientLight>
        <SolarSystemScene dateRef={dateRef} />
        <BackgroundStars />
      </Canvas>
      <DateDisplay dateRef={dateRef} />
    </>
  );
},
(prevProps, nextProps) => prevProps === nextProps
);

export default SolarSystem;

const SolarSystemScene = ({dateRef}: {dateRef: React.MutableRefObject<Date>}) => {
  const data = require('./data/PlanetData.json');
  const sun = createCelestialBodyFromJSON(data[0]);
  const [visibleBodies, setVisibleBodies] = useState<CelestialBody[]>([sun, ...sun.children]);

  const { setSelectedBody } = useAnimationLoop({visibleBodies, setVisibleBodies, dateRef});
  console.log("Returning Solar System Scene");
  return (
    <>
      {visibleBodies.map((body: CelestialBody) => (
        <CelestialBodyRenderer key={body.id} body={body} setSelectedBody={setSelectedBody}/>
      ))}
    </>
  );
};
