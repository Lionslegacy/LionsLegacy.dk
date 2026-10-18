# Lion’s Legacy – hjemmeside

Statisk hjemmeside til **lionslegacy.dk**, klar til gratis hosting på GitHub Pages med domænet fra Simply.com.

## Indhold

| Fil | Side |
|---|---|
| `index.html` | Forside |
| `produkter.html` | Produkter (med Bestil-knap, der udfylder kontaktformularen) |
| `studie.html` | Kreativt studie: ydelser og arbejdsgang |
| `om-os.html` | Om Lion’s Legacy |
| `kontakt.html` | Kontaktformular og kontaktoplysninger |
| `privatliv.html` | Privatlivspolitik |
| `404.html` | Vises, hvis en side ikke findes |
| `CNAME` | Fortæller GitHub, at siden hører til lionslegacy.dk |
| `assets/` | Stil (css), script (js), skrifttyper (fonts) og billeder (img) |

Siden bruger ingen cookies og ingen sporing, og skrifttyperne ligger lokalt, så der ikke sendes data til Google.

---

## 1. Læg filerne på GitHub

1. Log ind på github.com med virksomhedens konto.
2. Tryk **+** øverst til højre og vælg **New repository**.
3. Kald det fx `lionslegacy.dk`, vælg **Public** og tryk **Create repository**.
4. På den tomme side: tryk **uploading an existing file**.
5. Pak zip-filen ud, åbn mappen `lionslegacy-site` og træk **alt indholdet** (ikke selve mappen) ind i browservinduet.
6. Tryk **Commit changes**.

> Filen `.nojekyll` er skjult på Mac og Windows. Det gør ikke noget, hvis den ikke kommer med.

## 2. Slå GitHub Pages til

1. Gå til repository’et og tryk **Settings**.
2. Vælg **Pages** i menuen til venstre.
3. Under **Build and deployment** vælg **Deploy from a branch**, derefter `main` og `/ (root)`. Tryk **Save**.
4. Under **Custom domain** står der nu `lionslegacy.dk` (læses fra `CNAME`-filen). Står der intet, så skriv `lionslegacy.dk` og tryk **Save**.

## 3. Bekræft domænet (anbefales af GitHub)

Det forhindrer, at andre kan overtage domænet på GitHub.

1. Tryk på dit profilbillede, vælg **Settings** og derefter **Pages** i menuen.
2. Tryk **Add a domain**, skriv `lionslegacy.dk` og tryk **Add domain**.
3. GitHub viser en TXT-post (navn og værdi). Den opretter du hos Simply i næste trin, og trykker derefter **Verify**.

## 4. Peg domænet på GitHub hos Simply.com

Log ind på simply.com, vælg domænet **lionslegacy.dk** og gå til **DNS**.

**Vigtigt:** Rør ikke ved MX-, SPF- eller andre mail-poster. De styrer din e-mail.

1. Slet eksisterende **A**- og **AAAA**-poster for selve domænet (navn tomt eller `@`) og for `www`, hvis de peger på Simply.
2. Opret disse poster:

| Type | Navn | Værdi |
|---|---|---|
| A | (tomt / @) | `185.199.108.153` |
| A | (tomt / @) | `185.199.109.153` |
| A | (tomt / @) | `185.199.110.153` |
| A | (tomt / @) | `185.199.111.153` |
| AAAA | (tomt / @) | `2606:50c0:8000::153` |
| AAAA | (tomt / @) | `2606:50c0:8001::153` |
| AAAA | (tomt / @) | `2606:50c0:8002::153` |
| AAAA | (tomt / @) | `2606:50c0:8003::153` |
| CNAME | `www` | `lionslegacy.github.io` |
| TXT | (navnet fra trin 3) | (værdien fra trin 3) |

`lionslegacy.github.io` er din GitHub-adresse (uden repository-navn).

3. Vent. DNS kan tage fra få minutter op til 24 timer.
4. Gå tilbage til **Settings → Pages** i repository’et. Når der står, at DNS-tjekket er lykkedes, sæt flueben i **Enforce HTTPS**. Det kan også tage op til 24 timer, før muligheden dukker op.

Derefter kører hjemmesiden på **https://lionslegacy.dk**.

---

## 5. Udskift pladsholderne

Det nemmeste er GitHubs egen editor: Åbn repository’et og tryk på tasten **.** (punktum). Så åbner en editor i browseren, hvor du kan søge og erstatte i alle filer på én gang (Ctrl/Cmd + Shift + H). Gem ved at trykke på ikonet for **Source Control** og **Commit & Push**.

| Søg efter | Erstat med | Findes i |
|---|---|---|
| `Produktnavn et` … `Produktnavn seks` | Rigtige produktnavne | Forside og Produkter |
| `Kort beskrivelse: materiale …` | Produktbeskrivelser | Forside og Produkter |
| `Pris følger` | Pris, fx `1.495 kr.` | Forside og Produkter |

Har du ikke alle seks produkter endnu, kan du slette en hel `<li class="produkt"> … </li>`-blok.

## 6. Tilføj produktbilleder

1. Læg billedet i `assets/img/produkter/` (højformat 4:5, ca. 1200 × 1500 px).
2. Find produktets `<figure class="produkt__billede">` og erstat linjerne indeni med:

```html
<img src="assets/img/produkter/kollektion-1.jpg" alt="Kort beskrivelse af billedet" loading="lazy">
```

## 7. Kontaktformularen

Formularen åbner den besøgendes mailprogram med beskeden udfyldt, så der kræves ingen server. Vil du hellere have, at beskeder sendes direkte fra siden, kan en gratis formulartjeneste som Formspree kobles på senere.

## 8. Privatlivspolitikken

`privatliv.html` er et udgangspunkt, der passer til siden, som den er nu (ingen cookies, ingen sporing). Tilføjer du webshop, statistik eller nyhedsbrev, skal den opdateres. Få den gerne gennemlæst af en rådgiver; den er ikke juridisk rådgivning.

## 9. Ændringer med Claude Code og automatisk kvalitetstjek

Ændringer bestilles i chat på claude.ai/code (eller Code-fanen i Claude-appen) med repository'et `Lionslegacy/LionsLegacy.dk`. Claude følger reglerne i `CLAUDE.md` og laver en pull request.

Ved hver pull request kører **Kvalitetstjek** automatisk på GitHub. Det tjekker døde links, HTML-fejl, mobil-layout, tilgængelighed og de vigtigste danske lovkrav (virksomhedsoplysninger, privatlivspolitik, ingen cookies eller tredjepart uden samtykke).

- **Grønt flueben:** klar til Merge.
- **Rødt kryds:** tryk **Details** for at se fejlene, og skriv "ret fejlene i kvalitetstjekket" til Claude.
- **Gule advarsler** (fx pladsholdere, der ikke er udfyldt) stopper ikke noget, men bør ordnes før lancering.

Tjekket er en hjælp, ikke juridisk rådgivning.

## Farver og skrift

Alle farver ligger øverst i `assets/css/style.css`:

- Antracit `#1c1d20` (baggrund)
- Messingguld `#c6a15b` (accent)
- Pergament `#ece5d8` (tekst)

Skrifttyper: Bodoni Moda (overskrifter) og Jost (brødtekst), begge under SIL Open Font License (se `assets/fonts`).

Logoet er `assets/img/maerke.svg`. Har du et eget logo, kan det erstatte mærket i sidernes header og footer.
