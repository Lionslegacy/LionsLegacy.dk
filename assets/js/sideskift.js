/* Lion’s Legacy — glidende sideskift
   Når man skifter side, glider indholdet ud, og den nye side glider ind,
   mens menulinjen og 3D-baggrunden bliver stående. Bruger browserens egne
   View Transitions (styles i style.css under "Glidende sideskift").
   Browsere uden understøttelse skifter side som normalt, og besøgende, der
   har slået bevægelse fra, får ingen animation. Gemmer intet i browseren.
   Indlæses i <head>, så den er klar, før den nye side vises. */
(function () {
  "use strict";

  var html = document.documentElement;
  // Rækkefølgen i menuen bestemmer retningen: frem glider mod venstre, tilbage mod højre
  var ORDEN = ["index.html", "produkter.html", "studie.html", "om-os.html", "kontakt.html", "privatliv.html"];

  // Sidens plads i rækkefølgen. Ukendte sider (fx fejlsiden) står sidst.
  function plads(url) {
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin) return -1;
      var i = ORDEN.indexOf(u.pathname.split("/").pop() || "index.html");
      return i < 0 ? ORDEN.length : i;
    } catch (e) { return -1; }
  }

  // Adressen på den side, man kom fra (kun fra lionslegacy.dk selv)
  function forrige() {
    var a = window.navigation && window.navigation.activation;
    if (a) return a.from && a.navigationType !== "reload" ? a.from.url : "";
    return document.referrer;
  }

  var kan = "CSSViewTransitionRule" in window &&
    !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fra = kan ? forrige() : "";

  if (fra && plads(fra) >= 0) {
    // Fortæl 3D-baggrunden, hvor skulpturen stod, så den kan glide videre derfra
    html.setAttribute("data-fra", plads(fra) === 0 ? "forside" : "side");
    // Vent med at vise siden, til 3D-baggrunden er tegnet, så den kan blive stående under skiftet
    var vent = document.createElement("link");
    vent.rel = "expect";
    vent.href = "#scene";
    vent.setAttribute("blocking", "render");
    document.head.appendChild(vent);
  }

  function slut() { html.classList.remove("skift-ud", "skift-ind", "skift--tilbage"); }

  // Den gamle side: markér indholdet, der skal glide ud
  window.addEventListener("pageswap", function (e) {
    if (e.viewTransition) html.classList.add("skift-ud");
  });

  // Den nye side: vælg retning og ryd op, når overgangen er færdig
  window.addEventListener("pagereveal", function (e) {
    slut();
    var vt = e.viewTransition;
    if (!vt) return;
    html.classList.add("skift-ind");
    if (plads(location.href) < plads(forrige())) html.classList.add("skift--tilbage");
    vt.finished.then(slut, slut);
  });
})();
