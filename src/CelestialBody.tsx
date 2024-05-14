import * as THREE from 'three';
import PhysicalData from './PhysicalData';
import OrbitData from './OrbitData';
import { createRef, memo, useEffect } from 'react';
import Atmosphere from './components/Atmosphere';
import Rings from './components/Rings';
import useCacheLoader from './TextureCacheUtils';
import OrbitEllipse from './components/OrbitEllipse';
import BodyIndicator from './components/Indicator';
import { CityLights, Clouds } from './components/EarthLayers';

interface physicalParams {
  mass: number;
  radius: number;
  color: string;
  textureName: string;
  rotationPeriod: number;
  startingRotation: number;
  axisTilt: number;
  lightIntensity?: number;
};

interface orbitParams {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  meanAnomaly: number;
  meanAnomalyPerCentury: number;
  argumentOfPeriapsis: number;
  longitudeOfPeriapsis: number;
  longitudeOfAscendingNode: number;
  frame: string;
};

export default class CelestialBody {
  id: string;
  name: string;
  clickable: boolean;
  position: THREE.Vector3;
  physicalData: PhysicalData;
  threeGroupRef: React.RefObject<THREE.Group>;
  rotatingGroupRef: React.RefObject<THREE.Group>;
  parent: CelestialBody | undefined;
  children: CelestialBody[];
  orbitData?: OrbitData;
  atmosphereData?: any;
  ringData?: any;
  ellipseRef?: React.RefObject<THREE.Group>;

  constructor(
    id: string,
    name: string,
    clickable: boolean,
    physicalData: physicalParams,
    parent: CelestialBody | undefined,
    children: [],
    orbitData?: orbitParams,
    atmosphere?: any,
    ringData?: any,
  ) {
    this.id = id;
    this.name = name;
    this.position = new THREE.Vector3(0, 0, 0);
    this.clickable = clickable;
    this.parent = parent;
    this.physicalData = new PhysicalData(
      physicalData.mass,
      physicalData.radius,
      physicalData.color,
      physicalData.textureName,
      physicalData.rotationPeriod,
      physicalData.startingRotation,
      physicalData.axisTilt,
      physicalData.lightIntensity
    );
    if(orbitData) {
      this.orbitData = new OrbitData(
        this.parent,
        orbitData.semiMajorAxis,
        orbitData.eccentricity,
        orbitData.inclination,
        orbitData.meanAnomaly,
        orbitData.meanAnomalyPerCentury,
        orbitData.argumentOfPeriapsis,
        orbitData.longitudeOfPeriapsis,
        orbitData.longitudeOfAscendingNode,
        orbitData.frame,
      );
      if(this.orbitData.frame === "laplace") {
				this.physicalData.axisTilt += this.parent!.physicalData.axisTilt;
			}
			// subtract inclination from tilt since tilt is relative to inclination
			this.physicalData.axisTilt -= this.orbitData.inclination;
      this.ellipseRef = createRef<THREE.Group>();
    }

    this.threeGroupRef = createRef<THREE.Group>();
    this.rotatingGroupRef = createRef<THREE.Group>();

    if(atmosphere) {
      this.atmosphereData = atmosphere;
    }
    if(ringData) {
      this.ringData = ringData;
    }

    this.children = [];
    if(children !== undefined) {
      this.children = children.map((child) => {
        return createCelestialBodyFromJSON(child, this);
      });
    }
  }

  update(date: Date, elapsed: number) {
    if(!this.threeGroupRef.current) {
      return;
    }
    // rotate bodies
    if(this.physicalData.rotationPeriod !== 0 && this.rotatingGroupRef.current) {
			// 3.6e+6 ms per hour
			this.rotatingGroupRef.current.rotation.y = this.physicalData.startingRotation + ((date.getTime() / 3.6e+6) / this.physicalData.rotationPeriod) * (2 * Math.PI);
		}

    if(this.orbitData) {
      //calculate orbit position and add parent position
      this.position.set(...this.orbitData.calculateEllipticalOrbitPosition(date)).add(this.parent!.position);
    }
    this.threeGroupRef.current.position.set(...this.position.toArray());

    // move orbit ellipse to be centered at parent
    if(this.parent && this.ellipseRef?.current) {
      const diff = new THREE.Vector3().subVectors(this.parent.position, this.position);
      this.ellipseRef.current.position.set(...diff.toArray());
    }
  }
}

export function createCelestialBodyFromJSON(jsonData: any, parent?: CelestialBody): CelestialBody {
  const celestialBody = new CelestialBody(
    jsonData.id,
    jsonData.name,
    jsonData.clickable,
    jsonData.physicalData,
    parent,
    jsonData.children,
    jsonData.orbitData,
    jsonData.atmosphere,
    jsonData.ringData,
  );
  
  return celestialBody;
}

export const CelestialBodyRenderer = memo(({ body, setSelectedBody }: { body: CelestialBody, setSelectedBody: Function}) => {
  const meshRef = useCacheLoader(body.physicalData.textureName);

  useEffect(() => {
    if(body.rotatingGroupRef.current) {
      body.rotatingGroupRef.current.rotation.order = 'ZXY';
      // rotate mesh by axis tilt
      body.rotatingGroupRef.current!.rotation.z = -body.physicalData.axisTilt;
    }
  }, [body]);

  const getMeshProps = () => {
    // const geometry = new THREE.SphereGeometry(5000, 100, 50);
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
      <BodyIndicator body={body} setSelectedBody={setSelectedBody}/>
      {body.atmosphereData && <Atmosphere body={body} />}
      {body.physicalData.lightIntensity && 
        <pointLight
          intensity={body.physicalData.lightIntensity} position={body.position}>
        </pointLight>}
      {body.orbitData && <group ref={body.ellipseRef}><OrbitEllipse body={body} /></group>}
    </group>
  );
  },
  (prevProps, nextProps) => prevProps.body.id === nextProps.body.id
);
