/* Lion's Legacy — små hjælpefunktioner. Ingen sporing, ingen cookies. */
(function () {
  "use strict";

  // Mobilmenu
  var knap = document.querySelector(".menu-knap");
  var nav = document.getElementById("hovedmenu");
  if (knap && nav) {
    knap.addEventListener("click", function () {
      var aaben = knap.getAttribute("aria-expanded") === "true";
      knap.setAttribute("aria-expanded", String(!aaben));
      nav.classList.toggle("er-aaben", !aaben);
      // Flyt fokus ind i menuen, så tastaturbrugere lander i den
      if (!aaben) { var forste = nav.querySelector("a"); if (forste) forste.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("er-aaben")) {
        knap.setAttribute("aria-expanded", "false");
        nav.classList.remove("er-aaben");
        knap.focus();
      }
    });
  }

  // Årstal i footer
  document.querySelectorAll("[data-aar]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // Headeren er gennemsigtig øverst og bliver til glas, når man scroller
  var top = document.querySelector(".top");
  if (top) {
    var tjekTop = function () { top.classList.toggle("top--oeverst", window.scrollY < 8); };
    tjekTop();
    window.addEventListener("scroll", tjekTop, { passive: true });
  }

  // Lys, der følger markøren hen over kort og paneler
  document.querySelectorAll(".lys").forEach(function (kort) {
    kort.addEventListener("pointermove", function (e) {
      var r = kort.getBoundingClientRect();
      kort.style.setProperty("--mx", (e.clientX - r.left) + "px");
      kort.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  // Indhold glider blidt frem, når det kommer ind i billedet.
  // Springes over for besøgende, der har slået bevægelse fra.
  var rolig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Kom man hertil med et glidende sideskift (sideskift.js), står det synlige indhold
  // stille fra start, så siden glider ind i én bevægelse uden at hoppe bagefter.
  var viaSkift = document.documentElement.hasAttribute("data-fra");
  if (!rolig && "IntersectionObserver" in window) {
    var frem = document.querySelectorAll("[data-frem]");
    frem.forEach(function (el) {
      // Kort i samme række kommer frem et ad gangen
      var nr = 0, s = el.previousElementSibling;
      while (s) { if (s.hasAttribute("data-frem")) nr++; s = s.previousElementSibling; }
      el.style.setProperty("--n", String(Math.min(nr, 5)));
    });
    var obs = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (p.isIntersecting) { p.target.classList.add("er-fremme"); obs.unobserve(p.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    frem.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { // allerede synligt
        if (viaSkift) el.classList.add("er-fremme");
        return;
      }
      obs.observe(el);
    });
    document.documentElement.classList.add("js-frem");
    if (!viaSkift) frem.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("er-fremme");
    });
  }

  // Kontaktformular: åbner besøgendes mailprogram med beskeden udfyldt
  var formular = document.getElementById("kontaktformular");
  if (!formular) return;

  var modtager = formular.getAttribute("data-modtager");
  var felter = {
    navn: formular.querySelector("#navn"),
    email: formular.querySelector("#email"),
    emne: formular.querySelector("#emne"),
    besked: formular.querySelector("#besked")
  };
  var status = formular.querySelector(".status");

  // Udfyld fra produktsiden: kontakt.html?produkt=Navn
  try {
    var params = new URLSearchParams(window.location.search);
    var produkt = params.get("produkt");
    if (produkt) {
      felter.emne.value = "Produkter";
      felter.besked.value = "Hej Lion’s Legacy\n\nJeg er interesseret i: " + produkt + "\n\n";
    }
  } catch (e) { /* ældre browser: ingen udfyldning */ }

  function visFejl(felt, tekst) {
    var fejl = document.getElementById(felt.id + "-fejl");
    felt.setAttribute("aria-invalid", tekst ? "true" : "false");
    if (fejl) fejl.textContent = tekst || "";
  }

  function tjek() {
    var ok = true;
    if (!felter.navn.value.trim()) { visFejl(felter.navn, "Skriv dit navn."); ok = false; } else visFejl(felter.navn, "");
    var mail = felter.email.value.trim();
    if (!mail) { visFejl(felter.email, "Skriv din e-mail, så vi kan svare dig."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { visFejl(felter.email, "E-mailen ser ikke rigtig ud. Tjek, at den har et @ og et domæne."); ok = false; }
    else visFejl(felter.email, "");
    if (!felter.besked.value.trim()) { visFejl(felter.besked, "Skriv en kort besked."); ok = false; } else visFejl(felter.besked, "");
    return ok;
  }

  formular.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!tjek()) {
      var forste = formular.querySelector('[aria-invalid="true"]');
      if (forste) forste.focus();
      return;
    }
    var emne = "Henvendelse via lionslegacy.dk: " + felter.emne.value;
    var krop = felter.besked.value.trim() +
      "\n\n—\n" + felter.navn.value.trim() + "\n" + felter.email.value.trim();
    window.location.href = "mailto:" + modtager +
      "?subject=" + encodeURIComponent(emne) +
      "&body=" + encodeURIComponent(krop);
    if (status) {
      status.textContent = "Dit mailprogram er åbnet med beskeden. Tryk send dér for at sende den.";
    }
  });
})();
