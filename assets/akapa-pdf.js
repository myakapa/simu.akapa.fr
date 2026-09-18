/* =============================================================================
   Akapa — téléchargement de la simulation en PDF
   Un bouton portant l'attribut data-ak-pdf déclenche la génération.
   La bibliothèque jsPDF n'est chargée qu'au premier clic.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var URL_JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var chargement = null;

  // Les polices standard couvrent le latin-1 (accents inclus) mais pas la
  // ponctuation typographique : on la ramène à ses équivalents simples.
  function ascii(t) {
    return String(t == null ? "" : t)
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/[   ]/g, " ")
      .replace(/…/g, "...")
      .replace(/·/g, "-");
  }

  function charger() {
    if (chargement) return chargement;
    chargement = new Promise(function (ok, ko) {
      if (window.jspdf) return ok(window.jspdf);
      var sc = document.createElement("script");
      sc.src = URL_JSPDF;
      sc.onload = function () { window.jspdf ? ok(window.jspdf) : ko(new Error("jsPDF absent")); };
      sc.onerror = function () { ko(new Error("chargement impossible")); };
      document.head.appendChild(sc);
    });
    return chargement;
  }

  function contexte() {
    if (typeof window.akapaLeadContext !== "function") return {};
    try { return window.akapaLeadContext() || {}; } catch (e) { return {}; }
  }

  function horodatage() {
    try {
      return new Date().toLocaleString("fr-FR", {
        timeZone: "America/Guadeloupe",
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return new Date().toLocaleString("fr-FR"); }
  }

  function nomFichier(outil) {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "Simulation-Akapa-" + (outil || "simu") + "-" +
           d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + ".pdf";
  }

  /* ----------------------------------------------------------- construction */
  function construire(jspdf, opts) {
    var doc = new jspdf.jsPDF({ unit: "mm", format: "a4" });
    var L = 18, R = 192, y;

    var BLEU = [37, 99, 235], MARINE = [15, 23, 42], GRIS = [100, 116, 139], TRAIT = [226, 232, 240];

    // --- bandeau de tête
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(21);
    doc.text("AKAPA", L, 17);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Simulateurs Antilles-Guyane", L, 23);
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text("simu.akapa.fr", R, 17, { align: "right" });

    // --- titre
    y = 45;
    doc.setTextColor.apply(doc, MARINE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(ascii(opts.titre), L, y);
    y += 6.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, GRIS);
    doc.text(ascii("Simulation r\u00e9alis\u00e9e le " + opts.date), L, y);

    // --- tableau des valeurs
    y += 12;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.setTextColor.apply(doc, BLEU);
    doc.text("VOTRE SIMULATION", L, y);
    y += 3;
    doc.setDrawColor.apply(doc, TRAIT); doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 7;

    opts.lignes.forEach(function (paire) {
      if (y > 250) { doc.addPage(); y = 25; }
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor.apply(doc, GRIS);
      doc.text(ascii(paire[0]), L, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor.apply(doc, MARINE);
      doc.text(ascii(paire[1]), R, y, { align: "right" });
      y += 3.2;
      doc.setDrawColor(241, 245, 249);
      doc.line(L, y, R, y);
      y += 6.2;
    });

    // --- avertissement
    y += 6;
    if (y > 232) { doc.addPage(); y = 25; }
    doc.setFontSize(8.5);
    var lignesAv = doc.splitTextToSize(ascii(opts.avertissement), R - L - 12);
    var hAv = 12 + lignesAv.length * 4 + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor.apply(doc, TRAIT);
    doc.roundedRect(L, y, R - L, hAv, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setTextColor.apply(doc, MARINE);
    doc.text(ascii("Estimation indicative"), L + 6, y + 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor.apply(doc, GRIS);
    doc.text(lignesAv, L + 6, y + 14);
    y += hAv + 10;

    // --- mise en relation
    var courriel = (CFG.contact && CFG.contact.email) || "hello@akapa.fr";
    var tel = (CFG.contact && CFG.contact.telephone) || "0690 28 99 02";
    var pitch = ascii("Nos partenaires sont s\u00e9lectionn\u00e9s sur le prix, la qualit\u00e9 des r\u00e9alisations, "
      + "la r\u00e9activit\u00e9 et les garanties propos\u00e9es. Mise en relation gratuite et sans engagement.");
    var coord = ascii(courriel + "   \u00b7   " + tel + "   \u00b7   simu.akapa.fr");
    doc.setFontSize(8.8);
    var lignesPitch = doc.splitTextToSize(pitch, R - L - 12);
    var hauteur = 13 + lignesPitch.length * 4.2 + 6;
    if (y + hauteur > 268) { doc.addPage(); y = 25; }
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(L, y, R - L, hauteur, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(ascii("Faites confirmer ces chiffres par un partenaire local"), L + 6, y + 9);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.8);
    doc.text(lignesPitch, L + 6, y + 15.5);
    doc.setFont("helvetica", "bold");
    doc.text(coord, L + 6, y + 15.5 + lignesPitch.length * 4.2 + 1.5);

    // --- pied de page sur chaque page
    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(ascii("AKAPA \u00b7 36 rue de la Chapelle, 97122 Baie-Mahault \u00b7 simu.akapa.fr"), L, 287);
      doc.text(i + "/" + n, R, 287, { align: "right" });
    }
    return doc;
  }

  /* ------------------------------------------------------------- déclenchement */
  function telecharger(bouton) {
    var ctx = contexte();
    var lignes = Object.keys(ctx)
      .filter(function (k) { var v = ctx[k]; return v !== "" && v !== "-" && v != null; })
      .map(function (k) { return [k, String(ctx[k])]; });

    if (!lignes.length) {
      alert("Renseignez d'abord votre simulation : le PDF reprend les valeurs affichées à l'écran.");
      return;
    }

    var libelle = bouton ? bouton.innerHTML : "";
    if (bouton) { bouton.disabled = true; bouton.textContent = "Préparation…"; }

    charger().then(function (jspdf) {
      var doc = construire(jspdf, {
        titre: document.body.dataset.akOutilLabel || document.title.split("—")[0].trim(),
        date: horodatage(),
        lignes: lignes,
        avertissement: document.body.dataset.akPdfNote ||
          "Ce document reprend les valeurs affich\u00e9es par le simulateur au moment du t\u00e9l\u00e9chargement. "
          + "Il s'agit d'une estimation \u00e9tablie \u00e0 partir des bar\u00e8mes publics en vigueur et des hypoth\u00e8ses que vous avez saisies. "
          + "Elle ne constitue ni une offre de cr\u00e9dit, ni un conseil en investissement, ni un conseil fiscal, "
          + "et ne remplace pas l'\u00e9tude personnalis\u00e9e d'un professionnel."
      });
      doc.save(nomFichier(document.body.dataset.akOutil || ""));
      document.dispatchEvent(new CustomEvent("akapa:pdf", { detail: { lignes: lignes.length } }));
    }).catch(function () {
      alert("Le téléchargement n'a pas pu démarrer. Vérifiez votre connexion et réessayez.");
    }).then(function () {
      if (bouton) { bouton.disabled = false; bouton.innerHTML = libelle; }
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ak-pdf]");
    if (!b) return;
    e.preventDefault();
    telecharger(b);
  });

  window.akapaTelechargerPDF = function () { telecharger(null); };
})();
