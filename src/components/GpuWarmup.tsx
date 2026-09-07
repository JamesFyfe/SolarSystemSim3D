import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { preloadFont } from 'troika-three-text';
import { getLoadedTextures, onTexturesLoaded } from '../utils/textureCache';

interface GpuWarmupProps {
  /** Bump this when the set of mounted bodies/materials changes. */
  revision: number;
}

/**
 * Planets, orbit lines and labels behind the camera are frustum-culled, so
 * three.js would otherwise compile their shaders and upload their buffers the
 * first time you look at them — a hitch on the first orbit-drag.
 *
 * Compile every program and draw once to a 1×1 target with culling off so that
 * later camera moves stay smooth.
 */
export default function GpuWarmup({ revision }: GpuWarmupProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const needsWarmup = useRef(true);
  const warming = useRef(false);

  useLayoutEffect(() => {
    needsWarmup.current = true;
  }, [revision]);

  useEffect(() => onTexturesLoaded(() => {
    needsWarmup.current = true;
  }), []);

  useEffect(() => {
    preloadFont({ characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' }, () => {
      needsWarmup.current = true;
    });
  }, []);

  useLayoutEffect(() => {
    void runWarmup(gl, scene, camera, needsWarmup, warming);
  }, [gl, scene, camera, revision]);

  useFrame(() => {
    if (!needsWarmup.current) {
      return;
    }
    void runWarmup(gl, scene, camera, needsWarmup, warming);
  });

  return null;
}

async function runWarmup(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  needsWarmup: { current: boolean },
  warming: { current: boolean },
) {
  if (warming.current) {
    return;
  }
  needsWarmup.current = false;
  warming.current = true;
  try {
    await warmupGpu(gl, scene, camera);
  } finally {
    warming.current = false;
  }
}

async function warmupGpu(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  for (const texture of getLoadedTextures()) {
    gl.initTexture(texture);
  }

  const culled: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (object.frustumCulled) {
      object.frustumCulled = false;
      culled.push(object);
    }
  });

  const previousTarget = gl.getRenderTarget();
  const scratch = new THREE.WebGLRenderTarget(1, 1);
  try {
    await gl.compileAsync(scene, camera);
    gl.setRenderTarget(scratch);
    gl.render(scene, camera);
  } finally {
    gl.setRenderTarget(previousTarget);
    scratch.dispose();
    for (const object of culled) {
      object.frustumCulled = true;
    }
  }
}
