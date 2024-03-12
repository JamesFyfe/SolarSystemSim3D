import * as THREE from 'three';

const textureUrls = [
	'/images/oberon_texture.jpeg', '/images/ariel_texture.jpeg', '/images/callisto_texture.jpeg', '/images/charon_texture.jpeg', '/images/comet_texture.png', '/images/deimos_texture.jpeg', '/images/dione_texture.jpeg', '/images/earth_clouds.png', '/images/earth_lights.png', '/images/earth_texture.jpg', '/images/enceladus_texture.jpeg', '/images/europa_texture.jpeg', '/images/ganymede_texture.jpeg', '/images/iapetus_texture.jpeg', '/images/io_texture.jpeg', '/images/jupiter_texture.jpeg', '/images/mars_texture.jpeg', '/images/mercury_texture.jpeg', '/images/mimas_texture.jpeg', '/images/miranda_texture.jpeg', '/images/moon_texture.jpeg', '/images/neptune_texture.jpeg', '/images/phobos_texture.jpeg', '/images/pluto_texture.jpeg', '/images/rhea_texture.jpeg', '/images/saturn_rings.png', '/images/saturn_texture.jpeg', '/images/star_texture_orange.jpeg', '/images/tethys_texture.jpeg', '/images/titan_texture.jpeg', '/images/titania_texture.jpeg', '/images/triton_texture.jpeg', '/images/umbriel_texture.jpeg', '/images/uranus_rings.png', '/images/uranus_texture.jpeg', '/images/venus_texture.jpeg'
];

const textureLoader = new THREE.TextureLoader();
const loadingManager = new THREE.LoadingManager();

// Display a loading screen or progress bar
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading file: ${url}, ${itemsLoaded}/${itemsTotal} files loaded`);
};

const loadedTextures = {};

export function preloadTextures() {
  const promises = textureUrls.map(url => {
    return new Promise((resolve, reject) => {
      textureLoader.load(url, (texture) => {
        loadedTextures[url] = texture;
        resolve(texture);
      }, undefined, reject);
    });
  });

  return Promise.all(promises);
}

export { loadedTextures };
