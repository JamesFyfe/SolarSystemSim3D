import * as THREE from 'three';
import type CelestialBody from '../classes/CelestialBody';

/** The root of the body hierarchy (the Sun). */
export function getRootBody(body: CelestialBody): CelestialBody {
	let root = body;
	while (root.parent) {
		root = root.parent;
	}
	return root;
}

/** Unit vector (world space) pointing from `body` toward the Sun, written into `target`. */
export function getSunDirection(body: CelestialBody, target: THREE.Vector3): THREE.Vector3 {
	const sun = getRootBody(body);
	if (sun === body) {
		return target.set(1, 0, 0);
	}
	return target.copy(sun.position).sub(body.position).normalize();
}

export function multiplyRGB(colorString: string, mult: number): string {
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