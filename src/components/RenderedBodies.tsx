import { useState } from "react";
import CelestialBody, { createCelestialBodyFromJSON } from "../classes/CelestialBody";
import { AnimationLoop } from "../utils/AnimationLoop";
import { CelestialBodyRenderer } from "./CelestialBodyRenderer";

export default function RenderedBodies({dateRef}: {dateRef: React.MutableRefObject<Date>}) {
  const data = require('../data/PlanetData.json');
  const sun = createCelestialBodyFromJSON(data[0]);
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