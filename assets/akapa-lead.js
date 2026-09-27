/* =============================================================================
   Akapa — chrome du site (menu) + bloc de mise en relation + barre mobile
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
          data-suite="href|Libellé"   (optionnel) simulateur proposé après l'envoi
          data-placeholder-message="…" (optionnel)
     ></div>

   Pour joindre les résultats de la simulation au lead, la page déclare :
     window.akapaLeadContext = function(){
       return { "Puissance": "6 kWc", "Économies / an": "1 240 €" };
     };
   Si ce récapitulatif contient une clé "Territoire" ou "Département"
   correspondant à un département de la liste, le menu est présélectionné.

   Formulaire court : prénom, téléphone, e-mail, département et « votre
   demande » sont visibles ; nom, code postal et message sont facultatifs,
   repliés derrière « Ajouter des précisions ».

   Sur les pages outils, une barre collante apparaît en bas de l'écran mobile
   dès que le simulateur affiche un résultat : premier KPI + bouton de mise en
   relation + WhatsApp. Elle disparaît quand le formulaire est à l'écran.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.AKAPA_CONFIG || {};
  var STORE_KEY = "akapa_lead_identite";
  var UTM_KEY = "akapa_utm";

  var DEPARTEMENTS = [
    "Guadeloupe", "Martinique", "Guyane", "Saint-Martin", "La Réunion"
  ];

  var ICO_WA = '<svg class="ak-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3.2 4.2c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5z"/></svg>';
  var ICO_ARROW = '<svg class="ak-ico ak-ico-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 12h15"/><path d="m13.2 5.7 6.3 6.3-6.3 6.3"/></svg>';
  var ICO_PDF = '<svg class="ak-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4v12.2"/><path d="m7.2 11 4.8 4.8 4.8-4.8"/><path d="M4.2 17.4v1.6a1.8 1.8 0 0 0 1.8 1.8h12a1.8 1.8 0 0 0 1.8-1.8v-1.6"/></svg>';

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

  function contexteTexte() {
    var c = contexte();
    return Object.keys(c)
      .filter(function (k) { return c[k] !== "" && c[k] !== "-" && c[k] != null; })
      .map(function (k) { return k + " : " + c[k]; })
      .join("\n");
  }

  // Département déduit de la simulation, sinon du dernier choix mémorisé.
  function departementConnu() {
    var c = contexte();
    var v = c["Département"] || c["Departement"] || c["Territoire"] || "";
    if (DEPARTEMENTS.indexOf(v) !== -1) return v;
    var m = readStore().departement || readStore().territoire || "";
    return DEPARTEMENTS.indexOf(m) !== -1 ? m : "";
  }

  /* --------------------------------------------- UTM : mémorisés sur la session */
  // Un visiteur qui arrive d'une campagne sur l'accueil puis ouvre un simulateur
  // envoie son lead depuis une page sans UTM : on les garde le temps de la visite.
  var CLES_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "msclkid"];

  function memoriserUtm() {
    var q = new URLSearchParams(location.search), found = {};
    CLES_UTM.forEach(function (k) { if (q.get(k)) found[k] = q.get(k); });
    var deja = null;
    try { deja = JSON.parse(sessionStorage.getItem(UTM_KEY) || "null"); } catch (e) {}
    if (Object.keys(found).length || !deja) {
      var o = {
        utm: Object.keys(found).length ? found : (deja && deja.utm) || {},
        landing_page: (deja && deja.landing_page) || location.href.split("#")[0],
        referer_initial: (deja && deja.referer_initial) || document.referrer || "",
        date: (deja && deja.date) || new Date().toISOString()
      };
      if (Object.keys(found).length && deja && !Object.keys(deja.utm || {}).length) o.landing_page = location.href.split("#")[0];
      try { sessionStorage.setItem(UTM_KEY, JSON.stringify(o)); } catch (e) {}
    }
  }

  function sessionUtm() {
    try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function utms() {
    var out = {}, q = new URLSearchParams(location.search), s = sessionUtm().utm || {};
    Object.keys(s).forEach(function (k) { out[k] = s[k]; });
    CLES_UTM.forEach(function (k) { if (q.get(k)) out[k] = q.get(k); });
    return out;
  }

  function leadId() {
    return "AK-" + Date.now().toString(36).toUpperCase() +
           "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /* --------------------------------------------------------------- WhatsApp */
  function lienWhatsapp(outilLabel) {
    var num = CFG.contact && CFG.contact.whatsapp;
    if (!num) return "";
    var recap = contexteTexte();
    var txt = "Bonjour Akapa, je viens de faire une simulation « " + (outilLabel || document.title) +
              " » sur simu.akapa.fr et je souhaite être mis en relation avec un partenaire." +
              (recap ? "\n\nMa simulation :\n" + recap : "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(txt);
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
    var titre = d.titre || "Vous voulez un chiffrage réel pour votre projet ?";
    var texte = d.texte || "Laissez vos coordonnées : nous vous mettons en relation avec le partenaire local adapté à votre projet.";
    var bouton = d.bouton || "Être mis en relation";
    var avantages = (d.avantages || "Partenaires locaux sélectionnés|Sans engagement et sans frais pour vous|Une seule demande, une seule saisie").split("|");
    var besoins = (d.besoins || "Être rappelé pour en parler|Recevoir un devis|Je me renseigne pour plus tard").split("|");
    var delai = CFG.delaiRappel || "48 heures ouvrées";
    var explicite = CFG.consentementExplicite === true;
    var memo = readStore();
    var dep = departementConnu();
    var id = function (n) { return outil + "-" + n; };
    var precisionsOuvertes = !!(memo.nom || memo.code_postal);

    var recap = "";
    if (typeof window.akapaLeadContext === "function") {
      recap = '<details class="ak-lead-recap" data-ak-recap hidden' + (window.innerWidth > 700 ? " open" : "") + ">" +
                '<summary><b>Joint à votre demande</b><span class="ak-recap-n"></span></summary>' +
                '<div class="ak-recap-list"></div>' +
              "</details>";
    }

    var consentement = explicite
      ? '<label class="ak-consent"><input type="checkbox" name="consentement" required>' +
          "<span>J'accepte qu'Akapa transmette ma demande à un partenaire local qualifié. " +
          '<a href="/confidentialite" target="_blank" rel="noopener">Confidentialité</a></span></label>'
      : "";

    var wa = lienWhatsapp(outilLabel);

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
            '<div class="ak-field"><label for="' + id("tel") + '">Téléphone <span class="ak-req">*</span></label>' +
              '<input id="' + id("tel") + '" name="telephone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0690 00 00 00" value="' + esc(memo.telephone || "") + '" required></div>' +
          "</div>" +
          '<div class="ak-form-row">' +
            '<div class="ak-field"><label for="' + id("mail") + '">Adresse e-mail <span class="ak-req">*</span></label>' +
              '<input id="' + id("mail") + '" name="email" type="email" inputmode="email" autocomplete="email" value="' + esc(memo.email || "") + '" required></div>' +
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
          '<button type="button" class="ak-form-more" data-ak-more aria-expanded="' + (precisionsOuvertes ? "true" : "false") + '" aria-controls="' + id("plus") + '">' +
            (precisionsOuvertes ? "Masquer les précisions" : "Ajouter des précisions") + ' <span class="ak-form-more-opt">(facultatif)</span></button>' +
          '<div class="ak-form-plus" id="' + id("plus") + '"' + (precisionsOuvertes ? "" : " hidden") + ">" +
            '<div class="ak-form-row">' +
              '<div class="ak-field"><label for="' + id("nom") + '">Nom</label>' +
                '<input id="' + id("nom") + '" name="nom" type="text" autocomplete="family-name" value="' + esc(memo.nom || "") + '"></div>' +
              '<div class="ak-field"><label for="' + id("cp") + '">Code postal</label>' +
                '<input id="' + id("cp") + '" name="code_postal" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="97190" value="' + esc(memo.code_postal || "") + '"></div>' +
            "</div>" +
            '<div class="ak-field"><label for="' + id("msg") + '">Votre message</label>' +
              '<textarea id="' + id("msg") + '" name="message" rows="3" placeholder="' + esc(d.placeholderMessage || "Décrivez votre projet en quelques mots : ce que vous voulez faire, où, et dans quel délai.") + '"></textarea></div>' +
          "</div>" +
          '<div class="ak-hp"><label>Ne pas remplir<input name="societe_bis" tabindex="-1" autocomplete="off"></label></div>' +
          consentement +
          '<button type="submit" class="ak-btn ak-btn-primary ak-btn-lg">' + esc(bouton) + "</button>" +
          (wa ? '<a class="ak-btn ak-btn-wa" data-ak-whatsapp="formulaire" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICO_WA + " Ou écrivez-nous sur WhatsApp</a>" : "") +
          '<p class="ak-form-msg" role="alert"></p>' +
          '<p class="ak-form-legal">' +
            (explicite ? "" : "En envoyant ce formulaire, vous acceptez qu’Akapa transmette votre demande à un partenaire local qualifié. ") +
            "Réponse sous " + esc(delai) + ". Aucune revente à des annonceurs. " +
            '<a href="/confidentialite" target="_blank" rel="noopener">Confidentialité</a>' +
            (CFG.recaptchaSiteKey
              ? '<br>Ce site est protégé par reCAPTCHA ; la ' +
                '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">politique de confidentialité</a> et les ' +
                '<a href="https://policies.google.com/terms" target="_blank" rel="noopener">conditions d’utilisation</a> de Google s’appliquent.'
              : "") +
            "</p>" +
        "</form>" +
      "</div>";

    brancher(hote, outil, outilLabel, d);
  }

  /* ------------------------------------------------------ logique du formulaire */
  function brancher(hote, outil, outilLabel, d) {
    var form = hote.querySelector("form");
    var msg = hote.querySelector(".ak-form-msg");
    var recapBox = hote.querySelector("[data-ak-recap]");
    var champDep = form.elements["departement"];
    var depTouche = false;
    champDep.addEventListener("change", function () { depTouche = true; });

    // « Ajouter des précisions » : nom, code postal, message.
    var plusBtn = form.querySelector("[data-ak-more]");
    var plusBox = form.querySelector(".ak-form-plus");
    plusBtn.addEventListener("click", function () {
      var ouvert = plusBox.hidden;
      plusBox.hidden = !ouvert;
      plusBtn.setAttribute("aria-expanded", ouvert ? "true" : "false");
      plusBtn.firstChild.nodeValue = ouvert ? "Masquer les précisions " : "Ajouter des précisions ";
      if (ouvert) { var f = plusBox.querySelector("input"); if (f) f.focus(); }
    });

    // Récapitulatif de simulation : mis à jour à chaque calcul du simulateur.
    function majRecap() {
      // Le département suit la simulation tant que le visiteur n'y a pas touché.
      if (!depTouche) {
        var dd = departementConnu();
        if (dd && champDep.value !== dd) champDep.value = dd;
      }
      // Le lien WhatsApp embarque le récapitulatif du moment.
      var wa = lienWhatsapp(outilLabel);
      if (wa) [].slice.call(hote.querySelectorAll("[data-ak-whatsapp]")).forEach(function (a) { a.href = wa; });
      if (!recapBox) return;
      var ctx = contexte();
      var cles = Object.keys(ctx).filter(function (k) {
        var v = ctx[k];
        return v !== null && v !== undefined && v !== "" && v !== "-";
      });
      if (!cles.length) { recapBox.hidden = true; return; }
      recapBox.hidden = false;
      recapBox.querySelector(".ak-recap-n").textContent = cles.length + " élément" + (cles.length > 1 ? "s" : "");
      recapBox.querySelector(".ak-recap-list").innerHTML =
        cles.map(function (k) {
          return '<div class="ak-recap-row"><span>' + esc(k) + "</span><b>" + esc(ctx[k]) + "</b></div>";
        }).join("");
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
        if (champ.closest(".ak-form-plus") && plusBox.hidden) plusBtn.click();
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
      if (g("telephone").value.replace(/\D/g, "").length < 8)
        return erreur("Merci d'indiquer un numéro de téléphone joignable.", g("telephone"));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(g("email").value.trim()))
        return erreur("L'adresse e-mail ne semble pas valide.", g("email"));
      if (!g("departement").value)
        return erreur("Merci de sélectionner votre département.", g("departement"));
      var cp = g("code_postal").value.trim();
      if (cp && !/^\d{5}$/.test(cp))
        return erreur("Le code postal doit comporter 5 chiffres.", g("code_postal"));
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

      var su = sessionUtm();
      var payload = {
        lead_id: leadId(),
        date: new Date().toISOString(),
        date_locale: (function () {           // date lisible, heure des Antilles
          try {
            return new Date().toLocaleString("fr-FR", {
              timeZone: "America/Guadeloupe",
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            });
          } catch (e) { return new Date().toISOString(); }
        })(),
        outil: outil,
        outil_label: outilLabel,
        besoin: g("besoin").value,
        message: g("message").value.trim(),
        prenom: identite.prenom,
        nom: identite.nom,
        nom_complet: (identite.prenom + " " + identite.nom).trim(),
        email: identite.email,
        telephone: identite.telephone,
        departement: identite.departement,
        code_postal: identite.code_postal,
        consentement: true,
        simulation: contexte(),
        simulation_texte: contexteTexte(),   // version prête à coller dans un e-mail
        page_url: location.href,
        page_titre: document.title,
        referer: document.referrer || "",
        referer_initial: su.referer_initial || "",
        landing_page: su.landing_page || location.href,
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
        var suite = (d.suite || "").split("|");
        var aPdf = !!document.querySelector("[data-ak-pdf]");
        var wa = lienWhatsapp(outilLabel);
        form.innerHTML =
          '<div class="ak-form-done">' +
            '<div class="ak-tick">✓</div>' +
            "<h4>Demande bien reçue" + (res.demo ? " (mode démonstration)" : "") + "</h4>" +
            "<p>Merci " + esc(identite.prenom) + ". Un partenaire local adapté à votre projet vous recontacte sous " +
            esc(CFG.delaiRappel || "48 heures ouvrées") + ".<br>Référence de votre demande : <strong>" + esc(payload.lead_id) + "</strong></p>" +
            '<div class="ak-done-next">' +
              '<p class="ak-done-next-t">En attendant</p>' +
              (aPdf ? '<button type="button" class="ak-btn ak-btn-outline" data-ak-pdf>' + ICO_PDF + " Télécharger ma simulation en PDF</button>" : "") +
              (wa ? '<a class="ak-btn ak-btn-wa" data-ak-whatsapp="confirmation" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICO_WA + " Nous joindre sur WhatsApp</a>" : "") +
              (suite[0] ? '<a class="ak-btn ak-btn-outline" data-ak-cta="suite" href="' + esc(suite[0]) + '">' + esc(suite[1] || "Essayer un autre simulateur") + " " + ICO_ARROW + "</a>"
                        : '<a class="ak-btn ak-btn-outline" data-ak-cta="suite" href="/#outils">Découvrir les autres simulateurs ' + ICO_ARROW + "</a>") +
            "</div>" +
          "</div>";
        hote.classList.add("is-done");
        document.body.classList.add("ak-lead-done");
        document.dispatchEvent(new CustomEvent("akapa:lead", { detail: payload }));
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = libelle;
        erreur("L'envoi a échoué. Réessayez, ou écrivez-nous à " +
               ((CFG.contact && CFG.contact.email) || "hello@akapa.fr") + ".");
      });
    });
  }

  /* ----------------------------------------- barre collante mobile (pages outils) */
  function barreMobile(hote) {
    if (!document.body.classList.contains("ak-chrome")) return;
    var d = hote.dataset;
    var outilLabel = d.outilLabel || document.title;
    var bouton = d.boutonCourt || d.bouton || "Être mis en relation";
    var wa = lienWhatsapp(outilLabel);

    var bar = document.createElement("div");
    bar.className = "ak-sticky";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML =
      '<div class="ak-sticky-kpi"><b class="ak-sticky-v"></b><span class="ak-sticky-l"></span></div>' +
      '<a class="ak-btn ak-btn-primary" data-ak-cta="barre" href="#mise-en-relation">' + esc(bouton) + "</a>" +
      (wa ? '<a class="ak-btn ak-btn-wa ak-btn-ico" data-ak-whatsapp="barre" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp">' + ICO_WA + "</a>" : "");
    document.body.appendChild(bar);

    var formVisible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { formVisible = en.isIntersecting; });
        maj();
      }, { threshold: 0.08 }).observe(hote);
    }

    function premierKpi() {
      var k = document.querySelector("#kpis .kpi");
      if (!k) return null;
      var v = k.querySelector(".v"), l = k.querySelector(".l");
      if (!v || !l || !v.textContent.trim() || v.textContent.trim() === "-") return null;
      return { v: v.textContent.trim(), l: l.textContent.trim() };
    }

    function maj() {
      var k = premierKpi();
      var montrer = !!k && !formVisible && !document.body.classList.contains("ak-lead-done") &&
                    !document.body.classList.contains("ak-ck-open") && window.scrollY > 120;
      if (k) {
        bar.querySelector(".ak-sticky-v").textContent = k.v;
        bar.querySelector(".ak-sticky-l").textContent = k.l;
      }
      if (wa) { var w = lienWhatsapp(outilLabel); bar.querySelector("[data-ak-whatsapp]").href = w; }
      bar.classList.toggle("is-on", montrer);
      bar.setAttribute("aria-hidden", montrer ? "false" : "true");
      document.body.classList.toggle("ak-has-sticky", montrer);
    }

    var t = null;
    function planifier() { clearTimeout(t); t = setTimeout(maj, 300); }
    document.addEventListener("input", planifier, true);
    document.addEventListener("change", planifier, true);
    document.addEventListener("click", planifier, true);
    window.addEventListener("scroll", planifier, { passive: true });
    document.addEventListener("akapa:consentement", planifier);
    document.addEventListener("akapa:lead", planifier);
    window.addEventListener("load", planifier);
    planifier();
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
      if (!a || a.getAttribute("href").length < 2) return;
      var cible = null;
      try { cible = document.querySelector(a.getAttribute("href")); } catch (err) { return; }
      if (!cible) return;
      e.preventDefault();
      var y = cible.getBoundingClientRect().top + window.pageYOffset - 82;
      window.scrollTo({ top: y, behavior: "smooth" });
      if (nav) nav.classList.remove("is-open");
    });
  }

  /* ------------------------------------------------------------------ amorçage */
  function init() {
    memoriserUtm();
    chrome();
    var hotes = [].slice.call(document.querySelectorAll("[data-ak-lead]"));
    hotes.forEach(construire);
    if (hotes.length) barreMobile(hotes[0]);
  }

  // Permet au simulateur de rafraîchir le récapitulatif après chaque calcul.
  window.akapaRafraichirRecap = function () {
    [].slice.call(document.querySelectorAll(".ak-lead")).forEach(function (h) {
      if (typeof h._akapaMajRecap === "function") h._akapaMajRecap();
    });
  };
  window.akapaLienWhatsapp = lienWhatsapp;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
