import * as THREE from 'three';
import type CelestialBody from './CelestialBody';
import { julianCenturiesTT } from '../utils/astroTime';
import { moonPosition, moonMeanNode, moonMeanPerigee, MOON_MEAN_INCLINATION } from '../utils/lunarTheory';
import { eclipticOfDateToJ2000, Vec3 } from '../utils/precession';

export type OrbitModel = 'kepler' | 'moon';

/**
 * Frame conventions
 * -----------------
 * Orbital elements are the usual ecliptic ones: Ω measured from the (J2000)
 * vernal equinox, i to the ecliptic, ϖ = Ω + ω. Ecliptic coordinates
 * (X toward the equinox, Z toward the north ecliptic pole) map to the scene's
 * Y-up frame as  scene = [Y_ecl, Z_ecl, X_ecl].  This is a proper rotation
 * that puts the equinox on scene +z and ecliptic longitude 90° on scene +x,
 * which is where CelestialBodyRenderer tilts each body's spin axis toward.
 *
 * Distances are in 1000 km; angles inside the class are in radians.
 */
export default class OrbitData {
  parent: CelestialBody | undefined;
  model: OrbitModel;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  /** mean longitude at J2000.0 (the JSON field is historically named meanAnomaly) */
  meanLongitudeAtEpoch: number;
  meanLongitudeRatePerCentury: number;
  longitudeOfPeriapsis: number;
  longitudeOfAscendingNode: number;
  frame: string;
  cosParentTilt: number | undefined;
  sinParentTilt: number | undefined;

  // Unit vectors (scene frame) toward periapsis and 90° ahead of it in the
  // orbital plane. Constant for Kepler orbits; recomputed per call for the Moon.
  private basisP: Vec3 = [1, 0, 0];
  private basisQ: Vec3 = [0, 0, 1];

  constructor(
    parent: CelestialBody | undefined,
    semiMajorAxis: number,
    eccentricity: number,
    inclination: number,
    meanLongitudeAtEpoch: number,
    meanLongitudeRatePerCentury: number,
    argumentOfPeriapsis: number,
    longitudeOfPeriapsis: number,
    longitudeOfAscendingNode: number,
    frame: string,
    model: OrbitModel = 'kepler',
  ) {
    const piOver180 = Math.PI / 180;
    this.parent = parent;
    this.model = model;
    this.semiMajorAxis = semiMajorAxis;
    this.eccentricity = eccentricity;
    this.inclination = inclination * piOver180;
    this.meanLongitudeAtEpoch = meanLongitudeAtEpoch * piOver180;
    this.meanLongitudeRatePerCentury = meanLongitudeRatePerCentury * piOver180;
    this.frame = frame;

    if (longitudeOfPeriapsis === undefined) {
      longitudeOfPeriapsis = longitudeOfAscendingNode + argumentOfPeriapsis;
    }
    this.longitudeOfPeriapsis = longitudeOfPeriapsis * piOver180;
    this.longitudeOfAscendingNode = longitudeOfAscendingNode * piOver180;

    if (this.parent) {
      this.cosParentTilt = Math.cos(-this.parent.physicalData.axisTilt);
      this.sinParentTilt = Math.sin(-this.parent.physicalData.axisTilt);
    }

    if (this.model === 'moon') {
      this.inclination = MOON_MEAN_INCLINATION;
    } else {
      this.computeBasis(this.longitudeOfAscendingNode, this.longitudeOfPeriapsis, this.inclination);
    }
  }

  /** Ecliptic (X, Y, Z) → scene frame, including the optional Laplace-plane tilt. */
  private eclipticToScene(X: number, Y: number, Z: number): Vec3 {
    let x = Y,
      y = Z;
    const z = X;
    if (this.frame === 'laplace' && this.cosParentTilt !== undefined && this.sinParentTilt !== undefined) {
      // same rotation the renderer applies for the parent's axial tilt (rotation.z = -tilt)
      const xt = x;
      x = this.cosParentTilt * xt - this.sinParentTilt * y;
      y = this.sinParentTilt * xt + this.cosParentTilt * y;
    }
    return [x, y, z];
  }

  private computeBasis(node: number, lonPeri: number, inc: number) {
    const w = lonPeri - node; // argument of periapsis
    const cw = Math.cos(w),
      sw = Math.sin(w);
    const cO = Math.cos(node),
      sO = Math.sin(node);
    const ci = Math.cos(inc),
      si = Math.sin(inc);
    this.basisP = this.eclipticToScene(cw * cO - sw * sO * ci, cw * sO + sw * cO * ci, sw * si);
    this.basisQ = this.eclipticToScene(-sw * cO - cw * sO * ci, -sw * sO + cw * cO * ci, cw * si);
  }

  private keplerPosition(T: number): Vec3 {
    const L = this.meanLongitudeAtEpoch + this.meanLongitudeRatePerCentury * T;
    const M = L - this.longitudeOfPeriapsis;
    const e = this.eccentricity;

    // Solve Kepler's equation for the eccentric anomaly E (Newton's method)
    let E = M;
    for (let i = 0; i < 100; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-9) break;
    }

    const p = this.semiMajorAxis * (Math.cos(E) - e);
    const q = this.semiMajorAxis * Math.sin(E) * Math.sqrt(1 - e * e);
    const [px, py, pz] = this.basisP;
    const [qx, qy, qz] = this.basisQ;
    return [px * p + qx * q, py * p + qy * q, pz * p + qz * q];
  }

  private lunarPosition(T: number): Vec3 {
    const { lon, lat, range } = moonPosition(T);
    const r = range / 1000; // km → 1000 km
    const ofDate: Vec3 = [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
    const [X, Y, Z] = eclipticOfDateToJ2000(ofDate, T);
    return this.eclipticToScene(X, Y, Z);
  }

  /** Position relative to the parent, scene frame, 1000 km. */
  calculatePosition(date: Date): Vec3 {
    const T = julianCenturiesTT(date);
    return this.model === 'moon' ? this.lunarPosition(T) : this.keplerPosition(T);
  }

  /**
   * Orient an orbit-ellipse group whose local +x points to periapsis and whose
   * local xy-plane is the orbital plane. For the Moon this follows the mean
   * (precessing) node and perigee, so call it every frame.
   */
  orientEllipse(group: THREE.Object3D, date: Date) {
    if (this.model === 'moon') {
      const T = julianCenturiesTT(date);
      // mean node/perigee are given for the ecliptic of date; bring them to J2000
      const toJ2000 = (lon: number): number => {
        const [X, Y] = eclipticOfDateToJ2000([Math.cos(lon), Math.sin(lon), 0], T);
        return Math.atan2(Y, X);
      };
      this.computeBasis(toJ2000(moonMeanNode(T)), toJ2000(moonMeanPerigee(T)), this.inclination);
    }
    const P = new THREE.Vector3(...this.basisP);
    const Q = new THREE.Vector3(...this.basisQ);
    const N = new THREE.Vector3().crossVectors(P, Q);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(P, Q, N));
  }
}
