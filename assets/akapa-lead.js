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
          data-besoins="x|y|z"        ← PROPRE À CHAQUE SIMULATEUR
          data-bouton="..."           (optionnel)
     ></div>

   Pour joindre les résultats de la simulation au lead, la page déclare :
     window.akapaLeadContext = function(){
       return { "Puissance": "6 kWc", "Économies / an": "1 240 €" };
     };
   Si ce récapitulatif contient une clé "Territoire" ou "Département"
   correspondant à un département de la liste, le menu est présélectionné.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var STORE_KEY = "akapa_lead_identite";

  var DEPARTEMENTS = [
    "Guadeloupe", "Martinique", "Guyane", "Saint-Martin", "La Réunion"
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

  function writeStore(o) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {}
  }

  function contexte() {
    if (typeof window.akapaLeadContext !== "function") return {};
    try { return window.akapaLeadContext() || {}; } catch (e) { return {}; }
  }

  // Département déduit de la simulation, sinon du dernier choix mémorisé.
  function departementConnu() {
    var c = contexte();
    var v = c["Département"] || c["Departement"] || c["Territoire"] || "";
    if (DEPARTEMENTS.indexOf(v) !== -1) return v;
    var m = readStore().departement || readStore().territoire || "";
    return DEPARTEMENTS.indexOf(m) !== -1 ? m : "";
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

  /* ------------------------------------------------------------- reCAPTCHA v3 */
  var recaptchaPret = null;

  function chargerRecaptcha() {
    if (recaptchaPret) return recaptchaPret;
    var cle = CFG.recaptchaSiteKey;
    if (!cle) { recaptchaPret = Promise.resolve(false); return recaptchaPret; }

    recaptchaPret = new Promise(function (ok) {
      var sc = document.createElement("script");
      sc.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(cle);
      sc.async = true;
      sc.defer = true;
      sc.onload = function () { ok(true); };
      sc.onerror = function () { ok(false); };   // le formulaire reste utilisable
      document.head.appendChild(sc);
    });
    return recaptchaPret;
  }

  // Renvoie un jeton, ou "" si reCAPTCHA n'est pas configuré / indisponible.
  function jetonRecaptcha() {
    var cle = CFG.recaptchaSiteKey;
    if (!cle) return Promise.resolve("");
    return chargerRecaptcha().then(function (dispo) {
      if (!dispo || !window.grecaptcha) return "";
      return new Promise(function (ok) {
        window.grecaptcha.ready(function () {
          window.grecaptcha
            .execute(cle, { action: CFG.recaptchaAction || "mise_en_relation" })
            .then(function (t) { ok(t || ""); }, function () { ok(""); });
        });
      });
    });
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
    var titre = d.titre || "Vous voulez un chiffrage réel pour votre projet ?";
    var texte = d.texte || "Laissez vos coordonnées : nous vous mettons en relation avec le partenaire local adapté à votre projet.";
    var bouton = d.bouton || "Être mis en relation";
    var avantages = (d.avantages || "Partenaires locaux sélectionnés|Sans engagement et sans frais pour vous|Une seule demande, une seule saisie").split("|");
    var besoins = (d.besoins || "Être rappelé pour en parler|Recevoir un devis|Je me renseigne pour plus tard").split("|");
    var delai = CFG.delaiRappel || "48 heures ouvrées";
    var explicite = CFG.consentementExplicite === true;
    var memo = readStore();
    var dep = departementConnu();
    var id = function (n) { return outil + "-" + n; };

    var recap = "";
    if (typeof window.akapaLeadContext === "function") {
      recap = '<div class="ak-lead-recap" data-ak-recap hidden></div>';
    }

    var consentement = explicite
      ? '<label class="ak-consent"><input type="checkbox" name="consentement" required>' +
          "<span>J'accepte qu'Akapa transmette ma demande à un partenaire local qualifié. " +
          '<a href="confidentialite.html" target="_blank" rel="noopener">Confidentialité</a></span></label>'
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
          '<div class="ak-form-row">' +
            '<div class="ak-field"><label for="' + id("prenom") + '">Prénom <span class="ak-req">*</span></label>' +
              '<input id="' + id("prenom") + '" name="prenom" type="text" autocomplete="given-name" value="' + esc(memo.prenom || "") + '" required></div>' +
            '<div class="ak-field"><label for="' + id("nom") + '">Nom <span class="ak-req">*</span></label>' +
              '<input id="' + id("nom") + '" name="nom" type="text" autocomplete="family-name" value="' + esc(memo.nom || "") + '" required></div>' +
          "</div>" +
          '<div class="ak-form-row">' +
            '<div class="ak-field"><label for="' + id("tel") + '">Téléphone <span class="ak-req">*</span></label>' +
              '<input id="' + id("tel") + '" name="telephone" type="tel" autocomplete="tel" placeholder="0690 00 00 00" value="' + esc(memo.telephone || "") + '" required></div>' +
            '<div class="ak-field"><label for="' + id("cp") + '">Code postal</label>' +
              '<input id="' + id("cp") + '" name="code_postal" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="97190" value="' + esc(memo.code_postal || "") + '"></div>' +
          "</div>" +
          '<div class="ak-form-row">' +
            '<div class="ak-field"><label for="' + id("mail") + '">Adresse e-mail <span class="ak-req">*</span></label>' +
              '<input id="' + id("mail") + '" name="email" type="email" autocomplete="email" value="' + esc(memo.email || "") + '" required></div>' +
            '<div class="ak-field"><label for="' + id("dep") + '">Département <span class="ak-req">*</span></label>' +
              '<select id="' + id("dep") + '" name="departement" required><option value="">Choisir…</option>' +
                DEPARTEMENTS.map(function (t) {
                  return "<option" + (dep === t ? " selected" : "") + ">" + esc(t) + "</option>";
                }).join("") +
              "</select></div>" +
          "</div>" +
          '<div class="ak-field"><label for="' + id("besoin") + '">Votre demande</label>' +
            '<select id="' + id("besoin") + '" name="besoin">' +
              besoins.map(function (b) { return "<option>" + esc(b) + "</option>"; }).join("") +
            "</select></div>" +
          '<div class="ak-field"><label for="' + id("msg") + '">Votre message <span class="ak-req">*</span></label>' +
            '<textarea id="' + id("msg") + '" name="message" rows="3" placeholder="' + esc(d.placeholderMessage || "Décrivez votre projet en quelques mots\u00a0: ce que vous voulez faire, où, et dans quel délai.") + '" required></textarea></div>' +
          '<div class="ak-hp"><label>Ne pas remplir<input name="societe_bis" tabindex="-1" autocomplete="off"></label></div>' +
          consentement +
          '<button type="submit" class="ak-btn ak-btn-primary ak-btn-lg">' + esc(bouton) + "</button>" +
          '<p class="ak-form-msg"></p>' +
          '<p class="ak-form-legal">' +
            (explicite ? "" : "En envoyant ce formulaire, vous acceptez qu’Akapa transmette votre demande à un partenaire local qualifié. ") +
            "Réponse sous " + esc(delai) + ". Aucune revente à des annonceurs. " +
            '<a href="confidentialite.html" target="_blank" rel="noopener">Confidentialité</a>' +
            (CFG.recaptchaSiteKey
              ? '<br>Ce site est protégé par reCAPTCHA ; la ' +
                '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">politique de confidentialité</a> et les ' +
                '<a href="https://policies.google.com/terms" target="_blank" rel="noopener">conditions d’utilisation</a> de Google s’appliquent.'
              : "") +
            "</p>" +
        "</form>" +
      "</div>";

    brancher(hote, outil, outilLabel);
  }

  /* ------------------------------------------------------ logique du formulaire */
  function brancher(hote, outil, outilLabel) {
    var form = hote.querySelector("form");
    var msg = hote.querySelector(".ak-form-msg");
    var recapBox = hote.querySelector("[data-ak-recap]");
    var champDep = form.elements["departement"];
    var depTouche = false;
    champDep.addEventListener("change", function () { depTouche = true; });

    // Récapitulatif de simulation : mis à jour à chaque calcul du simulateur.
    function majRecap() {
      // Le département suit la simulation tant que le visiteur n'y a pas touché.
      if (!depTouche) {
        var d = departementConnu();
        if (d && champDep.value !== d) champDep.value = d;
      }
      if (!recapBox) return;
      var ctx = contexte();
      var cles = Object.keys(ctx).filter(function (k) {
        var v = ctx[k];
        return v !== null && v !== undefined && v !== "" && v !== "-";
      });
      if (!cles.length) { recapBox.hidden = true; return; }
      recapBox.hidden = false;
      recapBox.innerHTML =
        "<b>Joint à votre demande</b><div class=\"ak-recap-list\">" +
        cles.map(function (k) {
          return '<div class="ak-recap-row"><span>' + esc(k) + "</span><b>" + esc(ctx[k]) + "</b></div>";
        }).join("") +
        "</div>";
    }
    majRecap();
    hote._akapaMajRecap = majRecap;

    // reCAPTCHA se charge dès qu'un champ est touché, pour que le jeton
    // soit prêt au moment de l'envoi sans ralentir l'affichage de la page.
    form.addEventListener("focusin", chargerRecaptcha, { once: true });

    function erreur(texte, champ) {
      msg.textContent = texte;
      msg.className = "ak-form-msg is-visible is-error";
      if (champ) {
        var f = champ.closest(".ak-field");
        if (f) f.classList.add("is-error");
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

      if (!g("prenom").value.trim()) return erreur("Merci d'indiquer votre prénom.", g("prenom"));
      if (!g("nom").value.trim()) return erreur("Merci d'indiquer votre nom.", g("nom"));
      if (g("telephone").value.replace(/\D/g, "").length < 8)
        return erreur("Merci d'indiquer un numéro de téléphone joignable.", g("telephone"));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(g("email").value.trim()))
        return erreur("L'adresse e-mail ne semble pas valide.", g("email"));
      if (!g("departement").value)
        return erreur("Merci de sélectionner votre département.", g("departement"));
      var cp = g("code_postal").value.trim();
      if (cp && !/^\d{5}$/.test(cp))
        return erreur("Le code postal doit comporter 5 chiffres.", g("code_postal"));
      if (g("message").value.trim().length < 10)
        return erreur("Merci de décrire votre projet en quelques mots.", g("message"));
      if (g("consentement") && !g("consentement").checked)
        return erreur("Merci de cocher la case d'accord pour être mis en relation.", g("consentement"));

      var identite = {
        prenom: g("prenom").value.trim(),
        nom: g("nom").value.trim(),
        email: g("email").value.trim(),
        telephone: g("telephone").value.trim(),
        departement: g("departement").value,
        code_postal: cp
      };
      writeStore(identite);

      var payload = {
        lead_id: leadId(),
        date: new Date().toISOString(),
        outil: outil,
        outil_label: outilLabel,
        besoin: g("besoin").value,
        message: g("message").value.trim(),
        prenom: identite.prenom,
        nom: identite.nom,
        nom_complet: identite.prenom + " " + identite.nom,
        email: identite.email,
        telephone: identite.telephone,
        departement: identite.departement,
        code_postal: identite.code_postal,
        consentement: true,
        simulation: contexte(),
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

      jetonRecaptcha().then(function (jeton) {
        payload.recaptcha_token = jeton;
        payload.recaptcha_action = jeton ? (CFG.recaptchaAction || "mise_en_relation") : "";
        return envoyer(payload);
      }).then(function (res) {
        form.innerHTML =
          '<div class="ak-form-done">' +
            '<div class="ak-tick">✓</div>' +
            "<h4>Demande bien reçue" + (res.demo ? " (mode démonstration)" : "") + "</h4>" +
            "<p>Merci " + esc(identite.prenom) + ". Un partenaire local adapté à votre projet vous recontacte sous " +
            esc(CFG.delaiRappel || "48 heures ouvrées") + ".<br>Référence de votre demande : <strong>" + esc(payload.lead_id) + "</strong></p>" +
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
