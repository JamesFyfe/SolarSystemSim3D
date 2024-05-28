import * as THREE from 'three';
import PhysicalData from './PhysicalData';
import OrbitData from './OrbitData';
import { createRef } from 'react';

interface PhysicalDataParams {
  mass: number;
  radius: number;
  color: string;
  textureName: string;
  rotationPeriod: number;
  startingRotation: number;
  axisTilt: number;
  lightIntensity?: number;
  normalMapName?: string;
}

export interface OrbitDataParams {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  meanAnomaly: number;
  meanAnomalyPerCentury: number;
  argumentOfPeriapsis: number;
  longitudeOfPeriapsis: number;
  longitudeOfAscendingNode: number;
  frame: string;
}

export interface AtmosphereParams {
  color: string,
  layers: number,
  thickness: number,
  opacity: number
}

export interface RingDataParams {
  distance: number,
  width: number,
  color: string,
  opacity: number,
  textureName: string
}

export interface CelestialBodyData {
  id: string;
  name: string;
  clickable: boolean;
  physicalData: PhysicalDataParams;
  children?: CelestialBodyData[];
  orbitData?: OrbitDataParams;
  atmosphere?: AtmosphereParams;
  ringData?: RingDataParams;
}

export default class CelestialBody {
  id: string;
  name: string;
  clickable: boolean;
  position: THREE.Vector3;
  physicalData: PhysicalData;
  threeGroupRef: React.RefObject<THREE.Group>;
  rotatingGroupRef: React.RefObject<THREE.Group>;
  indicatorRef: React.RefObject<THREE.Object3D>;
  parent: CelestialBody | undefined;
  children: CelestialBody[];
  orbitData?: OrbitData;
  atmosphereData?: AtmosphereParams;
  ringData?: RingDataParams;
  ellipseRef?: React.RefObject<THREE.Group>;
  lightRef?: React.RefObject<THREE.PointLight>;

  constructor(
    id: string,
    name: string,
    clickable: boolean,
    physicalData: PhysicalDataParams,
    parent: CelestialBody | undefined,
    children: CelestialBodyData[] | undefined,
    orbitData?: OrbitDataParams,
    atmosphere?: AtmosphereParams,
    ringData?: RingDataParams,
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
      physicalData.lightIntensity,
      physicalData.normalMapName
    );
    if (orbitData) {
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
      if (this.orbitData.frame === "laplace" && this.parent) {
        this.physicalData.axisTilt += this.parent.physicalData.axisTilt;
      }
      // subtract inclination from tilt since tilt is relative to inclination
      this.physicalData.axisTilt -= this.orbitData.inclination;
      this.ellipseRef = createRef<THREE.Group>();
    }

    this.threeGroupRef = createRef<THREE.Group>();
    this.rotatingGroupRef = createRef<THREE.Group>();
    this.indicatorRef = createRef<THREE.Object3D>();

    if (physicalData.lightIntensity) {
      this.lightRef = createRef<THREE.PointLight>();
    }
    if (atmosphere) {
      this.atmosphereData = atmosphere;
    }
    if (ringData) {
      this.ringData = ringData;
    }

    this.children = [];
    if (children !== undefined) {
      this.children = children.map((child) => {
        return createCelestialBodyFromJSON(child, this);
      });
    }
  }

  update(date: Date) {
    if (!this.threeGroupRef.current) {
      return;
    }
    // rotate bodies
    if (this.physicalData.rotationPeriod !== 0 && this.rotatingGroupRef.current) {
      // 3.6e+6 ms per hour
      this.rotatingGroupRef.current.rotation.y = this.physicalData.startingRotation * Math.PI / 180 + ((date.getTime() / 3.6e+6) / this.physicalData.rotationPeriod) * (2 * Math.PI);
    }

    if (this.orbitData && this.parent) {
      //calculate orbit position and add parent position
      this.position.set(...this.orbitData.calculateEllipticalOrbitPosition(date)).add(this.parent.position);
    }
    this.threeGroupRef.current.position.set(...this.position.toArray());

    // move orbit ellipse to be centered at parent
    if (this.parent && this.ellipseRef?.current) {
      const diff = new THREE.Vector3().subVectors(this.parent.position, this.position);
      this.ellipseRef.current.position.set(...diff.toArray());
    }
  }
}

export function createCelestialBodyFromJSON(jsonData: CelestialBodyData, parent?: CelestialBody): CelestialBody {
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