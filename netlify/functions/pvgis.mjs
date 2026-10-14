/* Ensoleillement à une adresse : relais vers l'API PVGIS (Commission européenne, JRC).
   PVGIS ne répond pas directement aux navigateurs : la page passe par cette fonction.
   GET /.netlify/functions/pvgis?lat=16.24&lon=-61.53&orient=sud|est-ouest|est|ouest|nord|plat&incl=15
   Réponse : { prod: kWh produits par kWc et par an, mensuel: [12 valeurs], base, horizon } */

const ZONES = [            // seules les zones des simulateurs sont acceptées
  { lat: [14.3, 18.2], lon: [-63.3, -60.7] },   // Antilles (Guadeloupe, Martinique, Saint-Martin, Saint-Barthélemy)
  { lat: [2.0, 6.0],   lon: [-55.0, -51.0] },   // Guyane
  { lat: [-21.5, -20.8], lon: [55.1, 55.9] },   // La Réunion
  { lat: [-13.1, -12.5], lon: [44.9, 45.4] },   // Mayotte
];
const ORIENT = { sud: [0], nord: [180], est: [-90], ouest: [90], 'est-ouest': [-90, 90], plat: [0] };

const json = (code, body, cache) => new Response(JSON.stringify(body), {
  status: code,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache ? 'public, max-age=86400' : 'no-store',
    'Netlify-CDN-Cache-Control': cache ? 'public, max-age=2592000, durable' : 'no-store',
  },
});

async function pvcalc(lat, lon, angle, aspect) {
  const u = new URL('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc');
  Object.entries({ lat, lon, peakpower: 1, loss: 14, angle, aspect, usehorizon: 1, outputformat: 'json' })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(u, { signal: ctl.signal });
    if (!r.ok) throw new Error('PVGIS ' + r.status);
    const d = await r.json();
    return {
      an: d.outputs.totals.fixed.E_y,
      mois: d.outputs.monthly.fixed.map(m => m.E_m),
      base: d.inputs.meteo_data.radiation_db,
    };
  } finally { clearTimeout(t); }
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const lat = Math.round(parseFloat(q.get('lat')) * 1000) / 1000;   // ~100 m : suffit, et mutualise le cache
  const lon = Math.round(parseFloat(q.get('lon')) * 1000) / 1000;
  const orient = ORIENT[q.get('orient')] ? q.get('orient') : 'sud';
  let incl = parseFloat(q.get('incl'));
  if (!isFinite(incl)) incl = 15;
  incl = orient === 'plat' ? 0 : Math.max(0, Math.min(60, Math.round(incl)));

  if (!isFinite(lat) || !isFinite(lon) ||
      !ZONES.some(z => lat >= z.lat[0] && lat <= z.lat[1] && lon >= z.lon[0] && lon <= z.lon[1])) {
    return json(400, { erreur: 'Position hors des territoires couverts par le simulateur.' });
  }
  try {
    const res = await Promise.all(ORIENT[orient].map(a => pvcalc(lat, lon, incl, a)));
    const n = res.length;
    return json(200, {
      lat, lon, orient, incl,
      prod: Math.round(res.reduce((s, r) => s + r.an, 0) / n),
      mensuel: res[0].mois.map((_, i) => Math.round(res.reduce((s, r) => s + r.mois[i], 0) / n)),
      base: res[0].base, horizon: true, source: 'PVGIS 5.3 (JRC, Commission européenne)',
    }, true);
  } catch (e) {
    return json(502, { erreur: 'Service d\'ensoleillement indisponible, réessayez dans un instant.' });
  }
};
