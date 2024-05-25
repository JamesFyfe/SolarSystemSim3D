import * as THREE from 'three';
import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2, Raycaster } from 'three';
import CelestialBody from '../classes/CelestialBody';
import Constants from '../Constants';
import { Line2 } from 'three-stdlib';
import { startTransition, updateTransition } from './Transition';


interface AnimationLoopOptions {
  setVisibleBodies: React.Dispatch<React.SetStateAction<CelestialBody[]>>;
  visibleBodies: CelestialBody[];
  dateRef: React.MutableRefObject<Date>;
}

export function AnimationLoop({ visibleBodies, setVisibleBodies, dateRef}: AnimationLoopOptions) {
  // console.log("USE ANIMATION LOOP");
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls) as any;
  const get = useThree((state) => state.get);
  
  const selectedBodyRef = useRef<CelestialBody>(visibleBodies[0]);

  // this block only runs on first render once selectedBody is loaded
  const hasSetInitBody = useRef(false);
  if (!hasSetInitBody.current) {
    if(getBodyById(Constants.selectedBody).threeGroupRef.current) {
      // call if selected body is ready to render
      console.log("Setting initial body")
      setSelectedBody(Constants.selectedBody, false);
      hasSetInitBody.current = true;
    }
  }

  const raycaster = useRef<Raycaster>(new Raycaster());
  const mouse = useRef<Vector2>(new Vector2());

  const handleMouseClick = useCallback(
    (event: MouseEvent) => {
      mouse.current.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      const intersects = raycaster.current.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // console.log('Clicked on:', intersects[0].object.userData.bodyId);
        if(intersects[0].object.userData.bodyId === undefined) {
          console.log(intersects[0].object, " does not have bodyId");
          return;
        }
        setSelectedBody(intersects[0].object.userData.bodyId, true);
      }
    },
    [gl, camera, scene ]
  );

  useEffect(() => {
    window.addEventListener('click', handleMouseClick);
    return () => {
      window.removeEventListener('click', handleMouseClick);
    };
  }, [handleMouseClick]);

	useFrame(( state, delta ) => {
    if(!hasSetInitBody.current) {
      return;
    }
    const selectedBody = selectedBodyRef.current;
    if(!selectedBody || controls === null || !selectedBody.threeGroupRef.current) {
      return;
    }
    const date = dateRef.current;
    dateRef.current = new Date(dateRef.current.getTime() + delta * 1000 * Constants.timeMultiple);

    const selectedPosBeforeUpdate = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(selectedPosBeforeUpdate);

    // Update positions and rotations of celestial bodies
    visibleBodies.forEach((body) => {
      body.update(date, delta);
    });

    // update camera position and target to follow selectedBody
    let selectedPosAfterUpdate = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(selectedPosAfterUpdate);
    let diff = new THREE.Vector3().subVectors(selectedPosAfterUpdate, selectedPosBeforeUpdate);
    camera.position.add(diff);
    controls.target.set(...selectedPosAfterUpdate.toArray());

    updateTransition(delta, selectedPosAfterUpdate, selectedBody, camera, controls);

    updateEllipseAndIndicatorOpacities(visibleBodies, selectedBody);

    updateSunBrightness();
  });

  function updateSunBrightness() {
    // make sun brighter when further away so outer planets are bright enough
    const sun = visibleBodies.find((body) => body.name === "Sun");
    if(sun) {
      let distToSun = camera.position.distanceTo(visibleBodies[0].position);
      const sunLight = visibleBodies[0].lightRef!.current!;
      sunLight.intensity = distToSun ** 1.8 * 10;
    }
  }

  function addVisibleBodies(bodies: CelestialBody[]) {
    if(bodies.length !== 0) {
      setVisibleBodies([...visibleBodies, ...bodies.filter(body => !visibleBodies.includes(body))]);
    }
  }

  function removeVisibleBodies(bodies: CelestialBody[]) {
    if(bodies.length !== 0) {
      setVisibleBodies(visibleBodies.filter(body => !bodies.includes(body)));
    }
  }

  function setSelectedBody(id: string, transition = false) {
    const selectedBody = selectedBodyRef.current;
    if(selectedBody.id === id) {
      return;
    }

    setEllipseAndIndicatorOpacity(selectedBody, 0.8);

    let newBody = getBodyById(id);
    console.log("newBody ", newBody);
    if(newBody === undefined || selectedBody === undefined) {
      return;
    }

    if(selectedBody.parent === newBody || selectedBody.parent === newBody.parent) {
      // remove children when clicking from body to parent or sibling
      removeVisibleBodies([...selectedBody.children]);
    }

    addVisibleBodies([...newBody.children]);

    let worldPos = new THREE.Vector3();
    newBody.threeGroupRef.current!.getWorldPosition(worldPos);
    selectedBodyRef.current = newBody;

    const controls = get().controls as any;

    if(transition) {
      startTransition(controls, newBody);
    } else {
      // just move camera with no transition animation
      const newRelativePos = new THREE.Vector3(newBody.physicalData.radius * 2, newBody.physicalData.radius / 2, 0);
      let camPos = new THREE.Vector3().addVectors(newBody.threeGroupRef.current!.position, newRelativePos);
      controls.target.set(...(newBody.position).toArray());
      camera.position.set(camPos.x, camPos.y, camPos.z);
    }
    controls.minDistance = Math.max(Constants.cameraNear, newBody.physicalData.radius * 1.1);    
  }

  function getBodyById(id: string) {
    let selectedBody: CelestialBody = visibleBodies[0];
    visibleBodies.forEach((body) => {
      if(body.id === id) {
        selectedBody = body;
      }
    })
    return selectedBody;
  }

  function updateEllipseAndIndicatorOpacities(visibleBodies: CelestialBody[], selectedBody: CelestialBody) {
    const distanceToTarget = selectedBody.position.distanceTo(camera.position);
    const radiiToTarget = distanceToTarget / selectedBody.physicalData.radius;

    if(radiiToTarget < 75) {
      setEllipseAndIndicatorOpacity(selectedBody, 0);
    } else if(radiiToTarget < 400) {
      setEllipseAndIndicatorOpacity(selectedBody, (radiiToTarget - 70) / 400);
    } else {
      setEllipseAndIndicatorOpacity(selectedBody, 0.8);
    }

    visibleBodies.forEach((body) => {
      if(!body.parent || body === selectedBody) {
        return;
      }
      const distToParent = body.position.distanceTo(body.parent.position);
      const camDistToParent = camera.position.distanceTo(body.parent.position);
      const distMulitple = camDistToParent / distToParent;
      if(distMulitple > 60) {
        setEllipseAndIndicatorOpacity(body, 0);
      } else if(distMulitple > 30) {
        setEllipseAndIndicatorOpacity(body, (60 - distMulitple) / 37.5);
      } else {
        setEllipseAndIndicatorOpacity(body, 0.8);
      }
    });
  }

  function setEllipseAndIndicatorOpacity(body: CelestialBody, opacity: number) {
    const ellipse = body.ellipseRef?.current?.children[0] as Line2;
    if(ellipse) {
      if(opacity <= 0) {
        ellipse.visible = false;
      } else {
        ellipse.visible = true;
        ellipse.material.opacity = opacity;
      }
    }

    const indicator = body.indicatorRef.current as unknown as THREE.Object3D & {
      fillOpacity?: number;
    };
    if(indicator) {
      if(opacity <= 0) {
        indicator.visible = false;
      } else {
        indicator.visible = true;
        indicator.fillOpacity = opacity;
      }
    }
  }

  return { setSelectedBody };
}
