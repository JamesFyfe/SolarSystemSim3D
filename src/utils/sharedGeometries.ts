import * as THREE from 'three';

/**
 * Shared unit spheres. Meshes scale these to the body radius so we upload one
 * copy of each tessellation instead of a new buffer per planet/shell.
 */
export const planetSphereGeometry = new THREE.SphereGeometry(1, 100, 50);
export const shellSphereGeometry = new THREE.SphereGeometry(1, 80, 40);
export const atmosphereSphereGeometry = new THREE.SphereGeometry(1, 64, 64);
