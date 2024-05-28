import { useState } from "react";
import CelestialBody, { CelestialBodyData, createCelestialBodyFromJSON } from "../classes/CelestialBody";
import { AnimationLoop } from "../utils/AnimationLoop";
import { CelestialBodyRenderer } from "./CelestialBodyRenderer";
import data from '../data/PlanetData.json';

export default function RenderedBodies({dateRef}: {dateRef: React.MutableRefObject<Date>}) {
  const sun = createCelestialBodyFromJSON(data as CelestialBodyData);
  const [visibleBodies, setVisibleBodies] = useState<CelestialBody[]>([sun, ...sun.children]);

  const { setSelectedBody } = AnimationLoop({visibleBodies, setVisibleBodies, dateRef});
  console.log("Returning Solar System Scene");
  return (
    <>
      {visibleBodies.map((body: CelestialBody) => (
        <CelestialBodyRenderer key={body.id} body={body} setSelectedBody={setSelectedBody}/>
      ))}
    </>
  );
};