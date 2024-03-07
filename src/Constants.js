import * as THREE from 'three';

export default class Constants {
  static selectedPlanet = 0;
  // static timeMultiple = 1000000;
  static timeMultiple = 1;
  // static startingRelativePosition = new THREE.Vector3(37000,45000,-150000);
  static startingRelativePosition = new THREE.Vector3(0,380000,-1);
  // static startDate = Date.UTC(2000, 0, 1, 12);
  // static startDate = Date.UTC(2000, 2, 19, 8);
  static startDate = Date.now();
}