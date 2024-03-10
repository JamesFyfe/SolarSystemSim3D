
import * as THREE from 'three';

export default class OrbitData {
  constructor({parent, frame, L0, Ldot, semiMajorAxis, eccentricity, argumentOfPeriapsis, longitudeOfPeriapsis, inclination, longitudeOfAscendingNode}) {
		this.parent = parent;
		this.frame = frame;
		this.L0 = L0 * Math.PI / 180;
		this.Ldot = Ldot * Math.PI / 180;
		this.semiMajorAxis = semiMajorAxis;
		this.eccentricity = eccentricity;
		this.inclination = inclination * Math.PI / 180;
		if(longitudeOfPeriapsis == null) {
			longitudeOfPeriapsis = longitudeOfAscendingNode + argumentOfPeriapsis;
		}
		this.longitudeOfPeriapsis = longitudeOfPeriapsis * Math.PI / 180;
		this.longitudeOfAscendingNode = longitudeOfAscendingNode * Math.PI / 180;
		this.argumentOfPeriapsis = -(this.longitudeOfPeriapsis + this.longitudeOfAscendingNode);

		this.cosInclination = Math.cos(this.inclination);
		this.sinInclination = Math.sin(this.inclination);
		this.cosArgumentOfPeriapsis = Math.cos(this.argumentOfPeriapsis);
		this.sinArgumentOfPeriapsis = Math.sin(this.argumentOfPeriapsis);
		this.cosLongitudeOfAscendingNodeMinusPi = Math.cos(this.longitudeOfAscendingNode - Math.PI / 2);
		this.sinLongitudeOfAscendingNodeMinusPi = Math.sin(this.longitudeOfAscendingNode - Math.PI / 2);
		this.cosParentTilt = Math.cos(-this.parent.tilt);
		this.sinParentTilt = Math.sin(-this.parent.tilt);
  }

  getOrbitData(body) {
    // calculate orbit info from position, velocity, mass of parent
  }

	calculateEllipticalOrbitPosition(date) {
		// parent, period, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode
		let tMillisFromJ2000 = date - Date.UTC(2000, 0, 1, 12, 0, 0);
		let tCenturiesFromJ2000 = tMillisFromJ2000 / 3.15576e12;//(1000*60*60*24*365.25*100);

		// mean longitude
		let L = this.L0 + this.Ldot * tCenturiesFromJ2000;
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
		if(this.frame == "laplace") {
			xtemp = x
			x = this.cosParentTilt * xtemp - this.sinParentTilt * y;
			y = this.sinParentTilt * xtemp + this.cosParentTilt * y;
		}
		return new THREE.Vector3(x, y, z);
	}

	createOrbitEllipse() {
		const semiMinorAxis = this.semiMajorAxis * Math.sqrt(1 - this.eccentricity ** 2);
		const parentPos = Math.sqrt(this.semiMajorAxis ** 2 - semiMinorAxis ** 2);
		const curve = new THREE.EllipseCurve(
			0,  -parentPos,         // ax, aY
			semiMinorAxis, this.semiMajorAxis,      // xRadius, yRadius
			0,  2 * Math.PI,   // aStartAngle, aEndAngle
			false,              // aClockwise
			// Math.PI/2                  // aRotation
		);
		
		const points = curve.getPoints( 5000 );

		const ellipseGeometry = new THREE.BufferGeometry().setFromPoints( points );
		const ellipseMaterial = new THREE.MeshBasicMaterial({color: "rgb(100, 100, 100)", transparent: true, opacity: 0.8});
		
		// Create the final object to add to the scene
		const ellipse = new THREE.Line( ellipseGeometry, ellipseMaterial );
		//rotate to ecliptic plane
		ellipse.rotateX(Math.PI / 2);

		//rotate to laplace plane
		if(this.frame == "laplace") {
			ellipse.rotateY(-this.parent.tilt)
		}
		ellipse.rotateZ(this.longitudeOfAscendingNode - Math.PI / 2);
		ellipse.rotateX(this.inclination);
		ellipse.rotateZ(this.argumentOfPeriapsis + Math.PI / 2);

		return ellipse;
	}
}