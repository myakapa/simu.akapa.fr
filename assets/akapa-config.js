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
  webhook: "",

  /* Coordonnées affichées dans le pied de page et les pages légales. */
  contact: {
    email: "hello@akapa.fr",
    telephone: "+590 690 28 99 02",
    adresse:   "Baie-Mahault, Guadeloupe"
  },

  /* Délai de rappel annoncé aux visiteurs. */
  delaiRappel: "48 heures ouvrées"
};
