// textureUtils.ts
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();

// load the texture or get it from cache
export async function loadTexture(textureName: string): Promise<THREE.Texture> {
  if (textureCache.has(textureName)) {
    const texture = textureCache.get(textureName)!;
    // console.log('GOT TEXTURE: ' + texture);
    return texture;
  }
  const textureModule = await import(`./assets/images/${textureName}`);
  const loader = new THREE.TextureLoader();
  const texture = loader.load(textureModule.default);

  textureCache.set(textureName, texture);

  return texture;
}

export default function useCacheLoader(textureName: string | null, setWhite: boolean = true) {
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (textureName !== null && textureName !== undefined) {
      const loadTextureAsync = async () => {
        const loadedTexture = await loadTexture(textureName);
        if (meshRef.current) {
          const material = meshRef.current.material as THREE.MeshStandardMaterial;

          material.map = loadedTexture;
          
          if(textureName === "star_texture_orange.jpeg") {
            material.emissiveMap = loadedTexture;
          }

          if(setWhite) {
            material.color = new THREE.Color("rgb(255, 255, 255)")
          }
          
          material.needsUpdate = true;
        }
      };

      loadTextureAsync();
    }
  });
  return meshRef;
}
