
export default class OrbitData {
  constructor({parent, L0, Ldot, semiMajorAxis, eccentricity, argumentOfPeriapsis, longitudeOfPeriapsis, inclination, longitudeOfAscendingNode}) {
		this.parent = parent;
		this.L0 = L0 * Math.PI / 180;
		this.Ldot = Ldot * Math.PI / 180;
		this.semiMajorAxis = semiMajorAxis;
		this.eccentricity = eccentricity;
		this.inclination = inclination * Math.PI / 180;

		if(argumentOfPeriapsis == null) {
			argumentOfPeriapsis =  longitudeOfPeriapsis - longitudeOfAscendingNode;
		}
		this.argumentOfPeriapsis = argumentOfPeriapsis * Math.PI / 180;
		this.longitudeOfAscendingNode = longitudeOfAscendingNode * Math.PI / 180;
		this.longitudeOfPeriapsis = this.longitudeOfAscendingNode + this.argumentOfPeriapsis;

		this.cosInclination = Math.cos(this.inclination);
		this.sinInclination = Math.sin(this.inclination);
		this.cosArgumentOfPeriapsis = Math.cos(this.argumentOfPeriapsis);
		this.sinArgumentOfPeriapsis = Math.sin(this.argumentOfPeriapsis);
		this.cosLongitudeOfAscendingNode = Math.cos(this.longitudeOfAscendingNode);
		this.sinLongitudeOfAscendingNode = Math.sin(this.longitudeOfAscendingNode);
  }

  getOrbitData(body) {
    // calculate orbit info from position, velocity, mass of parent
  }
}