import * as THREE from 'three';
import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2, Raycaster } from 'three';
import CelestialBody from './CelestialBody';
import Constants from './Constants';
import { Line2 } from 'three-stdlib';


interface AnimationLoopOptions {
  setVisibleBodies: React.Dispatch<React.SetStateAction<CelestialBody[]>>;
  visibleBodies: CelestialBody[];
  dateRef: React.MutableRefObject<Date>;
  // setDate: React.Dispatch<React.SetStateAction<Date>>;
}

export function useAnimationLoop({ visibleBodies, setVisibleBodies, dateRef}: AnimationLoopOptions) {
  // const { date, setDate } = useContext(DateContext);
  // Get date from context?
  // console.log("USE ANIMATION LOOP");
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls) as any;
  const get = useThree((state) => state.get);
  
  // let date: Date | undefined;
  const selectedBodyRef = useRef<CelestialBody>(visibleBodies[0]);

  const hasSetInitBody = useRef(false);
  if (!hasSetInitBody.current) {
    if(getBodyById(Constants.selectedBody).threeGroupRef.current) {
      // call if selected body is ready to render
      console.log("Setting initial body")
      setSelectedBody(Constants.selectedBody, false);
      // date = Constants.startDate;
      hasSetInitBody.current = true;
    }
  }

  // zoom animation variables
  const zoomingToTarget = useRef(false);
  const zoomPercentage = useRef(0);
  const zoomInitialDistance = useRef(0);

  const raycaster = useRef<Raycaster>(new Raycaster());
  const mouse = useRef<Vector2>(new Vector2());

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
    // setDate(new Date(date.getTime() + delta * 1000 * Constants.timeMultiple));
    // date = new Date(date!.getTime() + delta * 1000 * Constants.timeMultiple);
    // console.log(date.toISOString());

    //TODO move all camera movement into a new function
    let worldPos = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(worldPos);

    let selectedPos = new THREE.Vector3(...worldPos.toArray());

    // Update positions and rotations of celestial bodies
    visibleBodies.forEach((body) => {
      body.update(date, delta);
    });

    let selectedPosAfterUpdate = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(selectedPosAfterUpdate);
    
    let diff = new THREE.Vector3().subVectors(selectedPosAfterUpdate, selectedPos);
    camera.position.add(diff);
    controls.target.set(...selectedPosAfterUpdate.toArray());

    //TODO move to a new function
    if(zoomingToTarget.current === true) {
      let distLeft = new THREE.Vector3().subVectors(selectedPosAfterUpdate, camera.position);
      let normal = distLeft.normalize();
      zoomPercentage.current += 8/(1000 * Constants.zoomToBodyTime);
      let nextDist = easeFunction(zoomPercentage.current) * zoomInitialDistance.current;
      let distToMove = nextDist - (zoomInitialDistance.current - controls.getDistance()) ;

      if((zoomInitialDistance.current - nextDist) <= selectedBody.physicalData.radius * 3) {
        const camPos = new THREE.Vector3().addVectors(selectedPosAfterUpdate, normal.multiplyScalar(selectedBody.physicalData.radius * -3));
        camera.position.set(...camPos.toArray());
        zoomingToTarget.current = false;
        controls.enableZoom = true;
      } else 
      {
        camera.position.add(normal.multiplyScalar(distToMove));
      }
    }

    autoSetEllipseAndIndicatorOpacity(selectedBody);

    // make sun brighter when further away so outer planets are bright enough
    // TODO move this to sun celestialBody
    let distToSun = camera.position.distanceTo(visibleBodies[0].position);
    const sunLight = visibleBodies[0].lightRef!.current!;
    sunLight.intensity = distToSun ** 1.8 * 10;
  });

  function easeFunction(x: number) {
    const a = 10;
    const b = 2;
    return (-((Math.cos((Math.PI * x)/2)) ** a) + 1) ** b;
  }

  function setSelectedBody(id: string, zoomIn = false) {
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

    if(selectedBody.parent === newBody || selectedBody.parent == newBody.parent) {
      // remove children when clicking from body to parent or sibling
      removeVisibleBodies([...selectedBody.children]);
    }

    addVisibleBodies([...newBody.children]);


    let worldPos = new THREE.Vector3();
    newBody.threeGroupRef.current!.getWorldPosition(worldPos);
    selectedBodyRef.current = newBody;

    const controls = get().controls as any;

    if(zoomIn) {
      // set up zoom animation
      controls.enableZoom = false;
      controls.target.set(...newBody.position.toArray());
      // controls.target.set(...worldPos.toArray());
      zoomingToTarget.current = true;
      zoomPercentage.current = 0;
      zoomInitialDistance.current = controls.getDistance();
    } else {
      // just move camera with no zoom animation
      const newRelativePos = new THREE.Vector3(newBody.physicalData.radius * 2, newBody.physicalData.radius / 2, 0);
      let camPos = new THREE.Vector3().addVectors(newBody.threeGroupRef.current!.position, newRelativePos);
      controls.target.set(...(newBody.position).toArray());
      camera.position.set(camPos.x, camPos.y, camPos.z);
    }
    controls.minDistance = Math.max(Constants.cameraNear, newBody.physicalData.radius * 1.1);    
  }

  function getBodyById(id: string) {
    // let indices = id.split('-');
    // indices = indices.slice(1);
    // let body = sun.current;
    // indices.forEach ((index) => {
    //   body = body?.children[parseInt(index)];
    // });
    let selectedBody: CelestialBody = visibleBodies[0];
    visibleBodies.forEach((body) => {
      if(body.id === id) {
        // console.log("returning: ", body.name);
        selectedBody = body;
      }
    })
    return selectedBody;
  }

  function autoSetEllipseAndIndicatorOpacity(selectedBody: CelestialBody) {
    const distance = selectedBody.position.distanceTo(camera.position);
    const radiiToTarget = distance / selectedBody.physicalData.radius;

    if(radiiToTarget < 75) {
      setEllipseAndIndicatorOpacity(selectedBody, 0);
    } else if(radiiToTarget < 400) {
      setEllipseAndIndicatorOpacity(selectedBody, (radiiToTarget - 70) / 400);
    } else {
      setEllipseAndIndicatorOpacity(selectedBody, 0.8);
    }
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
