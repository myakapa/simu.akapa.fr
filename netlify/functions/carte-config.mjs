/* Donne à la page la clé Google Maps du site (variable d'environnement Netlify GOOGLE_MAPS_KEY).
   La clé n'est pas secrète (elle s'utilise dans le navigateur) mais elle est limitée à simu.akapa.fr
   dans Google Cloud ; elle reste hors du dépôt, qui est public. Sans clé : { key: null }, la carte reste masquée. */
export default async () => new Response(JSON.stringify({ key: process.env.GOOGLE_MAPS_KEY || null }), {
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
});
