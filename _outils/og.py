#!/usr/bin/env python3
"""Images Open Graph 1200x630 des simulateurs (Playwright). Usage : og.py [slug ...]"""
import sys, asyncio, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
OG = {
 'assurance-emprunteur': ('Assurance <em>emprunteur</em><br>aux Antilles-Guyane', 'Banque ou délégation : votre économie sur le prêt — en 2 minutes'),
 'rentabilite-locative': ('Rentabilité <em>locative</em><br>aux Antilles-Guyane', 'Rendement, cash-flow, effort d’épargne — en 2 minutes'),
 'aides-renovation': ('Aides à la <em>rénovation</em><br>aux Antilles-Guyane', 'MaPrimeRénov’, primes Agir Plus, prime solaire, reste à charge'),
 'vehicule-achat-location': ('Véhicule : <em>acheter</em><br>ou <em>louer</em> ?', 'Comptant, crédit, LOA, LLD : le coût réel sur votre territoire'),
}
T = """<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:"DejaVu Sans",Arial,sans-serif;color:#fff;
 background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 55%,#1e40af 100%);position:relative;overflow:hidden}
body:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:120px 120px}
.pill{position:absolute;left:72px;top:64px;background:#fff;border-radius:18px;padding:18px 22px;display:flex;align-items:center;gap:16px}
.pill img{height:38px;display:block}
.pill span{background:#eff6ff;color:#1d4ed8;font-weight:700;font-size:16px;letter-spacing:.12em;padding:7px 13px;border-radius:999px}
h1{position:absolute;left:72px;top:200px;font-size:76px;line-height:1.12;font-weight:700;letter-spacing:-.02em}
h1 em{font-style:normal;color:#fde047}
p{position:absolute;left:72px;top:400px;font-size:30px;color:#dbeafe;max-width:1060px}
.f{position:absolute;left:72px;bottom:56px;font-size:24px;color:#bfdbfe}
.f b{color:#fff}.f i{font-style:normal;margin:0 22px;opacity:.7}
</style></head><body>
<div class="pill"><img src="http://127.0.0.1:8200/assets/logo-akapa.svg"><span>SIMULATEURS</span></div>
<h1>%s</h1><p>%s</p>
<div class="f"><b>simu.akapa.fr</b><i>·</i>Gratuit, sans création de compte<i>·</i>Antilles-Guyane</div>
</body></html>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        for slug in (sys.argv[1:] or OG):
            await pg.set_content(T.replace("%s", OG[slug][0], 1).replace("%s", OG[slug][1], 1), wait_until="networkidle")
            await pg.screenshot(path=os.path.join(R, 'assets', f'og-{slug}.png'), type='png')
            print(slug)
        await b.close()
asyncio.run(main())
