import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Constants from '../Constants';
import { timeMultipleFor } from '../utils/speedSteps';
import TimeControls from './TimeControls';
import BackgroundStars from './BackgroundStars';
import RenderedBodies from './RenderedBodies';

export default function SolarSystem() {
  // Simulation clock. Kept in refs so advancing it every frame doesn't re-render the scene;
  // TimeControls writes to them and the animation loop reads them.
  const dateRef = useRef(Constants.startDate);
  const timeMultRef = useRef(timeMultipleFor(Constants.timeMultipleIndex, false));

  return (
    <div className="h-full overflow-hidden">
      <Canvas
        camera={{ position: Constants.startingRelativePosition, far: 25000000, near: Constants.cameraNear }}
        gl={{ logarithmicDepthBuffer: true }}
      >
        {/* Scene is rendered to an HDR buffer, bloom is added in linear light, then tone mapped once. The mipmap
            blur is isotropic, so small bright sources (the Sun from far away) bloom into a disc rather than a square. */}
        <EffectComposer multisampling={8}>
          <Bloom mipmapBlur luminanceThreshold={0.4} luminanceSmoothing={0.2} intensity={1.2} radius={0.7} levels={8} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          screenSpacePanning={false}
          zoomSpeed={0.7}
          maxDistance={20000000}
        />
        <ambientLight intensity={0.07} />
        <RenderedBodies dateRef={dateRef} timeMultRef={timeMultRef} />
        <BackgroundStars />
      </Canvas>
      <TimeControls dateRef={dateRef} timeMultRef={timeMultRef} />
    </div>
  );
}
