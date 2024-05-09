import CelestialBody from "./CelestialBody";

export default class OrbitData {
  parent: CelestialBody | undefined;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  meanAnomaly: number;
  meanAnomalyPerCentury: number;
  argumentOfPeriapsis: number;
  longitudeOfPeriapsis: number;
  longitudeOfAscendingNode: number;
  frame: string;
  cosInclination: number;
  sinInclination: number;
  cosArgumentOfPeriapsis: number;
  sinArgumentOfPeriapsis: number;
  cosLongitudeOfAscendingNodeMinusPi: number;
  sinLongitudeOfAscendingNodeMinusPi: number;
  cosParentTilt: number | undefined;
  sinParentTilt: number | undefined;

  constructor(
    parent: CelestialBody | undefined,
    semiMajorAxis: number,
    eccentricity: number,
    inclination: number,
    meanAnomaly: number,
    meanAnomalyPerCentury: number,
    argumentOfPeriapsis: number,
    longitudeOfPeriapsis: number,
    longitudeOfAscendingNode: number,
    frame: string,
  ) {
    const piOver180 =  Math.PI / 180;
    this.parent = parent;
    this.semiMajorAxis = semiMajorAxis;
    this.eccentricity = eccentricity;
    this.inclination = inclination * piOver180;
    this.meanAnomaly = meanAnomaly * piOver180;
    this.meanAnomalyPerCentury = meanAnomalyPerCentury * piOver180;
    this.frame = frame;

		if(longitudeOfPeriapsis === undefined) {
			longitudeOfPeriapsis = longitudeOfAscendingNode + argumentOfPeriapsis;
		}
		this.longitudeOfPeriapsis = longitudeOfPeriapsis * piOver180;
		this.longitudeOfAscendingNode = longitudeOfAscendingNode * piOver180;
		this.argumentOfPeriapsis = -(this.longitudeOfPeriapsis + this.longitudeOfAscendingNode);

		this.cosInclination = Math.cos(this.inclination);
		this.sinInclination = Math.sin(this.inclination);
		this.cosArgumentOfPeriapsis = Math.cos(this.argumentOfPeriapsis);
		this.sinArgumentOfPeriapsis = Math.sin(this.argumentOfPeriapsis);
		this.cosLongitudeOfAscendingNodeMinusPi = Math.cos(this.longitudeOfAscendingNode - Math.PI / 2);
		this.sinLongitudeOfAscendingNodeMinusPi = Math.sin(this.longitudeOfAscendingNode - Math.PI / 2);
    if(parent) {
      this.cosParentTilt = Math.cos(-this.parent!.physicalData.axisTilt);
      this.sinParentTilt = Math.sin(-this.parent!.physicalData.axisTilt);
    }
  }

  calculateEllipticalOrbitPosition(date: Date): [number, number, number] {
		// parent, period, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode
		let tMillisFromJ2000 = date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0);
		let tCenturiesFromJ2000 = tMillisFromJ2000 / 3.15576e12;//(1000*60*60*24*365.25*100);

		// mean longitude
		let L = this.meanAnomaly + this.meanAnomalyPerCentury * tCenturiesFromJ2000;
		// mean anomaly
		let M = -(L - this.longitudeOfPeriapsis);

		// Solve Kepler's equation for eccentric anomaly (E)
		let E = M;
		// use for loop instead of while true to avoid infinite loops (unlikely)
		for(let i=0; i<100; i++) {
			let dE = (E - this.eccentricity * Math.sin(E) - M)/(1 - this.eccentricity * Math.cos(E));
			E -= dE;
			if( Math.abs(dE) < 1e-6 ) break;
			if(i === 99) {
				console.log("Early break from Kepler's equation");
			}
		}

		let P = this.semiMajorAxis * (Math.cos(E) - this.eccentricity);
		let Q = this.semiMajorAxis * Math.sin(E) * Math.sqrt(1 - Math.pow(this.eccentricity, 2));

		// rotate by argument of periapsis
		let x = -(this.cosArgumentOfPeriapsis * P - this.sinArgumentOfPeriapsis * Q);
		let z = -(this.sinArgumentOfPeriapsis * P + this.cosArgumentOfPeriapsis * Q);
		// rotate by inclination
		let y = -this.sinInclination * z;
				z = this.cosInclination * z;
		// rotate by longitude of ascending node
		let xtemp = x;
		x = this.cosLongitudeOfAscendingNodeMinusPi * xtemp - this.sinLongitudeOfAscendingNodeMinusPi * z;
		z = this.sinLongitudeOfAscendingNodeMinusPi * xtemp + this.cosLongitudeOfAscendingNodeMinusPi * z;

		//rotate to laplace plane
		if(this.frame === "laplace") {
			xtemp = x
			x = this.cosParentTilt! * xtemp - this.sinParentTilt! * y;
			y = this.sinParentTilt! * xtemp + this.cosParentTilt! * y;
		}
		return [x, y, z];
	}
}
