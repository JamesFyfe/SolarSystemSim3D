export function cleanNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }
  // Remove any extra whitespace and tabs if it's a string
  if (typeof value === 'string') {
    value = value.trim().replace(/\t/g, '');
  }
  // Convert to number and handle any NaN results
  const cleaned = Number(value);
  return isNaN(cleaned) ? 0 : Number(cleaned.toFixed(8));
}

export function cleanAtmosphereData(atmosphere: any): any {
  if (!atmosphere) return null;
  
  return {
    pressure: cleanNumber(atmosphere.pressure),
    composition: {
      nitrogen: cleanNumber(atmosphere.composition?.nitrogen),
      oxygen: cleanNumber(atmosphere.composition?.oxygen),
      carbonDioxide: cleanNumber(atmosphere.composition?.carbonDioxide),
      argon: cleanNumber(atmosphere.composition?.argon),
      other: cleanNumber(atmosphere.composition?.other)
    }
  };
} 