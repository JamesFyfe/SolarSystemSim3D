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
		const material = basicMat ? new THREE.MeshStandardMaterial({ 
			emissive: "rgb(160, 160, 90)",
			emissiveMap: texture,
			emissiveIntensity: 3
		}) : new THREE.MeshStandardMaterial({ map: texture });
		const geometry = new THREE.SphereGeometry(radius, 80, 40);
		const mesh = new THREE.Mesh(geometry, material);
		this.container.position.set(Math.random() * 5000, Math.random() * 5000, Math.random() * 5000);
		this.orbitData = orbitData;
		this.orbitEllipse = null;
		this.parent = parent;

		if (lightIntensity > 0) {
			const light = new THREE.PointLight(0xffffff, lightIntensity);
			mesh.add(light);
		}

		if(orbitData != null) {
			this.orbitEllipse = this.orbitData.createOrbitEllipse();
			parent.container.add(this.orbitEllipse);
			// this.orbitEllipse.visible = false;
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

  update(date) {
		if(this.rotationPeriod != 0) {
			// 3.6e+6 ms per hour
			this.mesh.rotation.y = this.startingRotation + ((date / 3.6e+6) / this.rotationPeriod) * 2 * Math.PI;
		}
		if(this.orbitData != null) {
			const position = this.orbitData.calculateEllipticalOrbitPosition(date);
			this.container.position.set(...position.toArray());
		}
  }
}
