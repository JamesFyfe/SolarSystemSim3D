import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const InvertedLightShaderMaterial = shaderMaterial(
  {
    sunDirection: new THREE.Vector3(),
    map: new THREE.Texture(),
  },
  // vertex shader
  /*glsl*/`
		#include <common>
		#include <logdepthbuf_pars_vertex>
		precision highp float;
		precision highp int;

    uniform vec3 sunDirection;

    varying vec3 vNormal;
    varying vec3 vSunDirection;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vSunDirection = normalize((modelViewMatrix * vec4(sunDirection, 0.0)).xyz);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			#include <logdepthbuf_vertex>
    }
  `,
  // fragment shader
  /*glsl*/`
		#include <common>
		#include <logdepthbuf_pars_fragment>
		precision highp float;
		precision highp int;

    uniform sampler2D map;

    varying vec3 vNormal;
    varying vec3 vSunDirection;
    varying vec2 vUv;

    void main() {
			#include <logdepthbuf_fragment>
      float dotProduct = dot(vNormal, vSunDirection) + 0.32;
      float calculatedOpacity = 1.0 - max(dotProduct * 2.5, 0.0);

      vec4 textureColor = texture2D(map, vUv);
      float textureOpacity = textureColor.a;
      textureOpacity = textureOpacity * 2.0;
      if(textureOpacity > 1.0) {
        textureOpacity = 1.0;
      }

      float finalOpacity = min(calculatedOpacity, textureOpacity);

			if (finalOpacity <= 0.0) {
				discard;
			}

      gl_FragColor = vec4(textureColor.rgb, finalOpacity);
    }
  `
);

export default InvertedLightShaderMaterial;
