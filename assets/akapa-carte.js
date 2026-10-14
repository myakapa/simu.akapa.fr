/* =============================================================
   Akapa — carte du toit et ensoleillement à l'adresse (simulateur solaire)
   - Carte satellite Google Maps + recherche d'adresse (Places API New),
     chargées seulement quand le visiteur ouvre la carte.
   - Ensoleillement : fonction Netlify /.netlify/functions/pvgis (PVGIS, JRC).
   - Sans clé Google (variable Netlify GOOGLE_MAPS_KEY), le bloc reste masqué.
   La page fournit : #akCarte (bloc), #terr, #prod ; elle recalcule sur 'input'.
   ============================================================= */
(function () {
  "use strict";
  var bloc = document.getElementById("akCarte");
  if (!bloc || !window.fetch) return;

  var $ = function (id) { return document.getElementById(id); };
  var CENTRES = {                       // vue d'ensemble par territoire
    GP: { lat: 16.2, lng: -61.55, z: 10 }, MQ: { lat: 14.64, lng: -61.02, z: 10 },
    GF: { lat: 4.92, lng: -52.33, z: 10 }, RE: { lat: -21.12, lng: 55.53, z: 10 },
    YT: { lat: -12.82, lng: 45.15, z: 11 }
  };
  var ORIENT_TXT = { sud: "plein sud", "est-ouest": "est-ouest", est: "est", ouest: "ouest", nord: "nord", plat: "toit plat" };

  // Territoire d'après la position (cadres larges, cohérents avec la fonction pvgis)
  function territoireDe(lat, lng) {
    if (lat >= 15.8 && lat <= 16.6 && lng >= -61.9 && lng <= -60.9) return "GP";
    if (lat >= 14.3 && lat <= 14.95 && lng >= -61.3 && lng <= -60.7) return "MQ";
    if (lat >= 2 && lat <= 6 && lng >= -55 && lng <= -51) return "GF";
    if (lat >= -21.5 && lat <= -20.8 && lng >= 55.1 && lng <= 55.9) return "RE";
    if (lat >= -13.1 && lat <= -12.5 && lng >= 44.9 && lng <= 45.4) return "YT";
    return null;
  }

  var etat = { cle: null, map: null, marker: null, pos: null, adresse: "", adresseBase: "", ajuste: false, orient: "sud", prod: null, jeton: 0 };
  window.akapaCarte = etat;

  /* ---------- 1. La clé existe-t-elle ? Sinon on ne montre rien ---------- */
  fetch("/.netlify/functions/carte-config").then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (c) { if (c && c.key) { etat.cle = c.key; bloc.hidden = false; } })
    .catch(function () {});

  /* ---------- 2. Chargement de Google Maps à la demande ---------- */
  var chargement = null;
  function chargerMaps() {
    if (chargement) return chargement;
    chargement = new Promise(function (ok, ko) {
      window.__akMapsPret = function () { ok(); };
      var s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(etat.cle) +
              "&v=weekly&loading=async&language=fr&region=FR&libraries=places,marker&callback=__akMapsPret";
      s.async = true;
      s.onerror = function () { ko(new Error("maps")); };
      document.head.appendChild(s);
    });
    return chargement;
  }

  function ouvrir() {
    $("akCarteOuvrir").disabled = true;
    $("akCarteOuvrir").textContent = "Chargement de la carte…";
    chargerMaps().then(initCarte).catch(function () {
      $("akCarteOuvrir").textContent = "Carte indisponible pour le moment";
    });
  }

  function initCarte() {
    var g = window.google.maps;
    var c = CENTRES[$("terr").value] || CENTRES.GP;
    $("akCarteZone").hidden = false;
    $("akCarteOuvrir").hidden = true;
    etat.map = new g.Map($("akCarteMap"), {
      center: { lat: c.lat, lng: c.lng }, zoom: c.z, mapTypeId: "hybrid", tilt: 0,
      mapId: "DEMO_MAP_ID", streetViewControl: false, fullscreenControl: true,
      mapTypeControl: false, clickableIcons: false, gestureHandling: "cooperative"
    });
    etat.marker = new g.marker.AdvancedMarkerElement({ map: null, gmpDraggable: true, title: "Votre toit" });
    etat.marker.addListener("dragend", function () {
      var p = etat.marker.position;
      placer(typeof p.lat === "function" ? p.lat() : p.lat, typeof p.lng === "function" ? p.lng() : p.lng, null, false);
    });
    etat.map.addListener("click", function (e) { placer(e.latLng.lat(), e.latLng.lng(), null, false); });

    // Recherche d'adresse (Places API New)
    try {
      var pac = new g.places.PlaceAutocompleteElement({ includedRegionCodes: ["gp", "mq", "gf", "re", "yt", "mf", "bl"] });
      pac.id = "akCarteAdresse";
      pac.setAttribute("placeholder", "Saisissez l’adresse du projet");
      $("akCarteRecherche").appendChild(pac);
      pac.addEventListener("gmp-select", function (ev) {
        var place = ev.placePrediction.toPlace();
        place.fetchFields({ fields: ["location", "formattedAddress"] }).then(function () {
          placer(place.location.lat(), place.location.lng(), place.formattedAddress, true);
        });
      });
    } catch (e) { /* sans recherche, la carte et « Me localiser » restent utilisables */ }
  }

  /* ---------- 3. Position choisie → territoire + ensoleillement ---------- */
  function placer(lat, lng, adresse, zoomer) {
    etat.pos = { lat: lat, lng: lng };
    if (adresse) { etat.adresseBase = adresse; etat.ajuste = false; }
    else etat.ajuste = true;
    etat.adresse = (etat.adresseBase || "Point choisi sur la carte") + (etat.ajuste && etat.adresseBase ? " (repère ajusté sur la carte)" : "");
    if (etat.marker) { etat.marker.position = etat.pos; etat.marker.map = etat.map; }
    if (etat.map && zoomer) { etat.map.setCenter(etat.pos); etat.map.setZoom(20); }

    var code = territoireDe(lat, lng);
    if (code && $("terr").value !== code) {
      $("terr").value = code;
      $("terr").dispatchEvent(new Event("change", { bubbles: true }));
    }
    calculer();
  }

  function calculer() {
    if (!etat.pos) return;
    var res = $("akCarteRes");
    var code = territoireDe(etat.pos.lat, etat.pos.lng);
    var jeton = ++etat.jeton;
    var incl = parseFloat($("akInclToit").value);
    res.hidden = false; res.className = "info ak-carte-res";
    res.textContent = "Calcul de l’ensoleillement à cette adresse…";
    var url = "/.netlify/functions/pvgis?lat=" + etat.pos.lat.toFixed(4) + "&lon=" + etat.pos.lng.toFixed(4) +
              "&orient=" + etat.orient + "&incl=" + (isFinite(incl) ? incl : 15);
    fetch(url).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (jeton !== etat.jeton) return;
        if (!x.ok || !x.d.prod) throw new Error(x.d && x.d.erreur || "pvgis");
        etat.prod = x.d.prod;
        var moyen = (typeof TERR !== "undefined" && TERR[$("terr").value]) ? TERR[$("terr").value].prod : 0;
        $("prod").value = x.d.prod;
        $("prod").dispatchEvent(new Event("input", { bubbles: true }));
        var ecart = Math.round((x.d.prod / moyen - 1) * 100);
        res.innerHTML = "<strong>☀ " + x.d.prod.toLocaleString("fr-FR") + " kWh par kWc et par an</strong> à cette adresse (" +
          ORIENT_TXT[etat.orient] + (etat.orient === "plat" ? "" : ", " + x.d.incl + "°") + ")" +
          (isFinite(ecart) && ecart !== 0 ? " — " + (ecart > 0 ? "+" : "") + ecart + " % par rapport à la valeur moyenne du territoire" : "") +
          ". La simulation en tient compte.<br><span class=\"ak-carte-src\">Source : PVGIS (Commission européenne), données satellite " +
          x.d.base.replace("PVGIS-", "") + ", ombre du relief comprise. L’ombre des arbres et bâtiments voisins n’est pas prise en compte.</span>";
        if (window.gtag) try { window.gtag("event", "localisation_toit", { territoire: code || "autre", orientation: etat.orient }); } catch (e) {}
      })
      .catch(function (e) {
        if (jeton !== etat.jeton) return;
        res.className = "info ak-carte-res warn";
        res.textContent = (e && e.message && e.message.length > 12 ? e.message : "Ensoleillement indisponible pour le moment.") +
          " La valeur moyenne du territoire reste appliquée.";
      });
  }

  /* ---------- 4. Commandes ---------- */
  $("akCarteOuvrir").addEventListener("click", ouvrir);

  $("akCarteLoc").addEventListener("click", function () {
    var b = this;
    if (!navigator.geolocation) { b.textContent = "Localisation indisponible"; return; }
    b.disabled = true; b.textContent = "Localisation…";
    navigator.geolocation.getCurrentPosition(function (p) {
      b.disabled = false; b.textContent = "Me localiser";
      placer(p.coords.latitude, p.coords.longitude, "Position GPS du visiteur", true);
    }, function () {
      b.disabled = false; b.textContent = "Me localiser";
      var res = $("akCarteRes"); res.hidden = false; res.className = "info ak-carte-res warn";
      res.textContent = "Localisation refusée ou impossible : saisissez plutôt votre adresse.";
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  [].slice.call(document.querySelectorAll("#akOrient .seg-btn")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      etat.orient = btn.getAttribute("data-value");
      [].slice.call(document.querySelectorAll("#akOrient .seg-btn")).forEach(function (b) { b.classList.toggle("active", b === btn); });
      $("akInclRow").hidden = etat.orient === "plat";
      calculer();
    });
  });
  $("akInclToit").addEventListener("change", calculer);

  // Changement manuel de territoire : on recentre la carte (le repère reste où il est)
  $("terr").addEventListener("change", function () {
    if (!etat.map) return;
    var code = $("terr").value;
    if (etat.pos && territoireDe(etat.pos.lat, etat.pos.lng) === code) return;
    var c = CENTRES[code]; if (c) { etat.map.setCenter({ lat: c.lat, lng: c.lng }); etat.map.setZoom(c.z); }
  });
})();
