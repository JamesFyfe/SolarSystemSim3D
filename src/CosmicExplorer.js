import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import CelestialBody from './CelestialBody.js';
import Constants from './Constants.js';
// import OrbitData from './OrbitData.js'
// import DateDisplay from './DateDisplay';

const CosmicExplorer = () => {
  const animationIdRef = useRef(null);
  const composerRef = useRef(null);
  const sun = useRef(null);
  // const selectedBody = useRef(null);
  // const [myTimestamp, setMyTimestamp] = useState(Date.now());

  useEffect(() => {
    let date = Constants.startDate;
    let previousTimestamp, selectedBody, zoomingToTarget = false, zoomPercentage, zoomInitialDistance;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 20000000);
    camera.position.set(0, 2000, -20000);
    // let relativePosition = Constants.startingRelativePosition;
    // relativePosition = new THREE.Vector3(1,0.1,0);

    const renderer = new THREE.WebGLRenderer({logarithmicDepthBuffer: true}); //{ antialias: true }
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.toneMapping = THREE.ReinhardToneMapping;
    // renderer.toneMappingExposure = 0.1;

    // Set up scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02)
    scene.add(ambientLight);

    // Set up bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1, 0.2, 0.01);    

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;
    composerRef.current.setSize(window.innerWidth, window.innerHeight);

    // Set up OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.zoomSpeed = 2;
    controls.maxDistance = 10000000;

    const animate = (timestamp) => {
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const elapsed = timestamp - previousTimestamp;
      // date += timeSpeed;
      date += elapsed * Constants.timeMultiple
      // setMyTimestamp(date);

      // console.log(new Date(date).toLocaleString());

      let worldPos = new THREE.Vector3();
      selectedBody.container.getWorldPosition(worldPos);

      let selectedPos = new THREE.Vector3(...worldPos.toArray());
      //update all positions and rotations
      updateBodyAndChildren(sun.current, date, elapsed);
      
      let selectedPosAfter = new THREE.Vector3();
      selectedBody.container.getWorldPosition(selectedPosAfter);
      
      let diff = new THREE.Vector3().subVectors(selectedPosAfter, selectedPos);
      camera.position.add(diff);
      controls.target.set(...selectedPosAfter.toArray());

      if(zoomingToTarget) {
        let distLeft = new THREE.Vector3().subVectors(selectedPosAfter, camera.position);
        let normal = distLeft.normalize();
        zoomPercentage += 8/(1000 * Constants.zoomToBodyTime);
        let nextDist = easeFunction(zoomPercentage) * zoomInitialDistance;
        let distToMove = nextDist - (zoomInitialDistance - controls.getDistance()) ;

        if((zoomInitialDistance - nextDist) <= selectedBody.radius * 3) {
          const camPos = new THREE.Vector3().addVectors(selectedPosAfter, normal.multiplyScalar(selectedBody.radius * -3));
          camera.position.set(...camPos.toArray());
          zoomingToTarget = false;
          controls.enableZoom = true;
        } else 
        {
          camera.position.add(normal.multiplyScalar(distToMove));
        }
      }

      controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
      if(selectedBody.orbitEllipse != null) {
        setOrbitEllipseOpac();
      }

      // make sun brighter when further away so outer planets are bright enough
      let distToSun = camera.position.distanceTo(sun.current.container.position);
      sun.current.mesh.children[0].intensity = distToSun ** 1.8 * 8;

      composerRef.current.render();
      previousTimestamp = timestamp;

      // Request the next animation frame
      animationIdRef.current = requestAnimationFrame(animate);
    };

    const fetchData = async () => {
      try {
        const response = await fetch('./PlanetData.json');
        const data = await response.json();

        // Create CelestialBody instances based on the loaded data
        sun.current = data.map(bodyData => new CelestialBody(bodyData))[0];
        selectedBody = sun.current;
        // Add celestial bodies to the scene
        scene.add(sun.current.container);

      } catch (error) {
        console.error('Error loading celestial data:', error);
      }
    };

    fetchData().then(() => {
      // render all objects then wait until textures are loaded before starting animation
      composerRef.current.render();
      // setTimeout(function() {
        setSelectedBody(Constants.selectedBody);
        animationIdRef.current = requestAnimationFrame(animate);
      // }, 10);
    });

    // const grid = new THREE.GridHelper( 1000000, 100, 0x222222, 0x222222 );
    // grid.renderOrder = 2;
    // scene.add( grid );

    // const axesHelper = new THREE.AxesHelper( 50000 );
    // scene.add( axesHelper );

    // var geo = new THREE.PlaneGeometry(500000, 500000);
    // var mat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    // var plane = new THREE.Mesh(geo, mat);
    // plane.rotateX( - Math.PI / 2);
    // scene.add(plane);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', onMouseClick, false);

    function onMouseClick(event) {
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate objects intersecting the ray
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Check if any mesh was clicked
      let object;
      if (intersects.length > 0) {
        for(let i=0; i<intersects.length; i++) {
          object = intersects[i].object;
          console.log(object);
          if(object.type !== 'Line') {
            break;
          }
        }

        // Call a function when the mesh is clicked
        handleMeshClick(object);
      }
    }

    function handleMeshClick(object) {
      console.log(object);
      if(object.bodyId !== undefined && object.bodyId != selectedBody.bodyId) {
        if(object.bodyId.substring(0, 3) != selectedBody.bodyId && 
           object.bodyId.substring(0, 3) != selectedBody.parent.bodyId) {
          setSelectedBody(object.bodyId.substring(0, 3), {zoomIn: true});
        } else {
          setSelectedBody(object.bodyId, {zoomIn: true});
        }
      }
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      composerRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    const handleZoomChange = () => {
      // Example: Adjust bloom parameters based on the camera's distance
      // const distance = sun.current.container.position.distanceTo(cameraRef.current.position);
      // bloomPass.strength = 1 + distance * 0.0000001;
      // composerRef.current.render();
    };

    controls.addEventListener('change', handleZoomChange);

    function updateBodyAndChildren(body, date, elapsed) {
      body.update(date, elapsed, camera);
      body.children.forEach((child) => {
        updateBodyAndChildren(child, date, elapsed);
      });
    }

    function getBodyById(id) {
      let indices = id.split('-');
      indices = indices.slice(1);
      let body = sun.current;
      indices.forEach ((index) => {
        body = body.children[parseInt(index)];
      });
      return body;
    }

    function setSelectedBody(id, zoomIn = false) {
      if(selectedBody.orbitEllipse != null) {
        selectedBody.orbitEllipse.visible = true;
        selectedBody.orbitEllipse.material.opacity = 0.8;
      }
      selectedBody.indicator.visible = true;
      selectedBody.indicator.material.opacity = 0.8;
      let newBody = getBodyById(id);
      // if we aren't selecting the current objects parent, or child, or sibling,
      // make current objects moons not visible (should do this after completing zoom)
      if(newBody.parent !== selectedBody && 
        selectedBody.parent !== newBody && 
        selectedBody.parent !== newBody.parent) {
        selectedBody.children.forEach((moon) => moon.container.visible = false);
      }
      newBody.children.forEach((moon) => moon.container.visible = true);


      let worldPos = new THREE.Vector3();
      newBody.container.getWorldPosition(worldPos);
      selectedBody = newBody;

      if(zoomIn) {
        controls.enableZoom = false;
        controls.target.set(...worldPos.toArray());
        controls.minDistance = newBody.radius * 2;
        zoomingToTarget = true;
        zoomPercentage = 0;
        zoomInitialDistance = controls.getDistance();
      }
    }

    function setOrbitEllipseOpac() {
      const radiiToTarget = controls.getDistance() / selectedBody.radius;
      if(radiiToTarget < 75) {
        selectedBody.orbitEllipse.visible = false;
        selectedBody.indicator.visible = false;
      } else if(radiiToTarget < 250) {
        selectedBody.orbitEllipse.visible = true;
        selectedBody.orbitEllipse.material.opacity = (radiiToTarget - 70) / 250;
        selectedBody.indicator.visible = true;
        selectedBody.indicator.material.opacity = (radiiToTarget - 70) / 250;
      } else {
        selectedBody.orbitEllipse.visible = true;
        selectedBody.orbitEllipse.material.opacity = 0.8;
        selectedBody.indicator.visible = true;
        selectedBody.indicator.material.opacity = 0.8;
      }
    }

    function easeFunction(x) {
      const a = 10;
      const b = 2;
      return (-((Math.cos((Math.PI * x)/2)) ** a) + 1) ** b;
    }

    // Clean up on component unmount
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      controls.dispose();
      document.body.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      {/* <DateDisplay timestamp={myTimestamp} /> */}
    </>
  );

};

export default CosmicExplorer;
