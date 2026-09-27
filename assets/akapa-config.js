/* =============================================================
   Akapa — configuration du site simu.akapa.fr
   👉 SEUL FICHIER À MODIFIER pour brancher la collecte de leads
      et la mesure des campagnes.
   ============================================================= */
window.AKAPA_CONFIG = {

  /* URL du webhook Make qui reçoit les demandes de mise en relation.
     Créer dans Make un scénario démarrant par le module
     « Webhooks › Custom webhook », copier l'URL fournie et la coller ici.
     Tant que la valeur reste vide, le formulaire fonctionne en mode
     démonstration : il affiche le message de confirmation et journalise
     le contenu dans la console du navigateur, sans rien envoyer. */
  webhook: "https://hook.eu2.make.com/qf0974vo758ioa02slh6fsygg3ler14p",

  /* ---------------------------------------------------------- MESURE --- */

  /* Identifiant de mesure GA4 (format G-XXXXXXXXXX).
     Laissé vide, aucun script Google n'est chargé.
     Renseigné, gtag.js est chargé en « Consent Mode v2 avancé » :
     tout est refusé par défaut (aucun cookie), Google ne reçoit que des
     signaux anonymes sans cookie tant que le visiteur n'a pas accepté la
     mesure d'audience dans le bandeau. */
  ga4Id: "G-2KVSEV5441",

  /* Google Ads — conversion « lead ».
     Dans Google Ads : Objectifs › Conversions › Nouvelle action › Site web,
     puis « Utiliser le tag Google » : copier l'ID (AW-XXXXXXXXX) et le
     libellé de conversion. Laissés vides, rien n'est envoyé à Google Ads. */
  googleAdsId: "",
  googleAdsLeadLabel: "",

  /* Meta (Facebook / Instagram) — ID du pixel (15-16 chiffres).
     Chargé UNIQUEMENT si le visiteur accepte « Publicité et mesure des
     campagnes » dans le bandeau. Envoie PageView puis Lead. */
  metaPixelId: "",

  /* --------------------------------------------------------- ANTI-SPAM --- */

  /* reCAPTCHA v3 (invisible, aucune image à cliquer).
     1. Créer une clé sur https://www.google.com/recaptcha/admin
        → type « reCAPTCHA v3 », domaine « simu.akapa.fr ».
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

  /* ----------------------------------------------------- FORMULAIRE --- */

  /* Case à cocher de consentement.
     false (par défaut) : l'accord est donné par l'envoi lui-même, annoncé en
     clair sous le bouton — la transmission au partenaire étant l'objet même
     de la demande.
     true : ajoute une case à cocher obligatoire (posture RGPD la plus stricte). */
  consentementExplicite: false,

  /* Coordonnées affichées dans le pied de page, les pages légales,
     et utilisées pour le bouton WhatsApp. `whatsapp` : numéro international
     sans « + » ni espaces. Laissé vide, aucun bouton WhatsApp n'est affiché. */
  contact: {
    email: "hello@akapa.fr",
    telephone: "+590 690 28 99 02",
    whatsapp: "590690289902",
    adresse:   "Baie-Mahault, Guadeloupe"
  },

  /* Délai de rappel annoncé aux visiteurs. */
  delaiRappel: "48 heures ouvrées"
};
