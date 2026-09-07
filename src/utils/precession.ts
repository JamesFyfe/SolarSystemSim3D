// Reduction of ecliptic coordinates between the ecliptic/equinox of date and
// J2000.0 (Meeus, "Astronomical Algorithms" §21, eq. 21.5).
//
// The simulation's world frame is the J2000 ecliptic (the JPL planetary
// elements are referred to it), whereas lunar theory yields coordinates of
// date. Ignoring this is a 1.4°/century error along the ecliptic.

const ARCSEC = Math.PI / (180 * 3600);

export type Vec3 = [number, number, number];

function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}
function rotZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

/**
 * Rotate a rectangular vector from the mean ecliptic & equinox of date to the
 * J2000.0 mean ecliptic & equinox.
 * @param T Julian centuries of TT from J2000.0 to the date
 */
export function eclipticOfDateToJ2000(v: Vec3, T: number): Vec3 {
  // Precession angles from J2000 (T0 = 0) to date (t = T), eq. 21.5.
  const t = T;
  const eta = (47.0029 * t - 0.03302 * t * t + 0.000060 * t * t * t) * ARCSEC;
  const Pi = 174.876384 * Math.PI / 180 + (-869.8089 * t + 0.03536 * t * t) * ARCSEC;
  const p = (5029.0966 * t + 1.11113 * t * t - 0.000006 * t * t * t) * ARCSEC;

  // Forward (J2000 → date) is Rz(Π + p) · Rx(−η) · Rz(−Π); this is its inverse.
  return rotZ(rotX(rotZ(v, -(Pi + p)), eta), Pi);
}
