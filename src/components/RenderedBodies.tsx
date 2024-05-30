import { useState } from "react";
import CelestialBody, { CelestialBodyData, createCelestialBodyFromJSON } from "../classes/CelestialBody";
import { AnimationLoop } from "../utils/AnimationLoop";
import { CelestialBodyRenderer } from "./CelestialBodyRenderer";
import data from '../data/PlanetData.json';

export interface BodyAndFullyRendered {
  body: CelestialBody;
  fullyRendered: boolean;
}

export default function RenderedBodies({dateRef, timeMultRef}: {dateRef: React.MutableRefObject<Date>, timeMultRef: React.MutableRefObject<number>}) {
  const sun = createCelestialBodyFromJSON(data as CelestialBodyData);
  const [visibleBodies, setVisibleBodies] = useState<BodyAndFullyRendered[]>(
    [{ body: sun, fullyRendered: true }, ...sun.children.map((planet) => ({ body: planet, fullyRendered: false }))]
  );
  const { setSelectedBody } = AnimationLoop({visibleBodies, setVisibleBodies, dateRef, timeMultRef});
  console.log("Returning Solar System Scene");
  return (
    <>
      {visibleBodies.map((object: BodyAndFullyRendered) => (
        <CelestialBodyRenderer key={object.body.id} body={object.body} fullyRendered={object.fullyRendered} setSelectedBody={setSelectedBody}/>
      ))}
    </>
  );
};
