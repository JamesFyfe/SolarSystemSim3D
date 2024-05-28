import { Canvas, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { useRef, memo } from 'react';
import Constants from '../Constants';
import DateDisplay from './DateDisplay';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Perf } from 'r3f-perf';
import BackgroundStars from './BackgroudStars';
import RenderedBodies from './RenderedBodies';

extend({ UnrealBloomPass })

const SolarSystem = memo(() => {
  const orbitControlsRef = useRef(null);
  const dateRef = useRef(Constants.startDate);

  console.log("SOLAR SYSTEM");

  return (
    <div className='h-full overflow-hidden'>
      <Canvas camera={{ position: Constants.startingRelativePosition, far: 25000000, near: Constants.cameraNear }} gl={{logarithmicDepthBuffer: true}}>
        <Effects multisamping={8} renderIndex={1} disableGamma={true}>
          <unrealBloomPass threshold={0.4} strength={1.5} radius={0.7} />
        </Effects>
        <Perf />
        <OrbitControls makeDefault ref={orbitControlsRef} enableDamping={true} dampingFactor={0.05} screenSpacePanning={false} zoomSpeed={0.7} maxDistance={20000000}/>
        <ambientLight intensity={0.07}></ambientLight>
        <RenderedBodies dateRef={dateRef} />
        <BackgroundStars />
      </Canvas>
      <DateDisplay dateRef={dateRef} />
    </div>
  );
},
(prevProps, nextProps) => prevProps === nextProps
);

export default SolarSystem;
