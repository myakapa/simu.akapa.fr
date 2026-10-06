#!/usr/bin/env python3
"""Données communes aux scripts de génération de simu.akapa.fr."""
import re, json, html, os

# Les outils vivent dans le dépôt du site, dossier _outils/ : la racine du site est le dossier parent.
ICI = os.path.dirname(os.path.abspath(__file__))
R = os.environ.get('SIMU_ROOT', os.path.dirname(ICI))
DATA = os.path.join(ICI, 'data')
BASE = 'https://simu.akapa.fr'

# slug, libellé de menu, groupe de l'accueil, étiquette, texte de la carte d'accueil
OUTILS = [
 ('capacite-emprunt', 'Capacité d’emprunt', 'financer', None, None),
 ('mensualites-credit', 'Mensualités de crédit', 'financer', None, None),
 ('frais-notaire', 'Frais de notaire', 'financer', None, None),
 ('assurance-emprunteur', 'Assurance emprunteur', 'financer', 'Financement',
  "Assurance de la banque contre délégation : économie mensuelle et totale sur la durée restante du prêt, pour un crédit en cours ou un nouveau projet."),
 ('ciop', 'Rentabilité CIOP', 'investir', None, None),
 ('lmnp', 'Simulateur LMNP', 'investir', None, None),
 ('rentabilite-locative', 'Rentabilité locative', 'investir', 'Investissement',
  "Rendement brut, net de charges et net d'impôt, cash-flow mensuel et effort d'épargne réel, en location longue durée ou saisonnière."),
 ('solaire', 'Rentabilité solaire', 'energie', None, None),
 ('aides-renovation', 'Aides à la rénovation', 'energie', 'Rénovation',
  "MaPrimeRénov' Outre-mer, primes Agir Plus d'EDF, prime photovoltaïque, TVA réduite, éco-PTZ : un questionnaire court qui chiffre vos aides et votre reste à charge."),
 ('vehicule-achat-location', 'Véhicule : acheter ou louer', 'energie', 'Mobilité',
  "Achat comptant, crédit, LOA ou LLD : coût total, coût mensuel et coût au kilomètre, avec les prix des carburants de votre territoire."),
]
SLUGS = [o[0] for o in OUTILS]
LABEL = {o[0]: o[1] for o in OUTILS}
NOUVEAUX = ['assurance-emprunteur', 'rentabilite-locative', 'aides-renovation', 'vehicule-achat-location']
TITRE_CARTE = {'assurance-emprunteur': "Assurance emprunteur", 'rentabilite-locative': "Rentabilité locative",
               'aides-renovation': "Aides à la rénovation", 'vehicule-achat-location': "Véhicule : acheter ou louer"}

# slug de territoire -> (nom, code du sélecteur, département)
TERR = {
 'guadeloupe': ('Guadeloupe', 'GP', '971'),
 'martinique': ('Martinique', 'MQ', '972'),
 'guyane': ('Guyane', 'GF', '973'),
 'la-reunion': ('La Réunion', 'RE', '974'),
}

PIN = ('<svg class="ak-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
       'stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21.4c0 0 7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11"/>'
       '<circle cx="12" cy="10.4" r="2.6"/></svg>')

def lire(f):
    return open(os.path.join(R, f), encoding='utf8').read()

def ecrire(f, s):
    open(os.path.join(R, f), 'w', encoding='utf8').write(s)

def icones():
    """Icône SVG de chaque outil, prise sur les cartes de l'accueil (version git d'origine)."""
    p = os.path.join(DATA, 'icones.json')
    if os.path.exists(p):
        return json.load(open(p, encoding='utf8'))
    s = lire('index.html')
    ic = {}
    for m in re.finditer(r'<a class="ak-card" href="/([a-z-]+)">\s*<div class="ak-card-icon">(<svg.*?</svg>)</div>', s, re.S):
        ic[m.group(1)] = m.group(2)
    soon = {'assurance emprunteur': 'assurance-emprunteur', 'Rentabilité locative': 'rentabilite-locative',
            'aides locales': 'aides-renovation', 'Véhicule': 'vehicule-achat-location'}
    for m in re.finditer(r'<div class="ak-card is-soon">\s*<div class="ak-card-icon">(<svg.*?</svg>)</div>.*?<h3>(.*?)</h3>', s, re.S):
        for k, v in soon.items():
            if k in m.group(2):
                ic[v] = m.group(1)
    assert set(ic) == set(SLUGS), sorted(set(SLUGS) - set(ic))
    json.dump(ic, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    return ic

def nav_terr(slug, courant=None):
    """Navigation « Ce simulateur par territoire »."""
    h = '<nav class="ak-terr" aria-label="Ce simulateur par territoire"><span class="ak-terr-t">Ce simulateur par territoire</span>'
    for ts, (nom, _, _) in TERR.items():
        if ts == courant:
            h += f'<span class="ak-terr-link is-current">{PIN} {nom}</span>'
        else:
            h += f'<a class="ak-terr-link" href="/{slug}-{ts}">{PIN} {nom}</a>'
    if courant:
        h += f'<a class="ak-terr-link" href="/{slug}">Tous les territoires</a>'
    return h + '</nav>'
