import * as THREE from 'three';

export default class Ring {
  constructor({distance, width, color, opacity, texturePath}) {
		distance /= 1000;
		width /= 1000;
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load(texturePath);
		const ringMat = new THREE.MeshBasicMaterial({map: texture, color: color, transparent: true, opacity: opacity, side: THREE.DoubleSide});
		const ringGeometry = new THREE.RingGeometry(distance, distance + width, 100);
		const mesh = new THREE.Mesh(ringGeometry, ringMat);
		mesh.rotateX(Math.PI / 2);
		this.mesh = mesh;
  }
}