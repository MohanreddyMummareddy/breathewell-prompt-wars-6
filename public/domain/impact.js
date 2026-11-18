export const NET_TRANSIT_SAVING_KG_PER_KM = 0.17;
export const CARBON_ASSUMPTION =
  'Illustrative net saving of 0.17 kg CO2/km when replacing a solo petrol-car trip with public transport. Vehicle efficiency, occupancy, and route affect the result.';

export function savings(km, days) {
  if (
    !Number.isFinite(km) ||
    km < 0 ||
    km > 200 ||
    !Number.isFinite(days) ||
    days < 0 ||
    days > 7
  ) {
    throw new RangeError('Distance must be 0-200 km and days must be 0-7.');
  }
  return Math.round(km * days * NET_TRANSIT_SAVING_KG_PER_KM * 10) / 10;
}
