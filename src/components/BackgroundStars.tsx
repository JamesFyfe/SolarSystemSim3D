import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import starData from '../data/StarData.json';
import spectralTypeColors from '../data/SpectralTypeColors';
import { multiplyRGB } from '../utils/UtilFunctions';

interface Star {
  catalog_number: number;
  ra: number;
  dec: number;
  spectral_type: string;
  magnitude: number;
}

const vertexShader = /* glsl */ `
  attribute float size;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

// J2000 mean obliquity. Star RA/Dec are equatorial; the scene is the J2000
// ecliptic (see OrbitData): scene = [Y_ecl, Z_ecl, X_ecl], so the solar-system
// plane is XZ and +Y is the north ecliptic pole.
const OBLIQUITY_J2000 = (23.4392911 * Math.PI) / 180;
const COS_OBLIQUITY_J2000 = Math.cos(OBLIQUITY_J2000);
const SIN_OBLIQUITY_J2000 = Math.sin(OBLIQUITY_J2000);

const STAR_SPHERE_RADIUS = 2000;

/** Builds the star-field geometry once: positions on a sphere, colours by spectral type, sizes by magnitude. */
function createStarGeometry(stars: Star[]): THREE.BufferGeometry {
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const sizes = new Float32Array(stars.length);
  const color = new THREE.Color();

  stars.forEach(({ ra, dec, spectral_type, magnitude }, index) => {
    const cosDec = Math.cos(dec);
    const Xeq = cosDec * Math.cos(ra);
    const Yeq = cosDec * Math.sin(ra);
    const Zeq = Math.sin(dec);

    const Xecl = Xeq;
    const Yecl = Yeq * COS_OBLIQUITY_J2000 + Zeq * SIN_OBLIQUITY_J2000;
    const Zecl = -Yeq * SIN_OBLIQUITY_J2000 + Zeq * COS_OBLIQUITY_J2000;

    positions[index * 3] = Yecl * STAR_SPHERE_RADIUS;
    positions[index * 3 + 1] = Zecl * STAR_SPHERE_RADIUS;
    positions[index * 3 + 2] = Xecl * STAR_SPHERE_RADIUS;

    // Dim faint stars; never brighten beyond the catalogue colour
    color.set(multiplyRGB(spectralTypeColors[spectral_type], Math.min(1, (8 - magnitude) / 4)));
    // color.set(spectralTypeColors[spectral_type]);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;

    sizes[index] = (8 - magnitude) ** 1.5;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  return geometry;
}

/** Stars are never click targets */
const noRaycast = () => null;

export default function BackgroundStars() {
  const starsRef = useRef<THREE.Points>(null);
  const camera = useThree((state) => state.camera);
  const geometry = useMemo(() => createStarGeometry(starData as Star[]), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Keep the star sphere centred on the camera so it reads as infinitely far away
  useFrame(() => {
    starsRef.current?.position.copy(camera.position);
  });

  return (
    <points ref={starsRef} geometry={geometry} raycast={noRaycast}>
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} vertexColors />
    </points>
  );
}
