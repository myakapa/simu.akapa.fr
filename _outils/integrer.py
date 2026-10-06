#!/usr/bin/env python3
"""Intègre les simulateurs au site : menus, pieds de page, accueil, 404, redirections, CSS.
Rejouable. À lancer avant iles.py."""
import re
from commun import *

IC = icones()

def menu(self_slug):
    out = ''
    for slug in SLUGS:
        if slug == self_slug:
            continue
        out += f'\n          <a href="/{slug}">{IC[slug]} {LABEL[slug]}</a>'
    return out

def pied():
    return ''.join(f'\n          <li><a href="/{s}">{LABEL[s]}</a></li>' for s in SLUGS) + '\n        '

# ---------- pages outils ----------
for slug in SLUGS:
    f = slug + '.html'
    s = lire(f)
    m = re.search(r'(<nav class="ak-dd-menu">.*?<hr>)(.*?)(\s*</nav>)', s, re.S)
    assert m, f
    s = s[:m.start()] + m.group(1) + menu(slug) + m.group(3) + s[m.end():]
    s, n = re.subn(r'(<h4>Simulateurs</h4>\s*<ul>)(.*?)(</ul>)', lambda m: m.group(1) + pied() + m.group(3), s, flags=re.S)
    assert n == 1, f
    nav = nav_terr(slug)
    if '<!--AK-TERR-->' in s:
        s = s.replace('<!--AK-TERR-->', nav)
    else:
        s, n = re.subn(r'<nav class="ak-terr".*?</nav>', lambda m: nav, s, flags=re.S)
        assert n == 1, f
    ecrire(f, s)

# ---------- accueil ----------
s = lire('index.html')
s, n = re.subn(r'(<h4>Simulateurs</h4>\s*<ul>)(.*?)(</ul>)', lambda m: m.group(1) + pied() + m.group(3), s, flags=re.S)
assert n == 1
def carte(slug):
    o = [x for x in OUTILS if x[0] == slug][0]
    fleche = re.search(r'<span class="ak-card-link">Ouvrir l\'outil <span class="ak-arrow">.*?</span></span>', s, re.S).group(0)
    return (f'\n        <a class="ak-card" href="/{slug}">\n          <div class="ak-card-icon">{IC[slug]}</div>\n'
            f'          <span class="ak-tag">{o[3]}</span>\n          <h3>{TITRE_CARTE[slug]}</h3>\n          <p>{o[4]}</p>\n'
            f'          {fleche}\n        </a>\n')
if '<details class="ak-soon">' in s:
    for apres, nouveaux in (('frais-notaire', ['assurance-emprunteur']), ('lmnp', ['rentabilite-locative']),
                            ('solaire', ['aides-renovation', 'vehicule-achat-location'])):
        m = re.search(r'<a class="ak-card" href="/%s">.*?</a>\n' % apres, s, re.S)
        assert m, apres
        s = s[:m.end()] + ''.join(carte(x) for x in nouveaux) + s[m.end():]
    s, n = re.subn(r'\n\s*<details class="ak-soon">.*?</details>', '', s, flags=re.S)
    assert n == 1
ecrire('index.html', s)

# ---------- 404 ----------
s = lire('404.html')
COURT = {'assurance-emprunteur': 'Banque ou délégation.', 'rentabilite-locative': 'Rendement et cash-flow.',
         'aides-renovation': 'Vos aides, votre reste à charge.', 'vehicule-achat-location': 'Achat, crédit, LOA ou LLD.'}
m = re.search(r'\n(\s*)<a class="ak-card" href="/solaire">.*?</a>', s, re.S)
assert m
ajout = ''
for slug in ['assurance-emprunteur', 'rentabilite-locative', 'aides-renovation', 'vehicule-achat-location']:
    if f'href="/{slug}"' not in s:
        ajout += (f'\n{m.group(1)}<a class="ak-card" href="/{slug}"><div class="ak-card-icon">{IC[slug]}</div>'
                  f'<h3>{TITRE_CARTE[slug]}</h3><p>{COURT[slug]}</p><span class="ak-card-link">Ouvrir l\'outil</span></a>')
s = s[:m.end()] + ajout + s[m.end():]
ecrire('404.html', s)

# ---------- redirections ----------
s = lire('_redirects')
for slug in NOUVEAUX:
    if f'/{slug}.html' not in s:
        ligne = f'/{slug}.html'
        s = s.rstrip("\n") + "\n" + ligne.ljust(32) + f"/{slug}".ljust(27) + "301!\n"
ecrire('_redirects', s)

# ---------- CSS ----------
s = lire('assets/akapa.css')
if '.ak-local-src' not in s:
    s = s.replace('.ak-local p:nth-of-type(2), .ak-local .ak-local-rep{display:none;}',
                  '.ak-local p:nth-of-type(n+2), .ak-local .ak-local-rep{display:none;}')
    s = s.replace('.ak-local.is-open p:nth-of-type(2){display:block;}',
                  '.ak-local.is-open p:nth-of-type(n+2){display:block;}')
    assert 'nth-of-type(n+2), .ak-local .ak-local-rep' in s and 'is-open p:nth-of-type(n+2)' in s
    s = s.replace('.ak-terr{display:flex;',
                  '.ak-local p.ak-local-src{font-size:12px; line-height:1.5; color:#6b7280; margin:12px 0 0; max-width:none;}\n.ak-terr{display:flex;', 1)
    assert '.ak-local-src' in s
ecrire('assets/akapa.css', s)
print('intégration : OK')
