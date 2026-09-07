import { useMemo, useReducer, useState } from 'react';
import { CelestialBodyData, collectBodiesById, createCelestialBodyFromJSON } from '../classes/CelestialBody';
import useAnimationLoop from '../hooks/useAnimationLoop';
import { initialVisibleBodies, visibleBodiesReducer } from '../state/visibleBodies';
import CelestialBodyRenderer from './CelestialBodyRenderer';
import GpuWarmup from './GpuWarmup';
import data from '../data/PlanetData.json';

export default function RenderedBodies() {
  // Lazy initialiser: the body tree is built once, not on every render
  const [root] = useState(() => createCelestialBodyFromJSON(data as CelestialBodyData));
  const bodiesById = useMemo(() => collectBodiesById(root), [root]);
  const [visibleBodies, dispatch] = useReducer(visibleBodiesReducer, root, initialVisibleBodies);

  const { setSelectedBody } = useAnimationLoop({ root, bodiesById, visibleBodies, dispatch });

  const warmupRevision = visibleBodies.length + visibleBodies.reduce((sum, entry) => sum + (entry.fullyRendered ? 1 : 0), 0);

  return (
    <>
      {visibleBodies.map(({ body, fullyRendered }) => (
        <CelestialBodyRenderer key={body.id} body={body} fullyRendered={fullyRendered} onSelect={setSelectedBody} />
      ))}
      <GpuWarmup revision={warmupRevision} />
    </>
  );
}
