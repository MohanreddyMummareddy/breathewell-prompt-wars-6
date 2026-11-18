export function category(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0 || aqi > 500)
    throw new Error('AQI must be between 0 and 500');
  return aqi <= 50
    ? 'Good'
    : aqi <= 100
      ? 'Satisfactory'
      : aqi <= 200
        ? 'Moderately polluted'
        : aqi <= 300
          ? 'Poor'
          : aqi <= 400
            ? 'Very poor'
            : 'Severe';
}
// CPCB 24-hour concentration upper breakpoints (micrograms/m³), through AQI 400.
// Above the published finite ranges, report a Severe lower bound rather than inventing a precise value.
const breakpoints = {
  pm2_5: [0, 30, 60, 90, 120, 250],
  pm10: [0, 50, 100, 250, 350, 430],
  nitrogen_dioxide: [0, 40, 80, 180, 280, 400],
  sulphur_dioxide: [0, 40, 80, 380, 800, 1600],
};
const indexBounds = [0, 50, 100, 200, 300, 400];
export function indianSubIndex(pollutant, concentration) {
  const bounds = breakpoints[pollutant];
  if (!bounds || !Number.isFinite(concentration) || concentration < 0)
    throw Error('Invalid pollutant concentration');
  if (concentration > bounds.at(-1)) return 401;
  for (let i = 1; i < bounds.length; i++)
    if (concentration <= bounds[i])
      return Math.round(
        indexBounds[i - 1] +
          ((concentration - bounds[i - 1]) * (indexBounds[i] - indexBounds[i - 1])) /
            (bounds[i] - bounds[i - 1]),
      );
  return 0;
}
export function indianAqiEstimate(hourly, endTime) {
  const utcTime = (value) => Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + 'Z');
  const end = utcTime(endTime);
  if (!Number.isFinite(end) || !Array.isArray(hourly?.time))
    throw Error('Missing air-data timestamps');
  const seen = new Set();
  const indices = hourly.time.flatMap((t, i) => {
    const ms = typeof t === 'string' ? utcTime(t) : NaN;
    if (!Number.isFinite(ms) || seen.has(ms) || ms > end || ms <= end - 86400000) return [];
    seen.add(ms);
    return [i];
  });
  const subIndices = {};
  for (const pollutant of Object.keys(breakpoints)) {
    const values = indices
      .map((i) => hourly[pollutant]?.[i])
      .filter((v) => Number.isFinite(v) && v >= 0);
    if (values.length >= 16)
      subIndices[pollutant] = indianSubIndex(
        pollutant,
        values.reduce((a, b) => a + b, 0) / values.length,
      );
  }
  if (Object.keys(subIndices).length < 3 || !('pm2_5' in subIndices || 'pm10' in subIndices))
    throw Error('Insufficient 24-hour pollutant data');
  const aqi = Math.max(...Object.values(subIndices));
  return { aqi, lowerBound: aqi === 401, subIndices };
}
