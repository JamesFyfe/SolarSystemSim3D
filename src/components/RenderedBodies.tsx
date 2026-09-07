import { useMemo, useReducer, useState } from 'react';
import { CelestialBodyData, collectBodiesById, createCelestialBodyFromJSON } from '../classes/CelestialBody';
import useAnimationLoop from '../hooks/useAnimationLoop';
import { initialVisibleBodies, visibleBodiesReducer } from '../state/visibleBodies';
import CelestialBodyRenderer from './CelestialBodyRenderer';
import data from '../data/PlanetData.json';

interface RenderedBodiesProps {
  dateRef: React.MutableRefObject<Date>;
  timeMultRef: React.MutableRefObject<number>;
}

export default function RenderedBodies({ dateRef, timeMultRef }: RenderedBodiesProps) {
  // Lazy initialiser: the body tree is built once, not on every render
  const [root] = useState(() => createCelestialBodyFromJSON(data as CelestialBodyData));
  const bodiesById = useMemo(() => collectBodiesById(root), [root]);
  const [visibleBodies, dispatch] = useReducer(visibleBodiesReducer, root, initialVisibleBodies);

  const { setSelectedBody } = useAnimationLoop({ root, bodiesById, visibleBodies, dispatch, dateRef, timeMultRef });

  return (
    <>
      {visibleBodies.map(({ body, fullyRendered }) => (
        <CelestialBodyRenderer key={body.id} body={body} fullyRendered={fullyRendered} onSelect={setSelectedBody} />
      ))}
    </>
  );
}
