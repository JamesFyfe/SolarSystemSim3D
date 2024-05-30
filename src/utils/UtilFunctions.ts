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