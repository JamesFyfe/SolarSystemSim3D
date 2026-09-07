import * as THREE from 'three';
import PhysicalData from './PhysicalData';
import OrbitData, { OrbitModel } from './OrbitData';
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
  /** "kepler" (default) or "moon" for the ELP/Meeus lunar theory */
  model?: OrbitModel;
}

export interface AtmosphereParams {
  /** CSS colour of the haze, e.g. "rgb(90, 120, 160)" */
  color: string;
  /** Height of the visible shell as a fraction of the planet radius (visually exaggerated) */
  height: number;
  /** Maximum opacity of the haze at the limb, 0-1 */
  opacity: number;
  /** Scattering strength multiplier (default 1) */
  intensity?: number;
  /** Haze density multiplier (default 1) */
  density?: number;
  /** How quickly density falls off with altitude; larger = thinner upper layers (default 5) */
  falloff?: number;
}

export interface RingDataParams {
  distance: number;
  width: number;
  color: string;
  opacity: number;
  textureName: string;
}

/** Bodies that need a bespoke set of surface layers instead of the default textured sphere. */
export type BodyRenderer = 'earth';

export interface CelestialBodyData {
  id: string;
  name: string;
  clickable: boolean;
  physicalData: PhysicalDataParams;
  children?: CelestialBodyData[];
  orbitData?: OrbitDataParams;
  atmosphere?: AtmosphereParams;
  ringData?: RingDataParams;
  /** Selects a custom renderer for the surface; omit for the default textured sphere. */
  renderer?: BodyRenderer;
}

/** The drei `<Text>` mesh, which exposes troika's `fillOpacity`. */
export type IndicatorMesh = THREE.Mesh & { fillOpacity: number };

export default class CelestialBody {
  id: string;
  name: string;
  clickable: boolean;
  renderer?: BodyRenderer;
  position: THREE.Vector3;
  physicalData: PhysicalData;
  threeGroupRef: React.RefObject<THREE.Group | null>;
  rotatingGroupRef: React.RefObject<THREE.Group | null>;
  indicatorRef: React.RefObject<IndicatorMesh | null>;
  parent: CelestialBody | undefined;
  children: CelestialBody[];
  orbitData?: OrbitData;
  atmosphereData?: AtmosphereParams;
  ringData?: RingDataParams;
  ellipseRef?: React.RefObject<THREE.Group | null>;
  lightRef?: React.RefObject<THREE.PointLight | null>;

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
    renderer?: BodyRenderer,
  ) {
    this.id = id;
    this.name = name;
    this.position = new THREE.Vector3(0, 0, 0);
    this.clickable = clickable;
    this.renderer = renderer;
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
      physicalData.normalMapName,
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
        orbitData.model,
      );
      if (this.orbitData.frame === 'laplace' && this.parent) {
        this.physicalData.axisTilt += this.parent.physicalData.axisTilt;
      }
      // subtract inclination from tilt since tilt is relative to inclination
      this.physicalData.axisTilt -= this.orbitData.inclination;
      this.ellipseRef = createRef<THREE.Group>();
    }

    this.threeGroupRef = createRef<THREE.Group>();
    this.rotatingGroupRef = createRef<THREE.Group>();
    this.indicatorRef = createRef<IndicatorMesh>();

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

  /** True for self-luminous bodies (the Sun): they carry a point light and a glow. */
  get isStar(): boolean {
    return (this.physicalData.lightIntensity ?? 0) > 0;
  }

  update(date: Date) {
    if (!this.threeGroupRef.current) {
      return;
    }
    // rotate bodies
    if (this.physicalData.rotationPeriod !== 0 && this.rotatingGroupRef.current) {
      // 3.6e+6 ms per hour
      this.rotatingGroupRef.current.rotation.y =
        (this.physicalData.startingRotation * Math.PI) / 180 +
        (date.getTime() / 3.6e6 / this.physicalData.rotationPeriod) * (2 * Math.PI);
    }

    if (this.orbitData && this.parent) {
      //calculate orbit position and add parent position
      this.position.set(...this.orbitData.calculatePosition(date)).add(this.parent.position);
    }
    this.threeGroupRef.current.position.set(...this.position.toArray());

    // move orbit ellipse to be centered at parent
    if (this.parent && this.orbitData && this.ellipseRef?.current) {
      const diff = new THREE.Vector3().subVectors(this.parent.position, this.position);
      this.ellipseRef.current.position.set(...diff.toArray());
      if (this.orbitData.model === 'moon') {
        // lunar node and perigee precess quickly; keep the drawn orbit in step
        this.orbitData.orientEllipse(this.ellipseRef.current, date);
      }
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
    jsonData.renderer,
  );

  return celestialBody;
}

/** Flattens the body tree rooted at `root` into an id → body lookup. */
export function collectBodiesById(root: CelestialBody): Map<string, CelestialBody> {
  const bodies = new Map<string, CelestialBody>();
  const visit = (body: CelestialBody) => {
    bodies.set(body.id, body);
    body.children.forEach(visit);
  };
  visit(root);
  return bodies;
}
