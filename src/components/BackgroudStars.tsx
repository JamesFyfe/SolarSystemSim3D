import React, { useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, Points } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import starData from '../data/StarData.json';
import spectralTypeColors from '../data/SpectralTypeColors';
import * as THREE from 'three';

interface Star {
  catalog_number: number;
  ra: number;
  dec: number;
  spectral_type: string;
  magnitude: number;
}

const vertexShader = `
  attribute float size;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

// J2000 mean obliquity. Star RA/Dec are equatorial; the scene is the J2000
// ecliptic (see OrbitData): scene = [Y_ecl, Z_ecl, X_ecl], so the solar-system
// plane is XZ and +Y is the north ecliptic pole.
const OBLIQUITY_J2000 = 23.4392911 * Math.PI / 180;
const COS_OBLIQUITY_J2000 = Math.cos(OBLIQUITY_J2000);
const SIN_OBLIQUITY_J2000 = Math.sin(OBLIQUITY_J2000);

const BackgroundStars: React.FC = () => {
  const starsRef = useRef<Points>(null);
  const camera = useThree((state) => state.camera);

  const radius = 10000;
  const numStars = starData.length;
  const positions = new Float32Array(numStars * 3);
  const colors = new Float32Array(numStars * 3);
  const sizes = new Float32Array(numStars);

  starData.forEach((star: Star, index: number) => {
    const { ra, dec, spectral_type, magnitude } = star;
    const cosDec = Math.cos(dec);
    const Xeq = cosDec * Math.cos(ra);
    const Yeq = cosDec * Math.sin(ra);
    const Zeq = Math.sin(dec);

    const Xecl = Xeq;
    const Yecl = Yeq * COS_OBLIQUITY_J2000 + Zeq * SIN_OBLIQUITY_J2000;
    const Zecl = -Yeq * SIN_OBLIQUITY_J2000 + Zeq * COS_OBLIQUITY_J2000;

    positions[index * 3] = Yecl * radius;
    positions[index * 3 + 1] = Zecl * radius;
    positions[index * 3 + 2] = Xecl * radius;

    // multiply color based off magnitude so dimmer stars are darker
    const colorStr = multiplyRGB(spectralTypeColors[spectral_type], (8 - magnitude) / 5);
    const color = new THREE.Color(colorStr);
    // const color = new THREE.Color(spectralTypeColors[spectral_type]);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;

    sizes[index] = (8 - magnitude) ** 2.2;
  });

  function multiplyRGB(colorString: string, mult: number): string {
    if(mult > 1) {
      // we only want to make stars darker color not lighter
      return colorString;
    }
    const rgbValues = colorString.substring(4, colorString.length - 1).split(", ");
    let [r, g, b] = rgbValues.map(Number);
  
    r = Math.floor(r * mult);
    g = Math.floor(g * mult);
    b = Math.floor(b * mult);
  
    r = Math.min(r, 255);
    g = Math.min(g, 255);
    b = Math.min(b, 255);
  
    return `rgb(${r}, ${g}, ${b})`;
  }

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.position.copy(camera.position);
    }
  });

  const createGeometry = () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    return geometry;
  };

  return (
    <points ref={starsRef} position={[0, 0, 0]}>
      <primitive object={createGeometry()} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        vertexColors
      />
    </points>
  );
};

export default BackgroundStars;
