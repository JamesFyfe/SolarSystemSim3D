import * as THREE from 'three';

// Vite resolves this at build time to a map of file path -> hashed asset URL. Only the URL strings are
// bundled; each image is still fetched by the browser the first time a loader asks for it.
const textureUrls = import.meta.glob<string>('../assets/images/*', { eager: true, import: 'default', query: '?url' });

// Cache the promise (not just the texture) so concurrent requests for the same
// file share one load instead of racing.
const textureCache = new Map<string, Promise<THREE.Texture>>();
const loadedTextures: THREE.Texture[] = [];
const loadListeners = new Set<() => void>();

// Decode off the main thread. flipY matches TextureLoader's default Image behaviour.
const bitmapLoader = new THREE.ImageBitmapLoader();
bitmapLoader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });

const imageLoader = new THREE.TextureLoader();

/** Textures that the default Earth view needs; start fetching before React mounts. */
const STARTUP_TEXTURES = [
  'sun_texture.jpeg',
  'earth_texture.jpg',
  'earth_clouds.png',
  'earth_lights.png',
  'earth_specular.jpg',
  'ocean-normal.jpg',
  'moon_texture.jpeg',
];

function notifyLoaded() {
  loadListeners.forEach((listener) => listener());
}

async function decodeTexture(url: string): Promise<THREE.Texture> {
  try {
    const image = await bitmapLoader.loadAsync(url);
    const texture = new THREE.Texture(image);
    texture.needsUpdate = true;
    return texture;
  } catch {
    return imageLoader.loadAsync(url);
  }
}

/** Loads a texture from `src/assets/images/` once; later calls return the cached one. */
export function loadTexture(textureName: string): Promise<THREE.Texture> {
  let pending = textureCache.get(textureName);
  if (!pending) {
    const url = textureUrls[`../assets/images/${textureName}`];
    pending = url
      ? decodeTexture(url).then((texture) => {
          loadedTextures.push(texture);
          notifyLoaded();
          return texture;
        })
      : Promise.reject(new Error(`Unknown texture "${textureName}" (expected it in src/assets/images/)`));
    textureCache.set(textureName, pending);
  }
  return pending;
}

export function getLoadedTextures(): readonly THREE.Texture[] {
  return loadedTextures;
}

/** Subscribe to newly decoded textures (used to re-warm GPU programs after maps arrive). */
export function onTexturesLoaded(listener: () => void): () => void {
  loadListeners.add(listener);
  return () => {
    loadListeners.delete(listener);
  };
}

export function preloadStartupTextures() {
  for (const name of STARTUP_TEXTURES) {
    loadTexture(name).catch(() => {
      /* Missing optional maps should not fail app startup. */
    });
  }
}
