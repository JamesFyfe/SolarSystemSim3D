import * as THREE from 'three';

export default class Constants {
  static selectedBody = "0";
  // static timeMultiple = 1000;
  static timeMultiple = 500;
  static startingRelativePosition = new THREE.Vector3(3300,0,-1);
  // static startingRelativePosition = new THREE.Vector3(0,100000,-200000);
  // static startingRelativePosition = new THREE.Vector3(10000,60000,-300000);
  // static startDate = Date.UTC(2000, 0, 1, 12);
  // static startDate = Date.UTC(2024, 2, 24, 9);
  static startDate = new Date();

  static zoomToBodyTime = 3;

  static cameraNear = 0.0005;
}