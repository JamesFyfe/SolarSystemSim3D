import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import CelestialBody from './CelestialBody.js'
import OrbitData from './OrbitData.js'
import DateDisplay from './DateDisplay';

const CosmicExplorer = () => {
  const animationIdRef = useRef(null);
  const composerRef = useRef(null);
  // const [myTimestamp, setMyTimestamp] = useState(Date.now());

  useEffect(() => {
    let date = Date.now();
    const timeSpeed = 20000;

    let previousTimestamp, sun, selectedBody;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 20000000);
    camera.position.set(0, 0, 20000);
    let relativePosition = new THREE.Vector3(0,500000,500000);
    relativePosition = new THREE.Vector3(0,1,10);

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

    const animate = (timestamp) => {
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const elapsed = timestamp - previousTimestamp;
      date += timeSpeed;
      // setMyTimestamp(date);

      // let dateStr = new Date(date).toLocaleDateString();
      // console.log(dateStr);
      let worldPos = new THREE.Vector3();
      selectedBody.container.getWorldPosition(worldPos);

      let selectedPos = new THREE.Vector3(...worldPos.toArray());
      //update all positions and rotations
      updateBodyAndChildren(sun, date);
      
      let selectedPosAfter = new THREE.Vector3();
      selectedBody.container.getWorldPosition(selectedPosAfter);
      
      const diff = new THREE.Vector3().subVectors(selectedPosAfter, selectedPos);
      camera.position.add(diff);
      controls.target.set(...selectedPosAfter.toArray());

      controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
      
      // make sun brighter when further away so outer planets are bright enough
      let distToSun = camera.position.distanceTo(sun.container.position);
      sun.mesh.children[0].intensity = distToSun ** 1.8 * 5;

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
        sun = data.map(bodyData => new CelestialBody(bodyData))[0];

        // Add celestial bodies to the scene
        scene.add(sun.container);
      } catch (error) {
        console.error('Error loading celestial data:', error);
      }
    };

    fetchData().then(() => {
      // render all objects then wait until textures are loaded before starting animation
      composerRef.current.render();
      // setTimeout(function() {
        // setSelectedBody(sun);
        setSelectedBody(sun.children[0]);
        animationIdRef.current = requestAnimationFrame(animate);
      // }, 10);
    });

    // const grid = new THREE.GridHelper( 1000000, 25, 0x222222, 0x222222 );
    // grid.renderOrder = -2;
    // scene.add( grid );

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

    function updateBodyAndChildren(body, date) {
      body.update(date);
      body.children.forEach((child) => updateBodyAndChildren(child, date));
    }

    function setSelectedBody(body) {
      let worldPos = new THREE.Vector3();
      body.container.getWorldPosition(worldPos);
      selectedBody = body;
      controls.target.set(...worldPos.toArray());
      controls.minDistance = body.radius * 1.5;
      const camPos = new THREE.Vector3().addVectors(worldPos, relativePosition);
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
