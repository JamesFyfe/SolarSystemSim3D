import * as THREE from 'three';

// Cache the promise (not just the texture) so concurrent requests for the same
// file share one load instead of racing.
const textureCache = new Map<string, Promise<THREE.Texture>>();

/** Loads a texture from `src/assets/images/` once; later calls return the cached one. */
export function loadTexture(textureName: string): Promise<THREE.Texture> {
  let pending = textureCache.get(textureName);
  if (!pending) {
    pending = import(`../assets/images/${textureName}`).then((textureModule) =>
      new THREE.TextureLoader().loadAsync(textureModule.default),
    );
    textureCache.set(textureName, pending);
  }
  return pending;
}
