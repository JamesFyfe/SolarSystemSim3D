import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { loadTexture } from '../utils/textureCache';

/**
 * Resolves a texture from the shared cache. Returns `null` until the image has
 * finished loading, so callers can render a fallback in the meantime.
 *
 * Note for consumers: three.js only recompiles a material's shader when it is
 * told to, and a material with a `map` uses a different shader from one without.
 * Give the material a `key` that changes when the texture arrives so React
 * mounts a fresh material rather than mutating the old one.
 */
export default function useCachedTexture(textureName: string | null | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!textureName) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    loadTexture(textureName).then((loaded) => {
      if (!cancelled) {
        setTexture(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [textureName]);

  return texture;
}
