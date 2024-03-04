import * as THREE from 'three';
import OrbitData from './OrbitData.js'

export default class CelestialBody {
  constructor({name, mass, radius, texturePath, startingPosition = { x: 0, y: 0, z: 0 }, rotationPeriod = 0, startingRotation = 0, axisTilt = 0, orbitData = null, lightIntensity = 0, basicMat = false, children = [], parent = null }) {
		this.name = name;
		this.container = new THREE.Object3D();
		this.mass = mass;
		this.radius = radius;
		this.rotationPeriod = rotationPeriod;
		this.startingRotation = startingRotation * Math.PI / 180;
    const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load(texturePath);
		const material = basicMat ? new THREE.MeshBasicMaterial({ map: texture }) : new THREE.MeshStandardMaterial({ map: texture });
		const geometry = new THREE.SphereGeometry(radius, 80, 40);
		const mesh = new THREE.Mesh(geometry, material);
		this.container.position.set(startingPosition.x, startingPosition.y, startingPosition.z);
		this.orbitData = orbitData;
		this.orbitEllipse = null;
		this.parent = parent;

		if (lightIntensity > 0) {
			const light = new THREE.PointLight(0xffffff, lightIntensity);
			mesh.add(light);
		}

		if(orbitData != null) {
			this.orbitEllipse = this.createOrbitEllipse();
			// console.log(this);
			parent.container.add(this.orbitEllipse);
		}

		mesh.rotation.x = axisTilt * Math.PI / 180;
		this.mesh = mesh;
		this.container.add(mesh);

		this.children = [];
		if(children.length !== 0) {
			children.forEach((child) => {
				let childBody = new CelestialBody({
					name: child.name,
					mass: child.mass, 
					radius: child.radius, 
					texturePath: child.texturePath, 
					startingPosition: child.startingPosition,
					rotationPeriod: child.rotationPeriod, 
					startingRotation: child.startingRotation, 
					axisTilt: child.axisTilt, 
					orbitData: new OrbitData(child.orbitData), 
					lightIntensity: child.ightIntensity, 
					basicMat: child.basicMat,
					children: child.children, 
					parent: this
				});
				this.children.push(childBody);
				this.container.add(childBody.container);
			});
		}
  }

	// move to OrbitData
	createOrbitEllipse() {
		const semiMinorAxis = this.orbitData.semiMajorAxis * Math.sqrt(1 - this.orbitData.eccentricity ** 2);
		const parentPos = Math.sqrt(this.orbitData.semiMajorAxis ** 2 - semiMinorAxis ** 2);
		const curve = new THREE.EllipseCurve(
      parentPos,  0,         // ax, aY
      this.orbitData.semiMajorAxis, semiMinorAxis,      // xRadius, yRadius
      0,  2 * Math.PI,   // aStartAngle, aEndAngle
      false,              // aClockwise
      0                  // aRotation
    );
    
    const points = curve.getPoints( 5000 );

    const ellipseGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const ellipseMaterial = new THREE.MeshBasicMaterial( {color: 0x555555, } );
    
    // Create the final object to add to the scene
    const ellipse = new THREE.Line( ellipseGeometry, ellipseMaterial );
    ellipse.rotateX(Math.PI / 2);
    ellipse.rotateZ(this.orbitData.longitudeOfAscendingNode);
    ellipse.rotateX(-this.orbitData.inclination);
    ellipse.rotateZ(this.orbitData.argumentOfPeriapsis);
    // ellipse.renderOrder = -1;

		return ellipse;
	}

	//TODO move to OrbitData.js
	calculateEllipticalOrbitPosition(date) {
		// parent, period, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode
		let tMillisFromJ2000 = date - Date.UTC(2000, 0, 1, 12, 0, 0);
		let tCenturiesFromJ2000 = tMillisFromJ2000 / 3.15576e12;//(1000*60*60*24*365.25*100);

		// mean longitude
		let L = this.orbitData.L0 + this.orbitData.Ldot * tCenturiesFromJ2000;
    // mean anomaly
		let M = L - this.orbitData.longitudeOfPeriapsis;

    // Solve Kepler's equation for eccentric anomaly (E)
    let E = M;
		// use for loop instead of while true to avoid infinite loops (unlikely)
		for(let i=0; i<100; i++) {
			let dE = (E - this.orbitData.eccentricity * Math.sin(E) - M)/(1 - this.orbitData.eccentricity * Math.cos(E));
			E -= dE;
			if( Math.abs(dE) < 1e-6 ) break;
			if(i === 99) {
				console.log("Early break from Kepler's equation");
			}
		}

		let P = this.orbitData.semiMajorAxis * (Math.cos(E) - this.orbitData.eccentricity);
		let Q = this.orbitData.semiMajorAxis * Math.sin(E) * Math.sqrt(1 - Math.pow(this.orbitData.eccentricity, 2));

    // rotate by argument of periapsis
		let x = -this.orbitData.cosArgumentOfPeriapsis * P - this.orbitData.sinArgumentOfPeriapsis * Q;
		let z = -this.orbitData.sinArgumentOfPeriapsis * P + this.orbitData.cosArgumentOfPeriapsis * Q;
		// // rotate by inclination
		let y = this.orbitData.sinInclination * z;
				z = this.orbitData.cosInclination * z;
		// rotate by longitude of ascending node
		let xtemp = x;
		x = this.orbitData.cosLongitudeOfAscendingNode * xtemp - this.orbitData.sinLongitudeOfAscendingNode * z;
		z = this.orbitData.sinLongitudeOfAscendingNode * xtemp + this.orbitData.cosLongitudeOfAscendingNode * z;
    return new THREE.Vector3(x, y, z);
	}

  update(date) {
		if(this.rotationPeriod != 0) {
			// 3.6e+6 ms per hour
			this.mesh.rotation.y = this.startingRotation + ((date / 3.6e+6) / this.rotationPeriod) * 2 * Math.PI;
		}
		if(this.orbitData != null) {
			const position = this.calculateEllipticalOrbitPosition(date);
			this.container.position.set(...position.toArray());
		}
  }
}
