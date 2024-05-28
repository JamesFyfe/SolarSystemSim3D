import * as THREE from 'three';
import { memo, useEffect } from "react";
import CelestialBody from "../classes/CelestialBody";
import useCacheLoader from "../TextureCacheUtils";
import Atmosphere from "./Atmosphere";
import BodyIndicator from "./BodyIndicator";
import { Clouds } from "./EarthLayers";
import { CityLights } from "./EarthLayers";
import OrbitEllipse from "./OrbitEllipse";
import Rings from "./Rings";

export const CelestialBodyRenderer = memo(({ body, setSelectedBody }: { body: CelestialBody, setSelectedBody: (id: string, transition?: boolean) => void}) => {
  const meshRef = useCacheLoader(body.physicalData.textureName);

  useEffect(() => {
    if(body.rotatingGroupRef.current) {
      body.rotatingGroupRef.current.rotation.order = 'ZXY';
      // rotate mesh by axis tilt
      body.rotatingGroupRef.current.rotation.z = -body.physicalData.axisTilt;
    }
  }, [body]);

  const getMeshProps = () => {
    const geometry = new THREE.SphereGeometry(body.physicalData.radius, 100, 50);
    const material = body.physicalData.lightIntensity ? 
      new THREE.MeshStandardMaterial({ emissive: "rgb(160, 160, 90)", emissiveIntensity: 3 }) :
      new THREE.MeshStandardMaterial({ color: new THREE.Color(body.physicalData.color) });
    return { geometry, material };
  };

  return (
    <group ref={body.threeGroupRef} name={body.name} userData={{ bodyId: body.id }}>
      <group ref={body.rotatingGroupRef} name={`${body.name } rotating group`} userData={{ bodyId: body.id }}>
        <mesh ref={meshRef} name={`${body.name} mesh`} userData={{ bodyId: body.id }} {...getMeshProps()} />
        {body.ringData && <Rings body={body} />}
        {body.name === "Earth" && 
          <>
            <CityLights earth={body}/>
            <Clouds earth={body} />
          </>
        }
      </group>
      <BodyIndicator ref={body.indicatorRef} body={body} setSelectedBody={setSelectedBody}/>
      {body.atmosphereData && <Atmosphere body={body} />}
      {body.physicalData.lightIntensity && 
      <>
        <pointLight
          ref={body.lightRef}
          intensity={body.physicalData.lightIntensity} position={body.position}>
        </pointLight>
      </>
      }
      {body.orbitData && <OrbitEllipse ref={body.ellipseRef} body={body} />}
    </group>
  );
  },
  (prevProps, nextProps) => prevProps.body.id === nextProps.body.id
);