import { validCoordinates } from '../public/locations.js';
export async function lookupPin(pin, fetchImpl = fetch) {
  if (!/^[1-9]\d{5}$/.test(pin))
    throw Object.assign(Error('Enter a valid six-digit Indian PIN code.'), { status: 400 });
  const response = await fetchImpl(`https://api.pincodeapi.in/api/v1/pincode/${pin}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return { locations: [], unavailable: 0 };
  if (!response.ok) throw Error('PIN directory unavailable. Please retry or choose a listed city.');
  const data = await response.json();
  if (!data.success || !Array.isArray(data.data?.post_offices))
    throw Error('PIN directory returned invalid data. Please choose a listed city.');
  const offices = data.data.post_offices.slice(0, 150);
  const locations = offices
    .filter(
      (o) =>
        String(o.pincode) === pin &&
        validCoordinates(o) &&
        typeof o.office_name === 'string' &&
        typeof o.state === 'string',
    )
    .map((o) => ({
      name: o.office_name.slice(0, 100),
      state: o.state.slice(0, 100),
      district: String(o.district || '').slice(0, 100),
      pin,
      latitude: o.latitude,
      longitude: o.longitude,
      source: 'Post-office coordinates',
    }));
  return { locations, unavailable: offices.length - locations.length };
}
export default async function locationsHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const pin = new URL(req.url, 'http://localhost').searchParams.get('pin') || '';
  try {
    const result = await lookupPin(pin);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(error.status || 502);
    res.end(
      JSON.stringify({
        error:
          error.status === 400
            ? error.message
            : 'PIN lookup is unavailable. Please retry or choose a listed city.',
      }),
    );
  }
}
