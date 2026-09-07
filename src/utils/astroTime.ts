// Time-scale helpers.
//
// The simulation clock is a JS Date, i.e. UTC. Orbital theories (JPL elements,
// ELP/Meeus lunar theory) are expressed in Terrestrial Time (TT), and Earth's
// rotation is tied to UT1 (≈ UTC to within 0.9 s). Mixing these up costs
// ~69 s in 2026, which moves the Moon by ~38" and shifts an eclipse track by
// tens of km.

export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
export const MS_PER_DAY = 86400000;
export const MS_PER_JULIAN_CENTURY = 36525 * MS_PER_DAY; // 3.15576e12

const TT_MINUS_TAI = 32.184;

// (UTC ms at which the offset took effect, TAI − UTC in seconds)
const LEAP_SECONDS: [number, number][] = [
  [Date.UTC(1972, 0, 1), 10], [Date.UTC(1972, 6, 1), 11], [Date.UTC(1973, 0, 1), 12],
  [Date.UTC(1974, 0, 1), 13], [Date.UTC(1975, 0, 1), 14], [Date.UTC(1976, 0, 1), 15],
  [Date.UTC(1977, 0, 1), 16], [Date.UTC(1978, 0, 1), 17], [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19], [Date.UTC(1981, 6, 1), 20], [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22], [Date.UTC(1985, 6, 1), 23], [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25], [Date.UTC(1991, 0, 1), 26], [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28], [Date.UTC(1994, 6, 1), 29], [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31], [Date.UTC(1999, 0, 1), 32], [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34], [Date.UTC(2012, 6, 1), 35], [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37],
];
const LEAP_TABLE_START = LEAP_SECONDS[0][0];
// Beyond this, assume UTC no longer tracks UT1 and fall back to the ΔT model.
const LEAP_TABLE_TRUSTED_UNTIL = Date.UTC(2050, 0, 1);

/**
 * Espenak & Meeus polynomial fit for ΔT = TT − UT (seconds), used outside the
 * leap-second era. See https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html
 */
function deltaTPolynomial(date: Date): number {
  const y = date.getUTCFullYear() + (date.getUTCMonth() + 0.5) / 12;
  let t: number;
  if (y < 1700) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (y < 1800) {
    t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (y < 1860) {
    t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  } else if (y < 1900) {
    t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (y < 1920) {
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  } else if (y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else if (y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** TT − UTC in seconds for the given instant. */
export function deltaT(date: Date): number {
  const ms = date.getTime();
  if (ms >= LEAP_TABLE_START && ms < LEAP_TABLE_TRUSTED_UNTIL) {
    // Exact while UTC is kept within 0.9 s of UT1 via leap seconds.
    let taiMinusUtc = LEAP_SECONDS[0][1];
    for (const [start, offset] of LEAP_SECONDS) {
      if (ms >= start) taiMinusUtc = offset; else break;
    }
    return TT_MINUS_TAI + taiMinusUtc;
  }
  return deltaTPolynomial(date);
}

/** Julian centuries of TT since J2000.0 — the argument for orbital theories. */
export function julianCenturiesTT(date: Date): number {
  return (date.getTime() - J2000_MS + deltaT(date) * 1000) / MS_PER_JULIAN_CENTURY;
}

/**
 * Earth Rotation Angle (IERS Conventions 2010), radians in [0, 2π).
 * Measured from the CIO, which (unlike GMST's equinox of date) is essentially
 * fixed in the J2000 frame the simulation uses. UT1 is approximated by UTC.
 *
 * Earth's spin parameters in PlanetData.json derive from this: startingRotation
 * = ERA(1970-01-01T00:00Z) − 90° (frame offset) = 10.613972°, and
 * rotationPeriod = 24 h / 1.00273781191135448 = 23.9344719177 h (stellar day).
 */
export function earthRotationAngle(date: Date): number {
  const tu = (date.getTime() - J2000_MS) / MS_PER_DAY;
  const turns = 0.7790572732640 + 1.0027378119113546 * tu;
  return 2 * Math.PI * (turns - Math.floor(turns));
}
