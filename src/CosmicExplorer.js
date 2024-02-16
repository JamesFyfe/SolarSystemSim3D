import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const CosmicExplorer = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();

  const cube = useRef();

  useEffect(() => {
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the cube
      cube.current.rotation.x += 0.01;
      cube.current.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    // Set up scene
    camera.position.z = 5;
    scene.add(new THREE.AmbientLight(0x404040));
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    cube.current = mesh;

    // Set up renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Start animation
    animate();

    // Clean up on component unmount
    return () => {
      document.body.removeChild(renderer.domElement);
    };
  }, []);

  return null; // Nothing to render in React
};

export default CosmicExplorer;
