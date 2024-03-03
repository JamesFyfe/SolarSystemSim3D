import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import CelestialBody from './CelestialBody.js'
import OrbitInfo from './OrbitInfo.js'
import DateDisplay from './DateDisplay';

const CosmicExplorer = () => {
  const animationIdRef = useRef(null);
  const composerRef = useRef(null);
  const cameraRef = useRef(null);
  // const [myTimestamp, setMyTimestamp] = useState(Date.now());

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000000);
    cameraRef.current = camera;
    // camera.position.set(0, 60000, 130000);
    let date = Date.now();
    const timeSpeed = 2000000;
    let selectedBody;
    let relativePosition = new THREE.Vector3(0,20,100);
    relativePosition.set(0,100000,100000);
    let previousTimestamp;
    
    const renderer = new THREE.WebGLRenderer({logarithmicDepthBuffer: true}); //{ antialias: true }
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Set up scene
    scene.add(new THREE.AmbientLight(0xffffff, 0.02));

    const grid = new THREE.GridHelper( 1000000, 25, 0x222222, 0x222222 );
    grid.renderOrder = -2;
    scene.add( grid );


    // constructor(name, mass, radius, texturePath, startingPosition, rotationSpeed, orbitInfo, lightIntensity )
    let sun = new CelestialBody('Sun', 1989000, 696.34, '/images/star_texture_orange.jpeg', { x: 0, y: 0, z: 0 }, 24.47, null, 20000000000, true);
    
    //Mercury
    // (parent, L0, Ldot, semiMajorAxis, eccentricity, argumentOfPeriapsis, inclination, longitudeOfAscendingNode)
    let mercuryOrbit = new OrbitInfo(sun, 252.25032350 * Math.PI / 180, 58517.81538729 * Math.PI / 180, 57909.22654, 0.20563593, 29.124, 7.005, 48.33);
    let mercury = new CelestialBody('Mercury', 0.3285, 24.397, '/images/mercury_texture.jpeg', { x: 57909, y: 0, z: 0 }, 58.65, mercuryOrbit);

    let venusOrbit = new OrbitInfo(sun, 181.97909950 * Math.PI / 180, 149472.67411175 * Math.PI / 180, 108209.4745374, 0.00677672, 54.9226, 3.395, 76.68069);
    let venus = new CelestialBody('Venus', 4.8673, 60.518, '/images/venus_texture.jpeg', { x: 0, y: 0, z: 0 }, 58.65, venusOrbit);

    //Add all meshes to scene
    scene.add(sun.container);

    // Set up bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.01);
    // const distance = sun.current.container.position.distanceTo(cameraRef.current.position);
    // bloomPass.strength = 1 + distance * 0.0000001;
    

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
    setSelectedBody(sun);

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

    // const G = 6.6743 * 10 ** 11;
    const animate = (timestamp) => {
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const elapsed = timestamp - previousTimestamp;
      date += timeSpeed;
      // setMyTimestamp(date);

      // let dateStr = new Date(date).toLocaleDateString();
      // console.log(dateStr);

      let selectedPos = new THREE.Vector3(...selectedBody.container.position.toArray());
      //update all positions and rotations
      updateBodyAndChildren(sun, date);

      let selectedPosAfter = selectedBody.container.position;

      const diff = new THREE.Vector3().subVectors(selectedPosAfter, selectedPos);
      camera.position.add(diff);
      controls.target.set(...selectedBody.container.position.toArray());

      controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
      composerRef.current.render();
      previousTimestamp = timestamp;

      // Request the next animation frame
      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationIdRef.current = requestAnimationFrame(animate);

    function updateBodyAndChildren(body, date) {
      body.update(date);
      body.children.forEach((child) => updateBodyAndChildren(child, date));
    }

    function setSelectedBody(body) {
      selectedBody = body;
      controls.target.set(...body.container.position.toArray());
      controls.minDistance = body.radius * 2;
      const camPos = new THREE.Vector3().addVectors(body.container.position, relativePosition);
      camera.position.set(...camPos.toArray());
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
