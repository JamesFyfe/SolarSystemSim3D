import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import type { OrbitControls } from 'three-stdlib';

const transitionToBodyTime = 3;

/** Progress of the camera fly-to animation. Owned by the caller (kept in a ref). */
export interface TransitionState {
  active: boolean;
  percentage: number;
  initialDistance: number;
}

export function createTransitionState(): TransitionState {
  return { active: false, percentage: 0, initialDistance: 0 };
}

function easeFunction(x: number) {
  const a = 10;
  const b = 2;
  return (-(Math.cos((Math.PI * x) / 2) ** a) + 1) ** b;
}

export function startTransition(state: TransitionState, controls: OrbitControls, newBody: CelestialBody) {
  controls.enableZoom = false;
  controls.target.copy(newBody.position);
  state.active = true;
  state.percentage = 0;
  state.initialDistance = controls.getDistance();
}

const _distLeft = new THREE.Vector3();
const _camPos = new THREE.Vector3();

export function updateTransition(
  state: TransitionState,
  delta: number,
  selectedPosAfterUpdate: THREE.Vector3,
  selectedBody: CelestialBody,
  camera: THREE.Camera,
  controls: OrbitControls,
) {
  if (!state.active) {
    return;
  }
  const normal = _distLeft.subVectors(selectedPosAfterUpdate, camera.position).normalize();
  state.percentage += (delta / 10) * transitionToBodyTime;
  const nextDist = easeFunction(state.percentage) * state.initialDistance;
  const distToMove = nextDist - (state.initialDistance - controls.getDistance());

  if (state.initialDistance - nextDist <= selectedBody.physicalData.radius * 3) {
    _camPos.addVectors(selectedPosAfterUpdate, normal.multiplyScalar(selectedBody.physicalData.radius * -3));
    camera.position.copy(_camPos);
    state.active = false;
    controls.enableZoom = true;
  } else {
    camera.position.add(normal.multiplyScalar(distToMove));
  }
}
