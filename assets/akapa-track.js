/* =============================================================================
   Akapa — mesure des conversions
   GA4 (Consent Mode v2 avancé), Google Ads, pixel Meta.
   Tout est piloté par assets/akapa-config.js : un identifiant vide = rien chargé.

   Événements envoyés à GA4 :
     simulation_start   première saisie dans un simulateur (une fois par page)
     form_start         premier champ du formulaire touché (une fois par page)
     generate_lead      demande de mise en relation envoyée  ← LA conversion
     file_download      PDF de la simulation téléchargé
     cta_click          clic sur un bouton d'appel à l'action (cible en paramètre)
     whatsapp_click     clic sur le bouton WhatsApp
   Chaque événement porte `outil` (slug de la page) et, quand c'est pertinent,
   `besoin` et `departement`.

   Google Ads : la conversion « lead » est envoyée en même temps que
   generate_lead, si googleAdsId et googleAdsLeadLabel sont renseignés.
   Meta : le pixel n'est chargé que si le visiteur accepte la catégorie
   « Publicité » du bandeau ; il envoie PageView puis Lead.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var outil = (document.body && document.body.getAttribute("data-ak-outil")) ||
              (location.pathname === "/" || /index\.html$/.test(location.pathname) ? "accueil" : location.pathname.replace(/^\/|\.html$/g, ""));

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  /* ------------------------------------------------------- GA4 + Google Ads */
  var gaCharge = false;
  function chargerGoogle() {
    if (gaCharge) return;
    var ids = [];
    if (CFG.ga4Id) ids.push(CFG.ga4Id);
    if (CFG.googleAdsId) ids.push(CFG.googleAdsId);
    if (!ids.length) return;
    gaCharge = true;
    var sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids[0]);
    document.head.appendChild(sc);
    gtag("js", new Date());
    // Consent Mode avancé : le tag est chargé, mais le consentement par défaut
    // (posé par akapa-cookies.js avant ce fichier) est « denied » : aucun cookie,
    // seulement des signaux anonymes tant que le visiteur n'a pas accepté.
    if (CFG.ga4Id) gtag("config", CFG.ga4Id, { anonymize_ip: true, send_page_view: true });
    if (CFG.googleAdsId) gtag("config", CFG.googleAdsId, { allow_enhanced_conversions: false });
  }

  var territoire = (document.body && document.body.getAttribute("data-ak-territoire")) || "";
  function evenement(nom, params) {
    var p = params || {};
    if (!p.outil) p.outil = outil;
    if (territoire && !p.territoire) p.territoire = territoire;
    if (CFG.ga4Id) gtag("event", nom, p);
    document.dispatchEvent(new CustomEvent("akapa:track", { detail: { nom: nom, params: p } }));
  }
  window.akapaTrack = evenement;

  /* ------------------------------------------------------------- Pixel Meta */
  var metaCharge = false;
  function chargerMeta() {
    if (metaCharge || !CFG.metaPixelId) return;
    metaCharge = true;
    /* Extrait standard de Meta, réduit à l'essentiel. */
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    var sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(sc);
    window.fbq("init", CFG.metaPixelId);
    window.fbq("track", "PageView");
  }
  function metaEvenement(nom, params) {
    if (metaCharge && window.fbq) { try { window.fbq("track", nom, params || {}); } catch (e) {} }
  }

  // Le bandeau émet ce signal au chargement (choix mémorisé) et à chaque choix.
  document.addEventListener("akapa:consentement", function (e) {
    if (e.detail && e.detail.publicite) chargerMeta();
  });

  /* ------------------------------------------------------------- Écouteurs */
  function brancher() {
    var simulationLancee = false, formulaireCommence = false;

    // Première saisie dans le simulateur (hors formulaire de mise en relation).
    document.addEventListener("input", function (e) {
      if (simulationLancee || !e.target || e.target.closest(".ak-form")) return;
      if (!e.target.closest(".page")) return;
      simulationLancee = true;
      evenement("simulation_start");
    }, true);
    document.addEventListener("click", function (e) {
      if (simulationLancee || !e.target) return;
      var b = e.target.closest(".page button, .page input[type=range]");
      if (!b || e.target.closest(".ak-form") || b.hasAttribute("data-ak-pdf")) return;
      simulationLancee = true;
      evenement("simulation_start");
    }, true);

    // Premier champ du formulaire touché.
    document.addEventListener("focusin", function (e) {
      if (formulaireCommence || !e.target || !e.target.closest(".ak-form")) return;
      formulaireCommence = true;
      evenement("form_start");
    });

    // Lead envoyé : LA conversion.
    document.addEventListener("akapa:lead", function (e) {
      var d = e.detail || {};
      var p = { outil: d.outil || outil, besoin: d.besoin || "", departement: d.departement || "",
                lead_id: d.lead_id || "", value: 1, currency: "EUR" };
      evenement("generate_lead", p);
      if (CFG.ga4Id || CFG.googleAdsId) {
        if (CFG.googleAdsId && CFG.googleAdsLeadLabel) {
          gtag("event", "conversion", { send_to: CFG.googleAdsId + "/" + CFG.googleAdsLeadLabel, value: 1, currency: "EUR", transaction_id: d.lead_id || "" });
        }
      }
      metaEvenement("Lead", { content_name: d.outil_label || d.outil || outil, content_category: d.besoin || "" });
    });

    // Clics : PDF, boutons d'appel à l'action, WhatsApp.
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var pdf = t.closest("[data-ak-pdf]");
      if (pdf) { evenement("file_download", { file_extension: "pdf", file_name: "simulation-" + outil }); return; }
      var wa = t.closest("[data-ak-whatsapp]");
      if (wa) { evenement("whatsapp_click", { cible: wa.getAttribute("data-ak-whatsapp") || "" }); return; }
      var cta = t.closest('a[href$="#mise-en-relation"], a[href$="#contact"], [data-ak-cta]');
      if (cta) {
        evenement("cta_click", { cible: cta.getAttribute("data-ak-cta") || (cta.getAttribute("href") || "").replace(/^.*#/, ""),
                                 libelle: (cta.getAttribute("aria-label") || cta.textContent || "").trim().slice(0, 60) });
      }
    });
  }

  /* --------------------------------------------------------------- amorçage */
  function init() {
    chargerGoogle();
    brancher();
    // Consentement déjà mémorisé et signal déjà émis avant que ce fichier ne soit prêt.
    try {
      var etat = window.akapaCookies && window.akapaCookies.etat && window.akapaCookies.etat();
      if (etat && etat.publicite) chargerMeta();
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
