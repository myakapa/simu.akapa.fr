#!/usr/bin/env python3
"""Controle un fichier data/territoires/<slug>.json. Usage : verif_terr.py <slug>"""
import json, sys, re, os
OUT=['capacite-emprunt','mensualites-credit','frais-notaire','ciop','lmnp','solaire','aides-renovation','rentabilite-locative','assurance-emprunteur','vehicule-achat-location']
K=['title','description','og_title','h1','h2_local','p','sources','reperes','faq_q','faq_a']
slug=sys.argv[1]; d=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'data','territoires',f'{slug}.json'),encoding='utf8'))
err=[]
def mots(s): return len(re.sub(r'<[^>]+>','',s).split())
for o in OUT:
    if o not in d: err.append(f'{o}: absent'); continue
    e=d[o]
    for k in K:
        if k not in e or e[k] in ('',None,[]): err.append(f'{o}.{k}: vide')
    if err and err[-1].startswith(o): continue
    if len(e['title'])>75: err.append(f'{o}.title: {len(e["title"])} car. (max 75)')
    if not e['title'].endswith('— Akapa'): err.append(f'{o}.title: doit finir par « — Akapa »')
    if not 120<=len(e['description'])<=210: err.append(f'{o}.description: {len(e["description"])} car. (120-210)')
    if len(e['h1'])>46: err.append(f'{o}.h1: {len(e["h1"])} car. (max 46)')
    if len(e['p'])!=3: err.append(f'{o}.p: {len(e["p"])} paragraphes (3 attendus)')
    for i,p in enumerate(e['p']):
        if not 35<=mots(p)<=120: err.append(f'{o}.p[{i}]: {mots(p)} mots (35-120)')
        if re.search(r'<(?!/?strong>)',p): err.append(f'{o}.p[{i}]: balise interdite')
    if len(e['reperes'])!=3: err.append(f'{o}.reperes: 3 attendus')
    for r in e['reperes']:
        if len(r)!=2 or len(r[0])>24 or len(r[1])>80: err.append(f'{o}.reperes: « {r[0]} » trop long ({len(r[0])}/24, {len(r[1])}/80)')
    if not e['sources'].startswith('Sources : '): err.append(f'{o}.sources: doit commencer par « Sources : »')
    if not e['faq_q'].rstrip().endswith('?'): err.append(f'{o}.faq_q: doit finir par ?')
    if not 40<=mots(e['faq_a'])<=130: err.append(f'{o}.faq_a: {mots(e["faq_a"])} mots (40-130)')
    for k in K:
        t=json.dumps(e[k],ensure_ascii=False)
        if re.search(r'\b(tu|ton|ta|tes)\b',t): err.append(f'{o}.{k}: tutoiement ?')
print('\n'.join(err) if err else f'OK {slug} : 10 outils valides')
sys.exit(1 if err else 0)
