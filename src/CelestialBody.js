import * as THREE from 'three';

export default class CelestialBody {
  constructor(name, mass, radius, texturePath, startingPosition = { x: 0, y: 0, z: 0 }, rotationPeriod = 0, orbitInfo = null, lightIntensity = 0, basicMat = false ) {
		this.name = name;
		this.container = new THREE.Object3D();
		this.children = [];
		this.mass = mass;
		this.radius = radius;
		this.rotationPeriod = rotationPeriod;
    const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load(texturePath);
		const material = basicMat ? new THREE.MeshBasicMaterial({ map: texture }) : new THREE.MeshStandardMaterial({ map: texture });
		const geometry = new THREE.SphereGeometry(radius, 80, 40);
		const mesh = new THREE.Mesh(geometry, material);
		this.container.position.set(startingPosition.x, startingPosition.y, startingPosition.z);
		this.orbitInfo = orbitInfo;
		this.orbitEllipse = null;

		if (lightIntensity > 0) {
			const light = new THREE.PointLight(0xffffff, lightIntensity);
			mesh.add(light);
		}

		if(orbitInfo != null) {
			this.orbitInfo.parent.container.add(this.container);
			this.orbitInfo.parent.children.push(this);
			this.orbitEllipse = this.createOrbitEllipse();
			this.orbitInfo.parent.container.add(this.orbitEllipse);
		}

		this.mesh = mesh;
		this.container.add(mesh);
  }

	createOrbitEllipse() {
		const semiMinorAxis = this.orbitInfo.semiMajorAxis * Math.sqrt(1 - this.orbitInfo.eccentricity ** 2);
		const parentPos = Math.sqrt(this.orbitInfo.semiMajorAxis ** 2 - semiMinorAxis ** 2);
		const curve = new THREE.EllipseCurve(
      parentPos,  0,         // ax, aY
      this.orbitInfo.semiMajorAxis, semiMinorAxis,      // xRadius, yRadius
      0,  2 * Math.PI,   // aStartAngle, aEndAngle
      false,              // aClockwise
      0                  // aRotation
    );
    
    const points = curve.getPoints( 5000 );

    const ellipseGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const ellipseMaterial = new THREE.LineBasicMaterial( { color: 0x555555} );
    
    // Create the final object to add to the scene
    const ellipse = new THREE.Line( ellipseGeometry, ellipseMaterial );
    ellipse.rotateX(Math.PI / 2);
    ellipse.rotateZ(this.orbitInfo.longitudeOfAscendingNode);
    ellipse.rotateX(-this.orbitInfo.inclination);
    ellipse.rotateZ(this.orbitInfo.argumentOfPeriapsis);
    // ellipse.renderOrder = -1;

		return ellipse;
	}

	calculateEllipticalOrbitPosition(date) {
		// parent, period, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode
		let tMillisFromJ2000 = date - Date.UTC(2000, 0, 1, 12, 0, 0);
		let tCenturiesFromJ2000 = tMillisFromJ2000 / 3.15576e12;//(1000*60*60*24*365.25*100);

		// mean longitude
		let L = this.orbitInfo.L0 + this.orbitInfo.Ldot * tCenturiesFromJ2000;
    // mean anomaly
		let M = L - this.orbitInfo.longitudeOfPeriapsis;

    // Solve Kepler's equation for eccentric anomaly (E)
    let E = M;
		// use for loop instead of while true to avoid infinite loops (unlikely)
		for(let i=0; i<100; i++) {
			let dE = (E - this.orbitInfo.eccentricity * Math.sin(E) - M)/(1 - this.orbitInfo.eccentricity * Math.cos(E));
			E -= dE;
			if( Math.abs(dE) < 1e-6 ) break;
			if(i === 99) {
				console.log("Early break from Kepler's equation");
			}
		}

		let P = this.orbitInfo.semiMajorAxis * (Math.cos(E) - this.orbitInfo.eccentricity);
		let Q = this.orbitInfo.semiMajorAxis * Math.sin(E) * Math.sqrt(1 - Math.pow(this.orbitInfo.eccentricity, 2));

    // rotate by argument of periapsis
		let x = -this.orbitInfo.cosArgumentOfPeriapsis * P - this.orbitInfo.sinArgumentOfPeriapsis * Q;
		let z = -this.orbitInfo.sinArgumentOfPeriapsis * P + this.orbitInfo.cosArgumentOfPeriapsis * Q;
		// // rotate by inclination
		let y = this.orbitInfo.sinInclination * z;
				z = this.orbitInfo.cosInclination * z;
		// rotate by longitude of ascending node
		let xtemp = x;
		x = this.orbitInfo.cosLongitudeOfAscendingNode * xtemp - this.orbitInfo.sinLongitudeOfAscendingNode * z;
		z = this.orbitInfo.sinLongitudeOfAscendingNode * xtemp + this.orbitInfo.cosLongitudeOfAscendingNode * z;
    return new THREE.Vector3(x, y, z);
	}

  update(date) {
		this.mesh.rotation.y = ((date / 8.64e7) / this.rotationPeriod) * 2 * Math.PI;
		if(this.orbitInfo != null) {
			const position = this.calculateEllipticalOrbitPosition(date);
			this.container.position.set(...position.toArray());
		}
  }
}
