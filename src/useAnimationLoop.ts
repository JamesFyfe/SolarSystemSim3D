import * as THREE from 'three';
import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2, Raycaster } from 'three';
import CelestialBody from './CelestialBody';
import Constants from './Constants';


interface AnimationLoopOptions {
  sun: React.MutableRefObject<CelestialBody>;
  setVisibleBodies: React.Dispatch<React.SetStateAction<CelestialBody[]>>;
  visibleBodies: CelestialBody[];
}

export function useAnimationLoop({ sun, visibleBodies, setVisibleBodies}: AnimationLoopOptions) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls) as any;
  const get = useThree((state) => state.get);
  
  let date = Constants.startDate;
  const selectedBodyRef = useRef<CelestialBody>(sun.current);
  const zoomingToTarget = useRef(false);
  const zoomPercentage = useRef(0);
  const zoomInitialDistance = useRef(0);

  const raycaster = useRef<Raycaster>(new Raycaster());
  const mouse = useRef<Vector2>(new Vector2());

  function addVisibleBodies(bodies: CelestialBody[]) {
    if(bodies.length !== 0) {
      setVisibleBodies([...visibleBodies, ...bodies]);
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
        console.log('Clicked on:', intersects[0].object.userData.bodyId);
        if(intersects[0].object.userData.bodyId === undefined) {
          console.log(intersects[0].object, " does not have bodyId");
          return;
        }
        setSelectedBody(intersects[0].object.userData.bodyId, true);
      }
    },
    [gl, camera, scene]
  );

  useEffect(() => {
    window.addEventListener('click', handleMouseClick);
    return () => {
      window.removeEventListener('click', handleMouseClick);
    };
  }, [handleMouseClick]);

	useFrame(( state, delta ) => {
    const selectedBody = selectedBodyRef.current;
    if(controls === null || !selectedBody.threeGroupRef.current) {
      return;
    }
    date = new Date(date.getTime() + delta * 1000 * Constants.timeMultiple);


    //TODO move all camera movement into a new function
    let worldPos = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(worldPos);

    let selectedPos = new THREE.Vector3(...worldPos.toArray());

    // Update positions and rotations of celestial bodies
    updateBodyAndChildren(sun.current, date, delta);

    let selectedPosAfterUpdate = new THREE.Vector3();
    selectedBody.threeGroupRef.current.getWorldPosition(selectedPosAfterUpdate);
    
    let diff = new THREE.Vector3().subVectors(selectedPosAfterUpdate, selectedPos);
    camera.position.add(diff);
    controls.target.set(...selectedPosAfterUpdate.toArray());

    //TODO move to a new function
    if(zoomingToTarget.current == true) {
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

      // make sun brighter when further away so outer planets are bright enough
      let distToSun = camera.position.distanceTo(sun.current.position);
      const sunLight = sun.current.threeGroupRef.current!.children[2] as THREE.PointLight;
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
    const controls = get().controls as any;
    // TODO make orbit ellipse and indicator fade away to invisble when close to planet
    // if(selectedBody.orbitEllipse != null) {
    //   selectedBody.orbitEllipse.visible = true;
    //   selectedBody.orbitEllipse.material.opacity = 0.8;
    // }
    // selectedBody.indicator.visible = true;
    // selectedBody.indicator.material.opacity = 0.8;
    let newBody = getBodyById(id);
    console.log("newBody ", newBody);
    if(newBody === undefined || selectedBody === undefined) {
      return;
    }

    if(newBody.name === "Sun") {
      // remove moons when clicking from planet to sun
      removeVisibleBodies([...selectedBody.children]);
    } else {
      // dont remove moons when clicking from parent to moon or moon to parent
      if(newBody.parent !== selectedBody && 
        selectedBody.parent !== newBody) {
          removeVisibleBodies([...selectedBody.children]);
      }
      addVisibleBodies([...newBody.children]);
    }

    let worldPos = new THREE.Vector3();
    newBody.threeGroupRef.current!.getWorldPosition(worldPos);
    selectedBodyRef.current = newBody;

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
    let indices = id.split('-');
    indices = indices.slice(1);
    let body = sun.current;
    indices.forEach ((index) => {
      body = body?.children[parseInt(index)];
    });
    return body;
  }
  return { setSelectedBody };
}

function updateBodyAndChildren(body: CelestialBody, date: Date, elapsed: number) {
  body.update(date, elapsed);
  body.children.forEach((child) => {
    updateBodyAndChildren(child, date, elapsed);
  });
}
