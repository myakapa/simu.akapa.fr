/* =============================================================
   Akapa — configuration du site simu.akapa.fr
   👉 SEUL FICHIER À MODIFIER pour brancher la collecte de leads.
   ============================================================= */
window.AKAPA_CONFIG = {

  /* URL du webhook Make qui reçoit les demandes de mise en relation.
     Créer dans Make un scénario démarrant par le module
     « Webhooks › Custom webhook », copier l'URL fournie et la coller ici.
     Tant que la valeur reste vide, le formulaire fonctionne en mode
     démonstration : il affiche le message de confirmation et journalise
     le contenu dans la console du navigateur, sans rien envoyer. */
  webhook: "https://hook.eu2.make.com/qf0974vo758ioa02slh6fsygg3ler14p",

  /* Identifiant de mesure GA4 (format G-XXXXXXXXXX).
     Laissé vide, aucun script Google Analytics n'est chargé.
     Renseigné, GA4 n'est chargé QUE si le visiteur accepte la mesure d'audience
     dans le bandeau cookies — rien avant. */
  ga4Id: "G-2KVSEV5441",

  /* reCAPTCHA v3 (invisible, aucune image à cliquer).
     1. Créer une clé sur https://www.google.com/recaptcha/admin
        → type « reCAPTCHA v3 », domaine « simu.akapa.fr ».
     2. Coller ici la CLÉ DU SITE (publique). La clé secrète ne doit JAMAIS
        apparaître dans ces fichiers : elle reste dans Make.
     3. Côté Make, premier module après le webhook : HTTP › Make a request
        POST https://www.google.com/recaptcha/api/siteverify
        avec secret=<clé secrète> et response={{recaptcha_token}},
        puis un filtre qui ne laisse passer que success = true et score >= 0.5.
     Laissé vide, le formulaire fonctionne sans reCAPTCHA (le piège à robots
     du formulaire reste actif dans tous les cas). */
  recaptchaSiteKey: "6LffncEtAAAAAHJrcAU5dnsFp7AUI0UaBoqDyhEH",
  recaptchaAction: "mise_en_relation",

  /* Case à cocher de consentement.
     false (par défaut) : le formulaire reste à 3 champs, l'accord est donné par
     l'envoi lui-même, annoncé en clair sous le bouton — la transmission au
     partenaire étant l'objet même de la demande.
     true : ajoute une case à cocher obligatoire (posture RGPD la plus stricte). */
  consentementExplicite: false,

  /* Coordonnées affichées dans le pied de page et les pages légales. */
  contact: {
    email: "hello@akapa.fr",
    telephone: "+590 690 28 99 02",
    adresse:   "Baie-Mahault, Guadeloupe"
  },

  /* Délai de rappel annoncé aux visiteurs. */
  delaiRappel: "48 heures ouvrées"
};
