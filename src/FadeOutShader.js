import * as THREE from 'three';

const FadeOutShader = {
  uniforms: {
    totalLength: { value: 1.0 },
  },

  vertexShader: `
    uniform float totalLength;
    attribute float vertexIndex;

    varying float vOpacity;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float distanceFromStart = length(mvPosition.xyz);
      vOpacity = 1.0 - distanceFromStart / totalLength;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    varying float vOpacity;

    void main() {
      gl_FragColor = vec4(vOpacity, 0.5, 0, 1);
    }
  `
};

export { FadeOutShader };