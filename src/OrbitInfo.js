
export default class OrbitInfo {
  constructor(parent, L0, Ldot, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode) {
		this.parent = parent;
		this.L0 = L0;
		this.Ldot = Ldot;
		this.semiMajorAxis = semiMajorAxis;
		this.eccentricity = eccentricity;

		this.argumentOfPeriapsis = argumentOfPeriapsis * Math.PI / 180;
		this.cosArgumentOfPeriapsis = Math.cos(this.argumentOfPeriapsis);
		this.sinArgumentOfPeriapsis = Math.sin(this.argumentOfPeriapsis);

		this.inclination = inclination * Math.PI / 180;
		this.cosInclination = Math.cos(this.inclination);
		this.sinInclination = Math.sin(this.inclination);

		this.longitudeOfAscendingNode = longitudeOfAscendingNode * Math.PI / 180;
		this.cosLongitudeOfAscendingNode = Math.cos(this.longitudeOfAscendingNode);
		this.sinLongitudeOfAscendingNode = Math.sin(this.longitudeOfAscendingNode);

		this.longitudeOfPeriapsis = this.longitudeOfAscendingNode + this.argumentOfPeriapsis;
  }

  getOrbitInfo(body) {
    // calculate orbit info from position, velocity, mass of parent
  }
}