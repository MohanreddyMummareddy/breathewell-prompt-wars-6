import { validCoordinates } from '../locations.js';
import { indianAqiEstimate } from '../domain/air-quality.js';

export function createAirQualityService({ fetchImpl = fetch, now = () => new Date() } = {}) {
  let controller;
  return {
    cancel() {
      controller?.abort();
    },
    async refresh(place) {
      if (!validCoordinates(place))
        throw new Error('Choose your city or post office in household preferences first.');
      controller?.abort();
      controller = new AbortController();
      const params = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        hourly: 'pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide',
        past_days: '2',
        forecast_days: '1',
        timezone: 'GMT',
      });
      const response = await fetchImpl(
        `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
        {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        },
      );
      if (!response.ok)
        throw new Error(
          'Air data provider is unavailable. Please retry or check official CPCB advisories.',
        );
      const data = await response.json();
      const endTime = new Date(Math.floor(now().getTime() / 3600000) * 3600000).toISOString();
      const estimate = indianAqiEstimate(data.hourly, endTime);
      return {
        ...estimate,
        endTime,
        fetchedAt: now().toISOString(),
        airDataKind: 'Modeled Indian AQI estimate',
      };
    },
  };
}
