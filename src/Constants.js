import * as THREE from 'three';

export default class Constants {
  static selectedBody = "0-2";
  // static timeMultiple = 10000;
  static timeMultiple = 1;
  // static startingRelativePosition = new THREE.Vector3(37000,45000,-150000);
  // static startingRelativePosition = new THREE.Vector3(0,3300,-1);
  static startingRelativePosition = new THREE.Vector3(0,2,-20);
  // static startDate = Date.UTC(2000, 0, 1, 12);
  // static startDate = Date.UTC(2024, 2, 24, 9);
  static startDate = Date.now();

  static zoomToBodyTime = 3;
}