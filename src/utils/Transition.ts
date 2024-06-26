import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import type { OrbitControls } from 'three-stdlib';

const transitionToBodyTime = 3;
let transitioningToTarget = false;
let transitionPercentage = 0;
let transitionInitialDistance = 0;

function easeFunction(x: number) {
  const a = 10;
  const b = 2;
  return (-((Math.cos((Math.PI * x) / 2)) ** a) + 1) ** b;
}

export function startTransition(
  controls: OrbitControls,
  newBody: CelestialBody,
) {
  controls.enableZoom = false;
  controls.target.set(...newBody.position.toArray());
  transitioningToTarget = true;
  transitionPercentage = 0;
  transitionInitialDistance = controls.getDistance();
}

export function updateTransition(
  delta: number,
  selectedPosAfterUpdate: THREE.Vector3,
  selectedBody: CelestialBody,
  camera: THREE.Camera,
  controls: OrbitControls
) {
  if (transitioningToTarget === true) {
    const distLeft = new THREE.Vector3().subVectors(selectedPosAfterUpdate, camera.position);
    const normal = distLeft.normalize();
    transitionPercentage += delta / 10 * transitionToBodyTime;
    const nextDist = easeFunction(transitionPercentage) * transitionInitialDistance;
    const distToMove = nextDist - (transitionInitialDistance - controls.getDistance());

    if ((transitionInitialDistance - nextDist) <= selectedBody.physicalData.radius * 3) {
      const camPos = new THREE.Vector3().addVectors(selectedPosAfterUpdate, normal.multiplyScalar(selectedBody.physicalData.radius * -3));
      camera.position.set(...camPos.toArray());
      transitioningToTarget = false;
      controls.enableZoom = true;
    } else {
      camera.position.add(normal.multiplyScalar(distToMove));
    }
  }
}
