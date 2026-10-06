#!/usr/bin/env python3
"""Génère les pages territoire <outil>-<territoire>.html et le sitemap.
Repart toujours de la page outil courante et de data/territoires/<territoire>.json.
À relancer après toute modification d'une page outil ou d'un fichier de contenu."""
import re, json, html, datetime, sys
from commun import *

def brut(t):
    return html.unescape(re.sub(r'<[^>]+>', '', t))

def attr(t):
    return html.escape(brut(t), quote=True)

def choisir(s, select_id, test):
    """Pose `selected` sur l'option du <select id=...> qui satisfait test(balise option)."""
    m = re.search(r'<select id="%s".*?</select>' % select_id, s, re.S)
    if not m:
        return s, False
    bloc = re.sub(r'(<option[^>]*?)\s+selected(="[^"]*")?', r'\1', m.group(0))
    trouve = [False]
    def f(o):
        if test(o.group(0)) and not trouve[0]:
            trouve[0] = True
            return o.group(0)[:-1] + ' selected>'
        return o.group(0)
    bloc = re.sub(r'<option[^>]*>', f, bloc)
    return s[:m.start()] + bloc + s[m.end():], trouve[0]

def page(slug, ts):
    nom, code, dep = TERR[ts]
    e = json.load(open(f'{DATA}/territoires/{ts}.json', encoding='utf8'))[slug]
    s = lire(slug + '.html')
    url = f'{BASE}/{slug}-{ts}'
    def sub1(pat, rep, s, flags=re.S):
        s2, n = re.subn(pat, rep, s, count=1, flags=flags)
        assert n == 1, (slug, ts, pat)
        return s2
    desc = attr(e['description'])
    s = sub1(r'<title>.*?</title>', lambda m: f'<title>{html.escape(e["title"], quote=False)}</title>', s)
    s = sub1(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{desc}">', s)
    s = sub1(r'<link rel="canonical" href="[^"]*">', lambda m: f'<link rel="canonical" href="{url}">', s)
    s = sub1(r'<meta property="og:title" content="[^"]*">', lambda m: f'<meta property="og:title" content="{attr(e["og_title"])}">', s)
    s = sub1(r'<meta property="og:description" content="[^"]*">', lambda m: f'<meta property="og:description" content="{desc}">', s)
    s = sub1(r'<meta property="og:url" content="[^"]*">', lambda m: f'<meta property="og:url" content="{url}">', s)
    s = sub1(r'<body data-ak-outil=', f'<body data-ak-territoire="{nom}" data-ak-outil=', s)
    s = sub1(r'(<div class="ak-titlebar">.*?<h1>).*?(</h1>)', lambda m: m.group(1) + e['h1'] + m.group(2), s)

    # territoire présélectionné dans le simulateur
    ok = False
    for sid, test in (('terr', lambda o: f'value="{code}"' in o),
                      ('territoire', lambda o: f'value="{code}"' in o),
                      ('departement', lambda o: f'data-dep="{dep}"' in o)):
        s, t = choisir(s, sid, test)
        ok = ok or t
    if slug in ('solaire', 'frais-notaire') + tuple(NOUVEAUX):
        assert ok, ('sélecteur de territoire introuvable', slug, ts)

    # bloc local
    reps = ''.join(f'<div class="ak-local-r"><b>{a}</b><span>{b}</span></div>' for a, b in e['reperes'])
    ps = '\n'.join(f'    <p>{p}</p>' for p in e['p'])
    local = (f'<section class="ak-local" aria-labelledby="local-titre">\n  <div class="ak-wrap">\n'
             f'    <h2 id="local-titre">{PIN} {e["h2_local"]}</h2>\n{ps}\n'
             f'    <button type="button" class="ak-local-more" aria-expanded="false">Lire la suite : repères chiffrés et sources</button>\n'
             f'    <div class="ak-local-rep">{reps}</div>\n'
             f'    <p class="ak-local-src">{e["sources"]}</p>\n  </div>\n</section>\n\n')
    assert s.count('<div class="page">') == 1, slug
    s = s.replace('<div class="page">', local + '<div class="page">')

    # section éditoriale, FAQ, navigation
    s = sub1(r'(<h2 id="guide-titre">)(.*?)(</h2>)', lambda m: f'{m.group(1)}{m.group(2)} — {nom}{m.group(3)}', s)
    s = sub1(r'<div class="ak-faq">', lambda m: f'<div class="ak-faq"><details open><summary>{e["faq_q"]}</summary><p>{e["faq_a"]}</p></details>', s)
    s = sub1(r'<nav class="ak-terr".*?</nav>', lambda m: nav_terr(slug, ts), s)

    # données structurées
    vus = set()
    def ld(m):
        d = json.loads(m.group(1))
        t = d.get('@type')
        vus.add(t)
        if t == 'WebApplication':
            d['name'] = brut(e['h1']); d['url'] = url; d['description'] = brut(e['description']); d['areaServed'] = [nom]
        elif t == 'BreadcrumbList':
            d['itemListElement'] = d['itemListElement'][:2] + [{'@type': 'ListItem', 'position': 3, 'name': nom, 'item': url}]
        elif t == 'FAQPage':
            d['mainEntity'].insert(0, {'@type': 'Question', 'name': brut(e['faq_q']),
                                       'acceptedAnswer': {'@type': 'Answer', 'text': brut(e['faq_a'])}})
        return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>'
    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', ld, s, flags=re.S)
    assert {'WebApplication', 'BreadcrumbList', 'FAQPage'} <= vus, (slug, vus)
    ecrire(f'{slug}-{ts}.html', s)

n = 0
for slug in SLUGS:
    for ts in TERR:
        page(slug, ts); n += 1

# ---------- sitemap ----------
jour = datetime.date.today().isoformat()
PRIO = {'solaire': '0.9', 'capacite-emprunt': '0.9', 'frais-notaire': '0.9', 'aides-renovation': '0.9'}
x = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
     f'  <url><loc>{BASE}/</loc><lastmod>{jour}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>']
for slug in SLUGS:
    x.append(f'  <url><loc>{BASE}/{slug}</loc><lastmod>{jour}</lastmod><changefreq>monthly</changefreq><priority>{PRIO.get(slug, "0.8")}</priority></url>')
x.append('  <!-- territoires -->')
for slug in SLUGS:
    for ts in TERR:
        x.append(f'  <url><loc>{BASE}/{slug}-{ts}</loc><lastmod>{jour}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>')
x.append('</urlset>')
ecrire('sitemap.xml', '\n'.join(x) + '\n')
print(f'{n} pages territoire, sitemap de {1 + len(SLUGS) * (1 + len(TERR))} URL')
