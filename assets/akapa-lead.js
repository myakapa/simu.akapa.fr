/* =============================================================================
   Akapa — chrome du site (menu) + bloc de mise en relation
   Un seul fichier partagé par toutes les pages.

   Utilisation dans une page :
     <div data-ak-lead
          data-outil="solaire"
          data-outil-label="Rentabilité solaire"
          data-titre="..."            (optionnel)
          data-texte="..."            (optionnel)
          data-avantages="a|b|c"      (optionnel)
          data-besoins="x|y|z"        (optionnel)
          data-bouton="..."           (optionnel)
     ></div>

   Pour joindre les résultats de la simulation au lead, la page déclare :
     window.akapaLeadContext = function(){
       return { "Puissance": "6 kWc", "Économies / an": "1 240 €" };
     };
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var STORE_KEY = "akapa_lead_identite";

  var TERRITOIRES = [
    "Guadeloupe", "Martinique", "Guyane", "Saint-Martin",
    "Saint-Barthélemy", "La Réunion", "Mayotte", "Hexagone / autre"
  ];

  /* ------------------------------------------------------------------ utils */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function memoTerritoire() {
    return readStore().territoire || "";
  }

  function writeStore(o) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {}
  }

  function utms() {
    var out = {}, q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"]
      .forEach(function (k) { if (q.get(k)) out[k] = q.get(k); });
    return out;
  }

  function leadId() {
    return "AK-" + Date.now().toString(36).toUpperCase() +
           "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /* -------------------------------------------------- envoi vers le webhook */
  function envoyer(payload) {
    var url = CFG.webhook;

    if (!url) {                       // mode démonstration
      console.info("[Akapa] Aucun webhook configuré dans assets/akapa-config.js.");
      console.info("[Akapa] Lead qui aurait été transmis :", payload);
      return Promise.resolve({ demo: true });
    }

    var corps = JSON.stringify(payload);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corps
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return { demo: false };
    }).catch(function () {
      // Repli : requête simple (pas de pré-vol CORS), réponse opaque.
      return fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: corps
      }).then(function () { return { demo: false, opaque: true }; });
    });
  }

  /* ------------------------------------------------------------ rendu du bloc */
  function construire(hote) {
    var d = hote.dataset;
    var outil = d.outil || "site";
    var outilLabel = d.outilLabel || document.title;
    var titre = d.titre || "Vous voulez un chiffrage r\u00e9el pour votre projet\u00a0?";
    var texte = d.texte || "Laissez vos coordonn\u00e9es\u00a0: nous vous mettons en relation avec le partenaire local adapt\u00e9 \u00e0 votre projet.";
    var bouton = d.bouton || "\u00catre mis en relation";
    var avantages = (d.avantages || "Partenaires locaux s\u00e9lectionn\u00e9s|Sans engagement et sans frais pour vous|Une seule demande, une seule saisie").split("|");
    var question = d.question || "Quand souhaitez-vous concr\u00e9tiser\u00a0?";
    var choix = (d.choix || "D\u00e8s que possible|D\u2019ici 6 mois|Je me renseigne").split("|");
    var territoireDemande = d.territoire === "oui";
    var delai = CFG.delaiRappel || "48 heures ouvr\u00e9es";
    var explicite = CFG.consentementExplicite === true;
    var memo = readStore();
    var id = function (n) { return outil + "-" + n; };

    var recap = "";
    if (typeof window.akapaLeadContext === "function") {
      recap = '<div class="ak-lead-recap" data-ak-recap hidden></div>';
    }

    var champTerritoire = territoireDemande
      ? '<div class="ak-field"><label for="' + id("terr") + '">Votre territoire <span class="ak-req">*</span></label>' +
          '<select id="' + id("terr") + '" name="territoire" required><option value="">Choisir\u2026</option>' +
            TERRITOIRES.map(function (t) {
              return '<option' + (memo.territoire === t ? " selected" : "") + ">" + esc(t) + "</option>";
            }).join("") +
          "</select></div>"
      : "";

    var consentement = explicite
      ? '<label class="ak-consent"><input type="checkbox" name="consentement" required>' +
          '<span>J\'accepte qu\'Akapa transmette ma demande \u00e0 un partenaire local qualifi\u00e9. ' +
          '<a href="confidentialite.html" target="_blank" rel="noopener">Confidentialit\u00e9</a></span></label>'
      : "";

    hote.className = "ak-lead";
    hote.innerHTML =
      '<div class="ak-lead-grid">' +
        "<div>" +
          "<h3>" + esc(titre) + "</h3>" +
          "<p>" + esc(texte) + "</p>" +
          '<ul class="ak-checks">' +
            avantages.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") +
          "</ul>" +
          recap +
        "</div>" +
        '<form class="ak-form" novalidate>' +
          '<div class="ak-field"><label for="' + id("nom") + '">Votre nom <span class="ak-req">*</span></label>' +
            '<input id="' + id("nom") + '" name="nom" type="text" autocomplete="name" value="' + esc(memo.nom || "") + '" required></div>' +
          '<div class="ak-form-row">' +
            '<div class="ak-field"><label for="' + id("tel") + '">T\u00e9l\u00e9phone <span class="ak-req">*</span></label>' +
              '<input id="' + id("tel") + '" name="telephone" type="tel" autocomplete="tel" placeholder="0690 00 00 00" value="' + esc(memo.telephone || "") + '" required></div>' +
            '<div class="ak-field"><label for="' + id("mail") + '">E-mail <span class="ak-req">*</span></label>' +
              '<input id="' + id("mail") + '" name="email" type="email" autocomplete="email" value="' + esc(memo.email || "") + '" required></div>' +
          "</div>" +
          champTerritoire +
          '<div class="ak-field ak-field-choix"><label>' + esc(question) + "</label>" +
            '<div class="ak-chips" role="group">' +
              choix.map(function (c, i) {
                return '<button type="button" class="ak-chip" data-valeur="' + esc(c) + '"' +
                       (i === 0 ? ' data-defaut="1"' : "") + ">" + esc(c) + "</button>";
              }).join("") +
            '</div><input type="hidden" name="qualif" value=""></div>' +
          '<div class="ak-hp"><label>Ne pas remplir<input name="societe_bis" tabindex="-1" autocomplete="off"></label></div>' +
          consentement +
          '<button type="submit" class="ak-btn ak-btn-primary ak-btn-lg">' + esc(bouton) + "</button>" +
          '<p class="ak-form-msg"></p>' +
          '<p class="ak-form-legal">' +
            (explicite ? "" : "En envoyant ce formulaire, vous acceptez qu\u2019Akapa transmette votre demande \u00e0 un partenaire local qualifi\u00e9. ") +
            "R\u00e9ponse sous " + esc(delai) + ". Aucune revente \u00e0 des annonceurs. " +
            '<a href="confidentialite.html" target="_blank" rel="noopener">Confidentialit\u00e9</a></p>' +
        "</form>" +
      "</div>";

    brancher(hote, outil, outilLabel, question);
  }

  /* ------------------------------------------------------ logique du formulaire */
  function brancher(hote, outil, outilLabel, question) {
    var form = hote.querySelector("form");
    var msg = hote.querySelector(".ak-form-msg");
    var recapBox = hote.querySelector("[data-ak-recap]");

    // Puces de préqualification : un seul clic, aucune saisie.
    var puces = [].slice.call(hote.querySelectorAll(".ak-chip"));
    var champEcheance = form.elements["qualif"];
    puces.forEach(function (b) {
      b.addEventListener("click", function () {
        var deja = b.classList.contains("is-on");
        puces.forEach(function (o) { o.classList.remove("is-on"); });
        if (!deja) { b.classList.add("is-on"); champEcheance.value = b.dataset.valeur; }
        else { champEcheance.value = ""; }
      });
    });

    // Le récapitulatif de simulation se met à jour à chaque ouverture de page
    // et à chaque changement de valeur dans le simulateur.
    function majRecap() {
      if (!recapBox || typeof window.akapaLeadContext !== "function") return;
      var ctx = {};
      try { ctx = window.akapaLeadContext() || {}; } catch (e) { return; }
      var cles = Object.keys(ctx).filter(function (k) {
        var v = ctx[k];
        return v !== null && v !== undefined && v !== "" && v !== "-";
      });
      if (!cles.length) { recapBox.hidden = true; return; }
      recapBox.hidden = false;
      recapBox.innerHTML =
        "<b>Joint à votre demande</b><div class=\"ak-recap-list\">" +
        cles.map(function (k) {
          return '<div class="ak-recap-row"><span>' + esc(k) + '</span><b>' + esc(ctx[k]) + "</b></div>";
        }).join("") +
        "</div>";
    }
    majRecap();
    hote._akapaMajRecap = majRecap;

    function erreur(texte, champ) {
      msg.textContent = texte;
      msg.className = "ak-form-msg is-visible is-error";
      if (champ) {
        champ.closest(".ak-field") && champ.closest(".ak-field").classList.add("is-error");
        champ.focus();
      }
    }

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".ak-field");
      if (f) f.classList.remove("is-error");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "ak-form-msg";

      var g = function (n) { return form.elements[n]; };
      if (g("societe_bis").value) return;                     // piège à robots

      if (!g("nom").value.trim()) return erreur("Merci d'indiquer votre nom.", g("nom"));
      if (g("telephone").value.replace(/\D/g, "").length < 8)
        return erreur("Merci d'indiquer un numéro de téléphone joignable.", g("telephone"));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(g("email").value.trim()))
        return erreur("L'adresse e-mail ne semble pas valide.", g("email"));
      if (g("territoire") && !g("territoire").value)
        return erreur("Merci de sélectionner votre territoire.", g("territoire"));
      if (g("consentement") && !g("consentement").checked)
        return erreur("Merci de cocher la case d'accord pour être mis en relation.", g("consentement"));

      var simulation = {};
      if (typeof window.akapaLeadContext === "function") {
        try { simulation = window.akapaLeadContext() || {}; } catch (err) { simulation = {}; }
      }

      var identite = {
        nom: g("nom").value.trim(),
        email: g("email").value.trim(),
        telephone: g("telephone").value.trim(),
        // Le territoire vient du formulaire, ou de la simulation quand celle-ci le connait deja.
        territoire: g("territoire") ? g("territoire").value : (simulation["Territoire"] || memoTerritoire())
      };
      writeStore(identite);

      var payload = {
        lead_id: leadId(),
        date: new Date().toISOString(),
        outil: outil,
        outil_label: outilLabel,
        qualification: {
          question: question,
          reponse: (g("qualif") && g("qualif").value) || "Non précisé"
        },
        nom: identite.nom,
        email: identite.email,
        telephone: identite.telephone,
        territoire: identite.territoire,
        consentement: true,
        simulation: simulation,
        page_url: location.href,
        page_titre: document.title,
        referer: document.referrer || "",
        langue: navigator.language || "",
        ecran: window.innerWidth + "x" + window.innerHeight,
        utm: utms()
      };

      var btn = form.querySelector("button[type=submit]");
      var libelle = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Envoi en cours…";

      envoyer(payload).then(function (res) {
        form.innerHTML =
          '<div class="ak-form-done">' +
            '<div class="ak-tick">✓</div>' +
            "<h4>Demande bien reçue" + (res.demo ? " (mode démonstration)" : "") + "</h4>" +
            "<p>Merci " + esc(identite.nom.split(" ")[0]) + ". Un partenaire local adapté à votre projet vous recontacte sous " +
            esc(CFG.delaiRappel || "48 heures ouvrées") + ".<br>Référence de votre demande : <strong>" + esc(payload.lead_id) + "</strong></p>" +
          "</div>";
        document.dispatchEvent(new CustomEvent("akapa:lead", { detail: payload }));
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = libelle;
        erreur("L'envoi a échoué. Réessayez, ou écrivez-nous à " +
               ((CFG.contact && CFG.contact.email) || "hello@akapa.fr") + ".");
      });
    });
  }

  /* --------------------------------------- menu mobile + menu « Tous les outils » */
  function chrome() {
    var burger = document.querySelector("[data-ak-burger]");
    var nav = document.querySelector(".ak-nav");
    if (burger && nav) {
      burger.addEventListener("click", function () {
        nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", nav.classList.contains("is-open") ? "true" : "false");
      });
    }

    var dds = [].slice.call(document.querySelectorAll(".ak-dd"));
    dds.forEach(function (dd) {
      var b = dd.querySelector("button");
      if (!b) return;
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var ouvert = dd.classList.contains("is-open");
        dds.forEach(function (o) { o.classList.remove("is-open"); });
        dd.classList.toggle("is-open", !ouvert);
        b.setAttribute("aria-expanded", !ouvert ? "true" : "false");
      });
    });
    document.addEventListener("click", function () {
      dds.forEach(function (o) { o.classList.remove("is-open"); });
    });

    // Ancres internes en défilement doux, en tenant compte du header collant.
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var cible = document.querySelector(a.getAttribute("href"));
      if (!cible) return;
      e.preventDefault();
      var y = cible.getBoundingClientRect().top + window.pageYOffset - 82;
      window.scrollTo({ top: y, behavior: "smooth" });
      if (nav) nav.classList.remove("is-open");
    });
  }

  /* ------------------------------------------------------------------ amorçage */
  function init() {
    chrome();
    [].slice.call(document.querySelectorAll("[data-ak-lead]")).forEach(construire);
  }

  // Permet au simulateur de rafraîchir le récapitulatif après chaque calcul.
  window.akapaRafraichirRecap = function () {
    [].slice.call(document.querySelectorAll(".ak-lead")).forEach(function (h) {
      if (typeof h._akapaMajRecap === "function") h._akapaMajRecap();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
