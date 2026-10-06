# Outils de génération de simu.akapa.fr

Ce dossier n'est pas une page du site : `_redirects` le renvoie en 404. Il contient ce qui sert à fabriquer et contrôler le site, et la marche à suivre de la mise à jour mensuelle des barèmes.

## Contenu

| Fichier | Rôle |
|---|---|
| `commun.py` | Liste des 10 simulateurs, des 4 territoires, fonctions communes. La racine du site est le dossier parent. |
| `integrer.py` | Refait menus, pieds de page, cartes de l'accueil, 404, redirections. Rejouable. |
| `iles.py` | Génère les 40 pages `<outil>-<territoire>.html` à partir des pages outils et de `data/territoires/*.json`, et `sitemap.xml`. |
| `verif_terr.py <territoire>` | Contrôle le format d'un JSON de territoire. |
| `srv.py 8200` | Serveur local à adresses propres. |
| `verif.py` | Contrôle Playwright de 54 pages en deux formats sur le serveur local (port 8200). |
| `og.py` | Images de partage (à relancer seulement pour un nouveau simulateur). |
| `data/territoires/*.json` | Textes locaux des pages territoire (10 entrées par territoire). |
| `JOURNAL.md` | Une ligne par mise à jour mensuelle. |

Règle d'or : les pages `<outil>-<territoire>.html` ne s'éditent jamais à la main. On modifie la page outil (`solaire.html`…) ou le JSON, puis on régénère.

## Régénérer et contrôler

```
cd _outils
python3 integrer.py && python3 iles.py
for t in guadeloupe martinique guyane la-reunion; do python3 verif_terr.py $t; done
python3 srv.py 8200 &
python3 verif.py
```

`verif.py` ne doit signaler que quatre avertissements connus : longueur de la description de `/capacite-emprunt` et de `/solaire`, en deux formats. Tout autre problème bloque la publication. Si Playwright manque : `pip install playwright` (ajouter `--break-system-packages` si pip le demande) ; si Chromium manque et ne peut pas être installé, ne pas publier.

`iles.py` remet la date du jour sur toutes les lignes de `sitemap.xml` : s'il n'y a aucun autre changement, annuler celui-là (`git checkout sitemap.xml`).

## Mise à jour mensuelle des barèmes

Pour chaque point : lire la source officielle du jour, comparer à la valeur en ligne, ne modifier que si la valeur a réellement changé.

**A. Chaque mois — prix maximums des carburants** (arrêté préfectoral du mois, sans-plomb et gazole, pour 971, 972, 973, 974). Sources : sites des préfectures ; à défaut deux médias locaux concordants (RCI, France-Antilles, la1ere, Outremers360, Zinfos974, Guyaweb).
- `vehicule-achat-location.html` : objet des territoires (`GP:{… sp:2.12, go:2.28, kwh:…, cv:…}`, idem `MQ`, `GF`, `RE`), valeur par défaut de `#prixEnergie`, et toutes les phrases datées (« 1er octobre 2026 », prix cités dans le guide, la FAQ et le JSON-LD ; FAQ et JSON-LD doivent rester identiques).
- Les quatre JSON : entrée `vehicule-achat-location` (paragraphes, repères, sources, FAQ).

**B. Si un nouveau trimestre a commencé (1er février, mai, août, novembre) — barème photovoltaïque ZNI de la CRE** : prime à l'investissement (€/Wc pour ≤ 3, ≤ 9, ≤ 36, ≤ 100 kWc), tarif du surplus, tarif de vente en totalité, par territoire. Source : photovoltaique.info (pages « arrêté tarifaire en vigueur ZNI » de chaque territoire) ou l'open data de la CRE.
- `solaire.html` : objet `TERR` (`prime` en €/kWc, `surplus`, `totale`, `src`), la phrase du guide sur le tarif du surplus, la note `sources`.
- `aides-renovation.html` : tableaux `pv:[…]` par territoire.
- JSON : entrées `solaire` et `aides-renovation`.
- Si le barème du trimestre n'est pas encore publié : ne rien changer, le dire.

**C. Chaque trimestre — taux des crédits à l'habitat** (IEDOM, « Taux des crédits aux particuliers », par territoire) : seulement dans les JSON (entrées `capacite-emprunt`, `mensualites-credit`, `assurance-emprunteur`). Ne pas toucher aux taux par défaut des simulateurs.

**D. Tableau DGFiP des droits de mutation** (`https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_AAAA-MM.pdf`) : si une nouvelle édition existe, vérifier les taux de 971, 972, 973, 974.
- `frais-notaire.html` : options du `<select id="departement">` (valeur et libellé) et les textes.
- `rentabilite-locative.html` : taux par territoire.
- JSON : entrées `frais-notaire`, `capacite-emprunt`, `rentabilite-locative`.

**E. En février et en août — tarif réglementé de l'électricité** (EDF, tarif Bleu option base, TTC, par territoire) : `kwh` dans `TERR` de `solaire.html`, `kwh` dans `vehicule-achat-location.html`, et les JSON.

**F. En janvier et février** : signaler, sans les modifier, les plafonds annuels à revoir (MaPrimeRénov', micro-BIC, CIOP, cheval fiscal, plafonds de ressources).

## Règles de prudence

- Une valeur ne change que si elle a été lue dans une source officielle, ou dans deux sources indépendantes qui concordent. Noter l'adresse et la date de chaque source.
- Valeur introuvable, contradictoire, ou variation peu plausible (plus de 25 % sur un mois pour un carburant, plus de 30 % pour une prime ou un tarif) : ne pas modifier, signaler.
- Ne jamais modifier : une formule de calcul, une hypothèse (productible, délai de versement de la prime, décote, charges), un texte sans rapport avec un barème, le calcul des émoluments de notaire, `_headers`, les fichiers de `assets/`, le formulaire de contact.
- Aucun mot de passe, clé ou jeton dans ce dépôt, qui est public.

## Publication

Le site est publié par Netlify à chaque envoi sur la branche `main` (une à deux minutes). Jamais d'envoi forcé.
