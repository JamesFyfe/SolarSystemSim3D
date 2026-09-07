import * as THREE from 'three';
import { Dispatch, useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls } from 'three-stdlib';
import CelestialBody from '../classes/CelestialBody';
import Constants from '../Constants';
import { createTransitionState, startTransition, updateTransition } from '../utils/Transition';
import { VisibleBodiesAction, VisibleBody } from '../state/visibleBodies';
import { advance } from '../state/simulationClock';

interface AnimationLoopOptions {
  /** The Sun: root of the body tree. */
  root: CelestialBody;
  bodiesById: ReadonlyMap<string, CelestialBody>;
  visibleBodies: VisibleBody[];
  dispatch: Dispatch<VisibleBodiesAction>;
}

/** Callback for focusing the camera on a body, optionally with a fly-to animation. */
export type SelectBody = (id: string, transition?: boolean) => void;

// Scratch vectors, reused every frame to avoid allocations
const _posBefore = new THREE.Vector3();
const _posAfter = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _camPos = new THREE.Vector3();

/**
 * Drives the simulation: advances the clock, moves every visible body, keeps
 * the camera locked to the selected body and adjusts level-of-detail.
 */
export default function useAnimationLoop({ root, bodiesById, visibleBodies, dispatch }: AnimationLoopOptions) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  const get = useThree((state) => state.get);

  const selectedBodyRef = useRef<CelestialBody>(root);
  const transitionRef = useRef(createTransitionState());

  const setSelectedBody = useCallback<SelectBody>(
    (id, transition = false) => {
      const previous = selectedBodyRef.current;
      const next = bodiesById.get(id);
      // Read controls from the store so this callback stays stable
      const controls = get().controls as OrbitControls | null;
      if (!next || next === previous || !next.threeGroupRef.current || !controls) {
        return;
      }

      setEllipseAndIndicatorOpacity(previous, 0.8);
      dispatch({ type: 'select', previous, next });
      selectedBodyRef.current = next;

      if (transition) {
        startTransition(transitionRef.current, controls, next);
      } else {
        // Snap the camera next to the body with no animation
        _camPos
          .set(next.physicalData.radius * 2, next.physicalData.radius / 2, 0)
          .add(next.threeGroupRef.current.position);
        controls.target.copy(next.position);
        camera.position.copy(_camPos);
      }
      controls.minDistance = Math.max(Constants.cameraNear, next.physicalData.radius * 1.1);
    },
    [bodiesById, camera, dispatch, get],
  );

  // Focus the initial body once the controls exist and the scene has mounted
  const hasSelectedInitialBody = useRef(false);
  useEffect(() => {
    if (hasSelectedInitialBody.current || !controls) {
      return;
    }
    hasSelectedInitialBody.current = true;
    setSelectedBody(Constants.selectedBody, false);
  }, [controls, setSelectedBody]);

  useFrame((_state, delta) => {
    const selectedBody = selectedBodyRef.current;
    const selectedGroup = selectedBody.threeGroupRef.current;
    if (!controls || !selectedGroup) {
      return;
    }

    const date = advance(delta);

    selectedGroup.getWorldPosition(_posBefore);
    visibleBodies.forEach((entry) => entry.body.update(date));
    selectedGroup.getWorldPosition(_posAfter);

    // Move the camera with the selected body so it stays framed
    camera.position.add(_diff.subVectors(_posAfter, _posBefore));
    controls.target.copy(_posAfter);

    updateTransition(transitionRef.current, delta, _posAfter, selectedBody, camera, controls);
    updateEllipseAndIndicatorOpacities(visibleBodies, selectedBody, camera);
    updateRenderQuality(selectedBody);
    updateSunBrightness();
  });

  /** Swap the selected body between sphere and point based on its apparent size. */
  function updateRenderQuality(body: CelestialBody) {
    if (body.isStar) {
      return;
    }
    const distanceToTarget = body.position.distanceTo(camera.position);
    const radiiToTarget = distanceToTarget / body.physicalData.radius;

    // kinda just guess and checked for this but seems ok
    const apparentSize = (body.physicalData.radius ** 0.5 * 100) / radiiToTarget;
    const pointSize = body.physicalData.radius ** 0.5 / 5;
    const fullyRendered = apparentSize > pointSize;

    // Only dispatch on change; this runs every frame
    const entry = visibleBodies.find((candidate) => candidate.body === body);
    if (entry && entry.fullyRendered !== fullyRendered) {
      dispatch({ type: 'setFullyRendered', body, fullyRendered });
    }
  }

  /** Brighten the sun with distance so the outer planets stay lit. */
  function updateSunBrightness() {
    const sunLight = root.lightRef?.current;
    if (sunLight) {
      const distToSun = camera.position.distanceTo(root.position);
      sunLight.intensity = distToSun ** 1.8 * 10;
    }
  }

  return { setSelectedBody };
}

function updateEllipseAndIndicatorOpacities(
  visibleBodies: VisibleBody[],
  selectedBody: CelestialBody,
  camera: THREE.Camera,
) {
  const distanceToTarget = selectedBody.position.distanceTo(camera.position);
  const radiiToTarget = distanceToTarget / selectedBody.physicalData.radius;

  if (radiiToTarget < 75) {
    setEllipseAndIndicatorOpacity(selectedBody, 0);
  } else if (radiiToTarget < 400) {
    setEllipseAndIndicatorOpacity(selectedBody, (radiiToTarget - 70) / 400);
  } else {
    setEllipseAndIndicatorOpacity(selectedBody, 0.8);
  }

  visibleBodies.forEach(({ body }) => {
    if (!body.parent || body === selectedBody) {
      return;
    }
    const distToParent = body.position.distanceTo(body.parent.position);
    const camDistToParent = camera.position.distanceTo(body.parent.position);
    const distMultiple = camDistToParent / distToParent;
    if (distMultiple > 60) {
      setEllipseAndIndicatorOpacity(body, 0);
    } else if (distMultiple > 30) {
      setEllipseAndIndicatorOpacity(body, (60 - distMultiple) / 37.5);
    } else {
      setEllipseAndIndicatorOpacity(body, 0.8);
    }
  });
}

function setEllipseAndIndicatorOpacity(body: CelestialBody, opacity: number) {
  const ellipse = body.ellipseRef?.current?.children[0] as THREE.Line | undefined;
  const ellipseMaterial = ellipse?.material;
  if (ellipse && ellipseMaterial && !Array.isArray(ellipseMaterial)) {
    ellipse.visible = opacity > 0;
    if (opacity > 0) {
      ellipseMaterial.opacity = opacity;
    }
  }

  const indicator = body.indicatorRef.current;
  if (indicator) {
    indicator.visible = opacity > 0;
    if (opacity > 0) {
      indicator.fillOpacity = opacity;
    }
  }
}
