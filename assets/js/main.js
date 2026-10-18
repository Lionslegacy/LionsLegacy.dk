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
