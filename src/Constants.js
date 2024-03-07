import * as THREE from 'three';

export default class Constants {
  static selectedPlanet = 3;
  // static timeMultiple = 1000000;
  static timeMultiple = 1;
  // static timeMultiple = 1;
  // static startingRelativePosition = new THREE.Vector3(37000,45000,-150000);
  // static startingRelativePosition = new THREE.Vector3(0,3300,-1);
  static startingRelativePosition = new THREE.Vector3(0,0.1,-1);
  // static startDate = Date.UTC(2020, 6, 21, 20);
  // static startDate = Date.UTC(2024, 2, 21, 9);
  static startDate = Date.now();
}