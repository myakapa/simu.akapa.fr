#!/usr/bin/env python3
"""Contrôle Playwright de tout le site sur le serveur local (port 8200)."""
import asyncio, json, re, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from commun import *
B = 'http://127.0.0.1:8200'
pages = [('', None, None)] + [(s, s, None) for s in SLUGS] + [(f'{s}-{t}', s, t) for s in SLUGS for t in TERR] + [('mentions-legales', None, None), ('confidentialite', None, None), ('page-inexistante', None, None)]
IGN = ('google', 'gstatic', 'doubleclick', 'facebook', 'net::ERR', 'Failed to load resource')
async def main():
    pb = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vw, vh in ((1366, 900), (390, 844)):
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, is_mobile=(vw < 500), has_touch=(vw < 500))
            await ctx.route(re.compile(r'https://(?!cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)'), lambda r: r.abort())
            pg = await ctx.new_page()
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and not any(i in m.text for i in IGN) else None)
            pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
            for path, slug, ts in pages:
                errs.clear()
                r = await pg.goto(f'{B}/{path}', wait_until='load')
                await pg.wait_for_timeout(350)
                tag = f'[{vw}] /{path}'
                if path == 'page-inexistante':
                    if r.status != 404: pb.append(f'{tag}: statut {r.status}')
                elif r.status != 200:
                    pb.append(f'{tag}: statut {r.status}'); continue
                d = await pg.evaluate('''() => {
                  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
                  const ld = qa('script[type="application/ld+json"]').map(s => { try { JSON.parse(s.textContent); return 1 } catch (e) { return 0 } });
                  return {sw: document.documentElement.scrollWidth, iw: window.innerWidth,
                    kpis: qa('#kpis .kpi .v').map(e => e.textContent.trim()),
                    txt: document.body.innerText,
                    form: !!q('#mise-en-relation form, #contact form, [data-ak-lead] form'),
                    dep: (q('[data-ak-lead] select[name=departement]') || {}).value || '',
                    terrAttr: document.body.getAttribute('data-ak-territoire'),
                    sel: (q('#territoire') || q('#terr') || {}).value || '',
                    depSel: (() => { const e = q('#departement'); return e && e.options[e.selectedIndex] ? e.options[e.selectedIndex].getAttribute('data-dep') : '' })(),
                    localP: qa('.ak-local p').length, ld: ld, title: document.title,
                    canon: (q('link[rel=canonical]') || {}).href || '',
                    desc: (q('meta[name=description]') || {}).content || '',
                    liens: qa('a[href^="/"]').map(a => a.getAttribute('href').split('#')[0].split('?')[0]),
                    menu: qa('.ak-dd-menu a').length, pied: qa('.ak-footer h4 + ul li').length,
                    ctx: window.akapaLeadContext ? Object.keys(window.akapaLeadContext()) : null,
                    imgs: qa('img').filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
                    h1: (q('h1') || {}).textContent || ''}
                }''')
                if errs: pb.append(f'{tag}: console {errs[:3]}')
                if d['sw'] > d['iw'] + 1: pb.append(f'{tag}: débordement {d["sw"]} > {d["iw"]}')
                if re.search(r'\bNaN\b|undefined|Infinity', d['txt']): pb.append(f'{tag}: NaN/undefined/Infinity affiché')
                if any(i for i in d['imgs']): pb.append(f'{tag}: image cassée {d["imgs"]}')
                if not all(d['ld']): pb.append(f'{tag}: JSON-LD invalide')
                for l in set(d['liens']):
                    f = l.strip('/')
                    if l != '/' and not (os.path.exists(f'{R}/{f}.html') or os.path.exists(f'{R}/{f}')):
                        pb.append(f'{tag}: lien mort {l}')
                if slug:
                    if len(d['kpis']) < 3 or any(k in ('', '-') for k in d['kpis'][:1]): pb.append(f'{tag}: KPI {d["kpis"]}')
                    if not d['form']: pb.append(f'{tag}: formulaire absent')
                    if d['menu'] != 10: pb.append(f'{tag}: menu {d["menu"]} liens')
                    if d['pied'] < 10: pb.append(f'{tag}: pied {d["pied"]}')
                    if len(d['ld']) != 3: pb.append(f'{tag}: {len(d["ld"])} JSON-LD')
                    if d['canon'] != f'{BASE}/{path}': pb.append(f'{tag}: canonical {d["canon"]}')
                    if not (40 <= len(d['title']) <= 95): pb.append(f'{tag}: title {len(d["title"])} car.')
                    if not (110 <= len(d['desc']) <= 230): pb.append(f'{tag}: description {len(d["desc"])} car.')
                    if slug in NOUVEAUX and (not d['ctx'] or d['ctx'][0] != 'Territoire'): pb.append(f'{tag}: contexte {d["ctx"]}')
                if ts:
                    nom, code, dep = TERR[ts]
                    if d['terrAttr'] != nom: pb.append(f'{tag}: data-ak-territoire {d["terrAttr"]}')
                    if d['dep'] != nom: pb.append(f'{tag}: département du formulaire « {d["dep"]} »')
                    if d['localP'] != 4: pb.append(f'{tag}: bloc local {d["localP"]} paragraphes')
                    if slug in NOUVEAUX + ['solaire'] and d['sel'] != code: pb.append(f'{tag}: sélecteur {d["sel"]}')
                    if slug == 'frais-notaire' and d['depSel'] != dep: pb.append(f'{tag}: département {d["depSel"]}')
                    if nom.replace('La ', '') not in d['h1']: pb.append(f'{tag}: h1 « {d["h1"]} »')
            await ctx.close()
        await b.close()
    print(f'{len(pages)} pages x 2 formats contrôlées — {len(pb)} problème(s)')
    for x in pb[:80]: print(' -', x)
asyncio.run(main())
