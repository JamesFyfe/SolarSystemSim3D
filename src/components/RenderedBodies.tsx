import { useState } from "react";
import CelestialBody, { CelestialBodyData, createCelestialBodyFromJSON } from "../classes/CelestialBody";
import { AnimationLoop } from "../utils/AnimationLoop";
import { CelestialBodyRenderer } from "./CelestialBodyRenderer";
import data from '../data/PlanetData.json';

export interface BodyAndFullyRendered {
  body: CelestialBody;
  fullyRendered: boolean;
}

export default function RenderedBodies({dateRef}: {dateRef: React.MutableRefObject<Date>}) {
  const sun = createCelestialBodyFromJSON(data as CelestialBodyData);
  const [visibleBodies, setVisibleBodies] = useState<BodyAndFullyRendered[]>(
    [{ body: sun, fullyRendered: true }, ...sun.children.map((planet) => ({ body: planet, fullyRendered: false }))]
  );
  const { setSelectedBody } = AnimationLoop({visibleBodies, setVisibleBodies, dateRef});
  console.log("Returning Solar System Scene");
  console.log(visibleBodies);
  return (
    <>
      {visibleBodies.map((object: BodyAndFullyRendered) => (
        <CelestialBodyRenderer key={object.body.id} body={object.body} fullyRendered={object.fullyRendered} setSelectedBody={setSelectedBody}/>
      ))}
    </>
  );
};
