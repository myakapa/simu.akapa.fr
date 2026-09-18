/* =============================================================================
   Akapa — bandeau de consentement aux cookies
   Conforme aux recommandations CNIL : refuser est aussi simple qu'accepter,
   rien n'est déposé avant le choix, et le choix est modifiable à tout moment.

   Émet les signaux Google Consent Mode v2 : GA4 ou Google Ads peuvent être
   branchés plus tard sans retoucher ce fichier.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var CLE = "akapa_consentement";
  var DUREE = 183 * 24 * 60 * 60 * 1000;   // 6 mois, recommandation CNIL

  var CATEGORIES = [
    {
      id: "necessaires", fige: true,
      titre: "Strictement nécessaires",
      texte: "Fonctionnement du site et protection des formulaires contre les envois automatisés " +
             "(reCAPTCHA), mémorisation de vos préférences d'affichage et de vos coordonnées d'un " +
             "simulateur à l'autre. Ces éléments ne quittent pas votre navigateur et ne peuvent pas être refusés."
    },
    {
      id: "mesure", fige: false,
      titre: "Mesure d'audience",
      texte: "Comprendre quelles pages et quels simulateurs sont consultés, de façon agrégée, " +
             "pour améliorer le site. Aucune donnée n'est utilisée pour vous recontacter."
    },
    {
      id: "publicite", fige: false,
      titre: "Publicité et mesure des campagnes",
      texte: "Mesurer l'efficacité des campagnes qui amènent des visiteurs sur les simulateurs, " +
             "et éviter de vous montrer plusieurs fois la même annonce."
    }
  ];

  /* ------------------------------------------------------------ mémorisation */
  function lire() {
    try {
      var o = JSON.parse(localStorage.getItem(CLE) || "null");
      if (!o || !o.date) return null;
      if (Date.now() - o.date > DUREE) return null;      // le consentement expire
      return o;
    } catch (e) { return null; }
  }

  function ecrire(choix) {
    try {
      localStorage.setItem(CLE, JSON.stringify({
        date: Date.now(), version: 1,
        mesure: !!choix.mesure, publicite: !!choix.publicite
      }));
    } catch (e) {}
  }

  /* ---------------------------------------------- Google Consent Mode v2 */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Par défaut, tout est refusé : aucun dépôt avant le choix du visiteur.
  gtag("consent", "default", {
    ad_storage: "denied", analytics_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
    functionality_storage: "granted", security_storage: "granted",
    wait_for_update: 500
  });

  function appliquer(choix) {
    gtag("consent", "update", {
      analytics_storage: choix.mesure ? "granted" : "denied",
      ad_storage: choix.publicite ? "granted" : "denied",
      ad_user_data: choix.publicite ? "granted" : "denied",
      ad_personalization: choix.publicite ? "granted" : "denied"
    });
    document.dispatchEvent(new CustomEvent("akapa:consentement", { detail: choix }));

    // GA4 n'est chargé que si la mesure d'audience est acceptée.
    if (choix.mesure && CFG.ga4Id && !window.__akapaGA) {
      window.__akapaGA = true;
      var sc = document.createElement("script");
      sc.async = true;
      sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4Id);
      document.head.appendChild(sc);
      gtag("js", new Date());
      gtag("config", CFG.ga4Id, { anonymize_ip: true });
    }
  }

  /* ------------------------------------------------------------------ rendu */
  var hote = null;

  function construire() {
    if (hote) return hote;
    hote = document.createElement("div");
    hote.className = "ak-cookies";
    hote.setAttribute("role", "dialog");
    hote.setAttribute("aria-label", "Gestion des cookies");
    hote.setAttribute("aria-live", "polite");

    hote.innerHTML =
      '<div class="ak-ck-box">' +
        "<h2>Cookies et mesure d'audience</h2>" +
        "<p>Les simulateurs fonctionnent entièrement dans votre navigateur : vos montants et vos " +
        "hypothèses ne nous sont jamais transmis. Nous aimerions seulement mesurer la fréquentation " +
        "du site, et l'efficacité des campagnes qui y amènent des visiteurs. " +
        '<a href="confidentialite.html">En savoir plus</a></p>' +
        '<div class="ak-ck-actions">' +
          '<button type="button" class="ak-btn ak-btn-primary" data-ck="tout">Tout accepter</button>' +
          '<button type="button" class="ak-btn ak-btn-outline" data-ck="rien">Tout refuser</button>' +
          '<button type="button" class="ak-ck-plus" data-ck="plus">Personnaliser</button>' +
        "</div>" +
        '<div class="ak-ck-detail">' +
          CATEGORIES.map(function (c) {
            return '<div class="ak-ck-cat">' +
              '<div class="ak-ck-txt"><b>' + c.titre + "</b><span>" + c.texte + "</span></div>" +
              (c.fige
                ? '<span class="ak-ck-fige">Toujours actif</span>'
                : '<label class="ak-switch"><input type="checkbox" data-cat="' + c.id +
                  '" aria-label="' + c.titre + '"><i></i></label>') +
              "</div>";
          }).join("") +
          '<div class="ak-ck-actions" style="margin-top:16px;">' +
            '<button type="button" class="ak-btn ak-btn-primary" data-ck="choix">Enregistrer mes choix</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    document.body.appendChild(hote);

    hote.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]");
      if (!b) return;
      var a = b.dataset.ck;
      if (a === "plus") {
        var d = hote.querySelector(".ak-ck-detail");
        d.classList.toggle("is-open");
        b.textContent = d.classList.contains("is-open") ? "Masquer le détail" : "Personnaliser";
        return;
      }
      var choix =
        a === "tout" ? { mesure: true, publicite: true } :
        a === "rien" ? { mesure: false, publicite: false } :
        {
          mesure: !!hote.querySelector('[data-cat="mesure"]').checked,
          publicite: !!hote.querySelector('[data-cat="publicite"]').checked
        };
      ecrire(choix);
      appliquer(choix);
      fermer();
    });

    return hote;
  }

  function ouvrir(prefs) {
    construire();
    var d = hote.querySelector(".ak-ck-detail");
    if (prefs) {
      hote.querySelector('[data-cat="mesure"]').checked = !!prefs.mesure;
      hote.querySelector('[data-cat="publicite"]').checked = !!prefs.publicite;
      d.classList.add("is-open");
      hote.querySelector('[data-ck="plus"]').textContent = "Masquer le détail";
    }
    hote.classList.add("is-open");
  }

  function fermer() { if (hote) hote.classList.remove("is-open"); }

  /* ------------------------------------------------------------------ amorce */
  function init() {
    var deja = lire();
    if (deja) appliquer(deja); else ouvrir(null);

    // « Gérer mes cookies » depuis le pied de page, ou n'importe quel lien.
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-ak-cookies]");
      if (!a) return;
      e.preventDefault();
      ouvrir(lire() || { mesure: false, publicite: false });
    });
  }

  window.akapaCookies = { ouvrir: function () { ouvrir(lire() || {}); }, etat: lire };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
