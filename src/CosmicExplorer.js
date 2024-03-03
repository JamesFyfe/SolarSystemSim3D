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
    const timeSpeed = 2000000;
    let relativePosition = new THREE.Vector3(0,100000,100000);
    relativePosition = new THREE.Vector3(0,1,10);
    let previousTimestamp, sun, selectedBody;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000000);

    const renderer = new THREE.WebGLRenderer({logarithmicDepthBuffer: true}); //{ antialias: true }
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Set up scene
    scene.add(new THREE.AmbientLight(0xffffff, 0.02));

    // Set up bloom effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.01);    

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
      if(selectedBody != undefined) {

        let selectedPos = new THREE.Vector3(...selectedBody.container.position.toArray());
        //update all positions and rotations
        updateBodyAndChildren(sun, date);
        
        let selectedPosAfter = selectedBody.container.position;
        
        const diff = new THREE.Vector3().subVectors(selectedPosAfter, selectedPos);
        camera.position.add(diff);
        controls.target.set(...selectedBody.container.position.toArray());
      }

      controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
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
        setSelectedBody(sun.children[2]);

        // Set the initial selected body (e.g., first body in the array)
      } catch (error) {
        console.error('Error loading celestial data:', error);
      }
    };

    fetchData().then(() => {
      animationIdRef.current = requestAnimationFrame(animate);
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
