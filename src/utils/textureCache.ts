import * as THREE from 'three';

// Vite resolves this at build time to a map of file path -> hashed asset URL. Only the URL strings are
// bundled; each image is still fetched by the browser the first time TextureLoader asks for it.
const textureUrls = import.meta.glob<string>('../assets/images/*', { eager: true, import: 'default', query: '?url' });

// Cache the promise (not just the texture) so concurrent requests for the same
// file share one load instead of racing.
const textureCache = new Map<string, Promise<THREE.Texture>>();

/** Loads a texture from `src/assets/images/` once; later calls return the cached one. */
export function loadTexture(textureName: string): Promise<THREE.Texture> {
  let pending = textureCache.get(textureName);
  if (!pending) {
    const url = textureUrls[`../assets/images/${textureName}`];
    pending = url
      ? new THREE.TextureLoader().loadAsync(url)
      : Promise.reject(new Error(`Unknown texture "${textureName}" (expected it in src/assets/images/)`));
    textureCache.set(textureName, pending);
  }
  return pending;
}
